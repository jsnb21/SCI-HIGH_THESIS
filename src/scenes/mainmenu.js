import Phaser from 'phaser';
import { DEFAULT_TEXT_STYLE } from '../game';
import { updateSoundVolumes, playExclusiveBGM } from '../audioUtils'; // <-- Correct import
import { getAllSaveKeys, loadGame } from '../save';
import gameManager, { onceOnlyFlags } from '../gameManager';

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
        updateSoundVolumes(this); // <-- Ensure volumes are set

        // Unlock audio context on first user interaction
        this.input.once('pointerdown', () => {
            se_hoverSound.play({ volume: 0 });
            se_hoverSound.stop();
        });

        // Add and scale background image
        const bg = this.add.image(width / 2, height / 2, 'menuBg');
        bg.setDisplaySize(width, height);

        // --- Play Game Button ---
        const playButton = this.add.text(width / 2, (height / 2) + 60, 'New Game', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        playButton.on('pointerdown', () => {
            se_confirmSound.play();
            gameManager.reset();        // <-- Reset all core game state
            onceOnlyFlags.reset();      // <-- Reset all once-only flags
            this.scene.start('VNScene');
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
            showSaveSelectAndContinue(this);
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
            this.scene.start('OptionsScene');
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

function showSaveSelectAndContinue(scene) {
    const saveKeys = getAllSaveKeys();
    if (saveKeys.length === 0) {
        scene.add.text(scene.scale.width / 2, scene.scale.height / 2 + 300, 'No save files found!', {
            ...DEFAULT_TEXT_STYLE,
            color: '#ff4444'
        }).setOrigin(0.5);
        return;
    }

    // Remove any previous save menu
    if (scene.saveMenuGroup) scene.saveMenuGroup.clear(true, true);

    // Create a group to hold menu items
    scene.saveMenuGroup = scene.add.group();

    const slotNames = saveKeys.map(k => k.replace('sciHighSave_', ''));
    const spacing = 50;
    const boxWidth = 420;
    const boxHeight = Math.max(120, 80 + spacing * (slotNames.length + 2));

    // Center the box
    const baseX = scene.scale.width / 2;
    const baseY = scene.scale.height / 2 - boxHeight / 2 + 40;

    // Draw message box background
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x222244, 0.92);
    graphics.lineStyle(4, 0xffffcc, 1);
    graphics.strokeRoundedRect(baseX - boxWidth / 2, baseY - 40, boxWidth, boxHeight, 24);
    graphics.fillRoundedRect(baseX - boxWidth / 2, baseY - 40, boxWidth, boxHeight, 24);
    scene.saveMenuGroup.add(graphics);

    // Add a title
    const title = scene.add.text(baseX, baseY - 20, 'Select Save Slot:', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '36px',
        color: '#ffff00'
    }).setOrigin(0.5);
    scene.saveMenuGroup.add(title);

    // Add a button for each save slot
    slotNames.forEach((slot, i) => {
        const btn = scene.add.text(baseX, baseY + spacing * i + 20, slot, {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: ''
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setStyle({ color: '#ffff00' }));
        btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
        btn.on('pointerdown', () => {
            const saveData = loadGame(slot);
            if (!saveData) {
                btn.setStyle({ color: '#ff4444' });
                return;
            }
            window.__SCI_HIGH_SAVE_DATA__ = saveData;
            scene.saveMenuGroup.clear(true, true); // Remove menu
            scene.scene.start('MainHub');
        });

        scene.saveMenuGroup.add(btn);
    });

    // Add a cancel button
    const cancelBtn = scene.add.text(baseX, baseY + spacing * (slotNames.length) + 40, 'Cancel', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '32px',
        color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerover', () => cancelBtn.setStyle({ color: '#ffffff' }));
    cancelBtn.on('pointerout', () => cancelBtn.setStyle({ color: '#ff4444' }));
    cancelBtn.on('pointerdown', () => {
        scene.saveMenuGroup.clear(true, true);
    });

    scene.saveMenuGroup.add(cancelBtn);
}