import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';

export default class QuizScene extends BaseScene {
    constructor() {
        super('QuizScene');
        
        // Quiz properties
        this.currentQuestion = null;
        this.quizData = null;
        this.enemyData = null;
        this.gameplayState = null;
        this.questionIndex = 0;
        this.selectedAnswer = null;
        
        // UI elements
        this.questionText = null;
        this.answerButtons = [];
        this.titleText = null;
        this.backgroundOverlay = null;
        this.quizContainer = null;
        this.resultContainer = null;
    }

    init(data) {
        // Receive data from main gameplay scene
        this.courseTopic = data.courseTopic;
        this.enemyData = data.enemyToDestroy;
        this.selectedAnswer = null;
        this.currentQuestion = null;
        
        console.log('QuizScene initialized with:', data);
    }

    preload() {
        // Load quiz data files
        this.load.json('pythonQuiz', 'data/quizzes/python.json');
        this.load.json('javaQuiz', 'data/quizzes/java.json');
        this.load.json('cQuiz', 'data/quizzes/C.json');
        this.load.json('cppQuiz', 'data/quizzes/C++.json');
        this.load.json('csharpQuiz', 'data/quizzes/csharp.json');
        this.load.json('webdesignQuiz', 'data/quizzes/webdesign.json');
    }

    create() {
        super.create();
        
        // Create full screen background overlay
        this.backgroundOverlay = this.add.rectangle(
            this.scale.width / 2, 
            this.scale.height / 2, 
            this.scale.width, 
            this.scale.height, 
            0x000000, 
            0.85
        );
        
        // Load appropriate quiz data based on course topic
        this.loadQuizData();
        
        // Validate that we have quiz data and create interface
        if (this.currentQuestion) {
            this.createQuizInterface();
        } else {
            console.error('No quiz data available for topic:', this.courseTopic);
            this.returnToGameplay(false);
        }
    }

    loadQuizData() {
        // Get quiz data based on course topic
        const topic = this.courseTopic || 'python';
        let quizData = null;
        
        switch (topic.toLowerCase()) {
            case 'python':
                quizData = this.cache.json.get('pythonQuiz');
                break;
            case 'java':
                quizData = this.cache.json.get('javaQuiz');
                break;
            case 'c':
                quizData = this.cache.json.get('cQuiz');
                break;
            case 'c++':
                quizData = this.cache.json.get('cppQuiz');
                break;
            case 'c#':
            case 'csharp':
                quizData = this.cache.json.get('csharpQuiz');
                break;
            case 'webdesign':
                quizData = this.cache.json.get('webdesignQuiz');
                break;
            default:
                quizData = this.cache.json.get('pythonQuiz');
                break;
        }
        
        if (quizData && quizData.questions && quizData.questions.length > 0) {
            // Filter questions to only get multiple choice questions (ones with options and correctIndex)
            const multipleChoiceQuestions = quizData.questions.filter(q => 
                q.options && Array.isArray(q.options) && typeof q.correctIndex === 'number'
            );
            
            if (multipleChoiceQuestions.length > 0) {
                // Select a random multiple choice question
                this.currentQuestion = Phaser.Utils.Array.GetRandom(multipleChoiceQuestions);
                console.log('Loaded question for', topic, ':', this.currentQuestion);
            }
        }
    }

    createQuizInterface() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Create main quiz container
        this.quizContainer = this.add.container(centerX, centerY);
        
        // Create modern quiz box with gradient effect
        const quizBox = this.add.graphics();
        quizBox.fillGradientStyle(0x1a1a2e, 0x16213e, 0x0f3460, 0x533483);
        quizBox.fillRoundedRect(-350, -250, 700, 500, 20);
        quizBox.lineStyle(4, 0x64ffda);
        quizBox.strokeRoundedRect(-350, -250, 700, 500, 20);
        
        // Add glow effect
        const glowBox = this.add.graphics();
        glowBox.lineStyle(8, 0x64ffda, 0.3);
        glowBox.strokeRoundedRect(-354, -254, 708, 508, 20);
        
        this.quizContainer.add([glowBox, quizBox]);
        
