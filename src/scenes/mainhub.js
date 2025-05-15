import Phaser from 'phaser';

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
    }

    create() {
        // Set sky blue background
        this.cameras.main.setBackgroundColor('#87ceeb');

        // Create Back button at top right
        const backButton = this.add.text(
            this.cameras.main.width - 30, // X position (right edge)
            20,                           // Y position (top)
            'Back',
            {
                font: '24px Arial',
                fill: '#ffffff',
                backgroundColor: '#1e90ff',
                padding: { left: 10, right: 10, top: 5, bottom: 5 },
                borderRadius: 5
            }
        ).setOrigin(1, 0) // Align to top right
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => {
            this.scene.start('MainMenu');
         });
    }
}