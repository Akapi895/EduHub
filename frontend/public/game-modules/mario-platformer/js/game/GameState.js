/**
 * GameState - Central state management for Mario game
 */
class GameState {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.status = 'loading'; // loading, ready, playing, paused, quiz, game_over, level_complete
        this.currentLevel = 1;
        this.totalLevels = 3;
        this.elapsedTime = 0;
        this.questionTimeMs = 0;
        
        // Player position
        this.playerX = 100;
        this.playerY = 100;
        
        // Game stats
        this.score = 0;
        this.coinsCollected = 0;
        this.enemiesDefeated = 0;
        
        // Checkpoint state
        this.checkpoints = {
            passed: [],
            current: null
        };
        
        // Lives state
        this.lives = {
            current: 3,
            max: 3,
            wrongAnswers: 0
        };
        
        // Question state
        this.quiz = {
            active: false,
            currentQuestion: null,
            currentAttemptId: null,
            currentCheckpointId: null,
            wrongAnswers: 0,
            failedQuestions: []
        };
    }
    
    setStatus(status) {
        this.status = status;
    }
    
    setLevel(level) {
        this.currentLevel = Math.min(level, this.totalLevels);
    }
    
    addScore(points) {
        this.score += points;
    }
    
    addCoin() {
        this.coinsCollected++;
        this.addScore(10);
    }
    
    addEnemyDefeated() {
        this.enemiesDefeated++;
        this.addScore(25);
    }
    
    // Checkpoint methods
    passCheckpoint(checkpointId) {
        if (!this.checkpoints.passed.includes(checkpointId)) {
            this.checkpoints.passed.push(checkpointId);
        }
        this.checkpoints.current = checkpointId;
    }
    
    getCheckpointPosition(checkpointId) {
        return this.checkpoints.current === checkpointId;
    }
    
    // Lives methods
    loseLife() {
        this.lives.current = Math.max(0, this.lives.current - 1);
        this.lives.wrongAnswers++;
        return this.lives.current;
    }
    
    resetLives() {
        this.lives.current = this.lives.max;
        this.lives.wrongAnswers = 0;
    }
    
    isGameOver() {
        return this.lives.current <= 0;
    }
    
    // Serialization for state updates
    toJSON() {
        return {
            status: this.status,
            currentLevel: this.currentLevel,
            score: this.score,
            lives: this.lives.current,
            maxLives: this.lives.max,
            checkpointId: this.checkpoints.current,
            checkpointsPassed: this.checkpoints.passed,
            playerX: this.playerX,
            playerY: this.playerY,
            elapsedTime: this.elapsedTime,
            questionTimeMs: this.questionTimeMs,
            coinsCollected: this.coinsCollected,
            enemiesDefeated: this.enemiesDefeated
        };
    }
}
