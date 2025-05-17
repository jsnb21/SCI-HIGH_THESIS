import Phaser from 'phaser';

export default class ComputerLab extends Phaser.Scene {
    constructor() {
        super({ key: 'ComputerLab' });
    }

    preload() {
        // Load questions JSON
        this.load.json('questions', 'data/questions.json');
    }

    async create() {
        this.cameras.main.setBackgroundColor('#222244');

        // Enemy setup
        this.enemyMaxHP = 10;
        this.enemyHP = this.enemyMaxHP;

        // Player setup
        this.playerMaxHP = 3;
        this.playerHP = this.playerMaxHP;

        // Draw enemy (simple rectangle as placeholder)
        this.enemy = this.add.rectangle(
            this.cameras.main.centerX, 180, 200, 200, 0x8888ff // Increased size
        ).setStrokeStyle(6, 0xffffff);

        // Enemy HP text
        this.enemyHPText = this.add.text(
            this.cameras.main.centerX, 120, `Enemy HP: ${this.enemyHP}`,
            { font: '28px Arial', color: '#ff4444' }
        ).setOrigin(0.5);

        // Player HP text
        this.playerHPText = this.add.text(
            this.cameras.main.centerX, 40, `Player HP: ${this.playerHP}`,
            { font: '24px Arial', color: '#44ff44' }
        ).setOrigin(0.5);

        // Load questions from JSON
        this.questions = this.cache.json.get('questions');
        this.currentQuestionIndex = 0; // <-- Make sure this is here!
        this.answered = false;

        // Always reset timer variables
        this.timeLeft = 30;
        this.questionStartTime = this.time.now;

        this.showQuestion();

        // Register the shutdown event
        this.events.on('shutdown', this.shutdown, this);
        this.events.on('destroy', this.destroy, this);
    }

    showQuestion() {
        // Remove previous question/choices if any
        if (this.questionText) this.questionText.destroy();
        if (this.choiceTexts) this.choiceTexts.forEach(t => t.destroy());
        if (this.timerText) this.timerText.destroy();
        if (this.timerEvent) this.timerEvent.remove();

        const q = this.questions[this.currentQuestionIndex];
        this.question = q.question;
        this.choices = q.choices;
        this.correctIndex = q.correctIndex;

        // Display question below enemy, with more space above to avoid overlap
        this.questionText = this.add.text(
            this.cameras.main.centerX,
            310, // Increased from 280 to 310 for more space below the enemy
            this.question,
            {
                font: '28px Arial',
                color: '#ffffff',
                wordWrap: { width: 700 }
            }
        ).setOrigin(0.5);

        // Display choices below question
        this.choiceTexts = [];
        const startY = 370; // Move choices a bit lower for bigger enemy
        const spacingY = 70;
        const spacingX = 320; // Horizontal space between columns
        for (let i = 0; i < this.choices.length; i++) {
            // Calculate row and column for 2 per row
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = this.cameras.main.centerX + (col === 0 ? -spacingX / 2 : spacingX / 2);
            const y = startY + row * spacingY;

            const choiceText = this.add.text(
                x, y,
                `${String.fromCharCode(65 + i)}. ${this.choices[i]}`,
                {
                    font: '24px Arial',
                    color: '#ffffff',
                    backgroundColor: '#444466',
                    padding: { left: 16, right: 16, top: 8, bottom: 8 }
                }
            ).setOrigin(0.5)
             .setInteractive({ useHandCursor: true })
             .on('pointerdown', () => this.handleChoice(i));
            this.choiceTexts.push(choiceText);
        }

        this.answered = false;
        this.timeLeft = 30;
        this.questionStartTime = this.time.now;

        // Create smooth timer text
        this.timerText = this.add.text(this.cameras.main.centerX, 60, `Time: ${this.timeLeft}`, {
            font: '24px Arial',
            color: '#ffcc00'
        }).setOrigin(0.5);

        // Smooth timer event (updates every frame)
        this.timerEvent = this.time.addEvent({
            delay: 20,
            loop: true,
            callback: () => {
                if (this.answered) return;
                const elapsed = (this.time.now - this.questionStartTime) / 1000;
                const remaining = Math.max(0, Math.ceil(this.timeLeft - elapsed));
                this.timerText.setText(`Time: ${remaining}`);
                if (remaining <= 0) {
                    this.answered = true;
                    this.showResult(false, "Time's up!");
                }
            }
        });
    }

    handleChoice(index) {
        if (this.answered) return;
        this.answered = true;
        const isCorrect = index === this.correctIndex;
        this.showResult(isCorrect, isCorrect ? "Correct!" : "Wrong!");
        if (isCorrect) {
            this.damageEnemy(1);
        } else {
            this.damagePlayer(1);
        }
    }

