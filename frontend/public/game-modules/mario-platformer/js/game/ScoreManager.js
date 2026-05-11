/**
 * ScoreManager - Manages game scoring
 */
class ScoreManager {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.score = 0;
        this.checkpointBonus = 100;
        this.correctAnswerBonus = 50;
        this.coinBonus = 10;
        this.enemyBonus = 25;
        this.levelCompleteBonus = 200;
        this.gameCompleteBonus = 500;
        this.perfectClearBonus = 300;
        
        // Stats
        this.coinsCollected = 0;
        this.enemiesDefeated = 0;
        this.checkpointsPassed = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
    }
    
    addCheckpointBonus() {
        this.score += this.checkpointBonus;
        this.checkpointsPassed++;
    }
    
    addCorrectAnswerBonus() {
        this.score += this.correctAnswerBonus;
        this.correctAnswers++;
    }
    
    addCoinBonus() {
        this.score += this.coinBonus;
        this.coinsCollected++;
    }
    
    addEnemyBonus() {
        this.score += this.enemyBonus;
        this.enemiesDefeated++;
    }
    
    subtractEnemyPenalty() {
        this.score = Math.max(0, this.score - 25);
    }
    
    addLevelCompleteBonus() {
        this.score += this.levelCompleteBonus;
    }
    
    addGameCompleteBonus() {
        this.score += this.gameCompleteBonus;
    }
    
    addPerfectClearBonus() {
        this.score += this.perfectClearBonus;
    }
    
    getScore() {
        return this.score;
    }
    
    getStats() {
        return {
            score: this.score,
            coinsCollected: this.coinsCollected,
            enemiesDefeated: this.enemiesDefeated,
            checkpointsPassed: this.checkpointsPassed,
            correctAnswers: this.correctAnswers,
            wrongAnswers: this.wrongAnswers,
            totalQuestions: this.correctAnswers + this.wrongAnswers,
            accuracy: this.totalQuestions > 0 ? 
                Math.round((this.correctAnswers / this.totalQuestions) * 100) : 0
        };
    }
    
    getScoreBreakdown() {
        return {
            checkpoint_bonus: this.checkpointBonus * this.checkpointsPassed,
            correct_answer_bonus: this.correctAnswerBonus * this.correctAnswers,
            coin_bonus: this.coinBonus * this.coinsCollected,
            enemy_bonus: this.enemyBonus * this.enemiesDefeated,
            level_complete_bonus: this.levelCompleteBonus,
            game_complete_bonus: this.gameCompleteBonus,
            perfect_clear_bonus: this.perfectClearBonus
        };
    }
}
