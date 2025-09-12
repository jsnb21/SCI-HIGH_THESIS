import Phaser from 'phaser';
import VNDialogueBox from '/src/ui/VNDialogueBox.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';
import { char2, onceOnlyFlags } from '/src/gameManager.js';
import { saveStoryProgress } from '/src/save.js';

export default class LilyStoryMode extends Phaser.Scene {
    constructor() {
        super('LilyStoryMode');
        this.currentChapter = 0;
        this.currentScene = 0;
        this.dialogueBox = null;
        this.storyCompleted = false;
    }

    init(data) {
        if (data && data.chapter !== undefined) {
            this.currentChapter = data.chapter;
            this.currentScene = 0;
        }
    }

    preload() {
        // Load character sprite (using same path as carousel)
        this.load.image('Lily', 'assets/sprites/npcs/Lily.png');
        
        // Load backgrounds
        this.load.image('classroom_bg', 'assets/img/bg/classroom_day.png');
        this.load.image('library_bg', 'assets/img/bg/libraryBG.png');
        
        // Load sounds
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        const { width, height } = this.scale;
        
        // Initialize story progress if not exists
        if (!char2.storyProgress) {
            char2.storyProgress = {
                chapter: 0,
                scene: 0,
                completed: false
            };
        }

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
        if (this.currentChapter === 1 || this.currentChapter === 4) {
            bgKey = 'library_bg';
        }
        
        // Add background
        this.bg = this.add.image(width / 2, height / 2, bgKey);
        this.bg.setDisplaySize(width, height);
        
        // Add dimming overlay for better readability
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        this.dimOverlay.setDepth(0); // Behind everything else
        
        // Add character sprite - behind dialogue box (half-body size)
        this.lily = this.add.image(width * 0.82, height * 0.72, 'Lily');
        this.lily.setScale(0.9); // Half-body appearance
        this.lily.setDepth(1); // Lower depth so dialogue appears in front
        
        // Re-create back button after clearing
        createBackButton(this, 'Classroom');
    }

