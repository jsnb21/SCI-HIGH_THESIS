import Phaser from 'phaser';
import {
    bgmVolume,
    seVolume,
    setBgmVolume,
    setSeVolume,
    updateSoundVolumes,
    createVolumeSlider
} from '../audioUtils.js';
import gameManager from '../gameManager.js';
import FullscreenToggleUI from '../graphicsUtils.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super('OptionsScene');
        this.uiElements = [];
        this.fullscreenUI = null;
    }

    create(data) {
        // 👇 Fix: set previousScene if provided
        if (data && data.prevScene) {
            gameManager.setPreviousScene(data.prevScene);
        }

        this.time.delayedCall(10, () => this.createUI());
        this.scale.on('resize', this.onResize, this);

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.scene.isActive()) {
                // Use window dimensions instead of BASE_WIDTH/HEIGHT
                this.scale.resize(window.innerWidth, window.innerHeight);
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

        // Destroy existing fullscreenUI if it exists
        if (this.fullscreenUI) {
            this.fullscreenUI.destroy();
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

        // Use FullscreenToggleUI instead of custom implementation
        this.fullscreenUI = new FullscreenToggleUI(this, width, this.scaleFactor, BASE_WIDTH, BASE_HEIGHT, scaleFont);

        const backButton = this.add.text(width / 2, height - 80 * this.scaleFactor, 'Back', {
            font: `${scaleFont(32)}px Jersey15-Regular`,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        backButton.on('pointerdown', () => {
            const prevScene = gameManager.getPreviousScene() || 'MainMenu';
            
            // Use window dimensions for consistent sizing
            this.scale.resize(window.innerWidth, window.innerHeight);
            const canvas = this.game.canvas;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            
            this.scene.stop('OptionsScene');
            this.scene.start(prevScene);
        });

        this.uiElements.push(backButton);
    }

    onResize() {
        if (this.resizeTimer) this.time.removeEvent(this.resizeTimer);
        this.resizeTimer = this.time.delayedCall(100, () => {
            this.createUI();
        });
    }

    shutdown() {
        if (this.fullscreenUI) {
            this.fullscreenUI.destroy();
        }
    }
}
