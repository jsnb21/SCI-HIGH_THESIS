import Phaser from 'phaser';
import Carousel from '../ui/carouselUI.js';
import { createBackButton } from '../components/buttons/backbutton'; // <-- Add this import
import gameManager from '../gameManager.js';
import { onceOnlyFlags } from '../gameManager.js';
import TutorialManager from '../components/TutorialManager.js';
import { COMPUTER_LAB_TUTORIAL_STEPS } from '../components/TutorialConfig.js';
import LoadingScreen from '../ui/LoadingScreen.js';
import { playExclusiveBGM, updateSoundVolumes } from '../audioUtils.js';

export default class ComputerLab extends Phaser.Scene {
    constructor() {
        super({ key: 'ComputerLab' });
        this.tutorialManager = null;
    }

    preload() {
    
        // Load background and icon images
        this.load.image('MainHubBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('Web_Design', 'assets/img/comlab/icons/web-design_logo.png');
        this.load.image('Python', 'assets/img/comlab/icons/python_logo.png');
        this.load.image('Java', 'assets/img/comlab/icons/java_logo.png');
        this.load.image('C', 'assets/img/comlab/icons/c_logo.png');
        this.load.image('C++', 'assets/img/comlab/icons/cplus_logo.png');
    this.load.image('C#', 'assets/img/comlab/icons/csharp_logo.png');
    // Placeholder icon for custom quizzes (reuse an existing or add a new asset path if available)
    this.load.image('CustomQuiz', 'assets/img/comlab/icons/CustomQuiz.png');

        // Load sound effects
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_computer-lab', 'assets/audio/bgm/bgm_computer-lab.mp3');

        // Load questions JSON
        this.load.json('questions', 'data/questions.json');

        // Add font loading
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
    }

    async create() {

        // Set up background
        this.cameras.main.setBackgroundColor('#D6C8F2');

    // Create a back button to return to the MainHub
    const backBtn = createBackButton(this, 'MainHub');

        // Add points display in top-right corner
        const { width } = this.scale;
        const scaleFactor = Math.min(width / 816, this.scale.height / 624); // Using BASE_WIDTH and BASE_HEIGHT
        const pointsDisplay = gameManager.createPointsDisplay(this, width - 100 * scaleFactor, 40 * scaleFactor, scaleFactor);
        this.pointsDisplay = pointsDisplay;
        // Align points display vertically with the back button if possible
        if (backBtn && backBtn.buttonBg && this.pointsDisplay && this.pointsDisplay.container) {
            this.pointsDisplay.container.y = backBtn.buttonBg.y;
        }
        // Adjust points display X using logical width so it's further to the right but still inside
        if (this.pointsDisplay && this.pointsDisplay.container) {
            const pillHalfWidth = 50 * scaleFactor; // matches createPointsDisplay width (100 * scaleFactor) / 2
            const rightMargin = 20 * scaleFactor;   // small inset from the right edge
            this.pointsDisplay.container.x = this.scale.width - (pillHalfWidth + rightMargin);
        }

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Play computer lab background music
        playExclusiveBGM(this, 'bgm_computer-lab', { loop: true });
        updateSoundVolumes(this);        // Define carousel data
        const iconKeys = ['Web_Design', 'Python', 'Java', 'C', 'C++', 'C#', 'CustomQuiz'];
        const iconInfo = [
            { heading: "Web Design", desc: "Learn HTML, CSS & JavaScript", courseKey: "Web_Design" },
            { heading: "Python", desc: "Learn Python", courseKey: "Python" },
            { heading: "Java", desc: "Learn Java", courseKey: "Java" },
            { heading: "C", desc: "Learn about C", courseKey: "C" },
            { heading: "C++", desc: "Learn about C++", courseKey: "C++" },
            { heading: "C#", desc: "Learn about C#", courseKey: "C#" },
            { heading: "Custom Quiz", desc: "Play a professor-made quiz", courseKey: "CustomQuiz" }
        ];

        // Create the carousel with the icon keys and info
        this.createCarousel(iconKeys, iconInfo);

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);

        // Check if this is the first time visiting the computer lab
        if (!onceOnlyFlags.hasSeen('computerlab_tutorial')) {
            // Delay tutorial start to ensure all UI elements are created
            this.time.delayedCall(500, () => {
                this.startComLabTutorial();
            });
        }

        // Debug features
        this.input.keyboard.on('keydown-T', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                this.startComLabTutorial();
            }
        });

        this.input.keyboard.on('keydown-R', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                onceOnlyFlags.flags['computerlab_tutorial'] = false;
            }
        });

        // (Notification debug code removed after verification)
    }

    createCarousel(iconKeys, iconInfo) {
        // Initialize the carousel
        this.carousel = new Carousel(this, {
            centerY: 400,
            spacing: 400,
            largeScale: 0.25,  // 70% smaller than 0.2
            smallScale: 0.1,   // Also specify smallScale to be proportionally smaller
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

        // Determine locked states based on game progress
        const lockedStates = iconInfo.map(info => {
            if(info.courseKey === 'CustomQuiz') return false; // always unlocked
            return !gameManager.isCourseUnlocked(info.courseKey);
        });

        // Create the carousel with selection callback and locked states
        this.carousel.create(iconKeys, iconInfo, (selectedItem, index) => {
            // Transition to the roguelike game based on the selected course
            if (selectedItem.heading === "Web Design") {
                LoadingScreen.transitionToCourse(this, 'MainGameplay', 'Web Design Course - Roguelike Mode', { topic: 'webdesign' });
            } else if (selectedItem.heading === "Python") {
                LoadingScreen.transitionToCourse(this, 'MainGameplay', 'Python Course - Roguelike Mode', { topic: 'python' });
            } else if (selectedItem.heading === "Java"){
                LoadingScreen.transitionToCourse(this, 'MainGameplay', 'Java Course - Roguelike Mode', { topic: 'java' });
            } else if (selectedItem.heading === "C"){
                LoadingScreen.transitionToCourse(this, 'MainGameplay', 'C Programming Course - Roguelike Mode', { topic: 'c' });
            } else if (selectedItem.heading === "C++"){
                LoadingScreen.transitionToCourse(this, 'MainGameplay', 'C++ Course - Roguelike Mode', { topic: 'cpp' });
            } else if (selectedItem.heading === "C#"){
                LoadingScreen.transitionToCourse(this, 'MainGameplay', 'C# Course - Roguelike Mode', { topic: 'csharp' });
            } else if (selectedItem.heading === "Custom Quiz") {
                // Go to selection scene first so player can choose which custom quiz
                LoadingScreen.transitionToCourse(this, 'CustomQuizSelectScene', 'Custom Quiz Selection', {});
            }
        }, lockedStates);
    }
    update() {
        // Update points display if it exists
        if (this.pointsDisplay) {
            this.pointsDisplay.update();
        }
    }

    startComLabTutorial() {
        const tutorialSteps = [...COMPUTER_LAB_TUTORIAL_STEPS.firstTimeComLab];
        
        // Set dynamic targets
        tutorialSteps.forEach(step => {
            switch (step.target) {
                case 'carousel':
                    if (this.carousel && this.carousel.bgPanel) {
                        step.target = this.carousel.bgPanel;
                    }
                    break;
                case 'webDesignIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        const webDesignIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 0 && !icon.isLockIcon
                        );
                        if (webDesignIcon) {
                            step.target = webDesignIcon;
                        }
                    }
                    break;
                case 'pythonIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        const pythonIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 1 && !icon.isLockIcon
                        );
                        if (pythonIcon) {
                            step.target = pythonIcon;
                        }
                    }
                    break;
            }
        });

        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('computerlab_tutorial');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('computerlab_tutorial');
            }
        });
    }

    shutdown() {
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
        // Clean up carousel
        if (this.carousel) {
            this.carousel.destroy();
            this.carousel = null;
        }
        
        // Clean up points display
        if (this.pointsDisplay) {
            if (this.pointsDisplay.destroy) {
                this.pointsDisplay.destroy();
            }
            this.pointsDisplay = null;
        }
    }
}