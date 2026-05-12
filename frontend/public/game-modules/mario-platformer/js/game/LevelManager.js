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
        // Fallback: generate dynamic level với 3 checkpoints mặc định
        this.generateDynamicLevel(3);
    }
    
    /**
     * Tạo level động dựa trên số lượng checkpoint = số câu hỏi giáo viên assign.
     * Map tự động kéo dài để chứa đủ checkpoint.
     *
     * Mỗi section (1 checkpoint):
     *   [ground 400px] → [gap 180px] → [bridge 130px] → [gap 40px]
     *   → [cp_platform 170px + checkpoint] → [gap 50px]
     *   → [descent 120px] → [gap 160px]
     *   Tổng ~1 250px / checkpoint
     */
    generateDynamicLevel(checkpointCount) {
        checkpointCount = Math.max(1, Math.min(checkpointCount, 30));
        
        const GROUND_Y = 540;
        const GH      = 60;   // ground height
        const FLAG_H  = 64;   // checkpoint flag height
        
        // Xen kẽ 3 độ cao cho đa dạng hình ảnh
        const BRIDGE_TIERS = [410, 380, 350];
        const CP_TIERS     = [330, 300, 270];
        
        const platforms  = [];
        const coins      = [];
        const checkpointDefs = [];
        const enemies    = [];
        
        let x = 0;
        
        // Ground khởi đầu
        platforms.push({ x: 0, y: GROUND_Y, width: 420, height: GH, isGround: true });
        x = 420;
        
        for (let i = 0; i < checkpointCount; i++) {
            const tier  = i % 3;
            const bY    = BRIDGE_TIERS[tier]; // bridge platform y
            const cpY   = CP_TIERS[tier];     // checkpoint platform y
            
            // Gap 1: ground → bridge
            x += 180;
            
            // Bridge platform (bước đệm)
            platforms.push({ x, y: bY, width: 130, height: 20 });
            coins.push({ x: x + 15, y: bY - 35 });
            coins.push({ x: x + 65, y: bY - 35 });
            coins.push({ x: x + 110, y: bY - 35 });
            x += 130;
            
            // Gap 2: bridge → checkpoint platform
            x += 40;
            
            // Checkpoint platform
            const cpPlatWidth = 170;
            platforms.push({ x, y: cpY, width: cpPlatWidth, height: 20 });
            
            // Đặt checkpoint ở giữa platform
            const cpX = x + 55;
            checkpointDefs.push({ id: `cp${i + 1}`, x: cpX, y: cpY - FLAG_H, level: 1 });
            
            // Coins gần checkpoint (dẫn đường)
            coins.push({ x: x + 20, y: cpY - 40 });
            coins.push({ x: cpX + 35, y: cpY - 40 });
            
            x += cpPlatWidth;
            
            // Gap 3: sau checkpoint platform
            x += 50;
            
            // Descent platform (bước xuống)
            const descY = bY + 20;
            platforms.push({ x, y: descY, width: 120, height: 20 });
            x += 120;
            
            // Gap 4: descent → ground tiếp theo
            x += 160;
            
            // Ground section tiếp theo
            const groundW = i === checkpointCount - 1 ? 500 : 420; // rộng hơn ở cuối
            platforms.push({ x, y: GROUND_Y, width: groundW, height: GH, isGround: true });
            
            // Enemy trên ground (xen kẽ loại)
            const enemyType = i % 3 === 2 ? 'koopa' : 'goomba';
            enemies.push({ x: x + 80, y: 508, type: enemyType });
            
            x += groundW;
        }
        
        const goalX = x - 150; // goal ở gần cuối ground cuối
        
        console.log(`[LEVEL] Generated ${checkpointCount} checkpoints, totalWidth=${x}px, goalX=${goalX}`);
        
        this.currentLevel = 1;
        this.totalLevels  = 1;
        this.levelData = { level: 1, platforms, enemies, coins, checkpoints: checkpointDefs, goalX };
        this.platforms = [...platforms];
        this.enemies   = enemies.map(e => new Enemy(e.x, e.y, e.type));
        this.coins     = coins.map(c => new Coin(c.x, c.y));
        this.checkpoints = checkpointDefs.map(cp => new Checkpoint(cp.id, cp.x, cp.y, cp.level));
        this.checkpointPositions = checkpointDefs.map(cp => cp.x);
        
        return 1;
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
