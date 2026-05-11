# Mario Platformer - Implementation Proposal

Tài liệu này trình bày chi tiết kế hoạch implement game Mario Platformer vào hệ thống EduHub.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc Backend](#2-kiến-trúc-backend)
3. [Kiến trúc Frontend](#3-kiến-trúc-frontend)
4. [Database Changes](#4-database-changes)
5. [Game Runtime Implementation](#5-game-runtime-implementation)
6. [Các Phase Implement](#6-các-phase-implement)
7. [Rủi ro kỹ thuật](#7-rủi-ro-kỹ-thuật)
8. [Testing Plan](#8-testing-plan)

---

## 1. Tổng quan

### 1.1 Mục tiêu

Tích hợp game Mario Platformer với:
- Hệ thống checkpoint bắt buộc
- Câu hỏi kiểm tra kiến thức tại mỗi checkpoint
- 3 mạng, restart tại checkpoint khi trả lời sai
- Hỗ trợ tất cả question types từ question bank
- Tương thích với kiến trúc iframe + postMessage hiện tại

### 1.2 Scope

**Trong scope:**
- Tạo game module mới `mario-platformer`
- Tạo Mario runtime bundle
- Tích hợp với question system hiện có
- Checkpoint system
- Lives system
- Leaderboard integration

**Ngoài scope:**
- Thay đổi kiến trúc game chung (vẫn dùng iframe + postMessage)
- Thay đổi database schema hiện tại (dùng chung bảng với Gold Miner)

### 1.3 Dependencies

- Backend: FastAPI, SQLAlchemy (đã có)
- Frontend: React, TypeScript (đã có)
- Game: HTML5 Canvas, Vanilla JavaScript/TypeScript

---

## 2. Kiến trúc Backend

### 2.1 Game Module Registration

```python
# backend/app/services/game_seed_service.py

MARIO_MODULE_SLUG = "mario-platformer"

MARIO_CAPABILITY_CONFIG = {
    "session": {
        "default_levels": 3,
        "item_count_per_level": 15,
        "max_lives": 3,
    },
    "question_distribution": {
        "mode": "random",  # or "progressive"
        "questions_per_level": 10,
    },
    "supports_checkpoints": True,
    "checkpoint_trigger_type": "checkpoint_reached",
    "supports_lives": True,
    "supports_wrong_answer_retry": True,
    "respawn_at_checkpoint": True,
    "ranking_by_time": True,
}
```

### 2.2 Runtime Service Extension

```python
# backend/app/services/game_runtime_service.py

def _is_mario_package(package: ContentPackage | None) -> bool:
    """Check if package uses Mario platformer module."""
    if not package or not package.game_config or not package.game_config.game_module:
        return False
    return package.game_config.game_module.slug == MARIO_MODULE_SLUG


def _handle_mario_trigger(
    db: Session,
    *,
    attempt: PackageAttempt,
    package_id: str,
    data: GameRuntimeTriggerRequest,
    checkpoint_id: str | None,
) -> dict:
    """
    Handle Mario checkpoint trigger.
    
    Logic:
    1. Parse checkpoint info from trigger
    2. Check if already answered correctly
    3. Select question based on difficulty band for this checkpoint
    4. Return ask_question action
    """
    # Implementation similar to _handle_gold_miner_trigger
    # Key differences:
    # - Trigger type is 'checkpoint_reached' instead of 'item_captured'
    # - Track checkpoint progress separately
    # - No forced tail question logic (checkpoints are explicit)
    
    pass
```

### 2.3 Trigger Handler Changes

```python
# backend/app/services/game_runtime_service.py

def handle_trigger(db: Session, *, package_id: str, student: User, data: GameRuntimeTriggerRequest, attempt: PackageAttempt | None = None) -> dict:
    # ... existing code ...
    
    # Check for Mario-specific trigger
    is_mario = _is_mario_package(attempt.package)
    
    if is_mario:
        event_payload = data.event_payload if isinstance(data.event_payload, dict) else {}
        checkpoint_id = event_payload.get("checkpointId")
        
        return _handle_mario_trigger(
            db,
            attempt=attempt,
            package_id=package_id,
            data=data,
            checkpoint_id=checkpoint_id,
        )
    
    # Gold Miner trigger logic
    if is_gold_miner:
        return _handle_gold_miner_trigger(...)
    
    # ... rest of existing code ...
```

### 2.4 Question Selection for Mario

```python
def _select_question_for_mario_checkpoint(
    attempt: PackageAttempt,
    *,
    checkpoint_id: str,
    difficulty_band: str,
) -> QuestionBankItem | None:
    """
    Select question for Mario checkpoint.
    
    Unlike Gold Miner:
    - Checkpoint explicitly maps to difficulty band
    - No forced tail logic - checkpoints are fixed
    - Track checkpoint-specific question history
    """
    package = attempt.package
    if not package or not package.question_bank:
        return None
    
    # Get difficulty band from checkpoint mapping
    # Or use sequential selection based on checkpoint order
    
    presented_ids = _presented_question_ids(attempt)
    
    # Get questions for this difficulty band
    eligible = [
        item for item in package.question_bank.items
        if item.is_active 
        and item.difficulty_band == difficulty_band
        and item.id not in presented_ids
    ]
    
    if not eligible:
        return None
    
    # Return first available question (ordered by order_index)
    return sorted(eligible, key=lambda x: x.order_index or 10**9)[0]
```

### 2.5 Checkpoint Progress Tracking

```python
# Extend runtime_state to track Mario-specific state
def _get_mario_runtime_state(attempt: PackageAttempt) -> dict:
    """Get Mario-specific runtime state."""
    runtime_state = _runtime_state_dict(attempt)
    return runtime_state.get("mario", {})


def _update_mario_runtime_state(
    attempt: PackageAttempt,
    *,
    checkpoints_passed: list[str],
    current_checkpoint: str | None,
    lives: int,
) -> None:
    """Update Mario-specific runtime state."""
    runtime_state = _runtime_state_dict(attempt)
    
    if "mario" not in runtime_state:
        runtime_state["mario"] = {}
    
    runtime_state["mario"].update({
        "checkpoints_passed": checkpoints_passed,
        "current_checkpoint": current_checkpoint,
        "lives": lives,
    })
    
    attempt.runtime_state = runtime_state
```

---

## 3. Kiến trúc Frontend

### 3.1 Game Manifest for Mario

```json
// frontend/public/game-modules/mario-platformer/manifest.json
{
  "id": "mario-platformer",
  "slug": "mario-platformer",
  "title": "Mario Platformer - Học mà Chơi",
  "entry": "index.html",
  "runtime": {
    "kind": "iframe",
    "sandbox": "allow-scripts allow-same-origin",
    "aspect_ratio": "16 / 9"
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
    "max_lives": 3
  }
}
```

### 3.2 GamePlayerShell Modifications

```typescript
// frontend/src/components/games/GamePlayerShell.tsx
// No major changes needed - existing infrastructure supports Mario

// Key points:
// 1. Uses same postMessage protocol
// 2. Question modal component works for all question types
// 3. Lives display logic can be extended

// Optional: Add Mario-specific UI elements
const MARIO_RUNTIME_FACTS = [
  // ... existing facts ...
  { label: 'Mạng', value: `${runtimeSnapshot.lives ?? 3}/${runtimeSnapshot.maxLives ?? 3}` },
  { label: 'Checkpoint', value: runtimeSnapshot.checkpointId ?? '-' },
];
```

### 3.3 Runtime Config for Mario

```typescript
// frontend/src/features/games/helpers.ts

export function resolveRuntimeConfig(
  playBundle: GamePackagePlayResponse | null,
  startBundle: GameStartAttemptResponse | null,
) {
  // ... existing code ...
  
  // Add Mario-specific config resolution
  const module = resolveGameModule(playBundle, startBundle);
  if (module?.slug === 'mario-platformer') {
    const config = startBundle?.runtime_config ?? playBundle?.runtime_config;
    return {
      ...config,
      // Mario-specific defaults
      session: {
        ...config?.session,
        maxLives: config?.session?.maxLives ?? 3,
        levelCount: config?.session?.levelCount ?? 3,
      },
    };
  }
  
  return config;
}
```

---

## 4. Database Changes

### 4.1 Game Module Registration

```sql
-- Maria migration: Add Mario module to game_modules
-- Uses existing table, no schema change needed

INSERT INTO game_modules (
    id, 
    slug, 
    title, 
    description, 
    runtime_kind, 
    manifest_url, 
    status, 
    capability_config,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid()::text,
    'mario-platformer',
    'Mario Platformer - Học mà Chơi',
    'Game platformer giáo dục với hệ thống checkpoint và câu hỏi kiến thức',
    'iframe',
    '/game-modules/mario-platformer/manifest.json',
    'active',
    '{"session": {"default_levels": 3, "max_lives": 3}, "question_distribution": {"mode": "random", "questions_per_level": 10}, "supports_checkpoints": true, "checkpoint_trigger_type": "checkpoint_reached"}'::jsonb,
    NOW(),
    NOW()
);
```

### 4.2 Checkpoint Progress (via runtime_state)

```python
# No new table needed - checkpoint progress stored in runtime_state JSON

# runtime_state structure for Mario:
{
    "mario": {
        "checkpoints_passed": ["l1cp1", "l1cp2", "l2cp1"],
        "current_checkpoint": "l2cp1",
        "lives": 2,
        "level": 2
    },
    "question_plan": {...},
    "wrong_attempts": 1,
    "failed_questions": ["q_abc123"]
}
```

### 4.3 Alembic Migration

```python
# backend/alembic/versions/xxxx_add_mario_module.py

"""Add mario-platformer game module.

Revision ID: xxxx
Revises: previous_revision
Create Date: 2026-05-11
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'xxxx'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Mario module will be inserted via seed service
    # No schema changes needed - uses existing game_modules table
    pass


def downgrade() -> None:
    pass
```

### 4.4 Optional: Checkpoint History Table

Nếu cần track chi tiết checkpoint history (không bắt buộc):

```python
# backend/alembic/versions/xxxx_add_checkpoint_history.py

"""Add checkpoint progress tracking.

Optional table for detailed checkpoint analytics.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = 'xxxx'
down_revision = 'previous_revision'


def upgrade() -> None:
    op.create_table(
        'checkpoint_progress',
        sa.Column('id', UUID(), nullable=False),
        sa.Column('package_attempt_id', UUID(), nullable=False),
        sa.Column('checkpoint_id', sa.String(), nullable=False),
        sa.Column('level', sa.Integer(), nullable=False),
        sa.Column('passed_at', sa.DateTime(), nullable=True),
        sa.Column('question_attempt_id', UUID(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('score_awarded', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['package_attempt_id'], ['package_attempts.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_checkpoint_progress_attempt', 'checkpoint_progress', ['package_attempt_id'])


def downgrade() -> None:
    op.drop_table('checkpoint_progress')
```

---

## 5. Game Runtime Implementation

### 5.1 Project Structure

```
frontend/public/game-modules/mario-platformer/
├── manifest.json
├── index.html
├── css/
│   └── game.css
├── js/
│   ├── main.js
│   ├── bridge.js
│   └── game/
│       ├── Game.js
│       ├── GameState.js
│       ├── QuizManager.js
│       ├── CheckpointManager.js
│       ├── LivesManager.js
│       └── ScoreManager.js
├── entities/
│   ├── Player.js
│   ├── Enemy.js
│   ├── Platform.js
│   ├── Coin.js
│   └── Checkpoint.js
├── physics/
│   ├── PhysicsEngine.js
│   └── InputHandler.js
└── assets/
    ├── sprites/
    └── audio/
```

### 5.2 Core Game Loop

```javascript
// js/game/Game.js
class Game {
  constructor(canvas, bridge) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bridge = bridge;
    
    this.state = new GameState();
    this.player = new Player();
    this.levelManager = new LevelManager();
    this.checkpointManager = new CheckpointManager(this.state);
    this.livesManager = new LivesManager(3);
    this.quizManager = new QuizManager(this.bridge);
    this.scoreManager = new ScoreManager();
    
    this.lastTime = 0;
    this.isPaused = false;
  }
  
  async init(runtimeConfig) {
    // Parse runtime config
    this.config = runtimeConfig;
    this.maxLives = this.config.session?.maxLives ?? 3;
    this.levelCount = this.config.session?.levelCount ?? 3;
    
    // Initialize managers
    this.livesManager.init(this.maxLives);
    this.levelManager.init(this.levelCount);
    
    // Load first level
    this.loadLevel(1);
    
    // Setup bridge handlers
    this.setupBridgeHandlers();
    
    // Signal ready to host
    this.bridge.ready();
    
    // Start game loop
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  setupBridgeHandlers() {
    this.bridge.onHostMessage('host:init', (payload) => {
      this.handleInit(payload);
    });
    
    this.bridge.onHostMessage('host:pause', (payload) => {
      this.pause();
      this.quizManager.showQuestion(payload);
    });
    
    this.bridge.onHostMessage('host:resume', (payload) => {
      this.quizManager.hideQuestion();
      this.resume();
      
      if (payload.questionResult) {
        this.handleQuestionResult(payload.questionResult);
      }
    });
    
    this.bridge.onHostMessage('host:restart', () => {
      this.restart();
    });
  }
  
  gameLoop(timestamp) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    if (!this.isPaused) {
      this.update(deltaTime);
      this.render();
      this.sendStateUpdate();
    }
    
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  update(deltaTime) {
    // Update player
    this.player.update(deltaTime, this.levelManager.getCurrentPlatforms());
    
    // Update enemies
    this.levelManager.getCurrentEnemies().forEach(enemy => {
      enemy.update(deltaTime);
    });
    
    // Check collisions
    this.checkCollisions();
    
    // Update camera
    this.updateCamera();
    
    // Update time
    this.state.elapsedTime += deltaTime;
  }
  
  checkCollisions() {
    // Platform collisions
    this.levelManager.getCurrentPlatforms().forEach(platform => {
      this.player.handlePlatformCollision(platform);
    });
    
    // Coin collisions
    this.levelManager.getCurrentCoins().forEach((coin, index) => {
      if (this.player.collidesWith(coin)) {
        this.collectCoin(coin);
        this.levelManager.removeCoin(index);
      }
    });
    
    // Enemy collisions
    this.levelManager.getCurrentEnemies().forEach((enemy, index) => {
      if (this.player.collidesWith(enemy)) {
        if (this.player.isAbove(enemy)) {
          this.defeatEnemy(enemy);
          this.levelManager.removeEnemy(index);
        } else {
          this.playerHit();
        }
      }
    });
    
    // Checkpoint collisions
    this.levelManager.getCurrentCheckpoints().forEach(checkpoint => {
      if (!checkpoint.passed && this.player.collidesWith(checkpoint)) {
        this.reachCheckpoint(checkpoint);
      }
    });
    
    // Fall death
    if (this.player.y > this.canvas.height) {
      this.playerHit();
    }
  }
  
  reachCheckpoint(checkpoint) {
    // Trigger question via bridge
    this.bridge.triggerQuestion({
      triggerType: 'checkpoint_reached',
      triggerKey: checkpoint.id,
      triggerValue: 'checkpoint',
      eventPayload: {
        checkpointId: checkpoint.id,
        level: this.state.currentLevel,
        playerX: this.player.x,
        playerY: this.player.y
      }
    });
    
    // Pause game until question answered
    this.pause();
  }
  
  handleQuestionResult(result) {
    if (result.isCorrect) {
      // Mark checkpoint as passed
      this.checkpointManager.markPassed(result.checkpointId);
      this.scoreManager.addCheckpointBonus();
      
      // Resume game
      this.resume();
    } else {
      // Lose a life
      const livesRemaining = this.livesManager.loseLife();
      
      if (livesRemaining <= 0) {
        this.gameOver();
      } else {
        // Respawn at last checkpoint
        const respawnPos = this.checkpointManager.getRespawnPosition();
        this.player.respawn(respawnPos.x, respawnPos.y);
        this.resume();
      }
    }
  }
  
  playerHit() {
    const livesRemaining = this.livesManager.loseLife();
    
    if (livesRemaining <= 0) {
      this.gameOver();
    } else {
      // Respawn at checkpoint
      const respawnPos = this.checkpointManager.getRespawnPosition();
      this.player.respawn(respawnPos.x, respawnPos.y);
    }
  }
  
  gameOver() {
    this.state.status = 'game_over';
    this.bridge.complete({
      outcome: 'game_over',
      reason: 'max_wrong_attempts',
      score: this.scoreManager.getTotalScore(),
      level: this.state.currentLevel,
      lives: 0,
      summary: {
        checkpointsPassed: this.checkpointManager.getPassedCount(),
        questionsAnswered: this.quizManager.getAnsweredCount(),
        questionsCorrect: this.quizManager.getCorrectCount(),
        wrongAnswers: this.livesManager.getWrongAnswers()
      }
    });
  }
  
  sendStateUpdate() {
    this.bridge.updateState({
      status: this.state.status,
      score: this.scoreManager.getTotalScore(),
      lives: this.livesManager.getCurrentLives(),
      level: this.state.currentLevel,
      checkpointId: this.checkpointManager.getCurrentCheckpointId(),
      x: this.player.x,
      y: this.player.y,
      elapsedTime: this.state.elapsedTime
    });
  }
  
  pause() {
    this.isPaused = true;
  }
  
  resume() {
    this.isPaused = false;
  }
  
  restart() {
    this.state.reset();
    this.player.reset();
    this.levelManager.loadLevel(1);
    this.livesManager.reset();
    this.scoreManager.reset();
    this.checkpointManager.reset();
    this.resume();
  }
}
```

### 5.3 Quiz Manager

```javascript
// js/game/QuizManager.js
class QuizManager {
  constructor(bridge) {
    this.bridge = bridge;
    this.currentQuestion = null;
    this.currentAttemptId = null;
    this.answeredCount = 0;
    this.correctCount = 0;
    
    this.modalElement = null;
  }
  
  showQuestion(hostPayload) {
    this.currentAttemptId = hostPayload.questionAttemptId;
    this.currentQuestion = hostPayload.question;
    
    // Create modal
    this.createModal();
    this.modalElement.classList.remove('hidden');
    
    // Render question based on type
    this.renderQuestion();
  }
  
  hideQuestion() {
    if (this.modalElement) {
      this.modalElement.classList.add('hidden');
    }
    this.currentQuestion = null;
    this.currentAttemptId = null;
  }
  
  createModal() {
    // Create modal DOM if not exists
    if (!this.modalElement) {
      this.modalElement = document.createElement('div');
      this.modalElement.id = 'quiz-modal';
      this.modalElement.className = 'quiz-modal hidden';
      document.body.appendChild(this.modalElement);
    }
  }
  
  renderQuestion() {
    const question = this.currentQuestion;
    
    let optionsHtml = '';
    
    switch (question.type) {
      case 'single_choice':
      case 'multi_choice':
        optionsHtml = this.renderOptions(question.options);
        break;
      case 'text':
        optionsHtml = `<textarea id="text-answer" rows="4"></textarea>`;
        break;
      case 'matching':
        optionsHtml = this.renderMatching(question);
        break;
      case 'image_upload':
        optionsHtml = `<input type="file" id="image-upload" accept="image/*">`;
        break;
    }
    
    this.modalElement.innerHTML = `
      <div class="quiz-content">
        <div class="quiz-header">
          <span class="quiz-type">${this.getTypeLabel(question.type)}</span>
          <span class="quiz-points">${question.points || 0} điểm</span>
        </div>
        <p class="quiz-question">${question.content}</p>
        <div class="quiz-options">${optionsHtml}</div>
        <div class="quiz-actions">
          <button class="quiz-submit" disabled>Nộp câu trả lời</button>
        </div>
        <div class="quiz-feedback hidden"></div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  renderOptions(options) {
    return options.map(opt => `
      <button class="quiz-option" data-id="${opt.id}">
        <span class="option-marker"></span>
        <span class="option-text">${opt.content}</span>
      </button>
    `).join('');
  }
  
  getTypeLabel(type) {
    const labels = {
      'single_choice': 'Trắc nghiệm 1 đáp án',
      'multi_choice': 'Trắc nghiệm nhiều đáp án',
      'text': 'Tự luận',
      'matching': 'Nối cột',
      'image_upload': 'Tải ảnh'
    };
    return labels[type] || type;
  }
  
  attachEventListeners() {
    const submitBtn = this.modalElement.querySelector('.quiz-submit');
    const options = this.modalElement.querySelectorAll('.quiz-option');
    const textInput = this.modalElement.querySelector('#text-answer');
    
    // Option selection
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        if (this.currentQuestion.type === 'single_choice') {
          options.forEach(o => o.classList.remove('selected'));
        }
        opt.classList.toggle('selected');
        submitBtn.disabled = false;
      });
    });
    
    // Text input
    if (textInput) {
      textInput.addEventListener('input', () => {
        submitBtn.disabled = textInput.value.trim() === '';
      });
    }
    
    // Submit
    submitBtn.addEventListener('click', () => this.submitAnswer());
  }
  
  submitAnswer() {
    const question = this.currentQuestion;
    let answer;
    
    switch (question.type) {
      case 'single_choice':
        const selected = this.modalElement.querySelector('.quiz-option.selected');
        answer = selected ? [selected.dataset.id] : [];
        break;
      case 'multi_choice':
        const selectedOptions = this.modalElement.querySelectorAll('.quiz-option.selected');
        answer = Array.from(selectedOptions).map(opt => opt.dataset.id);
        break;
      case 'text':
        answer = this.modalElement.querySelector('#text-answer').value;
        break;
      case 'matching':
        // Build matching answer array
        answer = this.getMatchingAnswers();
        break;
      case 'image_upload':
        // Handle image upload
        answer = this.getUploadedImageUrl();
        break;
    }
    
    // Send answer to host (host will call backend API)
    window.parent.postMessage({
      channel: 'eduhub:game-bridge',
      type: 'game:answer-submitted',
      payload: {
        attemptId: this.currentAttemptId,
        answer: answer,
        questionType: question.type
      }
    }, '*');
  }
  
  onAnswerResult(result) {
    this.answeredCount++;
    if (result.isCorrect) {
      this.correctCount++;
    }
    
    // Show feedback
    const feedback = this.modalElement.querySelector('.quiz-feedback');
    feedback.classList.remove('hidden', 'correct', 'wrong');
    feedback.classList.add(result.isCorrect ? 'correct' : 'wrong');
    feedback.innerHTML = `
      <div class="feedback-icon">${result.isCorrect ? '✓' : '✗'}</div>
      <p class="feedback-text">${result.isCorrect ? 'Chính xác!' : 'Chưa đúng rồi!'}</p>
      ${result.feedbackMessage ? `<p class="feedback-explanation">${result.feedbackMessage}</p>` : ''}
      <button class="quiz-continue">Tiếp tục</button>
    `;
    
    feedback.querySelector('.quiz-continue').addEventListener('click', () => {
      // This will trigger host:resume
      this.hideQuestion();
    });
  }
  
  getAnsweredCount() { return this.answeredCount; }
  getCorrectCount() { return this.correctCount; }
}
```

### 5.4 Checkpoint Manager

```javascript
// js/game/CheckpointManager.js
class CheckpointManager {
  constructor(state) {
    this.state = state;
    this.checkpoints = new Map();
    this.passedCheckpoints = [];
    this.currentCheckpoint = null;
  }
  
  loadLevelCheckpoints(levelData) {
    this.checkpoints.clear();
    levelData.checkpoints.forEach(cp => {
      this.checkpoints.set(cp.id, {
        ...cp,
        passed: false,
        triggered: false
      });
    });
  }
  
  getCheckpoints() {
    return Array.from(this.checkpoints.values());
  }
  
  getCurrentCheckpoints() {
    return this.getCheckpoints();
  }
  
  markPassed(checkpointId) {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (checkpoint) {
      checkpoint.passed = true;
      checkpoint.triggered = true;
      
      if (!this.passedCheckpoints.includes(checkpointId)) {
        this.passedCheckpoints.push(checkpointId);
      }
      this.currentCheckpoint = checkpointId;
    }
  }
  
  getRespawnPosition(checkpointId) {
    const cpId = checkpointId || this.currentCheckpoint;
    if (!cpId) {
      return { x: 100, y: 400 }; // Level start position
    }
    
    const checkpoint = this.checkpoints.get(cpId);
    if (!checkpoint) {
      return { x: 100, y: 400 };
    }
    
    return {
      x: checkpoint.x,
      y: checkpoint.y - 32 // Spawn above checkpoint
    };
  }
  
  getPassedCount() {
    return this.passedCheckpoints.length;
  }
  
  getCurrentCheckpointId() {
    return this.currentCheckpoint;
  }
  
  reset() {
    this.passedCheckpoints = [];
    this.currentCheckpoint = null;
    this.checkpoints.forEach(cp => {
      cp.passed = false;
      cp.triggered = false;
    });
  }
}
```

### 5.5 Lives Manager

```javascript
// js/game/LivesManager.js
class LivesManager {
  constructor(maxLives) {
    this.maxLives = maxLives;
    this.current = maxLives;
    this.wrongAnswers = 0;
  }
  
  init(maxLives) {
    this.maxLives = maxLives;
    this.current = maxLives;
  }
  
  loseLife() {
    this.current = Math.max(0, this.current - 1);
    this.wrongAnswers++;
    return this.current;
  }
  
  gainLife() {
    if (this.current < this.maxLives) {
      this.current++;
    }
  }
  
  getCurrentLives() {
    return this.current;
  }
  
  getMaxLives() {
    return this.maxLives;
  }
  
  getWrongAnswers() {
    return this.wrongAnswers;
  }
  
  reset() {
    this.current = this.maxLives;
    this.wrongAnswers = 0;
  }
}
```

---

## 6. Các Phase Implement

### Phase 1: Backend Foundation (Day 1)
**Mục tiêu:** Có thể register Mario module và trigger question

```
Tasks:
├── 1.1 Create Alembic migration for module seed
├── 1.2 Add MARIO_MODULE_SLUG constant
├── 1.3 Add _is_mario_package() helper
├── 1.4 Implement _handle_mario_trigger()
├── 1.5 Update handle_trigger() to route Mario triggers
└── 1.6 Test trigger endpoint with curl
```

**Verification:**
```bash
# Test module registration
curl http://localhost:8000/api/v1/game-modules

# Test trigger (mock)
curl -X POST http://localhost:8000/api/v1/game-packages/{id}/runtime/trigger \
  -H "Content-Type: application/json" \
  -d '{"trigger_type":"checkpoint_reached","trigger_key":"l1cp1","trigger_value":"checkpoint"}'
```

### Phase 2: Frontend Integration (Day 1-2)
**Mục tiêu:** Frontend có thể load Mario game

```
Tasks:
├── 2.1 Create game bundle directory structure
├── 2.2 Create manifest.json
├── 2.3 Create basic index.html with canvas
├── 2.4 Implement GameBridge class
├── 2.5 Create GameState class
├── 2.6 Create Player class with movement
├── 2.7 Create Level 1 with platforms
├── 2.8 Test iframe loading in GamePlayerShell
└── 2.9 Verify postMessage communication
```

**Verification:**
- [ ] Mario game loads in iframe
- [ ] Player can move left/right
- [ ] Player can jump
- [ ] `game:ready` message sent
- [ ] `game:state` updates received

### Phase 3: Checkpoint System (Day 2)
**Mục tiêu:** Checkpoint trigger question flow hoàn chỉnh

```
Tasks:
├── 3.1 Create Checkpoint entity class
├── 3.2 Create CheckpointManager
├── 3.3 Create Checkpoint visual (flag)
├── 3.4 Implement checkpoint collision detection
├── 3.5 Send game:question-trigger on collision
├── 3.6 Handle host:pause (pause game)
├── 3.7 Handle host:resume (resume game)
├── 3.8 Test full trigger → question → resume flow
└── 3.9 Add checkpoint visual feedback
```

**Verification:**
- [ ] Player reaches checkpoint
- [ ] Game pauses
- [ ] Question modal appears (via host)
- [ ] Student answers
- [ ] Game resumes or loses life

### Phase 4: Lives System (Day 2-3)
**Mục tiêu:** 3 lives với respawn tại checkpoint

```
Tasks:
├── 4.1 Create LivesManager
├── 4.2 Add lives UI display
├── 4.3 Implement wrong answer → lose life
├── 4.4 Implement respawn at checkpoint
├── 4.5 Implement game over at 0 lives
├── 4.6 Add lives to runtime_state
├── 4.7 Test lives decrement
└── 4.8 Test game over flow
```

**Verification:**
- [ ] Lives display shows ♥♥♥
- [ ] Wrong answer decrements lives
- [ ] Respawn at checkpoint on wrong answer
- [ ] Game over modal at 0 lives
- [ ] Runtime state tracks lives

### Phase 5: Multi-Level Support (Day 3)
**Mục tiêu:** Nhiều level với checkpoint

```
Tasks:
├── 5.1 Create LevelManager
├── 5.2 Design Level 1 (easy)
├── 5.3 Design Level 2 (medium)
├── 5.4 Design Level 3 (hard)
├── 5.5 Implement level progression
├── 5.6 Add enemies (Goombas)
├── 5.7 Add coin collection
├── 5.8 Test level completion
└── 5.9 Test checkpoint across levels
```

**Verification:**
- [ ] 3 distinct levels load
- [ ] Checkpoints in each level work
- [ ] Level completion advances to next
- [ ] Enemies appear and can be defeated
- [ ] Coins can be collected

### Phase 6: Question Types (Day 3-4)
**Mục tiêu:** Hỗ trợ tất cả question types

```
Tasks:
├── 6.1 Extend QuizManager for all question types
├── 6.2 Implement single_choice rendering
├── 6.3 Implement multi_choice rendering
├── 6.4 Implement text input rendering
├── 6.5 Implement matching UI
├── 6.6 Implement image upload
├── 6.7 Test each question type
└── 6.8 Verify answer submission works
```

**Verification:**
- [ ] single_choice questions display and submit
- [ ] multi_choice questions display and submit
- [ ] text questions accept input
- [ ] matching questions show drag-drop
- [ ] image_upload accepts file

### Phase 7: Leaderboard & Polish (Day 4)
**Mục tiêu:** Complete integration với EduHub ecosystem

```
Tasks:
├── 7.1 Implement score tracking
├── 7.2 Add score to game:complete payload
├── 7.3 Test leaderboard submission
├── 7.4 Add game over screen
├── 7.5 Add restart functionality
├── 7.6 Add sound effects
├── 7.7 Polish visuals
└── 7.8 E2E testing
```

**Verification:**
- [ ] Score displays during game
- [ ] Score sent on completion
- [ ] Leaderboard updates
- [ ] Restart works correctly
- [ ] Sound effects play

### Phase 8: Documentation & Deployment (Day 5)
**Mục tiêu:** Sẵn sàng production

```
Tasks:
├── 8.1 Update docs/game-runtime-contract.md
├── 8.2 Add Mario-specific section
├── 8.3 Create admin guide for teachers
├── 8.4 Build production bundle
├── 8.5 Deploy to staging
├── 8.6 Final QA testing
└── 8.7 Deploy to production
```

---

## 7. Rủi ro kỹ thuật

### 7.1 Performance

| Rủi ro | Xác suất | Tác động | Hướng xử lý |
|---------|----------|-----------|--------------|
| Canvas rendering chậm | Thấp | Cao | Use requestAnimationFrame, optimize sprite drawing |
| Too many entities | Trung bình | Trung bình | Object pooling, culling off-screen |

### 7.2 Integration

| Rủi ro | Xác suất | Tác động | Hướng xử lý |
|---------|----------|-----------|--------------|
| postMessage timing issues | Trung bình | Cao | Add timeout, retry logic |
| Question modal blocking | Thấp | Cao | Use portal, handle fullscreen exit |
| Session state mismatch | Trung bình | Trung bình | Validate state on host:resume |

### 7.3 Compatibility

| Rủi ro | Xác suất | Tác động | Hướng xử lý |
|---------|----------|-----------|--------------|
| Mobile touch input | Cao | Thấp | Add touch controls, warn on unsupported |
| Browser iframe policies | Thấp | Cao | Test on Safari, Chrome, Firefox |

### 7.4 Data Integrity

| Rủi ro | Xác suất | Tác động | Hướng xử lý |
|---------|----------|-----------|--------------|
| Network failure during question | Trung bình | Cao | Cache pending answer, retry on reconnect |
| Tab close during game | Trung bình | Trung bình | Use sendBeacon for final state |

---

## 8. Testing Plan

### 8.1 Unit Tests

```javascript
// Test Player movement
describe('Player', () => {
  test('moves left when left arrow pressed', () => { ... });
  test('moves right when right arrow pressed', () => { ... });
  test('jumps when spacebar pressed and grounded', () => { ... });
  test('applies gravity when airborne', () => { ... });
});

// Test CheckpointManager
describe('CheckpointManager', () => {
  test('marks checkpoint as passed', () => { ... });
  test('returns correct respawn position', () => { ... });
  test('tracks passed checkpoints', () => { ... });
});

// Test LivesManager
describe('LivesManager', () => {
  test('decrements lives on wrong answer', () => { ... });
  test('returns 0 at game over', () => { ... });
  test('resets correctly', () => { ... });
});
```

### 8.2 Integration Tests

```javascript
// Test bridge communication
describe('GameBridge', () => {
  test('sends ready message on init', () => { ... });
  test('sends question-trigger on checkpoint', () => { ... });
  test('receives host:pause and pauses game', () => { ... });
  test('receives host:resume and resumes game', () => { ... });
});

// Test full question flow
describe('Question Flow', () => {
  test('checkpoint → pause → question → answer → resume', () => { ... });
  test('wrong answer → lose life → respawn', () => { ... });
  test('0 lives → game over', () => { ... });
});
```

### 8.3 E2E Tests

```bash
# Using Playwright or Cypress

test('Complete game flow', async ({ page }) => {
  // 1. Login as student
  await page.goto('/student/login');
  await page.fill('#email', 'student@test.com');
  await page.fill('#password', 'password');
  await page.click('button[type=submit]');
  
  // 2. Open Mario game
  await page.goto('/student/games');
  await page.click('[data-game="mario-platformer"]');
  
  // 3. Play game
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1000);
  
  // 4. Reach checkpoint
  // ... simulate gameplay
  
  // 5. Answer question
  await page.waitForSelector('.quiz-modal');
  await page.click('.quiz-option:first-child');
  await page.click('.quiz-submit');
  
  // 6. Verify game continues
  await page.waitForSelector('.quiz-modal', { state: 'hidden' });
});
```

### 8.4 Load Testing

```bash
# Simulate concurrent game sessions
# Using k6 or Artillery

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
};

