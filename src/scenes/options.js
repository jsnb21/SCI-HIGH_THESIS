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
        this.time.delayedCall(10, () => this.createUI());
        this.scale.on('resize', this.onResize, this);

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.scene.isActive()) {
                this.scale.resize(BASE_WIDTH, BASE_HEIGHT);
                this.time.delayedCall(100, () => this.createUI());
            }
        });
    }

    createUI() {
        const { width, height } = this.scale;
        this.scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        const scaleFont = (size) => Math.round(size * this.scaleFactor);

        if (this.uiElements.length) {
            this.uiElements.forEach(el => el.destroy());
            this.uiElements = [];
        }

        const title = this.add.text(width / 2, 130 * this.scaleFactor, 'Options', {
            font: `${scaleFont(42)}px Jersey15-Regular`,
            color: '#ffff00'
        }).setOrigin(0.5);
        this.uiElements.push(title);

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
                this.time.delayedCall(100, () => {
                    this.scale.resize(BASE_WIDTH, BASE_HEIGHT);
                    const canvas = this.game.canvas;
                    canvas.style.width = `${BASE_WIDTH}px`;
                    canvas.style.height = `${BASE_HEIGHT}px`;
                    this.time.delayedCall(0, () => this.createUI());
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
                    this.time.delayedCall(0, () => this.createUI());
                });
            }
        });
        this.uiElements.push(fsButton);

        const backButton = this.add.text(width / 2, height - 80 * this.scaleFactor, 'Back', {
            font: `${scaleFont(32)}px Jersey15-Regular`,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        backButton.on('pointerdown', () => {
            const prevScene = this.sys.settings.data && this.sys.settings.data.prevScene;
            if (prevScene) {
                // Always reset to base size when leaving options (unless going to MainMenu, which may have its own logic)
                if (prevScene !== 'MainMenu') {
                    this.scale.resize(BASE_WIDTH, BASE_HEIGHT);
                    const canvas = this.game.canvas;
                    canvas.style.width = `${BASE_WIDTH}px`;
                    canvas.style.height = `${BASE_HEIGHT}px`;
                }
                this.scene.stop('OptionsScene');
                this.scene.start(prevScene);
            } else {
                this.scene.stop('OptionsScene');
                this.scene.start('MainMenu');
            }
        });
        this.uiElements.push(backButton);
    }

    onResize(gameSize) {
        if (this.resizeTimer) this.time.removeEvent(this.resizeTimer);
        this.resizeTimer = this.time.delayedCall(100, () => {
            this.createUI();
        });
    }
}
