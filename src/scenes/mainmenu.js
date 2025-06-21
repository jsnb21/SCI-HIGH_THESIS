import Phaser from 'phaser';
import { DEFAULT_TEXT_STYLE } from '../game';
import { updateSoundVolumes, playExclusiveBGM } from '../audioUtils';
import { getAllSaveKeys, loadGame } from '../save';
import gameManager, { onceOnlyFlags } from '../gameManager';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    preload() {
        this.load.font('Jersey15-Regular', 'assets/font/Jersey15-Regular.ttf');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_title', 'assets/audio/bgm/bgm_title.mp3');
        
        // Load the logo image
        this.load.image('game_logo', 'assets/img/mainmenu/SCI-HIGH_LOGO.png');
        
        // Load cloud images - replace with your actual cloud image paths
        this.load.image('clouds', 'assets/img/mainmenu/clouds.png');
    }

    create() {
        const { width, height } = this.scale;
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

        // Add the logo image above the New Game button
        const logo = this.add.image(width / 2, height / 2 - 180, 'game_logo');
        
        // Scale the logo to appropriate size (adjust as needed)
        logo.setScale(0.8);
        
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
            y: logo.y - 10,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 800
        });

        // Menu button data
        const menuButtons = [
            { label: 'New Game', y: height / 2 + 40, onClick: () => {
                se_confirmSound.play();
                gameManager.reset();
                onceOnlyFlags.reset();
                this.scene.start('VNScene');
            }},
            { label: 'Continue', y: height / 2 + 110, onClick: () => {
                se_confirmSound.play();
                showSaveSelectAndContinue(this, se_hoverSound, se_confirmSound);
            }},
            { label: 'Options', y: height / 2 + 180, onClick: () => {
                se_confirmSound.play();
                this.scene.start('OptionsScene');
            }},
            { label: 'Quit', y: height / 2 + 250, onClick: () => {
                se_confirmSound.play();
                window.location.href = 'index.html';
            }},
        ];

        // Create menu buttons with backgrounds and effects
        menuButtons.forEach((btn, i) => {
            createMenuButton(this, width / 2, btn.y, btn.label, btn.onClick, se_hoverSound, i * 80 + 400);
        });
    }

    createScrollingClouds() {
        const { width, height } = this.scale;
        
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
}

// Helper to create a menu button with background and effects
function createMenuButton(scene, x, y, label, onClick, hoverSound, tweenDelay = 0) {
    const btnWidth = 320;
    const btnHeight = 56;
    const corner = 18;

    // Button background
    const bg = scene.add.graphics();
    bg.fillStyle(0x222244, 0.92);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
    bg.lineStyle(3, 0xffffcc, 1);
    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
    bg.setAlpha(0);

    // Button text
    const text = scene.add.text(x, y, label, {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '36px',
        color: '#ffff00',
        stroke: '#000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.setAlpha(0);

    // Fade in animation
    scene.tweens.add({ targets: [bg, text], alpha: 1, duration: 400, delay: tweenDelay, ease: 'Quad.easeOut' });

    // Hover/press effects
    text.on('pointerover', () => {
        text.setStyle({ color: '#ffffff' });
        bg.clear();
        bg.fillStyle(0x333388, 1);
        bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        bg.lineStyle(3, 0xffffcc, 1);
        bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        if (!hoverSound.isPlaying) hoverSound.play();
    });
    text.on('pointerout', () => {
        text.setStyle({ color: '#ffff00' });
        bg.clear();
        bg.fillStyle(0x222244, 0.92);
        bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        bg.lineStyle(3, 0xffffcc, 1);
        bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
    });
    text.on('pointerdown', () => {
        text.setScale(0.96);
    });
    text.on('pointerup', () => {
        text.setScale(1);
        onClick();
    });
}

function showSaveSelectAndContinue(scene, hoverSound, confirmSound) {
    const saveKeys = getAllSaveKeys();
    if (saveKeys.length === 0) {
        scene.add.text(scene.scale.width / 2, scene.scale.height / 2 + 320, 'No save files found!', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ff4444',
            fontSize: '32px',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
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
        btn.on('pointerdown', () => {
            btn.setScale(0.97);
        });
        btn.on('pointerup', () => {
            btn.setScale(1);
            const saveData = loadGame(slot);
            if (!saveData) {
                btn.setStyle({ color: '#ff4444' });
                return;
            }
            window.__SCI_HIGH_SAVE_DATA__ = saveData;
            scene.saveMenuGroup.clear(true, true);
            scene.scene.start('MainHub');
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
    cancelBtn.on('pointerdown', () => {
        cancelBtn.setScale(0.97);
    });
    cancelBtn.on('pointerup', () => {
        cancelBtn.setScale(1);
        scene.saveMenuGroup.clear(true, true);
    });

    scene.saveMenuGroup.add(cancelBg);
    scene.saveMenuGroup.add(cancelBtn);
}