import Phaser from 'phaser';

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super('OptionsScene');
    }

    create() {
        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, 80, 'Options', {
            font: '32px Arial',
            color: '#ffff00'
        }).setOrigin(0.5);

        // SFX Volume
        this.add.text(width / 2 - 100, 180, 'SFX Volume', { font: '24px Arial', color: '#fff' }).setOrigin(1, 0.5);
        this.sfxSlider = this.add.rectangle(width / 2 + 50, 180, 200, 10, 0x888888).setOrigin(0, 0.5).setInteractive();
        this.sfxHandle = this.add.circle(width / 2 + 50 + (this.game.sfxVolume ?? 1) * 200, 180, 12, 0xffff00).setInteractive();

        // Music Volume
        this.add.text(width / 2 - 100, 240, 'Music Volume', { font: '24px Arial', color: '#fff' }).setOrigin(1, 0.5);
        this.musicSlider = this.add.rectangle(width / 2 + 50, 240, 200, 10, 0x888888).setOrigin(0, 0.5).setInteractive();
        this.musicHandle = this.add.circle(width / 2 + 50 + (this.game.musicVolume ?? 1) * 200, 240, 12, 0xffff00).setInteractive();

        // Back Button
        const backButton = this.add.text(width / 2, height - 80, 'Back', {
            font: '28px Arial',
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        backButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        // Drag logic for SFX slider
        this.input.setDraggable(this.sfxHandle);
        this.sfxHandle.on('drag', (pointer, dragX) => {
            dragX = Phaser.Math.Clamp(dragX, width / 2 + 50, width / 2 + 250);
            this.sfxHandle.x = dragX;
            const value = (dragX - (width / 2 + 50)) / 200;
            this.game.sfxVolume = value;
            this.sound.volume = value;
        });

        // Drag logic for Music slider
        this.input.setDraggable(this.musicHandle);
        this.musicHandle.on('drag', (pointer, dragX) => {
            dragX = Phaser.Math.Clamp(dragX, width / 2 + 50, width / 2 + 250);
            this.musicHandle.x = dragX;
            const value = (dragX - (width / 2 + 50)) / 200;
            this.game.musicVolume = value;
            // You should set your music volume here if you have a music manager
        });
    }
}