    startCurrentStory() {
        const storyData = this.getStoryData();
        const currentStorySegment = storyData[this.currentChapter]?.scenes[this.currentScene];
        
        if (currentStorySegment) {
            this.showDialogue(currentStorySegment);
        } else {
            // Story completed or invalid chapter/scene
            if (this.currentChapter >= storyData.length) {
                this.showStoryComplete();
            } else {
                // Invalid scene, reset to start of current chapter
                this.currentScene = 0;
                const resetStorySegment = storyData[this.currentChapter]?.scenes[this.currentScene];
                if (resetStorySegment) {
                    this.showDialogue(resetStorySegment);
                } else {
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
        codeBox.setStrokeStyle(strokeWidth, 0xff6b9d);
        codeBox.setDepth(5); // Above Lily (depth 1) but below dialogue (depth 10)
        
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
            backgroundColor: '#ff6b9d',
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

        // Check if this segment has a regular quiz
        if (storySegment.action === 'quiz' && storySegment.quizData) {
            this.showRegularQuiz(storySegment.quizData);
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
        char2.storyProgress = {
            chapter: this.currentChapter,
            scene: this.currentScene,
            completed: this.currentChapter >= storyData.length
        };

        // Save progress to Firebase
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
            char2.quest1 = Math.min(char2.quest1 + progressUpdate.quest1, 100);
        }
        if (progressUpdate.quest2) {
            char2.quest2 = Math.min(char2.quest2 + progressUpdate.quest2, 100);
        }
        if (progressUpdate.quest3) {
            char2.quest3 = Math.min(char2.quest3 + progressUpdate.quest3, 100);
        }
        
        // Update descriptions
        if (progressUpdate.quest1Desc) char2.quest1Desc = progressUpdate.quest1Desc;
        if (progressUpdate.quest2Desc) char2.quest2Desc = progressUpdate.quest2Desc;
        if (progressUpdate.quest3Desc) char2.quest3Desc = progressUpdate.quest3Desc;
    }

    async saveProgressToFirebase() {
        try {
            await saveStoryProgress('lily', char2.storyProgress);
        } catch (error) {
            console.error('Failed to save story progress to Firebase:', error);
        }
    }

    showStoryComplete() {
        const { width, height } = this.scale;
        
        // Completion message
        const completionDialogue = [
            "Congratulations! You've completed Lily's Python journey!",
            "Lily has learned the fundamentals of Python programming.",
            "These skills will serve as a solid foundation for programming!",
            "Continue learning and practicing to become a skilled programmer!"
        ];
        
        this.dialogueBox = new VNDialogueBox(
            this,
            completionDialogue,
            () => {
                // Mark story as completed
                char2.storyProgress.completed = true;
                onceOnlyFlags.setSeen('lily_story_completed');
                
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
        quizBg.fillStyle(0x1a1a2e, 0.95);
        quizBg.fillRoundedRect(quizX - quizWidth/2, quizY - quizHeight/2, quizWidth, quizHeight, 22);
        quizBg.lineStyle(5, 0xff6b9d, 1);
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
            btnBg.fillStyle(0x2e1a4d, 1);
            btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
            btnBg.lineStyle(3, 0xff6b9d, 1);
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
                btnBg.fillStyle(0xff6b9d, 0.8);
                btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
                btnBg.lineStyle(3, 0xffffff, 1);
                btnBg.strokeRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
                this.sound.play('se_select');
            });
            
            btnBg.on('pointerout', () => {
                btnBg.clear();
                btnBg.fillStyle(0x2e1a4d, 1);
                btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
                btnBg.lineStyle(3, 0xff6b9d, 1);
                btnBg.strokeRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
            });
        });
    }

    handleInlineQuizAnswer(isCorrect, quizData) {
        this.sound.play(isCorrect ? 'se_confirm' : 'se_wrong');
        
        // Clear quiz elements
        if (this.inlineQuizElements) {
            this.inlineQuizElements.forEach(element => element.destroy());
            this.inlineQuizElements = null;
        }
        
        if (isCorrect) {
            // Show success feedback and continue
            this.showInlineQuizFeedback(isCorrect, quizData, () => {
                this.continueStoryAfterInlineQuiz();
            });
        } else {
            // Show failure feedback with retry option
            this.showInlineQuizFailureFeedback(quizData);
        }
    }

    showInlineQuizFeedback(isCorrect, quizData, callback) {
        const { width, height } = this.scale;
        
        const feedbackColor = isCorrect ? 0x27ae60 : 0xe74c3c;
        const feedbackIcon = isCorrect ? '✅' : '❌';
        const feedbackTitle = isCorrect ? 'Correct!' : 'Not quite right';

        // Feedback background (50% larger)
        const feedbackBg = this.add.graphics();
        feedbackBg.fillStyle(feedbackColor, 0.9);
        feedbackBg.fillRoundedRect(width/2 - 450, height/2 - 150, 900, 300, 22);
        feedbackBg.setDepth(10);

        // Icon (50% larger)
        const icon = this.add.text(width/2, height/2 - 90, feedbackIcon, {
            fontSize: '48px' // 32px * 1.5
        }).setOrigin(0.5);
        icon.setDepth(11);

        // Title (50% larger)
        const title = this.add.text(width/2, height/2 - 30, feedbackTitle, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '30px', // 20px * 1.5
            color: '#ffffff'
        }).setOrigin(0.5);
        title.setDepth(11);

        // Explanation (50% larger)
        const explanation = this.add.text(width/2, height/2 + 30, quizData.explanation || '', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '21px', // 14px * 1.5
            color: '#ffffff',
            wordWrap: { width: 840 }, // 560 * 1.5
            align: 'center'
        }).setOrigin(0.5);
        explanation.setDepth(11);

        // Continue button (50% larger)
        const continueBtn = this.add.graphics();
        continueBtn.fillStyle(0xffffff, 1);
        continueBtn.fillRoundedRect(width/2 - 75, height/2 + 90, 150, 45, 12);
        continueBtn.setDepth(11);
        continueBtn.setInteractive(new Phaser.Geom.Rectangle(width/2 - 75, height/2 + 90, 150, 45), Phaser.Geom.Rectangle.Contains);
        continueBtn.setData('useHandCursor', true);

