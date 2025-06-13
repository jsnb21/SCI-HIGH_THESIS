import Phaser from 'phaser';

export let bgmVolume = 1;
export let seVolume = 1;

export function setBgmVolume(value) {
    bgmVolume = value;
}

export function setSeVolume(value) {
    seVolume = value;
}

// Utility to update volumes based on key name
export function updateSoundVolumes(scene) {
    scene.sound.sounds.forEach(sound => {
        if (sound.key && sound.key.toLowerCase().includes('se')) {
            sound.setVolume(seVolume);
        } else if (sound.key && sound.key.toLowerCase().includes('bgm')) {
            sound.setVolume(bgmVolume);
        }
    });
}

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super('OptionsScene');
    }

    create() {
        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, 80, 'Options', {
            font: '42px Jersey15-Regular',
            color: '#ffff00'
        }).setOrigin(0.5);

        // SE Volume
        this.add.text(width / 2 - 100, 180, 'SE Volume', { font: '32px Jersey15-Regular', color: '#fff' }).setOrigin(1, 0.5);
        this.seSlider = this.add.rectangle(width / 2 + 50, 180, 200, 10, 0x888888).setOrigin(0, 0.5).setInteractive();
        this.seHandle = this.add.circle(width / 2 + 50 + seVolume * 200, 180, 12, 0xffff00).setInteractive();

        // BGM Volume
        this.add.text(width / 2 - 100, 240, 'BGM Volume', { font: '32px Jersey15-Regular', color: '#fff' }).setOrigin(1, 0.5);
        this.bgmSlider = this.add.rectangle(width / 2 + 50, 240, 200, 10, 0x888888).setOrigin(0, 0.5).setInteractive();
        this.bgmHandle = this.add.circle(width / 2 + 50 + bgmVolume * 200, 240, 12, 0xffff00).setInteractive();

        // Back Button
        const backButton = this.add.text(width / 2, height - 80, 'Back', {
            font: '32px Jersey15-Regular',
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        // Smarter back: go to previous scene if provided, else fallback to MainMenu
        backButton.on('pointerdown', () => {
            const prevScene = this.sys.settings.data && this.sys.settings.data.prevScene;
            if (prevScene) {
                this.scene.switch(prevScene);
            } else {
                this.scene.start('MainMenu');
            }
        });

        // Drag logic for SE slider
        this.input.setDraggable(this.seHandle);
        this.seHandle.on('drag', (pointer, dragX) => {
            dragX = Phaser.Math.Clamp(dragX, width / 2 + 50, width / 2 + 250);
            this.seHandle.x = dragX;
            const value = (dragX - (width / 2 + 50)) / 200;
            setSeVolume(value);
            updateSoundVolumes(this);
        });

        // Drag logic for BGM slider
        this.input.setDraggable(this.bgmHandle);
        this.bgmHandle.on('drag', (pointer, dragX) => {
            dragX = Phaser.Math.Clamp(dragX, width / 2 + 50, width / 2 + 250);
            this.bgmHandle.x = dragX;
            const value = (dragX - (width / 2 + 50)) / 200;
            setBgmVolume(value);
            updateSoundVolumes(this);
        });
    }
}