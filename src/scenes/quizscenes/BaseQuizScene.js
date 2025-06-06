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

        console.log('INIT:', data);
        this.enemyConfig = data.enemyConfig || {
            spriteKey: 'boxenemy',
            maxHP: 100,
            label: 'Enemy',
        };
        
        // Initialize enemy HP state only once
        if (this.enemyHPState.maxHP !== this.enemyConfig.maxHP) {
            this.enemyHPState = {
                currentHP: this.enemyConfig.maxHP,
                maxHP: this.enemyConfig.maxHP
            };
        }

        // Initialize GameTimer
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
        this.showResults();
    }

    drawQuizBox(centerX, boxY, boxWidth, boxHeight, radius = 20) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x222222, 1);
        graphics.fillRoundedRect(centerX - boxWidth / 2, boxY - boxHeight / 2, boxWidth, boxHeight, radius);
        return graphics;
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

    // ... (keep all other methods like createPlayerUI, damageCharacter, etc. unchanged)

    showQuestion() {
        console.log('[DEBUG] Questions:', this.questions);
        console.log('[DEBUG] Current Index:', this.currentQuestionIndex);
        
        if (!this.questions || this.currentQuestionIndex >= this.questions.length) {
            this.showResults();
            return;
        }

        const { question, options } = this.questions[this.currentQuestionIndex];

        // Clean up only question-specific elements
        this.cleanupQuestionElements();

        const centerX = 612;
        const boxY = 350;
        const boxWidth = 1050; 
        const boxHeight = 600;

        // Draw quiz box and create game elements (same as before)
        const box = this.drawQuizBox(centerX, boxY, boxWidth, boxHeight);
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

        // Create enemy HP bar and container (same as before)
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

        // Create player UI
        const playerY = boxY + boxHeight / 2 + 200;
        this.createPlayerUI(centerX, playerY);

        // Show question
        const questionText = this.add.text(centerX, boxY + boxHeight / 2 + 30, `Q${this.currentQuestionIndex + 1}: ${question}`, {
            fontSize: '20px',
            fill: '#fff',
            wordWrap: { width: 600 },
            align: 'center'
        }).setOrigin(0.5);
        this.quizElements.push(questionText);

        // Show options
        const startY = boxY + boxHeight / 2 + 100;
        options.forEach((option, index) => {
            const x = index % 2 === 0 ? centerX - 200 : centerX + 200;
            const y = startY + Math.floor(index / 2) * 70;

            const optionText = this.add.text(x, y, option, {
                fontSize: '18px',
                backgroundColor: '#444',
                padding: 10,
                align: 'center'
            })
                .setInteractive()
                .setOrigin(0.5)
                .on('pointerdown', () => this.checkAnswer(index));

            this.quizElements.push(optionText);
        });

        // SIMPLIFIED TIMER HANDLING using GameTimer
        const timerX = centerX + (boxWidth / 2) - 100;
        const timerY = boxY - (boxHeight / 2) + 40;
        
        // Create timer using GameTimer class
        const timerElements = this.gameTimer.create(timerX, timerY, 30);
        
        console.log('Timer created using GameTimer class');
    }

    cleanupQuestionElements() {
        console.log('=== CLEANING UP QUESTION ELEMENTS ===');
        
        this.quizElements.forEach((el, index) => {
            if (el && el.active) {
                console.log(`Destroying quiz element ${index}:`, el.constructor.name);
                el.destroy();
            }
        });
        this.quizElements = [];
        
        this.enemyContainer = null;
        this.playerContainer = null;
        
        console.log('Question cleanup complete');
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
        const correctIndex = this.questions[this.currentQuestionIndex].correctIndex;

        if (selectedIndex === correctIndex) {
            this.score++;
            this.showFeedback("Correct! You attack the enemy!", 0x00ff00);
            
            // Add time for correct answer using GameTimer
            this.gameTimer.addTime(5, 30);
            
            if (this.enemyContainer) {
                this.damageCharacter(this.enemyContainer, 20);
            }
        } else {
            this.showFeedback("Wrong! The enemy attacks you!", 0xff0000);
            
            // Subtract time for wrong answer using GameTimer
            this.gameTimer.subtractTime(5);
            
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
            if (this.currentQuestionIndex < this.questions.length) {
                this.showQuestion();
            } else {
                this.showResults();
            }
        });
    }

    restartQuiz() {
        this.score = 0;
        this.currentQuestionIndex = 0;
        
        // Reset HP states
        this.playerConfig.currentHP = this.playerConfig.maxHP;
        this.enemyHPState.currentHP = this.enemyHPState.maxHP;

        // Reset timer using GameTimer
        this.gameTimer = new GameTimer(this);
        
        this.showQuestion();

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

    // Add game over method
    showGameOver() {
        // Clean up all elements including timer
        this.cleanupAllElements();

        createBackButton(this, 'ComputerLab');

        const gameOverText = this.add.text(612, 300, 'GAME OVER!', { 
            fontSize: '32px', 
            fill: '#ff0000',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        const defeatText = this.add.text(612, 350, 'You have been defeated...', { 
            fontSize: '20px', 
            fill: '#fff' 
        }).setOrigin(0.5);
        
        const restartButton = this.add.text(612, 420, "Try Again", { 
            fontSize: '20px', 
            backgroundColor: '#444', 
            padding: 10 
        })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => {
                this.restartQuiz();
            });

        // Add to persistent elements since these should stay until explicitly removed
        this.persistentElements.push(gameOverText, defeatText, restartButton);
    }

    showResults() {
        console.log('=== SHOWING RESULTS ===');
        
        // Clean up quiz elements
        this.cleanupQuestionElements();
        
        // Destroy timer using GameTimer
        this.gameTimer.destroy();
        
        // Create results screen (same as before)
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
        
        // Rest of showResults method remains the same...
        
        console.log('Results screen created');
    }

    // Add victory method
    showVictory() {
        // Clean up all elements including timer
        this.cleanupAllElements();

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

        // Add to persistent elements
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
}