// Import the GameTimer class
import GameTimer from '/src/components/GameTimer.js';
import ComboMeter from '/src/components/ComboMeter.js';
import TutorialManager from '/src/components/TutorialManager.js';
import { TUTORIAL_TRIGGERS, prepareTutorialSteps } from '/src/components/TutorialConfig.js';
import { createPlayerUI } from './ui/playerUI.js';
import { createQuizBox, createEnemyUI, createTimerText, createQuestionAndOptions } from './ui/quizUI.js';
import { showFeedback, showVictory, showGameOver } from './ui/feedbackUI.js';
import gameManager from '/src/gameManager.js';

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
    // Handle true/false questions - don't randomize, always keep True/False order
    if (question.type === 'true-false') {
        question.options = ['True', 'False'];
        // Convert correctAnswer boolean to correctIndex if needed
        if (typeof question.correctAnswer === 'boolean') {
            question.correctIndex = question.correctAnswer ? 0 : 1; // True = 0, False = 1
        }
        return question;
    }
    
    // Handle both "options" and "choices" property names
    const questionOptions = question.options || question.choices;
    
    if (question.type === 'fill-in-the-blank' || question.type === 'drag-and-drop' || !questionOptions || !Array.isArray(questionOptions)) {
        return question; // No randomization needed for fill-in-the-blank, drag-and-drop, or when options are invalid
    }

    // Ensure we have at least some options to work with
    if (questionOptions.length === 0) {
        console.warn('Question has empty options array:', question);
        return question;
    }

    const originalOptions = [...questionOptions];
    const originalCorrectIndex = question.correctIndex;
    
    // Validate correctIndex
    if (originalCorrectIndex < 0 || originalCorrectIndex >= originalOptions.length) {
        console.warn('Invalid correctIndex for question:', question);
        return question;
    }
    
    const correctAnswer = originalOptions[originalCorrectIndex];

    // Create shuffled options
    const shuffledOptions = shuffleArray(originalOptions);
    
    // Find new correct index
    const newCorrectIndex = shuffledOptions.findIndex(option => option === correctAnswer);

    return {
        ...question,
        options: shuffledOptions, // Always use "options" as the output property
        choices: shuffledOptions, // Keep backward compatibility
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
        
        // Initialize tutorial system
        this.tutorialManager = new TutorialManager(this);
        this.tutorialFlags = {
            firstTimeTutorialShown: false,
            powerUpTutorialShown: false,
            comboTutorialShown: false,
            lowHealthWarningShown: false,
            victoryTutorialShown: false
        };

        // Point system tracking
        this.quizStartTime = 0;
        this.answerTimes = []; // Track time taken for each answer
        this.currentQuestionStartTime = 0;
        this.maxComboReached = 0;
        this.difficulty = 'medium'; // Default difficulty


        this.playerConfig = {
            maxHP: 100,
            currentHP: gameManager.getPlayerHP(), // Initialize from GameManager
            label: 'Player'
        };
        this.enemyHPState = {
            currentHP: 100,
            maxHP: 100
        };
        this.scaleFactor = 1;
        
        // Battle state tracking
        this.battleWon = false; // Flag to prevent time-out loss when battle is won
        this.gameOverState = false; // Flag to prevent gameplay after timeout
    }

    getScaleFactor() {
        const { width, height } = this.scale.gameSize;
        return Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    }    init(data) {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0; // Initialize correct answers counter        this.questions = [];
        this.isQuizStarted = false;
        this.isAnswering = false; // Reset answering state
        this.gameOverState = false; // Reset game over state - IMPORTANT for restarting quiz
        this.courseTopic = data.topic || null; // Store course topic for completion tracking
        this.enemyDefeated = false; // Track if enemy was defeated
        this.playerDamage = data.playerDamage || 10; // Player damage per correct answer
        this.battleWon = false; // Reset battle won flag for new quiz
        
        // Reset player HP to full when starting a new quiz
        gameManager.resetPlayerHP();
        
        // Initialize point system tracking
        this.quizStartTime = 0;
        this.answerTimes = [];
        this.currentQuestionStartTime = 0;
        this.maxComboReached = 0;
        this.difficulty = data.difficulty || 'medium'; 
        this.playerDamage = data.playerDamage || 10; // Player damage per correct answer// Define available enemy sprites (only include existing files)
        const availableEnemies = [
            'goblinNerd', 
            'bigSlime',
            'cyberFighter',
            'starfishMonster'
        ];
        
        // Randomly select an enemy sprite
        const randomEnemyKey = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
          this.enemyConfig = data.enemyConfig || {
            spriteKey: randomEnemyKey,
            maxHP: 100,
            label: 'Enemy',
        };
        
        // Initialize player config with reset HP (after gameManager.resetPlayerHP() was called)
        this.playerConfig = {
            maxHP: 100,
            currentHP: gameManager.getPlayerHP(), // This should now be 100 after reset
            label: 'Player'
        };
        
        console.log(`Player HP initialized for quiz: ${this.playerConfig.currentHP}/${this.playerConfig.maxHP}`);
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
    }    preload() {
        // Load custom font properly
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');        // Only load existing enemy sprites
        this.load.image('goblinNerd', 'assets/sprites/enemies/goblinNerd.png');
        this.load.image('bigSlime', 'assets/sprites/enemies/big_slime.png');
        this.load.image('cyberFighter', 'assets/sprites/enemies/cyber_fighter.png');
        this.load.image('starfishMonster', 'assets/sprites/enemies/starfish_monster.png');
        this.load.image('heart', 'assets/sprites/dungeon/heart.png');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_combo', 'assets/audio/se/se_combo.wav');
        this.load.audio('se_wrong', 'assets/audio/se/se_wrong.wav');
        this.load.audio('se_hurt', 'assets/audio/se/se_hurt.wav');
        this.load.audio('se_explosion', 'assets/audio/se/se_explosion.wav');
        
        // Handle font loading errors gracefully
        this.load.on('loaderror', (file) => {
            console.warn('Failed to load file:', file.src);
        });
    }create() {
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        this.se_comboSound = this.sound.add('se_combo');
        this.se_wrongSound = this.sound.add('se_wrong');
        this.se_hurtSound = this.sound.add('se_hurt');
        this.se_explosionSound = this.sound.add('se_explosion');
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
        // Only show game over if the battle hasn't been won yet
        if (!this.battleWon) {
            // Immediately disable all game interactions to prevent further gameplay
            this.isAnswering = false;
            this.isQuizStarted = false;
            this.gameOverState = true; // Set game over flag
            
            // Clear any ongoing timers or events
            if (this.gameTimer) {
                this.gameTimer.destroy();
                this.gameTimer = null;
            }
            
            // Show game over screen immediately (keep input enabled for UI buttons)
            showGameOver(this);
        }
    }    startQuiz(initialTime = 30) {        if (!this.isQuizStarted) {
            this.isQuizStarted = true;
            this.quizStartTime = Date.now(); // Record quiz start time
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
        
        // Check and show tutorial if needed
        this.checkAndShowTutorial();
    }    showQuestion() {
        this.isAnswering = false; // <-- Reset answering state at the start of every question
        this.scaleFactor = this.getScaleFactor();
        const sf = this.scaleFactor;

        // Record question start time for answer speed tracking
        this.currentQuestionStartTime = Date.now();
        
        // Sync playerConfig HP from GameManager before showing question
        this.playerConfig.currentHP = gameManager.getPlayerHP();
        console.log(`showQuestion: synced HP from GameManager: ${this.playerConfig.currentHP}`);
        
        if (!this.questions || this.currentQuestionIndex >= this.questions.length) {
            showVictory(this);
            return;
        }
        const currentQuestion = this.questions[this.currentQuestionIndex];
        console.log('Current question data:', currentQuestion);
        
        // Handle both "options" and "choices" property names
        let { question, options, choices, type = 'multiple-choice' } = currentQuestion;
        
        // Handle true/false questions
        if (type === 'true-false') {
            options = ['True', 'False'];
            // Convert correctAnswer boolean to correctIndex
            if (typeof currentQuestion.correctAnswer === 'boolean') {
                currentQuestion.correctIndex = currentQuestion.correctAnswer ? 0 : 1; // True = 0, False = 1
            }
            console.log('True/False question detected. Correct answer:', currentQuestion.correctAnswer, 'Correct index:', currentQuestion.correctIndex);
        } else {
            // Use choices if options is not available (for backward compatibility)
            if (!options && choices) {
                options = choices;
                console.log('Using "choices" property as options:', options);
            }
        }
        
        console.log('Destructured values - question:', question, 'options:', options, 'type:', type);
        
        // Validate question structure
        if (!question) {
            console.error('Invalid question structure - missing question text:', currentQuestion);
            return;
        }
        
        // Validate and fix options for multiple choice questions
        if (type === 'multiple-choice') {
            if (!options || !Array.isArray(options) || options.length === 0) {
                console.error('Invalid options for multiple choice question. Original options:', options);
                console.log('Creating fallback options for question');
                options = ['Option A', 'Option B', 'Option C', 'Option D'];
                // Update the current question with fallback options
                currentQuestion.options = options;
                currentQuestion.correctIndex = 0; // Default to first option
                console.log('Assigned fallback options:', options);
            }
        }
        
        console.log('Final options being passed:', options);
        
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
        // Create question and options UI
        const questionContainer = createQuestionAndOptions(
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
        );
        
        // Safety check for questionContainer creation
        if (!questionContainer) {
            console.error('Failed to create question container - scene may not be properly initialized');
            return;
        }
        
        // Store references for tutorial system
        this.currentQuestionContainer = questionContainer;
        this.questionText = questionContainer.list.find(child => child.type === 'Text');
        this.quizBox = questionContainer;// Player hearts at top left
        const heartsX = 140 * sf; // Move to top left
        const heartsY = 30 * sf;
        this.playerContainer = createPlayerUI(this, heartsX, heartsY, this.playerConfig, sf);
        this.quizElements.push(this.playerContainer);
        // Add small points display (top-left, below hearts)
        if (!this.pointsDisplay) {
            this.pointsDisplay = gameManager.createPointsDisplay(this, heartsX, heartsY + 60 * sf, sf * 0.8);
            this.quizElements.push(this.pointsDisplay.container);
        }
    }    cleanupQuestionElements() {
        // Clean up fill-in-the-blank keyboard listeners if they exist
        if (this._fillInBlankCleanup) {
            this._fillInBlankCleanup();
            this._fillInBlankCleanup = null;
        }
        
        // Clean up drag-and-drop state if it exists
        if (this.dragAndDropState) {
            // Remove any drag event listeners
            this.input.off('dragstart');
            this.input.off('drag');
            this.input.off('dragend');
            this.dragAndDropState = null;
        }
        
        this.quizElements.forEach(el => {
            if (el && el.active) el.destroy();
        });
        this.quizElements = [];
        this.enemyContainer = null;
        this.playerContainer = null;
        this._quizOptionBgs = []; // <-- Clear option backgrounds to avoid stale references
    }    damageCharacter(container, amount) {
        const sf = this.scaleFactor;
        let hp = container.getData('currentHP');
        const maxHP = container.getData('maxHP');
        
        console.log(`Damage before: HP=${hp}, damage=${amount}, isPlayer=${container.getData('label') === 'Player'}`);
        
        hp = Phaser.Math.Clamp(hp - amount, 0, maxHP);
        container.setData('currentHP', hp);
        
        console.log(`Damage after: HP=${hp}`);

        const isPlayer = container.getData('label') === 'Player';        if (isPlayer) {
            this.playerConfig.currentHP = hp;
            
            console.log(`Player HP updated: playerConfig.currentHP=${this.playerConfig.currentHP}, GameManager HP=${gameManager.getPlayerHP()}`);
            
            // Save HP to GameManager for persistence across scenes
            gameManager.setPlayerHP(hp);
            
            console.log(`After saving to GameManager: ${gameManager.getPlayerHP()}`);
            
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
            }        } else {
            this.enemyHPState.currentHP = hp;
            
            // Play hurt sound effect for enemy
            if (this.se_hurtSound) {
                this.se_hurtSound.play();
            }
            
            // Add flashing red effect to enemy sprite
            const enemySprite = container.list.find(child => child.texture && child.texture.key === this.enemyConfig.spriteKey);
            if (enemySprite) {
                // Flash red effect
                enemySprite.setTint(0xff0000); // Set to red
                this.tweens.add({
                    targets: enemySprite,
                    alpha: 0.3,
                    duration: 100,
                    ease: 'Power2.easeInOut',
                    yoyo: true,
                    repeat: 2, // Flash 3 times total
                    onComplete: () => {
                        enemySprite.clearTint(); // Remove red tint
                        enemySprite.setAlpha(1); // Restore full alpha
                    }
                });
            }
            
            // Update enemy HP bar
            const hpBar = container.getData('hpBar');
            const hpBarBg = container.getData('hpBarBg');
              if (hpBar && hpBarBg) {
                hpBar.clear();
                const hpBarWidth = 120 * sf;
                const hpBarHeight = 12 * sf;
                  // Use the same Y calculation as in createEnemyUI
                const enemySprite = container.list.find(child => child.texture && child.texture.key === this.enemyConfig.spriteKey);
                const hpBarY = enemySprite ? -(enemySprite.displayHeight / 2) - 5 * sf : -45 * sf;
                
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
    }
    
    /**
     * Process answer logic (extracted from original checkAnswer if needed)
     */
    processAnswerLogic(selectedIndex, userAnswer = null) {
        // Record answer time
        const answerTime = (Date.now() - this.currentQuestionStartTime) / 1000;
        this.answerTimes.push(answerTime);
        
        const currentQuestion = this.questions[this.currentQuestionIndex];
        let isCorrect = false;
        
        // Handle different question types
        if (currentQuestion.type === 'fill-in-the-blank') {
            const correctAnswers = currentQuestion.correctAnswers || [];
            isCorrect = correctAnswers.some(answer => 
                userAnswer && userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()
            );
        } else if (currentQuestion.type === 'drag-and-drop') {
            isCorrect = selectedIndex === 0 && userAnswer === null;
        } else {
            const correctIndex = currentQuestion.correctIndex;
            isCorrect = selectedIndex === correctIndex;
        }

        // Calculate feedback position below the quiz box, 20% lower
        const sf = this.scaleFactor;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2 + 100 * sf;
        const boxHeight = 230 * sf;
        const feedbackY = centerY + boxHeight / 2 + (20 * sf * 1.2);

        // Pause the timer
        this.gameTimer.pause();

        if (isCorrect) {
            // Track correct answer
            this.correctAnswers++;
            
            // Update combo meter first
            this.comboMeter.updateCombo(true, sf);

            // Track max combo reached
            const currentCombo = this.comboMeter.getCurrentCombo();
            if (currentCombo > this.maxComboReached) {
                this.maxComboReached = currentCombo;
            }
            
            // Check for combo tutorial trigger
            setTimeout(() => {
                this.checkAndShowTutorial();
            }, 500); // Reduced from 1000ms to 500ms
            
            // Apply score multiplier
            const multiplier = this.comboMeter.getScoreMultiplier();
            const scoreIncrease = Math.round(1 * multiplier);
            this.score += scoreIncrease;
            
            // Damage the enemy with visual feedback
            if (this.enemyContainer) {
                this.damageCharacter(this.enemyContainer, this.playerDamage);
            }
            
            // Show feedback with combo info
            if (currentQuestion.type !== 'drag-and-drop') {
                let feedbackText = `Correct! You deal ${this.playerDamage} damage!`;
                if (multiplier > 1) {
                    feedbackText += ` (${multiplier}x Combo!)`;
                }
                showFeedback(this, feedbackText, 0x00ff00, centerX, feedbackY);
            }
            
            this.gameTimer.addTime(5);

            // Check if enemy HP reached 0
            if (this.enemyContainer && this.enemyContainer.getData('currentHP') <= 0) {
                this.battleWon = true;
                this.enemyDefeated = true;
                console.log('Enemy defeated in quiz scene! Flag set to true.');

                this.awardQuizPoints();
                
                // Play death animation before showing victory screen
                this.playEnemyDeathAnimation(() => {
                    // Check for victory tutorial
                    setTimeout(() => {
                        if (TUTORIAL_TRIGGERS.victory(this) && !this.tutorialFlags.victoryTutorialShown) {
                            this.showTutorial('victory');
                            this.tutorialFlags.victoryTutorialShown = true;
                        }
                    }, 600); // Reduced from 1000ms to 600ms
                    
                    this.gameTimer.resume();
                    showVictory(this);
                });
                return;
            }
        } else {
            // Update combo meter (resets combo)
            this.comboMeter.updateCombo(false, sf);
            
            // Play wrong answer sound
            if (this.se_wrongSound) {
                this.se_wrongSound.play();
            }
            
            showFeedback(this, "Wrong! The enemy attacks you!", 0xff0000, centerX, feedbackY);
            this.gameTimer.subtractTime(3);
            
            if (this.playerContainer) {
                this.damageCharacter(this.playerContainer, 15);
                
                const playerHP = this.playerContainer.getData('currentHP');
                
                // Check for low health tutorial trigger
                setTimeout(() => {
                    this.checkAndShowTutorial();
                }, 500); // Reduced from 1000ms to 500ms
                
                if (playerHP <= 0) {
                    this.gameTimer.resume();
                    showGameOver(this);
                    return;
                }
            }
        }

        // Continue to next question
        if (this.enemyContainer) {
            const enemyHP = this.enemyContainer.getData('currentHP');
            if (enemyHP <= 0) {
                this.battleWon = true;
                this.enemyDefeated = true;
                
                this.awardQuizPoints();
                
                setTimeout(() => {
                    this.gameTimer.resume();
                    showVictory(this);
                }, 600); // Reduced from 1500ms to 600ms
                return;
            }
        }

        // Move to next question
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.gameTimer.resume();

            if (this.currentQuestionIndex < this.questions.length) {
                this.showQuestion();
            } else {
                this.awardQuizPoints();
                showVictory(this);
            }
        }, 800); // Reduced from 2000ms to 800ms
    }    restartQuiz() {
        this.score = 0;
        this.correctAnswers = 0; // Reset correct answers counter
        this.currentQuestionIndex = 0;
        this.isQuizStarted = false;
        this.isAnswering = false; // <-- Reset answering state
        this.battleWon = false; // Reset battle won flag
        this.gameOverState = false; // Reset game over flag
        
        // Reset point tracking variables
        this.quizStartTime = 0;
        this.answerTimes = [];
        this.currentQuestionStartTime = 0;
        this.maxComboReached = 0;
        this.playerConfig.currentHP = gameManager.getPlayerHP(); // Get current HP from GameManager
        this.enemyHPState.currentHP = this.enemyHPState.maxHP;
        this.cleanupAllElements();
        this.gameTimer = new GameTimer(this);
        this.comboMeter = new ComboMeter(this);
        this.startQuiz(30);
    }

    playEnemyDeathAnimation(onComplete) {
        if (!this.enemyContainer) {
            onComplete();
            return;
        }

        const sf = this.scaleFactor;
        
        // Find the enemy sprite
        const enemySprite = this.enemyContainer.list.find(child => 
            child.texture && child.texture.key === this.enemyConfig.spriteKey
        );
        
        if (!enemySprite) {
            onComplete();
            return;
        }        // Get current scale and calculate consistent enlargement
        const currentScaleX = enemySprite.scaleX;
        const currentScaleY = enemySprite.scaleY;
        const enlargementFactor = 1.4; // 40% larger than current size
        
        // Death animation sequence
        this.tweens.add({
            targets: enemySprite,
            scaleX: currentScaleX * enlargementFactor,
            scaleY: currentScaleY * enlargementFactor,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {                // Flash white briefly
                enemySprite.setTint(0xffffff);
                
                // Calculate shrink scale relative to current size
                const shrinkFactor = 0.3; // Shrink to 30% of current size
                
                this.tweens.add({
                    targets: enemySprite,
                    alpha: 0,
                    scaleX: currentScaleX * shrinkFactor,
                    scaleY: currentScaleY * shrinkFactor,
                    rotation: Math.PI * 2,
                    duration: 800,
                    ease: 'Power2.easeIn',
                    onUpdate: (tween) => {
                        // Flicker effect during fade
                        const progress = tween.progress;
                        if (progress > 0.3) {
                            const flicker = Math.sin(progress * 20) > 0 ? 1 : 0.3;
                            enemySprite.setAlpha(flicker * (1 - progress));
                        }
                    },                    onComplete: () => {
                        // Hide the entire enemy container
                        this.enemyContainer.setVisible(false);
                          // Play explosion sound effect at much higher volume
                        if (this.se_explosionSound) {
                            this.se_explosionSound.play({ volume: 2.0 });
                        }
                        
                        // Create explosion particles effect
                        this.createDeathParticles(this.enemyContainer.x, this.enemyContainer.y, sf);
                        
                        // Wait a bit more before calling completion
                        this.time.delayedCall(500, onComplete);
                    }
                });
            }
        });
    }    createDeathParticles(x, y, sf) {
        // Create epic multi-layered particle explosion effect
        
        // Layer 1: Main explosion burst (larger particles)
        const mainParticleCount = 16;
        const mainColors = [0xff4757, 0xffa726, 0xffd700, 0xff6b7d, 0xff3838, 0xff9500];
        
        for (let i = 0; i < mainParticleCount; i++) {
            const angle = (i / mainParticleCount) * Math.PI * 2;
            const distance = Phaser.Math.Between(80, 120) * sf;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            const particleSize = Phaser.Math.Between(4, 8) * sf;
            const particle = this.add.circle(x, y, particleSize, mainColors[i % mainColors.length]).setDepth(125);
            
            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 0.1,
                duration: Phaser.Math.Between(800, 1200),
                ease: 'Power3.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
        
        // Layer 2: Secondary scatter particles (medium particles)
        const scatterCount = 24;
        const scatterColors = [0xffdd59, 0xff6348, 0xff4757, 0xffc048];
        
        for (let i = 0; i < scatterCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(40, 160) * sf;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            const particleSize = Phaser.Math.Between(2, 5) * sf;
            const particle = this.add.circle(x, y, particleSize, scatterColors[Math.floor(Math.random() * scatterColors.length)]).setDepth(124);
            
            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 0.2,
                duration: Phaser.Math.Between(600, 1000),
                ease: 'Power2.easeOut',
                delay: Phaser.Math.Between(0, 200),
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
        
        // Layer 3: Sparks and small debris (tiny particles)
        const sparkCount = 32;
        const sparkColors = [0xffffff, 0xffdd59, 0xffa726, 0xff4757];
        
        for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(20, 200) * sf;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            const particleSize = Phaser.Math.Between(1, 3) * sf;
            const particle = this.add.circle(x, y, particleSize, sparkColors[Math.floor(Math.random() * sparkColors.length)]).setDepth(126);
            
            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 0.05,
                duration: Phaser.Math.Between(400, 800),
                ease: 'Power1.easeOut',
                delay: Phaser.Math.Between(0, 300),
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
        
        // Layer 4: Shockwave ring effect
        const shockwave = this.add.circle(x, y, 10 * sf, 0xffffff, 0.8).setDepth(123);
        shockwave.setStrokeStyle(3 * sf, 0xffd700);
        
        this.tweens.add({
            targets: shockwave,
            scale: 8,
            alpha: 0,
            duration: 600,
            ease: 'Power2.easeOut',
            onComplete: () => {
                shockwave.destroy();
            }
        });
        
        // Layer 5: Screen flash effect
        const flashOverlay = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 
            this.cameras.main.width, this.cameras.main.height, 0xffffff, 0.6).setDepth(130);
            
        this.tweens.add({
            targets: flashOverlay,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeOut',
            onComplete: () => {
                flashOverlay.destroy();
            }
        });
        
        // Layer 6: Camera shake for impact
        this.cameras.main.shake(400, 0.02);
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
        // Calculate and award points for the completed quiz
    awardQuizPoints() {
        if (!this.questions || this.questions.length === 0) return;
        
        // Calculate average answer time
        const totalAnswerTime = this.answerTimes.reduce((sum, time) => sum + time, 0);
        const averageAnswerTime = totalAnswerTime / this.answerTimes.length;
        
        // Estimate time per question (can be customized per quiz)
        const timePerQuestion = 10; // seconds
        
        // Prepare quiz results for point calculation
        const quizResults = {
            correctAnswers: this.correctAnswers,
            totalQuestions: this.questions.length,
            comboCount: this.maxComboReached,
            averageAnswerTime: averageAnswerTime,
            timePerQuestion: timePerQuestion,
            topic: this.courseTopic,
            difficulty: this.difficulty
        };
        
        // Award points through GameManager
        const pointsEarned = gameManager.awardQuizPoints(quizResults);
        
        console.log(`Quiz completed! Earned ${pointsEarned} points.`);
        console.log(`Stats: ${this.correctAnswers}/${this.questions.length} correct, Max combo: ${this.maxComboReached}, Avg time: ${averageAnswerTime.toFixed(1)}s`);
        
        return pointsEarned;
    }
    
    /**
     * Check if tutorial is blocking interactions
     */
    isTutorialBlocking() {
        return this.tutorialManager && this.tutorialManager.isRunning();
    }
    
    /**
     * Check for tutorials and show them if appropriate
     */
    checkAndShowTutorial() {
        // Don't show tutorials if one is already active
        if (this.tutorialManager.isRunning()) {
            return;
        }
        
        // Check for first-time tutorial
        if (TUTORIAL_TRIGGERS.firstTime(this) && !this.tutorialFlags.firstTimeTutorialShown) {
            this.showTutorial('firstTime');
            this.tutorialFlags.firstTimeTutorialShown = true;
            return;
        }
        
        // Check for combo tutorial
        if (TUTORIAL_TRIGGERS.combo(this) && !this.tutorialFlags.comboTutorialShown) {
            this.showTutorial('combo');
            this.tutorialFlags.comboTutorialShown = true;
            return;
        }
        
        // Check for low health tutorial
        if (TUTORIAL_TRIGGERS.lowHealth(this) && !this.tutorialFlags.lowHealthWarningShown) {
            this.showTutorial('lowHealth');
            this.tutorialFlags.lowHealthWarningShown = true;
            return;
        }
        
        // Check for victory tutorial
        if (TUTORIAL_TRIGGERS.victory(this) && !this.tutorialFlags.victoryTutorialShown) {
            this.showTutorial('victory');
            this.tutorialFlags.victoryTutorialShown = true;
            return;
        }
    }
    
    /**
     * Show tutorial of specified type
     * @param {string} tutorialType - Type of tutorial to show
     */
    showTutorial(tutorialType) {
        const steps = prepareTutorialSteps(this, tutorialType);
        
        const callbacks = {
            onComplete: () => {
                console.log(`Tutorial '${tutorialType}' completed`);
                
                // Mark first-time tutorial as seen in localStorage
                if (tutorialType === 'firstTime') {
                    localStorage.setItem('sci-high-tutorial-seen', 'true');
                }
                
                // Resume game timer if it was paused
                if (this.gameTimer && this.gameTimer.isPaused) {
                    this.gameTimer.resume();
                }
            },
            onSkip: () => {
                console.log(`Tutorial '${tutorialType}' skipped`);
                
                // Mark as seen even if skipped
                if (tutorialType === 'firstTime') {
                    localStorage.setItem('sci-high-tutorial-seen', 'true');
                }
                
                // Resume game timer if it was paused
                if (this.gameTimer && this.gameTimer.isPaused) {
                    this.gameTimer.resume();
                }
            },
            onStepComplete: (stepIndex) => {
                console.log(`Tutorial step ${stepIndex} completed`);
            }
        };
        
        this.tutorialManager.init(steps, callbacks);
    }
    
    /**
     * Force show a specific tutorial (for debug/testing)
     * @param {string} tutorialType - Type of tutorial to force show
     */
    forceTutorial(tutorialType) {
        // Temporarily disable the flag to force show
        const originalFlag = this.tutorialFlags.firstTimeTutorialShown;
        this.tutorialFlags.firstTimeTutorialShown = false;
        
        this.showTutorial(tutorialType);
        
        // Restore the flag
        this.tutorialFlags.firstTimeTutorialShown = originalFlag;
    }
    
    /**
     * Reset all tutorial flags for testing
     */
    resetTutorialFlags() {
        this.tutorialFlags = {
            firstTimeTutorialShown: false,
            powerUpTutorialShown: false,
            comboTutorialShown: false,
            lowHealthWarningShown: false,
            victoryTutorialShown: false
        };
        localStorage.removeItem('sci-high-tutorial-seen');
    }
    
    /**
     * Override checkAnswer to respect tutorial state
     */
    checkAnswer(selectedIndex, userAnswer = null) {
        console.log('checkAnswer called with:', { selectedIndex, userAnswer, gameOverState: this.gameOverState, isTutorialBlocking: this.isTutorialBlocking() });
        
        // Block answer processing during tutorial
        if (this.isTutorialBlocking()) {
            console.log('Answer blocked: Tutorial is active');
            return;
        }
        
        // Block answer processing if game is over
        if (this.gameOverState) {
            console.log('Answer blocked: Game is over');
            return;
        }
        
        console.log('Processing answer...');
        // Continue with normal answer processing
        return super.checkAnswer ? super.checkAnswer(selectedIndex, userAnswer) : this.processAnswerLogic(selectedIndex, userAnswer);
    }
    
    /**
     * Process answer logic (extracted from original checkAnswer if needed)
     */
    processAnswerLogic(selectedIndex, userAnswer = null) {
        // Record answer time
        const answerTime = (Date.now() - this.currentQuestionStartTime) / 1000;
        this.answerTimes.push(answerTime);
        
        const currentQuestion = this.questions[this.currentQuestionIndex];
        let isCorrect = false;
        
        // Handle different question types
        if (currentQuestion.type === 'fill-in-the-blank') {
            const correctAnswers = currentQuestion.correctAnswers || [];
            isCorrect = correctAnswers.some(answer => 
                userAnswer && userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()
            );
        } else if (currentQuestion.type === 'drag-and-drop') {
            isCorrect = selectedIndex === 0 && userAnswer === null;
        } else {
            const correctIndex = currentQuestion.correctIndex;
            isCorrect = selectedIndex === correctIndex;
        }

        // Calculate feedback position below the quiz box, 20% lower
        const sf = this.scaleFactor;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2 + 100 * sf;
        const boxHeight = 230 * sf;
        const feedbackY = centerY + boxHeight / 2 + (20 * sf * 1.2);

        // Pause the timer
        this.gameTimer.pause();

        if (isCorrect) {
            // Track correct answer
            this.correctAnswers++;
            
            // Update combo meter first
            this.comboMeter.updateCombo(true, sf);

            // Track max combo reached
            const currentCombo = this.comboMeter.getCurrentCombo();
            if (currentCombo > this.maxComboReached) {
                this.maxComboReached = currentCombo;
            }
            
            // Check for combo tutorial trigger
            setTimeout(() => {
                this.checkAndShowTutorial();
            }, 500); // Reduced from 1000ms to 500ms
            
            // Apply score multiplier
            const multiplier = this.comboMeter.getScoreMultiplier();
            const scoreIncrease = Math.round(1 * multiplier);
            this.score += scoreIncrease;
            
            // Damage the enemy with visual feedback
            if (this.enemyContainer) {
                this.damageCharacter(this.enemyContainer, this.playerDamage);
            }
            
            // Show feedback with combo info
            if (currentQuestion.type !== 'drag-and-drop') {
                let feedbackText = `Correct! You deal ${this.playerDamage} damage!`;
                if (multiplier > 1) {
                    feedbackText += ` (${multiplier}x Combo!)`;
                }
                showFeedback(this, feedbackText, 0x00ff00, centerX, feedbackY);
            }
            
            this.gameTimer.addTime(5);

            // Check if enemy HP reached 0
            if (this.enemyContainer && this.enemyContainer.getData('currentHP') <= 0) {
                this.battleWon = true;
                this.enemyDefeated = true;
                console.log('Enemy defeated in quiz scene! Flag set to true.');

                this.awardQuizPoints();
                
                // Play death animation before showing victory screen
                this.playEnemyDeathAnimation(() => {
                    // Check for victory tutorial
                    setTimeout(() => {
                        if (TUTORIAL_TRIGGERS.victory(this) && !this.tutorialFlags.victoryTutorialShown) {
                            this.showTutorial('victory');
                            this.tutorialFlags.victoryTutorialShown = true;
                        }
                    }, 600); // Reduced from 1000ms to 600ms
                    
                    this.gameTimer.resume();
                    showVictory(this);
                });
                return;
            }
        } else {
            // Update combo meter (resets combo)
            this.comboMeter.updateCombo(false, sf);
            
            // Play wrong answer sound
            if (this.se_wrongSound) {
                this.se_wrongSound.play();
            }
            
            showFeedback(this, "Wrong! The enemy attacks you!", 0xff0000, centerX, feedbackY);
            this.gameTimer.subtractTime(3);
            
            if (this.playerContainer) {
                this.damageCharacter(this.playerContainer, 15);
                
                const playerHP = this.playerContainer.getData('currentHP');
                
                // Check for low health tutorial trigger
                setTimeout(() => {
                    this.checkAndShowTutorial();
                }, 500); // Reduced from 1000ms to 500ms
                
                if (playerHP <= 0) {
                    this.gameTimer.resume();
                    showGameOver(this);
                    return;
                }
            }
        }

        // Continue to next question
        if (this.enemyContainer) {
            const enemyHP = this.enemyContainer.getData('currentHP');
            if (enemyHP <= 0) {
                this.battleWon = true;
                this.enemyDefeated = true;
                
                this.awardQuizPoints();
                
                setTimeout(() => {
                    this.gameTimer.resume();
                    showVictory(this);
                }, 600); // Reduced from 1500ms to 600ms
                return;
            }
        }

        // Move to next question
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.gameTimer.resume();

            if (this.currentQuestionIndex < this.questions.length) {
                this.showQuestion();
            } else {
                this.awardQuizPoints();
                showVictory(this);
            }
        }, 800); // Reduced from 2000ms to 800ms
    }    restartQuiz() {
        this.score = 0;
        this.correctAnswers = 0; // Reset correct answers counter
        this.currentQuestionIndex = 0;
        this.isQuizStarted = false;
        this.isAnswering = false; // <-- Reset answering state
        this.battleWon = false; // Reset battle won flag
        // Reset point tracking variables
        this.quizStartTime = 0;
        this.answerTimes = [];
        this.currentQuestionStartTime = 0;
        this.maxComboReached = 0;
        this.playerConfig.currentHP = gameManager.getPlayerHP(); // Get current HP from GameManager
        this.enemyHPState.currentHP = this.enemyHPState.maxHP;
        this.cleanupAllElements();
        this.gameTimer = new GameTimer(this);
        this.comboMeter = new ComboMeter(this);
        this.startQuiz(30);
    }

    /**
     * Override all critical input methods to respect tutorial state
     */
    
    // Override any fill-in-the-blank answer submission
    submitAnswer(answer) {
        if (this.isTutorialBlocking()) {
            console.log('Answer submission blocked: Tutorial is active');
            return;
        }
        
        // Block answer submission if game is over
        if (this.gameOverState) {
            console.log('Answer submission blocked: Game is over');
            return;
        }
        
        // Continue with normal answer submission
        if (super.submitAnswer) {
            return super.submitAnswer(answer);
        }
        
        // Default behavior if no parent method
        return this.checkAnswer(null, answer);
    }
    
    // Override drag and drop handling
    handleDragDrop(dragObject, dropZone) {
        if (this.isTutorialBlocking()) {
            console.log('Drag and drop blocked: Tutorial is active');
            return;
        }
        
        // Continue with normal drag and drop processing
        if (super.handleDragDrop) {
            return super.handleDragDrop(dragObject, dropZone);
        }
    }
    
    // Override power-up usage
    usePowerUp(powerUpType) {
        if (this.isTutorialBlocking()) {
            console.log('Power-up usage blocked: Tutorial is active');
            return;
        }
        
        // Continue with normal power-up usage
        if (super.usePowerUp) {
            return super.usePowerUp(powerUpType);
        }
    }
    
    // Override pause/resume functionality
    pauseGame() {
        if (this.isTutorialBlocking()) {
            console.log('Game pause blocked: Tutorial is active');
            return;
        }
        
        // Continue with normal pause
        if (this.gameTimer) {
            this.gameTimer.pause();
        }
    }
    
    resumeGame() {
        if (this.isTutorialBlocking()) {
            console.log('Game resume blocked: Tutorial is active');
            return;
        }
        
        // Continue with normal resume
        if (this.gameTimer) {
            this.gameTimer.resume();
        }
    }
}