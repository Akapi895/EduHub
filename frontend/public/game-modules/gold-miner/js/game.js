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
const ITEM_TYPE_PLAN = [3, 4, 5, 3, 4, 5, 0, 1, 0, 1, 2, 2, 6, 7, 6];
const DEFAULT_TIME_LIMIT_SECONDS = 60;
const DEFAULT_TARGET_SCORE_BASE = 1000;
const DEFAULT_TARGET_SCORE_STEP = 180;
const N = ITEM_TYPE_PLAN.length;

const bg = new Image();
bg.src = 'images/background.png';

const hook = new Image();
hook.src = 'images/hook.png';

const targetIM = new Image();
targetIM.src = 'images/target.png';

const dolarIM = new Image();
dolarIM.src = 'images/dolar.png';

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
    this.resultOutcome = null;
    this.lastReportedAt = 0;
    this.didHostInit = false;
    this.sessionReady = false;
    this.answeredQuestionsByLevel = [];
    this.completedQuestionAttemptIds = new Set();
    this.timeLimitSeconds = DEFAULT_TIME_LIMIT_SECONDS;
    this.maxLevels = 1;
    this.questionPlan = {
      level_count: 1,
      capture_slots_by_level: [[]],
      questions_per_level: [0],
      target_scores_by_level: [DEFAULT_TARGET_SCORE_BASE],
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
    this.loop();
    this.listenKeyboard();
    this.listenMouse();

    if (bridge && typeof bridge.ready === 'function') {
      bridge.ready({
        status: 'ready',
        title: 'Gold Miner',
        controls: ['mouse', 'keyboard'],
      });
    }
    this.reportState('ready', true);
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
        this.applyRuntimeConfig(payload && payload.runtimeConfig ? payload.runtimeConfig : null);
        this.resetSession();
        this.didHostInit = true;
        this.isPaused = false;
        this.reportState('host-init', true, {
          questionResult: payload && payload.questionResult ? payload.questionResult : null,
        });
        return;
      }

      if (type === 'host:resume') {
        if (payload && payload.questionResult) {
          this.recordQuestionCompletion(payload.questionResult);
        }
        this.isPaused = false;
        this.reportState('resumed', true, {
          questionResult: payload && payload.questionResult ? payload.questionResult : null,
        });
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
  }

  resetSession() {
    this.sessionReady = false;
    this.score = 0;
    this.gg = [];
    this.isFinished = false;
    this.isPaused = false;
    this.resultOutcome = null;
    this.capturedItemsInLevel = 0;
    this.answeredQuestionsByLevel = [];
    this.completedQuestionAttemptIds = new Set();
    level = -1;
    time = this.timeLimitSeconds;
    tager = this.getTargetForLevel(1);
    this.newGold();
    this.sessionReady = true;
  }

  scheduleNextLoop(delay = 10) {
    window.setTimeout(() => this.loop(), delay);
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

  levelQuestionScheduleCompleted(levelNumber) {
    return this.getAnsweredQuestionsForLevel(levelNumber) >= this.getQuestionQuotaForLevel(levelNumber);
  }

  getAnsweredQuestionsForLevel(levelNumber) {
    return Number(this.answeredQuestionsByLevel[levelNumber - 1] || 0);
  }

  getRemainingQuestionsForLevel(levelNumber) {
    return Math.max(this.getQuestionQuotaForLevel(levelNumber) - this.getAnsweredQuestionsForLevel(levelNumber), 0);
  }

  recordQuestionCompletion(questionResultPayload) {
    if (!questionResultPayload || typeof questionResultPayload !== 'object') {
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
    if (this.isLastLevel()) {
      this.handleWin(reason);
      return;
    }

    if (bridge && typeof bridge.progress === 'function') {
      bridge.progress({
        status: 'running',
        reason,
        level: Math.max(level + 1, 1),
        nextLevel: Math.max(level + 2, 2),
        score: this.score,
        targetScore: tager,
        timeRemaining: Math.max(0, Math.floor(time)),
      });
    }

    this.newGold();
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
    this.initGold();
    this.reportState('level-start', true, {
      questionsPlannedInLevel: this.getQuestionQuotaForLevel(Math.max(level + 1, 1)),
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
      this.advanceToNextLevel('level-cleared');
      return;
    }

    if (time <= 0) {
      if (this.score >= tager && this.levelQuestionScheduleCompleted(currentLevel)) {
        this.advanceToNextLevel('target-reached');
        return;
      }

      this.handleLose(this.score >= tager ? 'questions-incomplete' : 'time-up');
      return;
    }

    this.scheduleNextLoop(10);
  }

  handleLose(reason) {
    this.isFinished = true;
    this.resultOutcome = 'failed';
    this.draw();
    this.reportState('lose', true, {
      status: 'completed',
      outcome: 'failed',
      reason: reason || 'time-up',
      timeRemaining: 0,
    });

    if (bridge && typeof bridge.complete === 'function') {
      bridge.complete({
        status: 'completed',
        outcome: 'failed',
        reason: reason || 'time-up',
        score: this.score,
        level: Math.max(level + 1, 1),
        targetScore: tager,
        timeRemaining: 0,
      });
    }
  }

  handleWin(reason) {
    this.isFinished = true;
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
      status: this.isFinished ? 'completed' : this.isPaused ? 'paused' : 'running',
      reason,
      score: this.score,
      level: Math.max(level + 1, 1),
      targetScore: tager,
      timeRemaining: Math.max(0, Math.floor(time)),
      timeRemainingPrecise: Math.max(0, Number(time.toFixed(2))),
      dragging: drag,
      capturesInLevel: this.capturedItemsInLevel,
      answeredQuestionsInLevel: this.getAnsweredQuestionsForLevel(Math.max(level + 1, 1)),
      questionQuotaInLevel: this.getQuestionQuotaForLevel(Math.max(level + 1, 1)),
      remainingQuestionsInLevel: this.getRemainingQuestionsForLevel(Math.max(level + 1, 1)),
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
            if (bridge && typeof bridge.questionTrigger === 'function') {
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
            });
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
    this.context.drawImage(hook, -this.getWidth() / 4, -this.getWidth() / 8, this.getWidth() / 2, this.getWidth() / 2);
    this.context.restore();

    this.drawText();

    if (this.isFinished) {
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
    this.context.fillText(this.resultOutcome === 'success' ? 'Hoàn thành' : 'Game Over', game_W / 2, game_H / 2 - this.getWidth());

    this.context.font = `${Math.max(20, this.getWidth() * 0.6)}px Arial`;
    this.context.fillText(`Score: ${this.score}`, game_W / 2, game_H / 2);
    this.context.fillText(
      this.resultOutcome === 'success'
        ? 'Em đã hoàn thành toàn bộ các màn chơi.'
        : 'Dùng nút "Chơi lại" của EduHub để bắt đầu phiên mới.',
      game_W / 2,
      game_H / 2 + this.getWidth(),
    );
    this.context.textAlign = 'start';
  }

  drawText() {
    this.context.drawImage(dolarIM, this.getWidth() / 2, this.getWidth() / 2, this.getWidth(), this.getWidth());
    this.context.fillStyle = 'red';
    if (this.score > tager) {
      this.context.fillStyle = '#FF6600';
    }
    this.context.font = `${this.getWidth()}px Stencil`;
    this.context.fillText(this.score, this.getWidth() * 1.5, this.getWidth() * 1.35);

    this.context.drawImage(targetIM, this.getWidth() / 2, this.getWidth() / 2 + this.getWidth(), this.getWidth(), this.getWidth());
    this.context.fillStyle = '#FF6600';
    this.context.font = `${this.getWidth()}px Stencil`;
    this.context.fillText(tager, this.getWidth() * 1.5, this.getWidth() * 2.35);

    this.context.drawImage(levelIM, game_W - 3 * this.getWidth(), this.getWidth() / 2, this.getWidth(), this.getWidth());
    this.context.fillStyle = '#FFFFCC';
    this.context.font = `${this.getWidth()}px Stencil`;
    this.context.fillText(level + 1, game_W - 2 * this.getWidth(), this.getWidth() * 1.35);

    this.context.drawImage(clockIM, game_W - 3 * this.getWidth(), this.getWidth() / 2 + this.getWidth(), this.getWidth(), this.getWidth());
    this.context.fillStyle = '#FF00FF';
    this.context.font = `${this.getWidth()}px Stencil`;
    this.context.fillText(Math.floor(time), game_W - 2 * this.getWidth(), this.getWidth() * 2.35);

    if (Math.abs(timeH - time) <= 0.7) {
      this.context.fillStyle = 'red';
      this.context.fillText(`+${vlH}`, XXX, YYY * 0.8);
    }
  }

  clearScreen() {
    this.context.clearRect(0, 0, game_W, game_H);
    this.context.drawImage(
      bg,
      (bg.width - game_W * (bg.height / game_H)) / 2,
      0,
      game_W * (bg.height / game_H),
      bg.height,
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

  initGold() {
    const currentLevel = Math.max(level + 1, 1);
    this.gg = ITEM_TYPE_PLAN.map((type, itemIndex) => new gold(this, type, `level-${currentLevel}-item-${itemIndex + 1}`));
    while (true) {
      let check = true;
      for (let i = 0; i < N - 1; i += 1) {
        for (let j = i + 1; j < N; j += 1) {
          const minimumDistance = this.gg[i].size() + this.gg[j].size() + this.getWidth() * 0.3;
          while (this.range(this.gg[i].x, this.gg[i].y, this.gg[j].x, this.gg[j].y) < minimumDistance) {
            check = false;
            this.gg[j].randomXY();
            this.gg[j].update();
          }
        }
      }
      if (check) {
        break;
      }
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
