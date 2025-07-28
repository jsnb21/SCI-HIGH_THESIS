import Phaser from 'phaser';
import { DEFAULT_TEXT_STYLE } from '../game';
import { updateSoundVolumes, playExclusiveBGM } from '../audioUtils';
import { getAllSaveKeys, loadGame } from '../save';
import gameManager, { onceOnlyFlags } from '../gameManager.js';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getResponsivePosition,
    createResponsiveTextStyle,
    createResponsiveButton,
    getSafeArea,
    createDebouncedClickHandler
} from '../utils/mobileUtils.js';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    preload() {
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_title', 'assets/audio/bgm/bgm_title.mp3');
        
        // Load the logo image
        this.load.image('game_logo', 'assets/img/mainmenu/SCI-HIGH_LOGO.png');
        
        // Load cloud images - replace with your actual cloud image paths
        this.load.image('clouds', 'assets/img/mainmenu/clouds.png');
    }

    create() {
        console.log('MainMenu create() called');
        
        let scaleInfo;
        try {
            scaleInfo = getScaleInfo(this);
            console.log('ScaleInfo:', scaleInfo);
        } catch (error) {
            console.warn('Mobile utils failed, using fallback:', error);
            const { width, height } = this.scale;
            scaleInfo = {
                width,
                height,
                finalScale: Math.min(width / 1920, height / 1080),
                isMobile: width < 768 || height < 600,
                isPortrait: height > width
            };
        }
        
        const { width, height } = scaleInfo;
        let safeArea;
        try {
            safeArea = getSafeArea(scaleInfo);
        } catch (error) {
            console.warn('SafeArea fallback');
            const margin = scaleInfo.isMobile ? 20 * scaleInfo.finalScale : 10 * scaleInfo.finalScale;
            safeArea = {
                left: margin,
                right: width - margin,
                top: margin,
                bottom: height - margin,
                width: width - (margin * 2),
                height: height - (margin * 2)
            };
        }
        
        console.log('Screen size:', width, 'x', height);
        console.log('Is mobile:', scaleInfo.isMobile);
        
        const se_hoverSound = this.sound.add('se_select');
        const se_confirmSound = this.sound.add('se_confirm');

        playExclusiveBGM(this, 'bgm_title', { loop: true });
        updateSoundVolumes(this);

        this.input.once('pointerdown', () => {
            se_hoverSound.play({ volume: 0 });
            se_hoverSound.stop();
        });

        // Set a solid color background
        this.cameras.main.setBackgroundColor('#87ceeb');

        // Create scrolling clouds behind everything
        this.createScrollingClouds();

        // Add the logo image - responsive positioning
        let logoPos;
        try {
            logoPos = getResponsivePosition(scaleInfo, 'center', { x: 0, y: -180 * scaleInfo.finalScale });
        } catch (error) {
            logoPos = { x: width / 2, y: height / 2 - 180 * scaleInfo.finalScale };
        }
        
        const logo = this.add.image(logoPos.x, logoPos.y, 'game_logo');
        
        // Scale the logo appropriately for mobile - made bigger
        const logoScale = scaleInfo.isMobile ? 
            (scaleInfo.isPortrait ? 0.8 * scaleInfo.finalScale : 0.7 * scaleInfo.finalScale) : 
            1.0 * scaleInfo.finalScale;
        logo.setScale(logoScale);
        
        // Add fade-in animation for the logo
        logo.setAlpha(0);
        this.tweens.add({
            targets: logo,
            alpha: 1,
            duration: 600,
            delay: 200,
            ease: 'Quad.easeOut'
        });
        
        // Optional: Add a subtle floating animation to the logo
        this.tweens.add({
            targets: logo,
            y: logo.y - 10 * scaleInfo.finalScale,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 800
        });

        // Menu button spacing and positioning - different for mobile and desktop
        if (scaleInfo.isMobile) {
            // Mobile: 2x2 grid layout with bigger buttons
            const horizontalSpacing = 60 * scaleInfo.finalScale;
            const verticalSpacing = 40 * scaleInfo.finalScale;
            
            const startY = scaleInfo.isPortrait ? 
                height / 2 + 80 * scaleInfo.finalScale : 
                height / 2 + 40 * scaleInfo.finalScale;
            
            // Calculate button positions for 2x2 grid - buttons will auto-size to fit text
            const centerX = width / 2;
            const leftX = centerX - horizontalSpacing;
            const rightX = centerX + horizontalSpacing;
            const topY = startY;
            const bottomY = startY + 80 * scaleInfo.finalScale + verticalSpacing;

            // Menu button data for mobile 2x2 grid
            const menuButtons = [
                // Top row
                { label: 'New Game', x: leftX, y: topY, onClick: () => {
                    se_confirmSound.play();
                    gameManager.reset();
                    onceOnlyFlags.reset();
                    this.scene.start('VNScene');
                }},
                { label: 'Continue', x: rightX, y: topY, onClick: () => {
                    se_confirmSound.play();
                    showSaveSelectAndContinue(this, se_hoverSound, se_confirmSound);
                }},
                // Bottom row
                { label: 'Options', x: leftX, y: bottomY, onClick: () => {
                    se_confirmSound.play();
                    this.scene.start('OptionsScene');
                }},
                { label: 'Quit', x: rightX, y: bottomY, onClick: () => {
                    se_confirmSound.play();
                    this.showQuitConfirmation(se_hoverSound, se_confirmSound);
                }},
            ];

            // Create menu buttons with 2x2 grid positioning
            menuButtons.forEach((btn, i) => {
                createMenuButton(this, btn.x, btn.y, btn.label, btn.onClick, se_hoverSound, i * 80 + 400, scaleInfo);
            });
        } else {
            // Desktop: vertical layout (original)
            const buttonSpacing = 70 * scaleInfo.finalScale;
            const startY = height / 2 + 40 * scaleInfo.finalScale;

            // Menu button data with responsive positioning
            const menuButtons = [
                { label: 'New Game', y: startY, onClick: () => {
                    se_confirmSound.play();
                    gameManager.reset();
                    onceOnlyFlags.reset();
                    this.scene.start('VNScene');
                }},
                { label: 'Continue', y: startY + buttonSpacing, onClick: () => {
                    se_confirmSound.play();
                    showSaveSelectAndContinue(this, se_hoverSound, se_confirmSound);
                }},
                { label: 'Options', y: startY + (buttonSpacing * 2), onClick: () => {
                    se_confirmSound.play();
                    this.scene.start('OptionsScene');
                }},
                { label: 'Quit', y: startY + (buttonSpacing * 3), onClick: () => {
                    se_confirmSound.play();
                    this.showQuitConfirmation(se_hoverSound, se_confirmSound);
                }},
            ];

            // Create menu buttons with backgrounds and effects
            menuButtons.forEach((btn, i) => {
                createMenuButton(this, width / 2, btn.y, btn.label, btn.onClick, se_hoverSound, i * 80 + 400, scaleInfo);
            });
        }
    }

    createScrollingClouds() {
        let scaleInfo;
        try {
            scaleInfo = getScaleInfo(this);
        } catch (error) {
            const { width, height } = this.scale;
            scaleInfo = {
                width,
                height,
                finalScale: Math.min(width / 1920, height / 1080),
                isMobile: width < 768 || height < 600
            };
        }
        const { width, height } = scaleInfo;
        
        // Create multiple cloud layers for parallax depth
        this.cloudLayers = [];
        
        // Far background layer (slowest, smallest, most transparent)
        const farBgLayer = this.add.group();
        for (let i = 0; i < 6; i++) {
            const cloud = this.add.image(
                (width / 4) * i - width, 
                height / 2 - 150 + Math.random() * 80, 
                'clouds'
            );
            cloud.setScale(0.3 + Math.random() * 0.2);
            cloud.setAlpha(0.15);
            cloud.setTint(0xe6f2ff);
            farBgLayer.add(cloud);
        }
        this.cloudLayers.push({ group: farBgLayer, speed: 0.2, depth: 1 });
        
        // Mid background layer
        const midBgLayer = this.add.group();
        for (let i = 0; i < 5; i++) {
            const cloud = this.add.image(
                (width / 3) * i - width / 2, 
                height / 2 - 80 + Math.random() * 120, 
                'clouds'
            );
            cloud.setScale(0.5 + Math.random() * 0.3);
            cloud.setAlpha(0.25);
            cloud.setTint(0xf0f8ff);
            midBgLayer.add(cloud);
        }
        this.cloudLayers.push({ group: midBgLayer, speed: 0.4, depth: 2 });
        
        // Middle layer
        const midLayer = this.add.group();
        for (let i = 0; i < 4; i++) {
            const cloud = this.add.image(
                (width / 2.5) * i - width / 3, 
                height / 2 + Math.random() * 160 - 80, 
                'clouds'
            );
            cloud.setScale(0.6 + Math.random() * 0.3);
            cloud.setAlpha(0.35);
            cloud.setTint(0xffffff);
            midLayer.add(cloud);
        }
        this.cloudLayers.push({ group: midLayer, speed: 0.7, depth: 3 });
        
        // Near layer
        const nearLayer = this.add.group();
        for (let i = 0; i < 3; i++) {
            const cloud = this.add.image(
                (width / 2) * i - width / 4, 
                height / 2 + 80 + Math.random() * 140, 
                'clouds'
            );
            cloud.setScale(0.8 + Math.random() * 0.4);
            cloud.setAlpha(0.45);
            cloud.setTint(0xf8fcff);
            nearLayer.add(cloud);
        }
        this.cloudLayers.push({ group: nearLayer, speed: 1.0, depth: 4 });
        
        // Foreground layer (fastest, largest, most visible)
        const fgLayer = this.add.group();
        for (let i = 0; i < 2; i++) {
            const cloud = this.add.image(
                width * i - width / 6, 
                height / 2 + 180 + Math.random() * 100, 
                'clouds'
            );
            cloud.setScale(1.0 + Math.random() * 0.5);
            cloud.setAlpha(0.6);
            cloud.setTint(0xffffff);
            fgLayer.add(cloud);
        }
        this.cloudLayers.push({ group: fgLayer, speed: 1.5, depth: 5 });
        
        // Start the parallax scrolling
        this.startParallaxScrolling();
    }
    
    startParallaxScrolling() {
        const { width } = this.scale;
        const baseSpeed = 30; // Base scrolling speed in pixels per second
        
        this.cloudLayers.forEach(layer => {
            const layerSpeed = baseSpeed * layer.speed;
            
            layer.group.children.entries.forEach((cloud, index) => {
                // Add slight variation to each cloud's speed within the layer
                const cloudSpeed = layerSpeed + (Math.random() - 0.5) * 5;
                
                // Create continuous parallax movement
                const moveCloud = () => {
                    this.tweens.add({
                        targets: cloud,
                        x: '+=' + (width + cloud.displayWidth * 2),
                        duration: ((width + cloud.displayWidth * 2) / cloudSpeed) * 1000,
                        ease: 'Linear',
                        onComplete: () => {
                            // Reset cloud position with some randomization
                            cloud.x = -cloud.displayWidth - Math.random() * 200;
                            cloud.y = cloud.y + (Math.random() - 0.5) * 20; // Slight vertical drift
                            moveCloud(); // Restart the movement
                        }
                    });
                };
                
                // Start movement with staggered timing
                this.time.delayedCall(index * 1000, moveCloud);
            });
        });
    }

    showQuitConfirmation(hoverSound, confirmSound) {
        const { width, height } = this.scale;
        
        // Clear any existing quit confirmation
        if (this.quitConfirmGroup) {
            this.quitConfirmGroup.clear(true, true);
        }
        
        this.quitConfirmGroup = this.add.group();
        
        // Semi-transparent overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        this.quitConfirmGroup.add(overlay);
        
        // Confirmation dialog dimensions
        const dialogWidth = 480;
        const dialogHeight = 200;
        const baseX = width / 2;
        const baseY = height / 2;
        
        // Dialog background
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x222244, 0.96);
        dialogBg.lineStyle(4, 0xffffcc, 1);
        dialogBg.strokeRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
        dialogBg.fillRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
        this.quitConfirmGroup.add(dialogBg);
          // Confirmation text
        const confirmText = this.add.text(baseX, baseY - 40, 'Are you sure you want to quit?', {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);
        this.quitConfirmGroup.add(confirmText);
        
        // Button dimensions
        const btnWidth = 140;
        const btnHeight = 50;
        const btnSpacing = 80;
        
        // Yes button
        const yesBg = this.add.graphics();
        yesBg.fillStyle(0x662222, 0.9);
        yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
        yesBg.lineStyle(2, 0xff4444, 1);
        yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
        this.quitConfirmGroup.add(yesBg);
        
        const yesBtn = this.add.text(baseX - btnSpacing, baseY + 30, 'Yes', {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '28px',
            color: '#ff4444',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.quitConfirmGroup.add(yesBtn);
        
        // No button
        const noBg = this.add.graphics();
        noBg.fillStyle(0x224422, 0.9);
        noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
        noBg.lineStyle(2, 0x44ff44, 1);
        noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
        this.quitConfirmGroup.add(noBg);
        
        const noBtn = this.add.text(baseX + btnSpacing, baseY + 30, 'No', {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '28px',
            color: '#44ff44',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.quitConfirmGroup.add(noBtn);
        
        // Yes button events
        yesBtn.on('pointerover', () => {
            yesBtn.setStyle({ color: '#ffffff' });
            yesBg.clear();
            yesBg.fillStyle(0x883333, 1);
            yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
            yesBg.lineStyle(2, 0xff4444, 1);
            yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
            if (!hoverSound.isPlaying) hoverSound.play();
        });
        
        yesBtn.on('pointerout', () => {
            yesBtn.setStyle({ color: '#ff4444' });
            yesBg.clear();
            yesBg.fillStyle(0x662222, 0.9);
            yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
            yesBg.lineStyle(2, 0xff4444, 1);
            yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
        });
        
        // Use debounced click handler for Yes button
        const debouncedYesClick = createDebouncedClickHandler(() => {
            confirmSound.play();
            window.location.href = 'index.html';
        }, 300);
        
        yesBtn.on('pointerdown', (pointer) => {
            yesBtn.setScale(0.95);
            debouncedYesClick(pointer);
            
            this.time.delayedCall(100, () => {
                yesBtn.setScale(1);
            });
        });
        
        // No button events
        noBtn.on('pointerover', () => {
            noBtn.setStyle({ color: '#ffffff' });
            noBg.clear();
            noBg.fillStyle(0x338833, 1);
            noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
            noBg.lineStyle(2, 0x44ff44, 1);
            noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
            if (!hoverSound.isPlaying) hoverSound.play();
        });
        
        noBtn.on('pointerout', () => {
            noBtn.setStyle({ color: '#44ff44' });
            noBg.clear();
            noBg.fillStyle(0x224422, 0.9);
            noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
            noBg.lineStyle(2, 0x44ff44, 1);
            noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 30 - btnHeight / 2, btnWidth, btnHeight, 16);
        });
        
        // Use debounced click handler for No button
        const debouncedNoClick = createDebouncedClickHandler(() => {
            confirmSound.play();
            this.quitConfirmGroup.clear(true, true);
        }, 300);
        
        noBtn.on('pointerdown', (pointer) => {
            noBtn.setScale(0.95);
            debouncedNoClick(pointer);
            
            this.time.delayedCall(100, () => {
                noBtn.setScale(1);
            });
        });
        
        // Add fade-in animation for the dialog
        this.quitConfirmGroup.children.entries.forEach((element, index) => {
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: element === overlay ? 0.7 : 1,
                duration: 300,
                delay: index * 50,
                ease: 'Quad.easeOut'
            });
        });
    }

    // ...existing code...
}

