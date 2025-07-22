import Phaser from 'phaser';
import VNDialogueBox from '../../ui/VNDialogueBox.js';
import { createBackButton } from '../../components/buttons/backbutton.js';
import { char1 } from '../../gameManager.js';

export default class NoahStoryQuiz extends Phaser.Scene {
    constructor() {
        super('NoahStoryQuiz');
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.questions = [];
        this.chapterType = 'html'; // Will be set when scene starts
    }

    init(data) {
        this.chapterType = data.chapter || 'html';
        this.questions = this.getQuestionsForChapter(this.chapterType);
        this.currentQuestionIndex = 0;
        this.score = 0;
    }

    preload() {
        // Load backgrounds
        this.load.image('classroom_bg', 'assets/img/bg/classroom_day.png');
        
        // Load sounds
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_correct', 'assets/audio/se/se_confirm.wav'); // Reuse confirm sound
        this.load.audio('se_wrong', 'assets/audio/se/se_wrong.wav');
    }

    create() {
        const { width, height } = this.scale;
        
        // Background
        this.bg = this.add.image(width / 2, height / 2, 'classroom_bg');
        this.bg.setDisplaySize(width, height);
        
        // Add dimming overlay for better readability
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        this.dimOverlay.setDepth(0); // Behind everything else
        
        // Start quiz
        this.showQuestion();
        
        // Back button
        createBackButton(this, 'NoahStoryMode');
    }

    showQuestion() {
        const { width, height } = this.scale;
        
        // Clear previous question elements
        if (this.questionElements) {
            this.questionElements.forEach(element => element.destroy());
        }
        this.questionElements = [];

        const question = this.questions[this.currentQuestionIndex];
        
        // Progress indicator
        const progressText = this.add.text(width / 2, height * 0.1, 
            `Question ${this.currentQuestionIndex + 1} of ${this.questions.length}`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '20px',
            color: '#1e90ff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.questionElements.push(progressText);
        
        // Question text
        const questionText = this.add.text(width / 2, height * 0.25, question.question, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: width * 0.8 },
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.questionElements.push(questionText);
        
        // Code example if present
        if (question.code) {
            const codeBox = this.add.rectangle(width / 2, height * 0.45, 500, 120, 0x1e1e1e, 0.9);
            codeBox.setStrokeStyle(2, 0x4a90e2);
            this.questionElements.push(codeBox);
            
            const codeText = this.add.text(width / 2, height * 0.45, question.code, {
                fontFamily: 'Courier New, monospace',
                fontSize: '16px',
                color: '#00ff00',
                wordWrap: { width: 480 },
                align: 'left'
            }).setOrigin(0.5);
            this.questionElements.push(codeText);
        }
        
        // Answer buttons
        const startY = question.code ? height * 0.6 : height * 0.45;
        const buttonHeight = 50;
        const buttonSpacing = 70;
        
        question.answers.forEach((answer, index) => {
            const y = startY + (index * buttonSpacing);
            
            const button = this.add.rectangle(width / 2, y, 600, buttonHeight, 0x4caf50);
            button.setStrokeStyle(2, 0x2e7d32);
            button.setInteractive({ useHandCursor: true });
            this.questionElements.push(button);
            
            const buttonText = this.add.text(width / 2, y, answer, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '16px',
                color: '#ffffff',
                wordWrap: { width: 580 }
            }).setOrigin(0.5);
            this.questionElements.push(buttonText);
            
            // Hover effects
            button.on('pointerover', () => {
                button.setFillStyle(0x66bb6a);
                this.sound.play('se_select');
            });
            
            button.on('pointerout', () => {
                button.setFillStyle(0x4caf50);
            });
            
            // Click handler
            button.on('pointerdown', () => {
                this.selectAnswer(index);
            });
        });
    }

    selectAnswer(answerIndex) {
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect) {
            this.score++;
            this.sound.play('se_confirm');
        } else {
            this.sound.play('se_wrong');
        }
        
