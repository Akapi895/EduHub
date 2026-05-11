/**
 * InputHandler - Handles keyboard input for Mario game
 */
class InputHandler {
    constructor() {
        this.keys = {
            left: false,
            right: false,
            jump: false,
            action: false
        };
        
        this.listeners = {
            onJump: null
        };
        
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    handleKeyDown(e) {
        switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                if (!this.keys.left) {
                    this.keys.left = true;
                }
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'KeyD':
                if (!this.keys.right) {
                    this.keys.right = true;
                }
                e.preventDefault();
                break;
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                if (!this.keys.jump) {
                    this.keys.jump = true;
                    if (this.listeners.onJump) this.listeners.onJump();
                }
                e.preventDefault();
                break;
            case 'KeyX':
            case 'Enter':
                if (!this.keys.action) {
                    this.keys.action = true;
                }
                e.preventDefault();
                break;
        }
    }
    
    handleKeyUp(e) {
        switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                this.keys.jump = false;
                break;
            case 'KeyX':
            case 'Enter':
                this.keys.action = false;
                break;
        }
    }
    
    isLeftPressed() {
        return this.keys.left;
    }
    
    isRightPressed() {
        return this.keys.right;
    }
    
    // Debug method to check key states
    getKeyStates() {
        return { ...this.keys };
    }
    
    isJumpPressed() {
        return this.keys.jump;
    }
    
    isActionPressed() {
        return this.keys.action;
    }
    
    onJump(callback) {
        this.listeners.onJump = callback;
    }
    
    reset() {
        this.keys.left = false;
        this.keys.right = false;
        this.keys.jump = false;
        this.keys.action = false;
    }
}
