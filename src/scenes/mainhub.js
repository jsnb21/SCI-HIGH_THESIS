import Phaser from 'phaser';
import VNDialogueBox from '../ui/VNDialogueBox';

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
    }

    create() {
        // Set sky blue background
        this.cameras.main.setBackgroundColor('#87ceeb');

        // Always show VN dialogue using VNDialogueBox
        this.vnBox = new VNDialogueBox(this, [
            "Where should I go next?",
            "I should go to the classroom. And ask my professor some things."
        ], () => {
            // Callback after dialogue finishes (optional)
            // You can enable UI or trigger events here if needed
        });

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