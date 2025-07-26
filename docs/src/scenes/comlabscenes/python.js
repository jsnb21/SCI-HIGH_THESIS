import Phaser from 'phaser';
import CourseSelectionUI from '/src/ui/CourseSelectionUI.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';

export default class PythonScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PythonScene' });
        this.enemyHpBarHeight = 200;
    }

    preload() {
        // Load computer lab background
        this.load.image('comlabBG', 'assets/img/mainhub/MainHubBG.png');
        
        // Load assets for this scene
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.image('pythonIcon', 'assets/img/comlab/icons/python_logo.png');

        this.load.image('goblinNerd', 'assets/sprites/enemies/goblinNerd.png');
    }

    create() {
        // Add computer lab background
        this.bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'comlabBG').setOrigin(0, 0);

        // Body Background overlay
        this.cameras.main.setBackgroundColor('#ADD8E6');
        
        // Load sound effect
        this.se_confirmSound = this.sound.add('se_confirm');
        
        // Initialize the UI component
        this.courseUI = new CourseSelectionUI(this);
        
        // Create the UI with your specific content
        this.courseUI.createUI({
            courseTitle: 'Python',
            iconPath: 'pythonIcon',
            description: 'This course covers the fundamentals of python programming...',
            buttonText: 'Start',
            buttonCallback: () => {
                this.se_confirmSound.play();
                // Stop PythonQuizScene if it is already running
                this.scene.start('PythonQuizScene', { topic: 'python',
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