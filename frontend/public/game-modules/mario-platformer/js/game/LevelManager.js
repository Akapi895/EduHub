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
        // =============================================================
        // LEVEL DESIGN v2
        // Nguyên tắc:
        //   - Checkpoint NẰM TRÊN floating Platform (player phải nhảy mới đến)
        //   - Có khe hổng thật giữa các ground section
        //   - Coins breadcrumb trên platform dẫn đưỜng cho player
        //   - Ground surface y=540, Flag height=64 → checkpoint.y = platform.y - 64
        // =============================================================
        const levelConfigs = {
            1: {
                level: 1,
                platforms: [
                    // Ground sections (có khe hổng thật giữa các section)
                    { x: 0,    y: 540, width: 600,  height: 60, isGround: true },
                    { x: 800,  y: 540, width: 600,  height: 60, isGround: true },
                    { x: 1600, y: 540, width: 600,  height: 60, isGround: true },
                    // Gap 1: x=600→800 (200px) — player phải nhảy qua
                    // Gap 2: x=1400→1600 (200px) — player phải nhảy qua
                    // Floating platforms (dẫn đưỜng + đừ checkpoint)
                    { x: 500,  y: 400, width: 150, height: 20 }, // PA: bridge gap 1
                    { x: 650,  y: 330, width: 150, height: 20 }, // PB: CHECKPOINT 1
                    { x: 1250, y: 380, width: 150, height: 20 }, // PC: bridge gap 2
                    { x: 1400, y: 310, width: 150, height: 20 }, // PD: CHECKPOINT 2
                    { x: 1600, y: 400, width: 120, height: 20 }, // PE: decoration
                    { x: 1800, y: 320, width: 120, height: 20 }, // PF: decoration
                ],
                enemies: [
                    { x: 200,  y: 508, type: 'goomba' },
                    { x: 1000, y: 508, type: 'goomba' },
                    { x: 1700, y: 508, type: 'koopa'  },
                ],
                coins: [
                    // Breadcrumb trên PA → PB dẫn đưỜng
                    { x: 515, y: 370 }, { x: 550, y: 370 }, { x: 590, y: 370 },
                    // Gần CP1 trên PB
                    { x: 665, y: 300 }, { x: 700, y: 300 },
                    // Breadcrumb trên PC
                    { x: 1265, y: 350 }, { x: 1300, y: 350 },
                    // Gần CP2 trên PD
                    { x: 1415, y: 280 }, { x: 1450, y: 280 },
                    // Trên PF
                    { x: 1815, y: 290 },
                ],
                // Checkpoints TRÊN PLATFORM (y = platform.y - 64)
                checkpoints: [
                    { id: 'l1cp1', x: 680,  y: 266, level: 1 }, // trên PB (y=330), 330-64=266
                    { id: 'l1cp2', x: 1430, y: 246, level: 1 }, // trên PD (y=310), 310-64=246
                ],
                goalX: 2100,
            },
            2: {
                level: 2,
                platforms: [
                    // Ground sections với 3 khe hổng
                    { x: 0,    y: 540, width: 500,  height: 60, isGround: true },
                    { x: 700,  y: 540, width: 400,  height: 60, isGround: true },
                    { x: 1300, y: 540, width: 500,  height: 60, isGround: true },
                    { x: 2000, y: 540, width: 500,  height: 60, isGround: true },
                    // Floating platforms (stepping stone pattern)
                    { x: 420,  y: 430, width: 120, height: 20 }, // PA: bridge gap 1
                    { x: 560,  y: 360, width: 130, height: 20 }, // PB: CHECKPOINT 1
                    { x: 900,  y: 310, width: 120, height: 20 }, // PC: high platform
                    { x: 1050, y: 380, width: 120, height: 20 }, // PD: bridge gap 2
                    { x: 1230, y: 320, width: 130, height: 20 }, // PE: CHECKPOINT 2
                    { x: 1700, y: 400, width: 120, height: 20 }, // PF: bridge gap 3
                    { x: 1850, y: 330, width: 120, height: 20 }, // PG: decoration
                ],
                enemies: [
                    { x: 200,  y: 508, type: 'goomba' },
                    { x: 950,  y: 508, type: 'goomba' },
                    { x: 1500, y: 508, type: 'koopa'  },
                    { x: 1100, y: 278, type: 'goomba' }, // trên PC
                ],
                coins: [
                    // Dẫn đưỜng qua gap 1
                    { x: 435, y: 400 }, { x: 470, y: 400 },
                    { x: 575, y: 330 }, { x: 610, y: 330 }, // gần CP1
                    // Dẫn đưỜng qua gap 2
                    { x: 915, y: 280 }, { x: 950, y: 280 },
                    { x: 1065, y: 350 }, { x: 1100, y: 350 },
                    { x: 1245, y: 290 }, { x: 1280, y: 290 }, // gần CP2
                    // Gap 3
                    { x: 1715, y: 370 }, { x: 1865, y: 300 },
                ],
                checkpoints: [
                    { id: 'l2cp1', x: 585,  y: 296, level: 2 }, // trên PB (y=360), 360-64=296
                    { id: 'l2cp2', x: 1255, y: 256, level: 2 }, // trên PE (y=320), 320-64=256
                ],
                goalX: 2400,
            },
            3: {
                level: 3,
                platforms: [
                    // Ground sections với 4 khe hổng — độ khó tăng dần
                    { x: 0,    y: 540, width: 400,  height: 60, isGround: true },
                    { x: 650,  y: 540, width: 300,  height: 60, isGround: true },
                    { x: 1200, y: 540, width: 250,  height: 60, isGround: true },
                    { x: 1700, y: 540, width: 300,  height: 60, isGround: true },
                    { x: 2200, y: 540, width: 500,  height: 60, isGround: true },
                    // Floating platforms (multi-level — có tầng cao và tầng thấp)
                    { x: 300,  y: 450, width: 100, height: 20 }, // PA: bridge gap 1
                    { x: 500,  y: 380, width: 100, height: 20 }, // PB
                    { x: 610,  y: 310, width: 130, height: 20 }, // PC: CHECKPOINT 1 (tầng cao)
                    { x: 790,  y: 390, width: 100, height: 20 }, // PD: xuống
                    { x: 1000, y: 320, width: 120, height: 20 }, // PE: bridge gap 2
                    { x: 1110, y: 260, width: 130, height: 20 }, // PF: CHECKPOINT 2 (rất cao)
                    { x: 1290, y: 340, width: 100, height: 20 }, // PG: bridge gap 3
                    { x: 1460, y: 420, width: 100, height: 20 }, // PH: xuống
                    { x: 1610, y: 350, width: 100, height: 20 }, // PI
                    { x: 1760, y: 280, width: 130, height: 20 }, // PJ: CHECKPOINT 3 (đỉnh)
                    { x: 1960, y: 360, width: 100, height: 20 }, // PK: bridge gap 4
                ],
                enemies: [
                    { x: 150,  y: 508, type: 'goomba' },
                    { x: 840,  y: 508, type: 'koopa'  },
                    { x: 1350, y: 508, type: 'goomba' },
                    { x: 1760, y: 508, type: 'koopa'  },
                    { x: 1140, y: 228, type: 'goomba' }, // trên PF
                ],
                coins: [
                    // Gap 1 — dẫn lên tầng cao
                    { x: 315, y: 420 }, { x: 515, y: 350 },
                    { x: 625, y: 280 }, { x: 660, y: 280 }, // gần CP1
                    // Gap 2
                    { x: 805, y: 360 }, { x: 1015, y: 290 },
                    { x: 1125, y: 230 }, { x: 1160, y: 230 }, // gần CP2
                    // Gap 3
                    { x: 1305, y: 310 }, { x: 1475, y: 390 },
                    { x: 1625, y: 320 }, { x: 1775, y: 250 }, // gần CP3
                    { x: 1975, y: 330 },
                ],
                checkpoints: [
                    { id: 'l3cp1', x: 635,  y: 246, level: 3 }, // trên PC (y=310), 310-64=246
                    { id: 'l3cp2', x: 1135, y: 196, level: 3 }, // trên PF (y=260), 260-64=196
                    { id: 'l3cp3', x: 1785, y: 216, level: 3 }, // trên PJ (y=280), 280-64=216
                ],
                goalX: 2600,
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
        this.startX = x; // lưu vị trí khởi tạo cho patrol range
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
        
        // Patrol range dựa trên startX (thay vì hardcode 1200)
        const patrolRange = 150;
        if (this.x < this.startX - patrolRange || this.x > this.startX + patrolRange) {
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
