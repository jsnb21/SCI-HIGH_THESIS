import Phaser from 'phaser';
import { renderProfileSection } from './officeScenes/studentProfile.js';
import { renderStatsSection } from './officeScenes/performanceStats.js';
import { renderAchievementsSection } from './officeScenes/achievements.js';
import { renderFeedbackSection } from './officeScenes/feedback.js';
import { createBackButton } from '../components/buttons/backbutton'; // <-- Add this import
import { onceOnlyFlags } from '../gameManager';
import TutorialManager from '../components/TutorialManager.js';
import { OFFICE_TUTORIAL_STEPS } from '../components/TutorialConfig.js';
import { playExclusiveBGM, updateSoundVolumes } from '../audioUtils.js';

export default class Office extends Phaser.Scene {
    constructor() {
        super('Office');
        this.tutorialManager = null;
    }

    preload() {
        // Load office background
        this.load.image('officeBG', 'assets/img/mainhub/MainHubBG.png'); // Using MainHub as placeholder
        
        // Load icons for each section
        this.load.image('profile', 'assets/img/icons/office/studentProfile.png');
        this.load.image('stats', 'assets/img/icons/office/performanceStats.png');
        this.load.image('achievements', 'assets/img/icons/office/achievements.png');
        this.load.image('feedback', 'assets/img/icons/office/feedback.png');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_mainhub', 'assets/audio/bgm/bgm_mainhub.mp3'); // Use mainhub music for office
    }

