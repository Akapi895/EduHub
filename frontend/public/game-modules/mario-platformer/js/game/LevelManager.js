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
    
    loadLevel(levelNumber, questionCount = 3) {
        this.currentLevel = Math.min(levelNumber, this.totalLevels);
        this.loadLevelData(questionCount);
        return this.currentLevel;
    }
    
    loadLevelData(questionCount = 3) {
        // Fallback: generate dynamic level với số checkpoints tương ứng
        this.generateDynamicLevel(questionCount);
    }
    
    /**
     * Tạo level động — ground LIÊN TỤC, không có khe hổng.
     * Thử thách: player phải nhảy LÊN 2 stepping stone → CP platform.
     * Nếu fail, rơi xuống ground và thử lại (không chết).
     *
     * Mỗi section (~900px):
     *   stepping stone 1 → stepping stone 2 → checkpoint platform
     *   (3 tiers độ cao xen kẽ cho đa dạng hình ảnh)
     *
     * Phạm vi nhảy đã verify (jumpForce=-12, gravity=0.5, maxJump≈144px):
     *   ground(y=508) → stone1(y~398): cần 110px ✓
     *   stone1       → stone2(y~313): cần  85px ✓
     *   stone2       → CP  (y~228):   cần  85px ✓
     */
    generateDynamicLevel(checkpointCount) {
        checkpointCount = Math.max(1, Math.min(checkpointCount, 30));

        const GROUND_Y = 540;
        const GH       = 60;  // ground height
        const FLAG_H   = 64;  // checkpoint flag height

        // 3 tiers độ cao xen kẽ — tất cả đều nhảy được từ ground
        //  [stone1_y, stone2_y, cp_y]
        const TIERS = [
            [430, 355, 290],  // tier 0: thấp
            [420, 345, 280],  // tier 1: trung bình
            [410, 335, 270],  // tier 2: cao hơn chút
        ];

        const SECTION_W  = 900;  // chiều rộng mỗi section
        const START_W    = 350;  // ground trước section đầu
        const END_W      = 400;  // ground sau section cuối
        const totalWidth = START_W + checkpointCount * SECTION_W + END_W;

        const platforms      = [];
        const coins          = [];
        const checkpointDefs = [];
        const enemies        = [];

        // Ground liên tục — MỘT dải duy nhất từ 0 đến totalWidth
        platforms.push({ x: 0, y: GROUND_Y, width: totalWidth, height: GH, isGround: true });

        for (let i = 0; i < checkpointCount; i++) {
            const [s1Y, s2Y, cpY] = TIERS[i % 3];
            const sx = START_W + i * SECTION_W;  // điểm bắt đầu section này

            // --- Stepping stone 1 (bước đệm thấp) ---
            // Offset: +80 tính từ đầu section
            platforms.push({ x: sx + 80,  y: s1Y, width: 120, height: 20 });
            coins.push({ x: sx + 105, y: s1Y - 38 });
            coins.push({ x: sx + 145, y: s1Y - 38 });

            // --- Stepping stone 2 (bước đệm cao) ---
            // Offset: +250 — gap 50px từ stone1 (jumpable)
            platforms.push({ x: sx + 250, y: s2Y, width: 120, height: 20 });
            coins.push({ x: sx + 275, y: s2Y - 38 });
            coins.push({ x: sx + 315, y: s2Y - 38 });

            // --- Checkpoint platform (cao nhất) ---
            // Offset: +420 — gap 50px từ stone2
            const cpPlatW = 160;
            platforms.push({ x: sx + 420, y: cpY, width: cpPlatW, height: 20 });

            // Checkpoint ở giữa platform
            const cpX = sx + 420 + 55;
            checkpointDefs.push({ id: `cp${i + 1}`, x: cpX, y: cpY - FLAG_H, level: 1 });

            // Coins dẫn đường gần checkpoint
            coins.push({ x: sx + 440, y: cpY - 42 });
            coins.push({ x: cpX + 30, y: cpY - 42 });

            // --- Descending stone (bước xuống sau CP) ---
            // Offset: +630 — dễ nhảy xuống từ CP
            platforms.push({ x: sx + 630, y: s2Y, width: 110, height: 20 });

            // --- Enemy trên ground (canh gác trước section) ---
            const enemyType = i % 3 === 2 ? 'koopa' : 'goomba';
            enemies.push({ x: sx + 20,  y: 508, type: enemyType });
            // Enemy thứ 2 sau CP để tăng thử thách
            if (i % 2 === 1) {
                enemies.push({ x: sx + 760, y: 508, type: 'goomba' });
            }
        }

        const goalX = totalWidth - 200;

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
     * Portal active khi tất cả checkpoint đã pass (dùng checkpointManager)
     * LevelManager.checkpoints không được mark — delegate sang checkpointManager
     */
    areAllCheckpointsPassed(checkpointManager) {
        if (!this.levelData?.checkpoints?.length) return true;
        if (checkpointManager) {
            // Source of truth: checkpointManager.passedCheckpoints
            return checkpointManager.getPassedCount() >= this.levelData.checkpoints.length;
        }
        // Fallback: check levelManager.checkpoints (chỉ đúng khi cùng object)
        for (const cp of this.levelData.checkpoints) {
            const checkpoint = this.checkpoints.find(c => c.id === cp.id);
            if (!checkpoint || !checkpoint.passed) return false;
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
