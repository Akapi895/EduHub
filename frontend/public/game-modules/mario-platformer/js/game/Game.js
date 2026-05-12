/**
 * Game - Main game controller for Mario Platformer
 */
class Game {
    constructor() {
        // DOM elements
        this.canvas = document.getElementById('game-canvas');
        this.canvas.width = 1280;
        this.canvas.height = 720;
        
        // Managers and systems
        this.state = new GameState();
        this.player = new Player(this);
        this.levelManager = new LevelManager();
        this.checkpointManager = new CheckpointManager(this.state);
        this.livesManager = new LivesManager(3);
        this.scoreManager = new ScoreManager();
        this.inputHandler = new InputHandler();
        this.renderer = new GameRenderer(this.canvas);
        this.physics = new Physics();
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.isInitialized = false; // Guard to prevent double init
        this.lastTime = 0;
        this.runtimeConfig = null;
        
        // HUD elements
        this.hudScore = document.getElementById('score');
        this.hudLevel = document.getElementById('level');
        this.hudLives = document.getElementById('lives');
        this.hudCheckpoint = document.getElementById('checkpoint');
        
        // Modals
        this.gameOverModal = document.getElementById('game-over-modal');
        this.levelCompleteModal = document.getElementById('level-complete-modal');
        
        this.init();
    }
    
    init() {
        // Setup jump handler only (movement handled in game loop)
        this.inputHandler.onJump(() => this.player.jump());
        
        // Setup bridge handlers
        this.setupBridgeHandlers();
        
        // Setup restart button
        document.getElementById('restart-btn')?.addEventListener('click', () => this.restart());
        document.getElementById('next-level-btn')?.addEventListener('click', () => this.nextLevel());
        
        // Setup quiz continue handler
        window.addEventListener('quiz:continue', (e) => {
            console.log('[GAME] Quiz continue event:', e.detail);
            this.onQuizContinue(e.detail);
        });
        
        // Resize canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Load level data immediately for preview
        this.levelManager.loadLevel(1);
        this.checkpointManager.loadLevelCheckpoints(this.levelManager.levelData);
        
        // Initial render to show game world
        this.render();
        
        // Update HUD
        this.updateHUD();
        
        // Signal ready
        this.state.setStatus('ready');
        
        console.log('[GAME] Initialization complete');
        console.log('[GAME] Platforms:', this.levelManager.getCurrentPlatforms().length);
        console.log('[GAME] Player position:', this.player.x, this.player.y);
    }
    
    setupBridgeHandlers() {
        // Handle init from host
        bridge.onHostMessage('host:init', (payload) => {
            console.log('[GAME] Received host:init', payload);
            this.handleInit(payload);
        });
        
        // Handle pause (question triggered - modal handled by React)
        bridge.onHostMessage('host:pause', (payload) => {
            console.log('[GAME] Received host:pause', payload);
            this.pause();
            // Modal is handled by React's GameQuestionModal
        });
        
        // Handle resume (after answer processed by backend - modal hidden by React)
        bridge.onHostMessage('host:resume', (payload) => {
            console.log('[GAME] === RECEIVED host:resume ===', payload);
            
            // CRITICAL-3: Sync game state from backend (source of truth)
            // Backend tracks wrong_attempts and lives, so we must sync with it
            if (payload.questionResult) {
                // Sync lives from backend if provided
                if (typeof payload.questionResult.lives_remaining === 'number') {
                    const backendLives = payload.questionResult.lives_remaining;
                    const currentLives = this.livesManager.getCurrentLives();
                    // If lives don't match, trust backend
                    if (backendLives !== currentLives) {
                        console.log('[GAME] Syncing lives from backend:', currentLives, '->', backendLives);
                        this.livesManager.current = backendLives;
                        this.updateHUD();
                    }
                }
                
                // Sync wrong_attempts from backend
                if (typeof payload.questionResult.wrong_attempts === 'number') {
                    this.scoreManager.wrongAnswers = payload.questionResult.wrong_attempts;
                }
                
                // Sync checkpoints passed from backend
                if (Array.isArray(payload.questionResult.checkpoints_passed)) {
                    payload.questionResult.checkpoints_passed.forEach(cpId => {
                        this.checkpointManager.markPassed(cpId);
                    });
                }
                
                // Process the result
                this.handleQuestionResult(payload.questionResult);
            }
            
            // Resume game
            this.resume();
            
            // Double-check: ensure isPaused is false
            if (this.isPaused) {
                console.log('[GAME] WARNING: isPaused still true after resume(), forcing...');
                this.isPaused = false;
                this.state.setStatus('playing');
            }
        });
        
        // Handle restart
        bridge.onHostMessage('host:restart', () => {
            // console.log('[GAME] Received host:restart');
            this.restart();
        });
        
        // Auto-start if no host:init received within 2 seconds (for standalone testing)
        // Only auto-start if not already initialized
        this.autoStartTimer = setTimeout(() => {
            if (!this.isInitialized && this.state.status === 'ready') {
                // console.log('[GAME] Auto-starting (no host:init received)');
                this.handleInit({ runtimeConfig: {} });
            }
        }, 1000);
    }
    