    create() {
        const { width, height } = this.scale;
        
        // Add office background
        this.bg = this.add.tileSprite(0, 0, width, height, 'officeBG').setOrigin(0, 0);
        
        // Add background color overlay
        this.cameras.main.setBackgroundColor('#F6C1D0');

        // Sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Play background music (using mainhub music for office)
        playExclusiveBGM(this, 'bgm_mainhub', { loop: true });
        updateSoundVolumes(this);

        // Carousel data
        const sectionKeys = ['profile', 'stats', 'achievements', 'feedback'];
        const sectionTitles = [
            "Student Profile",
            "Performance Stats",
            "Achievements Wall",
            "Feedback + Goals Board"
        ];
        const sectionDescs = [
            "View and edit your student profile.",
            "See your performance statistics.",
            "Check out your unlocked achievements.",
            "Read feedback and set new goals."
        ];

        const iconCount = sectionKeys.length;
        const centerX = width / 2;
        const centerY = height / 2 - 40;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIndex = 0;
        this.carouselIcons = [];

        // Add carousel icons
        for (let i = 0; i < iconCount; i++) {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            const icon = this.add.image(x, centerY, sectionKeys[i]).setScale(scale).setInteractive();
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.8);
            }
            this.carouselIcons.push(icon);
        }

        // Section title and description display
        this.carouselTitle = this.add.text(centerX, centerY + 180, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '48px',
            color: '#222244',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.carouselDesc = this.add.text(centerX, centerY + 255, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '32px',
            color: '#444466',
            wordWrap: { width: 400 },
            align: 'center'
        }).setOrigin(0.5);

        this.updateCarouselText(sectionTitles, sectionDescs);

        // Breathing effect for selected icon
        this.breathingTween = null;
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);

        // Track if box is open
        this.sectionBoxOpen = false;

        // Keyboard navigation
        this.input.keyboard.on('keydown-LEFT', () => {
            if (!this.sectionBoxOpen) {
                this.se_hoverSound.play();
                this.moveCarousel(-1, sectionTitles, sectionDescs);
            }
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            if (!this.sectionBoxOpen) {
                this.se_hoverSound.play();
                this.moveCarousel(1, sectionTitles, sectionDescs);
            }
        });

        // Mouse wheel navigation
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (!this.sectionBoxOpen) {
                if (deltaY > 0) {
                    this.se_hoverSound.play();
                    this.moveCarousel(1, sectionTitles, sectionDescs);
                } else if (deltaY < 0) {
                    this.se_hoverSound.play();
                    this.moveCarousel(-1, sectionTitles, sectionDescs);
                }
            }
        });

        // Click to select or move carousel
        this.carouselIcons.forEach((icon, i) => {
            icon.on('pointerdown', () => {
                if (this.sectionBoxOpen) return;
                if (i === this.carouselIndex) {
                    this.se_confirmSound.play();
                    this.showSectionBox(sectionKeys[i], sectionTitles[i], sectionDescs[i]);
                } else {
                    this.se_hoverSound.play();
                    this.moveCarousel(i - this.carouselIndex, sectionTitles, sectionDescs);
                }
            });
        });

        // Use the shared back button (top-left, consistent style)
        createBackButton(this, 'MainHub');

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);

        // Check if this is the first time visiting the office
        if (!onceOnlyFlags.hasSeen('office_tutorial')) {
            // Delay tutorial start to ensure all UI elements are created
            this.time.delayedCall(500, () => {
                this.startOfficeTutorial();
            });
        }

        // Debug features
        this.input.keyboard.on('keydown-T', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                this.startOfficeTutorial();
            }
        });

        this.input.keyboard.on('keydown-R', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                onceOnlyFlags.flags['office_tutorial'] = false;
                console.log('Office tutorial flag reset');
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
        
        // Clean up carousel icons and tweens to prevent ghosting
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween = null;
        }
        if (this.carouselIcons) {
            this.carouselIcons.forEach(icon => icon.destroy());
            this.carouselIcons = [];
        }
        if (this.carouselTitle) {
            this.carouselTitle.destroy();
            this.carouselTitle = null;
        }
        if (this.carouselDesc) {
            this.carouselDesc.destroy();
            this.carouselDesc = null;
        }
    }

    moveCarousel(direction, sectionTitles, sectionDescs) {
        const iconCount = this.carouselIcons.length;
        let newIndex = Phaser.Math.Clamp(this.carouselIndex + direction, 0, iconCount - 1);
        if (newIndex === this.carouselIndex) return;

        this.carouselIndex = newIndex;
        const centerX = this.scale.width / 2;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIcons.forEach((icon, i) => {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            icon.setScale(scale);
            icon.setX(x);
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.8);
            }
        });

        this.updateCarouselText(sectionTitles, sectionDescs);
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(sectionTitles, sectionDescs) {
        this.carouselTitle.setText(sectionTitles[this.carouselIndex]);
        this.carouselDesc.setText(sectionDescs[this.carouselIndex]);
    }

    startBreathingEffect(icon) {
        if (this.breathingTween) {
            this.breathingTween.stop();
            icon.setScale(1.2);
        }
        this.breathingTween = this.tweens.add({
            targets: icon,
            scale: { from: 1.2, to: 1.35 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    showSectionBox(sectionKey, sectionTitle, sectionDesc) {
        const { width, height } = this.scale;
        this.sectionBoxOpen = true;

        // --- Layout constants ---
        const boxWidth = 600;
        const boxHeight = 540;
        const BOX_PADDING_TOP = 40; // Reduced padding for more space
        const SPACING = 24;

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

        // Only add section icon if not 'stats' && sectionKey !== 'profile' && sectionKey !== 'history'
        if (sectionKey !== 'stats' && sectionKey !== 'profile' && sectionKey !== 'history') {
            const sectionImg = this.add.image(width / 2, y, sectionKey)
                .setScale(0.8)
                .setDepth(12);
            boxObjects.push(sectionImg);
            y += 76;
        }

        // Title
        boxObjects.push(
            this.add.text(width / 2, y, 
                sectionKey === 'profile' || sectionKey === 'history' 
                    ? "Student Profile" 
                    : sectionTitle, 
                {
                    fontFamily: 'Jersey15-Regular',
                    fontSize: '42px',
                    color: '#1e90ff'
                }
            ).setOrigin(0.5).setDepth(12)
        );

        y += 38; // <-- Add this line if not present, or increase if needed

        // Description or custom content per section
        let contentText = sectionDesc;
        switch (sectionKey) {
            case 'profile':
            case 'history':
                renderProfileSection(this, boxObjects, width, y);
                break;
            case 'stats':
                renderStatsSection(this, boxObjects, width, y);
                break;
            case 'achievements':
                renderAchievementsSection(this, boxObjects, width, y, boxWidth);
                break;
            case 'feedback':
                renderFeedbackSection(this, boxObjects, width, y);
                break;
            // ...other cases...
            default:
                // fallback
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
            this.sectionBoxOpen = false;
        });
    }

    startOfficeTutorial() {
        const tutorialSteps = [...OFFICE_TUTORIAL_STEPS.firstTimeOffice];
        
        // Set dynamic targets
        tutorialSteps.forEach(step => {
            switch (step.target) {
                case 'carousel':
                    // Target the general carousel area
                    if (this.carouselIcons && this.carouselIcons.length > 0) {
                        step.target = this.carouselIcons[this.carouselIndex];
                    }
                    break;
                case 'profileSection':
                    if (this.carouselIcons && this.carouselIcons[0]) {
                        step.target = this.carouselIcons[0];
                    }
                    break;
                case 'statsSection':
                    if (this.carouselIcons && this.carouselIcons[1]) {
                        step.target = this.carouselIcons[1];
                    }
                    break;
                case 'achievementsSection':
                    if (this.carouselIcons && this.carouselIcons[2]) {
                        step.target = this.carouselIcons[2];
                    }
                    break;
                case 'feedbackSection':
                    if (this.carouselIcons && this.carouselIcons[3]) {
                        step.target = this.carouselIcons[3];
                    }
                    break;
            }
        });

        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('office_tutorial');
                console.log('Office tutorial completed!');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('office_tutorial');
                console.log('Office tutorial skipped!');
            }
        });
    }
}