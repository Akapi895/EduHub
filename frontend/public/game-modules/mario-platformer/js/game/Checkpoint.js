/**
 * Checkpoint - Interactive checkpoint entity in Mario game
 */
class Checkpoint {
    constructor(id, x, y, level) {
        this.id = id;
        this.x = x;
        this.y = y; // Top of the flag pole (on ground surface)
        this.level = level;
        this.width = 40;
        this.height = 64; // Full flag height
        this.passed = false;
        this.triggered = false;
        this.activationTimer = 0;
        
        // Visual state
        this.flagHeight = 64;
        this.isAnimating = false;
    }
    
    /**
     * Get the collision area - a wider zone to catch player
     */
    getCollisionZone() {
        return {
            x: this.x - 30,
            y: this.y,
            width: this.width + 60,
            height: this.height + 10
        };
    }
    
    checkCollision(player) {
        const zone = this.getCollisionZone();
        return (
            player.x < zone.x + zone.width &&
            player.x + player.width > zone.x &&
            player.y < zone.y + zone.height &&
            player.y + player.height > zone.y
        );
    }
    
    onPlayerCollision(player, game) {
        if (this.passed) return;
        
        // Mark as triggered
        this.triggered = true;
        this.isAnimating = true;
        
        // Trigger question through bridge
        game.triggerCheckpointQuestion(this);
    }
    
    onQuestionResult(result) {
        if (result.isCorrect) {
            this.passed = true;
            this.isAnimating = false;
            return true;
        } else {
            this.isAnimating = false;
            return false;
        }
    }
    
    update(deltaTime) {
        if (this.isAnimating) {
            this.activationTimer += deltaTime;
            if (this.activationTimer > 500) {
                this.isAnimating = false;
            }
        }
    }
    
    render(ctx, cameraX) {
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Only render if on screen
        if (screenX < -100 || screenX > ctx.canvas.width + 100) return;
        
        // Pole (from top to ground)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(screenX + 17, screenY, 6, this.flagHeight);
        
        // Flag
        if (this.passed) {
            ctx.fillStyle = '#27ae60'; // Green when passed
        } else if (this.triggered) {
            ctx.fillStyle = '#f39c12'; // Orange when triggered
        } else {
            ctx.fillStyle = '#e74c3c'; // Red when inactive
        }
        
        // Flag wave animation
        const flagOffset = this.isAnimating ? Math.sin(this.activationTimer / 50) * 5 : 0;
        ctx.beginPath();
        ctx.moveTo(screenX + 23, screenY + 5);
        ctx.lineTo(screenX + 55 + flagOffset, screenY + 15);
        ctx.lineTo(screenX + 55 + flagOffset, screenY + 35);
        ctx.lineTo(screenX + 23, screenY + 40);
        ctx.closePath();
        ctx.fill();
        
        // Flag ball top
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(screenX + 20, screenY + 5, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * CheckpointManager - Manages all checkpoints in the level
 */
class CheckpointManager {
    constructor(state) {
        this.state = state;
        this.checkpoints = new Map();
        this.passedCheckpoints = [];
        this.currentCheckpoint = null;
    }
    
    registerCheckpoint(checkpoint) {
        this.checkpoints.set(checkpoint.id, checkpoint);
    }
    
    loadLevelCheckpoints(levelData) {
        this.checkpoints.clear();
        this.passedCheckpoints = [];
        this.currentCheckpoint = null;
        
        if (levelData && levelData.checkpoints) {
            for (const cp of levelData.checkpoints) {
                this.checkpoints.set(cp.id, new Checkpoint(cp.id, cp.x, cp.y, cp.level));
            }
        }
    }
    
    getCheckpoints() {
        return Array.from(this.checkpoints.values());
    }
    
    markPassed(checkpointId) {
        const checkpoint = this.checkpoints.get(checkpointId);
        if (checkpoint) {
            checkpoint.passed = true;
            if (!this.passedCheckpoints.includes(checkpointId)) {
                this.passedCheckpoints.push(checkpointId);
            }
            this.currentCheckpoint = checkpointId;
            this.state.passCheckpoint(checkpointId);
        }
    }
    
    getRespawnPosition(checkpointId) {
        const cpId = checkpointId || this.currentCheckpoint;
        if (!cpId) {
            return { x: 100, y: 400 };
        }
        
        const checkpoint = this.checkpoints.get(cpId);
        if (!checkpoint) {
            return { x: 100, y: 400 };
        }
        
        return {
            x: checkpoint.x,
            y: checkpoint.y - 32
        };
    }
    
    getPassedCount() {
        return this.passedCheckpoints.length;
    }
    
    getCurrentCheckpointId() {
        return this.currentCheckpoint;
    }
    
    /**
     * Check if player is approaching a checkpoint and should be blocked
     * @param {number} playerX - Player X position
     * @param {number} playerVelocityX - Player X velocity
     * @param {number} playerWidth - Player width (optional, for better collision)
     * @returns {Checkpoint|null} - The checkpoint that should block player, or null
     */
    getBlockingCheckpoint(playerX, playerVelocityX, playerWidth = 32) {
        // Check if player is moving toward an unpassed checkpoint
        for (const checkpoint of this.checkpoints.values()) {
            if (checkpoint.passed) continue;

            // Define a "danger zone" around the checkpoint
            // HIGH-4: Use playerWidth for better detection
            const playerRight = playerX + playerWidth;
            const dangerZoneStart = checkpoint.x - 50;
            const dangerZoneEnd = checkpoint.x + checkpoint.width + 20;

            // HIGH-4: Check if player overlaps with checkpoint danger zone
            if (playerRight > dangerZoneStart && playerX < dangerZoneEnd) {
                // Also check if player is actually trying to move right (toward checkpoint)
                if (playerVelocityX > 0) {
                    return checkpoint;
                }
                // Even if not moving, if player is partially past checkpoint left edge, block
                if (playerRight > checkpoint.x && playerX < checkpoint.x + checkpoint.width) {
                    return checkpoint;
                }
            }
        }
        return null;
    }
    
    checkCollisions(player, game) {
        for (const checkpoint of this.checkpoints.values()) {
            if (!checkpoint.passed && checkpoint.checkCollision(player)) {
                checkpoint.onPlayerCollision(player, game);
                return checkpoint;
            }
        }
        return null;
    }
    
    update(deltaTime) {
        for (const checkpoint of this.checkpoints.values()) {
            checkpoint.update(deltaTime);
        }
    }
    
    reset() {
        this.passedCheckpoints = [];
        this.currentCheckpoint = null;
        for (const checkpoint of this.checkpoints.values()) {
            checkpoint.passed = false;
            checkpoint.triggered = false;
            checkpoint.isAnimating = false;
        }
    }
}