export default function() {
  // Start game attempt
  const startRes = http.post(`${BASE_URL}/api/v1/game-packages/${PACKAGE_ID}/start`);
  check(startRes, { 'started': (r) => r.status === 200 });
  
  // Simulate gameplay triggers
  for (let i = 0; i < 5; i++) {
    http.post(`${BASE_URL}/api/v1/game-packages/${PACKAGE_ID}/runtime/trigger`, {
      trigger_type: 'checkpoint_reached',
      trigger_key: `l1cp${i+1}`,
    });
    sleep(2);
  }
  
  // Complete game
  http.post(`${BASE_URL}/api/v1/game-packages/${PACKAGE_ID}/complete`);
}
```

---

## 9. Appendix: File Checklist

### Backend Files

```
backend/
├── app/
│   ├── services/
│   │   ├── game_runtime_service.py  [MODIFY: Add Mario handler]
│   │   └── game_seed_service.py    [MODIFY: Add MARIO_MODULE_SLUG]
│   └── schemas/
│       └── game.py                   [MODIFY: Add Mario schemas if needed]
└── alembic/
    └── versions/
        └── xxxx_add_mario_module.py  [NEW: Migration]
```

### Frontend Files

```
frontend/
├── public/
│   └── game-modules/
│       └── mario-platformer/         [NEW: Game bundle]
│           ├── manifest.json
│           ├── index.html
│           ├── css/
│           └── js/
│               ├── main.js
│               ├── bridge.js
│               └── game/
│                   ├── Game.js
│                   ├── GameState.js
│                   ├── QuizManager.js
│                   ├── CheckpointManager.js
│                   ├── LivesManager.js
│                   └── ScoreManager.js
└── src/
    ├── components/
    │   └── games/
    │       └── GamePlayerShell.tsx   [MODIFY: Optional Mario UI]
    ├── features/
    │   └── games/
    │       ├── helpers.ts            [MODIFY: Add Mario config]
    │       └── catalog.ts            [MODIFY: Add Mario manifest]
    └── services/
        └── game.service.ts            [Likely no changes]
```

### Documentation Files

```
docs/
├── mario-integration-workflow.md    [NEW]
├── mario-implementation-proposal.md [NEW]
└── game-runtime-contract.md         [MODIFY: Add Mario section]
```
