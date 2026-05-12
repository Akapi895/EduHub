# Mario Platformer Integration Workflow

Tài liệu này mô tả chi tiết workflow tích hợp game Mario platformer (educational) vào hệ thống EduHub, từ thiết kế gameplay đến kết nối backend.

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Thiết kế Gameplay Educational Platformer](#2-thiết-kế-gameplay-educational-platformer)
3. [Tổ chức Module Game](#3-tổ-chức-module-game)
4. [Host ↔ Game Communication](#4-host--game-communication)
5. [Question System Integration](#5-question-system-integration)
6. [State Management](#6-state-management)
7. [Checkpoint & Lives System](#7-checkpoint--lives-system)
8. [Mapping Gameplay → Learning](#8-mapping-gameplay--learning)

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND HOST                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    GamePlayerShell.tsx                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │  Question   │  │  iframe     │  │  Runtime State  │  │   │
│  │  │  Modal      │  │  Sandbox    │  │  Management     │  │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────────┘  │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             │ postMessage                        │
├─────────────────────────────┼───────────────────────────────────┤
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   MARIO GAME RUNTIME                      │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────┐  │   │
│  │  │  Player   │  │  Level    │  │  Check-   │  │ Quiz  │  │   │
│  │  │  Physics  │  │  Engine   │  │  point    │  │ Flow  │  │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐  │
│  │ Runtime       │  │ Question      │  │ Leaderboard       │  │
│  │ Service      │  │ Bank          │  │ Service           │  │
│  └───────────────┘  └───────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Thiết kế Gameplay Educational Platformer

### 2.1 Core Gameplay Loop

```
┌────────────────────────────────────────────────────────────────┐
│                      GAMEPLAY LOOP                              │
│                                                                 │
│  Start ──► Playing ──┬──► Checkpoint Hit ──► Question Modal    │
│                      │                         │                │
│                      │                         ▼                │
│                      │                    ┌────────┐         │
│                      │                    │Answer  │         │
│                      │                    │Correct?│         │
│                      │                    └┬───┬───┘         │
│                      │                     │   │              │
│                      │              ┌─────┘   └─────┐        │
│                      │              ▼               ▼        │
│                      │        ┌─────────┐    ┌──────────┐    │
│                      │        │Resume   │    │ Lose Life│    │
│                      │        │Game ✓   │    │ Continue │    │
│                      │        └────┬────┘    └────┬─────┘    │
│                      │             │              │          │
│                      │             └──────┬───────┘          │
│                      │                    │                   │
│                      │            ┌──────▼──────┐           │
│                      │            │ Lives = 0?  │           │
│                      │            └──────┬──────┘           │
│                      │                   │                   │
│                      │            ┌─────▼─────┐            │
│                      │            │ GAME OVER │            │
│                      │            └───────────┘            │
│                      │                                         │
│                      └──► Level Complete ──► Next Level      │
│                                                       (loop) │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Checkpoint System

Checkpoints là vị trí bắt buộc trong level mà học sinh phải vượt qua bằng cách trả lời đúng câu hỏi.

**Checkpoint Properties:**

```typescript
interface Checkpoint {
  id: string;
  x: number; // Vị trí X trong level
  y: number; // Vị trí Y trong level
  width: number; // Chiều rộng hitbox
  height: number; // Chiều cao hitbox
  level: number; // Level chứa checkpoint
  triggerKey: string; // Key để trigger question
  isRequired: boolean; // Bắt buộc hay tùy chọn
  nextCheckpoint?: string; // ID checkpoint tiếp theo
}
```

**Checkpoint Layout (ví dụ Level 1):**

```
Level 1 (World 1-1)
────────────────────────────────────────────────────────────

    ☁                          ☁                    ☁

  ═════                    ══════                 ══════
         💰💰                      💰💰💰

                              🚩                        🚩
  ══════════════════════════════════════════════════════════
         P ← Start    CP1        CP2              Goal

CP1 = Checkpoint 1 (checkpoint_id: "l1cp1")
CP2 = Checkpoint 2 (checkpoint_id: "l1cp2")
P = Player spawn point
```

### 2.3 Lives System

```typescript
interface LivesState {
  currentLives: number; // Số mạng hiện tại (max: 3)
  maxLives: number; // Số mạng tối đa
  lastCheckpointId: string; // ID checkpoint cuối cùng đã vượt qua

  // Khi trả lời sai
  wrongAttempts: number; // Số lần sai trong attempt hiện tại
  failedQuestions: string[]; // IDs của câu hỏi chưa trả lời đúng
}

// Game Over conditions
// 1. wrongAttempts >= 3
// 2. Player rơi xuống vực (có thể handle riêng)
```

**Restart Logic:**

```typescript
function handleRestart(reason: "game_over" | "manual") {
  if (reason === "game_over") {
    // Hỏi có muốn restart không
    // Nếu restart: quay về checkpoint gần nhất đã vượt qua
    // Hoặc bắt đầu lại từ đầu nếu không có checkpoint
    const lastCheckpoint = state.lastCheckpointId;
    if (lastCheckpoint) {
      // Respawn tại checkpoint
      respawnAtCheckpoint(lastCheckpoint);
    } else {
      // Restart từ đầu level 1
      restartFromBeginning();
    }
  }
}
```

---

## 3. Tổ chức Module Game

### 3.1 File Structure

```
frontend/public/game-modules/
└── mario-platformer/
    ├── manifest.json              # Game manifest
    ├── bridge.js                 # postMessage bridge (shared hoặc game-specific)
    ├── index.html                # Entry HTML
    ├── css/
    │   └── game.css              # Game styles
    ├── js/
    │   ├── main.js               # Entry point
    │   ├── game/
    │   │   ├── Game.js           # Main game controller
    │   │   ├── GameRenderer.js   # Canvas rendering
    │   │   ├── GameState.js      # State management
    │   │   ├── QuizManager.js    # Question flow manager
    │   │   ├── CheckpointManager.js
    │   │   ├── LivesManager.js
    │   │   └── ScoreManager.js
    │   ├── entities/
    │   │   ├── Player.js         # Mario character
    │   │   ├── Enemy.js          # Goomba, Koopa, etc.
    │   │   ├── Platform.js       # Platforms & ground
    │   │   ├── Coin.js           # Collectibles
    │   │   └── Checkpoint.js     # Checkpoint entity
    │   ├── physics/
    │   │   ├── PhysicsEngine.js  # Gravity, collision
    │   │   └── InputHandler.js   # Keyboard input
    │   └── audio/
    │       └── SoundManager.js   # Web Audio API sounds
    └── assets/
        ├── sprites/             # Character sprites
        ├── tiles/               # Tile sets
        └── audio/               # Sound effects
```

### 3.2 Game Manifest

```json
{
  "id": "mario-platformer",
  "slug": "mario-platformer",
  "title": "Mario Platformer - Học mà Chơi",
  "description": "Game platformer giáo dục với hệ thống checkpoint và câu hỏi kiểm tra kiến thức.",
  "short_description": "Vượt checkpoint, trả lời câu hỏi, học mà chơi!",
  "thumbnail": "/game-modules/mario-platformer/assets/thumbnail.png",
  "entry": "index.html",
  "tags": ["platformer", "education", "checkpoint", "lives"],
  "instructions": [
    "Di chuyển: ← → để điều khiển Mario",
    "Nhảy: SPACE hoặc ↑",
    "Đạp enemies: nhảy lên đầu chúng",
    "Chạm checkpoint: trả lời câu hỏi để tiếp tục"
  ],
  "featured": true,
  "runtime": {
    "kind": "iframe",
    "sandbox": "allow-scripts allow-same-origin",
    "allow": "",
    "aspect_ratio": "16 / 9",
    "target_origin": "*"
  },
  "bridge": {
    "enabled": true,
    "version": 2,
    "capabilities": [
      "ready",
      "state",
      "progress",
      "question-trigger",
      "complete",
      "pause",
      "resume",
      "restart"
    ]
  },
  "gameplay": {
    "supports_checkpoints": true,
    "checkpoint_trigger_type": "checkpoint_reached",
    "supports_lives": true,
    "max_lives": 3,
    "supports_wrong_answer_retry": true,
    "respawn_at_checkpoint": true
  }
}
```

---

## 4. Host ↔ Game Communication

### 4.1 Message Protocol

**Envelope Structure:**

```typescript
interface GameBridgeEnvelope<
  TType extends string,
  TPayload = Record<string, unknown>,
> {
  channel: "eduhub:game-bridge"; // Fixed channel name
  type: TType; // Message type
  gameId: string; // Game module ID
  timestamp: string; // ISO timestamp
  payload: TPayload; // Message payload
}
```

### 4.2 Game → Host Messages

```typescript
// Game loaded and ready
interface GameReadyPayload {
  version: string;
  capabilities: string[];
}

{
  type: 'game:ready',
  payload: GameReadyPayload
}

// Periodic state update
interface GameStatePayload {
  status: 'running' | 'paused' | 'quiz';
  score: number;
  lives: number;
  level: number;
  checkpoint: string | null;
  x: number;  // Player position
  y: number;
  questionTriggered: boolean;
}

{
  type: 'game:state',
  payload: GameStatePayload
}

// Checkpoint reached - trigger question
interface QuestionTriggerPayload {
  triggerType: 'checkpoint_reached';
  triggerKey: string;      // e.g., "l1cp1"
  triggerValue: string;     // e.g., "checkpoint"
  eventPayload: {
    checkpointId: string;
    level: number;
    playerX: number;
    playerY: number;
  };
}

{
  type: 'game:question-trigger',
  payload: QuestionTriggerPayload
}

// Game completed
interface GameCompletePayload {
  outcome: 'completed' | 'game_over';
  score: number;
  level: number;
  lives: number;
  reason?: string;  // 'max_wrong_attempts' | 'level_complete'
  summary: {
    checkpointsPassed: number;
    questionsAnswered: number;
    questionsCorrect: number;
    wrongAnswers: number;
  };
}

{
  type: 'game:complete',
  payload: GameCompletePayload
}
```

### 4.3 Host → Game Messages

```typescript
// Initialize game with runtime config
interface HostInitPayload {
  sessionId: string;
  attemptId: string;
  packageId: string;
  attemptTotals?: PackageAttemptTotals;
  runtimeConfig: {
    session: {
      maxLives: number;
      levelCount: number;
    };
    questionDistribution: {
      mode: 'random' | 'progressive';
      questionsPerLevel: number[];
    };
  };
}

{
  type: 'host:init',
  payload: HostInitPayload
}

// Pause game (show question modal)
interface HostPausePayload {
  reason: string;
  questionAttemptId: string;
  questionId: string;
}

{
  type: 'host:pause',
  payload: HostPausePayload
}

// Resume game after answer
interface HostResumePayload {
  reason: string;
  questionResult: {
    isCorrect: boolean;
    feedbackMessage?: string;
    scoreAwarded?: number;
  };
  resumeFrom: {
    checkpointId: string;
    x: number;
    y: number;
  };
}

{
  type: 'host:resume',
  payload: HostResumePayload
}

// Restart game
{
  type: 'host:restart',
  payload: { reason: string }
}
```

### 4.4 Implementation Example (Game Side)

```javascript
// bridge.js - Game-side bridge
class GameBridge {
  constructor(gameId) {
    this.gameId = gameId;
    this.channel = "eduhub:game-bridge";
    this.handlers = new Map();

    window.addEventListener("message", this.handleMessage.bind(this));
  }

  // Send message to host
  send(type, payload = {}) {
    const envelope = {
      channel: this.channel,
      type,
      gameId: this.gameId,
      timestamp: new Date().toISOString(),
      payload,
    };
    window.parent.postMessage(envelope, "*");
  }

  // Register handler for host messages
  onHostMessage(type, handler) {
    this.handlers.set(type, handler);
  }

  handleMessage(event) {
    const msg = event.data;
    if (!msg || msg.channel !== this.channel) return;

    const handler = this.handlers.get(msg.type);
    if (handler) {
      handler(msg.payload);
    }
  }

  // Convenience methods
  ready() {
    this.send("game:ready", {
      version: "2.0.0",
      capabilities: ["state", "checkpoint", "quiz", "lives"],
    });
  }

  triggerQuestion(checkpointId, level, position) {
    this.send("game:question-trigger", {
      triggerType: "checkpoint_reached",
      triggerKey: checkpointId,
      triggerValue: "checkpoint",
      eventPayload: {
        checkpointId,
        level,
        playerX: position.x,
        playerY: position.y,
      },
    });
  }

  updateState(state) {
    this.send("game:state", state);
  }

  complete(outcome, stats) {
    this.send("game:complete", outcome, stats);
  }
}

// Usage in game
const bridge = new GameBridge("mario-platformer");

// When checkpoint reached
function onCheckpointCollision(checkpoint) {
  bridge.triggerQuestion(checkpoint.id, checkpoint.level, player.position);
}

// Handle host commands
bridge.onHostMessage("host:pause", (payload) => {
  game.pause();
  showQuestionModal(payload.questionAttemptId);
});

bridge.onHostMessage("host:resume", (payload) => {
  game.resume();
  if (!payload.questionResult.isCorrect) {
    game.loseLife();
    // Continue from checkpoint
  }
});

bridge.onHostMessage("host:restart", () => {
  game.restart();
});
```

---

## 5. Question System Integration

### 5.1 Trigger Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      QUESTION TRIGGER FLOW                      │
│                                                                 │
│  1. Player hits checkpoint                                      │
│     │                                                           │
│     ▼                                                           │
│  2. Game sends game:question-trigger                             │
│     │                                                           │
│     ▼                                                           │
│  3. GamePlayerShell receives message                            │
│     │                                                           │
│     ▼                                                           │
│  4. Shell calls POST /runtime/trigger                          │
│     {                                                           │
│       trigger_type: "checkpoint_reached",                       │
│       trigger_key: "l1cp1",                                     │
│       trigger_value: "checkpoint",                               │
│       event_payload: { checkpointId, level, ... }              │
│     }                                                           │
│     │                                                           │
│     ▼                                                           │
│  5. Backend determines action:                                  │
│     - ask_question: → return question                            │
│     - resume: → no question needed                              │
│     - game_over: → max wrong attempts reached                   │
│     │                                                           │
│     ▼                                                           │
│  6. Shell shows Question Modal (blocking)                      │
│     │                                                           │
│     ▼                                                           │
│  7. Student answers                                            │
│     │                                                           │
│     ▼                                                           │
│  8. Shell calls POST /runtime/answers                           │
│     │                                                           │
│     ▼                                                           │
│  9. Backend grades answer, returns result                      │
│     │                                                           │
│     ▼                                                           │
│  10. Shell sends host:resume with result                         │
│      │                                                          │
│      ▼                                                          │
│  11. Game continues or loses life                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Question Types Supported

Game Mario hỗ trợ **tất cả** question types từ question bank:

```typescript
// Question types từ EduHub system
type QuestionType =
  | "single_choice" // Trắc nghiệm 1 đáp án
  | "multi_choice" // Trắc nghiệm nhiều đáp án
  | "text" // Tự luận
  | "image_upload" // Upload hình ảnh
  | "matching"; // Nối cột
```

**Implementation:**

```javascript
// QuizManager.js
class QuizManager {
  constructor(bridge) {
    this.bridge = bridge;
    this.currentQuestion = null;
    this.currentAttemptId = null;
  }

  // Render question based on type
  renderQuestion(question) {
    this.currentQuestion = question;
    this.currentAttemptId = question.attempt_id;

    const container = document.getElementById("question-container");

    switch (question.type) {
      case "single_choice":
        return this.renderSingleChoice(question, container);
      case "multi_choice":
        return this.renderMultiChoice(question, container);
      case "text":
        return this.renderText(question, container);
      case "matching":
        return this.renderMatching(question, container);
      case "image_upload":
        return this.renderImageUpload(question, container);
    }
  }

  // Submit answer to host
  async submitAnswer(answer) {
    // Answer format based on question type
    const payload = this.buildAnswerPayload(answer);

    // Send to backend via bridge (host handles API call)
    return new Promise((resolve, reject) => {
      this.bridge.onHostMessage("host:resume", (resumePayload) => {
        resolve(resumePayload.questionResult);
      });

      // Trigger answer submission through shell
      window.parent.postMessage(
        {
          channel: "eduhub:game-bridge",
          type: "game:answer-submit",
          payload: {
            attemptId: this.currentAttemptId,
            answer: payload,
          },
        },
        "*",
      );
    });
  }

  buildAnswerPayload(answer) {
    switch (this.currentQuestion.type) {
      case "single_choice":
      case "multi_choice":
        return { selected_option_ids: answer };
      case "text":
        return { text_answer: answer };
      case "matching":
        return { matching_answers: answer };
      case "image_upload":
        return { uploaded_image_url: answer };
      default:
        return {};
    }
  }
}
```

### 5.3 Question Modal (Game-side rendering)

Game Mario có thể render question modal riêng hoặc delegate cho host. Khuyến nghị: **delegate cho host** (GamePlayerShell) để:

- Đồng nhất UI với các game khác
- Tận dụng component đã có
- Dễ maintain

**Hybrid Approach (Modal trong game):**

```javascript
// QuizModal.js
class QuizModal {
  constructor(container) {
    this.container = container;
    this.onSubmit = null;
  }

  show(question) {
    this.container.classList.remove("hidden");
    this.container.innerHTML = this.buildHTML(question);
    this.attachEventListeners(question);
  }

  hide() {
    this.container.classList.add("hidden");
  }

  buildHTML(question) {
    return `
      <div class="quiz-modal">
        <div class="quiz-header">
          <span class="quiz-type">${this.getQuestionTypeLabel(question.type)}</span>
          <span class="quiz-points">${question.points || 0} điểm</span>
        </div>
        
        <div class="quiz-content">
          <p class="quiz-question">${question.content}</p>
          
          ${this.renderQuestionInput(question)}
        </div>
        
        <div class="quiz-actions">
          <button class="quiz-submit" disabled>Nộp câu trả lời</button>
        </div>
        
        <div class="quiz-feedback hidden">
          <div class="feedback-icon"></div>
          <p class="feedback-text"></p>
          <button class="quiz-continue">Tiếp tục</button>
        </div>
      </div>
    `;
  }

  renderQuestionInput(question) {
    switch (question.type) {
      case "single_choice":
      case "multi_choice":
        return this.renderOptions(question);
      case "text":
        return '<textarea class="quiz-text-input"></textarea>';
      case "matching":
        return this.renderMatching(question);
      default:
        return "<p>Unsupported question type</p>";
    }
  }

  getQuestionTypeLabel(type) {
    const labels = {
      single_choice: "Trắc nghiệm 1 đáp án",
      multi_choice: "Trắc nghiệm nhiều đáp án",
      text: "Tự luận",
      matching: "Nối cột",
      image_upload: "Tải ảnh",
    };
    return labels[type] || type;
  }
}
```

---

## 6. State Management

### 6.1 Game State Structure

```typescript
interface MarioGameState {
  // Core gameplay
  status:
    | "loading"
    | "ready"
    | "playing"
    | "paused"
    | "quiz"
    | "game_over"
    | "level_complete";

  // Player
  player: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    direction: "left" | "right";
    isJumping: boolean;
    isGrounded: boolean;
    animationFrame: number;
  };

  // Progression
  lives: {
    current: number;
    max: number;
  };

  score: number;
  currentLevel: number;

  // Checkpoint system
  checkpoints: {
    passed: string[]; // IDs of passed checkpoints
    current: string | null; // Current checkpoint (for respawn)
  };

  // Quiz state
  quiz: {
    active: boolean;
    currentQuestion: Question | null;
    attemptId: string | null;
    wrongAnswers: number;
    failedQuestions: string[];
  };

  // Level data
  level: {
    platforms: Platform[];
    enemies: Enemy[];
    coins: Coin[];
    checkpoints: Checkpoint[];
  };

  // Camera
  camera: {
    x: number;
    y: number;
  };

  // Time tracking
  elapsedTime: number;
  questionTimeMs: number;
}
```

### 6.2 State Persistence

Game state được lưu trong `runtime_state` của `package_attempt`:

```python
# Backend - runtime_state structure
runtime_state = {
    "game": {
        "score": 1250,
        "lives": 2,
        "current_level": 2,
        "checkpoints_passed": ["l1cp1", "l1cp2", "l2cp1"],
        "checkpoint_resume": "l2cp1",  # Respawn here on wrong answer
        "elapsed_time_ms": 180000,
        "coin_count": 15
    },
    "question_plan": {
        "difficulty_bands": [...],
        "question_ids_by_level": [...],
        "difficulty_bands": [...]
    },
    "wrong_attempts": 1,
    "failed_questions": ["q_abc123", "q_def456"]
}
```

### 6.3 Respawn Logic

```javascript
// CheckpointManager.js
class CheckpointManager {
  constructor(state) {
    this.state = state;
    this.checkpoints = new Map();
  }

  registerCheckpoint(checkpoint) {
    this.checkpoints.set(checkpoint.id, checkpoint);
  }

  onCheckpointPassed(checkpointId) {
    // Add to passed list
    if (!this.state.checkpoints.passed.includes(checkpointId)) {
      this.state.checkpoints.passed.push(checkpointId);
    }

    // Update current checkpoint for respawn
    this.state.checkpoints.current = checkpointId;

    // Send to backend via bridge
    bridge.updateState({
      checkpointId,
      checkpointsPassed: this.state.checkpoints.passed,
    });
  }

  getRespawnPosition() {
    const checkpointId = this.state.checkpoints.current;
    if (!checkpointId) {
      // No checkpoint, start from level beginning
      return this.getLevelStartPosition(this.state.currentLevel);
    }

    const checkpoint = this.checkpoints.get(checkpointId);
    return {
      x: checkpoint.x,
      y: checkpoint.y - 32, // Spawn above checkpoint
    };
  }

  handleWrongAnswer() {
    this.state.lives.current--;

    if (this.state.lives.current <= 0) {
      this.state.status = "game_over";
      bridge.complete({
        outcome: "game_over",
        reason: "max_wrong_attempts",
        score: this.state.score,
        level: this.state.currentLevel,
        lives: 0,
      });
      return;
    }

    // Respawn at checkpoint
    const respawnPos = this.getRespawnPosition();
    this.state.player.x = respawnPos.x;
    this.state.player.y = respawnPos.y;
    this.state.player.velocityX = 0;
    this.state.player.velocityY = 0;
  }
}
```

---

## 7. Checkpoint & Lives System

### 7.1 Checkpoint Behavior

```javascript
// Checkpoint.js
class Checkpoint {
  constructor(config) {
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width || 40;
    this.height = config.height || 64;
    this.level = config.level;
    this.triggered = false;
    this.passed = false;
  }

  checkCollision(player) {
    return (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );
  }

  onPlayerCollision(player, gameState) {
    if (this.passed) return; // Already triggered

    // Visual feedback
    this.triggered = true;
    this.showQuestion();

    // Game pauses automatically
    gameState.status = "quiz";

    // Trigger question
    bridge.triggerQuestion(this.id, this.level, {
      x: player.x,
      y: player.y,
    });
  }

  showQuestion() {
    // Show checkpoint flag animation
    this.element.classList.add("checkpoint-triggered");
  }

  onQuestionResult(result) {
    if (result.isCorrect) {
      this.passed = true;
      gameState.checkpoints.passed.push(this.id);
      gameState.checkpoints.current = this.id;
      // Award bonus points
      gameState.score += 100;
      gameState.status = "playing";
    } else {
      gameState.lives.current--;
      // Show wrong answer feedback
      this.showWrongAnswer();
      // Respawn at last checkpoint
      gameState.respawnAtCheckpoint();
      gameState.status = "playing";
    }
  }
}
```

### 7.2 Lives Display

```javascript
// LivesManager.js
class LivesManager {
  constructor(maxLives) {
    this.maxLives = maxLives;
    this.current = maxLives;
    this.displayElement = document.getElementById("lives-display");
  }

  loseLife() {
    this.current--;
    this.updateDisplay();

    if (this.current <= 0) {
      this.onGameOver();
    }
  }

  gainLife() {
    // Optional: bonus life on certain achievements
    if (this.current < this.maxLives) {
      this.current++;
      this.updateDisplay();
    }
  }

  updateDisplay() {
    const hearts =
      "♥".repeat(this.current) + "♡".repeat(this.maxLives - this.current);
    this.displayElement.textContent = hearts;
    this.displayElement.className = `lives-display lives-${this.current}`;
  }

  onGameOver() {
    bridge.complete({
      outcome: "game_over",
      reason: "max_wrong_attempts",
      score: gameState.score,
      level: gameState.currentLevel,
      lives: 0,
    });
  }
}
```

---

## 8. Mapping Gameplay → Learning

### 8.1 Educational Mechanics

| Gameplay Element | Learning Purpose                         |
| ---------------- | ---------------------------------------- |
| Checkpoint 1     | Test kiến thức cơ bản (Nhận biết)        |
| Checkpoint 2     | Test kiến thức trung bình (Thông hiểu)   |
| Checkpoint 3     | Test kiến thức nâng cao (Vận dụng)       |
| Final Checkpoint | Tổng hợp (Vận dụng cao)                  |
| Collect Coins    | Bonus points, không ảnh hưởng checkpoint |
| Defeat Enemies   | Bonus points, không ảnh hưởng checkpoint |
| Wrong Answer     | Mất mạng, phải retry checkpoint          |

### 8.2 Question Distribution by Difficulty

```typescript
// Question plan for Mario (similar to Gold Miner)
interface MarioQuestionPlan {
  distribution_mode: "progressive" | "random";

  // Number of questions per level
  questions_per_level: number[]; // [10, 10, 10, 10]

  // Difficulty bands mapped to checkpoints
  checkpoints_per_level: {
    recognition: string[]; // Checkpoint IDs for basic questions
    comprehension: string[]; // Checkpoint IDs for understanding
    application_basic: string[]; // Checkpoint IDs for basic application
    application_advanced: string[]; // Checkpoint IDs for advanced
  };

  // Checkpoint positions in level
  checkpoint_positions: {
    [levelId: string]: {
      x: number;
      y: number;
      difficulty_band: DifficultyBand;
    }[];
  };
}
```

### 8.3 Scoring System

```typescript
interface ScoringConfig {
  // Checkpoint completion
  checkpoint_passed: 100;

  // Correct answer at checkpoint
  answer_correct: 50;

  // Wrong answer penalty
  answer_wrong: -25; // Reduces potential score

  // Coin collection
  coin_collected: 10;

  // Enemy defeated
  enemy_defeated: 25;

  // Level completion bonus
  level_complete: 200;

  // Game completion bonus
  game_complete: 500;

  // Perfect score (all correct, no lives lost)
  perfect_clear_bonus: 300;
}
```

### 8.4 Progress Tracking

```typescript
interface LearningProgress {
  totalCheckpoints: number;
  passedCheckpoints: number;
  currentLevel: number;

  questions: {
    total: number;
    answered: number;
    correct: number;
    wrong: number;
    accuracy: number;
  };

  byDifficulty: {
    [band: string]: {
      total: number;
      correct: number;
    };
  };

  topicsEncountered: string[];
  averageResponseTimeMs: number;
}
```

---

## 9. Fullscreen Handling

Game Mario sử dụng fullscreen giống các game khác trong hệ thống:

```javascript
// Fullscreen handled by host (GamePlayerShell)
// Game không tự request fullscreen

// Khi question modal hiển thị:
// 1. Host tự động exit fullscreen
// 2. Modal hiển thị overlay
// 3. Game vẫn chạy nhưng bị pause

// Khi question đóng:
// 1. Host giữ ở non-fullscreen
// 2. Game tiếp tục
// 3. Student có thể manually enter fullscreen lại
```

**Lưu ý:** Checkpoint trigger và question modal flow không phụ thuộc vào fullscreen state.

---

## 10. Leaderboard Integration

```typescript
// Leaderboard data sent on completion
interface MarioLeaderboardPayload {
  attempt_id: string;
  package_id: string;
  user_id: string; // From session

  // Primary ranking metric
  score_total: number;

  // Tie-breaker metrics
  score_gameplay: number; // From coins, enemies, etc.
  score_checkpoint: number; // From checkpoint/quiz

  // Time-based tie-breaker
  total_time_ms: number; // Total game time
  question_time_ms: number; // Time spent on questions (lower is better)

  // Quality metrics
  accuracy: number; // % correct answers
  lives_remaining: number;
  checkpoints_passed: number;
  levels_completed: number;

  summary_payload: {
    outcome: "completed" | "game_over";
    final_level: number;
    total_coins: number;
    total_enemies: number;
  };
}
```

---

## 11. Testing Checklist

### 11.1 Gameplay Testing

- [ ] Player movement left/right
- [ ] Jumping mechanics
- [ ] Enemy collision detection
- [ ] Coin collection
- [ ] Checkpoint trigger
- [ ] Lives decrement on wrong answer
- [ ] Game over on 0 lives
- [ ] Respawn at checkpoint
- [ ] Level progression

### 11.2 Question System Testing

- [ ] Question modal displays correctly
- [ ] All question types render properly
- [ ] Answer submission works
- [ ] Correct/incorrect feedback
- [ ] Question retry on wrong answer
- [ ] Skip non-required questions

### 11.3 Integration Testing

- [ ] postMessage bridge communication
- [ ] host:init received and processed
- [ ] host:pause pauses game
- [ ] host:resume resumes game
- [ ] game:complete sends correct payload
- [ ] Leaderboard updates
- [ ] Session persistence

### 11.4 Edge Cases

- [ ] Multiple rapid checkpoint hits
- [ ] Answer while game loading
- [ ] Tab visibility change during quiz
- [ ] Network error on answer submission
- [ ] Browser refresh during gameplay
