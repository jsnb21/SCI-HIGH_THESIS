import Phaser from 'phaser';
import { DEFAULT_TEXT_STYLE } from '../game';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    preload() {
        // Load your background image
        this.load.image('menuBg', 'assets/img/mainmenu/SCI-HIGH_Title.png');
        this.load.audio('hoverSound', 'assets/audio/se/select.wav');
        this.load.audio('confirmSound', 'assets/audio/se/confirm.wav'); // Add this line
    }

    create() {
        const { width, height } = this.scale;
        const hoverSound = this.sound.add('hoverSound');
        const confirmSound = this.sound.add('confirmSound'); // Add this line

        // Unlock audio context on first pointerdown
        this.input.once('pointerdown', () => {
            hoverSound.play({ volume: 0 }); // Play silently to unlock
            hoverSound.stop();
        });

        // Add background image (centered and stretched to fit)
        const bg = this.add.image(width / 2, height / 2, 'menuBg');
        bg.setDisplaySize(width, height);

        // Play Game Button
        const playButton = this.add.text(width / 2, (height / 2) + 60, 'Play Game', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        playButton.on('pointerdown', () => {
            confirmSound.play(); // Play confirm sound
            this.scene.start('VNScene');
        });

        playButton.on('pointerover', () => {
            playButton.setStyle({ color: '#ffffff' }); // Hover color: white
            if (!hoverSound.isPlaying) hoverSound.play();
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
            confirmSound.play(); // Play confirm sound
            // Add your continue logic here
        });

        continueButton.on('pointerover', () => {
            continueButton.setStyle({ color: '#ffffff' }); // Hover color: white
            if (!hoverSound.isPlaying) hoverSound.play();
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
            confirmSound.play(); // Play confirm sound
            this.scene.start('OptionsScene'); // Switch to Options scene
        });

        optionsButton.on('pointerover', () => {
            optionsButton.setStyle({ color: '#ffffff' }); // Hover color: white
            if (!hoverSound.isPlaying) hoverSound.play();
        });
        optionsButton.on('pointerout', () => {
            optionsButton.setStyle({ color: '#ffff00' });
        });
    }
}