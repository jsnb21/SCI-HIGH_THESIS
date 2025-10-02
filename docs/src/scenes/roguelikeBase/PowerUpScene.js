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
        this.tooltipText = null;
        this.defaultTooltipText = 'Game paused - Take your time choosing!';
        this.powerUpButtons = [];
        this.backgroundOverlay = null;
        this.powerUpContainer = null;
        
        // PowerUp definitions (removed freeze power-up)
        this.powerUps = [
            {
                id: 'goblinWard',
                name: 'GOBLIN WARD',
                icon: '🔆', // shield icon
                color: 0xFF1744, // red
                description: 'Protects you from goblin attacks for a limited time'
            },
            {
                id: 'streakShield',
                name: 'STREAK SHIELD',
                icon: '🛡️', // shield icon
                color: 0x2196F3, // blue
                description: 'Prevents your answer streak from breaking on wrong answers'
            },
            {
                id: 'swiftSteps',
                name: 'SWIFT STEPS',
                icon: '💨', // wind icon
                color: 0xFFD700, // yellow/gold
                description: 'Increases your movement speed to navigate faster'
            }
        ];
        
        // Power-up level tracking
        this.powerUpLevels = {
            goblinWard: 1,
            streakShield: 1,
            swiftSteps: 1
        };
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
        
        // Create power-up selection interface using QuizScene approach
        this.createPowerUpInterface();
    }

    createPowerUpInterface() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Get mobile information for responsive design (matching QuizScene)
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.isMobile || scaleInfo.width < 900;
        const isSmallMobile = scaleInfo.width < 500;
        
        // Create main container (matching QuizScene)
        this.powerUpContainer = this.add.container(centerX, centerY);
        
        // Tall mobile detection (matching QuizScene)
        const aspect = this.scale.height / (this.scale.width || 1);
        const isTallMobile = (isMobile || scaleInfo.isPortrait) && aspect > 1.85;
        const TALL_MOBILE_FONT_REDUCE = 0.94; // gentler reduction on very tall devices
        
        // Mobile sizing constants (matching QuizScene)
        const MOBILE_MAX_WIDTH_RATIO = 0.98;   // up to 98% of game width
        const MOBILE_MAX_HEIGHT_RATIO = 0.9; // up to 90% of game height

        // Calculate content dimensions (matching QuizScene approach)
        let contentWidth = isMobile ? Math.min(this.scale.width * MOBILE_MAX_WIDTH_RATIO, 1700) : 980;
        if (isTallMobile) {
            contentWidth = Math.min(contentWidth, this.scale.width * 0.85);
        }
        
        // Power-up station dimensions (matching QuizScene button layout)
        let titleHeight = isMobile ? 74 : 70;
        let questionNumberHeight = 0;  // No question number
        let questionHeight = isMobile ? 40 : 50;  // Sub-header height
        let questionPadding = isMobile ? 44 : 60;  // Space before cards
        let buttonsAreaHeight = isMobile ? 180 : 200;  // Card area
        let bottomPadding = isMobile ? 30 : 40;
        
        if (isTallMobile) {
            titleHeight = 52;
            questionHeight = 36;
            questionPadding = 40;
            buttonsAreaHeight = 160;
            bottomPadding = 26;
        }
        
        const contentHeight = titleHeight + questionNumberHeight + questionHeight + questionPadding + buttonsAreaHeight + bottomPadding;

        // Determine scaling based on game viewport bounds (matching QuizScene)
        let targetScale = 1;
        if (isMobile) {
            const maxHeight = this.scale.height * MOBILE_MAX_HEIGHT_RATIO;
            if (contentHeight > maxHeight) {
                targetScale = Math.min(targetScale, maxHeight / contentHeight);
            }
            // Extra safety: never exceed 90% of game width visually
            const visualWidth = contentWidth;
            const maxVisualWidth = this.scale.width * 0.9;
            if (visualWidth > maxVisualWidth) {
                targetScale = Math.min(targetScale, maxVisualWidth / visualWidth);
            }
            // Ensure overall width respects MOBILE_MAX_WIDTH_RATIO
            const postWidth = contentWidth * targetScale;
            const allowed = this.scale.width * MOBILE_MAX_WIDTH_RATIO;
            if (postWidth > allowed) {
                targetScale = Math.min(targetScale, allowed / contentWidth);
            }
            // Maintain a strong readability baseline on phones
            const MIN_MOBILE_SCALE = 1.3; // ~+30% bigger baseline
            targetScale = Math.max(targetScale, MIN_MOBILE_SCALE);
        }
        if (isTallMobile) {
            // Slight reduction on extremely tall devices to avoid clipping
            targetScale *= 0.98;
        }
        
        // Create quiz background - dark rectangle with 80% opacity (matching QuizScene)
        const quizBox = this.add.graphics();
        quizBox.fillStyle(0x000000, 0.8);
        quizBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 8);
        this.powerUpContainer.add(quizBox);
        
        // Calculate font sizes (matching QuizScene)
        let titleFontPx = isMobile ? 52 : 36;
        let questionFontPx = isMobile ? 32 : 24;
        if (isTallMobile) {
            titleFontPx = Math.round(titleFontPx * TALL_MOBILE_FONT_REDUCE);
            questionFontPx = Math.round(questionFontPx * TALL_MOBILE_FONT_REDUCE);
        }
        const titleFontSize = `${titleFontPx}px`;
        const questionFontSize = `${questionFontPx}px`;
        
        // Main header: ⭐POWER-UP STATION⭐
        this.titleText = this.add.text(0, -contentHeight/2 + (titleHeight/2) + 5, '⭐POWER-UP STATION⭐', {
            fontFamily: 'Arial',
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.powerUpContainer.add(this.titleText);
        
        // Sub header: CHOOSE A POWER-UP!
        this.descriptionText = this.add.text(0, -contentHeight/2 + titleHeight + (questionHeight/2), 'CHOOSE A POWER-UP!', {
            fontFamily: 'Arial',
            fontSize: questionFontSize,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.powerUpContainer.add(this.descriptionText);
        
        // Calculate start position for power-up cards (matching QuizScene button positioning)
        const buttonStartY = titleHeight + questionNumberHeight + questionHeight + questionPadding - contentHeight/2;
        
        // Create power-up cards with modern design
        this.createHorizontalPowerUpCards(buttonStartY, isMobile, isSmallMobile, contentWidth, contentHeight);
        
        // Add instruction text - dynamically centered between last power-up card and panel bottom (matching QuizScene)
        this.createTooltip(buttonStartY, contentHeight, isMobile, questionFontPx);
        
        // Add entrance animation with refined scaling (matching QuizScene)
        const INITIAL_SCALE_MULTIPLIER = 0.9;
        this.powerUpContainer.setScale(targetScale * INITIAL_SCALE_MULTIPLIER);
        this.powerUpContainer.setAlpha(0);
        this.tweens.add({
            targets: this.powerUpContainer,
            scaleX: targetScale,
            scaleY: targetScale,
            alpha: 1,
            duration: 450,
            ease: 'Back.easeOut'
        });
    }

    createHorizontalPowerUpCards(buttonStartY, isMobile, isSmallMobile, contentWidth, contentHeight) {
        this.powerUpButtons = [];
        
        // Calculate responsive button dimensions (matching QuizScene approach)
        let buttonHeight = isMobile ? 84 : 100;
        let buttonWidth = isMobile ? 140 : 160;
        let buttonSpacing = isMobile ? 20 : 30;
        
        if (isSmallMobile) {
            buttonHeight = 70;
            buttonWidth = 120;
            buttonSpacing = 15;
        }
        
        // Calculate horizontal positioning for 3 cards
        const totalWidth = (buttonWidth * 3) + (buttonSpacing * 2);
        const startX = -(totalWidth / 2) + (buttonWidth / 2);
        
        // Responsive font sizes (matching QuizScene)
        const iconFontSize = isMobile ? (isSmallMobile ? 28 : 32) : 36;
        const titleFontSize = isMobile ? (isSmallMobile ? 13 : 15) : 17;
        const levelFontSize = isMobile ? (isSmallMobile ? 11 : 13) : 15;
        
        this.powerUps.forEach((powerUp, index) => {
            const cardX = startX + (index * (buttonWidth + buttonSpacing));
            const cardY = buttonStartY + (buttonHeight / 2);
            
            // Create card background (matching QuizScene button style)
            const cardBg = this.add.rectangle(cardX, cardY, buttonWidth, buttonHeight, powerUp.color, 0.9);
            cardBg.setStrokeStyle(2, 0xffffff, 0.9);
            cardBg.setInteractive();
            
            // Create power-up icon in center of card
            const iconText = this.add.text(cardX, cardY - 15, powerUp.icon, {
                fontSize: `${iconFontSize}px`,
                fontFamily: 'Arial'
            });
            iconText.setOrigin(0.5);
            
            // Create power-up name below the icon
            const titleText = this.add.text(cardX, cardY + 10, powerUp.name, {
                fontSize: `${titleFontSize}px`,
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                align: 'center'
            });
            titleText.setOrigin(0.5);
            
            // Create level display below card
            const levelText = this.add.text(cardX, cardY + (buttonHeight / 2) + 20, `LVL. ${this.powerUpLevels[powerUp.id]}`, {
                fontSize: `${levelFontSize}px`,
                fill: '#ffffff',
                fontFamily: 'Arial',
                align: 'center'
            });
            levelText.setOrigin(0.5);
            
            // Card hover effects with tooltip updates
            cardBg.on('pointerover', () => {
                cardBg.setFillStyle(powerUp.color, 1.0);
                cardBg.setScale(1.1);
                iconText.setScale(1.1);
                
                // Update tooltip with power-up description
                this.updateTooltip(powerUp.description, '#ffffff');
            });
            
            cardBg.on('pointerout', () => {
                cardBg.setFillStyle(powerUp.color, 0.9);
                cardBg.setScale(1.0);
                iconText.setScale(1.0);
                
                // Revert tooltip to default text
                this.updateTooltip(this.defaultTooltipText, '#00ff00');
            });
            
            // Card click handler
            cardBg.on('pointerdown', () => {
                this.selectPowerUp(powerUp);
            });
            
            // Store card elements
            const cardElements = {
                background: cardBg,
                icon: iconText,
                title: titleText,
                level: levelText,
                powerUp: powerUp
            };
            
            this.powerUpButtons.push(cardElements);
            this.powerUpContainer.add([cardBg, iconText, titleText, levelText]);
        });
    }



    createTooltip(buttonStartY, contentHeight, isMobile, questionFontPx) {
        const instructionFontPx = isMobile
            ? Math.max(14, Math.round(questionFontPx * 0.75))
            : Math.max(16, Math.round(24 * 0.65));
        const instructionFontSize = `${instructionFontPx}px`;
        
        // Calculate button height for positioning
        let buttonHeight = isMobile ? 84 : 100;
        if (this.scale.width < 500) { // isSmallMobile
            buttonHeight = 70;
        }
        
        // Get the bottom of the level text (which is below the cards)
        const lastCardBottom = buttonStartY + buttonHeight + 35; // card height + level text space
        const panelBottom = contentHeight / 2; // since origin is centered
        const availableSpace = panelBottom - lastCardBottom; // space from last card bottom to panel bottom
        
        // Apply symmetric margins: place instruction halfway in that space (matching QuizScene)
        const instructionY = lastCardBottom + (availableSpace / 2);
        this.tooltipText = this.add.text(0, instructionY, this.defaultTooltipText, {
            fontFamily: 'Arial',
            fontSize: instructionFontSize,
            color: '#00ff00',
            align: 'center'
        }).setOrigin(0.5);
        this.powerUpContainer.add(this.tooltipText);
    }

    updateTooltip(text, color = '#ffffff') {
        if (this.tooltipText && !this.powerUpSelected) {
            this.tooltipText.setText(text);
            this.tooltipText.setStyle({ color: color });
        }
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
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        const isSmallMobile = scaleInfo.width < 480;
        
        // Hide all cards
        this.powerUpButtons.forEach(button => {
            button.background.setVisible(false);
            button.icon.setVisible(false);
            button.title.setVisible(false);
            button.level.setVisible(false);
        });
        
        // Responsive feedback text
        const feedbackFontSize = isMobile ? (isSmallMobile ? '26px' : '30px') : '30px';
        
        // Show selection feedback (positioned relative to container center)
        const feedbackText = this.add.text(0, 0, `${powerUp.icon} ${powerUp.name} Activated! ${powerUp.icon}`, {
            fontSize: feedbackFontSize,
            fill: '#00ff00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            wordWrap: { width: isMobile ? 600 : 800 } // Use fixed width instead of screen-relative
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
            case 'goblinWard':
                mainScene.activatePowerUp('goblinWard');
                break;
            case 'streakShield':
                mainScene.activatePowerUp('streakShield');
                break;
            case 'swiftSteps':
                mainScene.activatePowerUp('swiftSteps');
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
