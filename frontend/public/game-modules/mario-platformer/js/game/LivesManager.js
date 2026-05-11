/**
 * LivesManager - Manages player lives
 */
class LivesManager {
    constructor(maxLives = 3) {
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
    
    isGameOver() {
        return this.current <= 0;
    }
    
    reset() {
        this.current = this.maxLives;
        this.wrongAnswers = 0;
    }
    
    // Get display string for HUD
    getDisplayString() {
        return '♥'.repeat(this.current) + '♡'.repeat(this.maxLives - this.current);
    }
}
