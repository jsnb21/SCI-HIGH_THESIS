import Phaser from 'phaser';
import { DEFAULT_TEXT_STYLE } from '../game';
import { updateSoundVolumes } from './options';
import { playExclusiveBGM } from '../audioUtils';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    preload() {
        // Load assets for main menu
        this.load.image('menuBg', 'assets/img/mainmenu/SCI-HIGH_Title.png', 'truetype');
        this.load.font('Jersey15-Regular', 'assets/font/Jersey15-Regular.ttf');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_title', 'assets/audio/bgm/bgm_title.mp3');
    }

    create() {
        const { width, height } = this.scale;
        const se_hoverSound = this.sound.add('se_select');
        const se_confirmSound = this.sound.add('se_confirm');

        // Play main menu BGM and update sound volumes
        playExclusiveBGM(this, 'bgm_title', { loop: true });
        updateSoundVolumes(this);

        // Unlock audio context on first user interaction
        this.input.once('pointerdown', () => {
            se_hoverSound.play({ volume: 0 });
            se_hoverSound.stop();
        });

        // Add and scale background image
        const bg = this.add.image(width / 2, height / 2, 'menuBg');
        bg.setDisplaySize(width, height);

        // --- Play Game Button ---
        const playButton = this.add.text(width / 2, (height / 2) + 60, 'Play Game', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        playButton.on('pointerdown', () => {
            se_confirmSound.play();
            this.scene.switch('VNScene');
        });
        playButton.on('pointerover', () => {
            playButton.setStyle({ color: '#ffffff' });
            if (!se_hoverSound.isPlaying) se_hoverSound.play();
        });
        playButton.on('pointerout', () => {
            playButton.setStyle({ color: '#ffff00' });
        });

        // --- Continue Button ---
        const continueButton = this.add.text(width / 2, height / 2 + 120, 'Continue', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        continueButton.on('pointerdown', () => {
            se_confirmSound.play();
            // TODO: Add continue logic here
        });
        continueButton.on('pointerover', () => {
            continueButton.setStyle({ color: '#ffffff' });
            if (!se_hoverSound.isPlaying) se_hoverSound.play();
        });
        continueButton.on('pointerout', () => {
            continueButton.setStyle({ color: '#ffff00' });
        });

        // --- Options Button ---
        const optionsButton = this.add.text(width / 2, height / 2 + 180, 'Options', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        optionsButton.on('pointerdown', () => {
            se_confirmSound.play();
            this.scene.switch('OptionsScene');
        });
        optionsButton.on('pointerover', () => {
            optionsButton.setStyle({ color: '#ffffff' });
            if (!se_hoverSound.isPlaying) se_hoverSound.play();
        });
        optionsButton.on('pointerout', () => {
            optionsButton.setStyle({ color: '#ffff00' });
        });

        // --- Quit Button ---
        const quitButton = this.add.text(width / 2, height / 2 + 240, 'Quit', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        quitButton.on('pointerdown', () => {
            se_confirmSound.play();
            window.location.href = 'index.html';
        });
        quitButton.on('pointerover', () => {
            quitButton.setStyle({ color: '#ffffff' });
            if (!se_hoverSound.isPlaying) se_hoverSound.play();
        });
        quitButton.on('pointerout', () => {
            quitButton.setStyle({ color: '#ffff00' });
        });
    }
}