    handleInit(payload) {
        // Guard: prevent double initialization
        if (this.isInitialized) {
            // console.log('[GAME] Already initialized, ignoring duplicate host:init');
            return;
        }
        this.isInitialized = true;
        
        // Clear auto-start timer if exists
        if (this.autoStartTimer) {
            clearTimeout(this.autoStartTimer);
            this.autoStartTimer = null;
        }
        
        this.runtimeConfig = payload;
        
        // Apply session config
        if (payload.runtimeConfig?.session) {
            const session = payload.runtimeConfig.session;
            this.livesManager.init(session.maxLives || 3);
            this.state.totalLevels = session.levelCount || 3;
        }
        
        // CRITICAL-2: Handle active question restoration on page reload
        // If there's an active question from previous session, restore game state
        if (payload.active_question && payload.active_question_trigger) {
            console.log('[GAME] Restoring active question from previous session:', payload.active_question_trigger);
            
            // Extract checkpoint info from trigger
            const trigger = payload.active_question_trigger;
            const eventPayload = trigger.eventPayload || {};
            const checkpointId = eventPayload.checkpointId || trigger.triggerValue;
            
            // Restore checkpoint state if checkpoint ID is known
            if (checkpointId && checkpointId !== 'checkpoint') {
                this.checkpointManager.markPassed(checkpointId);
            }
            
            // Mark quiz as active with this question
            this.state.quiz.active = true;
            this.state.quiz.currentCheckpointId = checkpointId;
            this.state.quiz.currentAttemptId = payload.active_question_attempt?.id;
            
            // HIGH-1: Also restore game state if available
            if (payload.restored_game_state) {
                this.restoreGameState(payload.restored_game_state);
            }
            
            // CRITICAL-2: Don't auto-start - wait for host:pause with question
            // The game will be in 'ready' state, and host will send host:pause with question
            this.state.setStatus('ready');
            bridge.ready();
            return;
        }
        
        // HIGH-1: Restore game state if available (from iframe recovery)
        if (payload.restored_game_state) {
            console.log('[GAME] Restoring game state from recovery:', payload.restored_game_state);
            this.restoreGameState(payload.restored_game_state);
        }
        
        // Load first level for fresh start
        this.levelManager.loadLevel(1);
        this.checkpointManager.loadLevelCheckpoints(this.levelManager.levelData);
        
        // Signal ready and start
        bridge.ready();
        this.start();
    }
    
