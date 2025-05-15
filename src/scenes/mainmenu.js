import Phaser from 'phaser';
import { DEFAULT_TEXT_STYLE } from '../game';
import { updateSoundVolumes } from './options';
import { playExclusiveBGM } from '../audioUtils';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    preload() {
        // Load your background image
        this.load.image('menuBg', 'assets/img/mainmenu/SCI-HIGH_Title.png');

        // Audio
        // SE
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');

        // Music
        this.load.audio('bgm_title', 'assets/audio/bgm/bgm_title.mp3');
    }

    create() {
        const { width, height } = this.scale;
        const se_hoverSound = this.sound.add('se_select');
        const se_confirmSound = this.sound.add('se_confirm');

        // Play exclusive BGM (stops any other BGM first)
        playExclusiveBGM(this, 'bgm_title', { loop: true });

        // Apply current volumes to all sounds
        updateSoundVolumes(this);

        // Unlock audio context on first pointerdown
        this.input.once('pointerdown', () => {
            se_hoverSound.play({ volume: 0 }); // Play silently to unlock
            se_hoverSound.stop();
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
            se_confirmSound.play(); // Play confirm sound
            this.scene.start('VNScene');
        });

        playButton.on('pointerover', () => {
            playButton.setStyle({ color: '#ffffff' }); // Hover color: white
            if (!se_hoverSound.isPlaying) se_hoverSound.play();
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
            se_confirmSound.play(); // Play confirm sound
            // Add your continue logic here
        });

        continueButton.on('pointerover', () => {
            continueButton.setStyle({ color: '#ffffff' }); // Hover color: white
            if (!se_hoverSound.isPlaying) se_hoverSound.play();
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
            se_confirmSound.play(); // Play confirm sound
            this.scene.start('OptionsScene'); // Switch to Options scene
        });

        optionsButton.on('pointerover', () => {
            optionsButton.setStyle({ color: '#ffffff' }); // Hover color: white
            if (!se_hoverSound.isPlaying) se_hoverSound.play();
        });
        optionsButton.on('pointerout', () => {
            optionsButton.setStyle({ color: '#ffff00' });
        });
    }
}