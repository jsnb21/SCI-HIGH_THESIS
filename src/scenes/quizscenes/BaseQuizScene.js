// Import the GameTimer class
import GameTimer from '/src/components/GameTimer.js';
import ComboMeter from '/src/components/ComboMeter.js';
import { createPlayerUI } from './ui/playerUI.js';
import { createQuizBox, createEnemyUI, createTimerText, createQuestionAndOptions } from './ui/quizUI.js';
import { showFeedback, showVictory, showGameOver } from './ui/feedbackUI.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

// Utility function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Function to randomize multiple choice options and update correct index
function randomizeOptions(question) {
    if (question.type === 'fill-in-the-blank' || !question.options) {
        return question; // No randomization needed for fill-in-the-blank
    }

    const originalOptions = [...question.options];
    const originalCorrectIndex = question.correctIndex;
    const correctAnswer = originalOptions[originalCorrectIndex];

    // Create shuffled options
    const shuffledOptions = shuffleArray(originalOptions);
    
    // Find new correct index
    const newCorrectIndex = shuffledOptions.findIndex(option => option === correctAnswer);

    return {
        ...question,
        options: shuffledOptions,
        correctIndex: newCorrectIndex
    };
}

export default class BaseQuizScene extends Phaser.Scene {    constructor(config) {
        super(config);
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0; // Track correct answers separately
        this.quizElements = [];
        this.persistentElements = [];this.enemyHpBarHeight = 10;
        this.gameTimer = null;
        this.comboMeter = null;
        this.playerConfig = {
            maxHP: 100,
            currentHP: 100,
            label: 'Player'
        };
        this.enemyHPState = {
            currentHP: 100,
            maxHP: 100
        };
        this.scaleFactor = 1;
    }

    getScaleFactor() {
        const { width, height } = this.scale.gameSize;
        return Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    }    init(data) {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0; // Initialize correct answers counter
        this.questions = [];
        this.isQuizStarted = false;
        this.enemyConfig = data.enemyConfig || {
            spriteKey: 'boxenemy',
            maxHP: 100,
            label: 'Enemy',
        };
        this.playerConfig = {
            maxHP: 100,
            currentHP: 100,
            label: 'Player'
        };
        this.enemyHPState = {
            currentHP: this.enemyConfig.maxHP,
            maxHP: this.enemyConfig.maxHP        };
        this.gameTimer = new GameTimer(this);
        this.comboMeter = new ComboMeter(this);
    }

    // Method to set and randomize questions
    setQuestions(questions) {
        // First randomize the order of questions
        this.questions = shuffleArray(questions);
        
        // Then randomize the options for each multiple choice question
        this.questions = this.questions.map(question => randomizeOptions(question));
    }preload() {
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
        this.load.image('player', 'assets/player.png');
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('goblin', 'assets/enemies/goblin.png');
        this.load.image('dragon', 'assets/enemies/dragon.png');
        this.load.image('boxenemy', 'assets/sprites/enemies/box.png');
        this.load.image('heart', 'assets/sprites/dungeon/heart.png');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        if (!this.enemyConfig) {
            console.error('enemyConfig is undefined!');
            return;
        }
        this.scale.on('resize', this.onResize, this);
        this.updateScaleAndLayout();
    }

    onResize() {
        this.updateScaleAndLayout();
    }

    updateScaleAndLayout() {
        this.scaleFactor = this.getScaleFactor();
        if (this.isQuizStarted && this.questions && this.currentQuestionIndex < this.questions.length) {
            this.showQuestion();
        }
    }

