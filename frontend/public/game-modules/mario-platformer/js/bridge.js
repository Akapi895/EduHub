/**
 * GameBridge - Communication layer between Mario game and EduHub host
 * Uses postMessage API to communicate with GamePlayerShell
 */
class GameBridge {
    constructor(gameId = 'mario-platformer') {
        this.gameId = gameId;
        this.channel = 'eduhub:game-bridge';
        this.handlers = new Map();
        this.version = '2.0.0';
        
        // Listen for messages from host
        window.addEventListener('message', this.handleMessage.bind(this));
    }
    
    /**
     * Send message to host
     * @param {string} type - Message type
     * @param {object} payload - Message payload
     */
    send(type, payload = {}) {
        const envelope = {
            channel: this.channel,
            type,
            gameId: this.gameId,
            timestamp: new Date().toISOString(),
            payload
        };
        // console.log('[BRIDGE] Sending message to host:', type, envelope);
        window.parent.postMessage(envelope, '*');
    }
    
    /**
     * Register handler for host messages
     * @param {string} type - Message type to handle
     * @param {function} handler - Handler function
     */
    onHostMessage(type, handler) {
        this.handlers.set(type, handler);
    }
    
    /**
     * Handle incoming messages
     */
    handleMessage(event) {
        const msg = event.data;
        if (!msg || msg.channel !== this.channel) return;
        
        // Don't process our own messages
        if (msg.gameId === this.gameId && msg.timestamp) return;
        
        // console.log('[BRIDGE] Received message from host:', msg.type, msg);
        
        const handler = this.handlers.get(msg.type);
        if (handler) {
            handler(msg.payload);
        } else {
            // console.log('[BRIDGE] No handler for message type:', msg.type);
        }
    }
    
    /**
     * Signal game is ready
     */
    ready() {
        this.send('game:ready', {
            version: this.version,
            capabilities: ['ready', 'state', 'progress', 'question-trigger', 'complete', 'pause', 'resume', 'restart']
        });
    }
    
    /**
     * Update game state (sent periodically)
     * @param {object} state - Current game state
     */
    updateState(state) {
        this.send('game:state', state);
    }
    
    /**
     * Trigger question at checkpoint
     * @param {object} data - Trigger data
     */
    triggerQuestion(data) {
        this.send('game:question-trigger', {
            triggerType: 'checkpoint_reached',
            triggerKey: data.checkpointId || data.triggerKey,
            triggerValue: 'checkpoint',
            eventPayload: {
                checkpointId: data.checkpointId,
                level: data.level || 1,
                playerX: data.playerX || 0,
                playerY: data.playerY || 0
            }
        });
    }
    
    /**
     * Game completed
     * @param {object} outcome - Completion outcome
     */
    complete(outcome) {
        this.send('game:complete', outcome);
    }
    
    /**
     * Submit answer (sent from quiz modal)
     * @param {string} attemptId - Question attempt ID
     * @param {*} answer - Answer data
     * @param {string} questionType - Question type
     */
    submitAnswer(attemptId, answer, questionType) {
        this.send('game:answer-submitted', {
            attemptId,
            answer,
            questionType
        });
    }
}

// Global bridge instance
const bridge = new GameBridge('mario-platformer');
