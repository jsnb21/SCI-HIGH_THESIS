import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';

export default class PowerUpScene extends BaseScene {
    constructor() {
        super('PowerUpScene');
        
        // PowerUp properties
        this.gameplayState = null;
        this.powerUpData = null;
        this.selectedPowerUp = null;
        
        // UI elements
        this.titleText = null;
        this.descriptionText = null;
        this.powerUpButtons = [];
        this.backgroundOverlay = null;
        this.powerUpContainer = null;
        
        // PowerUp definitions
        this.powerUps = [
            {
                id: 'streakProtection',
                name: 'Streak Shield',
                description: 'Protects your streak from the next wrong answer',
                icon: '🛡️',
                color: 0x4CAF50
            },
            {
                id: 'goblinImmunity',
                name: 'Goblin Ward',
                description: 'Answer correctly to become immune to Goblin Thugs',
                icon: '✨',
                color: 0x2196F3
            },
            {
                id: 'speedBoost',
                name: 'Swift Steps',
                description: 'Higher streak = faster movement (max 2x speed)',
                icon: '💨',
                color: 0xFF9800
            }
        ];
    }

    init(data) {
        // Receive data from main gameplay scene
        this.powerUpData = data.powerUpToCollect;
        this.selectedPowerUp = null;
        
        console.log('PowerUpScene initialized with:', data);
    }

    create() {
        super.create();
        
        // Initialize submission flag
        this.powerUpSelected = false;
        this.timerExpired = false;
        
        // Listen for timer events from main gameplay scene
        const mainScene = this.scene.get('MainGameplay');
        if (mainScene) {
            mainScene.events.on('timer-expired', this.handleTimerExpired, this);
        }
        
        // Create background overlay that doesn't cover the UI area
        // Score at 30px, Streak at 65px + font height, so start overlay at 100px from top
        const overlayHeight = this.scale.height - 100;
        const overlayY = 100 + (overlayHeight / 2);
        
        this.backgroundOverlay = this.add.rectangle(
            this.scale.width / 2, 
            overlayY, 
            this.scale.width, 
            overlayHeight, 
            0x000000, 
            0.85
        );
        
        // Create power-up selection interface
        this.createPowerUpInterface();
    }

    createPowerUpInterface() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Create container for all UI elements
        this.powerUpContainer = this.add.container(0, 0);
        this.powerUpContainer.setDepth(10);
        
        // Title
        this.titleText = this.add.text(centerX, centerY - 180, '🌟 Power-Up Station! 🌟', {
            fontSize: '32px',
            fill: '#FFD700',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        });
        this.titleText.setOrigin(0.5);
        this.powerUpContainer.add(this.titleText);
        
