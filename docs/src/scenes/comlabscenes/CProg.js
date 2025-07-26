import Phaser from 'phaser';
import CourseSelectionUI from '/src/ui/CourseSelectionUI.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';


export default class CSProgrammingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CSProgrammingScene' });
        this.enemyHpBarHeight = 200;
    }

    preload() {
        // Load computer lab background
        this.load.image('comlabBG', 'assets/img/mainhub/MainHubBG.png');
        
        // Load assets for this scene
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.image('comlabBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('webDesignIcons', 'assets/img/comlab/icons/c_logo.png');

        this.load.image('goblinNerd', 'assets/sprites/enemies/goblinNerd.png');
    }

    create() {

        // Add background image
        this.bg = this.add.tileSprite(0, 0, 1920, 1080, 'comlabBG').setOrigin(0, 0);

        // Body Background 
        this.cameras.main.setBackgroundColor('#ADD8E6');
        
        // Load sound effect
        this.se_confirmSound = this.sound.add('se_confirm');
        
        // Initialize the UI component
        this.courseUI = new CourseSelectionUI(this);
        
        // Create the UI with your specific content
        this.courseUI.createUI({
            courseTitle: 'C',
            iconPath: 'webDesignIcons', // Use the cache key, not the file path
            description: 'This course covers the fundamentals of C Programming...',
            buttonText: 'Start',
            buttonCallback: () => {
                this.se_confirmSound.play();
                this.scene.start('CQuizScene', { topic: 'C',
                enemyConfig: {
                    spriteKey: 'goblinNerd',
                    maxHP: 150,
                    label: 'Box',
                },
                timerDuration: 30, // Seconds for Timer Quiz
                resetTimer: true   // Set to false to continue from previous time
                 });
            },
        });

        createBackButton(this, 'ComputerLab');
    }

    destroy() {
        // Clean up when scene is destroyed
        if (this.courseUI) {
            this.courseUI.destroy();
        }
    }
}