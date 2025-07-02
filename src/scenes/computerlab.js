import Phaser from 'phaser';
import Carousel from '../ui/carouselUI.js';
import { createBackButton } from '../components/buttons/backbutton'; // <-- Add this import
import gameManager from '../gameManager.js';

export default class ComputerLab extends Phaser.Scene {
    constructor() {
        super({ key: 'ComputerLab' });
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

        // Load sound effects
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');

        // Load questions JSON
        this.load.json('questions', 'data/questions.json');

        // Add font loading
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
    }

    async create() {

        // Set up background
        this.cameras.main.setBackgroundColor('#D6C8F2');

        // Use the shared back button (top-left, consistent style)
        createBackButton(this, 'MainHub');

        // Add points display in top-right corner
        const { width } = this.scale;
        const scaleFactor = Math.min(width / 816, this.scale.height / 624); // Using BASE_WIDTH and BASE_HEIGHT
        const pointsDisplay = gameManager.createPointsDisplay(this, width - 100 * scaleFactor, 40 * scaleFactor, scaleFactor);
        this.pointsDisplay = pointsDisplay;

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');        // Define carousel data
        const iconKeys = ['Web_Design', 'Python', 'Java', 'C', 'C++', 'C#'];
        const iconInfo = [
            { heading: "Web Design", desc: "Learn HTML, CSS & JavaScript", courseKey: "Web_Design" },
            { heading: "Python", desc: "Learn Python", courseKey: "Python" },
            { heading: "Java", desc: "Learn Java", courseKey: "Java" },
            { heading: "C", desc: "Learn about C", courseKey: "C" },
            { heading: "C++", desc: "Learn about C++", courseKey: "C++" },
            { heading: "C#", desc: "Learn about C#", courseKey: "C#" }
        ];

        // Create the carousel with the icon keys and info
        this.createCarousel(iconKeys, iconInfo);
    }    createCarousel(iconKeys, iconInfo) {
        // Initialize the carousel
        this.carousel = new Carousel(this, {
            centerY: 400,
            spacing: 400,
            largeScale: 0.25,  // 70% smaller than 0.2
            smallScale: 0.1,  // Also specify smallScale to be proportionally smaller
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
            return !gameManager.isCourseUnlocked(info.courseKey);
        });

        // Create the carousel with selection callback and locked states
        this.carousel.create(iconKeys, iconInfo, (selectedItem, index) => {
            console.log('Selected:', selectedItem.heading);
            // Transition to the new scene based on the selected icon
            if (selectedItem.heading === "Web Design") {
                this.scene.start('WebDesignScene', { topic: 'webdesign' }); // Changed to DungeonScene
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
        }, lockedStates);
    }
    update() {
        // Update points display if it exists
        if (this.pointsDisplay) {
            this.pointsDisplay.update();
        }
    }
}