        // Description
        this.descriptionText = this.add.text(centerX, centerY - 130, 'Choose a power-up to enhance your abilities!', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        });
        this.descriptionText.setOrigin(0.5);
        this.powerUpContainer.add(this.descriptionText);
        
        // Create power-up buttons
        this.createPowerUpButtons(centerX, centerY);
        
        // Add timer warning if needed
        this.addTimerWarning(centerX);
    }

    createPowerUpButtons(centerX, centerY) {
        this.powerUpButtons = [];
        
        const buttonWidth = 280;
        const buttonHeight = 80;
        const buttonSpacing = 100;
        const startY = centerY - 50;
        
        this.powerUps.forEach((powerUp, index) => {
            const buttonY = startY + (index * buttonSpacing);
            
            // Create button background
            const buttonBg = this.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, powerUp.color, 0.8);
            buttonBg.setStrokeStyle(2, 0xffffff);
            buttonBg.setInteractive();
            
            // Create button icon
            const iconText = this.add.text(centerX - 100, buttonY, powerUp.icon, {
                fontSize: '24px',
                fontFamily: 'Arial'
            });
            iconText.setOrigin(0.5);
            
            // Create button title
            const titleText = this.add.text(centerX - 50, buttonY - 15, powerUp.name, {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            });
            titleText.setOrigin(0, 0.5);
            
            // Create button description
            const descText = this.add.text(centerX - 50, buttonY + 15, powerUp.description, {
                fontSize: '12px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                wordWrap: { width: 200 }
            });
            descText.setOrigin(0, 0.5);
            
            // Button hover effects
            buttonBg.on('pointerover', () => {
                buttonBg.setFillStyle(powerUp.color, 1.0);
                buttonBg.setScale(1.05);
            });
            
            buttonBg.on('pointerout', () => {
                buttonBg.setFillStyle(powerUp.color, 0.8);
                buttonBg.setScale(1.0);
            });
            
            // Button click handler
            buttonBg.on('pointerdown', () => {
                this.selectPowerUp(powerUp);
            });
            
            // Store button elements
            const buttonElements = {
                background: buttonBg,
                icon: iconText,
                title: titleText,
                description: descText,
                powerUp: powerUp
            };
            
            this.powerUpButtons.push(buttonElements);
            this.powerUpContainer.add([buttonBg, iconText, titleText, descText]);
        });
    }

    addTimerWarning(centerX) {
        const warningText = this.add.text(centerX, this.scale.height - 50, 'Game paused - Take your time choosing!', {
            fontSize: '14px',
            fill: '#00ff00',
            fontFamily: 'Arial',
            align: 'center'
        });
        warningText.setOrigin(0.5);
        this.powerUpContainer.add(warningText);
        
        // Make it blink
        this.tweens.add({
            targets: warningText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    selectPowerUp(powerUp) {
        if (this.powerUpSelected || this.timerExpired) {
            return;
        }
        
        this.powerUpSelected = true;
        this.selectedPowerUp = powerUp;
        
        console.log('Selected power-up:', powerUp.name);
        
        // Visual feedback
        this.showSelectionFeedback(powerUp);
        
        // Apply the power-up effect
        this.applyPowerUpEffect(powerUp);
        
        // Return to gameplay after a short delay
        this.time.delayedCall(1500, () => {
            this.returnToGameplay(true);
        });
    }

    showSelectionFeedback(powerUp) {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Hide all buttons
        this.powerUpButtons.forEach(button => {
            button.background.setVisible(false);
            button.icon.setVisible(false);
            button.title.setVisible(false);
            button.description.setVisible(false);
        });
        
        // Show selection feedback
        const feedbackText = this.add.text(centerX, centerY, `${powerUp.icon} ${powerUp.name} Activated! ${powerUp.icon}`, {
            fontSize: '28px',
            fill: '#00ff00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        });
        feedbackText.setOrigin(0.5);
        this.powerUpContainer.add(feedbackText);
        
        // Pulse animation
        this.tweens.add({
            targets: feedbackText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            yoyo: true,
            repeat: 2
        });
    }

    applyPowerUpEffect(powerUp) {
        const mainScene = this.scene.get('MainGameplay');
        if (!mainScene) return;
        
        // Apply the selected power-up effect to the main gameplay scene
        switch (powerUp.id) {
            case 'streakProtection':
                mainScene.activatePowerUp('streakProtection');
                break;
            case 'goblinImmunity':
                mainScene.activatePowerUp('goblinImmunity');
                break;
            case 'speedBoost':
                mainScene.activatePowerUp('speedBoost');
                break;
        }
    }

    handleTimerExpired() {
        if (this.powerUpSelected) {
            return; // Already selected, ignore timer expiration
        }
        
        // Since the game is paused during power-up selection, this should not happen
        // But if it does, log it and continue normally
        console.log('Timer expired during power-up selection (unexpected since game should be paused)');
        
        // Don't auto-select since game is paused - let player choose
    }

    returnToGameplay(success) {
        console.log('Returning to gameplay, power-up collection success:', success);
        
        // Clean up timer event listener
        const mainScene = this.scene.get('MainGameplay');
        if (mainScene) {
            mainScene.events.off('timer-expired', this.handleTimerExpired, this);
            
            // Notify main scene of result
            mainScene.handlePowerUpResult(this.powerUpData, success, this.selectedPowerUp);
        }
        
        // Stop and remove this scene
        this.scene.stop();
    }

    // Clean up when scene is destroyed
    destroy() {
        const mainScene = this.scene.get('MainGameplay');
        if (mainScene) {
            mainScene.events.off('timer-expired', this.handleTimerExpired, this);
        }
        super.destroy();
    }
}
