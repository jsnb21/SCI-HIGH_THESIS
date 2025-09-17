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
import { createBackButton } from '../components/buttons/backbutton.js';
import { FullscreenUtils } from '../utils/fullscreenUtils.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class OptionsScene extends Phaser.Scene {    constructor() {
        super('OptionsScene');
        this.uiElements = [];
        this.currentUIRefs = {
            bgmVolumeText: null,
            sfxVolumeText: null,
            toggleText: null,
            toggleBg: null,
            toggleHandle: null
        };
    }
    
    preload() {
        // Load the Caprasimo-Regular font
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
    }

    create(data) {
        // More reliable scene tracking
        this.prevScene = data && data.prevScene 
            ? data.prevScene 
            : 'MainMenu';
        
        // Don't update gameManager here, as it might override needed history
        console.log('Options opened from:', this.prevScene);        // Set up event listeners using fullscreen utility
        this.fullscreenManager = FullscreenUtils.setupScene(this);
        this.time.delayedCall(10, () => this.createUI());
        this.scale.on('resize', this.onResize, this);
    }    createUI() {
        const { width, height } = this.scale;
        this.scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        const scaleFont = (size) => Math.round(size * this.scaleFactor);        // Destroy existing UI elements
        if (this.uiElements.length) {
            this.uiElements.forEach(el => {
                if (el && !el.scene) return; // Skip already destroyed objects
                try {
                    el.destroy();
                } catch (e) {
                    // Silently catch destruction errors
                }
            });
            this.uiElements = [];
        }

        // Clear any existing UI references to prevent stale object access
        this.currentUIRefs = {
            bgmVolumeText: null,
            sfxVolumeText: null,
            toggleText: null,
            toggleBg: null,
            toggleHandle: null
        };

        // Get actual camera dimensions for full coverage
        const actualWidth = this.cameras ? this.cameras.main.width : width;
        const actualHeight = this.cameras ? this.cameras.main.height : height;

        // Modern dark background overlay
        const overlay = this.add.rectangle(
            actualWidth / 2, actualHeight / 2, 
            actualWidth + 10, actualHeight + 10,
            0x0f0f23, 0.95
        );
        this.uiElements.push(overlay);

        // Modern card container
        const cardWidth = Math.min(500 * this.scaleFactor, width * 0.9);
        const cardHeight = Math.min(600 * this.scaleFactor, height * 0.85);
        const cardX = width / 2;
        const cardY = height / 2;

        // Card shadow
        const cardShadow = this.add.rectangle(
            cardX + 4 * this.scaleFactor, cardY + 4 * this.scaleFactor, 
            cardWidth, cardHeight, 0x000000, 0.2
        );
        this.uiElements.push(cardShadow);

        // Card background
        const card = this.add.rectangle(
            cardX, cardY, cardWidth, cardHeight, 0x1a202c
        );
        this.uiElements.push(card);

        // Card border
        const cardBorder = this.add.graphics();
        cardBorder.lineStyle(2 * this.scaleFactor, 0xF4CE14, 1);
        cardBorder.strokeRoundedRect(
            cardX - cardWidth / 2, cardY - cardHeight / 2,
            cardWidth, cardHeight, 12 * this.scaleFactor
        );
        this.uiElements.push(cardBorder);        // Use shared back button component
        const backButtonElements = createBackButton(this, this.prevScene || 'MainMenu');
        this.uiElements.push(backButtonElements.buttonBg, backButtonElements.backButton);

        // Header section
        const headerY = cardY - cardHeight / 2 + 80 * this.scaleFactor;
        
        // Settings badge
        const settingsBadge = this.add.rectangle(
            cardX, headerY - 20 * this.scaleFactor, 
            100 * this.scaleFactor, 24 * this.scaleFactor, 0xF4CE14
        );
        this.uiElements.push(settingsBadge);
        
        const badgeText = this.add.text(
            cardX, headerY - 20 * this.scaleFactor, 'SETTINGS', {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(12)}px`,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        this.uiElements.push(badgeText);

        // Modern title
        const title = this.add.text(cardX, headerY + 20 * this.scaleFactor, 'Options', {
            fontFamily: 'Arial',
            fontSize: `${scaleFont(32)}px`,
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.uiElements.push(title);

        // Audio settings section
        const audioSectionY = cardY - 80 * this.scaleFactor;
        
        // Section divider
        const divider = this.add.graphics();
        divider.lineStyle(1 * this.scaleFactor, 0x4a5568, 0.8);
        divider.lineBetween(
            cardX - cardWidth * 0.4, audioSectionY - 30 * this.scaleFactor,
            cardX + cardWidth * 0.4, audioSectionY - 30 * this.scaleFactor
        );
        this.uiElements.push(divider);

        // SE Volume Section
        const seY = audioSectionY + 20 * this.scaleFactor;
        const seLabel = this.add.text(
            cardX - cardWidth * 0.35, seY, 'Sound Effects', {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(18)}px`,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0, 0.5);
        this.uiElements.push(seLabel);

        const seVolumeText = this.add.text(
            cardX + cardWidth * 0.35, seY, `${Math.round(seVolume * 100)}%`, {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(16)}px`,
                color: '#F4CE14'
            }
        ).setOrigin(1, 0.5);
        this.uiElements.push(seVolumeText);

        // Modern SE slider
        const seSliderY = seY + 30 * this.scaleFactor;
        const seSlider = this.createModernSlider(
            cardX, seSliderY, cardWidth * 0.7, seVolume,
            (value) => {
                setSeVolume(value);
                updateSoundVolumes(this);
                seVolumeText.setText(`${Math.round(value * 100)}%`);
            }
        );
        this.uiElements.push(...seSlider);

        // BGM Volume Section
        const bgmY = seSliderY + 80 * this.scaleFactor;
        const bgmLabel = this.add.text(
            cardX - cardWidth * 0.35, bgmY, 'Background Music', {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(18)}px`,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0, 0.5);
        this.uiElements.push(bgmLabel);        const bgmVolumeText = this.add.text(
            cardX + cardWidth * 0.35, bgmY, `${Math.round(bgmVolume * 100)}%`, {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(16)}px`,
                color: '#F4CE14'
            }
        ).setOrigin(1, 0.5);
        this.uiElements.push(bgmVolumeText);
        this.currentUIRefs.bgmVolumeText = bgmVolumeText;        // Modern BGM slider
        const bgmSliderY = bgmY + 30 * this.scaleFactor;
        const bgmSlider = this.createModernSlider(
            cardX, bgmSliderY, cardWidth * 0.7, bgmVolume,
            (value) => {
                setBgmVolume(value);
                updateSoundVolumes(this);
                // Safe reference update
                if (this.currentUIRefs.bgmVolumeText && this.currentUIRefs.bgmVolumeText.scene) {
                    this.currentUIRefs.bgmVolumeText.setText(`${Math.round(value * 100)}%`);
                }
            }
        );
        this.uiElements.push(...bgmSlider);// Fullscreen toggle section (modern style to match other UI)
        const fullscreenY = bgmSliderY + 80 * this.scaleFactor;
        
        // Section divider
        const fullscreenDivider = this.add.graphics();
        fullscreenDivider.lineStyle(1 * this.scaleFactor, 0x4a5568, 0.8);
        fullscreenDivider.lineBetween(
            cardX - cardWidth * 0.4, fullscreenY - 20 * this.scaleFactor,
            cardX + cardWidth * 0.4, fullscreenY - 20 * this.scaleFactor
        );
        this.uiElements.push(fullscreenDivider);

        // Fullscreen label
        const fullscreenLabel = this.add.text(
            cardX - cardWidth * 0.35, fullscreenY + 20 * this.scaleFactor, 'Fullscreen', {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(18)}px`,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0, 0.5);
        this.uiElements.push(fullscreenLabel);

        // Modern toggle switch
        const toggleBg = this.add.rectangle(
            cardX + cardWidth * 0.25, fullscreenY + 20 * this.scaleFactor,
            60 * this.scaleFactor, 30 * this.scaleFactor, 
            this.scale.isFullscreen ? 0xF4CE14 : 0x2d3748
        );
        toggleBg.setStrokeStyle(2 * this.scaleFactor, 0x4a5568);
        
        const toggleHandle = this.add.circle(
            cardX + cardWidth * 0.25 + (this.scale.isFullscreen ? 15 : -15) * this.scaleFactor,
            fullscreenY + 20 * this.scaleFactor,
            12 * this.scaleFactor, 0xffffff
        );
        toggleHandle.setStrokeStyle(2 * this.scaleFactor, 0xF4CE14);        const toggleText = this.add.text(
            cardX + cardWidth * 0.35, fullscreenY + 20 * this.scaleFactor,
            this.scale.isFullscreen ? 'On' : 'Off', {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(16)}px`,
                color: '#F4CE14'
            }
        ).setOrigin(1, 0.5);

        // Store references for safe access in callbacks
        this.currentUIRefs.toggleText = toggleText;
        this.currentUIRefs.toggleBg = toggleBg;
        this.currentUIRefs.toggleHandle = toggleHandle;

        // Make toggle interactive
        const toggleInteractive = this.add.rectangle(
            cardX + cardWidth * 0.25, fullscreenY + 20 * this.scaleFactor,
            60 * this.scaleFactor, 30 * this.scaleFactor, 0x000000, 0
        ).setInteractive({ useHandCursor: true });        toggleInteractive.on('pointerdown', () => {
            this.fullscreenManager.toggleFullscreen(
                // On enter fullscreen
                () => {
                    if (this.currentUIRefs.toggleBg && this.currentUIRefs.toggleBg.scene) {
                        this.currentUIRefs.toggleBg.setFillStyle(0xF4CE14);
                    }
                    if (this.currentUIRefs.toggleText && this.currentUIRefs.toggleText.scene) {
                        this.currentUIRefs.toggleText.setText('On');
                    }
                    if (this.currentUIRefs.toggleHandle && this.currentUIRefs.toggleHandle.scene) {
                        this.tweens.add({
                            targets: this.currentUIRefs.toggleHandle,
                            x: cardX + cardWidth * 0.25 + 15 * this.scaleFactor,
                            duration: 200,
                            ease: 'Power2'
                        });
                    }
                },
                // On exit fullscreen
                () => {
                    if (this.currentUIRefs.toggleBg && this.currentUIRefs.toggleBg.scene) {
                        this.currentUIRefs.toggleBg.setFillStyle(0x2d3748);
                    }
                    if (this.currentUIRefs.toggleText && this.currentUIRefs.toggleText.scene) {
                        this.currentUIRefs.toggleText.setText('Off');
                    }
                    if (this.currentUIRefs.toggleHandle && this.currentUIRefs.toggleHandle.scene) {
                        this.tweens.add({
                            targets: this.currentUIRefs.toggleHandle,
                            x: cardX + cardWidth * 0.25 - 15 * this.scaleFactor,
                            duration: 200,
                            ease: 'Power2'
                        });
                    }
                }
            );
        });        toggleInteractive.on('pointerover', () => {
            if (this.currentUIRefs.toggleHandle && this.currentUIRefs.toggleHandle.scene) {
                this.currentUIRefs.toggleHandle.setScale(1.1);
            }
        });

        toggleInteractive.on('pointerout', () => {
            if (this.currentUIRefs.toggleHandle && this.currentUIRefs.toggleHandle.scene) {
                this.currentUIRefs.toggleHandle.setScale(1);
            }
        });

        this.uiElements.push(toggleBg, toggleHandle, toggleText, toggleInteractive);

        // Use FullscreenToggleUI with modern positioning (commented out since we replaced it)
        // this.fullscreenUI = new FullscreenToggleUI(this, width, this.scaleFactor, BASE_WIDTH, BASE_HEIGHT, scaleFont);

        // Add entrance animation
        this.tweens.add({
            targets: [card, cardBorder],
            scaleX: { from: 0.8, to: 1 },
            scaleY: { from: 0.8, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 400,            ease: 'Back.easeOut'
        });
    }    createModernSlider(x, y, width, initialValue, callback) {
        const elements = [];
        const sliderHeight = 8 * this.scaleFactor;
        const handleSize = 18 * this.scaleFactor;
        
        const leftBound = x - width / 2;
        const rightBound = x + width / 2;

        // Slider track background
        const trackBg = this.add.rectangle(
            x, y, width, sliderHeight, 0x2d3748
        );
        trackBg.setStrokeStyle(1 * this.scaleFactor, 0x4a5568);
        elements.push(trackBg);        // Slider active track - starts from left bound
        const activeTrack = this.add.rectangle(
            leftBound, y, 
            0, sliderHeight, 0xF4CE14
        );
        activeTrack.setOrigin(0, 0.5); // Left-aligned origin
        activeTrack.width = width * initialValue;
        elements.push(activeTrack);

        // Slider handle (draggable)
        const handle = this.add.circle(
            leftBound + width * initialValue, y, 
            handleSize / 2, 0xffffff
        );
        handle.setStrokeStyle(2 * this.scaleFactor, 0xF4CE14);
        handle.setInteractive();
        this.input.setDraggable(handle);
        elements.push(handle);        // Update function
        const updateSliderValue = (handleX) => {
            const clampedX = Phaser.Math.Clamp(handleX, leftBound, rightBound);
            const relativeX = clampedX - leftBound;
            const value = relativeX / width;
            
            handle.x = clampedX;
            
            // Update active track width only (position stays at leftBound)
            activeTrack.width = relativeX;
            
            callback(value);
        };

        // Drag events
        handle.on('drag', (pointer, dragX) => {
            updateSliderValue(dragX);
        });

        // Click on track to jump to position
        trackBg.setInteractive();
        trackBg.on('pointerdown', (pointer) => {
            updateSliderValue(pointer.x);
        });

        // Visual feedback
        handle.on('pointerover', () => {
            handle.setScale(1.2);
            handle.setFillStyle(0xfbbf24); // Darker yellow on hover
        });

        handle.on('pointerout', () => {
            handle.setScale(1);
            handle.setFillStyle(0xffffff);
        });

        trackBg.on('pointerover', () => {
            trackBg.setFillStyle(0x374151);
        });

        trackBg.on('pointerout', () => {
            trackBg.setFillStyle(0x2d3748);
        });

        return elements;
    }    onResize() {
        // Prevent too rapid UI rebuilds during fullscreen transitions
        if (this.resizeTimer) this.time.removeEvent(this.resizeTimer);
        
        // Clear any existing UI references immediately to prevent stale access
        if (this.currentUIRefs) {
            Object.keys(this.currentUIRefs).forEach(key => {
                this.currentUIRefs[key] = null;
            });
        }
        
        this.resizeTimer = this.time.delayedCall(150, () => {
            this.createUI();
        });
    }    shutdown() {
        // Clear UI references
        if (this.currentUIRefs) {
            Object.keys(this.currentUIRefs).forEach(key => {
                this.currentUIRefs[key] = null;
            });
        }
        
        // Cleanup using fullscreen utility
        FullscreenUtils.cleanupScene(this);
        this.scale.off('resize', this.onResize, this);
        if (this.resizeTimer) {
            this.time.removeEvent(this.resizeTimer);
        }
    }
}