    damageEnemy(amount) {
        this.enemyHP = Math.max(0, this.enemyHP - amount);
        this.enemyHPText.setText(`Enemy HP: ${this.enemyHP}`);

        // Flash enemy red
        this.enemy.setFillStyle(0xff2222);
        this.time.delayedCall(200, () => {
            this.enemy.setFillStyle(0x8888ff);
        });

        // Optionally, check for enemy defeat
        if (this.enemyHP <= 0) {
            this.time.delayedCall(1000, () => {
                this.scene.start('MainHub');
            });
        } else {
            // Next question after short delay
            this.time.delayedCall(1200, () => {
                this.currentQuestionIndex++;
                if (this.currentQuestionIndex < this.questions.length) {
                    this.showQuestion();
                } else {
                    this.scene.start('MainHub');
                }
            });
        }
    }

    damagePlayer(amount) {
        this.playerHP = Math.max(0, this.playerHP - amount);
        this.playerHPText.setText(`Player HP: ${this.playerHP}`);

        // Flash player HP text red
        this.playerHPText.setColor('#ff2222');
        this.time.delayedCall(200, () => {
            this.playerHPText.setColor('#44ff44');
        });

        // Check for player defeat
        if (this.playerHP <= 0) {
            // Prevent further input and stop timer
            this.answered = true;
            if (this.timerEvent) this.timerEvent.remove();

            // Destroy question and choices
            if (this.questionText) this.questionText.destroy();
            if (this.choiceTexts) this.choiceTexts.forEach(t => t.destroy());
            if (this.resultText) this.resultText.destroy();

            // Dim the whole screen except "YOU FAILED"
            this.add.rectangle(
                this.cameras.main.centerX, this.cameras.main.centerY,
                this.cameras.main.width, this.cameras.main.height,
                0x000000, 0.7
            ).setOrigin(0.5).setDepth(1000);

            // Draw a less dim rectangle behind the text for focus
            this.add.rectangle(
                this.cameras.main.centerX, this.cameras.main.centerY, 500, 200, 0x000000, 0.85
            ).setOrigin(0.5).setDepth(1001);

            // "YOU FAILED" text on top (centered)
            this.add.text(
                this.cameras.main.centerX, this.cameras.main.centerY - 30, "YOU FAILED",
                { font: '64px Arial', color: '#ff2222', fontStyle: 'bold' }
            ).setOrigin(0.5).setDepth(1002);

            // Smooth countdown
            const countdownSeconds = 3;
            let countdownStart = this.time.now;
            const countdownText = this.add.text(
                this.cameras.main.centerX, this.cameras.main.centerY + 50,
                `Returning to MainHub in ${countdownSeconds}...`,
                { font: '28px Arial', color: '#ffffff' }
            ).setOrigin(0.5).setDepth(1002);

            const countdownTimer = this.time.addEvent({
                delay: 100,
                loop: true,
                callback: () => {
                    const elapsed = (this.time.now - countdownStart) / 1000;
                    const remaining = Math.max(0, Math.ceil(countdownSeconds - elapsed));
                    countdownText.setText(`Returning to MainHub in ${remaining}...`);
                    if (remaining <= 0) {
                        countdownTimer.remove();
                        this.scene.start('MainHub');
                    }
                }
            });
        } else {
            // Next question after short delay
            this.time.delayedCall(1200, () => {
                this.currentQuestionIndex++;
                if (this.currentQuestionIndex < this.questions.length) {
                    this.showQuestion();
                } else {
                    this.scene.start('MainHub');
                }
            });
        }
    }

    showResult(isCorrect, message) {
        this.timerEvent.remove();
        // Highlight correct answer
        this.choiceTexts[this.correctIndex].setStyle({ backgroundColor: '#228B22' }); // Green
        if (!isCorrect) {
            // Highlight wrong answer if chosen
            this.choiceTexts.forEach((text, i) => {
                if (text.input && text.input.enabled && i !== this.correctIndex) {
                    text.setStyle({ backgroundColor: '#8B2222' }); // Red for wrong
                }
            });
        }
        // Show result message
        if (this.resultText) this.resultText.destroy();
        this.resultText = this.add.text(this.cameras.main.centerX, 600, message, {
            font: '32px Arial',
            color: isCorrect ? '#00ff00' : '#ff3333'
        }).setOrigin(0.5);

        // Proceed after a short delay if enemy is not defeated
        if (this.enemyHP > 0) {
            this.time.delayedCall(1000, () => {
                if (this.resultText) this.resultText.destroy();
            });
        }
    }

    shutdown() {
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
    }

    destroy() {
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
    }
}