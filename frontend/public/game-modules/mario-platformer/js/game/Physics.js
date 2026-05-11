/**
 * Physics - Simple physics engine for Mario game
 */
class Physics {
    constructor() {
        // Physics constants
        this.gravity = 0.6;
        this.friction = 0.85;
        this.maxFallSpeed = 15;
    }
    
    /**
     * Apply gravity to an entity
     * @param {object} entity - Entity with velocityY property
     */
    applyGravity(entity) {
        entity.velocityY += this.gravity;
        if (entity.velocityY > this.maxFallSpeed) {
            entity.velocityY = this.maxFallSpeed;
        }
    }
    
    /**
     * Apply friction to horizontal movement
     * @param {object} entity - Entity with velocityX property
     */
    applyFriction(entity) {
        entity.velocityX *= this.friction;
        if (Math.abs(entity.velocityX) < 0.1) {
            entity.velocityX = 0;
        }
    }
    
    /**
     * Check collision between two rectangles
     */
    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }
    
    /**
     * Check if entity is above another
     */
    isAbove(entity, target) {
        const entityBottom = entity.y + entity.height;
        const entityCenterX = entity.x + entity.width / 2;
        
        return (
            entityCenterX > target.x &&
            entityCenterX < target.x + target.width &&
            entityBottom > target.y &&
            entityBottom < target.y + target.height / 2
        );
    }
    
    /**
     * Resolve platform collision for an entity
     */
    resolvePlatformCollision(entity, platform) {
        const entityBottom = entity.y + entity.height;
        const entityTop = entity.y;
        const entityLeft = entity.x;
        const entityRight = entity.x + entity.width;
        
        const platTop = platform.y;
        const platBottom = platform.y + platform.height;
        const platLeft = platform.x;
        const platRight = platform.x + platform.width;
        
        // Check if horizontally overlapping
        if (entityRight <= platLeft || entityLeft >= platRight) {
            return false;
        }
        
        // Landing on top of platform (falling)
        if (entity.velocityY > 0 && entityBottom >= platTop && entityBottom <= platTop + entity.velocityY + 10) {
            entity.y = platTop - entity.height;
            entity.velocityY = 0;
            entity.isGrounded = true;
            return true;
        }
        
        // Hitting bottom of platform (jumping up)
        if (entity.velocityY < 0 && entityTop <= platBottom && entityTop >= platBottom + entity.velocityY - 10) {
            entity.y = platBottom;
            entity.velocityY = 0;
            return true;
        }
        
        return false;
    }
}