// Helper to create a menu button with background and effects
function createMenuButton(scene, x, y, label, onClick, hoverSound, tweenDelay = 0, scaleInfo) {
    // Simple fallback scaling if scaleInfo is not provided or utils are unavailable
    if (!scaleInfo) {
        try {
            scaleInfo = getScaleInfo(scene);
        } catch (error) {
            console.warn('Mobile utils not available, using fallback scaling');
            const { width, height } = scene.scale;
            scaleInfo = {
                width,
                height,
                finalScale: Math.min(width / 1920, height / 1080),
                isMobile: width < 768 || height < 600,
                isPortrait: height > width
            };
        }
    }
    
    // Get responsive scaling - auto-fit button size based on text
    const baseFontSize = scaleInfo.isMobile ? 28 : 36;  // Bigger font for mobile
    const padding = scaleInfo.isMobile ? 40 : 60;       // More padding for bigger buttons
    
    // Create temporary text to measure dimensions
    const tempText = scene.add.text(0, 0, label, {
        ...DEFAULT_TEXT_STYLE,
        fontSize: `${baseFontSize * (scaleInfo.finalScale || 1)}px`
    });
    
    // Calculate button size based on text dimensions with padding
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    const btnWidth = textWidth + padding * (scaleInfo.finalScale || 1);
    const btnHeight = Math.max(textHeight + (padding * 0.6) * (scaleInfo.finalScale || 1), 
                              scaleInfo.isMobile ? 60 * (scaleInfo.finalScale || 1) : 70 * (scaleInfo.finalScale || 1));
    const corner = scaleInfo.finalScale ? 20 * scaleInfo.finalScale : 20;
    
    // Remove temporary text
    tempText.destroy();

    // Button background
    const bg = scene.add.graphics();
    bg.fillStyle(0x222244, 0.92);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
    bg.lineStyle(scaleDimension(3, scaleInfo), 0xffffcc, 1);
    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
    bg.setAlpha(0);

    // Button text with responsive styling - bigger font
    let textStyle;
    try {
        const fontSize = scaleInfo.isMobile ? 28 : 36;  // Bigger font for both mobile and desktop
        textStyle = createResponsiveTextStyle(fontSize, scaleInfo, {
            color: '#ffff00',
            stroke: '#000',
            strokeThickness: scaleInfo.finalScale ? 4 * scaleInfo.finalScale : 4,
            shadow: { 
                offsetX: scaleInfo.finalScale ? 2 * scaleInfo.finalScale : 2, 
                offsetY: scaleInfo.finalScale ? 2 * scaleInfo.finalScale : 2, 
                color: '#000', 
                blur: scaleInfo.finalScale ? 4 * scaleInfo.finalScale : 4, 
                fill: true 
            }
        });
    } catch (error) {
        console.warn('Using fallback text style');
        const fontSize = scaleInfo.finalScale ? 
            Math.max(18, (scaleInfo.isMobile ? 28 : 36) * scaleInfo.finalScale) : 
            (scaleInfo.isMobile ? 28 : 36);
        textStyle = {
            ...DEFAULT_TEXT_STYLE,
            fontSize: `${fontSize}px`,
            color: '#ffff00',
            stroke: '#000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
        };
    }
    
    const text = scene.add.text(x, y, label, textStyle)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
    text.setAlpha(0);

    // Fade in animation
    scene.tweens.add({ targets: [bg, text], alpha: 1, duration: 400, delay: tweenDelay, ease: 'Quad.easeOut' });

    // Hover/press effects - use scaled stroke width
    const strokeWidth = scaleInfo.finalScale ? 3 * scaleInfo.finalScale : 3;
    
    // Only add hover effects for non-mobile devices
    if (!scaleInfo.isMobile) {
        text.on('pointerover', () => {
            text.setStyle({ color: '#ffffff' });
            bg.clear();
            bg.fillStyle(0x333388, 1);
            bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
            bg.lineStyle(strokeWidth, 0xffffcc, 1);
            bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
            if (!hoverSound.isPlaying) hoverSound.play();
        });
        text.on('pointerout', () => {
            text.setStyle({ color: '#ffff00' });
            bg.clear();
            bg.fillStyle(0x222244, 0.92);
            bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
            bg.lineStyle(strokeWidth, 0xffffcc, 1);
            bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        });
    }
    
    // Use debounced click handler to prevent double touches
    const debouncedClick = createDebouncedClickHandler(() => {
        onClick();
    }, 300);
    
    text.on('pointerdown', (pointer) => {
        // Visual feedback
        text.setScale(0.96);
        
        // Execute debounced callback
        debouncedClick(pointer);
        
        // Reset scale after a short delay
        scene.time.delayedCall(100, () => {
            text.setScale(1);
        });
    });
}

