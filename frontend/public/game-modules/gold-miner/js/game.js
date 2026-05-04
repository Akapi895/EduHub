let game_W = 20;
let game_H = 20;
let XXX = 0;
let YYY = 0;
let Xh = 0;
let Yh = 0;
let MaxLeng = 0;
let speedReturn = 0;
let R = 0;
let r = 0;
let drag = false;
let d = false;
let ok = false;
let angle = 90;
let ChAngle = -1;
let index = -1;
let level = -1;
let time = 60;
let tager = 0;
let timeH = 0;
let vlH = 0;

const bridge = window.EduHubGameBridge || null;
const ITEM_TYPE_PLAN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const DEFAULT_TIME_LIMIT_SECONDS = 60;
const DEFAULT_TARGET_SCORE_BASE = 1000;
const DEFAULT_TARGET_SCORE_STEP = 180;
const N = ITEM_TYPE_PLAN.length;
const DIFFICULTY_BANDS = ['recognition', 'comprehension', 'application_basic', 'application_advanced'];
const DIFFICULTY_LABELS = {
  recognition: 'Nhận biết',
  comprehension: 'Thông hiểu',
  application_basic: 'Vận dụng thấp',
  application_advanced: 'Vận dụng cao',
};

function isImageReady(image) {
  return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

const bg = new Image();
bg.src = 'images/background.png';

const hook = new Image();
hook.src = 'images/hook.png';

const targetIM = new Image();
targetIM.src = 'images/target.png';

const dolarIM = new Image();
dolarIM.src = 'images/money.png';

const levelIM = new Image();
levelIM.src = 'images/level.png';

const clockIM = new Image();
clockIM.src = 'images/clock.png';

class game {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.score = 0;
    this.gg = [];
    this.isPaused = false;
    this.isFinished = false;
    this.isLevelEnded = false;
    this.resultOutcome = null;
    this.levelEndReason = null;
    this.lastReportedAt = 0;
    this.didHostInit = false;
    this.sessionReady = false;
    this.readyHeartbeatId = null;
    this.runtimeErrorCount = 0;
    this.answeredQuestionsByLevel = [];
    this.completedQuestionAttemptIds = new Set();
    this.timeLimitSeconds = DEFAULT_TIME_LIMIT_SECONDS;
    this.maxLevels = 1;
    this.questionPlan = {
      level_count: 1,
      difficulty_bands: DIFFICULTY_BANDS,
      total_questions: 0,
      capture_slots_by_level: [[]],
      questions_per_level: [0],
      target_scores_by_level: [DEFAULT_TARGET_SCORE_BASE],
    };
    this.questionProgress = {
      total_questions: 0,
      questions_answered: 0,
      questions_remaining: 0,
      current_level: 1,
      current_difficulty_band: 'recognition',
      all_questions_complete: false,
      by_difficulty: {},
    };
    this.capturedItemsInLevel = 0;
    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    document.body.appendChild(this.canvas);

    this.attachBridge();
    this.render();
    if (!bridge) {
      this.resetSession();
    }
    this.safeLoop();
    this.listenKeyboard();
    this.listenMouse();

    if (bridge && typeof bridge.ready === 'function') {
      bridge.ready({
        status: 'ready',
        title: 'Gold Miner',
        controls: ['mouse', 'keyboard'],
      });
    }
    this.startReadyHeartbeat();
    this.reportState('ready', true);
  }

  startReadyHeartbeat() {
    if (!bridge || typeof bridge.ready !== 'function' || this.readyHeartbeatId) {
      return;
    }

    let attempts = 0;
    this.readyHeartbeatId = window.setInterval(() => {
      attempts += 1;
      if (this.didHostInit || attempts > 20) {
        window.clearInterval(this.readyHeartbeatId);
        this.readyHeartbeatId = null;
        return;
      }

      bridge.ready({
        status: 'ready',
        title: 'Gold Miner',
        controls: ['mouse', 'keyboard'],
        retry: attempts,
      });
    }, 500);
  }

  safeLoop() {
    try {
      this.loop();
      this.runtimeErrorCount = 0;
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  handleRuntimeError(error) {
    this.runtimeErrorCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    if (bridge && typeof bridge.error === 'function') {
      bridge.error({
        status: 'error',
        reason: 'game-loop-failed',
        message,
        retryCount: this.runtimeErrorCount,
      });
    }

    this.render();
    this.drawRuntimeError(message);
    if (this.runtimeErrorCount <= 3) {
      this.scheduleNextLoop(500);
    }
  }

  drawImageSafe(image, ...args) {
    if (!isImageReady(image)) {
      return false;
    }

    try {
      this.context.drawImage(image, ...args);
      return true;
    } catch (error) {
      if (bridge && typeof bridge.error === 'function') {
        bridge.error({
          status: 'error',
          reason: 'image-draw-failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return false;
    }
  }

  drawRuntimeError(message) {
    this.context.fillStyle = '#020617';
    this.context.fillRect(0, 0, game_W, game_H);
    this.context.fillStyle = '#FFFFFF';
    this.context.textAlign = 'center';
    this.context.font = `bold ${Math.max(22, this.getWidth() * 0.8)}px Arial`;
    this.context.fillText('Äang khá»Ÿi Ä‘á»™ng láº¡i mÃ n chÆ¡i', game_W / 2, game_H / 2 - this.getWidth() * 0.4);
    this.context.font = `${Math.max(14, this.getWidth() * 0.42)}px Arial`;
    this.context.fillText(message || 'EduHub Ä‘ang khá»ôi phá»¥c module trÃ² chÆ¡i.', game_W / 2, game_H / 2 + this.getWidth() * 0.4);
    this.context.textAlign = 'start';
  }

  attachBridge() {
    if (!bridge || typeof bridge.onHostMessage !== 'function') {
      return;
    }

    bridge.onHostMessage((type, payload) => {
      if (type === 'host:pause') {
        this.isPaused = true;
        this.reportState('paused', true);
        return;
      }

      if (type === 'host:init') {
        if (this.readyHeartbeatId) {
          window.clearInterval(this.readyHeartbeatId);
          this.readyHeartbeatId = null;
        }
        this.applyRuntimeConfig(payload && payload.runtimeConfig ? payload.runtimeConfig : null);
        this.applyAttemptTotals(payload && payload.attemptTotals ? payload.attemptTotals : null);
        this.resetSession();
        this.didHostInit = true;
        this.isPaused = false;
        this.reportState('host-init', true, {
          questionResult: payload && payload.questionResult ? payload.questionResult : null,
        });
        return;
      }

      if (type === 'host:resume') {
        this.applyAttemptTotals(payload && payload.attemptTotals ? payload.attemptTotals : null);
        if (payload && payload.questionResult) {
          this.recordQuestionCompletion(payload.questionResult);
        }
        this.isPaused = false;
        this.reportState('resumed', true, {
          questionResult: payload && payload.questionResult ? payload.questionResult : null,
        });
        this.syncLevelWithProgress('host-resume');
        return;
      }

      if (type === 'host:restart') {
        window.location.reload();
      }
    });
  }

  applyRuntimeConfig(runtimeConfig) {
    const questionPlan = runtimeConfig && typeof runtimeConfig.question_plan === 'object'
      ? runtimeConfig.question_plan
      : null;
    const session = runtimeConfig && typeof runtimeConfig.session === 'object'
      ? runtimeConfig.session
      : {};

    this.questionPlan = {
      level_count: Number(questionPlan && questionPlan.level_count) > 0 ? Number(questionPlan.level_count) : 1,
      difficulty_bands: Array.isArray(questionPlan && questionPlan.difficulty_bands)
        ? questionPlan.difficulty_bands
        : DIFFICULTY_BANDS,
      total_questions: Number(questionPlan && questionPlan.total_questions) >= 0 ? Number(questionPlan.total_questions) : 0,
      capture_slots_by_level: Array.isArray(questionPlan && questionPlan.capture_slots_by_level)
        ? questionPlan.capture_slots_by_level
        : [[]],
      questions_per_level: Array.isArray(questionPlan && questionPlan.questions_per_level)
        ? questionPlan.questions_per_level
        : [0],
      target_scores_by_level: Array.isArray(questionPlan && questionPlan.target_scores_by_level)
        ? questionPlan.target_scores_by_level
        : [DEFAULT_TARGET_SCORE_BASE],
    };

    this.maxLevels = Number(session && session.max_levels) > 0
      ? Number(session.max_levels)
      : this.questionPlan.level_count;
    this.timeLimitSeconds = Number(session && session.time_limit_seconds) > 0
      ? Number(session.time_limit_seconds)
      : DEFAULT_TIME_LIMIT_SECONDS;

    if (runtimeConfig && runtimeConfig.question_progress) {
      this.applyProgress(runtimeConfig.question_progress);
    }
  }

  resetSession() {
    this.sessionReady = false;
    this.score = 0;
    this.gg = [];
    this.isFinished = false;
    this.isLevelEnded = false;
    this.isPaused = false;
    this.resultOutcome = null;
    this.levelEndReason = null;
    this.runtimeErrorCount = 0;
    this.capturedItemsInLevel = 0;
    this.syncAnsweredQuestionsFromProgress();
    this.completedQuestionAttemptIds = new Set();
    level = this.getCurrentProgressLevel() - 2;
    time = this.timeLimitSeconds;
    tager = this.getTargetForLevel(1);
    this.newGold();
    this.sessionReady = true;
  }

  applyAttemptTotals(attemptTotals) {
    if (!attemptTotals || typeof attemptTotals !== 'object') {
      return;
    }

    const progress = attemptTotals.progress && typeof attemptTotals.progress === 'object'
      ? attemptTotals.progress
      : {
          total_questions: attemptTotals.questions_total,
          questions_answered: attemptTotals.questions_answered,
          questions_remaining: attemptTotals.questions_remaining,
          current_level: attemptTotals.current_level,
          current_difficulty_band: attemptTotals.current_difficulty_band,
          by_difficulty: {},
        };
    this.applyProgress(progress);
  }

  applyProgress(progress) {
    if (!progress || typeof progress !== 'object') {
      return;
    }

    const byDifficulty = progress.by_difficulty && typeof progress.by_difficulty === 'object'
      ? progress.by_difficulty
      : {};
    const totalQuestions = Number(progress.total_questions);
    const answeredQuestions = Number(progress.questions_answered);
    const remainingQuestions = Number(progress.questions_remaining);
    const currentLevel = Number(progress.current_level);

    this.questionProgress = {
      total_questions: Number.isFinite(totalQuestions) ? totalQuestions : this.questionProgress.total_questions,
      questions_answered: Number.isFinite(answeredQuestions) ? answeredQuestions : this.questionProgress.questions_answered,
      questions_remaining: Number.isFinite(remainingQuestions) ? remainingQuestions : this.questionProgress.questions_remaining,
      current_level: Number.isFinite(currentLevel) && currentLevel > 0 ? currentLevel : this.questionProgress.current_level,
      current_difficulty_band: typeof progress.current_difficulty_band === 'string'
        ? progress.current_difficulty_band
        : this.questionProgress.current_difficulty_band,
      all_questions_complete: Boolean(progress.all_questions_complete),
      by_difficulty: byDifficulty,
    };
    this.syncAnsweredQuestionsFromProgress();
  }

  syncAnsweredQuestionsFromProgress() {
    const bands = this.getDifficultyBands();
    this.answeredQuestionsByLevel = bands.map((band, index) => {
      const bandProgress = this.questionProgress.by_difficulty && this.questionProgress.by_difficulty[band];
      if (bandProgress && typeof bandProgress === 'object') {
        return Number(bandProgress.answered || 0);
      }
      return Number(this.answeredQuestionsByLevel[index] || 0);
    });
  }

  scheduleNextLoop(delay = 10) {
    window.setTimeout(() => this.safeLoop(), delay);
  }

  getTargetForLevel(levelNumber) {
    if (Array.isArray(this.questionPlan.target_scores_by_level) && this.questionPlan.target_scores_by_level[levelNumber - 1]) {
      return this.questionPlan.target_scores_by_level[levelNumber - 1];
    }
    const index = Math.max(levelNumber - 1, 0);
    return DEFAULT_TARGET_SCORE_BASE * (index + 1) + DEFAULT_TARGET_SCORE_STEP * index;
  }

  getQuestionQuotaForLevel(levelNumber) {
    if (!Array.isArray(this.questionPlan.questions_per_level)) {
      return 0;
    }
    return Number(this.questionPlan.questions_per_level[levelNumber - 1] || 0);
  }

  getCaptureSlotsForLevel(levelNumber) {
    if (!Array.isArray(this.questionPlan.capture_slots_by_level)) {
      return [];
    }

    const levelSlots = this.questionPlan.capture_slots_by_level[levelNumber - 1];
    if (!Array.isArray(levelSlots)) {
      return [];
    }

    return levelSlots
      .map((slot) => Number(slot))
      .filter((slot) => Number.isFinite(slot) && slot > 0);
  }

  shouldRequestQuestionForCapture(levelNumber, captureIndex) {
    if (this.getRemainingQuestionsForLevel(levelNumber) <= 0) {
      return false;
    }

    const captureSlots = this.getCaptureSlotsForLevel(levelNumber);
    if (captureSlots.length === 0) {
      return false;
    }

    return captureSlots.includes(Number(captureIndex));
  }

  levelQuestionScheduleCompleted(levelNumber) {
    const band = this.getDifficultyForLevel(levelNumber);
    const bandProgress = band && this.questionProgress.by_difficulty
      ? this.questionProgress.by_difficulty[band]
      : null;
    if (bandProgress && typeof bandProgress === 'object') {
      return Number(bandProgress.remaining || 0) <= 0;
    }
    return this.getAnsweredQuestionsForLevel(levelNumber) >= this.getQuestionQuotaForLevel(levelNumber);
  }

  getAnsweredQuestionsForLevel(levelNumber) {
    return Number(this.answeredQuestionsByLevel[levelNumber - 1] || 0);
  }

  getRemainingQuestionsForLevel(levelNumber) {
    const band = this.getDifficultyForLevel(levelNumber);
    const bandProgress = band && this.questionProgress.by_difficulty
      ? this.questionProgress.by_difficulty[band]
      : null;
    if (bandProgress && typeof bandProgress === 'object') {
      return Math.max(Number(bandProgress.remaining || 0), 0);
    }
    return Math.max(this.getQuestionQuotaForLevel(levelNumber) - this.getAnsweredQuestionsForLevel(levelNumber), 0);
  }

  getDifficultyBands() {
    return Array.isArray(this.questionPlan.difficulty_bands) && this.questionPlan.difficulty_bands.length > 0
      ? this.questionPlan.difficulty_bands
      : DIFFICULTY_BANDS;
  }

  getDifficultyForLevel(levelNumber) {
    return this.getDifficultyBands()[Math.max(levelNumber - 1, 0)] || null;
  }

  getCurrentProgressLevel() {
    const levelNumber = Number(this.questionProgress.current_level || 1);
    return Math.max(1, Math.min(levelNumber, this.maxLevels || 1));
  }

  allQuestionsCompleted() {
    if (this.questionProgress.all_questions_complete) {
      return true;
    }
    const total = Number(this.questionProgress.total_questions || this.questionPlan.total_questions || 0);
    const answered = Number(this.questionProgress.questions_answered || 0);
    return total === 0 || answered >= total;
  }

  recordQuestionCompletion(questionResultPayload) {
    if (!questionResultPayload || typeof questionResultPayload !== 'object') {
      return;
    }

    const attemptTotals = questionResultPayload.attempt_totals || questionResultPayload.attemptTotals;
    if (attemptTotals) {
      this.applyAttemptTotals(attemptTotals);
      return;
    }

    const payload = questionResultPayload.question_result && typeof questionResultPayload.question_result === 'object'
      ? questionResultPayload.question_result
      : questionResultPayload;
    const questionAttemptId = payload.id || questionResultPayload.question_attempt_id || questionResultPayload.questionAttemptId;
    const levelValue = payload.source_payload && typeof payload.source_payload === 'object'
      ? payload.source_payload.level
      : questionResultPayload.level;
    const levelNumber = Number(levelValue || 0);

    if (!questionAttemptId || levelNumber <= 0 || this.completedQuestionAttemptIds.has(questionAttemptId)) {
      return;
    }

    this.completedQuestionAttemptIds.add(questionAttemptId);
    this.answeredQuestionsByLevel[levelNumber - 1] = this.getAnsweredQuestionsForLevel(levelNumber) + 1;
  }

  isLastLevel() {
    return Math.max(level + 1, 1) >= this.maxLevels;
  }

  advanceToNextLevel(reason) {
    if (this.allQuestionsCompleted()) {
      this.handleWin(reason);
      return;
    }

    const unlockedLevel = this.getCurrentProgressLevel();
    const nextLevel = Math.max(unlockedLevel, Math.max(level + 2, 2));

    if (bridge && typeof bridge.progress === 'function') {
      bridge.progress({
        status: 'running',
        reason,
        level: Math.max(level + 1, 1),
        nextLevel,
        score: this.score,
        targetScore: tager,
        timeRemaining: Math.max(0, Math.floor(time)),
      });
    }

    level = nextLevel - 2;
    this.newGold();
    this.scheduleNextLoop(10);
  }

  syncLevelWithProgress(reason) {
    if (!this.sessionReady) {
      return;
    }
    if (this.allQuestionsCompleted()) {
      this.handleWin(reason || 'all-questions-completed');
      return;
    }

    const unlockedLevel = this.getCurrentProgressLevel();
    const currentLevel = Math.max(level + 1, 1);
    if (unlockedLevel > currentLevel) {
      if (this.isLevelEnded) {
        this.advanceToNextLevel(reason || 'progress-synced');
        return;
      }

      this.reportState(reason || 'next-level-unlocked', true, {
        currentUnlockedLevel: unlockedLevel,
        pendingLevelTransition: true,
      });
      return;
    }

    if (this.isLevelEnded && unlockedLevel === currentLevel) {
      this.reportState('level-retry-available', true);
    }
  }

  newGold() {
    ok = false;
    index = -1;
    Xh = XXX;
    Yh = YYY;
    r = R;
    drag = false;
    timeH = -1;
    vlH = 0;
    time = this.timeLimitSeconds;
    level += 1;
    tager = this.getTargetForLevel(Math.max(level + 1, 1));
    this.capturedItemsInLevel = 0;
    this.resultOutcome = null;
    this.levelEndReason = null;
    this.isLevelEnded = false;
    this.isFinished = false;
    this.initGold();
    this.reportState('level-start', true, {
      questionsPlannedInLevel: this.getQuestionQuotaForLevel(Math.max(level + 1, 1)),
      difficultyBand: this.getDifficultyForLevel(Math.max(level + 1, 1)),
    });
  }

  listenKeyboard() {
    document.addEventListener('keydown', () => {
      this.solve();
    });
  }

  listenMouse() {
    document.addEventListener('mousedown', () => {
      this.solve();
    });
  }

  solve() {
    if (this.isLevelEnded && !this.isFinished) {
      this.retryCurrentLevel('player-retry-level');
      return;
    }

    if (!this.sessionReady || this.isFinished || drag) {
      return;
    }
    drag = true;
    d = true;
    speedReturn = this.getWidth() / 2;
    index = -1;
    this.reportState('hook-launch', true);
  }

  loop() {
    if (this.isFinished) {
      return;
    }

    if (this.isLevelEnded) {
      this.draw();
      this.scheduleNextLoop(100);
      return;
    }

    if (!this.sessionReady) {
      this.render();
      this.drawWaitingState();
      this.scheduleNextLoop(100);
      return;
    }

    if (this.isPaused) {
      this.draw();
      this.reportState('paused');
      this.scheduleNextLoop(100);
      return;
    }

    this.update();
    this.draw();
    this.reportState('tick');

    const currentLevel = Math.max(level + 1, 1);
    const clearedAllTargets = this.checkWin();
    if (clearedAllTargets) {
      if (this.levelQuestionScheduleCompleted(currentLevel)) {
        this.advanceToNextLevel('level-questions-completed');
      } else {
        this.handleLevelFail('board-cleared-questions-remaining');
      }
      return;
    }

    if (time <= 0) {
      if (this.levelQuestionScheduleCompleted(currentLevel)) {
        this.advanceToNextLevel('time-up-level-complete');
        return;
      }

      this.handleLevelFail('time-up');
      return;
    }

    this.scheduleNextLoop(10);
  }

  handleLevelFail(reason) {
    this.isLevelEnded = true;
    this.resultOutcome = 'level_failed';
    this.levelEndReason = reason || 'level-ended';
    this.draw();
    this.reportState('level-failed', true, {
      status: 'paused',
      outcome: 'level_failed',
      reason: this.levelEndReason,
      timeRemaining: 0,
    });
    this.scheduleNextLoop(100);
  }

  retryCurrentLevel(reason) {
    this.reportState(reason || 'retry-level', true);
    level = Math.max(level + 1, 1) - 2;
    this.newGold();
    this.scheduleNextLoop(10);
  }

  handleWin(reason) {
    if (this.isFinished) {
      return;
    }
    this.isFinished = true;
    this.isLevelEnded = false;
    this.resultOutcome = 'success';
    this.draw();
    this.reportState('win', true, {
      status: 'completed',
      outcome: 'success',
      reason,
      timeRemaining: Math.max(0, Math.floor(time)),
    });

    if (bridge && typeof bridge.complete === 'function') {
      bridge.complete({
        status: 'completed',
        outcome: 'success',
        reason,
        score: this.score,
        level: Math.max(level + 1, 1),
        targetScore: tager,
        timeRemaining: Math.max(0, Math.floor(time)),
      });
    }
  }

  reportState(reason, force = false, extra = {}) {
    if (!bridge || typeof bridge.state !== 'function') {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastReportedAt < 250) {
      return;
    }
    this.lastReportedAt = now;

    bridge.state({
      status: this.isFinished ? 'completed' : (this.isPaused || this.isLevelEnded) ? 'paused' : 'running',
      reason,
      score: this.score,
      level: Math.max(level + 1, 1),
      difficultyBand: this.getDifficultyForLevel(Math.max(level + 1, 1)),
      difficultyLabel: DIFFICULTY_LABELS[this.getDifficultyForLevel(Math.max(level + 1, 1))] || '',
      targetScore: tager,
      timeRemaining: Math.max(0, Math.floor(time)),
      timeRemainingPrecise: Math.max(0, Number(time.toFixed(2))),
      dragging: drag,
      capturesInLevel: this.capturedItemsInLevel,
      answeredQuestionsInLevel: this.getAnsweredQuestionsForLevel(Math.max(level + 1, 1)),
      questionQuotaInLevel: this.getQuestionQuotaForLevel(Math.max(level + 1, 1)),
      remainingQuestionsInLevel: this.getRemainingQuestionsForLevel(Math.max(level + 1, 1)),
      totalQuestions: this.questionProgress.total_questions,
      questionsAnswered: this.questionProgress.questions_answered,
      questionsRemaining: this.questionProgress.questions_remaining,
      currentUnlockedLevel: this.getCurrentProgressLevel(),
      allQuestionsComplete: this.allQuestionsCompleted(),
      ...extra,
    });
  }

  update() {
    this.render();
    time -= 0.01;
    Xh = XXX + r * Math.cos(this.toRadian(angle));
    Yh = YYY + r * Math.sin(this.toRadian(angle));

    if (!drag) {
      angle += ChAngle;
      if (angle >= 165 || angle <= 15) {
        ChAngle = -ChAngle;
      }
    } else {
      if (r < MaxLeng && d && !ok) {
        r += this.getWidth() / 5;
      } else {
        d = false;
        r -= speedReturn / 2.5;
      }

      if (r < R) {
        r = R;
        drag = false;
        ok = false;
        index = -1;

        for (let i = 0; i < N; i += 1) {
          if (this.gg[i].alive && this.range(Xh, Yh, this.gg[i].x, this.gg[i].y) <= 2 * this.getWidth()) {
            const collectedItem = this.gg[i];
            const scoreBefore = this.score;
            this.gg[i].alive = false;
            this.score += this.gg[i].score;
            this.capturedItemsInLevel += 1;
            timeH = time - 0.7;
            vlH = this.gg[i].score;

            const currentLevel = Math.max(level + 1, 1);
            const shouldTriggerQuestion = this.shouldRequestQuestionForCapture(currentLevel, this.capturedItemsInLevel);
            if (shouldTriggerQuestion && bridge && typeof bridge.questionTrigger === 'function') {
              bridge.questionTrigger({
                triggerType: 'item_captured',
                triggerKey: 'item_type',
                triggerValue: collectedItem.itemType || 'rock',
                eventPayload: {
                  rawType: collectedItem.type,
                  item_instance_id: collectedItem.instanceId,
                  capture_index_in_level: this.capturedItemsInLevel,
                  scoreValue: collectedItem.score,
                  scoreBefore: scoreBefore,
                  scoreAfter: this.score,
                  level: currentLevel,
                  difficulty_band: this.getDifficultyForLevel(currentLevel),
                  remaining_questions_in_level: this.getRemainingQuestionsForLevel(currentLevel),
                  targetScore: tager,
                  timeRemaining: Math.max(0, Math.floor(time)),
                },
              });
            }

            this.reportState('item-collected', true, {
              collectedScore: this.gg[i].score,
              collectedItemType: collectedItem.itemType || 'rock',
              score: this.score,
              captureIndexInLevel: this.capturedItemsInLevel,
              difficultyBand: this.getDifficultyForLevel(currentLevel),
              questionScheduled: shouldTriggerQuestion,
            });
            break;
          }
        }
      }
    }

    if (drag && index === -1) {
      for (let i = 0; i < N; i += 1) {
        if (this.gg[i].alive && this.range(Xh, Yh, this.gg[i].x, this.gg[i].y) <= this.gg[i].size()) {
          ok = true;
          index = i;
          break;
        }
      }
    }

    if (index !== -1) {
      this.gg[index].x = Xh;
      this.gg[index].y = Yh + this.gg[index].height / 3;
      speedReturn = this.gg[index].speed;
    }
  }

  render() {
    if (game_W !== document.documentElement.clientWidth || game_H !== document.documentElement.clientHeight) {
      this.canvas.width = document.documentElement.clientWidth;
      this.canvas.height = document.documentElement.clientHeight;
      game_W = this.canvas.width;
      game_H = this.canvas.height;
      XXX = game_W / 2;
      YYY = game_H * 0.18;
      R = this.getWidth() * 2;
      if (!drag) {
        r = R;
      }
      MaxLeng = this.range(XXX, YYY, game_W - 2 * this.getWidth(), game_H - 2 * this.getWidth());
    }
  }

  draw() {
    this.clearScreen();

    if (!this.sessionReady) {
      this.drawWaitingState();
      return;
    }

    for (let i = 0; i < N; i += 1) {
      const item = this.gg[i];
      if (item && item.alive) {
        item.update();
        item.draw();
      }
    }

    this.context.beginPath();
    this.context.strokeStyle = '#FF0000';
    this.context.lineWidth = Math.floor(this.getWidth() / 10);
    this.context.moveTo(XXX, YYY);
    this.context.lineTo(Xh, Yh);
    this.context.stroke();

    this.context.beginPath();
    this.context.arc(XXX, YYY, 3, 0, 2 * Math.PI);
    this.context.stroke();

    this.context.save();
    this.context.translate(Xh, Yh);
    this.context.rotate(this.toRadian(angle - 90));
    this.drawImageSafe(hook, -this.getWidth() / 4, -this.getWidth() / 8, this.getWidth() / 2, this.getWidth() / 2);
    this.context.restore();

    this.drawText();

    if (this.isFinished || this.isLevelEnded) {
      this.drawResultOverlay();
    }
  }

  drawWaitingState() {
    this.context.fillStyle = 'rgba(2, 6, 23, 0.72)';
    this.context.fillRect(0, 0, game_W, game_H);

    this.context.fillStyle = '#FFFFFF';
    this.context.textAlign = 'center';
    this.context.font = `bold ${Math.max(28, this.getWidth())}px Arial`;
    this.context.fillText('Đang chuẩn bị màn chơi', game_W / 2, game_H / 2 - this.getWidth() * 0.4);
    this.context.font = `${Math.max(16, this.getWidth() * 0.45)}px Arial`;
    this.context.fillText('EduHub đang đồng bộ dữ liệu câu hỏi và phiên chơi.', game_W / 2, game_H / 2 + this.getWidth() * 0.4);
    this.context.textAlign = 'start';
  }

  drawResultOverlay() {
    this.context.fillStyle = 'rgba(2, 6, 23, 0.78)';
    this.context.fillRect(0, 0, game_W, game_H);

    this.context.fillStyle = '#FFFFFF';
    this.context.textAlign = 'center';
    this.context.font = `bold ${Math.max(32, this.getWidth() * 1.3)}px Arial`;
    this.context.fillText(this.resultOutcome === 'success' ? 'Hoàn thành' : 'Màn chơi kết thúc', game_W / 2, game_H / 2 - this.getWidth());

    this.context.font = `${Math.max(20, this.getWidth() * 0.6)}px Arial`;
    this.context.fillText(`Score: ${this.score}`, game_W / 2, game_H / 2);
    this.context.fillText(
      this.resultOutcome === 'success'
        ? 'Em đã hoàn thành toàn bộ câu hỏi.'
        : 'Nhấn chuột hoặc bấm phím bất kỳ để chơi lại màn này.',
      game_W / 2,
      game_H / 2 + this.getWidth(),
    );
    if (this.resultOutcome !== 'success') {
      this.context.fillText(
        `Còn ${this.getRemainingQuestionsForLevel(Math.max(level + 1, 1))} câu trong mức này`,
        game_W / 2,
        game_H / 2 + this.getWidth() * 1.8,
      );
    }
    this.context.textAlign = 'start';
  }

  drawText() {
    this.drawImageSafe(dolarIM, this.getWidth() / 2, this.getWidth() / 2, this.getWidth(), this.getWidth());
    this.context.fillStyle = 'red';
    if (this.score > tager) {
      this.context.fillStyle = '#FF6600';
    }
    this.context.font = `${this.getWidth()}px Stencil`;
    this.context.fillText(this.score, this.getWidth() * 1.5, this.getWidth() * 1.35);

    this.drawImageSafe(targetIM, this.getWidth() / 2, this.getWidth() / 2 + this.getWidth(), this.getWidth(), this.getWidth());
    this.context.fillStyle = '#FF6600';
    this.context.font = `${this.getWidth()}px Stencil`;
    this.context.fillText(tager, this.getWidth() * 1.5, this.getWidth() * 2.35);

    this.drawImageSafe(levelIM, game_W - 3 * this.getWidth(), this.getWidth() / 2, this.getWidth(), this.getWidth());
    this.context.fillStyle = '#FFFFCC';
    this.context.font = `${this.getWidth()}px Stencil`;
    this.context.fillText(level + 1, game_W - 2 * this.getWidth(), this.getWidth() * 1.35);
    this.context.font = `${Math.max(12, this.getWidth() * 0.35)}px Arial`;
    const difficultyLabel = DIFFICULTY_LABELS[this.getDifficultyForLevel(Math.max(level + 1, 1))] || '';
    this.context.fillText(difficultyLabel, game_W - 4.4 * this.getWidth(), this.getWidth() * 1.75);

    this.drawImageSafe(clockIM, game_W - 3 * this.getWidth(), this.getWidth() / 2 + this.getWidth(), this.getWidth(), this.getWidth());
    this.context.fillStyle = '#FF00FF';
    this.context.font = `${this.getWidth()}px Stencil`;
    this.context.fillText(Math.floor(time), game_W - 2 * this.getWidth(), this.getWidth() * 2.35);
    this.context.font = `${Math.max(12, this.getWidth() * 0.35)}px Arial`;
    this.context.fillText(
      `Câu còn lại: ${this.getRemainingQuestionsForLevel(Math.max(level + 1, 1))}`,
      game_W - 4.4 * this.getWidth(),
      this.getWidth() * 2.75,
    );

    if (Math.abs(timeH - time) <= 0.7) {
      this.context.fillStyle = 'red';
      this.context.fillText(`+${vlH}`, XXX, YYY * 0.8);
    }
  }

  clearScreen() {
    this.context.clearRect(0, 0, game_W, game_H);
    if (!isImageReady(bg)) {
      const gradient = this.context.createLinearGradient(0, 0, 0, game_H);
      gradient.addColorStop(0, '#38bdf8');
      gradient.addColorStop(0.55, '#facc15');
      gradient.addColorStop(1, '#78350f');
      this.context.fillStyle = gradient;
      this.context.fillRect(0, 0, game_W, game_H);
      return;
    }

    const sourceHeight = bg.naturalHeight || bg.height;
    const sourceWidth = bg.naturalWidth || bg.width;
    const scaledWidth = game_W * (sourceHeight / game_H);
    this.drawImageSafe(
      bg,
      (sourceWidth - scaledWidth) / 2,
      0,
      scaledWidth,
      sourceHeight,
      0,
      0,
      game_W,
      game_H,
    );
  }

  checkWin() {
    if (!this.sessionReady || this.gg.length === 0) {
      return false;
    }

    let check = true;
    for (let i = 0; i < N; i += 1) {
      const item = this.gg[i];
      if (item && item.alive === true) {
        check = false;
      }
    }
    return check;
  }

  getSpawnBounds(item) {
    const unit = this.getWidth();
    const horizontalMargin = unit * 0.75;
    const verticalMargin = unit * 0.75;
    const minX = item.width / 2 + horizontalMargin;
    const maxX = game_W - item.width / 2 - horizontalMargin;
    const minY = Math.max(game_H / 3 + item.height / 2 + unit * 0.35, YYY + unit * 3.2);
    const maxY = game_H - item.height / 2 - verticalMargin;

    return {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minY: Math.min(minY, maxY),
      maxY: Math.max(minY, maxY),
    };
  }

  getRandomSpawnPoint(bounds) {
    const spanX = Math.max(bounds.maxX - bounds.minX, 1);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1);

    return {
      x: bounds.minX + Math.random() * spanX,
      y: bounds.minY + Math.random() * spanY,
    };
  }

  clampSpawnPoint(point, bounds) {
    return {
      x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
      y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
    };
  }

  getItemRectAt(item, x, y, padding = 0) {
    return {
      left: x - item.width / 2 - padding,
      right: x + item.width / 2 + padding,
      top: y - item.height / 2 - padding,
      bottom: y + item.height / 2 + padding,
    };
  }

  getRectOverlapArea(rectA, rectB) {
    const overlapX = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left);
    const overlapY = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top);
    if (overlapX <= 0 || overlapY <= 0) {
      return 0;
    }
    return overlapX * overlapY;
  }

  getSpawnOverlapScore(item, x, y, placedItems, padding) {
    const rect = this.getItemRectAt(item, x, y, padding);
    let overlapScore = 0;

    for (let i = 0; i < placedItems.length; i += 1) {
      const placedItem = placedItems[i];
      overlapScore += this.getRectOverlapArea(
        rect,
        this.getItemRectAt(placedItem, placedItem.x, placedItem.y, padding),
      );
    }

    return overlapScore;
  }

  findSpawnPoint(item, placedItems) {
    const bounds = this.getSpawnBounds(item);
    const unit = this.getWidth();
    const paddings = [
      Math.max(unit * 0.18, 8),
      Math.max(unit * 0.1, 4),
      0,
    ];
    const gridStepX = Math.max(item.width * 0.72, unit * 1.15);
    const gridStepY = Math.max(item.height * 0.72, unit * 1.1);
    const spanX = Math.max(bounds.maxX - bounds.minX, 1);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1);

    let bestPoint = this.clampSpawnPoint({
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    }, bounds);
    let bestScore = Number.POSITIVE_INFINITY;

    for (let paddingIndex = 0; paddingIndex < paddings.length; paddingIndex += 1) {
      const padding = paddings[paddingIndex];

      for (let attempt = 0; attempt < 80; attempt += 1) {
        const point = this.getRandomSpawnPoint(bounds);
        const score = this.getSpawnOverlapScore(item, point.x, point.y, placedItems, padding);
        if (score < bestScore) {
          bestScore = score;
          bestPoint = point;
        }
        if (score === 0) {
          return point;
        }
      }

      const columnCount = Math.max(1, Math.floor(spanX / gridStepX));
      const rowCount = Math.max(1, Math.floor(spanY / gridStepY));
      const cellWidth = spanX / columnCount;
      const cellHeight = spanY / rowCount;

      for (let row = 0; row < rowCount; row += 1) {
        for (let column = 0; column < columnCount; column += 1) {
          const staggerOffset = row % 2 === 0 ? 0.5 : 0.35;
          const point = this.clampSpawnPoint({
            x: bounds.minX + cellWidth * (column + staggerOffset),
            y: bounds.minY + cellHeight * (row + 0.5),
          }, bounds);
          const score = this.getSpawnOverlapScore(item, point.x, point.y, placedItems, padding);
          if (score < bestScore) {
            bestScore = score;
            bestPoint = point;
          }
          if (score === 0) {
            return point;
          }
        }
      }
    }

    return bestPoint;
  }

  repairSpawnLayout(items) {
    const padding = Math.max(this.getWidth() * 0.08, 2);

    for (let pass = 0; pass < 2; pass += 1) {
      let moved = false;

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const otherItems = items.filter((_, otherIndex) => otherIndex !== index);
        if (this.getSpawnOverlapScore(item, item.x, item.y, otherItems, padding) === 0) {
          continue;
        }

        const nextPoint = this.findSpawnPoint(item, otherItems);
        if (nextPoint.x !== item.x || nextPoint.y !== item.y) {
          item.x = nextPoint.x;
          item.y = nextPoint.y;
          moved = true;
        }
      }

      if (!moved) {
        break;
      }
    }
  }

  countSpawnOverlaps(items) {
    const padding = Math.max(this.getWidth() * 0.05, 1);
    let overlapCount = 0;

    for (let leftIndex = 0; leftIndex < items.length - 1; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const overlapArea = this.getRectOverlapArea(
          this.getItemRectAt(items[leftIndex], items[leftIndex].x, items[leftIndex].y, padding),
          this.getItemRectAt(items[rightIndex], items[rightIndex].x, items[rightIndex].y, padding),
        );
        if (overlapArea > 0) {
          overlapCount += 1;
        }
      }
    }

    return overlapCount;
  }

  initGold() {
    const currentLevel = Math.max(level + 1, 1);
    this.gg = ITEM_TYPE_PLAN.map((type, itemIndex) => new gold(this, type, `level-${currentLevel}-item-${itemIndex + 1}`));

    const itemsByArea = [...this.gg].sort((leftItem, rightItem) => (
      rightItem.width * rightItem.height - leftItem.width * leftItem.height
    ));

    for (let index = 0; index < itemsByArea.length; index += 1) {
      const item = itemsByArea[index];
      const point = this.findSpawnPoint(item, itemsByArea.slice(0, index));
      item.x = point.x;
      item.y = point.y;
    }

    this.repairSpawnLayout(this.gg);

    const overlapCount = this.countSpawnOverlaps(this.gg);
    if (overlapCount > 0 && bridge && typeof bridge.state === 'function') {
      bridge.state({
        status: 'running',
        reason: 'layout-relaxed',
        level: currentLevel,
        overlapCount,
      });
    }
  }

  getWidth() {
    const area = document.documentElement.clientWidth * document.documentElement.clientHeight;
    return Math.sqrt(area / 300);
  }

  toRadian(currentAngle) {
    return (currentAngle / 180) * Math.PI;
  }

  range(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  }
}

new game();
