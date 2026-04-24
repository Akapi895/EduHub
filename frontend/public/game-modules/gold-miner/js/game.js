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

let N = -10;

class game {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.score = 0;
    this.gg = [];
    this.isPaused = false;
    this.isFinished = false;
    this.lastReportedAt = 0;
    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    document.body.appendChild(this.canvas);

    this.attachBridge();
    this.render();
    this.newGold();
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

    bridge.onHostMessage((type) => {
      if (type === 'host:pause') {
        this.isPaused = true;
        this.reportState('paused', true);
        return;
      }

      if (type === 'host:resume' || type === 'host:init') {
        this.isPaused = false;
        this.reportState(type === 'host:init' ? 'host-init' : 'resumed', true);
        return;
      }

      if (type === 'host:restart') {
        window.location.reload();
      }
    });
  }

  scheduleNextLoop(delay = 10) {
    window.setTimeout(() => this.loop(), delay);
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
    time = 60;
    level += 1;
    tager = (level + 1) * 1000 + level * level * 120;
    this.initGold();
    this.reportState('level-start', true);
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
    if (!drag && !this.isFinished) {
      drag = true;
      d = true;
      speedReturn = this.getWidth() / 2;
      index = -1;
      this.reportState('hook-launch', true);
    }
  }

  loop() {
    if (this.isFinished) {
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

    const clearedAllTargets = this.checkWin();
    if (time <= 0 || clearedAllTargets) {
      if (this.score >= tager || clearedAllTargets) {
        if (bridge && typeof bridge.progress === 'function') {
          bridge.progress({
            status: 'running',
            reason: 'level-cleared',
            level: Math.max(level + 1, 1),
            score: this.score,
            targetScore: tager,
            timeRemaining: Math.max(0, Math.floor(time)),
          });
        }
        this.newGold();
        this.scheduleNextLoop(10);
        return;
      }

      this.handleLose();
      return;
    }

    this.scheduleNextLoop(10);
  }

  handleLose() {
    this.isFinished = true;
    this.draw();
    this.reportState('lose', true, { status: 'completed', outcome: 'failed', timeRemaining: 0 });

    if (bridge && typeof bridge.complete === 'function') {
      bridge.complete({
        status: 'completed',
        outcome: 'failed',
        score: this.score,
        level: Math.max(level + 1, 1),
        targetScore: tager,
        timeRemaining: 0,
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
            this.gg[i].alive = false;
            this.score += this.gg[i].score;
            timeH = time - 0.7;
            vlH = this.gg[i].score;
            this.reportState('item-collected', true, {
              collectedScore: this.gg[i].score,
              score: this.score,
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
      if (N < 0) {
        N = game_W * game_H / (20 * this.getWidth() * this.getWidth());
      }
    }
  }

  draw() {
    this.clearScreen();

    for (let i = 0; i < N; i += 1) {
      if (this.gg[i].alive) {
        this.gg[i].update();
        this.gg[i].draw();
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

  drawResultOverlay() {
    this.context.fillStyle = 'rgba(2, 6, 23, 0.78)';
    this.context.fillRect(0, 0, game_W, game_H);

    this.context.fillStyle = '#FFFFFF';
    this.context.textAlign = 'center';
    this.context.font = `bold ${Math.max(32, this.getWidth() * 1.3)}px Arial`;
    this.context.fillText('Game Over', game_W / 2, game_H / 2 - this.getWidth());

    this.context.font = `${Math.max(20, this.getWidth() * 0.6)}px Arial`;
    this.context.fillText(`Score: ${this.score}`, game_W / 2, game_H / 2);
    this.context.fillText('Dung nut "Choi lai" cua EduHub de bat dau session moi.', game_W / 2, game_H / 2 + this.getWidth());
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
    let check = true;
    for (let i = 0; i < N; i += 1) {
      if (this.gg[i].alive === true) {
        check = false;
      }
    }
    return check;
  }

  initGold() {
    this.gg = [];
    for (let i = 0; i < N; i += 1) {
      this.gg[i] = new gold(this);
    }
    while (true) {
      let check = true;
      for (let i = 0; i < N - 1; i += 1) {
        for (let j = i + 1; j < N; j += 1) {
          while (this.range(this.gg[i].x, this.gg[i].y, this.gg[j].x, this.gg[j].y) < 2 * this.getWidth()) {
            check = false;
            this.gg[j].randomXY();
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
