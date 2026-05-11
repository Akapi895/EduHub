/**
 * QuizManager - Handles question display and answer submission
 */
class QuizManager {
    constructor(bridge) {
        this.bridge = bridge;
        this.currentQuestion = null;
        this.currentAttemptId = null;
        this.currentCheckpointId = null;
        this.isVisible = false;
        this.isStandalone = false; // Will be set to true only in standalone mode
        this.hasProcessedResult = false; // Prevent duplicate result processing
        
        // DOM elements
        this.modal = null;
        this.questionEl = null;
        this.optionsEl = null;
        this.textInputEl = null;
        this.submitBtn = null;
        this.feedbackEl = null;
        this.typeLabelEl = null;
        this.pointsLabelEl = null;
        
        this.init();
    }
    
    init() {
        this.modal = document.getElementById('quiz-modal');
        this.questionEl = document.getElementById('quiz-question');
        this.optionsEl = document.getElementById('quiz-options');
        this.textInputEl = document.getElementById('quiz-text-input');
        this.submitBtn = document.getElementById('quiz-submit');
        this.feedbackEl = document.getElementById('quiz-feedback');
        this.typeLabelEl = document.getElementById('quiz-type');
        this.pointsLabelEl = document.getElementById('quiz-points');
        
        // Setup event listeners
        this.submitBtn.addEventListener('click', () => this.submitAnswer());
        
        document.getElementById('quiz-continue')?.addEventListener('click', () => {
            this.handleContinue();
        });
    }
    
    /**
     * Called when game receives host:pause (question triggered)
     */
    onHostPause() {
        // Running in EduHub - not standalone
        this.isStandalone = false;
        this.hasProcessedResult = false;
    }
    
    showQuestion(question, attemptId, checkpointId) {
        // Reset state
        this.hasProcessedResult = false;
        
        this.currentQuestion = question;
        this.currentAttemptId = attemptId;
        this.currentCheckpointId = checkpointId;
        
        // Set question content
        this.questionEl.textContent = question.content || question.question || '';
        
        // Set type label
        this.typeLabelEl.textContent = this.getTypeLabel(question.type);
        
        // Set points
        this.pointsLabelEl.textContent = `${question.points || 0} điểm`;
        
        // Render options based on question type
        this.renderQuestionContent(question);
        
        // Reset feedback
        this.feedbackEl.classList.add('hidden');
        this.submitBtn.classList.remove('hidden');
        this.submitBtn.textContent = 'Nộp câu trả lời';
        this.submitBtn.disabled = true;
        
        // Show modal
        this.modal.classList.remove('hidden');
        this.isVisible = true;
    }
    
    /**
     * Called when game receives host:resume (answer processed)
     */
    onHostResume() {
        // In EduHub mode, result is handled by game via handleQuestionResult
        this.isStandalone = false;
        // Don't reset hasProcessedResult here - it's reset when showing next question
    }
    
    /**
     * Mark that the quiz result has been processed
     */
    markProcessed() {
        this.hasProcessedResult = true;
    }
    
    /**
     * Handle continue button click - needed after showing feedback
     */
    handleContinue() {
        // Only process if not already processed
        if (this.hasProcessedResult) {
            // console.log('[QUIZ] Already processed, ignoring continue');
            return;
        }
        this.hasProcessedResult = true;
        
        // Dispatch continue event for game to handle
        window.dispatchEvent(new CustomEvent('quiz:continue', {
            detail: {
                checkpointId: this.currentCheckpointId
            }
        }));
        this.hide();
    }
    
    renderQuestionContent(question) {
        this.optionsEl.innerHTML = '';
        this.optionsEl.classList.remove('hidden');
        this.textInputEl?.classList.add('hidden');
        
        switch (question.type) {
            case 'single_choice':
            case 'multi_choice':
                this.renderOptions(question);
                break;
            case 'text':
                this.renderTextInput();
                break;
            case 'matching':
                this.renderMatching(question);
                break;
            case 'image_upload':
                this.renderImageUpload();
                break;
            default:
                this.optionsEl.innerHTML = '<p>Loại câu hỏi không được hỗ trợ</p>';
        }
    }
    
