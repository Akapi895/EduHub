/**
 * Player - Mario character with physics-based movement
 */
class Player {
    constructor(game) {
        this.game = game;
        this.width = 32;
        this.height = 32; // Reduced height for better proportions
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
        this.jumpForce = -12;
        this.moveSpeed = 0.8;
        this.maxSpeed = 5;
        this.friction = 0.9;
        
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
        
        // Apply continuous movement based on input state
        if (this.movingLeft) {
            this.velocityX -= this.moveSpeed;
            this.direction = -1;
            if (this.isGrounded) this.currentAnimation = 'run';
        }
        if (this.movingRight) {
            this.velocityX += this.moveSpeed;
            this.direction = 1;
            if (this.isGrounded) this.currentAnimation = 'run';
        }
        
        // Apply gravity
        this.velocityY += this.gravity;
        
        // Apply friction
        this.velocityX *= this.friction;
        
        // Clamp horizontal velocity
        this.velocityX = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.velocityX));
        
        // Stop if very slow
        if (Math.abs(this.velocityX) < 0.1) {
            this.velocityX = 0;
            if (this.isGrounded) {
                this.currentAnimation = 'idle';
            }
        }
        
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
        
        // Keep player in bounds horizontally (level width tăng cho map mới)
        const levelWidth = 2700;
        if (this.x < 0) this.x = 0;
        if (this.x > levelWidth - this.width) {
            this.x = levelWidth - this.width;
        }
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
        
        // Draw Mario (simplified pixel art style)
        // Hat
        ctx.fillStyle = this.colors.hat;
        ctx.fillRect(screenX + 2, screenY, 28, 8);
        
        // Head
        ctx.fillStyle = this.colors.head;
        ctx.fillRect(screenX + 4, screenY + 8, 24, 14);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(screenX + 22, screenY + 10, 4, 4);
        
        // Body (shirt)
        ctx.fillStyle = this.colors.body;
        ctx.fillRect(screenX + 4, screenY + 22, 24, 6);
        
        // Pants
        ctx.fillStyle = this.colors.pants;
        ctx.fillRect(screenX + 4, screenY + 26, 24, 6);
        
        ctx.restore();
    }
}
