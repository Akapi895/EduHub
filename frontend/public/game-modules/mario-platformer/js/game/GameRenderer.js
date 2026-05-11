/**
 * GameRenderer - Handles all rendering for Mario game
 */
class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Camera
        this.cameraX = 0;
        this.cameraY = 0;
        
        // Background layers for parallax
        this.backgroundLayers = this.createBackgroundLayers();
    }
    
    get width() {
        return this.canvas.width;
    }
    
    get height() {
        return this.canvas.height;
    }
    
    createBackgroundLayers() {
        return {
            sky: { offset: 0, speed: 0 },
            clouds: { offset: 0, speed: 0.1 },
            hills: { offset: 0, speed: 0.3 },
            bushes: { offset: 0, speed: 0.5 }
        };
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    renderBackground() {
        const ctx = this.ctx;
        const h = this.height;
        const w = this.width;
        
        // Sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.6, '#87CEEB');
        gradient.addColorStop(0.65, '#90EE90');
        gradient.addColorStop(0.75, '#228B22');
        gradient.addColorStop(1, '#228B22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        
        // Sun
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(w - 100, 80, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Clouds (parallax)
        this.renderClouds();
        
        // Hills (parallax)
        this.renderHills();
        
        // Bushes (parallax)
        this.renderBushes();
    }
    
    renderClouds() {
        const ctx = this.ctx;
        const cloudOffset = -this.cameraX * this.backgroundLayers.clouds.speed;
        
        ctx.fillStyle = '#fff';
        
        // Draw some clouds
        const clouds = [
            { x: 100, y: 60, size: 1 },
            { x: 400, y: 40, size: 1.2 },
            { x: 700, y: 80, size: 0.8 },
            { x: 1000, y: 50, size: 1.1 },
        ];
        
        clouds.forEach(cloud => {
            const x = ((cloud.x + cloudOffset) % (this.width + 200)) - 100;
            const y = cloud.y;
            const s = cloud.size;
            
            ctx.beginPath();
            ctx.arc(x, y, 20 * s, 0, Math.PI * 2);
            ctx.arc(x + 25 * s, y - 10 * s, 25 * s, 0, Math.PI * 2);
            ctx.arc(x + 50 * s, y, 20 * s, 0, Math.PI * 2);
            ctx.arc(x + 25 * s, y + 5 * s, 18 * s, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    renderHills() {
        const ctx = this.ctx;
        const hillOffset = -this.cameraX * this.backgroundLayers.hills.speed;
        
        ctx.fillStyle = '#3CB371';
        
        // Draw rolling hills
        ctx.beginPath();
        ctx.moveTo(0, this.height);
        
        for (let x = 0; x <= this.width + 100; x += 50) {
            const worldX = x - (hillOffset % 300);
            const y = this.height - 80 + Math.sin(worldX * 0.01) * 30;
            ctx.lineTo(x, y);
        }
        
        ctx.lineTo(this.width, this.height);
        ctx.closePath();
        ctx.fill();
    }
    
    renderBushes() {
        const ctx = this.ctx;
        const bushOffset = -this.cameraX * this.backgroundLayers.bushes.speed;
        const groundY = this.height - 65;
        
        ctx.fillStyle = '#228B22';
        
        const bushes = [
            { x: 100, size: 1 },
            { x: 350, size: 0.8 },
            { x: 600, size: 1.2 },
            { x: 900, size: 0.9 },
            { x: 1200, size: 1 },
        ];
        
        bushes.forEach(bush => {
            const x = ((bush.x + bushOffset) % (this.width + 200)) - 100;
            const s = bush.size;
            
            ctx.beginPath();
            ctx.arc(x, groundY, 20 * s, Math.PI, 0);
            ctx.arc(x + 15 * s, groundY - 10, 15 * s, Math.PI, 0);
            ctx.arc(x + 30 * s, groundY, 20 * s, Math.PI, 0);
            ctx.fill();
        });
    }
    
    renderPlatforms(platforms) {
        const ctx = this.ctx;
        
        platforms.forEach(platform => {
            const screenX = platform.x - this.cameraX;
            const screenY = platform.y;
            
            // Skip if off screen
            if (screenX + platform.width < 0 || screenX > this.width) return;
            
            if (platform.isGround) {
                // Ground/brick texture
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(screenX, screenY, platform.width, platform.height);
                
                // Grass on top
                ctx.fillStyle = '#228B22';
                ctx.fillRect(screenX, screenY, platform.width, 8);
                
                // Brick lines
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                for (let x = 0; x < platform.width; x += 40) {
                    ctx.beginPath();
                    ctx.moveTo(screenX + x, screenY);
                    ctx.lineTo(screenX + x, screenY + platform.height);
                    ctx.stroke();
                }
            } else {
                // Floating platform
                ctx.fillStyle = '#DEB887';
                ctx.fillRect(screenX, screenY, platform.width, platform.height);
                
                // Highlight
                ctx.fillStyle = '#F5DEB3';
                ctx.fillRect(screenX, screenY, platform.width, 4);
                
                // Shadow
                ctx.fillStyle = '#A0522D';
                ctx.fillRect(screenX, screenY + platform.height - 4, platform.width, 4);
            }
        });
    }
    
    renderGoal(goalX) {
        const ctx = this.ctx;
        const screenX = goalX - this.cameraX;
        
        if (screenX < -100 || screenX > this.width + 100) return;
        
        // Flag pole
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(screenX + 20, this.height - 160, 8, 100);
        
        // Flag
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.moveTo(screenX + 28, this.height - 160);
        ctx.lineTo(screenX + 80, this.height - 140);
        ctx.lineTo(screenX + 80, this.height - 110);
        ctx.lineTo(screenX + 28, this.height - 90);
        ctx.closePath();
        ctx.fill();
        
        // Flag ball
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(screenX + 24, this.height - 160, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    updateCamera(playerX, canvasWidth) {
        // Smooth camera follow
        const targetCameraX = playerX - canvasWidth / 3;
        this.cameraX += (targetCameraX - this.cameraX) * 0.1;
        
        // Clamp camera - allow scrolling for wider levels
        const maxCameraX = 2000; // Max level width minus visible area
        if (this.cameraX < 0) this.cameraX = 0;
        if (this.cameraX > maxCameraX) this.cameraX = maxCameraX;
    }
    
    renderGameOver(score, checkpointsPassed) {
        const ctx = this.ctx;
        
        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Game Over text
        ctx.fillStyle = '#FF6347';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 60);
        
        // Score
        ctx.fillStyle = '#fff';
        ctx.font = '32px Arial';
        ctx.fillText(`Điểm: ${score}`, this.width / 2, this.height / 2);
        
        // Checkpoints
        ctx.font = '24px Arial';
        ctx.fillText(`Checkpoint đã vượt qua: ${checkpointsPassed}`, this.width / 2, this.height / 2 + 40);
    }
    
    renderLevelComplete(level, score) {
        const ctx = this.ctx;
        
        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Level Complete text
        ctx.fillStyle = '#4ECDC4';
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL COMPLETE!', this.width / 2, this.height / 2 - 40);
        
        // Level
        ctx.fillStyle = '#fff';
        ctx.font = '32px Arial';
        ctx.fillText(`Level ${level}`, this.width / 2, this.height / 2 + 10);
        
        // Score
        ctx.font = '24px Arial';
        ctx.fillText(`Điểm: ${score}`, this.width / 2, this.height / 2 + 50);
    }
}