    // HIGH-1: Restore game state from saved snapshot
    restoreGameState(savedState) {
        if (!savedState) return;
        
        console.log('[GAME] restoreGameState:', savedState);
        
        // Restore score
        if (typeof savedState.score === 'number') {
            this.scoreManager.setScore(savedState.score);
        }
        
        // Restore lives
        if (typeof savedState.lives === 'number') {
            this.livesManager.current = savedState.lives;
        }
        
        // Restore level
        if (typeof savedState.level === 'number') {
            this.state.currentLevel = savedState.level;
            if (savedState.level > 1) {
                this.levelManager.loadLevel(savedState.level);
                this.checkpointManager.loadLevelCheckpoints(this.levelManager.levelData);
            }
        }
        
        // Restore player position
        if (typeof savedState.x === 'number' && typeof savedState.y === 'number') {
            this.player.x = savedState.x;
            this.player.y = savedState.y;
        }
        
        // Restore checkpoints passed
        if (Array.isArray(savedState.checkpointsPassed)) {
            savedState.checkpointsPassed.forEach(cpId => {
                this.checkpointManager.markPassed(cpId);
            });
        }
        
        // Restore wrong answers count
        if (typeof savedState.wrongAnswers === 'number') {
            this.scoreManager.wrongAnswers = savedState.wrongAnswers;
        }
        
        this.updateHUD();
    }
    
