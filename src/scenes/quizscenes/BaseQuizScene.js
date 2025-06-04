export default class BaseQuizScene extends Phaser.Scene {
    // Modified constructor - add HP state tracking
    constructor(config) {
        super(config);
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.quizElements = []; 
        this.enemyHpBarHeight = 10;
        
        // Player HP configuration - this will persist between questions
        this.playerConfig = {
            maxHP: 100,
            currentHP: 100,
            label: 'Player'
        };
        
        // Enemy HP state - will be set in init
        this.enemyHPState = {
            currentHP: 100,
            maxHP: 100
        };
    }


    // Modified init method to preserve HP state
    init(data) {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.questions = [];

        console.log('INIT:', data);
        console.log('init called with data:', data);
        this.enemyConfig = data.enemyConfig || {
            spriteKey: 'enemy',
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
        
        console.log('enemyConfig set to:', this.enemyConfig);
    }



    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('enemy', 'assets/enemy.png');

        // You can preload other enemies too:
        this.load.image('goblin', 'assets/enemies/goblin.png');
        this.load.image('dragon', 'assets/enemies/dragon.png');
        this.load.image('boxenemy', 'assets/sprites/enemies/box.png');

        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        this.createBack();


        console.log('CREATE: enemyConfig is', this.enemyConfig);
        
        if (!this.enemyConfig) {
            console.error('enemyConfig is undefined!');
            return;
        }
        // Create Enemy UI
        console.log('create called, enemyConfig is:', this.enemyConfig);
        this.createEnemyInQuizBoxUI(400, 200); // Adjust position as needed


    }

    createEnemyInQuizBoxUI(x, y) {

        if (!this.enemyConfig) {
            console.error('enemyConfig not set in createEnemyInQuizBoxUI');
            return;
        }
        const quizBox = this.add.container(x, y);

        const sprite = this.add.sprite(100, 50, this.enemyConfig.spriteKey);
        const maxSpriteWidth = 180;
        const maxSpriteHeight = 500;
        const scaleX = maxSpriteWidth / sprite.width;
        const scaleY = maxSpriteHeight / sprite.height;
        const finalScale = Math.min(scaleX, scaleY);
        sprite.setScale(finalScale);
        quizBox.add(sprite);

        const { maxHP, label } = this.enemyConfig;

        const hpBar = this.add.graphics();
        hpBar.fillStyle(0xff0000, 1);
        hpBar.fillRect(x - 90, y - 110, 100, 10);
        const hpText = this.add.text(x - 40, y - 90, `${label} HP: ${maxHP}`, {
            fontSize: '12px',
            color: '#ffffff',
        }).setOrigin(0.5);


        quizBox.setData({
            maxHP,
            currentHP: maxHP,
            hpBar,
            hpText,
            label,
        });

        this.enemyContainer = quizBox;
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
        
        // Add to quiz elements for cleanup
        this.quizElements.push(this.playerContainer);
    }

    // Modified showQuestion method
    showQuestion() {
        console.log('[DEBUG] Questions:', this.questions);
        console.log('[DEBUG] Current Index:', this.currentQuestionIndex);
        
        if (!this.questions) {
            console.error('Questions array is null/undefined');
            return;
        }
        
        if (this.currentQuestionIndex >= this.questions.length) {
            console.error('Index out of bounds');
            this.showResults();
            return;
        }
        const { question, options } = this.questions[this.currentQuestionIndex];

        // Clean up old quiz elements (but preserve HP states)
        this.quizElements.forEach(el => {
            if (el && el.active) {
                el.destroy();
            }
        });
        this.quizElements = [];

        // Clear container references (they'll be recreated)
        this.enemyContainer = null;
        this.playerContainer = null;

        const centerX = 612;
        const boxY = 350;
        const boxWidth = 1050; 
        const boxHeight = 600;

        // Draw box background
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

        // Create enemy HP bar with current HP
        const hpBar = this.add.graphics();
        hpBar.fillStyle(0xff0000, 1);
        const enemyHpPercentage = this.enemyHPState.currentHP / this.enemyHPState.maxHP;
        hpBar.fillRect(centerX - 190, boxY - 160, 100 * enemyHpPercentage, 10);

        // Create enemy HP text with current HP
        const hpText = this.add.text(centerX - 140, boxY - 140, `${this.enemyConfig.label} HP: ${this.enemyHPState.currentHP}`, {
            fontSize: '12px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Create enemy container with current HP state
        this.enemyContainer = this.add.container(0, 0);
        this.enemyContainer.add([hpBar, hpText]); 
        this.enemyContainer.setData({
            maxHP: this.enemyHPState.maxHP,
            currentHP: this.enemyHPState.currentHP,
            hpBar,
            hpText,
            label: this.enemyConfig.label
        });
        
        // Add the container to quizElements for cleanup
        this.quizElements.push(this.enemyContainer);

        // CREATE PLAYER UI with current HP
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


    // Enhanced checkAnswer for roguelike mechanics
    checkAnswer(selectedIndex) {
        const correctIndex = this.questions[this.currentQuestionIndex].correctIndex;

        if (selectedIndex === correctIndex) {
            this.score++;
            this.showFeedback("Correct! You attack the enemy!", 0x00ff00);
            // Player deals damage to enemy for correct answer
            if (this.enemyContainer) {
                this.damageCharacter(this.enemyContainer, 20);
            }
        } else {
            this.showFeedback("Wrong! The enemy attacks you!", 0xff0000);
            // Enemy deals damage to player for wrong answer
            if (this.playerContainer) {
                this.damageCharacter(this.playerContainer, 15);
            }
            
            // Check if player is defeated
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

    // Add game over method
    showGameOver() {
        // Clean up all elements
        this.quizElements.forEach(el => {
            if (el && el.active) {
                el.destroy();
            }
        });
        this.quizElements = [];
        this.enemyContainer = null;
        this.playerContainer = null;

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

        this.quizElements.push(gameOverText, defeatText, restartButton);
    }

    // Add victory method
    showVictory() {
        // Clean up all elements
        this.quizElements.forEach(el => {
            if (el && el.active) {
                el.destroy();
            }
        });
        this.quizElements = [];
        this.enemyContainer = null;
        this.playerContainer = null;

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

        this.quizElements.push(victoryText, winText, continueButton);
    }

    // Modified restartQuiz method
    restartQuiz() {
        this.score = 0;
        this.currentQuestionIndex = 0;
        
        // Reset HP states
        this.playerConfig.currentHP = this.playerConfig.maxHP;
        this.enemyHPState.currentHP = this.enemyHPState.maxHP;
        
        this.showQuestion();
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

    showResults() {
        // Clean up all quiz elements (including enemy container)
        this.quizElements.forEach(el => {
            if (el && el.active) { // Check if element still exists and is active
                el.destroy();
            }
        });
        this.quizElements = [];
        
        // Clear the reference since it's already destroyed
        this.enemyContainer = null;

        // Clean up player UI (optional)
        if (this.playerContainer) {
            this.playerContainer.destroy(true);
            this.playerContainer = null;
        }

        const finishedText = this.add.text(612, 100, `Quiz Finished!`, { fontSize: '26px', fill: '#fff' }).setOrigin(0.5);
        const scoreText = this.add.text(612, 150, `Your Score: ${this.score} / ${this.questions.length}`, { fontSize: '22px', fill: '#fff' }).setOrigin(0.5);
        const restart = this.add.text(612, 250, "Restart Quiz", { fontSize: '20px', backgroundColor: '#444', padding: 10 })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => {
                this.score = 0;
                this.currentQuestionIndex = 0;
                this.showQuestion();
            });

        this.quizElements.push(finishedText, scoreText, restart);
    }
    
    createBack(){
        // Create "Back" button in the top right
        const buttonWidth = 100;
        const buttonHeight = 44;
        const buttonRadius = 22;
        const buttonX = this.cameras.main.width - 30 - buttonWidth / 2;
        const buttonY = 20 + buttonHeight / 2;

        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0x1e90ff, 1);
        buttonBg.fillRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            buttonRadius
        );

        const backButton = this.add.text(
            buttonX,
            buttonY,
            'Back',
            {
                font: '24px Jersey15-Regular',
                fill: '#ffffff',
                padding: { left: 0, right: 0, top: 0, bottom: 0 }
            }
        ).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('ComputerLab');
            this.restartQuiz();
            this.scene.stop()
            });

        // Make button background respond to pointer events
        buttonBg.setInteractive(
            new Phaser.Geom.Rectangle(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('ComputerLab');
            this.restartQuiz();
            this.scene.stop()
        });
    }
}