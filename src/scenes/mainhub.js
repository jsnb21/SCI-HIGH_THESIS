import Phaser from 'phaser';
import VNDialogueBox from '../ui/VNDialogueBox';
import Carousel from '../ui/carouselUI.js';
import { playExclusiveBGM } from '../audioUtils';
import { onceOnlyFlags } from '../gameManager';
import gameManager from '../gameManager.js';
import { createBackButton } from '../components/buttons/backbutton.js';
import TutorialManager from '../components/TutorialManager.js';
import { MAIN_HUB_TUTORIAL_STEPS } from '../components/TutorialConfig.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
        this.uiElements = [];
        this.tutorialManager = null;
    }

    preload() {
        this.load.image('MainHubBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('icon1', 'assets/img/mainhub/CLASSROOM_ICON.png');
        this.load.image('icon2', 'assets/img/mainhub/LIBRARY_ICON.png');
        this.load.image('icon3', 'assets/img/mainhub/OFFICE_ICON.png');        this.load.image('icon4', 'assets/img/mainhub/COMLAB_ICON.png');
        // this.load.image('icon5', 'assets/img/mainhub/canteenIcon.png');

        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
        this.load.audio('bgm_mainhub', 'assets/audio/bgm/bgm_mainhub.mp3');
        
        // Add font loading
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
    }    create() {
        // Stop or cleanup any other scenes that might be running
        const sceneManager = this.scene.manager;
        
        // Stop DungeonScene if it exists and is active/paused
        if (sceneManager.isActive('DungeonScene') || sceneManager.isPaused('DungeonScene')) {
            sceneManager.stop('DungeonScene');
        }
        
        // Stop any quiz scenes that might still be running
        const quizScenes = ['PythonQuizScene', 'JavaQuizScene', 'CQuizScene', 'CSharpQuizScene', 'CplusplusQuizScene', 'WebDesignQuizScene'];
        quizScenes.forEach(sceneName => {
            if (sceneManager.isActive(sceneName) || sceneManager.isPaused(sceneName)) {
                sceneManager.stop(sceneName);
            }
        });
        
        // Set up cameras first
        this.cameras.main.setBackgroundColor('#87ceeb');
        
        // Then initialize UI with delay to ensure everything is ready
        this.time.delayedCall(10, () => this.createUI());
        this.scale.on('resize', this.onResize, this);
    }

    createUI() {
        if (this.uiElements.length) {
            this.uiElements.forEach(el => el.destroy());
            this.uiElements = [];
        }
        if (this.carousel) {
            this.carousel.destroy();
            this.carousel = null;
        }
        if (this.vnBox) {
            this.vnBox.destroy();
            this.vnBox = null;
        }
        // Clean up points display properly
        if (this.pointsDisplay) {
            if (this.pointsDisplay.destroy) {
                this.pointsDisplay.destroy();
            }
            this.pointsDisplay = null;
        }

        const { width, height } = this.scale;
        this.scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        const scaleFont = (size) => Math.round(size * this.scaleFactor);

        playExclusiveBGM(this, 'bgm_mainhub', { loop: true });

        this.bg = this.add.tileSprite(0, 0, width, height, 'MainHubBG').setOrigin(0, 0);
        this.bg.setAlpha(0.5);
        if (this.cameras && this.cameras.main) {
            this.cameras.main.setBackgroundColor('#87ceeb');
        }
        this.uiElements.push(this.bg);

        // Add points display in top-right corner
        const pointsDisplay = gameManager.createPointsDisplay(this, width - 100 * this.scaleFactor, 40 * this.scaleFactor, this.scaleFactor);
        this.pointsDisplay = pointsDisplay;
        this.uiElements.push(pointsDisplay.container);

        // Add leaderboard button just below the points display
        const leaderboardBtn = this.add.rectangle(width - 100 * this.scaleFactor, 85 * this.scaleFactor, 140 * this.scaleFactor, 35 * this.scaleFactor, 0x3498DB);
        leaderboardBtn.setStrokeStyle(2 * this.scaleFactor, 0x2980B9);
        leaderboardBtn.setInteractive({ useHandCursor: true });
        leaderboardBtn.setDepth(100);

        const leaderboardText = this.add.text(width - 100 * this.scaleFactor, 85 * this.scaleFactor, '🏆 Leaderboard', {
            fontSize: `${12 * this.scaleFactor}px`,
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(101);

        // Hover effects
        leaderboardBtn.on('pointerover', () => {
            leaderboardBtn.setFillStyle(0x2980B9);
            leaderboardText.setStyle({ color: '#F1C40F' });
            this.se_hoverSound.play();
        });

        leaderboardBtn.on('pointerout', () => {
            leaderboardBtn.setFillStyle(0x3498DB);
            leaderboardText.setStyle({ color: '#FFFFFF' });
        });

        // Click handler
        leaderboardBtn.on('pointerdown', () => {
            this.se_confirmSound.play();
            gameManager.showLeaderboardDialog(this);
        });

        this.uiElements.push(leaderboardBtn, leaderboardText);

        // Check if we should show a leaderboard suggestion
        if (gameManager.shouldPromptLeaderboard()) {
            this.showLeaderboardSuggestion();
        }

        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        const iconKeys = ['icon1', 'icon2', 'icon3', 'icon4'];
        const iconInfo = [
            { heading: "Classroom", desc: "Meet your classmates!" },
            { heading: "Library", desc: "Read and research." },
            { heading: "Office", desc: "Meet your professor." },
            { heading: "Computer Lab", desc: "Take on different courses!" }
            // { heading: "Cafeteria", desc: "Take a break and eat." }
        ];

        if (!onceOnlyFlags.hasSeen('mainhub_intro')) {
            this.vnBox = new VNDialogueBox(this, [
                "Hmm...",
                "Where should I go next?",
                "I should go to the classroom and ask my professor on what I should do."
            ], () => {
                onceOnlyFlags.setSeen('mainhub_intro');
                this.createCarousel(iconKeys, iconInfo);
                
                // Start tutorial after carousel is created (if first time visiting hub)
                if (!onceOnlyFlags.hasSeen('mainhub_tutorial')) {
                    this.time.delayedCall(300, () => {
                        this.startHubTutorial();
                    });
                }
            });
            this.uiElements.push(this.vnBox);
        } else {
            this.createCarousel(iconKeys, iconInfo);
            
            // Start tutorial after carousel is created (if first time visiting hub)
            if (!onceOnlyFlags.hasSeen('mainhub_tutorial')) {
                this.time.delayedCall(300, () => {
                    this.startHubTutorial();
                });
            }
        }

        // Create back button using the reusable component
        const backButtonComponents = createBackButton(this, 'MainMenu');
        this.uiElements.push(backButtonComponents.buttonBg, backButtonComponents.backButton);

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);

        // Debug feature: Add a key to manually trigger the tutorial (T key)
        this.input.keyboard.on('keydown-T', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                // Shift+T to trigger tutorial manually for testing
                this.startHubTutorial();
            }
        });

        // Debug feature: Reset tutorial flag with Shift+R for testing
        this.input.keyboard.on('keydown-R', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                onceOnlyFlags.flags['mainhub_tutorial'] = false;
                console.log('Main hub tutorial flag reset - tutorial will show on next visit');
            }
        });
    }

    startHubTutorial() {
        // Prepare tutorial steps with dynamic targets
        const tutorialSteps = [...MAIN_HUB_TUTORIAL_STEPS.firstTimeHub];
        
        // Set dynamic targets for tutorial steps
        tutorialSteps.forEach(step => {
            switch (step.target) {
                case 'pointsDisplay':
                    if (this.pointsDisplay && this.pointsDisplay.container) {
                        step.target = this.pointsDisplay.container;
                    }
                    break;
                case 'leaderboardButton':
                    // Find the leaderboard button from UI elements
                    const leaderboardBtn = this.uiElements.find(el => 
                        el.type === 'Rectangle' && el.x > this.scale.width * 0.8
                    );
                    if (leaderboardBtn) {
                        step.target = leaderboardBtn;
                    }
                    break;
                case 'classroomIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        // Find the classroom icon (index 0) in carouselIcons
                        const classroomIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 0 && !icon.isLockIcon
                        );
                        if (classroomIcon) {
                            step.target = classroomIcon;
                        }
                    }
                    break;
                case 'comlabIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        // Find the computer lab icon (index 3) in carouselIcons
                        const comlabIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 3 && !icon.isLockIcon
                        );
                        if (comlabIcon) {
                            step.target = comlabIcon;
                        }
                    }
                    break;
                case 'libraryIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        // Find the library icon (index 1) in carouselIcons
                        const libraryIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 1 && !icon.isLockIcon
                        );
                        if (libraryIcon) {
                            step.target = libraryIcon;
                        }
                    }
                    break;
                case 'officeIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        // Find the office icon (index 2) in carouselIcons
                        const officeIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 2 && !icon.isLockIcon
                        );
                        if (officeIcon) {
                            step.target = officeIcon;
                        }
                    }
                    break;
            }
        });

        // Start the tutorial
        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('mainhub_tutorial');
                console.log('Main hub tutorial completed!');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('mainhub_tutorial');
                console.log('Main hub tutorial skipped!');
            }
        });
    }

    createCarousel(iconKeys, iconInfo) {
        const { width } = this.scale;
        this.carousel = new Carousel(this, {
            iconCenterY: 220,
            largeScale: 0.3,  
            smallScale: 0.15,
            sounds: {
                hover: 'se_hoverSound',
                confirm: 'se_confirmSound'
            }
        });

        // Add shutdown and destroy event listeners to clean up the carousel
        this.events.on('shutdown', () => {
            if (this.carousel) this.carousel.destroy();
        });
        this.events.on('destroy', () => {
            if (this.carousel) this.carousel.destroy();
        });

        this.carousel.create(iconKeys, iconInfo, (selectedItem, index) => {
            console.log('Selected:', selectedItem.heading);

            switch (selectedItem.heading) {
                case "Computer Lab":
                    this.scene.start('ComputerLab');
                    break;
                case "Classroom":
                    this.scene.start('Classroom');
                    break;
                case "Office":
                    this.scene.start('Office');
                    break;
                case "Library":
                    this.scene.start('BaseLibraryScene');
                    break;
                case "Cafeteria":
                    this.scene.start('Cafeteria');
                    break;
            }
        });
    }    showLeaderboardSuggestion() {
        const { width, height } = this.scale;
        
        // Create a subtle notification
        const notificationBg = this.add.rectangle(width / 2, 120 * this.scaleFactor, 300 * this.scaleFactor, 60 * this.scaleFactor, 0x3498DB, 0.9);
        notificationBg.setStrokeStyle(2 * this.scaleFactor, 0xF1C40F);
        notificationBg.setDepth(150);

        const notificationText = this.add.text(width / 2, 120 * this.scaleFactor, '🏆 New milestone reached!\nClick Leaderboard to submit your score!', {
            fontSize: `${14 * this.scaleFactor}px`,
            color: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(151);

        // Auto-hide after 5 seconds
        this.time.delayedCall(5000, () => {
            if (notificationBg && notificationText) {
                this.tweens.add({
                    targets: [notificationBg, notificationText],
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => {
                        notificationBg.destroy();
                        notificationText.destroy();
                    }
                });
            }
        });

        // Add to UI elements for cleanup
        this.uiElements.push(notificationBg, notificationText);
    }

    onResize() {
        // Just recreate the entire UI to avoid geometry issues
        this.time.delayedCall(50, () => this.createUI());
    }

    update() {
        if (this.bg) {
            this.bg.tilePositionY -= 1;
        }
        // Update points display if it exists and is still valid
        if (this.pointsDisplay && this.pointsDisplay.update) {
            try {
                this.pointsDisplay.update();
            } catch (error) {
                console.warn('Points display update failed, clearing reference:', error);
                this.pointsDisplay = null;
            }
        }
    }

    shutdown() {
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
        // Clean up all UI elements and references when scene shuts down
        if (this.pointsDisplay) {
            if (this.pointsDisplay.destroy) {
                this.pointsDisplay.destroy();
            }
            this.pointsDisplay = null;
        }
        
        if (this.uiElements.length) {
            this.uiElements.forEach(el => {
                if (el && el.destroy) {
                    el.destroy();
                }
            });
            this.uiElements = [];
        }
        
        if (this.carousel) {
            this.carousel.destroy();
            this.carousel = null;
        }
        
        if (this.vnBox) {
            this.vnBox.destroy();
            this.vnBox = null;
        }
    }
}
