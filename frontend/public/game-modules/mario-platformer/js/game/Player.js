/**
 * Player - Mario character with physics-based movement
 */
class Player {
    constructor(game) {
        this.game = game;
        this.width = 48;
        this.height = 48; // Increased height for larger player size
        this.x = 100;
        this.y = 100; // Will be set to ground level on first update
        this.velocityX = 0;
        this.velocityY = 0;
        this.direction = 1; // 1 = right, -1 = left
        this.isGrounded = false;
        this.isJumping = false;
        this.isDead = false;
        
        // Invincibility after being hit
        this.isInvincible = false;
        this.invincibleTimer = 0;
        
        // Physics constants
        this.gravity = 0.5;
        this.jumpForce = -12.5;  // Nhảy cao hơn chút để dễ qua hố
        this.moveSpeed = 2;    // Đi chậm lại để dễ căn chỉnh
        this.maxSpeed  = 2;
        // friction đã xóa — không dùng quán tính
        
        // Animation
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.currentAnimation = 'idle';
        
        // Sprite colors (simple pixel representation)
        this.colors = {
            body: '#e74c3c', // Red (Mario shirt)
            head: '#f5d0a9', // Skin
            hat: '#3498db', // Blue hat
            pants: '#2c3e50' // Dark pants
        };
        
        // Movement state (for continuous movement)
        this.movingLeft = false;
        this.movingRight = false;
    }
    
    /**
     * Set player as invincible for a duration
     */
    setInvincible(durationMs) {
        this.isInvincible = true;
        this.invincibleTimer = durationMs;
    }
    
    reset() {
        this.x = 100;
        this.y = 100; // Reset to top, will fall to ground
        this.velocityX = 0;
        this.velocityY = 0;
        this.direction = 1;
        this.isGrounded = false;
        this.isJumping = false;
        this.isDead = false;
        this.currentAnimation = 'idle';
        this.movingLeft = false;
        this.movingRight = false;
        this.isInvincible = false;
        this.invincibleTimer = 0;
    }
    
    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.isDead = false;
        this.isGrounded = false;
    }
    
    // Set movement flags (called from game loop based on input state)
    setMovingLeft(value) {
        this.movingLeft = value;
    }
    
    setMovingRight(value) {
        this.movingRight = value;
    }
    
    moveLeft() {
        // Kept for compatibility but now just sets flag
        this.movingLeft = true;
        this.direction = -1;
    }
    
    moveRight() {
        // Kept for compatibility but now just sets flag
        this.movingRight = true;
        this.direction = 1;
    }
    
    stopLeft() {
        this.movingLeft = false;
    }
    
    stopRight() {
        this.movingRight = false;
    }
    
    jump() {
        if (this.isGrounded && !this.isJumping) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            this.isJumping = true;
            this.currentAnimation = 'jump';
        }
    }
    
    update(deltaTime, platforms) {
        // Update invincibility timer
        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }
        
        // Di chuyển ngang — KHÔNG quán tính: set velocity trực tiếp
        if (this.movingLeft && !this.movingRight) {
            this.velocityX = -this.moveSpeed;
            this.direction = -1;
            if (this.isGrounded) this.currentAnimation = 'run';
        } else if (this.movingRight && !this.movingLeft) {
            this.velocityX = this.moveSpeed;
            this.direction = 1;
            if (this.isGrounded) this.currentAnimation = 'run';
        } else {
            // Không nhấn phím → dừng ngược lại ngay (không trượt)
            this.velocityX = 0;
            if (this.isGrounded) this.currentAnimation = 'idle';
        }
        
        // Apply gravity
        this.velocityY += this.gravity;
        
        // Clamp horizontal velocity (bảo vệ an toàn)
        this.velocityX = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.velocityX));
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Platform collision
        this.isGrounded = false;
        for (const platform of platforms) {
            this.handlePlatformCollision(platform);
        }
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        if (this.x < 0) this.x = 0;
    }
    
    handlePlatformCollision(platform) {
        // Only check collision if falling
        if (this.velocityY <= 0) return;
        
        const playerBottom = this.y + this.height;
        const playerRight = this.x + this.width;
        
        // Check if above platform and falling onto it
        if (
            playerRight > platform.x &&
            this.x < platform.x + platform.width &&
            playerBottom >= platform.y &&
            playerBottom <= platform.y + platform.height + 10 // Add tolerance
        ) {
            this.y = platform.y - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
            this.isJumping = false;
        }
    }
    
    updateAnimation(deltaTime) {
        this.animationTimer += deltaTime;
        
        if (this.animationTimer > 100) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 4;
        }
    }
    
    collidesWith(entity) {
        return (
            this.x < entity.x + entity.width &&
            this.x + this.width > entity.x &&
            this.y < entity.y + entity.height &&
            this.y + this.height > entity.y
        );
    }
    
    isAbove(entity) {
        const playerBottom = this.y + this.height;
        const playerCenterX = this.x + this.width / 2;
        
        return (
            playerCenterX > entity.x &&
            playerCenterX < entity.x + entity.width &&
            playerBottom > entity.y &&
            playerBottom < entity.y + entity.height / 2
        );
    }
    
    render(ctx, cameraX) {
        ctx.save();
        
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Invincibility visual effect - blink/blink
        if (this.isInvincible) {
            // Blink effect - only draw every other 100ms
            const blinkOn = Math.floor(Date.now() / 100) % 2 === 0;
            if (!blinkOn) {
                ctx.restore();
                return;
            }
        }
        
        // Flip if facing left
        if (this.direction === -1) {
            ctx.translate(screenX + this.width / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(screenX + this.width / 2), 0);
        }

        // Add dynamic scaling based on width and height
        const scaleX = this.width / 32;
        const scaleY = this.height / 32;
        
        ctx.translate(screenX, screenY);
        ctx.scale(scaleX, scaleY);
        
        // Draw Mario (simplified pixel art style)
        // Hat
        ctx.fillStyle = this.colors.hat;
        ctx.fillRect(2, 0, 28, 8);
        
        // Head
        ctx.fillStyle = this.colors.head;
        ctx.fillRect(4, 8, 24, 14);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(22, 10, 4, 4);
        
        // Body (shirt)
        ctx.fillStyle = this.colors.body;
        ctx.fillRect(4, 22, 24, 6);
        
        // Pants
        ctx.fillStyle = this.colors.pants;
        ctx.fillRect(4, 26, 24, 6);
        
        ctx.restore();
    }
}
