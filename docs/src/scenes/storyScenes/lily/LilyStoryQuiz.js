import Phaser from 'phaser';
import { createBackButton } from '/src/components/buttons/backbutton.js';
import { getScaleInfo, scaleFontSize, scaleDimension } from '/src/utils/mobileUtils.js';

export default class LilyStoryQuiz extends Phaser.Scene {
    constructor() {
        super('LilyStoryQuiz');
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.quizData = null;
        this.returnScene = 'LilyStoryMode';
        this.returnData = {};
    }

    init(data) {
        if (data) {
            this.quizData = data.quizData;
            this.returnScene = data.returnScene || 'LilyStoryMode';
            this.returnData = data.returnData || {};
            this.currentQuestionIndex = 0;
            this.score = 0;
        }
    }

    preload() {
        // Load sounds
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_wrong', 'assets/audio/se/se_wrong.wav');
    }

    create() {
        const { width, height } = this.scale;
        
        // Background
        this.cameras.main.setBackgroundColor('#2a1a3e');
        
        // Sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        this.se_wrongSound = this.sound.add('se_wrong');
        
        // Title
        this.add.text(width / 2, 80, "Lily's Python Quiz", {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '36px',
            color: '#ff6b9d',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Progress indicator
        this.progressText = this.add.text(width / 2, 130, '', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Question container
        this.questionContainer = this.add.container(0, 0);
        
        // Back button
        createBackButton(this, this.returnScene, this.returnData);
        
        // Start the quiz
        this.showQuestion();
    }

    showQuestion() {
        if (!this.quizData || !this.quizData.questions || this.currentQuestionIndex >= this.quizData.questions.length) {
            this.showResults();
            return;
        }

        const { width, height } = this.scale;
        
        // Get scale information for mobile responsiveness
        const scaleInfo = getScaleInfo();
        
        const question = this.quizData.questions[this.currentQuestionIndex];
        
        // Clear previous question
        this.questionContainer.removeAll(true);
        
        // Update progress
        this.progressText.setText(`Question ${this.currentQuestionIndex + 1} of ${this.quizData.questions.length}`);
        
        // Question text
        const questionText = this.add.text(width / 2, scaleDimension(200, scaleInfo), question.question, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${scaleFontSize(24, scaleInfo)}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            wordWrap: { width: width - 100 },
            align: 'center'
        }).setOrigin(0.5);
        
        this.questionContainer.add(questionText);
        
        // Answer options
        const startY = scaleDimension(280, scaleInfo);
        const buttonSpacing = scaleDimension(80, scaleInfo);
        const buttonWidth = scaleDimension(600, scaleInfo);
        const buttonHeight = scaleDimension(60, scaleInfo);
        
        question.options.forEach((option, index) => {
            const y = startY + (index * buttonSpacing);
            
            // Button background
            const button = this.add.rectangle(width / 2, y, buttonWidth, buttonHeight, 0xff6b9d)
                .setStrokeStyle(scaleDimension(3, scaleInfo), 0x000000)
                .setInteractive({ useHandCursor: true });
            
            // Button text
            const buttonText = this.add.text(width / 2, y, option, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${scaleFontSize(18, scaleInfo)}px`,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: scaleDimension(2, scaleInfo),
                wordWrap: { width: buttonWidth - scaleDimension(50, scaleInfo) },
                align: 'center'
            }).setOrigin(0.5);
            
            this.questionContainer.add(button);
            this.questionContainer.add(buttonText);
            
            // Hover effects
            button.on('pointerover', () => {
                button.setFillStyle(0xff85b3);
                this.se_hoverSound.play();
            });
            
            button.on('pointerout', () => {
                button.setFillStyle(0xff6b9d);
            });
            
            // Click handler
            button.on('pointerdown', () => {
                this.selectAnswer(index, question.correct, button, buttonText);
            });
        });
    }

    selectAnswer(selectedIndex, correctIndex, button, buttonText) {
        // Disable all buttons
        this.questionContainer.list.forEach(item => {
            if (item.input) {
                item.disableInteractive();
            }
        });
        
        const isCorrect = selectedIndex === correctIndex;
        
        if (isCorrect) {
            this.score++;
            button.setFillStyle(0x4caf50); // Green for correct
            this.se_confirmSound.play();
        } else {
            button.setFillStyle(0xf44336); // Red for wrong
            this.se_wrongSound.play();
            
            // Also highlight the correct answer
            const correctButton = this.questionContainer.list.find((item, index) => {
                return item.input && Math.floor((index - 1) / 2) === correctIndex;
            });
            if (correctButton) {
                correctButton.setFillStyle(0x4caf50);
            }
        }
        
        // Show next question after a delay
        this.time.delayedCall(1500, () => {
            this.currentQuestionIndex++;
            this.showQuestion();
        });
    }

    showResults() {
        const { width, height } = this.scale;
        
        // Get scale information for mobile responsiveness
        const scaleInfo = getScaleInfo();
        
        // Clear question container
        this.questionContainer.removeAll(true);
        this.progressText.setText('');
        
        // Results
        const totalQuestions = this.quizData.questions.length;
        const percentage = Math.round((this.score / totalQuestions) * 100);
        
        this.add.text(width / 2, height / 2 - 100, 'Quiz Complete!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '48px',
            color: '#ff6b9d',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        this.add.text(width / 2, height / 2 - 20, `Score: ${this.score}/${totalQuestions} (${percentage}%)`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Lily's feedback
        let feedback = "Keep practicing and you'll get better!";
        if (percentage >= 80) {
            feedback = "Excellent work! You're a Python star!";
        } else if (percentage >= 60) {
            feedback = "Good job! You're getting the hang of it!";
        }
        
        this.add.text(width / 2, height / 2 + 40, `Lily says: "${feedback}"`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '20px',
            color: '#ff6b9d',
            stroke: '#000000',
            strokeThickness: 2,
            wordWrap: { width: width - 100 },
            align: 'center'
        }).setOrigin(0.5);
        
        // Continue button
        const buttonWidth = scaleDimension(200, scaleInfo);
        const buttonHeight = scaleDimension(50, scaleInfo);
        
        const continueBtn = this.add.rectangle(width / 2, height / 2 + scaleDimension(120, scaleInfo), buttonWidth, buttonHeight, 0xff6b9d)
            .setStrokeStyle(scaleDimension(3, scaleInfo), 0x000000)
            .setInteractive({ useHandCursor: true });
        
        this.add.text(width / 2, height / 2 + scaleDimension(120, scaleInfo), 'Continue', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${scaleFontSize(20, scaleInfo)}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        continueBtn.on('pointerover', () => {
            continueBtn.setFillStyle(0xff85b3);
            this.se_hoverSound.play();
        });
        
        continueBtn.on('pointerout', () => {
            continueBtn.setFillStyle(0xff6b9d);
        });
        
        continueBtn.on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start(this.returnScene, this.returnData);
        });
    }
}
