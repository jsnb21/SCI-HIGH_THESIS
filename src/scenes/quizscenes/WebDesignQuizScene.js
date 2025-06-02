export default class WebDesignQuizScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WebDesignQuizScene' });
    }

    preload() {
    }

    create() {
        this.currentQuestionIndex = 0;
        this.score = 0;

        this.questions = [
            {
                question: "What does HTML stand for?",
                options: [
                    "Hyperlinks and Text Markup Language", 
                    "Hyper Text Markup Language", 
                    "Home Tool Markup Language", 
                    "Hyper Text Markup Language"
                ],
                correctIndex: 1
            },
            {
                question: "Which HTML tag is used to define an internal style sheet?",
                options: ["<style>", "<script>", "<css>"],
                correctIndex: 0
            },
            {
                question: "What does CSS stand for?",
                options: ["Colorful Style Sheets", "Cascading Style Sheets", "Creative Style Sheets"],
                correctIndex: 1
            }
        ];

        this.showQuestion();
    }

    showQuestion() {
        const { question, options } = this.questions[this.currentQuestionIndex];

        this.children.removeAll();

        const centerX = 612;
        const boxY = 300;
        const boxWidth = 500;
        const boxHeight = 200;

        // Draw box background
        const graphics = this.add.graphics();
        graphics.fillStyle(0x222222, 1);
        graphics.fillRoundedRect(centerX - boxWidth / 2, boxY - boxHeight / 2, boxWidth, boxHeight, 20);

        // Add enemy sprite inside the box
        const enemy = this.add.sprite(centerX, boxY, 'enemy').setScale(0.5).setOrigin(0.5);

        // Show question below the box
        this.add.text(centerX, boxY + boxHeight / 2 + 30, `Q${this.currentQuestionIndex + 1}: ${question}`, {
            fontSize: '20px',
            fill: '#fff',
            wordWrap: { width: 600 },
            align: 'center'
        }).setOrigin(0.5);

        // Show options below the question
        const startY = boxY + boxHeight / 2 + 100;

        options.forEach((option, index) => {
            const x = index % 2 === 0 ? centerX - 200 : centerX + 200;
            const y = startY + Math.floor(index / 2) * 70;

            this.add.text(x, y, option, {
                fontSize: '18px',
                backgroundColor: '#444',
                padding: 10,
                align: 'center'
            })
                .setInteractive()
                .setOrigin(0.5)
                .on('pointerdown', () => this.checkAnswer(index));
        });
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
        this.children.removeAll();
        this.add.text(612, 100, `Quiz Finished!`, { fontSize: '26px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(612, 150, `Your Score: ${this.score} / ${this.questions.length}`, { fontSize: '22px', fill: '#fff' }).setOrigin(0.5);

        const restart = this.add.text(612, 250, "Restart Quiz", { fontSize: '20px', backgroundColor: '#444', padding: 10 })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => {
                this.score = 0;
                this.currentQuestionIndex = 0;
                this.showQuestion();
            });
    }
}