import Phaser from 'phaser';
import { char1, char2, char3, char4, char5 } from '../gameManager';
import { createBackButton } from '../components/buttons/backbutton';
import Carousel from '../ui/carouselUI';
import VNDialogueBox from '../ui/VNDialogueBox';
import { onceOnlyFlags } from '../gameManager';
import TutorialManager from '../components/TutorialManager.js';
import { CLASSROOM_TUTORIAL_STEPS } from '../components/TutorialConfig.js';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getSafeArea
} from '../utils/mobileUtils.js';

export default class Classroom extends Phaser.Scene {
    constructor() {
        super('Classroom');
        this.tutorialManager = null;
    }

    preload() {
        // Load classroom background
        this.load.image('classroomBG', 'assets/img/bg/classroom_day.png');
        
        // Load Principal Richard image for intro dialogue
        this.load.image('Richard', 'assets/sprites/npcs/principal.png');
        
        // Load character images from public/assets/sprites/npcs with their respective names
        this.load.image('Noah', 'assets/sprites/npcs/Noah.png');
        this.load.image('Lily', 'assets/sprites/npcs/Lily.png');
        this.load.image('Damian', 'assets/sprites/npcs/Damian.png');
        this.load.image('Bella', 'assets/sprites/npcs/Bella.png');
        this.load.image('Finley', 'assets/sprites/npcs/Finley.png');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        
        // Add error handling for missing images
        this.load.on('loaderror', (file) => {
            console.error('Failed to load file:', file.src);
        });
        
        this.load.on('filecomplete', (key, type, data) => {
            if (type === 'image') {
                console.log('Successfully loaded image:', key);
            }
        });
    }

    create() {
        // Get mobile scaling info
        const scaleInfo = getScaleInfo(this);
        const { width, height } = scaleInfo;
        const safeArea = getSafeArea(scaleInfo);

        // Initialize modal state
        this.characterBoxOpen = false;

        // Add classroom background with better styling
        this.bg = this.add.tileSprite(0, 0, width, height, 'classroomBG').setOrigin(0, 0);
        this.bg.setAlpha(0.5); // Match main hub background alpha
        
        // Set background color to match main hub styling
        this.cameras.main.setBackgroundColor('#B2E2B1');

        // Sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Carousel data using images from assets/img/sprites/npcs with their respective names
        const charKeys = ['Noah', 'Lily', 'Damian', 'Bella', 'Finley'];
        const charInfo = [
            { 
                name: "Noah", 
                desc: "A diligent student who loves coding a bit too much.",
                progress: char1.quest1 / 100,
                side: char1.quest2 / 100,
                bonus: char1.quest3 / 100,
                questDescs: [
                    char1.quest1Desc,
                    char1.quest2Desc,
                    char1.quest3Desc
                ]
            },
            { 
                name: "Lily", 
                desc: "A popular idol, she's talented at singing, dancing, and even web design.",
                progress: char2.quest1 / 100,
                side: char2.quest2 / 100,
                bonus: char2.quest3 / 100,
                questDescs: [
                    char2.quest1Desc,
                    char2.quest2Desc,
                    char2.quest3Desc
                ]
            },
            { 
                name: "Damian", 
                desc: "A creative thinker and artist.",
                progress: char3.quest1 / 100,
                side: char3.quest2 / 100,
                bonus: char3.quest3 / 100,
                questDescs: [
                    char3.quest1Desc,
                    char3.quest2Desc,
                    char3.quest3Desc
                ]
            },
            { 
                name: "Bella", 
                desc: "She's shy and timid, yet she's one of the top performers.",
                progress: char4.quest1 / 100,
                side: char4.quest2 / 100,
                bonus: char4.quest3 / 100,
                questDescs: [
                    char4.quest1Desc,
                    char4.quest2Desc,
                    char4.quest3Desc
                ]
            },
            { 
                name: "Finley", 
                desc: "He can appear cold, but he's a kind man.",
                progress: char5.quest1 / 100,
                side: char5.quest2 / 100,
                bonus: char5.quest3 / 100,
                questDescs: [
                    char5.quest1Desc,
                    char5.quest2Desc,
                    char5.quest3Desc
                ]
            }
        ];

        // Ensure all character images are loaded before creating carousel
        const allImagesLoaded = charKeys.every(key => this.textures.exists(key));
        
        if (!allImagesLoaded) {
            console.warn('Some character images not loaded, creating placeholder carousel');
            // Create placeholder colored rectangles for missing images
            charKeys.forEach(key => {
                if (!this.textures.exists(key)) {
                    console.warn(`Creating placeholder for missing image: ${key}`);
                    // Create a simple colored rectangle as placeholder
                    const graphics = this.add.graphics();
                    graphics.fillStyle(0x4CAF50, 1);
                    graphics.fillRoundedRect(0, 0, 100, 100, 10);
                    graphics.generateTexture(key, 100, 100);
                    graphics.destroy();
                }
            });
        }

        // Create the carousel with main hub styling - centered horizontally
        const carouselConfig = {
            iconSpacing: scaleInfo.isMobile ? 
                (scaleInfo.isPortrait ? scaleDimension(180, scaleInfo) : scaleDimension(240, scaleInfo)) : 
                scaleDimension(280, scaleInfo),
            smallScale: scaleInfo.isMobile ? 0.12 : 0.15, // Match main hub
            largeScale: scaleInfo.isMobile ? 0.20 : 0.3,  // Match main hub
            iconYOffset: scaleInfo.isMobile ? 
                scaleDimension(-60, scaleInfo) : 
                scaleDimension(-40, scaleInfo),
            iconToTitleGap: scaleDimension(100, scaleInfo),
            iconToDescGap: scaleDimension(50, scaleInfo),
            headingStyle: { 
                fontSize: scaleFontSize(56, scaleInfo),
                fontStyle: 'bold'
            },
            descStyle: { 
                fontSize: scaleFontSize(28, scaleInfo)
            },
            sounds: {
                hover: 'se_select',
                confirm: 'se_confirm'
            }
        };
        
        // Check for classroom intro cutscene
        if (!onceOnlyFlags.hasSeen('classroom_intro')) {
            // Show Principal Richard and intro dialogue first
            this.showPrincipalRichard();
            
            this.vnBox = new VNDialogueBox(this, [
                "Here I am in the classroom!",
                "Now I should meet my classmates as Principal Richard suggested.",
                "Welcome to the classroom! I see you followed my advice.",
                "These are your classmates - they are all experts in different programming languages.",
                "Each of them can teach you the basics of their specialty before you tackle the challenges in the computer lab.",
                "Noah specializes in Python, Lily knows web design, Damian is great with Java, Bella handles C programming, and Finley is our C++ expert.",
                "Make sure to talk to them and learn from their experience. They'll help you prepare for the coding challenges ahead!",
                "Thanks, Principal Richard! I'll make sure to meet everyone and learn from them."
            ], () => {
                // Hide Principal Richard and create carousel
                this.hidePrincipalRichard();
                onceOnlyFlags.setSeen('classroom_intro');
                this.createClassroomCarousel(charKeys, charInfo, carouselConfig);
            });
        } else {
            // Create carousel directly if intro already seen
            this.createClassroomCarousel(charKeys, charInfo, carouselConfig);
        }
    }

