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

  function cardFaceHtml(card, isPreloading) {
    let html = '';
    if (card.imageUrl) {
      // Preload: load eagerly, not lazy. Hide until loaded to prevent flash.
      html += `<img src="${escHtml(card.imageUrl)}" alt="${escHtml(card.label || '')}" class="card-img" loading="eager" decoding="async"${isPreloading ? ' style="visibility:hidden"' : ''} onload="this.style.visibility='visible'" onerror="this.style.display='none'">`;
    }
    if (card.label) {
      html += `<span class="card-label">${escHtml(card.label)}</span>`;
    }
    if (!card.imageUrl && !card.label) {
      html = '<span class="card-label">?</span>';
    }
    return `<div class="card-face">${html}</div>`;
  }

  function cardBackHtml(cardBackImageUrl) {
    if (cardBackImageUrl) {
      return `<div class="card-back card-back-image" style="background-image: url('${escHtml(cardBackImageUrl)}')"><span class="card-back-mark">?</span></div>`;
    }
    return '<div class="card-back"><span class="card-back-mark">?</span></div>';
  }

  // ── Main Game ──────────────────────────────────────────────────────────────

  class MemoryCardGame {
    constructor() {
      // ---- Config (overridden by host:init) ----
      this.cfg = { timeSecs: 180, revealMs: 1200, pointsPerMatch: 100 };
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
      this.imagesReady = false; // track if images are preloaded
      // ---- Game-wide runtime config ----
      this.backgroundImageUrl = null;  // from runtime_config.background_image_url
      this.cardBackImageUrl = null;   // from runtime_config.card_back_image_url
      this.moveLimit = null;          // from runtime_config.move_limit (null = unlimited)
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    mount() {
      log('mount() called');
      this.$board = document.getElementById('board');
      this.$stage = this.$board ? this.$board.closest('.mc-stage') : null;
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

      // ── Extract game-wide runtime config ───────────────────────────────────
      this.backgroundImageUrl = rc.background_image_url || null;
      this.cardBackImageUrl = rc.card_back_image_url || null;
      const moveLimitRaw = rc.move_limit;
      this.moveLimit = (moveLimitRaw && moveLimitRaw !== 'unlimited') 
        ? parseIntSafe(moveLimitRaw, null, 0) 
        : null;

      log('applyInit() — backgroundImageUrl:', Boolean(this.backgroundImageUrl), 'cardBackImageUrl:', Boolean(this.cardBackImageUrl), 'moveLimit:', this.moveLimit);
      log('applyInit() — config:', this.cfg);
    }

    useDemoPairs() {
      this.pairs = DEMO_PAIRS;
      this.isDemo = true;
      log('useDemoPairs() — loaded', this.pairs.length, 'demo pairs');
    }

    // ── Image Preloading ─────────────────────────────────────────────────────

    preloadImages(callback) {
      const imageUrls = [];
      this.cards.forEach(card => {
        if (card.imageUrl && !imageUrls.includes(card.imageUrl)) {
          imageUrls.push(card.imageUrl);
        }
      });

      if (imageUrls.length === 0) {
        log('preloadImages() — no images to preload');
        this.imagesReady = true;
        if (callback) callback();
        return;
      }

      log('preloadImages() — loading', imageUrls.length, 'images');
      let loaded = 0;
      let failed = 0;

      imageUrls.forEach(url => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          log('preloadImages() — loaded:', loaded, '/', imageUrls.length);
          if (loaded + failed >= imageUrls.length) {
            log('preloadImages() — all done. loaded:', loaded, 'failed:', failed);
            this.imagesReady = true;
            if (callback) callback();
          }
        };
        img.onerror = () => {
          failed++;
          warn('preloadImages() — failed to load:', url);
          if (loaded + failed >= imageUrls.length) {
            log('preloadImages() — all done. loaded:', loaded, 'failed:', failed);
            this.imagesReady = true;
            if (callback) callback();
          }
        };
        img.src = url;
      });
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
      this.imagesReady = false;
      this.cards = this.buildDeck();

      log('start() — deck built:', this.cards.length, 'cards');

      this.hideOverlay();
      this.renderBoard();
      this.updateHud();
      if (this.isDemo && this.$demoBanner) this.$demoBanner.hidden = false;
      else if (this.$demoBanner) this.$demoBanner.hidden = true;

      // Preload all images before starting timer
      this.preloadImages(() => {
        log('start() — images preloaded, starting timer');
        this.startTimer();
        this.emitState('started');
        this.emitProgress('started');
      });
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

      // ── Calculate flexible grid: rows <= cols ──────────────────────────────
      // Find a balance where we maximize cols and keep rows <= cols
      const minCols = 2;
      const maxCols = 8;
      let bestCols = minCols, bestRows = Math.ceil(total / minCols);

      for (let c = minCols; c <= maxCols; c++) {
        const r = Math.ceil(total / c);
        if (r <= c) {
          // Found a configuration where rows <= cols
          bestCols = c;
          bestRows = r;
          break;
        }
        // Otherwise, keep this as fallback
        if (r < bestRows) {
          bestCols = c;
          bestRows = r;
        }
      }

      log('renderBoard() — total:', total, 'cols:', bestCols, 'rows:', bestRows);

      const boardStyles = globalScope.getComputedStyle(this.$stage || this.$board.parentElement || this.$board);
      const horizontalPadding = parseFloat(boardStyles.paddingLeft || '0') + parseFloat(boardStyles.paddingRight || '0');
      const verticalPadding = parseFloat(boardStyles.paddingTop || '0') + parseFloat(boardStyles.paddingBottom || '0');
      const availWidth = Math.max(0, (this.$stage?.clientWidth || this.$board.clientWidth || globalScope.innerWidth) - horizontalPadding);
      const availHeight = Math.max(0, (this.$stage?.clientHeight || this.$board.clientHeight || globalScope.innerHeight) - verticalPadding);
      const gap = 8;
      const cardRatio = 3 / 4;
      const widthFromWidth = Math.floor((availWidth - gap * (bestCols - 1)) / bestCols);
      const widthFromHeight = Math.floor(((availHeight - gap * (bestRows - 1)) / bestRows) * cardRatio);
      const cardSize = clamp(Math.min(widthFromWidth, widthFromHeight), 44, 160);
      const boardWidth = cardSize * bestCols + gap * (bestCols - 1);

      this.$board.style.gridTemplateColumns = `repeat(${bestCols}, ${cardSize}px)`;
      this.$board.style.width = `${boardWidth}px`;
      this.$board.style.gap = `${gap}px`;
      this.$board.style.justifyContent = 'center';

      // Apply background image to the stage (full screen) if provided
      if (this.backgroundImageUrl) {
        this.$stage.style.backgroundImage = `url('${escHtml(this.backgroundImageUrl)}')`;
        this.$stage.style.backgroundSize = 'cover';
        this.$stage.style.backgroundPosition = 'center';
        this.$stage.style.backgroundAttachment = 'fixed';
        this.$stage.style.backgroundRepeat = 'no-repeat';
      } else {
        // Reset to default background
        this.$stage.style.backgroundImage = 'none';
      }

      this.$board.innerHTML = '';
      this.cards.forEach((card, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mc-card';
        btn.dataset.idx = String(idx);
        // Include both faces for 3D flip animation
        btn.innerHTML = `<div class="card-inner">${cardBackHtml(this.cardBackImageUrl)}${cardFaceHtml(card, false)}</div>`;
        btn.addEventListener('click', () => this.pick(idx));
        this.$board.appendChild(btn);
      });

      log('renderBoard() — rendered', this.$board.children.length, 'card elements');
    }

    cardEl(idx) { return this.$board.querySelector(`.mc-card[data-idx="${idx}"]`); }

    flip(idx, faceUp) {
      const el = this.cardEl(idx);
      if (!el) return;
      
      // Toggle CSS class for 3D flip animation
      if (faceUp) {
        el.classList.add('is-flipped');
      } else {
        el.classList.remove('is-flipped');
      }
    }

    lockCard(idx) {
      const el = this.cardEl(idx);
      if (el) {
        el.classList.add('is-matched');
        el.disabled = true;
        // Add matched effect with animation
        el.classList.add('matched-pop');
      }
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

      // Check if exceeded move limit
      if (this.moveLimit !== null && this.moves > this.moveLimit) {
        log('pick() — exceeded move limit:', this.moves, '>', this.moveLimit);
        this.finish('timeout', 'exceeded_move_limit');
        return;
      }

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
      
      // ── Score breakdown ────────────────────────────────────────────────────
      // score_base = points from matching pairs
      // score_bonus = bonus points from time efficiency
      const scoreBase = this.matched * this.cfg.pointsPerMatch;
      const scoreBonus = Math.max(0, this.score - scoreBase);
      
      const summary = {
        outcome,
        reason,
        score: this.score,
        score_breakdown: {
          score_base: scoreBase,
          score_bonus: scoreBonus,
        },
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
          ? `Bạn đã khớp ${this.matched}/${this.pairs.length} cặp trong ${this.moves} lần lật. Điểm: ${this.score} (cơ bản: ${scoreBase}, thưởng: ${scoreBonus})`
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
      if (this.$moves) {
        const movesDisplay = this.moveLimit !== null
          ? `${this.moves}/${this.moveLimit}`
          : String(this.moves);
        this.$moves.textContent = movesDisplay;
        // Warn if near move limit
        if (this.moveLimit !== null && this.moves >= this.moveLimit * 0.8) {
          this.$moves.classList.add('time-critical');
        } else {
          this.$moves.classList.remove('time-critical');
        }
      }
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
