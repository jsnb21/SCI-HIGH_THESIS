import Phaser from 'phaser';
import VNDialogueBox from '/src/ui/VNDialogueBox.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';
import { char3, onceOnlyFlags } from '/src/gameManager.js';
import { getScaleInfo, scaleFontSize, scaleDimension } from '/src/utils/mobileUtils.js';
import { saveStoryProgress } from '/src/save.js';

export default class DamianStoryMode extends Phaser.Scene {
    constructor() {
        super('DamianStoryMode');
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
        this.load.image('Damian', 'assets/sprites/npcs/Damian.png');
        
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
        if (!char3.storyProgress) {
            char3.storyProgress = {
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
        this.damian = this.add.image(width * 0.82, height * 0.72, 'Damian');
        this.damian.setScale(0.9); // Half-body appearance
        this.damian.setDepth(1); // Lower depth so dialogue appears in front
        
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
        codeBox.setStrokeStyle(strokeWidth, 0xf57c00);
        codeBox.setDepth(5); // Above Damian (depth 1) but below dialogue (depth 10)
        
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
            backgroundColor: '#f57c00',
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
        char3.storyProgress = {
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
            char3.quest1 = Math.min(char3.quest1 + progressUpdate.quest1, 100);
        }
        if (progressUpdate.quest2) {
            char3.quest2 = Math.min(char3.quest2 + progressUpdate.quest2, 100);
        }
        if (progressUpdate.quest3) {
            char3.quest3 = Math.min(char3.quest3 + progressUpdate.quest3, 100);
        }
        
        // Update descriptions
        if (progressUpdate.quest1Desc) char3.quest1Desc = progressUpdate.quest1Desc;
        if (progressUpdate.quest2Desc) char3.quest2Desc = progressUpdate.quest2Desc;
        if (progressUpdate.quest3Desc) char3.quest3Desc = progressUpdate.quest3Desc;
    }

    async saveProgressToFirebase() {
        try {
            await saveStoryProgress('damian', char3.storyProgress);
        } catch (error) {
            console.error('Failed to save story progress to Firebase:', error);
        }
    }

    showStoryComplete() {
        const { width, height } = this.scale;
        
        // Completion message
        const completionDialogue = [
            "Congratulations! You've completed Damian's Java journey!",
            "Damian has learned the fundamentals of Java programming.",
            "These skills will serve as a solid foundation for object-oriented programming!",
            "Continue learning and practicing to become a skilled Java developer!"
        ];
        
        this.dialogueBox = new VNDialogueBox(
            this,
            completionDialogue,
            () => {
                // Mark story as completed
                char3.storyProgress.completed = true;
                onceOnlyFlags.setSeen('damian_story_completed');
                
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
        quizBg.fillStyle(0x2e1065, 0.95);
        quizBg.fillRoundedRect(quizX - quizWidth/2, quizY - quizHeight/2, quizWidth, quizHeight, 22);
        quizBg.lineStyle(5, 0xf57c00, 1);
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
            btnBg.fillStyle(0x4a1a65, 1);
            btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
            btnBg.lineStyle(3, 0xf57c00, 1);
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
                btnBg.fillStyle(0xf57c00, 0.8);
                btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
                btnBg.lineStyle(3, 0xffffff, 1);
                btnBg.strokeRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
                this.sound.play('se_select');
            });
            
            btnBg.on('pointerout', () => {
                btnBg.clear();
                btnBg.fillStyle(0x4a1a65, 1);
                btnBg.fillRoundedRect(btnX - buttonWidth/2, btnY - buttonHeight/2, buttonWidth, buttonHeight, 12);
                btnBg.lineStyle(3, 0xf57c00, 1);
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
            this.showInlineQuizSuccessFeedback(quizData);
        } else {
            this.showInlineQuizFailureFeedback(quizData);
        }
    }

    showInlineQuizSuccessFeedback(quizData) {
        const { width, height } = this.scale;
        
        // Get scale information for mobile responsiveness
        const scaleInfo = getScaleInfo();
        
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

        // Continue button with responsive dimensions
        const buttonWidth = scaleDimension(150, scaleInfo);
        const buttonHeight = scaleDimension(45, scaleInfo);
        const buttonX = width/2 - buttonWidth/2;
        const buttonY = height/2 + scaleDimension(90, scaleInfo);
        
        const continueBtn = this.add.graphics();
        continueBtn.fillStyle(0xffffff, 1);
        continueBtn.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, scaleDimension(12, scaleInfo));
        continueBtn.setDepth(11);
        continueBtn.setInteractive(new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        continueBtn.setData('useHandCursor', true);

        const continueText = this.add.text(width/2, buttonY + buttonHeight/2, 'Continue', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${scaleFontSize(18, scaleInfo)}px`,
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
        
        // Get scale information for mobile responsiveness
        const scaleInfo = getScaleInfo();
        
        // Background
        const feedbackBg = this.add.graphics();
        feedbackBg.fillStyle(0x000000, 0.8);
        feedbackBg.fillRect(0, 0, width, height);
        feedbackBg.setDepth(10);
        
        // Error icon
        const icon = this.add.text(width/2, height/2 - 120, '✗', {
            fontFamily: 'Arial',
            fontSize: `${scaleFontSize(64, scaleInfo)}px`,
            color: '#f44336'
        }).setOrigin(0.5);
        icon.setDepth(11);
        
        // Title
        const title = this.add.text(width/2, height/2 - 60, 'Not quite right...', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${scaleFontSize(28, scaleInfo)}px`,
            color: '#f44336'
        }).setOrigin(0.5);
        title.setDepth(11);
        
        // Explanation
        const explanation = this.add.text(width/2, height/2 - 15, quizData.explanation || 'Try again and think about what you learned!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${scaleFontSize(18, scaleInfo)}px`,
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5);
        explanation.setDepth(11);
        
        // Buttons
        const buttonWidth = scaleDimension(120, scaleInfo);
        const buttonHeight = scaleDimension(40, scaleInfo);
        const buttonY = height/2 + scaleDimension(60, scaleInfo);
        const leftButtonX = width/2 - scaleDimension(80, scaleInfo);
        const rightButtonX = width/2 + scaleDimension(80, scaleInfo);
        
        // Try Again button
        const tryAgainBtn = this.add.graphics();
        tryAgainBtn.fillStyle(0xff6b9d, 1);
        tryAgainBtn.fillRoundedRect(leftButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, scaleDimension(12, scaleInfo));
        tryAgainBtn.setDepth(11);
        tryAgainBtn.setInteractive(new Phaser.Geom.Rectangle(leftButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        tryAgainBtn.setData('useHandCursor', true);

        const tryAgainText = this.add.text(leftButtonX, buttonY, 'Try Again', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${scaleFontSize(16, scaleInfo)}px`,
            color: '#ffffff'
        }).setOrigin(0.5);
        tryAgainText.setDepth(12);
        
        // Continue button
        const continueBtn = this.add.graphics();
        continueBtn.fillStyle(0x666666, 1);
        continueBtn.fillRoundedRect(rightButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, scaleDimension(12, scaleInfo));
        continueBtn.setDepth(11);
        continueBtn.setInteractive(new Phaser.Geom.Rectangle(rightButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        continueBtn.setData('useHandCursor', true);

        const continueText = this.add.text(rightButtonX, buttonY, 'Continue', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${scaleFontSize(16, scaleInfo)}px`,
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
            tryAgainBtn.fillRoundedRect(leftButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, scaleDimension(12, scaleInfo));
        });

        tryAgainBtn.on('pointerout', () => {
            tryAgainBtn.clear();
            tryAgainBtn.fillStyle(0xff6b9d, 1);
            tryAgainBtn.fillRoundedRect(leftButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, scaleDimension(12, scaleInfo));
        });

        // Hover effects for Continue button
        continueBtn.on('pointerover', () => {
            continueBtn.clear();
            continueBtn.fillStyle(0x888888, 1);
            continueBtn.fillRoundedRect(rightButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, scaleDimension(12, scaleInfo));
        });

        continueBtn.on('pointerout', () => {
            continueBtn.clear();
            continueBtn.fillStyle(0x666666, 1);
            continueBtn.fillRoundedRect(rightButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, scaleDimension(12, scaleInfo));
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
        char3.storyProgress = {
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

    getStoryData() {
        return [
            // Chapter 0: Java Foundations
            {
                scenes: [
                    {
                        dialogue: [
                            "Hey! I'm Damian, and I love creating things with code!",
                            "Java is like my favorite art medium - it's structured, powerful, and perfect for building amazing applications!",
                            "Think of Java like painting - we start with a blank canvas and create something beautiful step by step.",
                            "Let's begin with the foundation: classes and objects!"
                        ],
                        progressUpdate: {
                            quest1: 10,
                            quest1Desc: "Started learning Java fundamentals"
                        }
                    },
                    {
                        dialogue: [
                            "In Java, everything revolves around classes - they're like blueprints for creating objects.",
                            "public class Artist {\n    private String name;\n    private String specialty;\n}",
                            "This class defines what every Artist should have - a name and a specialty!",
                            "Classes are templates, objects are the actual instances we create from those templates."
                        ],
                        codeExample: {
                            title: "Java Class Definition",
                            code: `public class Artist {
    private String name;
    private String specialty;
    
    // Constructor
    public Artist(String name, String specialty) {
        this.name = name;
        this.specialty = specialty;
    }
    
    // Getter methods
    public String getName() {
        return name;
    }
    
    public String getSpecialty() {
        return specialty;
    }
}`
                        },
                        progressUpdate: {
                            quest1: 15,
                            quest1Desc: "Learning Java classes and objects"
                        }
                    },
                    {
                        dialogue: [
                            "Now let's create an object from our class:",
                            "Artist damian = new Artist();\ndamian.setName('Damian');\ndamian.setSpecialty('Digital Art');",
                            "We use the 'new' keyword to create (instantiate) an object from our class!",
                            "Each object can have different values but follows the same structure."
                        ],
                        inlineQuiz: {
                            question: "What keyword is used to create a new object in Java?",
                            answers: ["create", "new", "make", "build"],
                            correct: 1,
                            explanation: "The 'new' keyword is used to create (instantiate) new objects from classes in Java."
                        }
                    },
                    {
                        dialogue: [
                            "Great! You understand the basics of classes and objects!",
                            "Java also requires us to declare variable types - it's strongly typed!",
                            "int age = 20; // Integer\nString name = 'Damian'; // Text\nboolean isCreative = true; // True/False",
                            "This might seem strict, but it helps prevent errors and makes code more reliable!"
                        ],
                        codeExample: {
                            title: "Java Variables and Types",
                            code: `// Primitive types
int age = 20;
double height = 5.9;
boolean isCreative = true;
char grade = 'A';

// Object types
String name = "Damian";
String specialty = "Digital Art";

// Arrays
int[] scores = {95, 87, 92, 88};
String[] artworks = {"Portrait", "Landscape", "Abstract"};`
                        },
                        progressUpdate: {
                            quest1: 20,
                            quest1Desc: "Understanding Java data types and variables"
                        }
                    }
                ]
            },
            // Chapter 1: Object-Oriented Design
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Now for the really exciting part - Object-Oriented Design!",
                            "This is where Java truly shines, like mixing different colors to create a masterpiece!",
                            "We have four main principles: Encapsulation, Inheritance, Polymorphism, and Abstraction.",
                            "Let's start with encapsulation - keeping data safe and organized!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Encapsulation is like having a private art studio - you control who can access your work!",
                            "private String artistName;\npublic String getArtistName() {\n    return artistName;\n}",
                            "We make fields private and use public methods (getters/setters) to access them safely.",
                            "This protects our data from being changed in unwanted ways!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Inheritance is like learning from a master artist - you build upon their techniques!",
                            "class DigitalArtist extends Artist {\n    private String software;\n    public void createDigitalArt() { }\n}",
                            "DigitalArtist 'inherits' everything from Artist and adds its own special abilities!",
                            "This lets us reuse code and create hierarchies of related classes."
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What keyword is used for inheritance in Java?",
                                    options: ["inherits", "extends", "implements", "super"],
                                    correct: 1
                                },
                                {
                                    question: "What does encapsulation help with?",
                                    options: ["Making code faster", "Data protection", "Creating objects", "Inheritance"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Polymorphism means 'many forms' - like how the same paintbrush can create different strokes!",
                            "Artist artist = new DigitalArtist();\nartist.createArt(); // Calls DigitalArtist's version!",
                            "The same method call can behave differently depending on the actual object type!",
                            "This makes our code flexible and easier to extend!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 2: Collections & Generics
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Time to learn about organizing our data - Collections!",
                            "Think of collections like different types of art storage - some for paintings, some for sculptures!",
                            "Java provides ArrayList, HashMap, HashSet, and many more!",
                            "Let's start with ArrayList - a resizable array!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "ArrayList is like having an expandable art portfolio:",
                            "ArrayList<String> artworks = new ArrayList<>();\nartworks.add('Digital Portrait');\nartworks.add('Abstract Landscape');",
                            "Notice the <String> - that's a generic type specification!",
                            "It tells Java that this ArrayList can only contain String objects."
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "HashMap is like a catalog - it connects keys to values:",
                            "HashMap<String, String> artStyles = new HashMap<>();\nartStyles.put('Mona Lisa', 'Renaissance');\nartStyles.put('Starry Night', 'Post-Impressionism');",
                            "Perfect for when you need to look up information by a specific identifier!",
                            "Like finding an artwork's style by its name!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What does <String> represent in ArrayList<String>?",
                                    options: ["A method name", "A generic type", "A variable", "A class name"],
                                    correct: 1
                                },
                                {
                                    question: "What method adds an element to an ArrayList?",
                                    options: ["put()", "add()", "insert()", "append()"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Generics help make our code type-safe and reusable!",
                            "Instead of writing separate classes for different types, we can use generics:",
                            "class ArtCollection<T> {\n    private List<T> items = new ArrayList<>();\n}",
                            "Now we can have ArtCollection<Painting>, ArtCollection<Sculpture>, etc.!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 3: Exception Handling
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Even the best artists make mistakes - that's why we need exception handling!",
                            "In Java, exceptions are like unexpected problems that can occur while our program runs.",
                            "Instead of crashing, we can handle these problems gracefully!",
                            "Let's learn the try-catch mechanism!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Here's how we handle exceptions:",
                            "try {\n    // Code that might fail\n    int result = 10 / 0;\n} catch (ArithmeticException e) {\n    System.out.println('Cannot divide by zero!');\n}",
                            "The try block contains risky code, catch block handles the problem!",
                            "This prevents our program from crashing unexpectedly!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "We can also use 'finally' for code that always runs:",
                            "try {\n    // Risky code\n} catch (Exception e) {\n    // Handle error\n} finally {\n    // Always runs\n}",
                            "Finally is perfect for cleanup code - like putting away your art supplies!",
                            "It runs whether an exception occurred or not!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What block is used to handle exceptions?",
                                    options: ["handle", "catch", "except", "error"],
                                    correct: 1
                                },
                                {
                                    question: "When does the finally block execute?",
                                    options: ["Only if no exception", "Only if exception occurs", "Always", "Never"],
                                    correct: 2
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "You can also create your own custom exceptions:",
                            "class ArtworkNotFoundException extends Exception {\n    public ArtworkNotFoundException(String message) {\n        super(message);\n    }\n}",
                            "This helps make your code more descriptive and easier to debug!",
                            "Like having specific error messages for different art-related problems!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 4: Advanced Java
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Welcome to advanced Java - where we explore the most powerful features!",
                            "We'll learn about interfaces, abstract classes, and design patterns!",
                            "These are like advanced art techniques - they make your code more professional and elegant!",
                            "Let's start with interfaces!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "An interface is like a contract - it specifies what methods a class must have:",
                            "interface Drawable {\n    void draw();\n    void setColor(String color);\n}",
                            "Any class that implements Drawable must provide these methods!",
                            "It's like saying 'if you want to be drawable, you must be able to draw and set color!'"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Abstract classes are like incomplete artworks - they provide some implementation but leave parts for others to finish:",
                            "abstract class Artwork {\n    protected String title;\n    public abstract void create();\n    public void displayTitle() { ... }\n}",
                            "You cannot instantiate abstract classes directly, but you can extend them!",
                            "They're perfect when you want to share common code but force subclasses to implement specific methods!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "Can you create an object directly from an abstract class?",
                                    options: ["Yes, always", "No, never", "Only with new keyword", "Only if it has methods"],
                                    correct: 1
                                },
                                {
                                    question: "What keyword is used to implement an interface?",
                                    options: ["extends", "implements", "uses", "inherits"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Congratulations! You've mastered Java with me!",
                            "From basic classes to advanced design patterns, you've learned the art of Java programming!",
                            "Remember, programming is like art - it requires practice, creativity, and passion!",
                            "Keep exploring, keep creating, and most importantly, keep coding with style!"
                        ],
                        action: 'complete'
                    }
                ]
            }
        ];
    }
}