        // Title with programming language
        const courseTopic = this.courseTopic || 'Programming';
        this.titleText = this.add.text(0, -200, `${courseTopic.toUpperCase()} QUIZ CHALLENGE`, {
            fontFamily: 'Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#64ffda',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(this.titleText);
        
        // Question number indicator
        const questionNumber = this.add.text(0, -160, 'Question 1 of 1', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#a0a0a0',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(questionNumber);
        
        // Question text with better formatting
        this.questionText = this.add.text(0, -80, this.currentQuestion.question, {
            fontFamily: 'Arial',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 620 },
            lineSpacing: 5
        }).setOrigin(0.5);
        this.quizContainer.add(this.questionText);
        
        // Create answer options with modern design
        this.createAnswerButtons();
        
        // Add instruction text
        const instructionText = this.add.text(0, 200, 'Click on your answer choice', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#a0a0a0',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(instructionText);
        
        // Add entrance animation
        this.quizContainer.setScale(0.8);
        this.quizContainer.setAlpha(0);
        
        this.tweens.add({
            targets: this.quizContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
    }

    createAnswerButtons() {
        const answers = this.currentQuestion.options;
        const startY = 20;
        const buttonHeight = 60;
        const buttonSpacing = 70;
        
        this.answerButtons = [];
        
        for (let i = 0; i < answers.length; i++) {
            const buttonY = startY + (i * buttonSpacing);
            
            // Create button container
            const buttonContainer = this.add.container(0, buttonY);
            
            // Create button background with gradient
            const buttonBg = this.add.graphics();
            buttonBg.fillGradientStyle(0x2d3748, 0x4a5568, 0x2d3748, 0x4a5568);
            buttonBg.fillRoundedRect(-300, -25, 600, 50, 10);
            buttonBg.lineStyle(2, 0x64ffda, 0.5);
            buttonBg.strokeRoundedRect(-300, -25, 600, 50, 10);
            
            // Create answer text
            const answerText = this.add.text(0, 0, `${String.fromCharCode(65 + i)}. ${answers[i]}`, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 560 }
            }).setOrigin(0.5);
            
            // Create interactive area
            const hitArea = this.add.rectangle(0, 0, 600, 50, 0x000000, 0);
            hitArea.setInteractive();
            
            buttonContainer.add([buttonBg, answerText, hitArea]);
            this.quizContainer.add(buttonContainer);
            
            // Store references
            this.answerButtons.push({
                container: buttonContainer,
                background: buttonBg,
                text: answerText,
                hitArea: hitArea,
                index: i,
                isSelected: false
            });
            
            // Add hover effects
            hitArea.on('pointerover', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillGradientStyle(0x4a5568, 0x64ffda, 0x4a5568, 0x64ffda);
                    buttonBg.fillRoundedRect(-300, -25, 600, 50, 10);
                    buttonBg.lineStyle(2, 0x64ffda);
                    buttonBg.strokeRoundedRect(-300, -25, 600, 50, 10);
                }
            });
            
            hitArea.on('pointerout', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillGradientStyle(0x2d3748, 0x4a5568, 0x2d3748, 0x4a5568);
                    buttonBg.fillRoundedRect(-300, -25, 600, 50, 10);
                    buttonBg.lineStyle(2, 0x64ffda, 0.5);
                    buttonBg.strokeRoundedRect(-300, -25, 600, 50, 10);
                }
            });
            
            // Add click handler
            hitArea.on('pointerdown', () => {
                this.selectAnswer(i);
            });
        }
    }

    selectAnswer(selectedIndex) {
        if (this.selectedAnswer !== null) return; // Prevent multiple selections
        
        this.selectedAnswer = selectedIndex;
        const correctIndex = this.currentQuestion.correctIndex;
        const isCorrect = selectedIndex === correctIndex;
        
        // Update button appearance to show selection
        this.answerButtons.forEach((button, index) => {
            button.isSelected = true;
            
            if (index === selectedIndex) {
                // Selected answer
                button.background.clear();
                if (isCorrect) {
                    button.background.fillGradientStyle(0x38a169, 0x68d391, 0x38a169, 0x68d391);
                } else {
                    button.background.fillGradientStyle(0xe53e3e, 0xfc8181, 0xe53e3e, 0xfc8181);
                }
                button.background.fillRoundedRect(-300, -25, 600, 50, 10);
                button.background.lineStyle(3, 0xffffff);
                button.background.strokeRoundedRect(-300, -25, 600, 50, 10);
            } else if (index === correctIndex && !isCorrect) {
                // Show correct answer if user was wrong
                button.background.clear();
                button.background.fillGradientStyle(0x38a169, 0x68d391, 0x38a169, 0x68d391);
                button.background.fillRoundedRect(-300, -25, 600, 50, 10);
                button.background.lineStyle(2, 0xffffff, 0.7);
                button.background.strokeRoundedRect(-300, -25, 600, 50, 10);
            }
            
            // Disable interaction
            button.hitArea.removeInteractive();
        });
        
        // Show result after a brief delay
        this.time.delayedCall(400, () => {
            this.showResult(isCorrect);
        });
    }

    showResult(isCorrect) {
        // Create result overlay
        this.resultContainer = this.add.container(this.scale.width / 2, this.scale.height / 2 + 300);
        
        const resultBg = this.add.graphics();
        resultBg.fillStyle(isCorrect ? 0x38a169 : 0xe53e3e, 0.9);
        resultBg.fillRoundedRect(-200, -50, 400, 100, 15);
        resultBg.lineStyle(3, 0xffffff);
        resultBg.strokeRoundedRect(-200, -50, 400, 100, 15);
        
        const resultText = this.add.text(0, -10, 
            isCorrect ? 'CORRECT!' : 'INCORRECT!', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        const rewardText = this.add.text(0, 15, 
            isCorrect ? '+100 Score, +10 Seconds' : 'Better luck next time!', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        this.resultContainer.add([resultBg, resultText, rewardText]);
        
        // Animate result appearance
        this.resultContainer.setScale(0.5);
        this.resultContainer.setAlpha(0);
        
        this.tweens.add({
            targets: this.resultContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Return to gameplay after delay
        this.time.delayedCall(1200, () => {
            this.returnToGameplay(isCorrect);
        });
    }

    returnToGameplay(isCorrect) {
        // Prepare result data to send back
        const resultData = {
            correct: isCorrect,
            enemyToDestroy: this.enemyData
        };
        
        // Animate exit
        this.tweens.add({
            targets: [this.quizContainer, this.resultContainer],
            scaleX: 0.8,
            scaleY: 0.8,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeIn',
            onComplete: () => {
                // Send completion event to main gameplay scene and stop quiz scene
                this.scene.get('MainGameplay').events.emit('quiz-completed', resultData);
                this.scene.stop();
            }
        });
    }
}
