import Phaser from 'phaser';
import { char1, char2, char3, char4, char5 } from '../gameManager';
import { createBackButton } from '../components/buttons/backbutton';
import Carousel from '../ui/carouselUI';
import { onceOnlyFlags } from '../gameManager';
import TutorialManager from '../components/TutorialManager.js';
import { CLASSROOM_TUTORIAL_STEPS } from '../components/TutorialConfig.js';

export default class Classroom extends Phaser.Scene {
    constructor() {
        super('Classroom');
        this.tutorialManager = null;
    }

    preload() {
        // Load character images from assets/img/sprites/npcs with their respective names
        this.load.image('Noah', 'assets/sprites/npcs/noah.png');
        this.load.image('Lily', 'assets/sprites/npcs/lily.png');
        this.load.image('Damian', 'assets/sprites/npcs/damian.png');
        this.load.image('Bella', 'assets/sprites/npcs/bella.png');
        this.load.image('Finley', 'assets/sprites/npcs/finley.png');
        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
    }

    create() {
        const { width, height } = this.scale;

        // Initialize modal state
        this.characterBoxOpen = false;

        // Add background color
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

        // Create the carousel
        this.characterCarousel = new Carousel(this, {
            iconSpacing: 340,
            smallScale: 0.18, // smaller side images (was 0.32)
            largeScale: 0.28, // smaller main image (was 0.48)
            iconYOffset: -20, // Move carousel up to better center the overall layout
            headingStyle: { fontSize: 48 },
            descStyle: { fontSize: 28 }
        }).create(
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
        
        // Clean up carousel icons and tweens to prevent ghosting
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween = null;
        }
        if (this.carouselIcons) {
            this.carouselIcons.forEach(icon => icon.destroy());
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

    moveCarousel(direction, charInfo) {
        const iconCount = this.carouselIcons.length;
        let newIndex = Phaser.Math.Clamp(this.carouselIndex + direction, 0, iconCount - 1);
        if (newIndex === this.carouselIndex) return;

        this.carouselIndex = newIndex;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2; // Use actual center instead of hardcoded offset
        const spacing = 340;
        const smallScale = 0.125;
        const largeScale = 0.3;
        const visualOffset = -20; // Adjusted to match the carousel config

        this.carouselIcons.forEach((icon, i) => {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            icon.setScale(scale);
            icon.setX(x);
            icon.setOrigin(0.5, 1);
            icon.y = centerY + visualOffset; 
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
                icon.setDepth(2);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.7);
                icon.setDepth(1);
            }
        });

        this.updateCarouselText(charInfo);
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(charInfo) {
        const info = charInfo[this.carouselIndex];
        this.carouselName.setText(info.name);
        this.carouselDesc.setText(info.desc);
    }

    startBreathingEffect(icon) {
        if (this.breathingTween) {
            this.breathingTween.stop();
            icon.setScale(1.2);
        }
        this.breathingTween = this.tweens.add({
            targets: icon,
            scale: { from: 0.7, to: 0.8 }, // Subtle breathing for portrait
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
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
                fontFamily: 'Jersey15-Regular',
                fontSize: '42px',
                color: '#1e90ff'
            }).setOrigin(0.5).setDepth(12)
        );

        y += 44;

        // Description
        boxObjects.push(
            this.add.text(width / 2, y, charData.desc, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '24px',
                color: '#444466',
                wordWrap: { width: boxWidth - 60 },
                align: 'center'
            }).setOrigin(0.5).setDepth(12)
        );

        y += 54;

        // "Quests" label
        boxObjects.push(
            this.add.text(width / 2, y, "Quests", {
                fontFamily: 'Jersey15-Regular',
                fontSize: '32px',
                color: '#1e90ff'
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
                    fontFamily: 'Jersey15-Regular',
                    fontSize: '20px',
                    color: '#222244'
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
                    fontFamily: 'Jersey15-Regular',
                    fontSize: '18px',
                    color: '#444466',
                    wordWrap: { width: boxWidth - 60 }
                }).setOrigin(0.5).setDepth(12)
            );
            y += SPACING;
        }

        // Close button (top right of box)
        const closeBtn = this.add.text(
            width / 2 + boxWidth / 2 - 30,
            height / 2 - boxHeight / 2 + 30,
            '✕',
            {
                fontFamily: 'Jersey15-Regular',
                fontSize: '32px',
                color: '#1e90ff',
                backgroundColor: '#fff'
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
}