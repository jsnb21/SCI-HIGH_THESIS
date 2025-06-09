import Phaser from 'phaser';
import Carousel from '../ui/carouselUI.js';

export default class ComputerLab extends Phaser.Scene {
    constructor() {
        super({ key: 'ComputerLab' });
    }

    preload() {
    
        // Load background and icon images
        this.load.image('MainHubBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('Web_Design', 'assets/img/comlab/icons/webDesignIcons.png');
        this.load.image('Python', 'assets/img/comlab/icons/PythonIcon.png');
        this.load.image('Java', 'assets/img/comlab/icons/JavaIcon.png');
        this.load.image('C', 'assets/img/comlab/icons/webDesignIcons.png');
        this.load.image('C++', 'assets/img/comlab/icons/CplusplusIcon.png');
        this.load.image('C#', 'assets/img/comlab/icons/CSharpIcon.png');

        // Load sound effects
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');

        // Load questions JSON
        this.load.json('questions', 'data/questions.json');
    }

    async create() {

        // Set up background
        this.cameras.main.setBackgroundColor('#808080');

        // Set up background
        this.createBack();

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Define carousel data
        const iconKeys = ['Web_Design', 'Python', 'Java', 'C', 'C++', 'C#'];
        const iconInfo = [
            { heading: "Web Design", desc: "Learn HTML, CSS &JavaScript" },
            { heading: "Python", desc: "Learn Python" },
            { heading: "Java", desc: "Learn Java" },
            { heading: "C", desc: "Learn about C" },
            { heading: "C++", desc: "Learn about C++" },
            { heading: "C#", desc: "Learn about C#." }
        ];

        // Create the carousel with the icon keys and info
        this.createCarousel(iconKeys, iconInfo);
    }

    createBack(){
        // Create "Back" button in the top right
        const buttonWidth = 100;
        const buttonHeight = 44;
        const buttonRadius = 22;
        const buttonX = this.cameras.main.width - 30 - buttonWidth / 2;
        const buttonY = 20 + buttonHeight / 2;

        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0x1e90ff, 1);
        buttonBg.fillRoundedRect?.(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            buttonRadius
        );

        const backButton = this.add.text(
            buttonX,
            buttonY,
            'Back',
            {
                fontFamily: 'Jersey15-Regular', fontSize: '24px', // ✅ Correct
                padding: { left: 0, right: 0, top: 0, bottom: 0 }
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('MainHub');
         });

        // Make button background respond to pointer events
        buttonBg.setInteractive(
            new Phaser.Geom.Rectangle(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('MainHub');
        });
    }

    createCarousel(iconKeys, iconInfo) {
        // Initialize the carousel
        this.carousel = new Carousel(this, {
            centerY: 400,
            spacing: 300,
            largeScale: 1.3,
            sounds: {
                hover: 'se_hoverSound',
                confirm: 'se_confirmSound'
            }
        });
        
        // Create the carousel with selection callback
        this.carousel.create(iconKeys, iconInfo, (selectedItem, index) => {
            console.log('Selected:', selectedItem.heading);
            // Transition to the new scene based on the selected icon
            if (selectedItem.heading === "Web Design") {
                this.scene.start('WebDesignScene',{topic: 'webdesign'});
            } else if (selectedItem.heading === "Python") {
                this.scene.start('PythonScene', { topic: 'python' }); 
            } else if (selectedItem.heading === "Java"){
                this.scene.start('JavaScene', { topic: 'java' }); 
            } else if (selectedItem.heading === "C"){
                this.scene.start('CSProgrammingScene', { topic: 'C' });
            } else if (selectedItem.heading === "C++"){
                this.scene.start('CPlusplusScene', { topic: 'C++' });
            } else if (selectedItem.heading === "C#"){
                this.scene.start('CSharpScene', { topic: 'C#' });
            }
        });
    }
}