        // Show feedback
        this.showFeedback(isCorrect, question.explanation);
    }

    showFeedback(isCorrect, explanation) {
        const feedback = isCorrect ? 
            [`Correct! ${explanation}`] : 
            [`Wrong! ${explanation}`];
        
        this.dialogueBox = new VNDialogueBox(this, feedback, () => {
            this.nextQuestion();
        });
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex >= this.questions.length) {
            this.showResults();
        } else {
            this.showQuestion();
        }
    }

    showResults() {
        const { width, height } = this.scale;
        
        // Clear question elements
        if (this.questionElements) {
            this.questionElements.forEach(element => element.destroy());
        }
        
        const percentage = Math.round((this.score / this.questions.length) * 100);
        const grade = percentage >= 80 ? 'Excellent!' : 
                     percentage >= 60 ? 'Good!' : 'Keep practicing!';
        
        // Results display
        this.add.text(width / 2, height * 0.3, 'Quiz Complete!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '36px',
            color: '#1e90ff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        this.add.text(width / 2, height * 0.45, `Score: ${this.score}/${this.questions.length} (${percentage}%)`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.add.text(width / 2, height * 0.55, grade, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '20px',
            color: percentage >= 80 ? '#4caf50' : percentage >= 60 ? '#ff9800' : '#f44336',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Different buttons based on performance
        if (percentage >= 60) {
            // Passed - show continue button
            const continueBtn = this.add.rectangle(width / 2, height * 0.75, 200, 50, 0x4caf50);
            continueBtn.setStrokeStyle(2, 0x2e7d32);
            continueBtn.setInteractive({ useHandCursor: true });
            
            this.add.text(width / 2, height * 0.75, 'Continue to Next Chapter', {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            continueBtn.on('pointerdown', () => {
                this.sound.play('se_confirm');
                this.updateProgress();
                this.advanceToNextChapter();
            });
        } else {
            // Failed - show retry and back buttons
            const retryBtn = this.add.rectangle(width / 2 - 120, height * 0.75, 180, 50, 0xff9800);
            retryBtn.setStrokeStyle(2, 0xf57c00);
            retryBtn.setInteractive({ useHandCursor: true });
            
            this.add.text(width / 2 - 120, height * 0.75, 'Retry Quiz', {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            const backBtn = this.add.rectangle(width / 2 + 120, height * 0.75, 180, 50, 0xf44336);
            backBtn.setStrokeStyle(2, 0xd32f2f);
            backBtn.setInteractive({ useHandCursor: true });
            
            this.add.text(width / 2 + 120, height * 0.75, 'Back to Story', {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            retryBtn.on('pointerdown', () => {
                this.sound.play('se_confirm');
                // Reset quiz
                this.currentQuestionIndex = 0;
                this.score = 0;
                this.showQuestion();
            });
            
            backBtn.on('pointerdown', () => {
                this.sound.play('se_confirm');
                this.scene.start('NoahStoryMode');
            });
        }
        
        // Update character progress based on performance
        // Progress update moved to continue button handler
    }

    advanceToNextChapter() {
        // Get current chapter and advance to next
        const chapterMap = { 'html': 0, 'css': 1, 'javascript': 2 };
        const currentChapter = chapterMap[this.chapterType];
        const nextChapter = currentChapter + 1;
        
        // Update story progress to next chapter
        char1.storyProgress = {
            chapter: nextChapter,
            scene: 0,
            completed: nextChapter >= 3 // Story is complete if we've finished all 3 chapters
        };
        
        // Return to story mode which will now load the next chapter
        this.scene.start('NoahStoryMode');
    }

    updateProgress() {
        const progressAmount = 10;
        
        switch (this.chapterType) {
            case 'html':
                char1.quest1 = Math.min(char1.quest1 + progressAmount, 100);
                char1.quest1Desc = "Completed HTML quiz with good results";
                break;
            case 'css':
                char1.quest2 = Math.min(char1.quest2 + progressAmount, 100);
                char1.quest2Desc = "Completed CSS quiz with good results";
                break;
            case 'javascript':
                char1.quest3 = Math.min(char1.quest3 + progressAmount, 100);
                char1.quest3Desc = "Completed JavaScript quiz with good results";
                break;
        }
    }

    getQuestionsForChapter(chapter) {
        switch (chapter) {
            case 'html':
                return [
                    {
                        question: "What does HTML stand for?",
                        answers: [
                            "HyperText Markup Language",
                            "HyperText Making Language", 
                            "Home Tool Markup Language",
                            "Hyperlink Text Markup Language"
                        ],
                        correct: 0,
                        explanation: "HTML stands for HyperText Markup Language - it's the standard language for creating web pages."
                    },
                    {
                        question: "Which tag is used to create the largest heading?",
                        answers: ["<h6>", "<h1>", "<header>", "<head>"],
                        correct: 1,
                        explanation: "<h1> creates the largest heading, with <h6> being the smallest."
                    },
                    {
                        question: "What does this HTML code create?",
                        code: "<p>Hello <strong>World</strong>!</p>",
                        answers: [
                            "A paragraph with bold text",
                            "A heading with italic text",
                            "A link with bold text",
                            "A button with bold text"
                        ],
                        correct: 0,
                        explanation: "The <p> tag creates a paragraph, and <strong> makes the text bold."
                    }
                ];
            
            case 'css':
                return [
                    {
                        question: "What does CSS stand for?",
                        answers: [
                            "Computer Style Sheets",
                            "Cascading Style Sheets",
                            "Creative Style Sheets", 
                            "Colorful Style Sheets"
                        ],
                        correct: 1,
                        explanation: "CSS stands for Cascading Style Sheets - it controls the appearance of HTML elements."
                    },
                    {
                        question: "Which property changes the text color?",
                        answers: ["background-color", "font-color", "color", "text-color"],
                        correct: 2,
                        explanation: "The 'color' property is used to change the text color of an element."
                    },
                    {
                        question: "What will this CSS do?",
                        code: "h1 {\n  text-align: center;\n  color: blue;\n}",
                        answers: [
                            "Make h1 text centered and blue",
                            "Make h1 text left-aligned and red",
                            "Make h1 background blue and centered",
                            "Make h1 text right-aligned and blue"
                        ],
                        correct: 0,
                        explanation: "This CSS centers the h1 text and makes it blue in color."
                    }
                ];
                
            case 'javascript':
                return [
                    {
                        question: "How do you declare a variable in JavaScript?",
                        answers: ["var name;", "variable name;", "v name;", "declare name;"],
                        correct: 0,
                        explanation: "Variables in JavaScript are declared using 'var', 'let', or 'const' keywords."
                    },
                    {
                        question: "What does this JavaScript code do?",
                        code: "function greet(name) {\n  return 'Hello, ' + name;\n}",
                        answers: [
                            "Creates a greeting function",
                            "Prints a greeting",
                            "Creates a variable",
                            "Deletes text"
                        ],
                        correct: 0,
                        explanation: "This creates a function that takes a name parameter and returns a greeting message."
                    },
                    {
                        question: "How do you add an event listener to a button?",
                        answers: [
                            "button.onClick = function() {}",
                            "button.addEventListener('click', function() {})",
                            "button.addEvent('click', function() {})",
                            "button.listen('click', function() {})"
                        ],
                        correct: 1,
                        explanation: "addEventListener() is the standard method to add event handlers to elements."
                    }
                ];
                
            default:
                return [];
        }
    }
}