    renderOptions(question) {
        const options = question.options || question.choices || [];
        
        this.optionsEl.innerHTML = options.map((opt, index) => `
            <button class="quiz-option" data-id="${opt.id || index}">
                <span class="option-marker"></span>
                <span class="option-text">${opt.content || opt.text || opt}</span>
            </button>
        `).join('');
        
        // Add click handlers
        const isMulti = question.type === 'multi_choice';
        this.optionsEl.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', () => {
                if (isMulti) {
                    btn.classList.toggle('selected');
                } else {
                    this.optionsEl.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                }
                this.submitBtn.disabled = false;
            });
        });
    }
    
    renderTextInput() {
        this.optionsEl.classList.add('hidden');
        this.textInputEl.classList.remove('hidden');
        this.textInputEl.value = '';
        this.textInputEl.addEventListener('input', () => {
            this.submitBtn.disabled = this.textInputEl.value.trim() === '';
        });
    }
    
    renderMatching(question) {
        // Simplified matching UI
        const leftItems = question.matching_left_items || [];
        const rightItems = question.matching_right_items || [];
        
        this.optionsEl.innerHTML = `
            <div class="matching-container">
                <div class="matching-left">
                    ${leftItems.map((item, i) => `
                        <div class="matching-item left-item" data-id="${item.id || i}">
                            ${item.content || item.text || ''}
                        </div>
                    `).join('')}
                </div>
                <div class="matching-right">
                    ${rightItems.map((item, i) => `
                        <div class="matching-item right-item" data-key="${item.right_key || item.id || i}">
                            ${item.content || item.text || ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Simple click-to-select matching
        let selectedLeft = null;
        this.optionsEl.querySelectorAll('.left-item').forEach(leftBtn => {
            leftBtn.addEventListener('click', () => {
                this.optionsEl.querySelectorAll('.left-item').forEach(b => b.classList.remove('selected'));
                leftBtn.classList.add('selected');
                selectedLeft = leftBtn.dataset.id;
                this.submitBtn.disabled = false;
            });
        });
        
        this.optionsEl.querySelectorAll('.right-item').forEach(rightBtn => {
            rightBtn.addEventListener('click', () => {
                this.submitBtn.disabled = false;
            });
        });
    }
    
    renderImageUpload() {
        this.optionsEl.innerHTML = `
            <div class="upload-container">
                <input type="file" id="image-upload" accept="image/*">
                <p>Kéo thả hoặc click để tải ảnh lên</p>
            </div>
        `;
        
        const input = this.optionsEl.querySelector('#image-upload');
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.submitBtn.disabled = false;
                this.uploadedFile = e.target.files[0];
            }
        });
    }
    
    getTypeLabel(type) {
        const labels = {
            'single_choice': 'Trắc nghiệm 1 đáp án',
            'multi_choice': 'Trắc nghiệm nhiều đáp án',
            'text': 'Tự luận',
            'matching': 'Nối cột',
            'image_upload': 'Tải ảnh'
        };
        return labels[type] || type;
    }
    
    submitAnswer() {
        if (!this.currentQuestion || this.hasProcessedResult) return;
        
        let answer;
        const questionType = this.currentQuestion.type;
        
        switch (questionType) {
            case 'single_choice':
                const selected = this.optionsEl.querySelector('.quiz-option.selected');
                answer = selected ? [selected.dataset.id] : [];
                break;
            case 'multi_choice':
                const selectedOptions = this.optionsEl.querySelectorAll('.quiz-option.selected');
                answer = Array.from(selectedOptions).map(opt => opt.dataset.id);
                break;
            case 'text':
                answer = this.textInputEl?.value || '';
                break;
            case 'matching':
                answer = this.getMatchingAnswers();
                break;
            case 'image_upload':
                answer = this.uploadedFile ? URL.createObjectURL(this.uploadedFile) : '';
                break;
            default:
                answer = null;
        }
        
        // Send answer via bridge to backend
        if (this.currentAttemptId) {
            this.bridge.submitAnswer(this.currentAttemptId, answer, questionType);
        }
        
        // Mark as processed to prevent duplicate handling
        this.hasProcessedResult = true;
        
        // Show loading state
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Đang chấm...';
    }
    
    getMatchingAnswers() {
        const answers = [];
        this.optionsEl.querySelectorAll('.left-item.selected').forEach(left => {
            answers.push({
                left_item_id: left.dataset.id,
                selected_right_key: null
            });
        });
        return answers;
    }
    
    showFeedback(isCorrect, feedbackMessage) {
        this.feedbackEl.classList.remove('hidden', 'correct', 'wrong');
        this.feedbackEl.classList.add(isCorrect ? 'correct' : 'wrong');
        
        const icon = this.feedbackEl.querySelector('.feedback-icon');
        const text = this.feedbackEl.querySelector('.feedback-text');
        const explanation = this.feedbackEl.querySelector('.feedback-explanation');
        
        icon.textContent = isCorrect ? '✓' : '✗';
        text.textContent = isCorrect ? 'Chính xác!' : 'Chưa đúng rồi!';
        explanation.textContent = feedbackMessage || '';
        
        this.submitBtn.classList.add('hidden');
    }
    
    hide() {
        this.modal.classList.add('hidden');
        this.isVisible = false;
        this.feedbackEl.classList.add('hidden');
        this.submitBtn.classList.remove('hidden');
        this.submitBtn.textContent = 'Nộp câu trả lời';
        this.currentQuestion = null;
        this.currentAttemptId = null;
    }
}
