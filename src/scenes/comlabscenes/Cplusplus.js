import Phaser from 'phaser';
import CourseSelectionUI from '/src/ui/CourseSelectionUI.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';

export default class CPlusplusScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CPlusplusScene' });
        this.enemyHpBarHeight = 200;
    }

    preload() {
        // Load assets for this scene
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.image('CPlusPlusIcons', 'assets/img/comlab/icons/CplusplusIcon.png');

        this.load.image('boxenemy', 'assets/sprites/enemies/box.png');
    }

    create() {

        // Body Background 
        this.cameras.main.setBackgroundColor('#ADD8E6');
        
        // Load sound effect
        this.se_confirmSound = this.sound.add('se_confirm');
        
        // Initialize the UI component
        this.courseUI = new CourseSelectionUI(this);
        
        // Create the UI with your specific content
        this.courseUI.createUI({
            courseTitle: 'Selected Course: C++',
            iconPath: 'CPlusPlusIcons',
            description: 'This course covers the fundamentals of C++ Programming...',
            buttonText: 'Start Course',
            buttonCallback: () => {
                this.se_confirmSound.play();
                this.scene.start('CplusplusQuizScene', { topic: 'C++',
                enemyConfig: {
                    spriteKey: 'boxenemy',
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