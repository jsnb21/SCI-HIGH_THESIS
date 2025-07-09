export default class BaseQuizScene extends Phaser.Scene {
    // Modified constructor - add separate arrays for better element management
    constructor(config) {
        super(config);
        this.currentQuestionIndex = 0;
        this.score = 0;
        
        // OPTION 3: Separate arrays for different types of elements
        this.quizElements = [];      // Only for question-specific elements
        this.timerElements = [];     // Only for timer elements
        this.persistentElements = []; // For elements that should persist across questions
        
        this.enemyHpBarHeight = 10;

        this.timeLeft = 30;
        this.timerEvent = null;
        this.timerText = null;
        this.timerBackground = null;
        this.timerStarted = false;
        
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
            spriteKey: 'goblinNerd',
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

        // Reset timer only when starting a new quiz (not between questions)
        if (data.resetTimer !== false) {
            this.timeLeft = data.timerDuration || 30;
            this.timerStarted = false;
        }
        
        console.log('enemyConfig set to:', this.enemyConfig);
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('enemy', 'assets/enemy.png');

        // You can preload other enemies too:
        this.load.image('goblin', 'assets/enemies/goblin.png');
        this.load.image('dragon', 'assets/enemies/dragon.png');
        this.load.image('goblinNerd', 'assets/sprites/enemies/goblinNerd.png');

        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        // DON'T create timer here - it will be created in showQuestion()
        // this.timerText = this.add.text(400, 50, `Time: ${this.timeLeft}`, {...}); // REMOVED

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        console.log('CREATE: enemyConfig is', this.enemyConfig);
        
        if (!this.enemyConfig) {
            console.error('enemyConfig is undefined!');
            return;
        }
        
        // Don't create enemy UI here - it will be created in showQuestion()
    }

    // Modified method to create timer and add to timerElements array
    createTimerInQuizBox(x, y, duration) {
        this.timeLeft = duration;

        // Create timer with background for better visibility
        this.timerBackground = this.add.graphics();
        this.timerBackground.fillStyle(0x000000, 0.7);
        this.timerBackground.fillRoundedRect(x - 60, y - 20, 120, 40, 10);

        this.timerText = this.add.text(x, y, `Time: ${this.timeLeft}`, {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Add timer elements to separate timerElements array
        this.timerElements.push(this.timerBackground, this.timerText);

        // Store the position for updates
        this.timerX = x;
        this.timerY = y;

        // Start the timer event only if it doesn't exist
        if (!this.timerEvent) {
            this.timerEvent = this.time.addEvent({
                delay: 1000,
                callback: this.updateTimerInQuizBox,
                callbackScope: this,
                loop: true,
            });
        }
    }

    // Enhanced updateTimerPosition method with more debugging
    updateTimerPosition(x, y) {
        console.log('=== UPDATE TIMER POSITION ===');
        console.log('New position:', x, y);
        console.log('Timer background exists:', !!this.timerBackground);
        console.log('Timer background active:', this.timerBackground?.active);
        console.log('Timer text exists:', !!this.timerText);
        console.log('Timer text active:', this.timerText?.active);
        console.log('Timer elements array length:', this.timerElements.length);
        
        // Store new position
        this.timerX = x;
        this.timerY = y;
        
        // Check if timer elements still exist and are active before updating
        if (this.timerBackground && this.timerBackground.active) {
            console.log('Clearing and redrawing timer background...');
            this.timerBackground.clear();
            this.timerBackground.fillStyle(0x000000, 0.7);
            this.timerBackground.fillRoundedRect(x - 60, y - 20, 120, 40, 10);
            console.log('Timer background redrawn');
        } else if (this.timerStarted) {
            console.log('Timer background missing/inactive, recreating...');
            // Timer was destroyed but should still exist - recreate it
            this.recreateTimerElements(x, y);
            return; // Exit early since recreateTimerElements handles everything
        }
        
        if (this.timerText && this.timerText.active) {
            console.log('Updating timer text position and content...');
            this.timerText.setPosition(x, y);
            this.timerText.setText(`Time: ${this.timeLeft}`);
            console.log('Timer text updated');
        } else {
            console.log('Timer text missing/inactive!');
            if (this.timerStarted) {
                this.recreateTimerElements(x, y);
            }
        }
        
        console.log('=== END UPDATE TIMER POSITION ===');
    }

    // Also add debugging to the recreateTimerElements method
    recreateTimerElements(x, y) {
        console.log('=== RECREATING TIMER ELEMENTS ===');
        console.log('Previous timer text active:', this.timerText?.active);
        console.log('Previous timer background active:', this.timerBackground?.active);
        console.log('Timer elements array before cleanup:', this.timerElements.length);
        
        // Clean up any destroyed references
        this.timerBackground = null;
        this.timerText = null;
        
        // Clear timer elements array to avoid duplicates
        this.timerElements.forEach((el, index) => {
            console.log(`Cleaning up timer element ${index}:`, el?.constructor?.name, 'active:', el?.active);
            if (el && el.active) {
                el.destroy();
            }
        });
        this.timerElements = [];
        
        console.log('Creating new timer background...');
        // Recreate timer elements
        this.timerBackground = this.add.graphics();
        this.timerBackground.fillStyle(0x000000, 0.7);
        this.timerBackground.fillRoundedRect(x - 60, y - 20, 120, 40, 10);

        console.log('Creating new timer text...');
        this.timerText = this.add.text(x, y, `Time: ${this.timeLeft}`, {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Apply color based on current time
        if (this.timeLeft <= 10) {
            this.timerText.setFill('#ff0000');
        } else if (this.timeLeft <= 20) {
            this.timerText.setFill('#ffff00');
        }

        // Add to timerElements array ONLY
        this.timerElements.push(this.timerBackground, this.timerText);
        console.log('Timer elements recreated. New count:', this.timerElements.length);
        console.log('New timer text active:', this.timerText?.active);
        console.log('New timer background active:', this.timerBackground?.active);
        console.log('=== END RECREATION ===');
    }
    // Modified timer update method
    updateTimerInQuizBox() {
        this.timeLeft--;
        if (this.timerText && this.timerText.active) {
            this.timerText.setText(`Time: ${this.timeLeft}`);
            
            // Change color when time is running low
            if (this.timeLeft <= 10) {
                this.timerText.setFill('#ff0000'); // Red when 10 seconds or less
            } else if (this.timeLeft <= 20) {
                this.timerText.setFill('#ffff00'); // Yellow when 20 seconds or less
            }
        }

        if (this.timeLeft <= 0) {
            if (this.timerEvent) {
                this.timerEvent.remove();
                this.timerEvent = null;
            }
            this.handleTimeUp();
        }
    }

    // Simplified timer update - just update the display, don't move elements
    updateTimerDisplay() {
        this.timeLeft--;
        
        // Stop timer immediately when it hits 0 to prevent negative numbers
        if (this.timeLeft <= 0) {
            this.timeLeft = 0; // Ensure it doesn't go negative
            
            if (this.timerEvent) {
                this.timerEvent.remove();
                this.timerEvent = null;
            }
            
            // Update display one last time to show 0
            if (this.timerText && this.timerText.active) {
                this.timerText.setText(`Time: ${this.timeLeft}`);
                this.timerText.setFill('#ff0000');
            }
            
            this.handleTimeUp();
            return; // Exit early to prevent further updates
        }
        
        if (this.timerText && this.timerText.active) {
            this.timerText.setText(`Time: ${this.timeLeft}`);
            
            // Change color when time is running low
            if (this.timeLeft <= 10) {
                this.timerText.setFill('#ff0000'); // Red when 10 seconds or less
            } else if (this.timeLeft <= 20) {
                this.timerText.setFill('#ffff00'); // Yellow when 20 seconds or less
            }
        } else {
            console.warn('Timer text is not active during update!');
        }
    }

    handleTimeUp() {
        console.log('=== TIME UP ===');
        
        // Stop the timer event immediately
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
        
        // Show time up message briefly before results
        const timeUpText = this.add.text(612, 100, "TIME'S UP!", {
            fontSize: '32px',
            fill: '#ff0000',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Make it flash for attention
        this.tweens.add({
            targets: timeUpText,
            alpha: 0.3,
            duration: 200,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                timeUpText.destroy();
                // Show results after the flash animation
                this.showResults();
            }
        });
        
        console.log('=== END TIME UP ===');
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
        
        // Add to quiz elements for cleanup (but not timer elements)
        this.quizElements.push(this.playerContainer);
    }

    // Simplified approach - always recreate timer elements for each question
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

        // Clean up only question-specific elements (NOT timer elements)
        this.cleanupQuestionElements();

        const centerX = 612;
        const boxY = 350;
        const boxWidth = 1050; 
        const boxHeight = 600;

        // Draw quiz box background
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

        // SIMPLIFIED TIMER HANDLING - Always recreate timer for each question
        const timerX = centerX + (boxWidth / 2) - 100;
        const timerY = boxY - (boxHeight / 2) + 40;
        
        // Clean up existing timer elements first
        if (this.timerText) {
            this.timerText.destroy();
            this.timerText = null;
        }
        if (this.timerBackground) {
            this.timerBackground.destroy();
            this.timerBackground = null;
        }
        
        // Always create fresh timer elements
        console.log('Creating fresh timer elements at:', timerX, timerY);
        this.timerBackground = this.add.graphics();
        this.timerBackground.fillStyle(0x000000, 0.7);
        this.timerBackground.fillRoundedRect(timerX - 60, timerY - 20, 120, 40, 10);

        this.timerText = this.add.text(timerX, timerY, `Time: ${this.timeLeft}`, {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Apply color based on current time
        if (this.timeLeft <= 10) {
            this.timerText.setFill('#ff0000');
        } else if (this.timeLeft <= 20) {
            this.timerText.setFill('#ffff00');
        }

        // Create timer event only once
        if (!this.timerEvent) {
            this.timerEvent = this.time.addEvent({
                delay: 1000,
                callback: this.updateTimerDisplay,
                callbackScope: this,
                loop: true,
            });
        }
        
        console.log('Timer elements created. Text active:', this.timerText?.active, 'Background active:', this.timerBackground?.active);
    }

    cleanupQuestionElements() {
        console.log('=== CLEANING UP QUESTION ELEMENTS ===');
        console.log('Quiz elements to clean:', this.quizElements.length);
        console.log('Timer elements (should NOT be cleaned):', this.timerElements.length);
        
        // Clean up only question-specific elements (NOT timer elements)
        this.quizElements.forEach((el, index) => {
            if (el && el.active) {
                console.log(`Destroying quiz element ${index}:`, el.constructor.name);
                el.destroy();
            }
        });
        this.quizElements = [];
        
        // Clear container references (they'll be recreated)
        this.enemyContainer = null;
        this.playerContainer = null;
        
        console.log('Question cleanup complete. Timer elements remaining:', this.timerElements.length);
        console.log('Timer text active:', this.timerText?.active);
        console.log('Timer background active:', this.timerBackground?.active);
        console.log('=== END CLEANUP ===');
    }

    // OPTION 3: New method to clean up timer elements specifically
    cleanupTimerElements() {
        // Clean up timer elements
        this.timerElements.forEach(el => {
            if (el && el.active) {
                el.destroy();
            }
        });
        this.timerElements = [];
        
        // Clean up timer event
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
        
        // Clear timer references
        this.timerText = null;
        this.timerBackground = null;
        this.timerStarted = false;
    }

    // OPTION 3: New method to clean up persistent elements
    cleanupPersistentElements() {
        this.persistentElements.forEach(el => {
            if (el && el.active) {
                el.destroy();
            }
        });
        this.persistentElements = [];
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
            this.timeLeft = Math.min(this.timeLeft + 5, 30); // Cap at 30 seconds
            // Player deals damage to enemy for correct answer
            if (this.enemyContainer) {
                this.damageCharacter(this.enemyContainer, 20);
            }
        } else {
            this.showFeedback("Wrong! The enemy attacks you!", 0xff0000);
            // Enemy deals damage to player for wrong answer
            this.timeLeft = this.timeLeft - 5; // Reduce time for wrong answer
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
        this.time.delayedCall(800, () => { // Reduced from 1500ms to 800ms
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
        // Clean up all elements including timer
        this.cleanupAllElements();

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

    // OPTION 3: Updated method to clean up all elements using separate arrays
    cleanupAllElements() {
        this.cleanupQuestionElements();
        this.cleanupTimerElements(); 
        this.cleanupPersistentElements();
    }

    // Modified restartQuiz method
    restartQuiz() {
        this.score = 0;
        this.currentQuestionIndex = 0;
        
        // Reset HP states
        this.playerConfig.currentHP = this.playerConfig.maxHP;
        this.enemyHPState.currentHP = this.enemyHPState.maxHP;

        // Reset timer
        this.timeLeft = 30; // or whatever initial duration you want
        this.timerStarted = false;
        
        // Clean up existing timer
        this.cleanupTimerElements();
        
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
        console.log('=== SHOWING RESULTS ===');
        
        // Clean up ALL quiz-related elements but NOT persistent elements (like back button)
        this.cleanupQuestionElements();
        
        // Clean up timer elements specifically
        if (this.timerText) {
            this.timerText.destroy();
            this.timerText = null;
        }
        if (this.timerBackground) {
            this.timerBackground.destroy();
            this.timerBackground = null;
        }
        
        // Make sure timer event is stopped
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
        
        console.log('All quiz elements cleaned up');

        // Create results screen elements
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
        
        // Add score performance message
        const percentage = Math.round((this.score / this.questions.length) * 100);
        let performanceMessage = '';
        let messageColor = '#fff';
        
        if (percentage >= 80) {
            performanceMessage = 'Excellent work!';
            messageColor = '#00ff00';
        } else if (percentage >= 60) {
            performanceMessage = 'Good job!';
            messageColor = '#ffff00';
        } else {
            performanceMessage = 'Keep practicing!';
            messageColor = '#ff6600';
        }
        
        const performanceText = this.add.text(612, 310, performanceMessage, {
            fontSize: '20px',
            fill: messageColor,
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        const restart = this.add.text(612, 380, "Restart Quiz", { 
            fontSize: '20px', 
            backgroundColor: '#444', 
            padding: { x: 20, y: 10 },
            fontFamily: 'Arial'
        })
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on('pointerover', () => {
                restart.setStyle({ backgroundColor: '#666' });
            })
            .on('pointerout', () => {
                restart.setStyle({ backgroundColor: '#444' });
            })
            .on('pointerdown', () => {
                // Clean up results screen
                finishedText.destroy();
                scoreText.destroy();
                performanceText.destroy();
                restart.destroy();
                
                // Reset game state
                this.score = 0;
                this.currentQuestionIndex = 0;
                
                // Reset HP states
                this.playerConfig.currentHP = this.playerConfig.maxHP;
                this.enemyHPState.currentHP = this.enemyHPState.maxHP;
                
                // Reset timer
                this.timeLeft = 30;
                this.timerStarted = false;
                
                // Start new quiz
                this.showQuestion();
            });

        console.log('Results screen created');
        console.log('=== END SHOWING RESULTS ===');
    }
}