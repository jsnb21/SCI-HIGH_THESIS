import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';
import { getScaleInfo } from '../../utils/mobileUtils.js';

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
            },
            {
                id: 'freezeEnemy',
                name: 'Frost Hex',
                description: 'Next correct answer freezes a random enemy',
                icon: '❄️',
                color: 0x80DEEA
            }
        ];
    }

    init(data) {
        // Receive data from main gameplay scene
        this.powerUpData = data.powerUpToCollect;
        this.selectedPowerUp = null;
        
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
        
        // Get mobile information for responsive overlay positioning
        const scaleInfo = getScaleInfo(this);
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        
        // Calculate UI element positions using the same logic as main gameplay scene
        const scoreY = isMobile ? Math.min(30, screenHeight * 0.05) : 30;
        const streakY = isMobile ? Math.min(65, screenHeight * 0.11) : 65;
        const scoreFontSize = isMobile ? Math.max(18, screenWidth * 0.03) : 24;
        const streakFontSize = isMobile ? Math.max(14, screenWidth * 0.025) : 18;
        
        // Calculate overlay start position based on actual UI element heights
        // Add some padding after the streak text (use font size as height approximation)
        const overlayStartY = Math.max(100, streakY + streakFontSize + 20);
        const overlayHeight = this.scale.height - overlayStartY;
        const overlayY = overlayStartY + (overlayHeight / 2);
        
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
        
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        const isSmallMobile = scaleInfo.width < 480;
        
        // Create container for all UI elements
        this.powerUpContainer = this.add.container(0, 0);
        this.powerUpContainer.setDepth(10);
        
        // Responsive font sizes
    const titleFontSize = isMobile ? (isSmallMobile ? '26px' : '30px') : '34px';
    const descFontSize = isMobile ? (isSmallMobile ? '16px' : '18px') : '20px';
        
        // Responsive positioning
    const titleOffsetY = isMobile ? (isSmallMobile ? -140 : -160) : -190;
    const descOffsetY = isMobile ? (isSmallMobile ? -95 : -115) : -140;
        
        // Title
        this.titleText = this.add.text(centerX, centerY + titleOffsetY, '🌟 Power-Up Station! 🌟', {
            fontSize: titleFontSize,
            fill: '#FFD700',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        });
        this.titleText.setOrigin(0.5);
        this.powerUpContainer.add(this.titleText);
        
        // Description
        this.descriptionText = this.add.text(centerX, centerY + descOffsetY, 'Choose a power-up to enhance your abilities!', {
            fontSize: descFontSize,
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

        // Apply a 20% size boost on mobile to the whole UI, with basic clamping
        if (isMobile) {
            // Center the container first so bounds are symmetric around screen center
            this.powerUpContainer.setPosition(centerX, centerY);
            let targetScale = 1.2;
            // Measure bounds without scale to determine clamped scale
            const preScaleBounds = this.powerUpContainer.getBounds();
            if (preScaleBounds.width * targetScale > this.scale.width * 0.94) {
                targetScale = Math.min(targetScale, (this.scale.width * 0.94) / Math.max(1, preScaleBounds.width));
            }
            if (preScaleBounds.height * targetScale > this.scale.height * 0.9) {
                targetScale = Math.min(targetScale, (this.scale.height * 0.9) / Math.max(1, preScaleBounds.height));
            }
            this.powerUpContainer.setScale(targetScale);
            // Ensure centered after scaling
            this.powerUpContainer.setPosition(centerX, centerY);
        } else {
            // On desktop, also center
            this.powerUpContainer.setPosition(centerX, centerY);
        }
    }

    createPowerUpButtons(centerX, centerY) {
        this.powerUpButtons = [];
        
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        const isSmallMobile = scaleInfo.width < 480;
        
        // Responsive button dimensions
    const buttonWidth = isMobile ? (isSmallMobile ? Math.min(scaleInfo.width * 0.9, 320) : Math.min(scaleInfo.width * 0.88, 360)) : 300;
    const buttonHeight = isMobile ? (isSmallMobile ? 76 : 88) : 90;
    const buttonSpacing = isMobile ? (isSmallMobile ? 84 : 98) : 110;
    const startY = centerY + (isMobile ? (isSmallMobile ? -10 : -20) : -40);
        
        // Responsive font sizes
    const iconFontSize = isMobile ? (isSmallMobile ? '22px' : '24px') : '26px';
    const titleFontSize = isMobile ? (isSmallMobile ? '18px' : '20px') : '20px';
    const descFontSize = isMobile ? (isSmallMobile ? '12px' : '14px') : '14px';
        
        // Responsive text positioning
    const iconOffsetX = isMobile ? (isSmallMobile ? -92 : -104) : -110;
    const textOffsetX = isMobile ? (isSmallMobile ? -36 : -40) : -46;
    const textWrapWidth = isMobile ? (isSmallMobile ? 170 : 200) : 220;
        
        this.powerUps.forEach((powerUp, index) => {
            const buttonY = startY + (index * buttonSpacing);
            
            // Create button background
            const buttonBg = this.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, powerUp.color, 0.8);
            buttonBg.setStrokeStyle(2, 0xffffff);
            buttonBg.setInteractive();
            
            // Create button icon
            const iconText = this.add.text(centerX + iconOffsetX, buttonY, powerUp.icon, {
                fontSize: iconFontSize,
                fontFamily: 'Arial'
            });
            iconText.setOrigin(0.5);
            
            // Create button title
            const titleText = this.add.text(centerX + textOffsetX, buttonY - (buttonHeight * 0.2), powerUp.name, {
                fontSize: titleFontSize,
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            });
            titleText.setOrigin(0, 0.5);
            
            // Create button description
            const descText = this.add.text(centerX + textOffsetX, buttonY + (buttonHeight * 0.2), powerUp.description, {
                fontSize: descFontSize,
                fill: '#ffffff',
                fontFamily: 'Arial',
                wordWrap: { width: textWrapWidth }
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
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        const isSmallMobile = scaleInfo.width < 480;
        
        // Responsive font size and positioning
    const warningFontSize = isMobile ? (isSmallMobile ? '14px' : '16px') : '16px';
    const warningY = isMobile ? (isSmallMobile ? this.scale.height - 36 : this.scale.height - 44) : this.scale.height - 50;
        
        const warningText = this.add.text(centerX, warningY, 'Game paused - Take your time choosing!', {
            fontSize: warningFontSize,
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
        
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        const isSmallMobile = scaleInfo.width < 480;
        
        // Hide all buttons
        this.powerUpButtons.forEach(button => {
            button.background.setVisible(false);
            button.icon.setVisible(false);
            button.title.setVisible(false);
            button.description.setVisible(false);
        });
        
        // Responsive feedback text
    const feedbackFontSize = isMobile ? (isSmallMobile ? '26px' : '30px') : '30px';
        
        // Show selection feedback
        const feedbackText = this.add.text(centerX, centerY, `${powerUp.icon} ${powerUp.name} Activated! ${powerUp.icon}`, {
            fontSize: feedbackFontSize,
            fill: '#00ff00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            wordWrap: { width: isMobile ? scaleInfo.width * 0.9 : undefined }
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
            case 'freezeEnemy':
                mainScene.activatePowerUp('freezeEnemy');
                break;
        }
    }

    handleTimerExpired() {
        if (this.powerUpSelected) {
            return; // Already selected, ignore timer expiration
        }
        
        // Since the game is paused during power-up selection, this should not happen
        // But if it does, log it and continue normally
        
        // Don't auto-select since game is paused - let player choose
    }

    returnToGameplay(success) {
        
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