function showSaveSelectAndContinue(scene, hoverSound, confirmSound) {
    const saveKeys = getAllSaveKeys();
    if (saveKeys.length === 0) {
        // Show modal-style "No save files found" message
        showNoSaveFilesModal(scene);
        return;
    }

    if (scene.saveMenuGroup) scene.saveMenuGroup.clear(true, true);
    scene.saveMenuGroup = scene.add.group();

    const slotNames = saveKeys.map(k => k.replace('sciHighSave_', ''));
    const spacing = 56;
    const boxWidth = 480;
    const boxHeight = Math.max(120, 80 + spacing * (slotNames.length + 2));
    const baseX = scene.scale.width / 2;
    const baseY = scene.scale.height / 2 - boxHeight / 2 + 40;

    // Background box
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x222244, 0.96);
    graphics.lineStyle(4, 0xffffcc, 1);
    graphics.strokeRoundedRect(baseX - boxWidth / 2, baseY - 40, boxWidth, boxHeight, 24);
    graphics.fillRoundedRect(baseX - boxWidth / 2, baseY - 40, boxWidth, boxHeight, 24);
    scene.saveMenuGroup.add(graphics);

    // Title
    const title = scene.add.text(baseX, baseY - 20, 'Select Save Slot:', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '36px',
        color: '#ffff00',
        stroke: '#000',
        strokeThickness: 4
    }).setOrigin(0.5);
    scene.saveMenuGroup.add(title);

    // Save slot buttons
    slotNames.forEach((slot, i) => {
        const slotY = baseY + spacing * i + 20;
        const btnWidth = 320;
        const btnHeight = 44;
        const corner = 14;

        // Slot background
        const slotBg = scene.add.graphics();
        slotBg.fillStyle(0x333366, 0.85);
        slotBg.fillRoundedRect(baseX - btnWidth / 2, slotY - btnHeight / 2, btnWidth, btnHeight, corner);
        slotBg.setAlpha(0.95);

        // Slot text
        const btn = scene.add.text(baseX, slotY, slot, {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => {
            btn.setStyle({ color: '#ffff00' });
            slotBg.clear();
            slotBg.fillStyle(0x444488, 1);
            slotBg.fillRoundedRect(baseX - btnWidth / 2, slotY - btnHeight / 2, btnWidth, btnHeight, corner);
            if (!hoverSound.isPlaying) hoverSound.play();
        });
        btn.on('pointerout', () => {
            btn.setStyle({ color: '#ffffff' });
            slotBg.clear();
            slotBg.fillStyle(0x333366, 0.85);
            slotBg.fillRoundedRect(baseX - btnWidth / 2, slotY - btnHeight / 2, btnWidth, btnHeight, corner);
        });
        
        // Use debounced click handler for save slot selection
        const debouncedSaveClick = createDebouncedClickHandler(() => {
            const saveData = loadGame(slot);
            if (!saveData) {
                btn.setStyle({ color: '#ff4444' });
                return;
            }
            window.__SCI_HIGH_SAVE_DATA__ = saveData;
            scene.saveMenuGroup.clear(true, true);
            scene.scene.start('MainHub');
        }, 300);
        
        btn.on('pointerdown', (pointer) => {
            btn.setScale(0.97);
            debouncedSaveClick(pointer);
            
            scene.time.delayedCall(100, () => {
                btn.setScale(1);
            });
        });

        scene.saveMenuGroup.add(slotBg);
        scene.saveMenuGroup.add(btn);
    });

    // Cancel button
    const cancelY = baseY + spacing * (slotNames.length) + 40;
    const cancelBtnWidth = 220;
    const cancelBtnHeight = 44;
    const cancelCorner = 14;

    const cancelBg = scene.add.graphics();
    cancelBg.fillStyle(0x442222, 0.85);
    cancelBg.fillRoundedRect(baseX - cancelBtnWidth / 2, cancelY - cancelBtnHeight / 2, cancelBtnWidth, cancelBtnHeight, cancelCorner);

    const cancelBtn = scene.add.text(baseX, cancelY, 'Cancel', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '28px',
        color: '#ff4444',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerover', () => {
        cancelBtn.setStyle({ color: '#ffffff' });
        cancelBg.clear();
        cancelBg.fillStyle(0x883333, 1);
        cancelBg.fillRoundedRect(baseX - cancelBtnWidth / 2, cancelY - cancelBtnHeight / 2, cancelBtnWidth, cancelBtnHeight, cancelCorner);
        if (!hoverSound.isPlaying) hoverSound.play();
    });
    cancelBtn.on('pointerout', () => {
        cancelBtn.setStyle({ color: '#ff4444' });
        cancelBg.clear();
        cancelBg.fillStyle(0x442222, 0.85);
        cancelBg.fillRoundedRect(baseX - cancelBtnWidth / 2, cancelY - cancelBtnHeight / 2, cancelBtnWidth, cancelBtnHeight, cancelCorner);
    });
    
    // Use debounced click handler for cancel button
    const debouncedCancelClick = createDebouncedClickHandler(() => {
        scene.saveMenuGroup.clear(true, true);
    }, 300);
    
    cancelBtn.on('pointerdown', (pointer) => {
        cancelBtn.setScale(0.97);
        debouncedCancelClick(pointer);
        
        scene.time.delayedCall(100, () => {
            cancelBtn.setScale(1);
        });
    });

    scene.saveMenuGroup.add(cancelBg);
    scene.saveMenuGroup.add(cancelBtn);
}

