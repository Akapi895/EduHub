/**
 * EduHub Memory Card Game – v2.1 (single-level, pair-based)
 *
 * All pairs are shown in ONE level (no difficulty bands, no multi-level).
 * Pairs are loaded from runtime_config.card_pairs (teacher-defined).
 * Each pair: { id, left_label, left_image_url, right_label, right_image_url }
 * Students flip cards two at a time; matching the left+right of the same pair = correct.
 * No question-bank integration; scoring is purely match/speed based.
 */
(function bootstrapMemoryCardGame(globalScope) {
  'use strict';

  // ── Logging ─────────────────────────────────────────────────────────────────
  const LOG_PREFIX = '[MemoryCard]';
  function log(...args) { console.log(LOG_PREFIX, ...args); }
  function warn(...args) { console.warn(LOG_PREFIX, ...args); }
  function error(...args) { console.error(LOG_PREFIX, ...args); }

  const bridge = globalScope.EduHubGameBridge;
  log('Bridge detected:', Boolean(bridge));

  // ── Utilities ──────────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function parseIntSafe(v, fallback, min) {
    const n = Number.parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) ? Math.max(n, min ?? 0) : fallback;
  }

  function escHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatTime(secs) {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  // ── Demo pairs (shown when no server data yet) ─────────────────────────────

  const DEMO_PAIRS = [
    { id: 'd1', left_label: 'Con mèo', left_image_url: null, right_label: '🐱', right_image_url: null },
    { id: 'd2', left_label: 'Con chó', left_image_url: null, right_label: '🐶', right_image_url: null },
    { id: 'd3', left_label: 'Mặt trời', left_image_url: null, right_label: '☀️', right_image_url: null },
    { id: 'd4', left_label: 'Mặt trăng', left_image_url: null, right_label: '🌙', right_image_url: null },
    { id: 'd5', left_label: 'Cái cây', left_image_url: null, right_label: '🌳', right_image_url: null },
    { id: 'd6', left_label: 'Ngôi nhà', left_image_url: null, right_label: '🏠', right_image_url: null },
    { id: 'd7', left_label: 'Con cá', left_image_url: null, right_label: '🐟', right_image_url: null },
    { id: 'd8', left_label: 'Bông hoa', left_image_url: null, right_label: '🌸', right_image_url: null },
  ];

  // ── Card rendering ─────────────────────────────────────────────────────────

  function cardFaceHtml(card) {
    let html = '';
    if (card.imageUrl) {
      html += `<img src="${escHtml(card.imageUrl)}" alt="${escHtml(card.label || '')}" class="card-img" loading="lazy" onerror="this.style.display='none'">`;
    }
    if (card.label) {
      html += `<span class="card-label">${escHtml(card.label)}</span>`;
    }
    if (!card.imageUrl && !card.label) {
      html = '<span class="card-label">?</span>';
    }
    return `<div class="card-face">${html}</div>`;
  }

  function cardBackHtml() {
    return '<div class="card-back"><span class="card-back-mark">?</span></div>';
  }

  // ── Main Game ──────────────────────────────────────────────────────────────

  class MemoryCardGame {
    constructor() {
      // ---- Config (overridden by host:init) ----
      this.cfg = { timeSecs: 180, revealMs: 750, pointsPerMatch: 100 };
      // ---- Runtime state ----
      this.pairs = [];      // teacher-defined pairs from runtime_config
      this.cards = [];      // shuffled board cards
      this.openIdxs = [];   // indices of currently flipped (unmatched) cards
      this.moves = 0;
      this.matched = 0;
      this.score = 0;
      this.timeLeft = 180;
      this.paused = false;
      this.done = false;
      this.locked = false;  // board locked while comparing
      this.timerHandle = null;
      this.isDemo = false;
      this.matchedPairIds = new Set();
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    mount() {
      log('mount() called');
      this.$board = document.getElementById('board');
      this.$hud = document.getElementById('hud');
      this.$time = document.getElementById('time-val');
      this.$moves = document.getElementById('moves-val');
      this.$pairs = document.getElementById('pairs-val');
      this.$score = document.getElementById('score-val');
      this.$overlay = document.getElementById('overlay');
      this.$overlayTitle = document.getElementById('overlay-title');
      this.$overlayMsg = document.getElementById('overlay-msg');
      this.$restartBtn = document.getElementById('restart-btn');
      this.$demoBanner = document.getElementById('demo-banner');

      log('DOM elements:', {
        board: Boolean(this.$board),
        hud: Boolean(this.$hud),
        overlay: Boolean(this.$overlay),
      });

      this.$restartBtn.addEventListener('click', () => this.restart());

      this.setupBridge();
      if (bridge) bridge.ready({ game_id: 'memory-card', version: '2.1.0' });
    }

    setupBridge() {
      if (!bridge) {
        log('No bridge — running standalone demo');
        this.useDemoPairs();
        this.start();
        return;
      }

      log('Bridge found — waiting for host:init');
      bridge.onHostMessage((event, payload) => {
        log('Bridge message received:', event, JSON.stringify(payload).substring(0, 500));

        if (event === 'host:init') {
          this.applyInit(payload || {});
          this.start();
        } else if (event === 'host:pause') {
          this.pause();
        } else if (event === 'host:resume') {
          // If the game was marked done (e.g. completion-rejected by host),
          // recover by clearing the done state so the player can keep playing.
          if (this.done) {
            log('resume: recovering from done state (completion was likely rejected)');
            this.done = false;
            this.locked = false;
            this.hideOverlay();
            if (this.timerHandle === null) this.startTimer();
          }
          this.resume();
        } else if (event === 'host:restart') {
          this.restart();
        }
      });
    }

    applyInit(payload) {
      log('applyInit() — raw payload keys:', Object.keys(payload));

      // Host sends "runtimeConfig" (camelCase) — handle both naming conventions
      const rc = payload.runtimeConfig
        || payload.runtime_config
        || payload.runtimeconfig
        || {};

      log('applyInit() — runtime config keys:', Object.keys(rc));
      log('applyInit() — card_pairs present:', Array.isArray(rc.card_pairs), 'count:', (rc.card_pairs || []).length);

      const ses = rc.session || {};
      const mc  = rc.memory_card || {};

      // ── Extract pairs ──────────────────────────────────────────────────────
      const serverPairs = Array.isArray(rc.card_pairs) ? rc.card_pairs : [];
      this.pairs = serverPairs.filter(p => p && p.id);

      log('applyInit() — valid pairs after filter:', this.pairs.length);
      if (this.pairs.length > 0) {
        log('applyInit() — pairs detail:');
        this.pairs.forEach((p, i) => {
          log(`  pair[${i}]: id=${p.id}, left="${p.left_label}", right="${p.right_label}", leftImg=${Boolean(p.left_image_url)}, rightImg=${Boolean(p.right_image_url)}`);
        });
      }

      if (this.pairs.length === 0) {
        warn('No valid card pairs from server — falling back to demo');
        this.useDemoPairs();
      } else {
        this.isDemo = false;
      }

      this.cfg.timeSecs  = parseIntSafe(ses.time_limit_seconds, 180, 30);
      this.cfg.revealMs  = parseIntSafe(mc.reveal_delay_ms, 750, 200);
      this.cfg.pointsPerMatch = parseIntSafe(mc.points_per_match, 100, 0);
      log('applyInit() — config:', this.cfg);
    }

    useDemoPairs() {
      this.pairs = DEMO_PAIRS;
      this.isDemo = true;
      log('useDemoPairs() — loaded', this.pairs.length, 'demo pairs');
    }

    // ── Round ────────────────────────────────────────────────────────────────

    start() {
      log('start() — pairs:', this.pairs.length, 'isDemo:', this.isDemo);
      this.stopTimer();
      this.moves = 0;
      this.matched = 0;
      this.score = 0;
      this.timeLeft = this.cfg.timeSecs;
      this.openIdxs = [];
      this.locked = false;
      this.paused = false;
      this.done = false;
      this.matchedPairIds = new Set();
      this.cards = this.buildDeck();

      log('start() — deck built:', this.cards.length, 'cards');

      this.hideOverlay();
      this.renderBoard();
      this.updateHud();
      if (this.isDemo && this.$demoBanner) this.$demoBanner.hidden = false;
      else if (this.$demoBanner) this.$demoBanner.hidden = true;

      this.startTimer();
      this.emitState('started');
      this.emitProgress('started');
    }

    restart() { this.start(); }
    pause()   { if (!this.paused && !this.done) { this.paused = true;  this.emitState('paused'); } }
    resume()  { if (this.paused  && !this.done) { this.paused = false; this.emitState('resumed'); } }

    // ── Timer ────────────────────────────────────────────────────────────────

    startTimer() {
      this.stopTimer();
      this.timerHandle = globalScope.setInterval(() => {
        if (this.paused || this.done) return;
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this.updateHud();
        if (this.timeLeft <= 0) this.finish('timeout', 'time_up');
      }, 1000);
    }

    stopTimer() {
      if (this.timerHandle !== null) {
        globalScope.clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
    }

    // ── Board ────────────────────────────────────────────────────────────────

    buildDeck() {
      const cards = [];
      this.pairs.forEach(p => {
        cards.push({
          id: `${p.id}-L`,
          pairId: p.id,
          side: 'L',
          label: p.left_label  || null,
          imageUrl: p.left_image_url  || null,
          matched: false,
        });
        cards.push({
          id: `${p.id}-R`,
          pairId: p.id,
          side: 'R',
          label: p.right_label || null,
          imageUrl: p.right_image_url || null,
          matched: false,
        });
      });

      log('buildDeck() — cards before shuffle:', cards.length);
      cards.forEach((c, i) => {
        log(`  card[${i}]: id=${c.id}, pairId=${c.pairId}, side=${c.side}, label="${c.label}", img=${Boolean(c.imageUrl)}`);
      });

      return shuffle(cards);
    }

    renderBoard() {
      const total = this.cards.length;
      if (total === 0) {
        warn('renderBoard() — no cards to render!');
        this.$board.innerHTML = '<p style="color:#64748b;text-align:center;padding:40px;">Không có thẻ nào để hiển thị.</p>';
        return;
      }

      const cols = clamp(Math.ceil(Math.sqrt(total)), 3, 7);
      log('renderBoard() — total:', total, 'cols:', cols);

      this.$board.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      this.$board.innerHTML = '';
      this.cards.forEach((card, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mc-card';
        btn.dataset.idx = String(idx);
        btn.innerHTML = cardBackHtml();
        btn.addEventListener('click', () => this.pick(idx));
        this.$board.appendChild(btn);
      });

      log('renderBoard() — rendered', this.$board.children.length, 'card elements');
    }

    cardEl(idx) { return this.$board.querySelector(`.mc-card[data-idx="${idx}"]`); }

    flip(idx, faceUp) {
      const card = this.cards[idx];
      if (!card) return;
      const el = this.cardEl(idx);
      if (!el) return;
      el.classList.toggle('is-flipped', faceUp);
      el.innerHTML = faceUp ? cardFaceHtml(card) : cardBackHtml();
    }

    lockCard(idx) {
      const el = this.cardEl(idx);
      if (el) { el.classList.add('is-matched'); el.disabled = true; }
    }

    // ── Interaction ──────────────────────────────────────────────────────────

    pick(idx) {
      if (this.done || this.paused || this.locked) return;
      const card = this.cards[idx];
      if (!card || card.matched || this.openIdxs.includes(idx)) return;

      this.flip(idx, true);
      this.openIdxs.push(idx);
      if (this.openIdxs.length < 2) return;

      this.moves++;
      const [iA, iB] = this.openIdxs;
      this.openIdxs = [];
      const cA = this.cards[iA], cB = this.cards[iB];

      if (cA.pairId === cB.pairId && cA.side !== cB.side) {
        // ✅ Match
        cA.matched = true;
        cB.matched = true;
        this.lockCard(iA);
        this.lockCard(iB);
        this.matchedPairIds.add(cA.pairId);
        this.matched++;
        this.score += this.cfg.pointsPerMatch + Math.round(this.timeLeft * 0.5);
        this.updateHud();
        this.emitProgress('pair_matched');
        log('pick() — matched pair:', cA.pairId, '| total matched:', this.matched, '/', this.pairs.length);
        if (this.matched >= this.pairs.length) this.finish('success', 'all_matched');
      } else {
        // ❌ No match – flip back after delay
        this.locked = true;
        this.updateHud();
        globalScope.setTimeout(() => {
          this.flip(iA, false);
          this.flip(iB, false);
          this.locked = false;
          this.updateHud();
        }, this.cfg.revealMs);
      }
    }

    // ── Finish ───────────────────────────────────────────────────────────────

    finish(outcome, reason) {
      if (this.done) return;

      // Guard: don't declare success unless all pairs were actually matched
      if (outcome === 'success' && this.pairs.length > 0 && this.matched < this.pairs.length) {
        warn('finish() — blocked false success: matched', this.matched, 'of', this.pairs.length);
        return;
      }

      log('finish() — outcome:', outcome, 'reason:', reason, 'matched:', this.matched, '/', this.pairs.length);
      this.done = true;
      this.stopTimer();
      this.locked = true;

      const timeSpent = this.cfg.timeSecs - this.timeLeft;
      const summary = {
        outcome,
        reason,
        score: this.score,
        moves: this.moves,
        matched: this.matched,
        total_pairs: this.pairs.length,
        time_spent_seconds: timeSpent,
        time_remaining_seconds: this.timeLeft,
        completion_ratio: this.pairs.length > 0
          ? Math.round((this.matched / this.pairs.length) * 100) / 100
          : 0,
      };

      log('finish():', JSON.stringify(summary));

      // Show overlay
      const win = outcome === 'success';
      if (this.$overlayTitle) this.$overlayTitle.textContent = win ? '🎉 Hoàn thành!' : '⏰ Hết giờ!';
      if (this.$overlayMsg) {
        this.$overlayMsg.textContent = win
          ? `Bạn đã khớp ${this.matched}/${this.pairs.length} cặp trong ${this.moves} lần lật. Điểm: ${this.score}`
          : `Bạn đã khớp ${this.matched}/${this.pairs.length} cặp. Thử lại nào!`;
      }
      this.showOverlay();

      if (bridge) {
        bridge.complete(summary);
        bridge.state({ ...this.stateSnapshot(), status: outcome === 'success' ? 'completed' : 'timeout' });
      }
    }

    // ── HUD ──────────────────────────────────────────────────────────────────

    updateHud() {
      if (this.$time)  this.$time.textContent  = formatTime(this.timeLeft);
      if (this.$moves) this.$moves.textContent = String(this.moves);
      if (this.$pairs) this.$pairs.textContent = `${this.matched}/${this.pairs.length}`;
      if (this.$score) this.$score.textContent = String(this.score);
      // Colour timer red when low
      if (this.$time) this.$time.classList.toggle('time-critical', this.timeLeft <= 30);
    }

    showOverlay() { if (this.$overlay) this.$overlay.hidden = false; }
    hideOverlay() { if (this.$overlay) this.$overlay.hidden = true; }

    // ── Bridge events ────────────────────────────────────────────────────────

    stateSnapshot() {
      return {
        moves: this.moves,
        matched: this.matched,
        total_pairs: this.pairs.length,
        score: this.score,
        time_remaining_seconds: this.timeLeft,
        paused: this.paused,
        completion_ratio: this.pairs.length > 0 ? this.matched / this.pairs.length : 0,
      };
    }

    emitState(event) {
      if (bridge) bridge.state({ event, ...this.stateSnapshot() });
    }

    emitProgress(event) {
      if (!bridge) return;
      bridge.progress({
        event,
        matched: this.matched,
        total_pairs: this.pairs.length,
        moves: this.moves,
        score: this.score,
        progress_percent: this.pairs.length > 0
          ? Math.round((this.matched / this.pairs.length) * 100)
          : 0,
      });
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function init() {
    log('init() — bootstrapping MemoryCardGame');
    const game = new MemoryCardGame();
    game.mount();
    globalScope.__memoryCardGame = game; // expose for dev
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
