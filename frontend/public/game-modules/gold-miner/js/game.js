// ============================================================
// Gold Miner - EduHub Game Module
// ============================================================

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
let timeH = 0;
let vlH = 0;

const bridge = window.EduHubGameBridge || null;

// Item types: 15 items per level
const ITEM_TYPE_PLAN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// Game constants
const DEFAULT_TIME_LIMIT_SECONDS = 60;
const DEFAULT_TARGET_SCORE_BASE = 1000;
const DEFAULT_TARGET_SCORE_STEP = 180;
const N = ITEM_TYPE_PLAN.length;

// Lives constants
const INITIAL_LIVES = 3;

// Difficulty bands
const DIFFICULTY_BANDS = ['recognition', 'comprehension', 'application_basic', 'application_advanced'];
const DIFFICULTY_LABELS = {
  recognition: 'Nhận biết',
  comprehension: 'Thông hiểu',
  application_basic: 'Vận dụng thấp',
  application_advanced: 'Vận dụng cao',
};

// Difficulty to itemType mapping
const DIFFICULTY_ITEM_TYPES = {
  recognition: 'rock',
  comprehension: 'medium_gold',
  application_basic: 'big_gold',
  application_advanced: 'diamond',
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

// Lives icons (drawn via canvas if images not available)
const heartFullIM = new Image();
heartFullIM.src = 'images/heart_full.png';

const heartEmptyIM = new Image();
heartEmptyIM.src = 'images/heart_empty.png';

// Helper to draw heart using canvas (fallback)
function drawHeartOnCanvas(ctx, x, y, size, filled) {
  const width = size;
  const height = size;
  ctx.save();
  ctx.translate(x - width / 2, y - height / 2);
  
  ctx.beginPath();
  const topCurveHeight = height * 0.3;
  ctx.moveTo(width / 2, topCurveHeight);
  
  // Left curve
  ctx.bezierCurveTo(
    width * 0.1, 0,
    0, height * 0.3,
    0, height * 0.5
  );
  
  // Bottom left
  ctx.bezierCurveTo(
    0, height * 0.7,
    width * 0.2, height * 0.9,
    width / 2, height
  );
  
  // Bottom right
  ctx.bezierCurveTo(
    width * 0.8, height * 0.9,
    width, height * 0.7,
    width, height * 0.5
  );
  
  // Right curve
  ctx.bezierCurveTo(
    width, height * 0.3,
    width * 0.9, 0,
    width / 2, topCurveHeight
  );
  
  ctx.closePath();
  
  if (filled) {
    ctx.fillStyle = '#FF0000';
    ctx.fill();
  } else {
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.fill();
  }
  
  ctx.restore();
}

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

    // Lives system
    this.lives = INITIAL_LIVES;
    this.maxLives = INITIAL_LIVES;

    // Waiting for manual restart after game over
    this.waitingForRestart = false;

    // Target score for current level
    this.targetScore = 0;

    // Runtime config from host (populated via host:init message)
    this.runtimeConfig = null;

    // Pending item scores - items caught but score held until question answered
    this.pendingItemScores = [];

    // Runtime config from host (populated via host:init message)
    
    // Time tracking (count-up)
    this.elapsedTimeSeconds = 0;
    this.questionStartTime = null;
    this.totalQuestionTimeMs = 0;
    
    // Question tracking for retry logic
    this.wrongAnswerQuestionIds = new Set();
    this.allQuestionIdsInLevel = [];
    
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
    // Set targetScore first, before any bridge calls
    // Use runtimeConfig if provided via host:init, otherwise use default
    const targetScoreFromConfig = this.runtimeConfig && typeof this.runtimeConfig.targetScore === 'number' 
      ? this.runtimeConfig.targetScore 
      : this.getTargetForLevel(1);
    this.targetScore = targetScoreFromConfig;

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
    this.context.fillText('Dang khoi dong lai man choi', game_W / 2, game_H / 2 - this.getWidth() * 0.4);
    this.context.font = `${Math.max(14, this.getWidth() * 0.42)}px Arial`;
    this.context.fillText(message || 'EduHub dang khoi phuc module tro choi.', game_W / 2, game_H / 2 + this.getWidth() * 0.4);
    this.context.textAlign = 'start';
  }

  attachBridge() {
    if (!bridge || typeof bridge.onHostMessage !== 'function') {
      return;
    }

    bridge.onHostMessage((type, payload) => {
      if (type === 'host:pause') {
        // Track question start time when pausing for question
        if (!this.questionStartTime && payload && payload.trigger) {
          this.questionStartTime = Date.now();
        }
        this.isPaused = true;
        this.reportState('paused', true);
        return;
      }

      if (type === 'host:init') {
        if (this.readyHeartbeatId) {
          window.clearInterval(this.readyHeartbeatId);
          this.readyHeartbeatId = null;
        }
        this.runtimeConfig = (payload && payload.runtimeConfig) ? payload.runtimeConfig : null;
        this.applyRuntimeConfig(this.runtimeConfig);
        this.applyAttemptTotals(payload && payload.attemptTotals ? payload.attemptTotals : null);
        this.resetSession();
        this.didHostInit = true;
        this.isPaused = false;
        // Update targetScore based on runtimeConfig now that it's available
        this.targetScore = (this.runtimeConfig && typeof this.runtimeConfig.targetScore === 'number')
          ? this.runtimeConfig.targetScore
          : this.getTargetForLevel(Math.max(level + 1, 1));
        this.reportState('host-init', true, {
          questionResult: payload && payload.questionResult ? payload.questionResult : null,
        });
        return;
      }

      if (type === 'host:resume') {
        // Debug: uncomment to see full payload
        // console.log('[GoldMiner] host:resume received:', JSON.stringify(payload, null, 2));
        this.applyAttemptTotals(payload && payload.attemptTotals ? payload.attemptTotals : null);
        if (payload && payload.questionResult) {
          const result = payload.questionResult;

          // Track question answer time
          if (this.questionStartTime) {
            const questionTimeMs = Date.now() - this.questionStartTime;
            this.totalQuestionTimeMs += questionTimeMs;
            this.questionStartTime = null;
          }

          // Get wrong attempts from response
          const wrongAttempts = payload.wrong_attempts || 0;
          const isGameOver = payload.game_over === true;

          // Handle wrong answer
          // Note: payload.questionResult contains { question_result: {...}, attempt_totals: {...} }
          const questionResultData = result.question_result || result;
          const isCorrect = questionResultData.isCorrect || questionResultData.is_correct;
          if (isCorrect === false) {
            // Use wrong attempts from backend for tracking
            this.lives = Math.max(0, this.maxLives - wrongAttempts);
            this.handleWrongAnswer(questionResultData, wrongAttempts);
          } else {
            this.recordQuestionCompletion(payload.questionResult);
          }

          // Handle game over from backend
          if (isGameOver) {
            this.handleGameOver('max_wrong_attempts');
          }
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

  handleWrongAnswer(result, wrongAttempts = 0) {
    // Deduct one life (use backend's wrong attempts count)
    this.lives = Math.max(0, this.maxLives - wrongAttempts);

    // Report wrong answer event
    if (bridge && typeof bridge.state === 'function') {
      bridge.state({
        status: 'running',
        reason: 'wrong-answer',
        lives: this.lives,
        maxLives: this.maxLives,
        wrongAttempts: wrongAttempts,
        feedbackMessage: result.feedbackMessage || result.feedback_message || 'Tra loi sai! Con lai ' + this.lives + ' mang.',
      });
    }

    // Check if game over (handled by backend, but keep local check for safety)
    if (this.lives <= 0) {
      this.handleGameOver('lives-depleted');
    }
    // Note: We do NOT mark the question as completed
    // The question stays in the incomplete pool
  }

  handleGameOver(reason = 'lives-depleted') {
    this.isFinished = true;
    this.waitingForRestart = true;
    this.resultOutcome = 'game_over';
    this.reportState('game-over', true, {
      status: 'completed',
      outcome: 'game_over',
      reason: reason,
      lives: 0,
      maxLives: this.maxLives,
    });

    if (bridge && typeof bridge.complete === 'function') {
      bridge.complete({
        status: 'completed',
        outcome: 'game_over',
        reason: reason,
        score: this.score,
        level: Math.max(level + 1, 1),
        lives: 0,
        maxLives: this.maxLives,
        totalQuestionTimeMs: this.totalQuestionTimeMs,
      });
    }
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

    // Apply lives if provided in config
    if (session && typeof session.max_lives === 'number') {
      this.maxLives = session.max_lives;
      this.lives = session.max_lives;
    }

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

    // Reset lives
    this.lives = this.maxLives;

    // Reset time tracking
    this.elapsedTimeSeconds = 0;
    this.questionStartTime = null;
    this.totalQuestionTimeMs = 0;

    // Reset wrong answer tracking
    this.wrongAnswerQuestionIds = new Set();

    // Reset pending scores
    this.pendingItemScores = [];

    level = this.getCurrentProgressLevel() - 2;
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
    
    // Restore wrong answer question IDs from attempt totals
    if (attemptTotals.wrong_answer_question_ids) {
      this.wrongAnswerQuestionIds = new Set(attemptTotals.wrong_answer_question_ids);
    }

    // Update lives based on wrong_attempts from backend
    const wrongAttempts = attemptTotals.wrong_attempts;
    if (typeof wrongAttempts === 'number' && wrongAttempts >= 0) {
      this.lives = Math.max(0, this.maxLives - wrongAttempts);
    }
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

  getQuestionsPerLevel(levelNumber) {
    if (!this.questionPlan || !this.questionPlan.questions_per_level) {
      return 10; // default
    }
    if (Array.isArray(this.questionPlan.questions_per_level)) {
      return Number(this.questionPlan.questions_per_level[levelNumber - 1] || 10);
    }
    return Number(this.questionPlan.questions_per_level || 10);
  }

  getNonQuestionItemsCount(levelNumber) {
    if (!this.questionPlan || !this.questionPlan.non_question_items) {
      return 5; // default
    }
    if (Array.isArray(this.questionPlan.non_question_items)) {
      return Number(this.questionPlan.non_question_items[levelNumber - 1] || 5);
    }
    return Number(this.questionPlan.non_question_items || 5);
  }

  getTotalItemsPerLevel(levelNumber) {
    return this.getQuestionsPerLevel(levelNumber) + this.getNonQuestionItemsCount(levelNumber);
  }

  getQuestionQuotaForLevel(levelNumber) {
    return this.getQuestionsPerLevel(levelNumber);
  }

  getCaptureSlotsForLevel(levelNumber) {
    // For Gold Miner new logic: every capture index from 1 to questions_per_level triggers a question
    const questionsPerLevel = this.getQuestionsPerLevel(levelNumber);
    const slots = [];
    for (let i = 1; i <= questionsPerLevel; i++) {
      slots.push(i);
    }
    return slots;
  }

  isQuestionItem(captureIndex, levelNumber) {
    // First N items are question items, rest are bonus items
    const questionsPerLevel = this.getQuestionsPerLevel(levelNumber);
    return captureIndex <= questionsPerLevel;
  }

  shouldRequestQuestionForCapture(levelNumber, captureIndex) {
    // Check if this capture triggers a question
    const captureSlots = this.getCaptureSlotsForLevel(levelNumber);
    if (captureSlots.length === 0) {
      return false;
    }

    // Check if within total items per level
    const totalItems = this.getTotalItemsPerLevel(levelNumber);
    if (captureIndex > totalItems) {
      return false;
    }

    // Check if this is a question item (within question slots)
    return this.isQuestionItem(captureIndex, levelNumber) && captureSlots.includes(Number(captureIndex));
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

    // Check if we need to process question completion
    const hasQuestionResult = questionResultPayload.question_result || questionResultPayload.questionResult;
    
    // If we have attempt_totals but no question_result, just update totals and return
    const attemptTotals = questionResultPayload.attempt_totals || questionResultPayload.attemptTotals;
    if (attemptTotals && !hasQuestionResult) {
      this.applyAttemptTotals(attemptTotals);
      return;
    }

    const payload = (questionResultPayload.question_result || questionResultPayload.questionResult) && typeof (questionResultPayload.question_result || questionResultPayload.questionResult) === 'object'
      ? (questionResultPayload.question_result || questionResultPayload.questionResult)
      : questionResultPayload;
    const questionAttemptId = payload.id || questionResultPayload.question_attempt_id || questionResultPayload.questionAttemptId;
    const levelValue = payload.source_payload && typeof payload.source_payload === 'object'
      ? payload.source_payload.level
      : questionResultPayload.level;
    const levelNumber = Number(levelValue || 0);
    const itemInstanceId = payload.source_payload && typeof payload.source_payload === 'object'
      ? payload.source_payload.item_instance_id
      : null;

    if (!itemInstanceId) {
      return;
    }
    
    if (!questionAttemptId || levelNumber <= 0 || this.completedQuestionAttemptIds.has(questionAttemptId)) {
      return;
    }

    this.completedQuestionAttemptIds.add(questionAttemptId);
    this.answeredQuestionsByLevel[levelNumber - 1] = this.getAnsweredQuestionsForLevel(levelNumber) + 1;

    // Add pending item score if this was a question item
    if (itemInstanceId) {
      const pendingIndex = this.pendingItemScores.findIndex(p => p.instanceId === itemInstanceId);
      if (pendingIndex !== -1) {
        const pendingItem = this.pendingItemScores.splice(pendingIndex, 1)[0];
        this.score += pendingItem.score;
      }
    }
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
        targetScore: this.targetScore,
        elapsedTime: Math.floor(this.elapsedTimeSeconds),
        lives: this.lives,
        maxLives: this.maxLives,
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
    level += 1;
    this.targetScore = this.getTargetForLevel(Math.max(level + 1, 1));
    this.capturedItemsInLevel = 0;
    this.resultOutcome = null;
    this.levelEndReason = null;
    this.isLevelEnded = false;
    this.isFinished = false;
    this.initGold();
    this.reportState('level-start', true, {
      questionsPlannedInLevel: this.getQuestionQuotaForLevel(Math.max(level + 1, 1)),
      difficultyBand: this.getDifficultyForLevel(Math.max(level + 1, 1)),
      lives: this.lives,
      maxLives: this.maxLives,
    });
  }

  listenKeyboard() {
    document.addEventListener('keydown', () => {
      if (this.isFinished && this.waitingForRestart) {
        this.restartGame();
        return;
      }
      this.solve();
    });
  }

  listenMouse() {
    document.addEventListener('mousedown', () => {
      if (this.isFinished && this.waitingForRestart) {
        this.restartGame();
        return;
      }
      this.solve();
    });
  }

  restartGame() {
    // Reset all game state for restart
    this.lives = this.maxLives;
    this.score = 0;
    this.gg = [];
    this.isFinished = false;
    this.waitingForRestart = false;
    this.isLevelEnded = false;
    this.resultOutcome = null;
    this.levelEndReason = null;
    this.runtimeErrorCount = 0;
    this.capturedItemsInLevel = 0;
    this.elapsedTimeSeconds = 0;
    this.questionStartTime = null;
    this.totalQuestionTimeMs = 0;
    this.wrongAnswerQuestionIds = new Set();
    this.completedQuestionAttemptIds = new Set();
    this.pendingItemScores = [];
    this.syncAnsweredQuestionsFromProgress();
    level = this.getCurrentProgressLevel() - 2;
    this.newGold();
    this.reportState('restarted', true);
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
    speedReturn = this.getWidth() / 6;
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

    // Count-up time (elapsed time)
    this.elapsedTimeSeconds += 0.01;
    
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

    // No time limit - game continues until all questions answered
    // or player chooses to restart
    
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
      lives: this.lives,
      maxLives: this.maxLives,
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
      elapsedTime: Math.floor(this.elapsedTimeSeconds),
      totalQuestionTimeMs: this.totalQuestionTimeMs,
      lives: this.lives,
      maxLives: this.maxLives,
    });

    if (bridge && typeof bridge.complete === 'function') {
      bridge.complete({
        status: 'completed',
        outcome: 'success',
        reason,
        score: this.score,
        level: Math.max(level + 1, 1),
        targetScore: this.targetScore,
        elapsedTime: Math.floor(this.elapsedTimeSeconds),
        totalQuestionTimeMs: this.totalQuestionTimeMs,
        lives: this.lives,
        maxLives: this.maxLives,
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
      targetScore: this.targetScore,
      // Time is now count-up (elapsed time)
      elapsedTime: Math.floor(this.elapsedTimeSeconds),
      elapsedTimePrecise: Number(this.elapsedTimeSeconds.toFixed(2)),
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
      // Lives system
      lives: this.lives,
      maxLives: this.maxLives,
      // Wrong answer tracking
      wrongAnswerCount: this.wrongAnswerQuestionIds ? this.wrongAnswerQuestionIds.size : 0,
      ...extra,
    });
  }

  update() {
    this.render();
    Xh = XXX + r * Math.cos(this.toRadian(angle));
    Yh = YYY + r * Math.sin(this.toRadian(angle));

    if (!drag) {
      angle += ChAngle;
      if (angle >= 165 || angle <= 15) {
        ChAngle = -ChAngle;
      }
      // Keep rope short while swinging
      if (r > MaxLeng) {
        r = MaxLeng;
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
            this.gg[i].alive = false;
            this.capturedItemsInLevel += 1;
            timeH = this.elapsedTimeSeconds - 0.7;
            vlH = collectedItem.score;

            const currentLevel = Math.max(level + 1, 1);
            const shouldTriggerQuestion = this.shouldRequestQuestionForCapture(currentLevel, this.capturedItemsInLevel);
            const isQuestionItem = this.isQuestionItem(this.capturedItemsInLevel, currentLevel);

            if (isQuestionItem) {
              // Store item score as pending - will be added only when question is answered correctly
              // Debug: uncomment to track pending items
              // console.log('[GoldMiner] Question item captured, adding to pending:', collectedItem.instanceId, collectedItem.score);
              this.pendingItemScores.push({
                instanceId: collectedItem.instanceId,
                score: collectedItem.score,
                itemType: collectedItem.itemType,
                captureIndex: this.capturedItemsInLevel,
              });
            } else {
              // Non-question items: add score immediately
              this.score += collectedItem.score;
            }

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
                  scoreBefore: this.score,
                  scoreAfter: this.score, // Will be updated after correct answer
                  level: currentLevel,
                  is_question_item: isQuestionItem,
                  difficulty_band: this.getDifficultyForLevel(currentLevel),
                  remaining_questions_in_level: this.getRemainingQuestionsForLevel(currentLevel),
                  targetScore: this.targetScore,
                  elapsedTime: Math.floor(this.elapsedTimeSeconds),
                },
              });
            }

            this.reportState('item-collected', true, {
              collectedScore: collectedItem.score,
              collectedItemType: collectedItem.itemType || 'rock',
              score: this.score,
              captureIndexInLevel: this.capturedItemsInLevel,
              difficultyBand: this.getDifficultyForLevel(currentLevel),
              questionScheduled: shouldTriggerQuestion,
              isQuestionItem: isQuestionItem,
              lives: this.lives,
              maxLives: this.maxLives,
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
    let resized = false;
    if (game_W !== document.documentElement.clientWidth || game_H !== document.documentElement.clientHeight) {
      this.canvas.width = document.documentElement.clientWidth;
      this.canvas.height = document.documentElement.clientHeight;
      game_W = this.canvas.width;
      game_H = this.canvas.height;
      XXX = game_W / 2;
      YYY = game_H * 0.21; // Lower pivot so rope starts from the seated character hand area
      resized = true;
    }
    // Always recalculate to apply changes immediately
    R = this.getWidth(); // Start closer to pivot
    if (!drag) {
      r = R;
    }
    MaxLeng = this.range(XXX, YYY, game_W - 2 * this.getWidth(), game_H - 2 * this.getWidth()) * 0.8;
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
    // Attach rope to the top joint of hook instead of passing through its body.
    const hookAngle = this.toRadian(angle - 90);
    const hookJointOffsetY = -this.getWidth() / 8;
    const hookJointX = Xh - hookJointOffsetY * Math.sin(hookAngle);
    const hookJointY = Yh + hookJointOffsetY * Math.cos(hookAngle);
    this.context.lineTo(hookJointX, hookJointY);
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
    this.context.fillText('Chuẩn bị sẵn sàng để chinh phục thử thách này nhé.', game_W / 2, game_H / 2 + this.getWidth() * 0.4);
    this.context.textAlign = 'start';
  }

  drawResultOverlay() {
    this.context.fillStyle = 'rgba(2, 6, 23, 0.85)';
    this.context.fillRect(0, 0, game_W, game_H);

    this.context.fillStyle = '#FFFFFF';
    this.context.textAlign = 'center';
    this.context.font = `bold ${Math.max(32, this.getWidth() * 1.3)}px Arial`;
    
    if (this.resultOutcome === 'success') {
      this.context.fillText('Hoan thanh', game_W / 2, game_H / 2 - this.getWidth() * 1.2);
    } else if (this.resultOutcome === 'game_over') {
      // Game over - show clear defeat message
      this.context.fillStyle = '#EF4444';
      this.context.fillText('HET MANG!', game_W / 2, game_H / 2 - this.getWidth() * 1.4);
      
      this.context.fillStyle = '#FFFFFF';
      this.context.font = `${Math.max(18, this.getWidth() * 0.7)}px Arial`;
      this.context.fillText('Rat tiec, ban da thua tro choi.', game_W / 2, game_H / 2 - this.getWidth() * 0.4);
      
      this.context.font = `${Math.max(16, this.getWidth() * 0.55)}px Arial`;
      this.context.fillStyle = '#94A3B8';
      this.context.fillText('Diem cua ban: ' + this.score, game_W / 2, game_H / 2 + this.getWidth() * 0.15);
    } else {
      this.context.fillText('Man choi ket thuc', game_W / 2, game_H / 2 - this.getWidth());
      this.context.font = `${Math.max(20, this.getWidth() * 0.6)}px Arial`;
      this.context.fillText(`Score: ${this.score}`, game_W / 2, game_H / 2);
      this.context.fillText('Nhan chuot hoac bam phim bat ky de choi lai man nay.', game_W / 2, game_H / 2 + this.getWidth());
    }
    
    // Only show restart prompt for game_over (after user acknowledges)
    if (this.resultOutcome === 'game_over') {
      this.context.font = `bold ${Math.max(16, this.getWidth() * 0.5)}px Arial`;
      this.context.fillStyle = '#FBBF24';
      this.context.fillText('Nhan nut CHOI LAI de bat dau lai', game_W / 2, game_H / 2 + this.getWidth() * 0.9);
    } else if (this.resultOutcome === 'success') {
      this.context.font = `${Math.max(20, this.getWidth() * 0.6)}px Arial`;
      this.context.fillText(`Score: ${this.score}`, game_W / 2, game_H / 2);
      this.context.fillText('Em da hoan thanh toan bo cau hoi.', game_W / 2, game_H / 2 + this.getWidth());
    } else {
      this.context.fillText(
        `Con ${this.getRemainingQuestionsForLevel(Math.max(level + 1, 1))} cau trong muc nay`,
        game_W / 2,
        game_H / 2 + this.getWidth() * 1.8,
      );
    }
    this.context.textAlign = 'start';
  }

  drawText() {
    const unit = this.getWidth();

    const leftBoxX = unit * 0.18;
    const leftBoxY = unit * 0.24;
    const leftBoxW = unit * 3.25;
    const leftBoxH = unit * 2.55;
    const leftPadX = unit * 0.22;

    const rightBoxX = game_W - unit * 4.3;
    const rightBoxY = unit * 0.24;
    const rightBoxW = unit * 4.05;
    const rightBoxH = unit * 3.45;
    const rightPadX = unit * 0.34;

    // Semi-transparent HUD panels.
    this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.context.fillRect(leftBoxX, leftBoxY, leftBoxW, leftBoxH);
    this.context.fillRect(rightBoxX, rightBoxY, rightBoxW, rightBoxH);

    // Draw target score (left panel) with safe padding.
    this.drawImageSafe(targetIM, leftBoxX + leftPadX, leftBoxY + unit * 0.30, unit, unit);
    this.context.fillStyle = '#FFB84D';
    this.context.font = `bold ${unit * 0.8}px Stencil`;
    this.context.fillText(this.targetScore, leftBoxX + unit * 1.35, leftBoxY + unit * 1.05);

    // Set right-aligned text for right HUD with inner right padding.
    const rightAlignX = rightBoxX + rightBoxW - rightPadX;
    this.context.textAlign = 'right';

    // Draw level row.
    this.drawImageSafe(levelIM, rightBoxX + unit * 0.18, rightBoxY + unit * 0.35, unit, unit);
    this.context.fillStyle = '#FFB84D';
    this.context.font = `bold ${unit * 0.78}px Stencil`;
    this.context.fillText(`LVL ${level + 1}`, rightAlignX, rightBoxY + unit * 1.00);

    // Draw difficulty label (skip recognition)
    const difficulty = this.getDifficultyForLevel(Math.max(level + 1, 1));
    if (difficulty && difficulty !== 'recognition') {
      this.context.font = `${unit * 0.44}px Stencil`;
      this.context.fillStyle = '#FFB84D';
      const difficultyLabel = DIFFICULTY_LABELS[difficulty] || '';
      this.context.fillText(difficultyLabel, rightAlignX, rightBoxY + unit * 1.52);
    }

    // Draw current score row.
    this.context.fillStyle = this.score > this.targetScore ? '#00FF00' : '#FFB84D';
    this.context.font = `bold ${unit * 0.64}px Stencil`;
    this.context.fillText(`SCORE: ${this.score}`, rightAlignX, rightBoxY + unit * 2.10);

    // Draw elapsed time row with clock icon kept inside the right panel.
    const clockSize = unit * 2.0;
    const timeRowY = rightBoxY + unit * 2.88;
    const clockX = rightBoxX;
    const clockY = timeRowY - unit * 1.22;
    this.drawImageSafe(clockIM, clockX, clockY, clockSize, clockSize);
    this.context.fillStyle = '#FFB84D';
    this.context.font = `bold ${unit * 0.7}px Stencil`;
    this.context.fillText(`${Math.floor(this.elapsedTimeSeconds)}S`, rightAlignX, timeRowY);
    
    // Reset text alignment
    this.context.textAlign = 'start';
    
    // Draw lives below target
    this.drawLives();
    
    // Draw score popup indicator
    if (Math.abs(timeH - this.elapsedTimeSeconds) <= 0.7) {
      this.context.fillStyle = 'red';
      this.context.font = `bold ${this.getWidth() * 0.7}px Arial`;
      this.context.fillText(`+${vlH}`, XXX, YYY * 0.8);
    }
  }

  drawLives() {
    const heartSize = this.getWidth() * 0.75; // Increased for better visibility and balance
    const startX = this.getWidth() * 0.42;
    const startY = this.getWidth() * 1.43; // Keep hearts grouped with target while preserving top padding
    
    for (let i = 0; i < this.maxLives; i++) {
      const x = startX + i * (heartSize + this.getWidth() * 0.1); // Reduced spacing from 0.2 to 0.1
      const filled = i < this.lives;
      
      // Try to use image if available, otherwise draw on canvas
      if (filled && isImageReady(heartFullIM)) {
        this.drawImageSafe(heartFullIM, x, startY, heartSize, heartSize);
      } else if (!filled && isImageReady(heartEmptyIM)) {
        this.drawImageSafe(heartEmptyIM, x, startY, heartSize, heartSize);
      } else {
        // Draw heart using canvas
        drawHeartOnCanvas(this.context, x + heartSize / 2, startY + heartSize / 2, heartSize, filled);
      }
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
