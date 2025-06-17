import Phaser from 'phaser';
import VNDialogueBox from '../ui/VNDialogueBox';
import Carousel from '../ui/carouselUI.js';
import { playExclusiveBGM } from '../audioUtils';
import { onceOnlyFlags } from '../gameManager';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
        this.uiElements = [];
    }

    preload() {
        this.load.image('MainHubBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('icon1', 'assets/img/mainhub/classroomIcon.png');
        this.load.image('icon2', 'assets/img/mainhub/libraryIcon.png');
        this.load.image('icon3', 'assets/img/mainhub/officeIcon.png');
        this.load.image('icon4', 'assets/img/mainhub/computerLabIcon.png');
        this.load.image('icon5', 'assets/img/mainhub/canteenIcon.png');

        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
        this.load.audio('bgm_mainhub', 'assets/audio/bgm/bgm_mainhub.mp3');
    }

    create() {
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

        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        const iconKeys = ['icon1', 'icon2', 'icon3', 'icon4', 'icon5'];
        const iconInfo = [
            { heading: "Classroom", desc: "Meet your classmates!" },
            { heading: "Library", desc: "Read and research." },
            { heading: "Office", desc: "Meet your professor." },
            { heading: "Computer Lab", desc: "Take on different courses!" },
            { heading: "Cafeteria", desc: "Take a break and eat." }
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
            this.uiElements.push(this.vnBox);
        } else {
            this.createCarousel(iconKeys, iconInfo);
        }

        const buttonX = 100 * this.scaleFactor;
        const buttonY = 50 * this.scaleFactor;
        const buttonWidth = 120 * this.scaleFactor;
        const buttonHeight = 40 * this.scaleFactor;

        const buttonBg = this.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, 0x000000, 0.7)
            .setStrokeStyle(2, 0xffffff);
        this.uiElements.push(buttonBg);

        const backButton = this.add.text(buttonX, buttonY, 'Back', {
            font: `${scaleFont(24)}px Jersey15-Regular`,
            fill: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.se_confirmSound.play();
                this.scene.start('MainMenu');
            });
        this.uiElements.push(backButton);

        buttonBg.setInteractive(
            new Phaser.Geom.Rectangle(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('MainMenu');
        });
    }

    createCarousel(iconKeys, iconInfo) {
        const { width } = this.scale;
        this.carousel = new Carousel(this, {
            iconCenterY: 220,
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
    }

    onResize() {
        this.time.delayedCall(0, () => this.createUI());
    }

    update() {
        if (this.bg) {
            this.bg.tilePositionY -= 1;
        }
    }
}