    handleTimeUp() {
        showGameOver(this);
    }    startQuiz(initialTime = 30) {        if (!this.isQuizStarted) {
            this.isQuizStarted = true;
            const sf = this.scaleFactor;
              // Timer at top right
            const timerElements = this.gameTimer.create(this.scale.width - 70 * sf, 30 * sf, initialTime);
            if (timerElements.timerBackground && timerElements.timerBackground.setDepth) {
                timerElements.timerBackground.setDepth(130);
            }
            if (timerElements.timerText && timerElements.timerText.setDepth) {
                timerElements.timerText.setDepth(130);
            }
            if (timerElements.progressBar && timerElements.progressBar.setDepth) {
                timerElements.progressBar.setDepth(130);
            }
            if (timerElements.progressBarBg && timerElements.progressBarBg.setDepth) {
                timerElements.progressBarBg.setDepth(130);
            }
            if (timerElements.secondsLabel && timerElements.secondsLabel.setDepth) {
                timerElements.secondsLabel.setDepth(130);
            }
            this.persistentElements.push(
                timerElements.timerBackground, 
                timerElements.timerText,
                timerElements.progressBar,
                timerElements.progressBarBg,
                timerElements.secondsLabel
            );
        }
        this.showQuestion();
    }    showQuestion() {
        this.isAnswering = false; // <-- Reset answering state at the start of every question
        this.scaleFactor = this.getScaleFactor();
        const sf = this.scaleFactor;
        if (!this.questions || this.currentQuestionIndex >= this.questions.length) {
            showVictory(this);
            return;
        }
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const { question, options, type = 'multiple-choice' } = currentQuestion;
        this.cleanupQuestionElements();// Layout
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2 + 100 * sf; // Move box further down (80 + 20)
        const boxWidth = 600 * sf;
        const boxHeight = 230 * sf; // Reduced from 250 to 230 to remove space below choices
        const boxTopY = centerY - boxHeight / 2;

        // Quiz box
        createQuizBox(this, centerX, centerY, boxWidth, boxHeight, 20 * sf);        // Enemy UI (above the box)
        const enemyUI = createEnemyUI(this, centerX, boxTopY, sf);
        this.enemyContainer = enemyUI.enemyContainer;

        // Combo meter (above the enemy)
        const comboMeterY = boxTopY - 140 * sf; // Position above the enemy
        const comboElements = this.comboMeter.create(centerX, comboMeterY, sf);
        this.quizElements.push(comboElements.comboContainer);        // Question and options (inside the box)
        createQuestionAndOptions(
            this,
            centerX,
            centerY,
            boxWidth,
            boxHeight,
            this.currentQuestionIndex,
            question,
            options,
            sf,
            type,
            (index, answer) => this.checkAnswer(index, answer)
        );// Player hearts at top left
        const heartsX = 140 * sf; // Move to top left
        const heartsY = 30 * sf;
        this.playerContainer = createPlayerUI(this, heartsX, heartsY, this.playerConfig, sf);
        this.quizElements.push(this.playerContainer);
    }    cleanupQuestionElements() {
        // Clean up fill-in-the-blank keyboard listeners if they exist
        if (this._fillInBlankCleanup) {
            this._fillInBlankCleanup();
            this._fillInBlankCleanup = null;
        }
        
        this.quizElements.forEach(el => {
            if (el && el.active) el.destroy();
        });
        this.quizElements = [];
        this.enemyContainer = null;
        this.playerContainer = null;
        this._quizOptionBgs = []; // <-- Clear option backgrounds to avoid stale references
    }damageCharacter(container, amount) {
        const sf = this.scaleFactor;
        let hp = container.getData('currentHP');
        const maxHP = container.getData('maxHP');
        hp = Phaser.Math.Clamp(hp - amount, 0, maxHP);
        container.setData('currentHP', hp);

        const isPlayer = container.getData('label') === 'Player';
        if (isPlayer) {
            this.playerConfig.currentHP = hp;
            
            // Update hearts for player
            const hearts = container.getData('hearts');
            const maxHearts = 5;
            const currentHearts = Math.ceil(hp / 20); // 20 HP per heart
            
            if (hearts) {
                hearts.forEach((heart, i) => {
                    if (i < currentHearts) {
                        // Active heart
                        heart.setTint(0xff4757).setAlpha(1);
                        // Re-enable pulsing animation if not already running
                        if (!heart.getData('pulsing')) {
                            this.tweens.add({
                                targets: heart,
                                scaleX: 0.1 * sf,
                                scaleY: 0.1 * sf,
                                duration: 800 + i * 100,
                                ease: 'Sine.easeInOut',
                                yoyo: true,
                                repeat: -1
                            });
                            heart.setData('pulsing', true);
                        }
                    } else {
                        // Empty heart
                        heart.setTint(0x4a5568).setAlpha(0.5);
                        // Stop pulsing animation
                        this.tweens.killTweensOf(heart);
                        heart.setScale(0.08 * sf);
                        heart.setData('pulsing', false);
                    }
                });
            }
        } else {
            this.enemyHPState.currentHP = hp;
            
            // Update enemy HP bar
            const hpBar = container.getData('hpBar');
            const hpBarBg = container.getData('hpBarBg');
              if (hpBar && hpBarBg) {
                hpBar.clear();
                const hpBarWidth = 120 * sf;
                const hpBarHeight = 12 * sf;
                
                // Use the same Y calculation as in createEnemyUI
                const enemySprite = container.list.find(child => child.texture && child.texture.key === this.enemyConfig.spriteKey);
                const hpBarY = enemySprite ? -(enemySprite.displayHeight / 2) - 25 * sf : -45 * sf;
                
                // Redraw HP bar with gradient
                const hpPercentage = hp / maxHP;
                hpBar.fillGradientStyle(0xff4757, 0xff4757, 0xff6b7d, 0xff6b7d, 1);
                hpBar.fillRoundedRect(
                    -hpBarWidth / 2 + 2 * sf, 
                    hpBarY + 2 * sf, 
                    (hpBarWidth - 4 * sf) * hpPercentage, 
                    hpBarHeight - 4 * sf, 
                    4 * sf
                );
            }
        }        // Update label text (only for enemy now)
        const label = container.getData('label');
        if (!isPlayer) {
            // For enemy, update HP text if it exists
            const hpText = container.getData('hpText');
            if (hpText) {
                hpText.setText(`${label}`);
            }
        }
    }    checkAnswer(selectedIndex, userAnswer = null) {
        if (this.isAnswering) return;
        this.isAnswering = true;
        
        const currentQuestion = this.questions[this.currentQuestionIndex];
        let isCorrect = false;
        
        // Handle different question types
        if (currentQuestion.type === 'fill-in-the-blank') {
            // For fill-in-the-blank, check if the user's answer matches any correct answer
            const correctAnswers = currentQuestion.correctAnswers || [];
            isCorrect = correctAnswers.some(answer => 
                userAnswer && userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()
            );
        } else {
            // Default multiple choice
            const correctIndex = currentQuestion.correctIndex;
            isCorrect = selectedIndex === correctIndex;
        }// Calculate feedback position below the quiz box, 20% lower
        const sf = this.scaleFactor;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2 + 100 * sf; // Match the box position (80 + 20)
        const boxHeight = 230 * sf; // Match the reduced box height
        // Move feedbackY 20% lower than the previous offset
        const feedbackY = centerY + boxHeight / 2 + (20 * sf * 1.2);        // --- Pause the timer ---
        this.gameTimer.pause();        if (isCorrect) {
            // Track correct answer
            this.correctAnswers++;
            
            // Update combo meter first
            this.comboMeter.updateCombo(true, sf);
            
            // Apply score multiplier
            const multiplier = this.comboMeter.getScoreMultiplier();
            const scoreIncrease = Math.round(1 * multiplier);
            this.score += scoreIncrease;
            
            // Show feedback with combo info
            let feedbackText = "Correct! You attack the enemy!";
            if (multiplier > 1) {
                feedbackText += ` (${multiplier}x Combo!)`;
            }
            
            showFeedback(this, feedbackText, 0x00ff00, centerX, feedbackY);
            this.gameTimer.addTime(5);
            if (this.enemyContainer) {
                this.damageCharacter(this.enemyContainer, 20);
            }
        } else {
            // Update combo meter (resets combo)
            this.comboMeter.updateCombo(false, sf);
            
            showFeedback(this, "Wrong! The enemy attacks you!", 0xff0000, centerX, feedbackY);
            this.gameTimer.subtractTime(3);
            if (this.playerContainer) {
                this.damageCharacter(this.playerContainer, 15);
            }
            const playerHP = this.playerContainer.getData('currentHP');
            if (playerHP <= 0) {
                // --- Resume timer before ending ---
                this.gameTimer.resume();
                showGameOver(this);
                return;
            }
        }
        if (this.enemyContainer) {
            const enemyHP = this.enemyContainer.getData('currentHP');
            if (enemyHP <= 0) {
                // --- Resume timer before ending ---
                this.gameTimer.resume();
                showVictory(this);
                return;
            }
        }
        // --- Wait 1 second before next question or ending ---
        this.time.delayedCall(1000, () => {
            // If this is the last question, show victory after the delay
            if (this.currentQuestionIndex >= this.questions.length - 1) {
                this.gameTimer.resume();
                showVictory(this);
                return;
            }
            this.currentQuestionIndex++;
            this.isAnswering = false;
            this.showQuestion();
            // --- Resume timer after showing next question ---
            this.gameTimer.resume();
        });
    }    restartQuiz() {
        this.score = 0;
        this.correctAnswers = 0; // Reset correct answers counter
        this.currentQuestionIndex = 0;
        this.isQuizStarted = false;
        this.isAnswering = false; // <-- Reset answering state
        this.playerConfig.currentHP = this.playerConfig.maxHP;
        this.enemyHPState.currentHP = this.enemyHPState.maxHP;
        this.cleanupAllElements();
        this.gameTimer = new GameTimer(this);
        this.comboMeter = new ComboMeter(this);
        this.startQuiz(30);
    }

    cleanupAllElements() {
        this.cleanupQuestionElements();
        this.cleanupPersistentElements();
    }

    cleanupPersistentElements() {
        this.persistentElements.forEach(el => {
            if (el && el.active) el.destroy();
        });
        this.persistentElements = [];
    }
}