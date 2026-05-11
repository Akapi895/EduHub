/**
 * LevelManager - Manages game levels and level data
 */
class LevelManager {
    constructor() {
        this.currentLevel = 1;
        this.totalLevels = 3;
        this.levelData = null;
        this.platforms = [];
        this.enemies = [];
        this.coins = [];
        this.checkpoints = [];
        this.checkpointPositions = [];
    }
    
    loadLevel(levelNumber) {
        this.currentLevel = Math.min(levelNumber, this.totalLevels);
        this.loadLevelData();
        return this.currentLevel;
    }
    
    loadLevelData() {
        // Level data with platforms, enemies, coins, and checkpoints
        // Checkpoints are placed ON the ground (not floating)
        // Ground level is at y=540, with height 60, so ground surface is at y=540
        const levelConfigs = {
            1: {
                level: 1,
                platforms: [
                    // Main ground sections
                    { x: 0, y: 540, width: 700, height: 60, isGround: true },
                    { x: 700, y: 540, width: 600, height: 60, isGround: true },
                    { x: 1300, y: 540, width: 700, height: 60, isGround: true },
                    // Floating platforms
                    { x: 200, y: 460, width: 150, height: 20 },
                    { x: 500, y: 380, width: 150, height: 20 },
                    { x: 800, y: 300, width: 150, height: 20 },
                    { x: 1050, y: 400, width: 200, height: 20 },
                    { x: 1400, y: 350, width: 150, height: 20 },
                    { x: 1700, y: 280, width: 150, height: 20 },
                ],
                enemies: [
                    { x: 300, y: 510, type: 'goomba' },
                    { x: 800, y: 510, type: 'goomba' },
                    { x: 1500, y: 510, type: 'goomba' },
                ],
                coins: [
                    { x: 230, y: 420 },
                    { x: 270, y: 420 },
                    { x: 530, y: 340 },
                    { x: 570, y: 340 },
                    { x: 830, y: 260 },
                    { x: 870, y: 260 },
                ],
                // Checkpoints ON ground - x is position, y is top of flag
                // Flag height is 64px, so y=476 means flag sits on ground (540-64=476)
                checkpoints: [
                    { id: 'l1cp1', x: 600, y: 476, level: 1 },
                    { id: 'l1cp2', x: 1200, y: 476, level: 1 },
                ],
                goalX: 1950,
            },
            2: {
                level: 2,
                platforms: [
                    { x: 0, y: 540, width: 600, height: 60, isGround: true },
                    { x: 600, y: 540, width: 700, height: 60, isGround: true },
                    { x: 1300, y: 540, width: 700, height: 60, isGround: true },
                    { x: 200, y: 440, width: 120, height: 20 },
                    { x: 450, y: 360, width: 120, height: 20 },
                    { x: 700, y: 280, width: 150, height: 20 },
                    { x: 1000, y: 350, width: 120, height: 20 },
                    { x: 1300, y: 270, width: 150, height: 20 },
                    { x: 1600, y: 350, width: 150, height: 20 },
                ],
                enemies: [
                    { x: 300, y: 510, type: 'goomba' },
                    { x: 900, y: 510, type: 'goomba' },
                    { x: 1500, y: 510, type: 'koopa' },
                ],
                coins: [
                    { x: 230, y: 400 },
                    { x: 480, y: 320 },
                    { x: 730, y: 240 },
                    { x: 1030, y: 310 },
                    { x: 1330, y: 230 },
                    { x: 1630, y: 310 },
                ],
                checkpoints: [
                    { id: 'l2cp1', x: 550, y: 476, level: 2 },
                    { id: 'l2cp2', x: 1200, y: 476, level: 2 },
                ],
                goalX: 1950,
            },
            3: {
                level: 3,
                platforms: [
                    { x: 0, y: 540, width: 600, height: 60, isGround: true },
                    { x: 600, y: 540, width: 400, height: 60, isGround: true },
                    { x: 1000, y: 540, width: 400, height: 60, isGround: true },
                    { x: 1400, y: 540, width: 600, height: 60, isGround: true },
                    // Stepping stones leading up to platform
                    { x: 600, y: 480, width: 100, height: 20 },
                    { x: 800, y: 420, width: 100, height: 20 },
                    { x: 1000, y: 360, width: 100, height: 20 },
                    { x: 1200, y: 300, width: 100, height: 20 },
                    { x: 1400, y: 360, width: 100, height: 20 },
                    { x: 1600, y: 420, width: 100, height: 20 },
                    { x: 300, y: 450, width: 80, height: 20 },
                    { x: 500, y: 380, width: 80, height: 20 },
                ],
                enemies: [
                    { x: 350, y: 510, type: 'goomba' },
                    { x: 700, y: 390, type: 'koopa' },
                    { x: 1100, y: 270, type: 'goomba' },
                    { x: 1550, y: 330, type: 'koopa' },
                ],
                coins: [
                    { x: 620, y: 440 },
                    { x: 820, y: 380 },
                    { x: 1020, y: 320 },
                    { x: 1220, y: 260 },
                    { x: 1420, y: 320 },
                    { x: 1620, y: 380 },
                ],
                // Level 3 checkpoint is on the upper platform area
                checkpoints: [
                    { id: 'l3cp1', x: 1100, y: 296, level: 3 }, // On platform at y=300
                    { id: 'l3cp2', x: 1700, y: 476, level: 3 }, // On ground
                ],
                goalX: 1950,
            }
        };
        
        this.levelData = levelConfigs[this.currentLevel] || levelConfigs[1];
        this.platforms = [...this.levelData.platforms];
        this.enemies = this.levelData.enemies.map(e => new Enemy(e.x, e.y, e.type));
        this.coins = this.levelData.coins.map(c => new Coin(c.x, c.y));
        this.checkpoints = this.levelData.checkpoints.map(cp => new Checkpoint(cp.id, cp.x, cp.y, cp.level));
        
        // Store checkpoint positions for blocking logic
        this.checkpointPositions = this.levelData.checkpoints.map(cp => cp.x);
    }
    