function showNoSaveFilesModal(scene) {
    const { width, height } = scene.scale;
    
    // Clear any existing modal
    if (scene.noSaveModal) {
        scene.noSaveModal.clear(true, true);
    }
    
    scene.noSaveModal = scene.add.group();
    
    // Full-screen dimmed overlay
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    scene.noSaveModal.add(overlay);
    
    // Modal dialog dimensions
    const dialogWidth = 480;
    const dialogHeight = 160;
    const baseX = width / 2;
    const baseY = height / 2;
    
    // Dialog background
    const dialogBg = scene.add.graphics();
    dialogBg.fillStyle(0x222244, 0.96);
    dialogBg.lineStyle(4, 0xffffcc, 1);
    dialogBg.strokeRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
    dialogBg.fillRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
    scene.noSaveModal.add(dialogBg);
    
    // Message text
    const messageText = scene.add.text(baseX, baseY, 'No save files found!', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '32px',
        color: '#ff4444',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
    }).setOrigin(0.5);
    scene.noSaveModal.add(messageText);
    
    // Set initial alpha to 0 for fade-in effect
    scene.noSaveModal.children.entries.forEach(element => {
        element.setAlpha(0);
    });
    
    // Fade in animation
    scene.tweens.add({
        targets: overlay,
        alpha: 0.6,
        duration: 300,
        ease: 'Quad.easeOut'
    });
    
    scene.tweens.add({
        targets: [dialogBg, messageText],
        alpha: 1,
        duration: 400,
        delay: 150,
        ease: 'Quad.easeOut'
    });
      // Auto fade out after 1 second
    scene.time.delayedCall(1000, () => {
        scene.tweens.add({
            targets: scene.noSaveModal.children.entries,
            alpha: 0,
            duration: 500,
            ease: 'Quad.easeIn',
            onComplete: () => {
                scene.noSaveModal.clear(true, true);
            }
        });
    });
}