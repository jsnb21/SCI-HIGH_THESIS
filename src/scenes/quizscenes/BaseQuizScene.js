// Import the GameTimer class
import GameTimer from '/src/components/GameTimer.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';

export default class BaseQuizScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.currentQuestionIndex = 0;
        this.score = 0;
        
        // Separate arrays for better element management
        this.quizElements = [];
        this.persistentElements = [];
        
        this.enemyHpBarHeight = 10;

        // Initialize GameTimer instead of individual timer properties
        this.gameTimer = null;
        
        // Player HP configuration
        this.playerConfig = {
            maxHP: 100,
            currentHP: 100,
            label: 'Player'
        };
        
        // Enemy HP state
        this.enemyHPState = {
            currentHP: 100,
            maxHP: 100
        };
    }

    init(data) {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.questions = [];
        this.isQuizStarted = false; // Reset quiz started flag

        console.log('INIT:', data);
        this.enemyConfig = data.enemyConfig || {
            spriteKey: 'boxenemy',
            maxHP: 100,
            label: 'Enemy',
        };
        
        // Always reset HP states when scene initializes (fresh start)
        this.playerConfig = {
            maxHP: 100,
            currentHP: 100, // Reset to full HP
            label: 'Player'
        };
        
        this.enemyHPState = {
            currentHP: this.enemyConfig.maxHP, // Reset to full HP
            maxHP: this.enemyConfig.maxHP
        };

        console.log('HP states reset - Player:', this.playerConfig.currentHP, 'Enemy:', this.enemyHPState.currentHP);

        // Initialize GameTimer ONCE for the entire quiz session
        this.gameTimer = new GameTimer(this);
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('goblin', 'assets/enemies/goblin.png');
        this.load.image('dragon', 'assets/enemies/dragon.png');
        this.load.image('boxenemy', 'assets/sprites/enemies/box.png');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        console.log('CREATE: enemyConfig is', this.enemyConfig);
        
        if (!this.enemyConfig) {
            console.error('enemyConfig is undefined!');
            return;
        }
    }

    // Method to handle when timer runs out (called by GameTimer)
    handleTimeUp() {
        this.showGameOver();
    }


        // Modified createPlayerUI to use persistent HP
    createPlayerUI(x, y) {
        // Create player container
        this.playerContainer = this.add.container(x, y);
        
        // Player sprite
        const playerSprite = this.add.sprite(0, 0, 'player');
        const maxSpriteWidth = 80;
        const maxSpriteHeight = 80;
        const scaleX = maxSpriteWidth / playerSprite.width;
        const scaleY = maxSpriteHeight / playerSprite.height;
        const finalScale = Math.min(scaleX, scaleY);
        playerSprite.setScale(finalScale);
        
        // Player HP bar background
        const hpBarBg = this.add.graphics();
        hpBarBg.fillStyle(0x444444, 1);
        hpBarBg.fillRect(-60, 50, 120, 12);
        
        // Player HP bar - use current HP from persistent state
        const hpBar = this.add.graphics();
        hpBar.fillStyle(0x00ff00, 1);
        const hpPercentage = this.playerConfig.currentHP / this.playerConfig.maxHP;
        hpBar.fillRect(-60, 50, 120 * hpPercentage, 12);
        
        // Player HP text - use current HP
        const hpText = this.add.text(0, 70, `${this.playerConfig.label} HP: ${this.playerConfig.currentHP}/${this.playerConfig.maxHP}`, {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Add elements to container
        this.playerContainer.add([playerSprite, hpBarBg, hpBar, hpText]);
        
        // Store references with current HP state
        this.playerContainer.setData({
            maxHP: this.playerConfig.maxHP,
            currentHP: this.playerConfig.currentHP,
            hpBar,
            hpText,
            label: this.playerConfig.label
        });
        
        // Add to quiz elements for cleanup (but not timer elements)
        this.quizElements.push(this.playerContainer);
    }

    // Start the quiz and initialize the timer
    startQuiz(initialTime = 30) { // Default 2 minutes for entire quiz
        if (!this.isQuizStarted) {
            this.isQuizStarted = true;
            
            // Create timer UI elements ONCE at the start
            const timerX = 1050; // Fixed position for entire quiz
            const timerY = 100;
            
            // Start the continuous timer
            const timerElements = this.gameTimer.create(timerX, timerY, initialTime);
            
            // Set depth for timer elements to ensure they appear on top
            if (timerElements.timerBackground && timerElements.timerBackground.setDepth) {
                timerElements.timerBackground.setDepth(100); // Higher than quiz box depth (0)
            }
            if (timerElements.timerText && timerElements.timerText.setDepth) {
                timerElements.timerText.setDepth(100); // Higher than quiz box depth (0)
            }
            
            // Add both timer elements to persistent elements
            this.persistentElements.push(timerElements.timerBackground, timerElements.timerText);
            
            console.log(`Quiz started with ${initialTime} seconds total time`);
            
            // Debug: Check timer depth after setting
            console.log('Timer depth after setting:', timerElements?.depth || 'still no depth');
        }
        
        // Show the first question
        this.showQuestion();
    }

    showQuestion() {
        console.log('[DEBUG] Questions:', this.questions);
        console.log('[DEBUG] Current Index:', this.currentQuestionIndex);
        
        if (!this.questions || this.currentQuestionIndex >= this.questions.length) {
            this.showResults();
            return;
        }

        const { question, options } = this.questions[this.currentQuestionIndex];

        // Clean up only question-specific elements (NOT timer elements)
        this.cleanupQuestionElements();

        const centerX = 612;
        const boxY = 350;
        const boxWidth = 1050; 
        const boxHeight = 600;

        // Draw quiz box and create game elements
        const box = this.drawQuizBox(centerX, boxY, boxWidth, boxHeight);
        console.log('Quiz box depth:', box.depth);
        this.quizElements.push(box);

        // Create enemy sprite
        const enemySprite = this.add.sprite(centerX, boxY, this.enemyConfig.spriteKey);
        const maxSpriteWidth = 400;
        const maxSpriteHeight = 300;
        const scaleX = maxSpriteWidth / enemySprite.width;
        const scaleY = maxSpriteHeight / enemySprite.height;
        const finalScale = Math.min(scaleX, scaleY);
        enemySprite.setScale(finalScale);
        this.quizElements.push(enemySprite);

        // Create enemy HP bar and container
        const hpBar = this.add.graphics();
        hpBar.fillStyle(0xff0000, 1);
        const enemyHpPercentage = this.enemyHPState.currentHP / this.enemyHPState.maxHP;
        hpBar.fillRect(centerX - 190, boxY - 160, 100 * enemyHpPercentage, 10);

        const hpText = this.add.text(centerX - 140, boxY - 140, `${this.enemyConfig.label} HP: ${this.enemyHPState.currentHP}`, {
            fontSize: '12px',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.enemyContainer = this.add.container(0, 0);
        this.enemyContainer.add([hpBar, hpText]); 
        this.enemyContainer.setData({
            maxHP: this.enemyHPState.maxHP,
            currentHP: this.enemyHPState.currentHP,
            hpBar,
            hpText,
            label: this.enemyConfig.label
        });
        
        this.quizElements.push(this.enemyContainer);

        // Show question text
        const questionText = this.add.text(centerX, boxY + boxHeight / 2 + 30, `Q${this.currentQuestionIndex + 1}: ${question}`, {
            fontSize: '20px',
            fill: '#fff',
            wordWrap: { width: 600 },
            align: 'center'
        }).setOrigin(0.5);
        this.quizElements.push(questionText);

        // Calculate positions for the bottom area (player + options)
        const bottomAreaY = boxY + boxHeight / 2 + 100; // Start position for the bottom area
        const playerX = centerX - 450; // Position player on the left side
        const optionsStartX = centerX - 200; // Center the options more to the right

        // Create player UI on the left side of the options
        this.createPlayerUI(playerX, bottomAreaY + 30);

        // Show options in a more compact layout on the right side
        options.forEach((option, index) => {
            // Arrange options in a 2x2 grid, but shifted to the right
            const x = optionsStartX + (index % 2) * 400;
            const y = bottomAreaY + Math.floor(index / 2) * 70;

            const optionText = this.add.text(x, y, option, {
                fontSize: '18px',
                backgroundColor: '#444',
                padding: 10,
                align: 'center'
            })
                .setInteractive({ useHandCursor: true })
                .setOrigin(0.5)
                .on('pointerover', () => {
                    optionText.setStyle({ backgroundColor: '#666666' });
                    this.se_hoverSound?.play();
                })
                .on('pointerout', () => {
                    optionText.setStyle({ backgroundColor: '#444444' });
                })
                .on('pointerdown', () => {
                    this.se_confirmSound?.play();
                    this.checkAnswer(index);
                });

            this.quizElements.push(optionText);
        });

        // NO TIMER CREATION HERE - timer is continuous and already running
        console.log('Question displayed, timer continues running');
    }

    // Modified cleanup to preserve timer elements
    cleanupQuestionElements() {
        console.log('=== CLEANING UP QUESTION ELEMENTS (preserving timer) ===');
        
        this.quizElements.forEach((el, index) => {
            if (el && el.active) {
                console.log(`Destroying quiz element ${index}:`, el.constructor.name);
                el.destroy();
            }
        });
        this.quizElements = [];
        
        this.enemyContainer = null;
        this.playerContainer = null;
        
        console.log('Question cleanup complete, timer preserved');
    }

    // Modified damageCharacter method to update persistent state
    damageCharacter(container, amount) {
        let hp = container.getData('currentHP');
        const maxHP = container.getData('maxHP');
        hp = Phaser.Math.Clamp(hp - amount, 0, maxHP);
        container.setData('currentHP', hp);

        // Update persistent state
        const isPlayer = container.getData('label') === 'Player';
        if (isPlayer) {
            this.playerConfig.currentHP = hp;
        } else {
            this.enemyHPState.currentHP = hp;
        }

        // Update HP bar
        const hpBar = container.getData('hpBar');
        hpBar.clear();
        
        const barColor = isPlayer ? 0x00ff00 : 0xff0000;
        hpBar.fillStyle(barColor, 1);
        
        if (isPlayer) {
            hpBar.fillRect(-60, 50, (hp / maxHP) * 120, 12);
        } else {
            // For enemy, we need to position relative to the original position
            const centerX = 612;
            const boxY = 350;
            hpBar.fillRect(centerX - 190, boxY - 160, (hp / maxHP) * 100, 10);
        }

        // Update HP text
        const hpText = container.getData('hpText');
        const label = container.getData('label');
        const hpDisplay = isPlayer ? `${hp}/${maxHP}` : hp;
        hpText.setText(`${label} HP: ${hpDisplay}`);
    }


    checkAnswer(selectedIndex) {
        // Prevent multiple clicks
        if (this.isAnswering) return;
        this.isAnswering = true;

        const correctIndex = this.questions[this.currentQuestionIndex].correctIndex;

        if (selectedIndex === correctIndex) {
            this.score++;
            this.showFeedback("Correct! You attack the enemy!", 0x00ff00);
            
            // Add time for correct answer using GameTimer
            this.gameTimer.addTime(5);
            
            if (this.enemyContainer) {
                this.damageCharacter(this.enemyContainer, 20);
            }
        } else {
            this.showFeedback("Wrong! The enemy attacks you!", 0xff0000);
            
            // Subtract time for wrong answer using GameTimer
            this.gameTimer.subtractTime(3);
            
            if (this.playerContainer) {
                this.damageCharacter(this.playerContainer, 15);
            }
            
            const playerHP = this.playerContainer.getData('currentHP');
            if (playerHP <= 0) {
                this.showGameOver();
                return;
            }
        }

        // Check if enemy is defeated
        if (this.enemyContainer) {
            const enemyHP = this.enemyContainer.getData('currentHP');
            if (enemyHP <= 0) {
                this.showVictory();
                return;
            }
        }

        // Go to next question after a delay
        this.time.delayedCall(1500, () => {
            this.currentQuestionIndex++;
            this.isAnswering = false; // Reset flag before next question
            if (this.currentQuestionIndex < this.questions.length) {
                this.showQuestion();
            } else {
                this.showGameOver();
            }
        });
    }

    restartQuiz() {
        this.score = 0;
        this.currentQuestionIndex = 0;
        this.isQuizStarted = false; // Reset quiz started flag
        
        // Reset HP states
        this.playerConfig.currentHP = this.playerConfig.maxHP;
        this.enemyHPState.currentHP = this.enemyHPState.maxHP;

        // Clean up everything including timer
        this.cleanupAllElements();

        // Create new GameTimer and restart
        this.gameTimer = new GameTimer(this);
        this.startQuiz(30); // Restart with fresh timer

        createBackButton(this, 'ComputerLab');
    }

    showFeedback(message, color) {
        const feedback = this.add.text(
            612, 400, 
            message, 
            { 
                fontSize: '22px', 
                color: Phaser.Display.Color.IntegerToColor(color).rgba 
            }
        ).setOrigin(0.5);
        
        this.tweens.add({
            targets: feedback,
            alpha: 0,
            duration: 1000,
            onComplete: () => feedback.destroy()
        });
    }

    drawQuizBox(centerX, boxY, boxWidth, boxHeight, radius = 20) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x222222, 1);
        graphics.fillRoundedRect(centerX - boxWidth / 2, boxY - boxHeight / 2, boxWidth, boxHeight, radius);
        return graphics;
    }
    
    showVictory() {
        // Clean up all elements including timer
        this.cleanupAllElements();
        this.gameTimer.destroy();

        const victoryText = this.add.text(612, 300, 'VICTORY!', { 
            fontSize: '32px', 
            fill: '#00ff00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        const winText = this.add.text(612, 350, 'You have defeated the enemy!', { 
            fontSize: '20px', 
            fill: '#fff' 
        }).setOrigin(0.5);
        
        const continueButton = this.add.text(612, 420, "Continue", { 
            fontSize: '20px', 
            backgroundColor: '#444', 
            padding: 10 
        })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => {
                this.showResults();
            });

        this.persistentElements.push(victoryText, winText, continueButton);
    }

    cleanupAllElements() {
        this.cleanupQuestionElements();
        this.cleanupPersistentElements();
    }

    // New method to clean up persistent elements
    cleanupPersistentElements() {
        this.persistentElements.forEach(el => {
            if (el && el.active) {
                el.destroy();
            }
        });
        this.persistentElements = [];
    }
    // Enhanced game over method
    showGameOver() {
        this.isAnswering = false;
        // Clean up all elements including timer
        this.cleanupAllElements();
        
        // Stop and destroy the timer
        if (this.gameTimer) {
            this.gameTimer.destroy();
        }
        
        // Create dark overlay for dramatic effect
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        overlay.setDepth(50);
        
        // Game Over title with glow effect
        const gameOverText = this.add.text(612, 250, 'GAME OVER!', {
            fontSize: '48px',
            fill: '#ff0000',
            fontFamily: 'Arial',
            stroke: '#ffffff',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 5,
                fill: true
            }
        }).setOrigin(0.5).setDepth(60);
        
        // Add pulsing animation to game over text
        this.tweens.add({
            targets: gameOverText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Defeat message
        const defeatText = this.add.text(612, 320, 'You have been defeated...', {
            fontSize: '22px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5).setDepth(60);
        
        // Show current score
        const scoreText = this.add.text(612, 360, `Questions Answered: ${this.score} / ${this.questions.length}`, {
            fontSize: '18px',
            fill: '#ffff00',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(60);
        
        // Try Again button with hover effects
        const restartButton = this.add.text(612, 430, "Try Again", {
            fontSize: '20px',
            backgroundColor: '#444444',
            padding: { x: 20, y: 10 },
            fill: '#ffffff'
        })
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .setDepth(60)
            .on('pointerover', () => {
                restartButton.setStyle({ backgroundColor: '#666666' });
                this.se_hoverSound?.play();
            })
            .on('pointerout', () => {
                restartButton.setStyle({ backgroundColor: '#444444' });
            })
            .on('pointerdown', () => {
                this.se_confirmSound?.play();
                this.restartQuiz();
            });
        
        // Back to Menu button
        const menuButton = this.add.text(612, 480, "Back to Menu", {
            fontSize: '18px',
            backgroundColor: '#333333',
            padding: { x: 15, y: 8 },
            fill: '#ffffff'
        })
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .setDepth(60)
            .on('pointerover', () => {
                menuButton.setStyle({ backgroundColor: '#555555' });
                this.se_hoverSound?.play();
            })
            .on('pointerout', () => {
                menuButton.setStyle({ backgroundColor: '#333333' });
            })
            .on('pointerdown', () => {
                this.se_confirmSound?.play();
                // Clean up everything before going back
                this.cleanupAllElements();
                this.scene.start('ComputerLab');
            });
        
        // Add fade-in animation for all elements
        const elementsToAnimate = [overlay, gameOverText, defeatText, scoreText, restartButton, menuButton];
        elementsToAnimate.forEach((element, index) => {
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: element === overlay ? 0.8 : 1, // Overlay stays semi-transparent
                duration: 500,
                delay: index * 200, // Stagger the animations
                ease: 'Power2'
            });
        });
        
        // Add to persistent elements since these should stay until explicitly removed
        this.persistentElements.push(overlay, gameOverText, defeatText, scoreText, restartButton, menuButton);
    }

    showResults() {
        console.log('=== SHOWING RESULTS ===');
        
        // Clean up quiz elements
        this.cleanupQuestionElements();
        
        // Stop and destroy timer - quiz is over
        this.gameTimer.destroy();
        
        // Create results screen
        const finishedText = this.add.text(612, 200, `Quiz Finished!`, { 
            fontSize: '32px', 
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        const scoreText = this.add.text(612, 260, `Your Score: ${this.score} / ${this.questions.length}`, { 
            fontSize: '24px', 
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // Add restart button
        const restartButton = this.add.text(612, 320, "Try Again", { 
            fontSize: '20px', 
            backgroundColor: '#444', 
            padding: 10 
        })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => {
                this.showGameOver();
            });

        // Add back button
        createBackButton(this, 'ComputerLab');
        
        console.log('Results screen created');
    }
}