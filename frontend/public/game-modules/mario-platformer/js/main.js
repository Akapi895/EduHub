/**
 * Main entry point for Mario Platformer game
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // console.log('[MARIO] Game initializing...');
    
    // Create loading screen
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.innerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-text">Đang tải game...</p>
    `;
    document.body.insertBefore(loadingScreen, document.body.firstChild);
    
    // Initialize game after a short delay (to show loading)
    setTimeout(() => {
        try {
            // Create game instance
            window.game = new Game();
            
            // Hide loading screen
            loadingScreen.classList.add('hidden');
            
            // console.log('[MARIO] Game initialized successfully');
            
            // Remove loading screen from DOM after animation
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
            
        } catch (error) {
            console.error('[MARIO] Failed to initialize game:', error);
            loadingScreen.innerHTML = `
                <p class="loading-text" style="color: #ff6b6b;">Lỗi khi tải game!</p>
                <p class="loading-text" style="font-size: 14px; color: #ccc;">${error.message}</p>
            `;
        }
    }, 500);
});

// Handle visibility change - pause when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.game && window.game.state.status === 'playing') {
        // Optionally pause the game when tab is hidden
        // window.game.pause();
    }
});

// Handle errors
window.addEventListener('error', (event) => {
    console.error('[MARIO] Uncaught error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('[MARIO] Unhandled promise rejection:', event.reason);
});
