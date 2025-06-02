import Phaser from 'phaser';
import CourseSelectionUI from './CourseSelectionUI.js';

export default class WebDesignScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WebDesignScene' });
    }

    preload() {
        // Load assets for this scene
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.image('webDesignIcons', 'assets/img/comlab/icons/webDesignIcons.png');
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
            courseTitle: 'Selected Course: Web Design',
            iconPath: 'assets/img/comlab/icons/webDesignIcons.png',
            description: 'This course covers the fundamentals of web design...',
            buttonText: 'Start Course',
            buttonCallback: () => {
                this.se_confirmSound.play();

                this.scene.transition({
                    target: 'WebDesignQuizScene',
                    duration: 500,
                    moveBelow: true,
                    onUpdate: this.transitionOut,
                    data: { from: 'CurrentScene' }
                });
            },
            backButtonCallback: () => {
                this.se_confirmSound.play();
                this.scene.start('ComputerLab');
            }
        });
    }

    destroy() {
        // Clean up when scene is destroyed
        if (this.courseUI) {
            this.courseUI.destroy();
        }
    }
}