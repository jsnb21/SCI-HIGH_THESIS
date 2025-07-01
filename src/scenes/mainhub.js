import Phaser from 'phaser';
import VNDialogueBox from '../ui/VNDialogueBox';
import Carousel from '../ui/carouselUI.js';
import { playExclusiveBGM } from '../audioUtils';
import { onceOnlyFlags } from '../gameManager';
import gameManager from '../gameManager.js';
import { createBackButton } from '../components/buttons/backbutton.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
        this.uiElements = [];
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
            });
            this.uiElements.push(this.vnBox);        } else {
            this.createCarousel(iconKeys, iconInfo);
        }

        // Create back button using the reusable component
        const backButtonComponents = createBackButton(this, 'MainMenu');
        this.uiElements.push(backButtonComponents.buttonBg, backButtonComponents.backButton);
    }createCarousel(iconKeys, iconInfo) {
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
    }    onResize() {
        // Just recreate the entire UI to avoid geometry issues
        this.time.delayedCall(50, () => this.createUI());
    }

    update() {
        if (this.bg) {
            this.bg.tilePositionY -= 1;
        }
        
        // Update points display if it exists
        if (this.pointsDisplay) {
            this.pointsDisplay.update();
        }
    }
}
