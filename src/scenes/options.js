import Phaser from 'phaser';
import {
    bgmVolume,
    seVolume,
    setBgmVolume,
    setSeVolume,
    updateSoundVolumes,
    createVolumeSlider
} from '../audioUtils.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super('OptionsScene');
        this.uiElements = [];
    }

    create() {
        this.createUI();
        this.scale.on('resize', this.onResize, this);

        // Listen for manual fullscreen exit (e.g., pressing ESC)
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.scene.isActive()) {
                this.scale.resize(BASE_WIDTH, BASE_HEIGHT);
                const canvas = this.game.canvas;
                canvas.style.width = `${BASE_WIDTH}px`;
                canvas.style.height = `${BASE_HEIGHT}px`;
                this.createUI();
            }
        });
    }

    createUI() {
        const { width, height } = this.scale;
        this.scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        const scaleFont = (size) => Math.round(size * this.scaleFactor);

        // Clear previous UI
        if (this.uiElements.length) {
            this.uiElements.forEach(el => el.destroy());
            this.uiElements = [];
        }

        // Title
        const title = this.add.text(width / 2, 130 * this.scaleFactor, 'Options', {
            font: `${scaleFont(42)}px Jersey15-Regular`,
            color: '#ffff00'
        }).setOrigin(0.5);
        this.uiElements.push(title);

        // SE Volume
        const seLabel = this.add.text(width / 2 - 100 * this.scaleFactor, 180 * this.scaleFactor, 'SE Volume', {
            font: `${scaleFont(32)}px Jersey15-Regular`,
            color: '#fff'
        }).setOrigin(1, 0.5);
        this.uiElements.push(seLabel);

        const seSlider = createVolumeSlider(
            this,
            width / 2 + 50 * this.scaleFactor,
            180 * this.scaleFactor,
            seVolume,
            value => {
                setSeVolume(value);
                updateSoundVolumes(this);
            },
            this.scaleFactor
        );
        this.uiElements.push(seSlider.slider, seSlider.handle);

        // BGM Volume
        const bgmLabel = this.add.text(width / 2 - 100 * this.scaleFactor, 240 * this.scaleFactor, 'BGM Volume', {
            font: `${scaleFont(32)}px Jersey15-Regular`,
            color: '#fff'
        }).setOrigin(1, 0.5);
        this.uiElements.push(bgmLabel);

        const bgmSlider = createVolumeSlider(
            this,
            width / 2 + 50 * this.scaleFactor,
            240 * this.scaleFactor,
            bgmVolume,
            value => {
                setBgmVolume(value);
                updateSoundVolumes(this);
            },
            this.scaleFactor
        );
        this.uiElements.push(bgmSlider.slider, bgmSlider.handle);

        // Fullscreen Toggle (Responsive)
        const fsLabel = this.add.text(width / 2 - 100 * this.scaleFactor, 320 * this.scaleFactor, 'Fullscreen', {
            font: `${scaleFont(32)}px Jersey15-Regular`,
            color: '#fff'
        }).setOrigin(1, 0.5);
        this.uiElements.push(fsLabel);

        const fsButton = this.add.text(width / 2 + 50 * this.scaleFactor, 320 * this.scaleFactor,
            this.scale.isFullscreen ? 'On' : 'Off',
            {
                font: `${scaleFont(32)}px Jersey15-Regular`,
                color: '#ffff00',
                backgroundColor: '#222'
            }
        ).setOrigin(0, 0.5).setPadding(8, 4, 8, 4).setInteractive();

        fsButton.on('pointerdown', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
                fsButton.setText('Off');

                // Restore original game resolution
                this.time.delayedCall(100, () => {
                    this.scale.resize(BASE_WIDTH, BASE_HEIGHT);
                    const canvas = this.game.canvas;
                    canvas.style.width = `${BASE_WIDTH}px`;
                    canvas.style.height = `${BASE_HEIGHT}px`;
                    this.createUI();
                });
            } else {
                this.scale.startFullscreen();
                fsButton.setText('On');

                this.time.delayedCall(100, () => {
                    const w = window.innerWidth;
                    const h = window.innerHeight;
                    this.scale.resize(w, h);
                    const canvas = this.game.canvas;
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    this.createUI();
                });
            }
        });
        this.uiElements.push(fsButton);

        // Back Button
        const backButton = this.add.text(width / 2, height - 80 * this.scaleFactor, 'Back', {
            font: `${scaleFont(32)}px Jersey15-Regular`,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        backButton.on('pointerdown', () => {
            const prevScene = this.sys.settings.data && this.sys.settings.data.prevScene;
            if (prevScene) {
                this.scene.switch(prevScene);
            } else {
                this.scene.start('MainMenu');
            }
        });
        this.uiElements.push(backButton);
    }

    onResize(gameSize) {
        const { width, height } = gameSize;
        this.scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        this.createUI();

        const canvas = this.game.canvas;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }
}
