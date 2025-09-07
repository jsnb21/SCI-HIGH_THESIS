import Phaser from 'phaser';
import VNDialogueBox from '/src/ui/VNDialogueBox.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';
import { char1, onceOnlyFlags } from '/src/gameManager.js';
import { getScaleInfo, scaleFontSize, scaleDimension } from '/src/utils/mobileUtils.js';

export default class NoahStoryQuiz extends Phaser.Scene {
    constructor() {
        super('NoahStoryQuiz');
        this.chapterType = 'html'; // Default
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.questionElements = [];
        this.dialogueBox = null;
    }

    init(data) {
        console.log('NoahStoryQuiz init called with data:', data);
        this.chapterType = data?.chapter || 'html';
        console.log('Chapter type set to:', this.chapterType);
        this.loadQuestions();
    }

    preload() {
        // Load backgrounds
        this.load.image('classroom_bg', 'assets/img/bg/classroom_day.png');
        
        // Load sounds
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_correct', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_wrong', 'assets/audio/se/se_wrong.wav');
    }

    create() {
        const { width, height } = this.scale;
        
        // Background
        this.bg = this.add.image(width / 2, height / 2, 'classroom_bg');
        this.bg.setDisplaySize(width, height);
        
        // Add dimming overlay
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
        
        // Back button
        createBackButton(this, () => {
            // Return to story mode indicating quiz was not completed
            this.scene.start('NoahStoryMode', { quizCancelled: true, chapter: this.chapterType });
        });
        
        // Start quiz
        this.showQuestion();
    }

    loadQuestions() {
        // Sample questions for each chapter type
        const questionSets = {
            html: [
                {
                    question: "What does HTML stand for?",
                    answers: [
                        "HyperText Markup Language",
                        "HyperText Making Language", 
                        "Home Tool Markup Language",
                        "Hyperlink Text Markup Language"
                    ],
                    correct: 0,
                    explanation: "HTML stands for HyperText Markup Language."
                },
                {
                    question: "Which HTML tag is used to create a paragraph?",
                    code: "<p>This is a paragraph</p>",
                    answers: [
                        "<paragraph>",
                        "<p>",
                        "<para>", 
                        "<text>"
                    ],
                    correct: 1,
                    explanation: "The <p> tag is used to create paragraphs in HTML."
                }
            ],
            css: [
                {
                    question: "What does CSS stand for?",
                    answers: [
                        "Cascading Style Sheets",
                        "Computer Style Sheets",
                        "Creative Style Sheets",
                        "Colorful Style Sheets"
                    ],
                    correct: 0,
                    explanation: "CSS stands for Cascading Style Sheets."
                },
                {
                    question: "Which CSS property is used to change the text color?",
                    code: "p { color: blue; }",
                    answers: [
                        "text-color",
                        "font-color",
                        "color",
                        "text-style"
                    ],
                    correct: 2,
                    explanation: "The 'color' property is used to change the text color in CSS."
                }
            ],
            javascript: [
                {
                    question: "Which of the following is used to declare a variable in JavaScript?",
                    code: "let myVariable = 'Hello World';",
                    answers: [
                        "var",
                        "let", 
                        "const",
                        "All of the above"
                    ],
                    correct: 3,
                    explanation: "All three keywords (var, let, const) can be used to declare variables in JavaScript."
                },
                {
                    question: "How do you write a comment in JavaScript?",
                    code: "// This is a comment",
                    answers: [
                        "<!-- This is a comment -->",
                        "/* This is a comment */",
                        "// This is a comment",
                        "Both B and C are correct"
                    ],
                    correct: 3,
                    explanation: "JavaScript supports both // for single-line comments and /* */ for multi-line comments."
                }
            ]
        };
        
        this.questions = questionSets[this.chapterType] || questionSets.html;
        console.log('Questions loaded for chapter:', this.chapterType, 'Count:', this.questions.length);
    }

    showQuestion() {
        const { width, height } = this.scale;
        
        // Get scale information for mobile responsiveness
        const scaleInfo = getScaleInfo();
        
        // Clear previous elements
        if (this.questionElements) {
            this.questionElements.forEach(element => element.destroy());
            this.questionElements = [];
        }
        
        // Validate that we have questions and a current question
        if (!this.questions || this.questions.length === 0) {
            console.error('No questions loaded for chapter:', this.chapterType);
            this.loadQuestions(); // Try to reload questions
            if (!this.questions || this.questions.length === 0) {
                this.showErrorMessage('No questions available for this chapter.');
                return;
            }
        }
        
        if (this.currentQuestionIndex >= this.questions.length) {
            this.showResults();
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        
        if (!question) {
            console.error('Question not found at index:', this.currentQuestionIndex);
            this.showErrorMessage('Question data is missing.');
            return;
        }
        
        // Theme colors
        const themes = {
            html: { color: 0xe74c3c, name: 'HTML', icon: '🏗️' },
            css: { color: 0x3498db, name: 'CSS', icon: '🎨' },
            javascript: { color: 0xf1c40f, name: 'JavaScript', icon: '⚡' }
        };
        const theme = themes[this.chapterType] || themes.html;
        
        // Card dimensions - Responsive for mobile and PC
        const cardWidth = Math.min(width * 0.9, scaleDimension(1200, scaleInfo));
        const cardHeight = Math.min(height * 0.85, scaleDimension(700, scaleInfo));
        const cardX = width / 2;
        const cardY = height / 2;
        
        // Main card
        const card = this.add.graphics();
        card.fillStyle(0x2c3e50, 0.95);
        card.fillRoundedRect(cardX - cardWidth/2, cardY - cardHeight/2, cardWidth, cardHeight, scaleDimension(15, scaleInfo));
        card.lineStyle(scaleDimension(2, scaleInfo), theme.color, 1);
        card.strokeRoundedRect(cardX - cardWidth/2, cardY - cardHeight/2, cardWidth, cardHeight, scaleDimension(15, scaleInfo));
        this.questionElements.push(card);
        
        // Header
        const headerY = cardY - cardHeight/2 + 30;
        
        const chapterBadge = this.add.text(cardX, headerY, `${theme.icon} ${theme.name} Quiz`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: theme.color,
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5);
        this.questionElements.push(chapterBadge);
        
        const progress = this.add.text(cardX, headerY + 35, `Question ${this.currentQuestionIndex + 1} of ${this.questions.length}`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px',
            color: '#bdc3c7'
        }).setOrigin(0.5);
        this.questionElements.push(progress);
        
        // Progress bar
        const progressWidth = cardWidth * 0.6;
        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x34495e, 1);
        progressBg.fillRoundedRect(cardX - progressWidth/2, headerY + 45, progressWidth, 6, 3);
        this.questionElements.push(progressBg);
        
        const progressFill = this.add.graphics();
        progressFill.fillStyle(theme.color, 1);
        const fillWidth = progressWidth * ((this.currentQuestionIndex + 1) / this.questions.length);
        progressFill.fillRoundedRect(cardX - progressWidth/2, headerY + 45, fillWidth, 6, 3);
        this.questionElements.push(progressFill);
        
        // Question
        const questionY = headerY + 90; // Increased from 75
        const questionText = this.add.text(cardX, questionY, question.question, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '22px',
            color: '#ffffff',
            wordWrap: { width: cardWidth - 60 },
            align: 'center',
            lineSpacing: 12 // Increased from 8
        }).setOrigin(0.5);
        this.questionElements.push(questionText);
        
        // Code (if present)
        let codeHeight = 0;
        if (question.code) {
            codeHeight = 100; // Increased from 80
            const codeY = questionY + 70; // Increased spacing from 50
            
            const codeBox = this.add.graphics();
            codeBox.fillStyle(0x1a1a1a, 0.9);
            codeBox.fillRoundedRect(cardX - (cardWidth * 0.75)/2, codeY - 40, cardWidth * 0.75, 80, 8); // Larger box
            codeBox.lineStyle(1, theme.color, 0.5);
            codeBox.strokeRoundedRect(cardX - (cardWidth * 0.75)/2, codeY - 40, cardWidth * 0.75, 80, 8);
            this.questionElements.push(codeBox);
            
            const codeText = this.add.text(cardX, codeY, question.code, {
                fontFamily: 'Courier New',
                fontSize: '16px',
                color: '#00ff41',
                align: 'center'
            }).setOrigin(0.5);
            this.questionElements.push(codeText);
        }
        
        // Answers
        const answersY = questionY + scaleDimension(130, scaleInfo) + codeHeight; // Responsive spacing
        const answerHeight = scaleDimension(50, scaleInfo); // Responsive height
        const answerSpacing = scaleDimension(65, scaleInfo); // Responsive spacing
        const answerWidth = cardWidth * 0.85;
        
        question.answers.forEach((answer, index) => {
            const y = answersY + (index * answerSpacing);
            
            // Answer button
            const btn = this.add.graphics();
            btn.fillStyle(0x34495e, 0.8);
            btn.fillRoundedRect(cardX - answerWidth/2, y - answerHeight/2, answerWidth, answerHeight, scaleDimension(8, scaleInfo));
            btn.lineStyle(scaleDimension(1, scaleInfo), 0x7f8c8d, 0.6);
            btn.strokeRoundedRect(cardX - answerWidth/2, y - answerHeight/2, answerWidth, answerHeight, scaleDimension(8, scaleInfo));
            btn.setInteractive(new Phaser.Geom.Rectangle(cardX - answerWidth/2, y - answerHeight/2, answerWidth, answerHeight), Phaser.Geom.Rectangle.Contains);
            btn.setData('useHandCursor', true);
            this.questionElements.push(btn);
            
            // Letter badge
            const letter = this.add.graphics();
            letter.fillStyle(theme.color, 1);
            const badgeRadius = scaleDimension(15, scaleInfo); // Responsive badge size
            const badgeX = cardX - answerWidth/2 + scaleDimension(28, scaleInfo);
            letter.fillCircle(badgeX, y, badgeRadius);
            this.questionElements.push(letter);
            
            const letterText = this.add.text(badgeX, y, String.fromCharCode(65 + index), {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${scaleFontSize(16, scaleInfo)}px`, // Responsive font size
                color: '#ffffff'
            }).setOrigin(0.5);
            this.questionElements.push(letterText);
            
            // Answer text
            const answerTextX = cardX - answerWidth/2 + scaleDimension(55, scaleInfo);
            const answerText = this.add.text(answerTextX, y, answer, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${scaleFontSize(18, scaleInfo)}px`, // Responsive font size
                color: '#ecf0f1',
                wordWrap: { width: answerWidth - scaleDimension(80, scaleInfo) }, // Responsive word wrap
                lineSpacing: scaleDimension(4, scaleInfo) // Responsive line spacing
            }).setOrigin(0, 0.5);
            this.questionElements.push(answerText);
            
            // Hover effect
            btn.on('pointerover', () => {
                btn.clear();
                btn.fillStyle(theme.color, 0.3);
                btn.fillRoundedRect(cardX - answerWidth/2, y - answerHeight/2, answerWidth, answerHeight, scaleDimension(8, scaleInfo));
                btn.lineStyle(scaleDimension(1, scaleInfo), theme.color, 0.8);
                btn.strokeRoundedRect(cardX - answerWidth/2, y - answerHeight/2, answerWidth, answerHeight, scaleDimension(8, scaleInfo));
                this.sound.play('se_select');
            });
            
            btn.on('pointerout', () => {
                btn.clear();
                btn.fillStyle(0x34495e, 0.8);
                btn.fillRoundedRect(cardX - answerWidth/2, y - answerHeight/2, answerWidth, answerHeight, scaleDimension(8, scaleInfo));
                btn.lineStyle(scaleDimension(1, scaleInfo), 0x7f8c8d, 0.6);
                btn.strokeRoundedRect(cardX - answerWidth/2, y - answerHeight/2, answerWidth, answerHeight, scaleDimension(8, scaleInfo));
            });
            
            btn.on('pointerdown', () => {
                this.sound.play('se_confirm');
                this.selectAnswer(index);
            });
        });
    }

    selectAnswer(answerIndex) {
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect) {
            this.score++;
            this.sound.play('se_correct');
        } else {
            this.sound.play('se_wrong');
        }
        
        // Show feedback
        const feedback = isCorrect ? 
            [`Correct! ${question.explanation}`] : 
            [`Wrong! ${question.explanation}`];
        
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
        
        // Get scale information for mobile responsiveness
        const scaleInfo = getScaleInfo();
        
        // Clear ALL elements (both question and result elements)
        if (this.questionElements) {
            this.questionElements.forEach(element => element.destroy());
            this.questionElements = [];
        }
        if (this.resultElements) {
            this.resultElements.forEach(element => element.destroy());
            this.resultElements = [];
        }
        
        // Initialize result elements array
        this.resultElements = [];
        
        const percentage = Math.round((this.score / this.questions.length) * 100);
        const passed = percentage >= 60;
        
        // Results card
        const cardWidth = Math.min(width * 0.7, 600);
        const cardHeight = Math.min(height * 0.6, 400);
        const cardX = width / 2;
        const cardY = height / 2;
        
        const card = this.add.graphics();
        card.fillStyle(0x2c3e50, 0.95);
        card.fillRoundedRect(cardX - cardWidth/2, cardY - cardHeight/2, cardWidth, cardHeight, 15);
        card.lineStyle(2, passed ? 0x27ae60 : 0xe74c3c, 1);
        card.strokeRoundedRect(cardX - cardWidth/2, cardY - cardHeight/2, cardWidth, cardHeight, 15);
        this.resultElements.push(card);
        
        // Icon
        const icon = passed ? '🎉' : '📚';
        const iconText = this.add.text(cardX, cardY - 80, icon, { fontSize: '48px' }).setOrigin(0.5);
        this.resultElements.push(iconText);
        
        // Title
        const titleText = this.add.text(cardX, cardY - 30, 'Quiz Complete!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.resultElements.push(titleText);
        
        // Score
        const scoreText = this.add.text(cardX, cardY + 10, `Score: ${this.score}/${this.questions.length} (${percentage}%)`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '22px',
            color: passed ? '#27ae60' : '#e74c3c'
        }).setOrigin(0.5);
        this.resultElements.push(scoreText);
        
        // Buttons
        if (passed) {
            const buttonWidth = scaleDimension(280, scaleInfo);
            const buttonHeight = scaleDimension(40, scaleInfo);
            const buttonFontSize = scaleFontSize(16, scaleInfo);
            
            const continueBtn = this.add.rectangle(cardX, cardY + scaleDimension(60, scaleInfo), buttonWidth, buttonHeight, 0x27ae60);
            continueBtn.setStrokeStyle(scaleDimension(2, scaleInfo), 0xffffff);
            continueBtn.setInteractive({ useHandCursor: true });
            this.resultElements.push(continueBtn);
            
            const continueBtnText = this.add.text(cardX, cardY + scaleDimension(60, scaleInfo), 'Continue to Next Chapter', {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${buttonFontSize}px`,
                color: '#ffffff'
            }).setOrigin(0.5);
            this.resultElements.push(continueBtnText);
            
            continueBtn.on('pointerdown', () => {
                this.sound.play('se_confirm');
                this.updateProgress();
                this.advanceToNextChapter();
            });
        } else {
            // Retry button
            const smallButtonWidth = scaleDimension(120, scaleInfo);
            const smallButtonHeight = scaleDimension(40, scaleInfo);
            const smallButtonFontSize = scaleFontSize(16, scaleInfo);
            const buttonSpacing = scaleDimension(80, scaleInfo);
            const buttonY = cardY + scaleDimension(60, scaleInfo);
            
            const retryBtn = this.add.rectangle(cardX - buttonSpacing, buttonY, smallButtonWidth, smallButtonHeight, 0xf39c12);
            retryBtn.setStrokeStyle(scaleDimension(2, scaleInfo), 0xffffff);
            retryBtn.setInteractive({ useHandCursor: true });
            this.resultElements.push(retryBtn);
            
            const retryBtnText = this.add.text(cardX - buttonSpacing, buttonY, 'Retry Quiz', {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${smallButtonFontSize}px`,
                color: '#ffffff'
            }).setOrigin(0.5);
            this.resultElements.push(retryBtnText);
            
            // Back button
            const backBtn = this.add.rectangle(cardX + buttonSpacing, buttonY, smallButtonWidth, smallButtonHeight, 0x7f8c8d);
            backBtn.setStrokeStyle(scaleDimension(2, scaleInfo), 0xffffff);
            backBtn.setInteractive({ useHandCursor: true });
            this.resultElements.push(backBtn);
            
            const backBtnText = this.add.text(cardX + buttonSpacing, buttonY, 'Back to Story', {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${smallButtonFontSize}px`,
                color: '#ffffff'
            }).setOrigin(0.5);
            this.resultElements.push(backBtnText);
            
            retryBtn.on('pointerdown', () => {
                this.sound.play('se_confirm');
                // Clear result elements before restarting
                if (this.resultElements) {
                    this.resultElements.forEach(element => element.destroy());
                    this.resultElements = [];
                }
                this.currentQuestionIndex = 0;
                this.score = 0;
                this.showQuestion();
            });
            
            backBtn.on('pointerdown', () => {
                this.sound.play('se_confirm');
                this.scene.start('NoahStoryMode', { quizCancelled: true, chapter: this.chapterType });
            });
        }
    }

    updateProgress() {
        // Mark quiz as completed for current chapter, but don't advance chapter here
        // Let NoahStoryMode handle the chapter progression
        if (!char1.storyProgress.quizCompleted) {
            char1.storyProgress.quizCompleted = {};
        }
        char1.storyProgress.quizCompleted[this.chapterType] = true;
    }

    advanceToNextChapter() {
        // Return to story mode with quiz completion flag
        this.scene.start('NoahStoryMode', { quizCompleted: true, chapter: this.chapterType });
    }

    showErrorMessage(message) {
        const { width, height } = this.scale;
        
        // Clear any existing elements
        if (this.questionElements) {
            this.questionElements.forEach(element => element.destroy());
            this.questionElements = [];
        }
        
        // Show error message
        const errorText = this.add.text(width / 2, height / 2, message, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#e74c3c',
            wordWrap: { width: width * 0.8 },
            align: 'center'
        }).setOrigin(0.5);
        
        const backButton = this.add.rectangle(width / 2, height / 2 + 100, 200, 50, 0x7f8c8d);
        backButton.setStrokeStyle(2, 0xffffff);
        backButton.setInteractive({ useHandCursor: true });
        
        const backText = this.add.text(width / 2, height / 2 + 100, 'Back to Story', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        backButton.on('pointerdown', () => {
            this.sound.play('se_confirm');
            this.scene.start('NoahStoryMode', { quizCancelled: true, chapter: this.chapterType });
        });
    }
}
