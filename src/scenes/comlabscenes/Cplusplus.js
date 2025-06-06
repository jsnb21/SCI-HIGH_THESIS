import Phaser from 'phaser';
import CourseSelectionUI from './CourseSelectionUI.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';

export default class CPlusplusScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CPlusplusScene' });
    }

    preload() {
        // Load assets for this scene
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.image('CPlusPlusIcons', 'assets/img/comlab/icons/CplusplusIcon.png');
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
            iconPath: 'assets/img/comlab/icons/CplusplusIcon.png',
            description: 'This course covers the fundamentals of C++ Programming...',
            buttonText: 'Start Course',
            buttonCallback: () => {
                this.se_confirmSound.play();
                this.scene.start('CplusplusQuizScene', { topic: 'C++' });
            },
            backButtonCallback: () => {
                this.se_confirmSound.play();
                this.scene.start('ComputerLab');
            }
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