    getCurrentPlatforms() {
        return this.platforms;
    }
    
    getCurrentEnemies() {
        return this.enemies;
    }
    
    getCurrentCoins() {
        return this.coins;
    }
    
    getCurrentCheckpoints() {
        return this.checkpoints;
    }
    
    removeEnemy(index) {
        if (index >= 0 && index < this.enemies.length) {
            this.enemies.splice(index, 1);
        }
    }
    
    removeCoin(index) {
        if (index >= 0 && index < this.coins.length) {
            this.coins.splice(index, 1);
        }
    }
    
    isLevelComplete(playerX) {
        // Player must reach goal X position
        return playerX >= this.levelData.goalX;
    }
    
    /**
     * Check if all checkpoints in this level have been passed
     * Player MUST pass all checkpoints before completing level
     */
    areAllCheckpointsPassed() {
        if (!this.levelData || !this.levelData.checkpoints) {
            return true; // No checkpoints required
        }
        
        for (const cp of this.levelData.checkpoints) {
            const checkpoint = this.checkpoints.find(c => c.id === cp.id);
            if (!checkpoint || !checkpoint.passed) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Get checkpoint positions for blocking level completion
     */
    getCheckpointPositions() {
        if (!this.levelData || !this.levelData.checkpoints) {
            return [];
        }
        return this.levelData.checkpoints.map(cp => cp.x);
    }
    
    nextLevel() {
        if (this.currentLevel < this.totalLevels) {
            return this.loadLevel(this.currentLevel + 1);
        }
        return null; // No more levels
    }
    
    reset() {
        this.enemies = this.levelData.enemies.map(e => new Enemy(e.x, e.y, e.type));
        this.coins = this.levelData.coins.map(c => new Coin(c.x, c.y));
        for (const cp of this.checkpoints) {
            cp.passed = false;
            cp.triggered = false;
        }
    }
}


/**
 * Enemy - Base enemy class
 */
class Enemy {
    constructor(x, y, type = 'goomba') {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.type = type;
        this.velocityX = -1;
        this.active = true;
        
        // Set dimensions based on type
        if (type === 'koopa') {
            this.width = 28;
            this.height = 40;
        }
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.x += this.velocityX;
        
        // Simple boundary check - reverse direction at edges
        if (this.x < 50 || this.x > 1200) {
            this.velocityX *= -1;
        }
    }
    
    collidesWith(player) {
        if (!this.active) return false;
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }
    
    defeat() {
        this.active = false;
    }
    
    render(ctx, cameraX) {
        if (!this.active) return;
        
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        if (this.type === 'goomba') {
            // Goomba - brown mushroom creature
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(screenX + 4, screenY, 24, 32);
            ctx.fillStyle = '#d2691e';
            ctx.fillRect(screenX + 8, screenY + 8, 16, 16);
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(screenX + 8, screenY + 10, 6, 6);
            ctx.fillRect(screenX + 18, screenY + 10, 6, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(screenX + 10, screenY + 12, 3, 3);
            ctx.fillRect(screenX + 20, screenY + 12, 3, 3);
            // Feet
            ctx.fillStyle = '#654321';
            ctx.fillRect(screenX + 2, screenY + 26, 10, 6);
            ctx.fillRect(screenX + 20, screenY + 26, 10, 6);
        } else {
            // Koopa - green turtle
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(screenX + 4, screenY + 10, 20, 30);
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(screenX + 14, screenY + 12, 12, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(screenX + 8, screenY + 6, 5, 6);
            ctx.fillRect(screenX + 16, screenY + 6, 5, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(screenX + 10, screenY + 8, 2, 3);
            ctx.fillRect(screenX + 18, screenY + 8, 2, 3);
        }
    }
}


/**
 * Coin - Collectible coin
 */
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.collected = false;
        this.animationFrame = 0;
    }
    
    collidesWith(player) {
        if (this.collected) return false;
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }
    
    collect() {
        this.collected = true;
    }
    
    update(deltaTime) {
        this.animationFrame = (this.animationFrame + 1) % 20;
    }
    
    render(ctx, cameraX) {
        if (this.collected) return;
        
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Coin with shine effect
        const scale = 1 + Math.sin(this.animationFrame * 0.3) * 0.1;
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(screenX + 12, screenY + 12, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner shine
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(screenX + 12, screenY + 12, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Dollar sign or star
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('★', screenX + 12, screenY + 16);
    }
}