        const continueText = this.add.text(width/2, height/2 + 112, 'Continue', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px', // 12px * 1.5
            color: '#000000'
        }).setOrigin(0.5);
        continueText.setDepth(12);

        this.feedbackElements = [feedbackBg, icon, title, explanation, continueBtn, continueText];
        
        continueBtn.on('pointerdown', () => {
            this.sound.play('se_confirm');
            // Clean up feedback
            this.feedbackElements.forEach(element => element.destroy());
            this.feedbackElements = null;
            callback();
        });
        
        // Auto-continue after 3 seconds if no interaction
        this.time.delayedCall(3000, () => {
            if (this.feedbackElements) {
                this.feedbackElements.forEach(element => element.destroy());
                this.feedbackElements = null;
                callback();
            }
        });
    }

    showInlineQuizFailureFeedback(quizData) {
        const { width, height } = this.scale;
        
        const feedbackColor = 0xe74c3c;
        const feedbackIcon = '❌';
        const feedbackTitle = 'Not quite right';

        // Feedback background (50% larger)
        const feedbackBg = this.add.graphics();
        feedbackBg.fillStyle(feedbackColor, 0.9);
        feedbackBg.fillRoundedRect(width/2 - 450, height/2 - 180, 900, 360, 22);
        feedbackBg.setDepth(10);

        // Icon (50% larger)
        const icon = this.add.text(width/2, height/2 - 120, feedbackIcon, {
            fontSize: '48px'
        }).setOrigin(0.5);
        icon.setDepth(11);

        // Title (50% larger)
        const title = this.add.text(width/2, height/2 - 60, feedbackTitle, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '30px',
            color: '#ffffff'
        }).setOrigin(0.5);
        title.setDepth(11);

        // Explanation (50% larger)
        const explanation = this.add.text(width/2, height/2 - 15, quizData.explanation || 'Try again and think about what you learned!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '21px',
            color: '#ffffff',
            wordWrap: { width: 840 },
            align: 'center'
        }).setOrigin(0.5);
        explanation.setDepth(11);

        // Two buttons: Try Again and Continue
        const buttonWidth = 120;
        const buttonHeight = 45;
        const buttonSpacing = 40;
        const leftButtonX = width/2 - buttonWidth/2 - buttonSpacing/2;
        const rightButtonX = width/2 + buttonWidth/2 + buttonSpacing/2;
        const buttonY = height/2 + 60;

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
        char2.storyProgress = {
            chapter: this.currentChapter,
            scene: this.currentScene,
            completed: this.currentChapter >= storyData.length
        };

        // Save progress to Firebase
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

    showRegularQuiz(quizData) {
        // Initialize quiz state
        this.currentQuizData = quizData;
        this.currentQuestionIndex = 0;
        this.quizScore = 0;
        this.showRegularQuizQuestion();
    }

    showRegularQuizQuestion() {
        const question = this.currentQuizData.questions[this.currentQuestionIndex];
        const { width, height } = this.scale;
        
        // Background overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(10);
        
        // Quiz box
        const boxWidth = Math.min(width * 0.8, 600);
        const boxHeight = Math.min(height * 0.7, 400);
        const boxX = width/2 - boxWidth/2;
        const boxY = height/2 - boxHeight/2;
        
        const quizBox = this.add.graphics();
        quizBox.fillStyle(0x2a2a4a, 0.95);
        quizBox.lineStyle(3, 0xffffff, 1);
        quizBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 15);
        quizBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 15);
        quizBox.setDepth(11);
        
        // Question text
        const questionText = this.add.text(width/2, boxY + 50, 
            `Question ${this.currentQuestionIndex + 1}/${this.currentQuizData.questions.length}\n\n${question.question}`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: boxWidth - 40 }
        }).setOrigin(0.5, 0);
        questionText.setDepth(12);
        
        // Option buttons
        const optionButtons = [];
        const buttonHeight = 45;
        const buttonSpacing = 15;
        const startY = questionText.y + questionText.height + 30;
        
        question.options.forEach((option, index) => {
            const buttonY = startY + (buttonHeight + buttonSpacing) * index;
            const buttonWidth = boxWidth - 60;
            const buttonX = width/2 - buttonWidth/2;
            
            const button = this.add.graphics();
            button.fillStyle(0x4a4a6a, 1);
            button.lineStyle(2, 0xcccccc, 1);
            button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
            button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
            button.setDepth(11);
            
            const buttonText = this.add.text(width/2, buttonY + buttonHeight/2, option, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '16px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);
            buttonText.setDepth(12);
            
            // Make button interactive
            button.setInteractive(new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
            button.setData('useHandCursor', true);
            
            button.on('pointerdown', () => {
                this.handleRegularQuizAnswer(index === question.correct, question, index);
            });
            
            // Hover effects
            button.on('pointerover', () => {
                button.clear();
                button.fillStyle(0x6a6a8a, 1);
                button.lineStyle(2, 0xffffff, 1);
                button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
                button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
            });
            
            button.on('pointerout', () => {
                button.clear();
                button.fillStyle(0x4a4a6a, 1);
                button.lineStyle(2, 0xcccccc, 1);
                button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
                button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
            });
            
            optionButtons.push({ button, text: buttonText });
        });
        
        // Store elements for cleanup
        this.regularQuizElements = [overlay, quizBox, questionText, ...optionButtons.map(ob => ob.button), ...optionButtons.map(ob => ob.text)];
    }

    handleRegularQuizAnswer(isCorrect, question, selectedIndex) {
        // Clean up current quiz elements
        if (this.regularQuizElements) {
            this.regularQuizElements.forEach(element => element.destroy());
            this.regularQuizElements = null;
        }
        
        if (isCorrect) {
            this.quizScore++;
            this.showRegularQuizSuccessFeedback(question);
        } else {
            this.showRegularQuizFailureFeedback(question, selectedIndex);
        }
    }

    showRegularQuizSuccessFeedback(question) {
        const { width, height } = this.scale;
        
        // Background
        const feedbackBg = this.add.graphics();
        feedbackBg.fillStyle(0x000000, 0.8);
        feedbackBg.fillRect(0, 0, width, height);
        feedbackBg.setDepth(10);
        
        // Success icon (checkmark)
        const icon = this.add.text(width/2, height/2 - 80, '✓', {
            fontFamily: 'Arial',
            fontSize: '64px',
            color: '#4CAF50'
        }).setOrigin(0.5);
        icon.setDepth(11);
        
        // Title
        const title = this.add.text(width/2, height/2 - 20, 'Correct!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '32px',
            color: '#4CAF50'
        }).setOrigin(0.5);
        title.setDepth(11);
        
        // Explanation
        const explanation = this.add.text(width/2, height/2 + 30, question.explanation || 'Great job!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5);
        explanation.setDepth(11);
        
        // Continue button
        const buttonWidth = 120;
        const buttonHeight = 40;
        const continueBtn = this.add.graphics();
        continueBtn.fillStyle(0x4CAF50, 1);
        continueBtn.fillRoundedRect(width/2 - buttonWidth/2, height/2 + 100, buttonWidth, buttonHeight, 12);
        continueBtn.setDepth(11);
        continueBtn.setInteractive(new Phaser.Geom.Rectangle(width/2 - buttonWidth/2, height/2 + 100, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        continueBtn.setData('useHandCursor', true);

        const continueText = this.add.text(width/2, height/2 + 120, 'Continue', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        continueText.setDepth(12);

        this.regularQuizFeedbackElements = [feedbackBg, icon, title, explanation, continueBtn, continueText];
        
        // Continue button handler
        continueBtn.on('pointerdown', () => {
            this.sound.play('se_confirm');
            this.cleanupRegularQuizFeedback();
            this.proceedToNextQuizQuestion();
        });

        // Hover effects
        continueBtn.on('pointerover', () => {
            continueBtn.clear();
            continueBtn.fillStyle(0x66BB6A, 1);
            continueBtn.fillRoundedRect(width/2 - buttonWidth/2, height/2 + 100, buttonWidth, buttonHeight, 12);
        });

        continueBtn.on('pointerout', () => {
            continueBtn.clear();
            continueBtn.fillStyle(0x4CAF50, 1);
            continueBtn.fillRoundedRect(width/2 - buttonWidth/2, height/2 + 100, buttonWidth, buttonHeight, 12);
        });
    }

    showRegularQuizFailureFeedback(question, selectedIndex) {
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
        const explanation = this.add.text(width/2, height/2 - 15, question.explanation || 'Try again and think about what you learned!', {
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

        this.regularQuizFeedbackElements = [feedbackBg, icon, title, explanation, tryAgainBtn, tryAgainText, continueBtn, continueText];
        
        // Try Again button handler
        tryAgainBtn.on('pointerdown', () => {
            this.sound.play('se_confirm');
            this.cleanupRegularQuizFeedback();
            this.showRegularQuizQuestion(); // Show the same question again
        });

        // Continue button handler
        continueBtn.on('pointerdown', () => {
            this.sound.play('se_confirm');
            this.cleanupRegularQuizFeedback();
            this.proceedToNextQuizQuestion(); // Skip to next question
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

    cleanupRegularQuizFeedback() {
        if (this.regularQuizFeedbackElements) {
            this.regularQuizFeedbackElements.forEach(element => element.destroy());
            this.regularQuizFeedbackElements = null;
        }
    }

    proceedToNextQuizQuestion() {
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex < this.currentQuizData.questions.length) {
            // Show next question
            this.showRegularQuizQuestion();
        } else {
            // Quiz completed, show results and continue story
            this.showRegularQuizResults();
        }
    }

    showRegularQuizResults() {
        const { width, height } = this.scale;
        const totalQuestions = this.currentQuizData.questions.length;
        const percentage = Math.round((this.quizScore / totalQuestions) * 100);
        
        // Background
        const resultBg = this.add.graphics();
        resultBg.fillStyle(0x000000, 0.8);
        resultBg.fillRect(0, 0, width, height);
        resultBg.setDepth(10);
        
        // Results
        const title = this.add.text(width/2, height/2 - 60, 'Quiz Complete!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '32px',
            color: '#4CAF50'
        }).setOrigin(0.5);
        title.setDepth(11);
        
        const score = this.add.text(width/2, height/2, `Score: ${this.quizScore}/${totalQuestions} (${percentage}%)`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        score.setDepth(11);
        
        // Continue button
        const buttonWidth = 150;
        const buttonHeight = 40;
        const continueBtn = this.add.graphics();
        continueBtn.fillStyle(0x4CAF50, 1);
        continueBtn.fillRoundedRect(width/2 - buttonWidth/2, height/2 + 60, buttonWidth, buttonHeight, 12);
        continueBtn.setDepth(11);
        continueBtn.setInteractive(new Phaser.Geom.Rectangle(width/2 - buttonWidth/2, height/2 + 60, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        continueBtn.setData('useHandCursor', true);

        const continueText = this.add.text(width/2, height/2 + 80, 'Continue Story', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        continueText.setDepth(12);

        this.regularQuizResultElements = [resultBg, title, score, continueBtn, continueText];
        
        // Continue button handler
        continueBtn.on('pointerdown', () => {
            this.sound.play('se_confirm');
            // Clean up results
            this.regularQuizResultElements.forEach(element => element.destroy());
            this.regularQuizResultElements = null;
            
            // Continue with story progression
            this.continueStoryAfterRegularQuiz();
        });

        // Hover effects
        continueBtn.on('pointerover', () => {
            continueBtn.clear();
            continueBtn.fillStyle(0x66BB6A, 1);
            continueBtn.fillRoundedRect(width/2 - buttonWidth/2, height/2 + 60, buttonWidth, buttonHeight, 12);
        });

        continueBtn.on('pointerout', () => {
            continueBtn.clear();
            continueBtn.fillStyle(0x4CAF50, 1);
            continueBtn.fillRoundedRect(width/2 - buttonWidth/2, height/2 + 60, buttonWidth, buttonHeight, 12);
        });
    }

    continueStoryAfterRegularQuiz() {
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
        char2.storyProgress = {
            chapter: this.currentChapter,
            scene: this.currentScene,
            completed: this.currentChapter >= storyData.length
        };

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
            // Chapter 0: Python Basics
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Hi there! I'm Lily, and I'm super excited to teach you Python!",
                            "Python is like the perfect language for beginners - it's clean, readable, and so much fun!",
                            "Just like how I practice my dance routines step by step, we'll learn Python one concept at a time.",
                            "Let's start with variables - they're like little containers that hold our data!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "In Python, creating a variable is super simple!",
                            "name = 'Lily' - See? I just stored my name in a variable called 'name'!",
                            "age = 16 - And here's my age in a number variable!",
                            "Python is smart enough to know the difference between text and numbers automatically!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        dialogue: [
                            "Let's try some basic operations! Python can do math just like a calculator.",
                            "print(5 + 3) would show us 8!",
                            "print('Hello' + ' ' + 'World') would show us 'Hello World'!",
                            "The print() function is like our way to show things to the audience - just like performing on stage!"
                        ],
                        codeExample: {
                            title: "Python Basic Operations",
                            code: `# Math operations
print(5 + 3)  # Addition: 8
print(10 - 4)  # Subtraction: 6
print(3 * 7)  # Multiplication: 21

# String operations
print('Hello' + ' ' + 'World')  # Hello World
print('Python' * 3)  # PythonPythonPython`
                        },
                        inlineQuiz: {
                            question: "What would 'print(10 + 5)' display?",
                            answers: ["105", "15", "10 + 5", "Error"],
                            correct: 1,
                            explanation: "In Python, + performs addition with numbers. So 10 + 5 equals 15, which gets printed to the console."
                        }
                    },
                    {
                        dialogue: [
                            "Awesome work! You're getting the hang of Python basics!",
                            "Remember, practice makes perfect - just like my singing and dancing!",
                            "In the next chapter, we'll learn about making decisions in our code with if statements!",
                            "Get ready to make your programs even smarter!"
                        ],
                        progressUpdate: {
                            quest1: 20,
                            quest1Desc: "Completed Python basics and variables"
                        }
                    }
                ]
            },
            // Chapter 1: Control Structures
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Welcome back! Now let's learn about making decisions in Python!",
                            "Sometimes in a performance, I need to decide which dance move comes next based on the music.",
                            "In Python, we use 'if' statements to make these kinds of decisions!",
                            "Let's see how it works!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        dialogue: [
                            "Here's a simple if statement:",
                            "if temperature > 25:\n    print('It's a warm day!')",
                            "The code after the colon only runs if the condition is true!",
                            "Notice the indentation - Python uses spaces to group code together!"
                        ],
                        codeExample: {
                            title: "Python If Statement",
                            code: `temperature = 30

if temperature > 25:
    print("It's a warm day!")
    print("Perfect for dancing outside!")
else:
    print("It's a cool day!")
    print("Time for indoor practice!")`
                        }
                    },
                    {
                        dialogue: [
                            "We can also use 'else' for when the condition is false:",
                            "if score >= 80:\n    print('Great job!')\nelse:\n    print('Keep practicing!')",
                            "And 'elif' for multiple conditions - like choosing between different songs to perform!",
                            "Let's practice with some loops next!"
                        ],
                        inlineQuiz: {
                            question: "What happens if the condition in an if statement is false?",
                            answers: ["The code runs anyway", "Python shows an error", "The code is skipped", "The program stops"],
                            correct: 2,
                            explanation: "When an if condition is false, Python skips the code block and continues to the next part of the program."
                        }
                    },
                    {
                        dialogue: [
                            "Now let's talk about loops - they're like repeating a dance move!",
                            "A 'for' loop repeats code for each item in a list:",
                            "for i in range(5):\n    print('Hello!')",
                            "This would print 'Hello!' five times - perfect for practice sessions!"
                        ],
                        codeExample: {
                            title: "Python Loops",
                            code: `# For loop with range
for i in range(3):
    print(f"Practice session {i+1}")

# For loop with list
songs = ["Hello World", "Python Love", "Code Dreams"]
for song in songs:
    print(f"Now playing: {song}")`
                        },
                        progressUpdate: {
                            quest2: 15,
                            quest2Desc: "Learning Python control structures"
                        }
                    }
                ]
            },
            // Chapter 2: Functions & Modules
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Time to learn about functions - they're like choreographed dance routines!",
                            "Instead of repeating the same moves everywhere, we create a routine and call it by name!",
                            "Functions help us organize our code and avoid repetition.",
                            "Let's create our first function!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Here's how we define a function:",
                            "def greet(name):\n    return f'Hello, {name}!'",
                            "The 'def' keyword tells Python we're creating a function.",
                            "Then we can call it like: greet('Lily') and get 'Hello, Lily!' back!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What keyword is used to define a function in Python?",
                                    options: ["function", "def", "create", "make"],
                                    correct: 1,
                                    explanation: "The 'def' keyword is used to define functions in Python. It tells Python that you're creating a new function that can be called later."
                                },
                                {
                                    question: "What does 'return' do in a function?",
                                    options: ["Stops the function", "Gives back a value", "Prints something", "Creates a variable"],
                                    correct: 1,
                                    explanation: "The 'return' statement gives back a value from the function. It also stops the function execution and sends the result back to whoever called the function."
                                }
                            ]
                        }
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Functions can also have default parameters - like having a backup dance if the main one doesn't work!",
                            "def perform(song='My favorite song'):\n    print(f'Now performing: {song}')",
                            "If we don't specify a song, it uses the default!",
                            "This makes our functions more flexible and user-friendly!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 3: Object-Oriented Programming
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Now for something really exciting - Object-Oriented Programming!",
                            "Think of classes like templates for creating similar things.",
                            "Like how all idols have similar characteristics but are unique individuals!",
                            "Let's create a class together!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Here's a simple class:",
                            "The __init__ method is like the blueprint - it sets up each new idol!",
                            "Self refers to the specific instance we're working with!"
                        ],
                        codeExample: {
                            title: "Basic Idol Class",
                            code: "class Idol:\n    def __init__(self, name, talent):\n        self.name = name\n        self.talent = talent\n    \n    def perform(self):\n        print(f'{self.name} is showing off their {self.talent}!')"
                        },
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What is the special method called when creating a new object?",
                                    options: ["__start__", "__init__", "__create__", "__new__"],
                                    correct: 1,
                                    explanation: "The __init__ method is automatically called when a new object is created. It's like a constructor that sets up the initial state of the object."
                                },
                                {
                                    question: "What does 'self' represent in a class method?",
                                    options: ["The class itself", "A global variable", "The specific instance", "All instances"],
                                    correct: 2,
                                    explanation: "'self' refers to the specific instance (object) that the method is being called on. It allows each object to have its own data and behavior."
                                }
                            ]
                        }
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "We can also use inheritance - like how different types of performers share basic skills!",
                            "Singer inherits everything from Idol but adds its own special abilities!",
                            "This helps us build complex programs efficiently!"
                        ],
                        codeExample: {
                            title: "Inheritance Example - Singer Class",
                            code: "class Singer(Idol):\n    def sing(self):\n        print(f'{self.name} is singing beautifully!')\n\n# Example usage:\n# my_singer = Singer('Lily', 'vocals')\n# my_singer.perform()  # Inherited from Idol\n# my_singer.sing()     # Singer's own method"
                        },
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 4: Data Structures
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Our final chapter is about data structures - ways to organize information!",
                            "Just like how I organize my songs, dance moves, and performance schedules!",
                            "Python has several built-in data structures that make our life easier.",
                            "Let's explore them together!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Lists are like setlists - ordered collections of items:",
                            "my_songs = ['Hello World', 'Python Love', 'Code Dreams']",
                            "Dictionaries are like address books - they connect keys to values:",
                            "my_info = {'name': 'Lily', 'age': 16, 'talent': 'singing'}"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "How do you access the first item in a list called 'songs'?",
                                    options: ["songs[1]", "songs[0]", "songs.first()", "songs(0)"],
                                    correct: 1,
                                    explanation: "Python lists are zero-indexed, meaning the first item is at index 0. So songs[0] gives you the first item in the list."
                                },
                                {
                                    question: "How do you get a value from a dictionary using a key?",
                                    options: ["dict.key", "dict[key]", "dict(key)", "dict->key"],
                                    correct: 1,
                                    explanation: "Dictionary values are accessed using square brackets with the key inside: dict[key]. This is how you look up values by their keys."
                                }
                            ]
                        }
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Congratulations! You've completed your Python journey with me!",
                            "From variables to classes, from loops to data structures - you've learned so much!",
                            "Remember, programming is like performing - it takes practice to get really good at it!",
                            "Keep coding, keep learning, and most importantly, keep having fun!"
                        ],
                        action: 'complete'
                    }
                ]
            }
        ];
    }
}
