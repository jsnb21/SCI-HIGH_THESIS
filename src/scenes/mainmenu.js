import Phaser from 'phaser';
import { DEFAULT_TEXT_STYLE } from '../game';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    preload() {
        // Load your background image
        this.load.image('menuBg', 'assets/img/mainmenu/SCI-HIGH_Title.png');
    }

    create() {
        const { width, height } = this.scale;

        // Add background image (centered and stretched to fit)
        const bg = this.add.image(width / 2, height / 2, 'menuBg');
        bg.setDisplaySize(width, height);

        // Play Game Button
        const playButton = this.add.text(width / 2, (height / 2) + 60, 'Play Game', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        playButton.on('pointerdown', () => {
            this.scene.start('VNScene');
        });

        playButton.on('pointerover', () => {
            playButton.setStyle({ color: '#ffffff' }); // Hover color: white
        });
        playButton.on('pointerout', () => {
            playButton.setStyle({ color: '#ffff00' }); // Revert color
        });

        // Continue Button
        const continueButton = this.add.text(width / 2, height / 2 + 120, 'Continue', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        continueButton.on('pointerdown', () => {
            // Add your continue logic here
        });

        continueButton.on('pointerover', () => {
            continueButton.setStyle({ color: '#ffffff' }); // Hover color: white
        });
        continueButton.on('pointerout', () => {
            continueButton.setStyle({ color: '#ffff00' });
        });

        // Options Button
        const optionsButton = this.add.text(width / 2, height / 2 + 180, 'Options', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        optionsButton.on('pointerdown', () => {
            // Add your options logic here
        });

        optionsButton.on('pointerover', () => {
            optionsButton.setStyle({ color: '#ffffff' }); // Hover color: white
        });
        optionsButton.on('pointerout', () => {
            optionsButton.setStyle({ color: '#ffff00' });
        });
    }
}