    start() {
        this.isRunning = true;
        this.state.setStatus('playing');
        this.lastTime = performance.now();
        
        // Send progress message to React to indicate game is running
        bridge.send('game:progress', {
            status: 'running',
            score: this.scoreManager.getScore(),
            lives: this.livesManager.getCurrentLives(),
            level: this.state.currentLevel,
            checkpointId: this.checkpointManager.getCurrentCheckpointId(),
            checkpointsPassed: this.checkpointManager.getPassedCount(),
            x: this.player.x,
            y: this.player.y,
            elapsedTime: 0
        });
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    pause() {
        this.isPaused = true;
        this.state.setStatus('paused');

        // MEDIUM-1: Release all input keys to prevent stuck keys on resume
        this.inputHandler.releaseAllKeys();

        // Send progress message to React to indicate game is paused (not dead)
        bridge.send('game:progress', {
            status: 'paused',
            score: this.scoreManager.getScore(),
            lives: this.livesManager.getCurrentLives(),
            level: this.state.currentLevel,
            checkpointId: this.checkpointManager.getCurrentCheckpointId(),
            checkpointsPassed: this.checkpointManager.getPassedCount(),
            x: this.player.x,
            y: this.player.y,
            elapsedTime: this.state.elapsedTime
        });
    }
    
    resume() {
        this.isPaused = false;
        this.state.setStatus('playing');
        this.lastTime = performance.now();
        
        // console.log('[GAME] resume() called - isPaused:', this.isPaused, 'status:', this.state.status);
        
        // Send progress message to React to indicate game is running again
        bridge.send('game:progress', {
            status: 'running',
            score: this.scoreManager.getScore(),
            lives: this.livesManager.getCurrentLives(),
            level: this.state.currentLevel,
            checkpointId: this.checkpointManager.getCurrentCheckpointId(),
            checkpointsPassed: this.checkpointManager.getPassedCount(),
            x: this.player.x,
            y: this.player.y,
            elapsedTime: this.state.elapsedTime
        });
    }
    
    restart() {
        // Reset all managers
        this.state.reset();
        this.player.reset();
        this.livesManager.reset();
        this.scoreManager.reset();
        this.checkpointManager.reset();
        this.levelManager.loadLevel(1);
        this.checkpointManager.loadLevelCheckpoints(this.levelManager.levelData);
        
        // Hide modals
        this.gameOverModal?.classList.add('hidden');
        this.levelCompleteModal?.classList.add('hidden');
        
        // Restart
        this.resume();
        this.updateHUD();
    }
    
    nextLevel() {
        this.levelCompleteModal?.classList.add('hidden');
        
        const nextLevel = this.levelManager.nextLevel();
        if (nextLevel) {
            this.levelManager.loadLevel(nextLevel);
            this.checkpointManager.loadLevelCheckpoints(this.levelManager.levelData);
            this.player.reset();
            this.state.setLevel(nextLevel);
            this.resume();
            this.updateHUD();
        } else {
            // Game complete!
            this.handleGameComplete();
        }
    }
    
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Always update and render, regardless of pause state
        // This ensures the game loop keeps running even when paused
        if (!this.isPaused && this.state.status === 'playing') {
            this.update(deltaTime);
        } else if (this.isPaused && this.state.status !== 'paused') {
            // Safety check: if isPaused is true but status is not 'paused', something is wrong
            // console.log('[GAME] Safety check: isPaused is true but status is', this.state.status);
            this.isPaused = false;
            this.state.setStatus('playing');
            this.update(deltaTime);
        }
        
        this.render();
        
        // Send state update periodically
        this.sendStateUpdate();
        
        // Always continue the loop if game is running
        if (this.isRunning) {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }
    
    update(deltaTime) {
        // Debug: log key states periodically
        if (!this._keyDebugCounter) this._keyDebugCounter = 0;
        this._keyDebugCounter++;
        if (this._keyDebugCounter >= 120) { // Log every 2 seconds
            this._keyDebugCounter = 0;
            const keys = this.inputHandler.getKeyStates();
            // console.log('[GAME] Key states:', keys, '| isPaused:', this.isPaused, '| status:', this.state.status);
        }
        
        // Handle input in game loop for continuous movement
        this.player.setMovingLeft(this.inputHandler.isLeftPressed());
        this.player.setMovingRight(this.inputHandler.isRightPressed());
        
        // Update player
        this.player.update(deltaTime, this.levelManager.getCurrentPlatforms());
        
        // Update enemies
        this.levelManager.getCurrentEnemies().forEach(enemy => {
            enemy.update(deltaTime);
        });
        
        // Update coins
        this.levelManager.getCurrentCoins().forEach(coin => {
            coin.update(deltaTime);
        });
        
        // Update checkpoints
        this.checkpointManager.update(deltaTime);
        
        // Check collisions (only when not showing quiz)
        if (!this.state.quiz.active) {
            this.checkCollisions();
        }

        // HIGH-4: Block player from passing unpassed checkpoints more robustly
        const blockingCheckpoint = this.checkpointManager.getBlockingCheckpoint(
            this.player.x,
            this.player.velocityX,
            this.player.width
        );
        if (blockingCheckpoint) {
            // Get checkpoint collision zone
            const checkpointX = blockingCheckpoint.x;
            const playerCenterX = this.player.x + this.player.width / 2;
            
            // If player center is to the left of checkpoint and moving right, block
            if (playerCenterX < checkpointX && this.player.velocityX > 0) {
                // Push player back to just before checkpoint
                this.player.x = checkpointX - this.player.width - 5;
                this.player.velocityX = 0;
            }
            
            // If player is already past checkpoint (could happen with high speed), block
            if (playerCenterX >= checkpointX && playerCenterX < checkpointX + 40) {
                // Push back to before checkpoint
                this.player.x = checkpointX - this.player.width - 5;
                this.player.velocityX = Math.min(0, this.player.velocityX);
            }
            
            // Also handle jumping over - push down if jumping over the checkpoint area
            if (this.player.y < blockingCheckpoint.y - 10 && this.player.velocityY < 0) {
                this.player.velocityY = 2; // Push down
                this.player.y = blockingCheckpoint.y - this.player.height + 5;
            }
        }
        
        // Update camera
        this.renderer.updateCamera(this.player.x, this.canvas.width);
        
        // Check level completion - ONLY if all checkpoints are passed
        if (this.levelManager.isLevelComplete(this.player.x)) {
            if (this.levelManager.areAllCheckpointsPassed()) {
                this.handleLevelComplete();
            } else {
                // Block player from passing goal until all checkpoints are done
                // Push player back before goal
                const lastCheckpointX = Math.max(...this.levelManager.checkpointPositions);
                if (this.player.x > lastCheckpointX + 50) {
                    this.player.x = lastCheckpointX + 50;
                    this.player.velocityX = -2; // Push back
                }
            }
        }
        
        // Check fall death
        if (this.player.y > this.canvas.height + 100) {
            this.handlePlayerDeath();
        }
        
        // Update elapsed time
        this.state.elapsedTime += deltaTime;
    }
    
    checkCollisions() {
        const platforms = this.levelManager.getCurrentPlatforms();
        const enemies = this.levelManager.getCurrentEnemies();
        const coins = this.levelManager.getCurrentCoins();
        const checkpoints = this.checkpointManager;
        
        // Platform collisions (handled in player.update)
        
        // Coin collisions
        coins.forEach((coin, index) => {
            if (coin.collidesWith(this.player)) {
                coin.collect();
                this.scoreManager.addCoinBonus();
                this.state.addCoin();
                this.updateHUD(); // Update HUD immediately after coin
                
                // Remove collected coins
                this.levelManager.coins = this.levelManager.coins.filter((c, i) => i !== index);
            }
        });
        
        // Enemy collisions
        for (let i = this.levelManager.enemies.length - 1; i >= 0; i--) {
            const enemy = this.levelManager.enemies[i];
            if (enemy.collidesWith(this.player)) {
                if (this.player.isAbove(enemy)) {
                    // Defeat enemy (jump on top)
                    enemy.defeat();
                    this.scoreManager.addEnemyBonus();
                    this.state.addEnemyDefeated();
                    this.updateHUD();
                    this.levelManager.enemies.splice(i, 1);
                    this.player.velocityY = -8; // Bounce
                } else {
                    // Player hit by enemy - only subtract score, no life lost
                    // Create brief invincibility
                    if (!this.player.isInvincible) {
                        this.scoreManager.subtractEnemyPenalty();
                        this.updateHUD();
                        this.player.setInvincible(1500); // 1.5 seconds invincibility
                        
                        // Bounce player back slightly
                        this.player.velocityX = -3;
                        this.player.velocityY = -5;
                    }
                }
            }
        }
        
        // Checkpoint collisions - MUST reach checkpoint
        const hitCheckpoint = checkpoints.checkCollisions(this.player, this);
        if (hitCheckpoint) {
            // Pause and wait for question
            this.pause();
        }
    }
    
    handlePlayerHit() {
        const livesRemaining = this.livesManager.loseLife();
        
        if (livesRemaining <= 0) {
            this.handleGameOver();
        } else {
            // Respawn at checkpoint
            const respawnPos = this.checkpointManager.getRespawnPosition();
            this.player.respawn(respawnPos.x, respawnPos.y);
        }
    }
    
    handlePlayerDeath() {
        this.handlePlayerHit();
    }
    
    handleLevelComplete() {
        this.scoreManager.addLevelCompleteBonus();
        this.state.setStatus('level_complete');
        
        // Show level complete modal
        const modal = document.getElementById('level-complete-modal');
        const scoreEl = document.getElementById('level-complete-score');
        if (scoreEl) scoreEl.textContent = `Điểm: ${this.scoreManager.getScore()}`;
        if (modal) modal.classList.remove('hidden');
        
        this.pause();
    }
    
    handleGameOver() {
        this.state.setStatus('game_over');
        this.livesManager.reset();
        
        // Show game over modal
        const modal = document.getElementById('game-over-modal');
        const scoreEl = document.getElementById('game-over-score');
        const checkpointsEl = document.getElementById('game-over-checkpoints');
        if (scoreEl) scoreEl.textContent = `Điểm: ${this.scoreManager.getScore()}`;
        if (checkpointsEl) checkpointsEl.textContent = `Checkpoint đã vượt qua: ${this.checkpointManager.getPassedCount()}`;
        if (modal) modal.classList.remove('hidden');
        
        // Send game complete to host
        bridge.complete({
            outcome: 'game_over',
            reason: 'max_wrong_attempts',
            score: this.scoreManager.getScore(),
            level: this.state.currentLevel,
            lives: 0,
            summary: {
                checkpointsPassed: this.checkpointManager.getPassedCount(),
                questionsAnswered: this.scoreManager.correctAnswers + this.scoreManager.wrongAnswers,
                questionsCorrect: this.scoreManager.correctAnswers,
                wrongAnswers: this.scoreManager.wrongAnswers
            }
        });
        
        this.pause();
    }
    
    handleGameComplete() {
        this.scoreManager.addGameCompleteBonus();
        
        // Check for perfect clear
        if (this.livesManager.getCurrentLives() === this.livesManager.getMaxLives() &&
            this.scoreManager.wrongAnswers === 0) {
            this.scoreManager.addPerfectClearBonus();
        }
        
        bridge.complete({
            outcome: 'completed',
            reason: 'game_complete',
            score: this.scoreManager.getScore(),
            level: this.state.totalLevels,
            lives: this.livesManager.getCurrentLives(),
            summary: {
                checkpointsPassed: this.checkpointManager.getPassedCount(),
                questionsAnswered: this.scoreManager.correctAnswers + this.scoreManager.wrongAnswers,
                questionsCorrect: this.scoreManager.correctAnswers,
                wrongAnswers: this.scoreManager.wrongAnswers,
                coinsCollected: this.scoreManager.coinsCollected,
                enemiesDefeated: this.scoreManager.enemiesDefeated
            }
        });
    }
    
    triggerCheckpointQuestion(checkpoint) {
        // Trigger question via bridge
        bridge.triggerQuestion({
            checkpointId: checkpoint.id,
            level: this.state.currentLevel,
            playerX: this.player.x,
            playerY: this.player.y
        });
        
        this.state.quiz.active = true;
        this.state.quiz.currentCheckpointId = checkpoint.id;
    }
    
    /**
     * Handle quiz continue event (for standalone mode)
     */
    onQuizContinue(detail) {
        // console.log('[GAME] onQuizContinue called');
        
        // In standalone mode, simulate a correct answer result
        const simulatedResult = {
            is_correct: true,
            correct: true,
            isCorrect: true
        };
        
        this.handleQuestionResult(simulatedResult);
        this.resume();
    }
    
    handleQuestionResult(result) {
        console.log('[GAME] handleQuestionResult called:', result);
        
        // Mark quiz as not active
        this.state.quiz.active = false;
        
        // Determine if answer is correct
        const isCorrect = result.is_correct || result.isCorrect || result.correct;
        
        if (isCorrect) {
            // Correct answer - mark checkpoint as passed
            if (this.state.quiz.currentCheckpointId) {
                console.log('[GAME] Marking checkpoint as passed:', this.state.quiz.currentCheckpointId);
                this.checkpointManager.markPassed(this.state.quiz.currentCheckpointId);
            }
            this.scoreManager.addCheckpointBonus();
            this.scoreManager.addCorrectAnswerBonus();
            
            // Clear checkpoint from state
            this.state.quiz.currentCheckpointId = null;
            this.state.quiz.currentAttemptId = null;
            
            // Update HUD
            this.updateHUD();
            
        } else {
            // CRITICAL-3: Wrong answer - DON'T increment wrongAnswers locally
            // Trust the backend's wrong_attempts count which is the source of truth
            // The sync in host:resume handler already updated scoreManager.wrongAnswers
            
            // Get lives from backend (already synced) or use current
            const livesRemaining = this.livesManager.getCurrentLives();
            
            // Reset checkpoint state so player can try again at same checkpoint
            this.state.quiz.currentCheckpointId = null;
            this.state.quiz.currentAttemptId = null;
            
            // Check if game over (backend's wrong_attempts >= 3)
            const wrongAttempts = typeof result.wrong_attempts === 'number' 
                ? result.wrong_attempts 
                : this.scoreManager.wrongAnswers;
            
            if (wrongAttempts >= 3 || livesRemaining <= 0) {
                this.handleGameOver();
            } else {
                // Respawn at checkpoint
                const respawnPos = this.checkpointManager.getRespawnPosition();
                this.player.respawn(respawnPos.x, respawnPos.y);
                this.updateHUD();
                
                // DO NOT call resume() here - it's already called in host:resume handler
            }
        }
    }
    
    render() {
        const ctx = this.renderer.ctx;
        
        // Clear
        this.renderer.clear();
        
        // Background
        this.renderer.renderBackground();
        
        // Platforms
        this.levelManager.getCurrentPlatforms().forEach(platform => {
            this.renderPlatform(ctx, platform);
        });
        
        // Coins
        this.levelManager.getCurrentCoins().forEach(coin => {
            coin.render(ctx, this.renderer.cameraX);
        });
        
        // Enemies
        this.levelManager.getCurrentEnemies().forEach(enemy => {
            enemy.render(ctx, this.renderer.cameraX);
        });
        
        // Checkpoints
        this.checkpointManager.getCheckpoints().forEach(checkpoint => {
            checkpoint.render(ctx, this.renderer.cameraX);
        });
        
        // Goal flag
        if (this.levelManager.levelData) {
            this.renderer.renderGoal(this.levelManager.levelData.goalX);
        }
        
        // Player
        this.player.render(ctx, this.renderer.cameraX);
        
        // Game over overlay
        if (this.state.status === 'game_over') {
            this.renderer.renderGameOver(this.scoreManager.getScore(), this.checkpointManager.getPassedCount());
        }
        
        // Level complete overlay
        if (this.state.status === 'level_complete') {
            this.renderer.renderLevelComplete(this.state.currentLevel, this.scoreManager.getScore());
        }
    }
    
    renderPlatform(ctx, platform) {
        const screenX = platform.x - this.renderer.cameraX;
        const screenY = platform.y;
        
        // Skip if off screen
        if (screenX + platform.width < 0 || screenX > this.renderer.width) return;
        
        // Ground
        if (platform.y >= this.renderer.height - 60) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX, screenY, platform.width, platform.height);
            ctx.fillStyle = '#228B22';
            ctx.fillRect(screenX, screenY, platform.width, 8);
        } else {
            // Floating platform
            ctx.fillStyle = '#DEB887';
            ctx.fillRect(screenX, screenY, platform.width, platform.height);
            ctx.fillStyle = '#F5DEB3';
            ctx.fillRect(screenX, screenY, platform.width, 4);
        }
    }
    
    sendStateUpdate() {
        // Always send a heartbeat to prevent React watchdog timeout
        // When paused, send 'paused' status but include heartbeat
        bridge.updateState({
            status: this.state.status,
            score: this.scoreManager.getScore(),
            lives: this.livesManager.getCurrentLives(),
            level: this.state.currentLevel,
            checkpointId: this.checkpointManager.getCurrentCheckpointId(),
            checkpointsPassed: this.checkpointManager.getPassedCount(),
            x: this.player.x,
            y: this.player.y,
            elapsedTime: this.state.elapsedTime,
            // Heartbeat to keep React watchdog happy
            heartbeat: Date.now(),
            isAlive: true
        });
    }
    
    updateHUD() {
        if (this.hudScore) this.hudScore.textContent = `Điểm: ${this.scoreManager.getScore()}`;
        if (this.hudLevel) this.hudLevel.textContent = `Level ${this.state.currentLevel}`;
        if (this.hudLives) this.hudLives.textContent = this.livesManager.getDisplayString();
        if (this.hudCheckpoint) {
            const cp = this.checkpointManager.getCurrentCheckpointId();
            this.hudCheckpoint.textContent = `Checkpoint: ${cp || '-'}`;
        }
    }
    
    resizeCanvas() {
        const container = document.getElementById('game-container');
        
        if (container) {
            const rect = container.getBoundingClientRect();
            // console.log('[GAME] Container size:', rect.width, 'x', rect.height);
            
            if (rect.width > 0 && rect.height > 0) {
                // Set actual canvas size to match container
                this.canvas.width = Math.floor(rect.width);
                this.canvas.height = Math.floor(rect.height);
                // console.log('[GAME] Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
            } else {
                // Fallback to default size
                this.canvas.width = 1280;
                this.canvas.height = 720;
            }
        } else {
            // Fallback
            this.canvas.width = 1280;
            this.canvas.height = 720;
        }
    }
}