    createClassroomCarousel(charKeys, charInfo, carouselConfig) {
        this.characterCarousel = new Carousel(this, carouselConfig).create(
            charKeys,
            charInfo.map(c => ({
                heading: c.name,
                desc: c.desc
            })),
            (selected, index) => {
                // Show character box or handle selection
                this.showCharacterBox(charInfo[index], charKeys[index]);
            }
        );
        
        // Debug: Check if images are loaded
        charKeys.forEach(key => {
            if (!this.textures.exists(key)) {
                console.error(`Image not loaded: ${key}`);
            } else {
                console.log(`Image loaded successfully: ${key}`);
            }
        });

        // Back button
        createBackButton(this, 'MainHub');

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);

        // Check if this is the first time visiting the classroom
        if (!onceOnlyFlags.hasSeen('classroom_tutorial')) {
            // Delay tutorial start to ensure all UI elements are created
            this.time.delayedCall(500, () => {
                this.startClassroomTutorial();
            });
        }

        // Debug features
        this.input.keyboard.on('keydown-T', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                this.startClassroomTutorial();
            }
        });

        this.input.keyboard.on('keydown-R', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                onceOnlyFlags.flags['classroom_tutorial'] = false;
                console.log('Classroom tutorial flag reset');
            }
        });

        // Add shutdown and destroy event listeners to clean up the carousel
        this.events.on('shutdown', () => {
            this.destroyCarousel();
        });
        this.events.on('destroy', () => {
            this.destroyCarousel();
        });
    }

    destroyCarousel() {
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
        // Clean up modal state
        this.characterBoxOpen = false;
        
        // Clean up carousel properly using the carousel's destroy method
        if (this.characterCarousel) {
            this.characterCarousel.destroy();
            this.characterCarousel = null;
        }
        
        // Legacy cleanup for any remaining elements
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween = null;
        }
        if (this.carouselIcons) {
            this.carouselIcons.forEach(icon => {
                if (icon && icon.destroy) icon.destroy();
            });
            this.carouselIcons = [];
        }
        if (this.carouselName) {
            this.carouselName.destroy();
            this.carouselName = null;
        }
        if (this.carouselDesc) {
            this.carouselDesc.destroy();
            this.carouselDesc = null;
        }
    }

    showCharacterBox(charData, charKey) {
        // Prevent opening multiple modals
        if (this.characterBoxOpen) {
            return;
        }
        
        const { width, height } = this.scale;

        // Disable carousel controls
        this.characterBoxOpen = true;

        // --- Layout constants ---
        const boxWidth = 600;
        const boxHeight = 540;
        const BOX_PADDING_TOP = 70; // Increased from 36 to 70
        const SPACING = 32;
        const BAR_WIDTH = 400;
        const BAR_HEIGHT = 28;

        // Group for easy cleanup
        const boxObjects = [];

        // Dim background
        const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
            .setDepth(10);
        boxObjects.push(dim);

        // Main box
        const box = this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0xffffff, 1)
            .setStrokeStyle(4, 0x1e90ff)
            .setDepth(11);
        boxObjects.push(box);

        // Start Y at top of box, add padding
        let y = height / 2 - boxHeight / 2 + BOX_PADDING_TOP;

        // Character image removed (no icon in messageBox)
        // y += 76; // Adjusted for new scale and margin (skip this since no image)

        // Name
        boxObjects.push(
            this.add.text(width / 2, y, charData.name, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '32px',
                color: '#1e90ff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(12)
        );

        y += 44;

        // Description
        boxObjects.push(
            this.add.text(width / 2, y, charData.desc, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '18px',
                color: '#444466',
                wordWrap: { width: boxWidth - 60 },
                align: 'center'
            }).setOrigin(0.5).setDepth(12)
        );

        y += 54;

        // "Quests" label
        boxObjects.push(
            this.add.text(width / 2, y, "Quests", {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '24px',
                color: '#1e90ff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(12)
        );

        y += SPACING + 4;

        // --- Progress Bars and Descriptions ---
        const questColors = [0x1e90ff, 0x4caf50, 0xff9800];
        const questLabels = ['Quest 1', 'Quest 2', 'Quest 3'];
        const questPercents = [charData.progress, charData.side, charData.bonus];

        for (let i = 0; i < 3; i++) {
            // Label
            boxObjects.push(
                this.add.text(width / 2, y, `${questLabels[i]}: ${(questPercents[i] * 100).toFixed(0)}%`, {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '16px',
                    color: '#222244',
                    stroke: '#ffffff',
                    strokeThickness: 2
                }).setOrigin(0.5).setDepth(12)
            );
            y += 28;

            // Progress bar background
            boxObjects.push(
                this.add.rectangle(width / 2, y, BAR_WIDTH, BAR_HEIGHT, 0xcccccc)
                    .setDepth(12)
            );
            // Progress bar fill
            boxObjects.push(
                this.add.rectangle(
                    width / 2 - BAR_WIDTH / 2 + (questPercents[i] * BAR_WIDTH) / 2,
                    y,
                    questPercents[i] * BAR_WIDTH,
                    BAR_HEIGHT,
                    questColors[i]
                ).setDepth(12)
            );

            // Description
            y += BAR_HEIGHT;
            boxObjects.push(
                this.add.text(width / 2, y, charData.questDescs[i], {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '14px',
                    color: '#444466',
                    wordWrap: { width: boxWidth - 60 }
                }).setOrigin(0.5).setDepth(12)
            );
            y += SPACING;
        }

        // Story Mode and Progress buttons for characters with story content
        if (charData.name === "Noah" || charData.name === "Lily" || charData.name === "Damian") {
            let storyColor = 0x4caf50; // Default green for Noah
            let progressColor = 0x2196f3; // Default blue
            let chapterSelectScene = 'NoahChapterSelect';
            let progressTrackerScene = 'NoahProgressTracker';
            
            // Set colors and scenes based on character
            if (charData.name === "Lily") {
                storyColor = 0xff6b9d; // Pink for Lily
                chapterSelectScene = 'LilyChapterSelect';
                progressTrackerScene = 'LilyProgressTracker';
            } else if (charData.name === "Damian") {
                storyColor = 0xf57c00; // Orange for Damian
                chapterSelectScene = 'DamianChapterSelect';
                progressTrackerScene = 'DamianProgressTracker';
            }
            
            const storyBtn = this.add.rectangle(
                width / 2 - 110,
                height / 2 + boxHeight / 2 - 50,
                180,
                40,
                storyColor
            ).setDepth(12).setInteractive({ useHandCursor: true });
            boxObjects.push(storyBtn);

            const storyBtnText = this.add.text(
                width / 2 - 110,
                height / 2 + boxHeight / 2 - 50,
                'Story Mode',
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '14px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5).setDepth(13);
            boxObjects.push(storyBtnText);

            storyBtn.on('pointerdown', () => {
                this.se_confirmSound.play();
                boxObjects.forEach(obj => obj.destroy());
                this.characterBoxOpen = false;
                // Launch character's chapter selection
                this.scene.start(chapterSelectScene);
            });

            // Progress button
            const progressBtn = this.add.rectangle(
                width / 2 + 110,
                height / 2 + boxHeight / 2 - 50,
                180,
                40,
                progressColor
            ).setDepth(12).setInteractive({ useHandCursor: true });
            boxObjects.push(progressBtn);

            const progressBtnText = this.add.text(
                width / 2 + 110,
                height / 2 + boxHeight / 2 - 50,
                'Progress',
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '14px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5).setDepth(13);
            boxObjects.push(progressBtnText);

            progressBtn.on('pointerdown', () => {
                this.se_confirmSound.play();
                boxObjects.forEach(obj => obj.destroy());
                this.characterBoxOpen = false;
                // Launch character's progress tracker
                this.scene.start(progressTrackerScene);
            });

            // Hover effects
            const storyHoverColor = charData.name === "Lily" ? 0xff85b3 : (charData.name === "Damian" ? 0xff9800 : 0x66bb6a);
            storyBtn.on('pointerover', () => {
                storyBtn.setFillStyle(storyHoverColor);
                this.se_hoverSound.play();
            });
            storyBtn.on('pointerout', () => storyBtn.setFillStyle(storyColor));

            progressBtn.on('pointerover', () => {
                progressBtn.setFillStyle(0x42a5f5);
                this.se_hoverSound.play();
            });
            progressBtn.on('pointerout', () => progressBtn.setFillStyle(progressColor));
        }

        // Close button (top right of box)
        const closeBtn = this.add.text(
            width / 2 + boxWidth / 2 - 30,
            height / 2 - boxHeight / 2 + 30,
            '✕',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '24px',
                color: '#1e90ff',
                backgroundColor: '#fff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(13).setInteractive({ useHandCursor: true });
        boxObjects.push(closeBtn);

        closeBtn.on('pointerdown', () => {
            this.se_confirmSound.play();
            boxObjects.forEach(obj => obj.destroy());
            // Re-enable carousel controls
            this.characterBoxOpen = false;
        });
    }

    startClassroomTutorial() {
        const tutorialSteps = [...CLASSROOM_TUTORIAL_STEPS.firstTimeClassroom];
        
        // Set dynamic targets
        tutorialSteps.forEach(step => {
            switch (step.target) {
            }
        });

        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('classroom_tutorial');
                console.log('Classroom tutorial completed!');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('classroom_tutorial');
                console.log('Classroom tutorial skipped!');
            }
        });
    }

    showPrincipalRichard() {
        const scaleInfo = getScaleInfo(this);
        const { width, height } = scaleInfo;
        
        // Position character on the left side of the screen
        const characterX = width * 0.25; // 25% from left edge
        const characterY = height * 0.45; // 45% from top to avoid dialogue box
        
        // Responsive scaling for mobile devices
        const isMobile = width < 768 || height < 600;
        const characterScale = isMobile ? 0.175 : 0.4; // Smaller scale for better positioning
        
        // Add Principal Richard character image
        this.principalDisplay = this.add.image(characterX, characterY, 'Richard');
        this.principalDisplay.setOrigin(0.5, 0.5);
        this.principalDisplay.setScale(characterScale);
        this.principalDisplay.setDepth(5); // Behind dialogue box but above background
        
        // Add a subtle fade-in effect
        this.principalDisplay.setAlpha(0);
        this.tweens.add({
            targets: this.principalDisplay,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    hidePrincipalRichard() {
        if (this.principalDisplay) {
            // Fade out and destroy
            this.tweens.add({
                targets: this.principalDisplay,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    if (this.principalDisplay) {
                        this.principalDisplay.destroy();
                        this.principalDisplay = null;
                    }
                }
            });
        }
    }
}