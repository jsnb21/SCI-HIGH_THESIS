export default class BaseQuizScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.quizElements = []; 
    }

    preload() {
        // Common assets can be loaded here

        // Load sound effects
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

            // 👇 Call createBack *after* sounds are added
        this.createBack();

    }

    drawQuizBox(centerX, boxY, boxWidth, boxHeight, radius = 20) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x222222, 1);
        graphics.fillRoundedRect(centerX - boxWidth / 2, boxY - boxHeight / 2, boxWidth, boxHeight, radius);
        return graphics;
    }

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

        // Clean up old quiz elements
        this.quizElements.forEach(el => el.destroy());
        this.quizElements = [];


        const centerX = 612;
        const boxY = 350;
        const boxWidth = 1050; 
        const boxHeight = 600;

        // Draw box background
        const box = this.drawQuizBox(centerX, boxY, boxWidth, boxHeight);
        this.quizElements.push(box);

        // Add enemy sprite inside the box
        this.addEnemy(centerX, boxY);

        // Show question below the box
        const questionText = this.add.text(centerX, boxY + boxHeight / 2 + 30, `Q${this.currentQuestionIndex + 1}: ${question}`, {
            fontSize: '20px',
            fill: '#fff',
            wordWrap: { width: 600 },
            align: 'center'
        }).setOrigin(0.5);
        this.quizElements.push(questionText);


        // Show options below the question
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

    // To be implemented by child classes
    addEnemy(x, y) {
        throw new Error('addEnemy() must be implemented by child class');
    }

    checkAnswer(selectedIndex) {
        const correctIndex = this.questions[this.currentQuestionIndex].correctIndex;

        if (selectedIndex === correctIndex) {
            this.score++;
            this.showFeedback("Correct!", 0x00ff00);
        } else {
            this.showFeedback("Wrong!", 0xff0000);
        }

        // Go to next question after a delay
        this.time.delayedCall(1000, () => {
            this.currentQuestionIndex++;
            if (this.currentQuestionIndex < this.questions.length) {
                this.showQuestion();
            } else {
                this.showResults();
            }
        });
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
        this.quizElements.forEach(el => el.destroy());
        this.quizElements = [];

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
            this.scene.stop()
        });
    }
}