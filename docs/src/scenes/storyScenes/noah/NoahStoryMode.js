import Phaser from 'phaser';
import VNDialogueBox from '/src/ui/VNDialogueBox.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';
import { char1, onceOnlyFlags } from '/src/gameManager.js';
import { saveStoryProgress } from '/src/save.js';

export default class NoahStoryMode extends Phaser.Scene {
    constructor() {
        super('NoahStoryMode');
        this.currentChapter = 0;
        this.currentScene = 0;
        this.dialogueBox = null;
        this.storyCompleted = false;
        this.quizJustCompleted = false;
    }

    init(data) {
        // Reset any previous state
        this.quizJustCompleted = false;
        console.log('NoahStoryMode initialized');
    }

    preload() {
        // Load character sprite (using same path as carousel)
        this.load.image('Noah', 'assets/sprites/npcs/Noah.png');
        
        // Load backgrounds
        this.load.image('classroom_bg', 'assets/img/bg/classroom_day.png');
        this.load.image('library_bg', 'assets/img/bg/libraryBG.png');
        
        // Load sounds
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_correct', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_wrong', 'assets/audio/se/se_wrong.wav');
    }

    create() {
        const { width, height } = this.scale;
        
        // Initialize story progress if not exists
        if (!char1.storyProgress) {
            char1.storyProgress = {
                chapter: 0,
                scene: 0,
                completed: false
            };
        }

        this.currentChapter = char1.storyProgress.chapter || 0;
        this.currentScene = char1.storyProgress.scene || 0;

        console.log('Starting story:', { chapter: this.currentChapter, scene: this.currentScene });

        // Set up the scene based on current progress
        this.setupScene();
        
        // Back button
        createBackButton(this, 'Classroom');
        
        // Start the story
        this.startCurrentStory();
    }

    setupScene() {
        const { width, height } = this.scale;
        
        // Clear previous scene elements
        this.children.removeAll();
        
        // Determine background based on chapter
        let bgKey = 'classroom_bg';
        if (this.currentChapter === 1) {
            bgKey = 'library_bg';
        }
        
        // Add background
        this.bg = this.add.image(width / 2, height / 2, bgKey);
        this.bg.setDisplaySize(width, height);
        
        // Add dimming overlay for better readability
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        this.dimOverlay.setDepth(0); // Behind everything else
        
        // Add character sprite - behind dialogue box (half-body size)
        this.noah = this.add.image(width * 0.82, height * 0.72, 'Noah');
        this.noah.setScale(0.9); // Half-body appearance
        this.noah.setDepth(1); // Lower depth so dialogue appears in front
        
        // Re-create back button after clearing
        createBackButton(this, 'Classroom');
    }

    startCurrentStory() {
        const storyData = this.getStoryData();
        const currentStorySegment = storyData[this.currentChapter]?.scenes[this.currentScene];
        
        console.log(`Starting story: Chapter ${this.currentChapter}, Scene ${this.currentScene}`);
        console.log(`Total chapters: ${storyData.length}`);
        console.log(`Current segment exists:`, !!currentStorySegment);
        
        if (currentStorySegment) {
            this.showDialogue(currentStorySegment);
        } else {
            // Story completed or invalid chapter/scene
            if (this.currentChapter >= storyData.length) {
                console.log('Story completed - showing completion screen');
                this.showStoryComplete();
            } else {
                // Invalid scene, reset to start of current chapter
                console.log('Invalid scene, resetting to start of chapter');
                this.currentScene = 0;
                const resetStorySegment = storyData[this.currentChapter]?.scenes[this.currentScene];
                if (resetStorySegment) {
                    this.showDialogue(resetStorySegment);
                } else {
                    console.log('No valid scenes found, showing completion');
                    this.showStoryComplete();
                }
            }
        }
    }

    showDialogue(storySegment) {
        if (this.dialogueBox) {
            this.dialogueBox.destroy();
        }

        // Show code example if present
        if (storySegment.codeExample) {
            this.showCodeExample(storySegment.codeExample);
        }

        this.dialogueBox = new VNDialogueBox(
            this, 
            storySegment.dialogue, 
            () => {
                this.onDialogueComplete(storySegment);
            }
        );
    }

    showCodeExample(codeExample) {
        const { width, height } = this.scale;
        
        // Mobile responsive calculations
        const isMobile = width < 768;
        const isSmallMobile = width < 480;
        
        // Responsive box dimensions
        const boxWidthRatio = isMobile ? 0.9 : 0.7; // Wider on mobile
        const boxHeightRatio = isMobile ? 0.5 : 0.4; // Taller on mobile
        const boxWidth = width * boxWidthRatio;
        const boxHeight = height * boxHeightRatio;
        
        // Responsive positioning
        const boxX = width * 0.5; // Center horizontally
        const boxY = height * 0.4;
        
        // Create responsive code display area
        const codeBox = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x1e1e1e, 0.9);
        const strokeWidth = isMobile ? 2 : 4;
        codeBox.setStrokeStyle(strokeWidth, 0x4a90e2);
        codeBox.setDepth(5); // Above Noah (depth 1) but below dialogue (depth 10)
        
        // Responsive font sizing
        let fontSize = 22;
        if (isSmallMobile) {
            fontSize = 16;
        } else if (isMobile) {
            fontSize = 18;
        }
        
        // Responsive text styling
        const codeText = this.add.text(boxX, boxY, codeExample.code, {
            fontFamily: 'Courier New, monospace',
            fontSize: `${fontSize}px`,
            color: '#00ff00',
            wordWrap: { width: boxWidth - 40 }, // Responsive word wrap with padding
            align: 'left',
            lineSpacing: isMobile ? 4 : 6 // Adjusted line spacing for mobile
        });
        codeText.setOrigin(0.5);
        codeText.setDepth(6); // Above code box
        
        // Responsive label
        const labelFontSize = isSmallMobile ? 14 : (isMobile ? 16 : 22);
        const labelY = boxY - (boxHeight / 2) - (30 * (isMobile ? 0.8 : 1));
        const labelPadding = isMobile ? { x: 12, y: 6 } : { x: 16, y: 8 };
        
        const codeLabel = this.add.text(boxX, labelY, codeExample.title, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${labelFontSize}px`,
            color: '#ffffff',
            backgroundColor: '#4a90e2',
            padding: labelPadding
        });
        codeLabel.setOrigin(0.5);
        codeLabel.setDepth(6); // Same as code text
        
        // Store for cleanup
        this.codeElements = [codeBox, codeText, codeLabel];
    }

    onDialogueComplete(storySegment) {
        // Clean up code example if shown
        if (this.codeElements) {
            this.codeElements.forEach(element => element.destroy());
            this.codeElements = null;
        }

        // Update progress
        if (storySegment.progressUpdate) {
            this.updateCharacterProgress(storySegment.progressUpdate);
        }

        // Check if this segment has an inline quiz
        if (storySegment.inlineQuiz) {
            this.showInlineQuiz(storySegment.inlineQuiz);
            return;
        }

        // Move to next scene/chapter
        this.currentScene++;
        const storyData = this.getStoryData();
        
        // Check if we need to move to next chapter
        if (this.currentScene >= storyData[this.currentChapter].scenes.length) {
            this.currentChapter++;
            this.currentScene = 0;
            
            // Setup new scene environment
            if (this.currentChapter < storyData.length) {
                this.setupScene();
            }
        }
        
        // Save progress
        char1.storyProgress = {
            chapter: this.currentChapter,
            scene: this.currentScene,
            completed: this.currentChapter >= storyData.length
        };

        // Save to Firebase
        this.saveProgressToFirebase();

        // Continue or complete
        if (this.currentChapter < storyData.length) {
            this.time.delayedCall(1000, () => {
                this.startCurrentStory();
            });
        } else {
            this.showStoryComplete();
        }
    }

    updateCharacterProgress(progressUpdate) {
        if (progressUpdate.quest1) {
            char1.quest1 = Math.min(char1.quest1 + progressUpdate.quest1, 100);
        }
        if (progressUpdate.quest2) {
            char1.quest2 = Math.min(char1.quest2 + progressUpdate.quest2, 100);
        }
        if (progressUpdate.quest3) {
            char1.quest3 = Math.min(char1.quest3 + progressUpdate.quest3, 100);
        }
        
        // Update descriptions
        if (progressUpdate.quest1Desc) char1.quest1Desc = progressUpdate.quest1Desc;
        if (progressUpdate.quest2Desc) char1.quest2Desc = progressUpdate.quest2Desc;
        if (progressUpdate.quest3Desc) char1.quest3Desc = progressUpdate.quest3Desc;
    }

    showStoryComplete() {
        const { width, height } = this.scale;
        
        // Completion message
        const completionDialogue = [
            "Congratulations! You've completed Noah's Web Development journey!",
            "Noah has learned the fundamentals of HTML, CSS, and JavaScript.",
            "These skills will serve as a solid foundation for web development!",
            "Continue learning and practicing to become a skilled web developer!"
        ];
        
        this.dialogueBox = new VNDialogueBox(
            this,
            completionDialogue,
            () => {
                // Mark story as completed
                char1.storyProgress.completed = true;
                onceOnlyFlags.setSeen('noah_story_completed');
                
                // Save completion to Firebase
                this.saveProgressToFirebase();
                
                // Return to classroom
                this.scene.start('Classroom');
            }
        );
    }

    showInlineQuiz(quizData) {
        const { width, height } = this.scale;
        
        // Create a larger quiz interface (50% larger)
        const quizWidth = Math.min(width * 0.9, 1200) * 1.5;
        const quizHeight = height * 0.35 * 1.5;
        const quizX = width / 2;
        const quizY = height * 0.5;

        // Background for quiz (50% larger)
        const quizBg = this.add.graphics();
        quizBg.fillStyle(0x2c3e50, 0.95);
        quizBg.fillRoundedRect(quizX - quizWidth/2, quizY - quizHeight/2, quizWidth, quizHeight, 22);
        quizBg.lineStyle(5, 0x3498db, 1);
        quizBg.strokeRoundedRect(quizX - quizWidth/2, quizY - quizHeight/2, quizWidth, quizHeight, 22);
        quizBg.setDepth(8);

        // Question text with increased size
        const questionText = this.add.text(quizX, quizY - quizHeight/2 + 60, quizData.question, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '39px', // 26px * 1.5
            color: '#ffffff',
            wordWrap: { width: quizWidth - 150 },
            align: 'center',
            lineSpacing: 12 // 8 * 1.5
        }).setOrigin(0.5);
        questionText.setDepth(9);

        // Calculate button layout with better spacing distribution
        const buttonWidth = Math.min(320 * 1.5, (quizWidth - 180) / 2);
        const buttonHeight = 65 * 1.5;
        const buttonsPerRow = 2;
        const buttonSpacing = 25 * 1.5;
        const totalButtonWidth = buttonsPerRow * buttonWidth + (buttonsPerRow - 1) * buttonSpacing;
        const startX = quizX - totalButtonWidth/2 + buttonWidth/2;

        // Position buttons with increased spacing from question
        const questionHeight = questionText.height;
        const buttonStartY = quizY - quizHeight/2 + 60 + questionHeight/2 + 180; // 120 * 1.5

        this.inlineQuizElements = [quizBg, questionText];
        
        quizData.answers.forEach((answer, index) => {
            const row = Math.floor(index / buttonsPerRow);
            const col = index % buttonsPerRow;
            const btnX = startX + col * (buttonWidth + buttonSpacing);
            const btnY = buttonStartY + row * (buttonHeight + 15);
            
            // Button background (50% larger)
            const btnBg = this.add.graphics();
            btnBg.fillStyle(0x34495e, 1);
            btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
            btnBg.lineStyle(3, 0x7f8c8d, 1);
            btnBg.strokeRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
            btnBg.setDepth(9);
            btnBg.setInteractive(new Phaser.Geom.Rectangle(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
            btnBg.setData('useHandCursor', true);

            // Button text with increased size
            const btnText = this.add.text(btnX, btnY, answer, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '30px', // 20px * 1.5
                color: '#ffffff',
                wordWrap: { width: buttonWidth - 75 },
                align: 'center',
                lineSpacing: 7.5 // 5 * 1.5
            }).setOrigin(0.5);
            btnText.setDepth(10);
            
            // Store elements
            this.inlineQuizElements.push(btnBg, btnText);
            
            // Handle click
            btnBg.on('pointerdown', () => {
                this.handleInlineQuizAnswer(index === quizData.correct, quizData);
            });
            
            // Hover effects
            btnBg.on('pointerover', () => {
                btnBg.clear();
                btnBg.fillStyle(0x4a90e2, 1);
                btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 8);
                btnBg.lineStyle(2, 0x3498db, 1);
                btnBg.strokeRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 8);
                this.sound.play('se_select');
            });
            
            btnBg.on('pointerout', () => {
                btnBg.clear();
                btnBg.fillStyle(0x34495e, 1);
                btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 8);
                btnBg.lineStyle(2, 0x7f8c8d, 1);
                btnBg.strokeRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 8);
            });
        });
    }

    handleInlineQuizAnswer(isCorrect, quizData) {
        this.sound.play(isCorrect ? 'se_correct' : 'se_wrong');
        
        // Clear quiz elements
        if (this.inlineQuizElements) {
            this.inlineQuizElements.forEach(element => element.destroy());
            this.inlineQuizElements = null;
        }
        
        if (isCorrect) {
            this.showInlineQuizSuccessFeedback(quizData);
        } else {
            this.showInlineQuizFailureFeedback(quizData);
        }
    }

    showInlineQuizSuccessFeedback(quizData) {
        const { width, height } = this.scale;
        
        // Feedback background
        const feedbackBg = this.add.graphics();
        feedbackBg.fillStyle(0x27ae60, 0.9);
        feedbackBg.fillRoundedRect(width/2 - 450, height/2 - 150, 900, 300, 22);
        feedbackBg.setDepth(10);

        // Icon
        const icon = this.add.text(width/2, height/2 - 90, '✅', {
            fontSize: '48px'
        }).setOrigin(0.5);
        icon.setDepth(11);

        // Title
        const title = this.add.text(width/2, height/2 - 30, 'Correct!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '30px',
            color: '#ffffff'
        }).setOrigin(0.5);
        title.setDepth(11);

        // Explanation
        const explanation = this.add.text(width/2, height/2 + 30, quizData.explanation || '', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '21px',
            color: '#ffffff',
            wordWrap: { width: 840 },
            align: 'center'
        }).setOrigin(0.5);
        explanation.setDepth(11);

        // Continue button
        const continueBtn = this.add.graphics();
        continueBtn.fillStyle(0xffffff, 1);
        continueBtn.fillRoundedRect(width/2 - 75, height/2 + 90, 150, 45, 12);
        continueBtn.setDepth(11);
        continueBtn.setInteractive(new Phaser.Geom.Rectangle(width/2 - 75, height/2 + 90, 150, 45), Phaser.Geom.Rectangle.Contains);
        continueBtn.setData('useHandCursor', true);

        const continueText = this.add.text(width/2, height/2 + 112, 'Continue', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px',
            color: '#000000'
        }).setOrigin(0.5);
        continueText.setDepth(12);

        this.feedbackElements = [feedbackBg, icon, title, explanation, continueBtn, continueText];
        
        continueBtn.on('pointerdown', () => {
            this.sound.play('se_confirm');
            // Clean up feedback
            this.feedbackElements.forEach(element => element.destroy());
            this.feedbackElements = null;
            // Continue to next scene
            this.continueStoryAfterInlineQuiz();
        });
    }

    showInlineQuizFailureFeedback(quizData) {
        const { width, height } = this.scale;
        
        // Background
        const feedbackBg = this.add.graphics();
        feedbackBg.fillStyle(0x000000, 0.8);
        feedbackBg.fillRect(0, 0, width, height);
        feedbackBg.setDepth(10);
        
        // Error icon
        const icon = this.add.text(width/2, height/2 - 120, '✗', {
            fontFamily: 'Arial',
            fontSize: '64px',
            color: '#f44336'
        }).setOrigin(0.5);
        icon.setDepth(11);
        
        // Title
        const title = this.add.text(width/2, height/2 - 60, 'Not quite right...', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '28px',
            color: '#f44336'
        }).setOrigin(0.5);
        title.setDepth(11);
        
        // Explanation
        const explanation = this.add.text(width/2, height/2 - 15, quizData.explanation || 'Try again and think about what you learned!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5);
        explanation.setDepth(11);
        
        // Buttons
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonY = height/2 + 60;
        const leftButtonX = width/2 - 80;
        const rightButtonX = width/2 + 80;
        
        // Try Again button
        const tryAgainBtn = this.add.graphics();
        tryAgainBtn.fillStyle(0xff6b9d, 1);
        tryAgainBtn.fillRoundedRect(leftButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 12);
        tryAgainBtn.setDepth(11);
        tryAgainBtn.setInteractive(new Phaser.Geom.Rectangle(leftButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        tryAgainBtn.setData('useHandCursor', true);

        const tryAgainText = this.add.text(leftButtonX, buttonY, 'Try Again', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        tryAgainText.setDepth(12);
        
        // Continue button
        const continueBtn = this.add.graphics();
        continueBtn.fillStyle(0x666666, 1);
        continueBtn.fillRoundedRect(rightButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 12);
        continueBtn.setDepth(11);
        continueBtn.setInteractive(new Phaser.Geom.Rectangle(rightButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        continueBtn.setData('useHandCursor', true);

        const continueText = this.add.text(rightButtonX, buttonY, 'Continue', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        continueText.setDepth(12);

        this.feedbackElements = [feedbackBg, icon, title, explanation, tryAgainBtn, tryAgainText, continueBtn, continueText];
        
        // Try Again button handler
        tryAgainBtn.on('pointerdown', () => {
            this.sound.play('se_confirm');
            // Clean up feedback
            this.feedbackElements.forEach(element => element.destroy());
            this.feedbackElements = null;
            // Show the quiz again
            this.showInlineQuiz(quizData);
        });

        // Continue button handler
        continueBtn.on('pointerdown', () => {
            this.sound.play('se_confirm');
            // Clean up feedback
            this.feedbackElements.forEach(element => element.destroy());
            this.feedbackElements = null;
            // Continue to next scene without completing quiz
            this.continueStoryAfterInlineQuiz();
        });

        // Hover effects for Try Again button
        tryAgainBtn.on('pointerover', () => {
            tryAgainBtn.clear();
            tryAgainBtn.fillStyle(0xff8ac4, 1);
            tryAgainBtn.fillRoundedRect(leftButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 12);
        });

        tryAgainBtn.on('pointerout', () => {
            tryAgainBtn.clear();
            tryAgainBtn.fillStyle(0xff6b9d, 1);
            tryAgainBtn.fillRoundedRect(leftButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 12);
        });

        // Hover effects for Continue button
        continueBtn.on('pointerover', () => {
            continueBtn.clear();
            continueBtn.fillStyle(0x888888, 1);
            continueBtn.fillRoundedRect(rightButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 12);
        });

        continueBtn.on('pointerout', () => {
            continueBtn.clear();
            continueBtn.fillStyle(0x666666, 1);
            continueBtn.fillRoundedRect(rightButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 12);
        });
    }

    continueStoryAfterInlineQuiz() {
        // Move to next scene/chapter
        this.currentScene++;
        const storyData = this.getStoryData();
        
        // Check if we need to move to next chapter
        if (this.currentScene >= storyData[this.currentChapter].scenes.length) {
            this.currentChapter++;
            this.currentScene = 0;
            
            // Setup new scene environment
            if (this.currentChapter < storyData.length) {
                this.setupScene();
            }
        }
        
        // Save progress
        char1.storyProgress = {
            chapter: this.currentChapter,
            scene: this.currentScene,
            completed: this.currentChapter >= storyData.length
        };

        // Save to Firebase
        this.saveProgressToFirebase();

        // Continue or complete
        if (this.currentChapter < storyData.length) {
            this.time.delayedCall(1000, () => {
                this.startCurrentStory();
            });
        } else {
            this.showStoryComplete();
        }
    }

    getStoryData() {
        return [
            // Chapter 0: Introduction to Web Development
            {
                title: "Chapter 1: The Beginning of Web Development",
                scenes: [
                    {
                        dialogue: [
                            "Hi there! I'm Noah, and I'm excited to learn web development!",
                            "Web development is the process of building and maintaining websites.",
                            "There are three core technologies we need to master:",
                            "HTML for structure, CSS for styling, and JavaScript for interactivity!"
                        ],
                        progressUpdate: {
                            quest1: 10,
                            quest1Desc: "Started learning web development fundamentals"
                        }
                    },
                    {
                        dialogue: [
                            "Let's start with HTML - HyperText Markup Language!",
                            "HTML is like the skeleton of a website. It provides structure.",
                            "HTML uses tags to define different parts of a webpage.",
                            "Here's what a basic HTML structure looks like:"
                        ],
                        codeExample: {
                            title: "Basic HTML Structure",
                            code: `<!DOCTYPE html>
<html>
<head>
    <title>My First Page</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>This is my first webpage!</p>
</body>
</html>`
                        },
                        progressUpdate: {
                            quest1: 15,
                            quest1Desc: "Learned HTML basics and structure"
                        }
                    },
                    {
                        dialogue: [
                            "HTML tags come in pairs: opening and closing tags.",
                            "<h1> creates a large heading, and </h1> closes it.",
                            "<p> creates a paragraph, and </p> closes it.",
                            "The content goes between the opening and closing tags!"
                        ],
                        codeExample: {
                            title: "HTML Tags Example",
                            code: `<h1>This is a heading</h1>
<h2>This is a smaller heading</h2>
<p>This is a paragraph of text.</p>
<strong>This text is bold!</strong>
<em>This text is italic!</em>`
                        },
                        progressUpdate: {
                            quest1: 20,
                            quest1Desc: "Understanding HTML tags and their usage"
                        }
                    },
                    {
                        dialogue: [
                            "Now let's test what you've learned so far!",
                            "Quick question: What does HTML stand for?"
                        ],
                        inlineQuiz: {
                            question: "What does HTML stand for?",
                            answers: [
                                "Hyper Text Markup Language",
                                "Home Tool Markup Language",
                                "Hyperlinks and Text Markup Language",
                                "Hyper Text Making Language"
                            ],
                            correct: 0,
                            explanation: "HTML stands for HyperText Markup Language. It's the standard markup language for creating web pages."
                        }
                    }
                ]
            },
            // Chapter 1: CSS Styling
            {
                title: "Chapter 2: Making it Beautiful with CSS",
                scenes: [
                    {
                        dialogue: [
                            "Great job! Now that we understand HTML structure, let's make it look good!",
                            "CSS stands for Cascading Style Sheets.",
                            "CSS controls how HTML elements appear on the page.",
                            "Colors, fonts, layouts, and animations - CSS does it all!"
                        ],
                        progressUpdate: {
                            quest2: 15,
                            quest2Desc: "Started learning CSS fundamentals"
                        }
                    },
                    {
                        dialogue: [
                            "CSS works with selectors and properties.",
                            "Selectors target HTML elements to style.",
                            "Properties define what aspect to change.",
                            "Here's how to style a heading and paragraph:"
                        ],
                        codeExample: {
                            title: "Basic CSS Styling",
                            code: `h1 {
    color: blue;
    font-size: 32px;
    text-align: center;
}

p {
    color: #333;
    font-family: Arial, sans-serif;
    line-height: 1.6;
}`
                        },
                        progressUpdate: {
                            quest2: 25,
                            quest2Desc: "Learning CSS selectors and properties"
                        }
                    },
                    {
                        dialogue: [
                            "Let's check your understanding!",
                            "Which CSS property changes the text color?"
                        ],
                        inlineQuiz: {
                            question: "Which CSS property is used to change the text color?",
                            answers: [
                                "font-color",
                                "text-color", 
                                "color",
                                "background-color"
                            ],
                            correct: 2,
                            explanation: "The 'color' property is used to change the text color in CSS. 'background-color' changes the background, not the text."
                        }
                    },
                    {
                        dialogue: [
                            "Perfect! CSS can make beautiful layouts too!",
                            "We can position elements, create columns, and more.",
                            "The 'display' property is very important for layouts.",
                            "Here's how to create a simple centered container:"
                        ],
                        codeExample: {
                            title: "CSS Layout Example",
                            code: `.container {
    width: 80%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
    border-radius: 8px;
}`
                        },
                        progressUpdate: {
                            quest2: 35,
                            quest2Desc: "Understanding CSS layouts and positioning"
                        }
                    }
                ]
            },
            // Chapter 2: JavaScript Interactivity
            {
                title: "Chapter 3: Adding Life with JavaScript",
                scenes: [
                    {
                        dialogue: [
                            "Excellent work with CSS! Now for the exciting part - JavaScript!",
                            "JavaScript makes websites interactive and dynamic.",
                            "It can respond to user clicks, validate forms, and much more!",
                            "JavaScript is a programming language that runs in the browser."
                        ],
                        progressUpdate: {
                            quest3: 15,
                            quest3Desc: "Started learning JavaScript basics"
                        }
                    },
                    {
                        dialogue: [
                            "JavaScript uses variables to store data.",
                            "Functions let us organize our code into reusable blocks.",
                            "We can select HTML elements and change them!",
                            "Here's a simple example of JavaScript in action:"
                        ],
                        codeExample: {
                            title: "JavaScript Basics",
                            code: `// Variables
let message = "Hello, World!";
let count = 0;

// Function
function greetUser(name) {
    return "Hello, " + name + "!";
}

// Using the function
let greeting = greetUser("Noah");
console.log(greeting);`
                        },
                        progressUpdate: {
                            quest3: 25,
                            quest3Desc: "Learning JavaScript variables and functions"
                        }
                    },
                    {
                        dialogue: [
                            "Time for another quick check!",
                            "How do you declare a variable in JavaScript?"
                        ],
                        inlineQuiz: {
                            question: "Which keyword is used to declare a variable in modern JavaScript?",
                            answers: [
                                "variable",
                                "let",
                                "declare",
                                "make"
                            ],
                            correct: 1,
                            explanation: "The 'let' keyword is used to declare variables in modern JavaScript. You can also use 'const' for constants and 'var' (older method)."
                        }
                    },
                    {
                        dialogue: [
                            "Great! JavaScript can interact with HTML elements!",
                            "We can change text, colors, and respond to clicks.",
                            "Event listeners let us respond to user actions.",
                            "Here's how to make a button that changes text:"
                        ],
                        codeExample: {
                            title: "JavaScript DOM Interaction",
                            code: `// Get an element by its ID
let button = document.getElementById('myButton');
let text = document.getElementById('myText');

// Add event listener
button.addEventListener('click', function() {
    text.textContent = 'Button was clicked!';
    text.style.color = 'red';
});`
                        },
                        progressUpdate: {
                            quest3: 40,
                            quest3Desc: "Understanding JavaScript DOM manipulation"
                        }
                    },
                    {
                        dialogue: [
                            "Excellent work! You've learned the three pillars of web development!",
                            "HTML provides structure, CSS adds style, and JavaScript adds interactivity.",
                            "These three technologies work together to create amazing websites.",
                            "Keep practicing and building projects to improve your skills!"
                        ],
                        progressUpdate: {
                            quest1: 25,
                            quest2: 15,
                            quest3: 20,
                            quest1Desc: "Completed HTML fundamentals",
                            quest2Desc: "Completed CSS fundamentals", 
                            quest3Desc: "Completed JavaScript fundamentals"
                        }
                    }
                ]
            }
        ];
    }

    // Helper method to save progress to Firebase
    async saveProgressToFirebase() {
        try {
            const progressData = {
                chapter: this.currentChapter,
                scene: this.currentScene,
                completed: char1.storyProgress?.completed || false,
                lastUpdated: new Date().toISOString()
            };

            console.log('Saving Noah story progress to Firebase:', progressData);
            await saveStoryProgress('noah', progressData);
        } catch (error) {
            console.error('Failed to save Noah story progress to Firebase:', error);
        }
    }
}
