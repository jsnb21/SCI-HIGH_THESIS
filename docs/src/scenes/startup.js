import Phaser from 'phaser';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getResponsivePosition,
    createResponsiveTextStyle,
    getSafeArea
} from '../utils/mobileUtils.js';
import { FullscreenUtils } from '../utils/fullscreenUtils.js';

const SCREEN_CONFIG = {
    BASE_WIDTH: window.innerWidth,   // Using dynamic window width instead of fixed 816
    BASE_HEIGHT: window.innerHeight, // Using dynamic window height instead of fixed 624
    LOGO_MAX_WIDTH: 600              // Keeping the increased logo size
};

export default class StartupScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartupScene' });
        this.uiElements = [];
        this.logoElements = [];
    }

    preload() {
        this.load.image('logo', 'assets/img/buko_productions-logo.png');
    }    create() {
        // Set up event listeners using fullscreen utility
        this.fullscreenManager = FullscreenUtils.setupScene(this);
        
        // Set up keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        
        // Start with fullscreen prompt
        this.showFullscreenPrompt();
    }

    showFullscreenPrompt() {
        // Clear any existing elements
        this.clearUI();
        
        const scaleInfo = getScaleInfo(this);
        const { width, height } = scaleInfo;
        const safeArea = getSafeArea(scaleInfo);

        // Create animated background with gradient effect
        const background = this.add.rectangle(width / 2, height / 2, width, height, 0x0f0f0f)
            .setOrigin(0.5)
            .setAlpha(0);
            
        // Create dialog with mobile-responsive design
        const baseDialogWidth = scaleInfo.isMobile ? 320 : 550;
        const baseDialogHeight = scaleInfo.isMobile ? 200 : 300;
        const dialogWidth = Math.min(baseDialogWidth, safeArea.width * 0.85);
        const dialogHeight = baseDialogHeight;
        
        const dialog = this.add.rectangle(width / 2, height / 2, dialogWidth, dialogHeight, 0x1a1a1a, 1)
            .setOrigin(0.5)
            .setStrokeStyle(scaleInfo.isMobile ? 1 : 2, 0x4a4a4a, 0.8)
            .setAlpha(0);

        // Add glow effect to dialog
        const glowOffset = scaleInfo.isMobile ? 4 : 8;
        const dialogGlow = this.add.rectangle(width / 2, height / 2, dialogWidth + glowOffset, dialogHeight + glowOffset, 0x2a2a2a, 0.3)
            .setOrigin(0.5)
            .setAlpha(0);

        // Main title with responsive text
        const titleStyle = {
            fontFamily: 'Arial Black, Arial',
            fontSize: scaleInfo.isMobile ? '20px' : '32px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            stroke: 'transparent',
            strokeThickness: 0
        };
        const titleOffset = scaleInfo.isMobile ? 30 : 50;
        const titleText = this.add.text(width / 2, height / 2 - titleOffset, 'Go Fullscreen?', titleStyle).setOrigin(0.5).setAlpha(0);
        
        // Subtitle with helpful note
        const subtitleStyle = {
            fontFamily: 'Arial',
            fontSize: scaleInfo.isMobile ? '11px' : '16px',
            color: '#cccccc',
            align: 'center',
            stroke: 'transparent',
            strokeThickness: 0
        };
        const subtitleOffset = scaleInfo.isMobile ? 5 : 10;
        const subtitleText = this.add.text(width / 2, height / 2 - subtitleOffset, 'This can be toggled in the options later.', subtitleStyle).setOrigin(0.5).setAlpha(0);

        // Remove benefits text - no longer needed
        const benefitsText = null;        // Enhanced button styles
        const createStyledButton = (x, y, text, isPrimary = false) => {
            const buttonColor = isPrimary ? 0x3B82F6 : 0x374151;
            const textColor = isPrimary ? '#ffffff' : '#e5e7eb';
            const buttonWidth = scaleInfo.isMobile ? 90 : 120;
            const buttonHeight = scaleInfo.isMobile ? 40 : 50;
            
            // Button background
            const buttonBg = this.add.rectangle(x, y, buttonWidth, buttonHeight, buttonColor, 1)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, isPrimary ? 0x60A5FA : 0x555555, 0.8)
                .setAlpha(0);
            
            // Button text
            const buttonText = this.add.text(x, y, text, {
                fontFamily: 'Arial',
                fontSize: scaleInfo.isMobile ? '14px' : '18px',
                color: textColor,
                fontStyle: 'bold'
            }).setOrigin(0.5).setAlpha(0);

            // Hover effects
            buttonBg.on('pointerover', () => {
                this.tweens.add({
                    targets: buttonBg,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    ease: 'Power2'
                });
                buttonBg.setFillStyle(isPrimary ? 0x2563EB : 0x4B5563);
            });

            buttonBg.on('pointerout', () => {
                this.tweens.add({
                    targets: buttonBg,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Power2'
                });
                buttonBg.setFillStyle(buttonColor);
            });

            return { bg: buttonBg, text: buttonText };
        };

        // Create buttons with mobile-responsive spacing
        const buttonSpacing = scaleInfo.isMobile ? 100 : 140;
        const buttonY = height / 2 + scaleDimension(scaleInfo.isMobile ? 40 : 60, scaleInfo);
        const yesButton = createStyledButton(width / 2 - buttonSpacing / 2, buttonY, 'YES', true);
        const noButton = createStyledButton(width / 2 + buttonSpacing / 2, buttonY, 'SKIP', false);

        // Add click animations and functionality
        const addButtonClick = (button, callback) => {
            button.bg.on('pointerdown', () => {
                // Click animation
                this.tweens.add({
                    targets: [button.bg, button.text],
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 100,
                    yoyo: true,
                    onComplete: callback
                });
            });
        };

        addButtonClick(yesButton, () => {
            this.fullscreenManager.enterFullscreen(() => {
                this.time.delayedCall(200, () => this.playLogoSequence());
            });
        });

        addButtonClick(noButton, () => {
            this.playLogoSequence();
        });        // Store all elements for cleanup
        this.uiElements = [
            background, dialogGlow, dialog, titleText, subtitleText,
            yesButton.bg, yesButton.text, noButton.bg, noButton.text
        ];

        // Add keyboard controls
        this.setupKeyboardControls(yesButton, noButton);

        // Add subtle floating particles
        this.createFloatingParticles();        // Animate entrance
        this.animatePromptEntrance(background, dialogGlow, dialog, titleText, subtitleText, yesButton, noButton);
    }

    setupKeyboardControls(yesButton, noButton) {
        // Add keyboard hint text with mobile-responsive positioning and sizing
        const { width, height } = this.scale;
        const scaleInfo = getScaleInfo(this);
        const keyboardHint = this.add.text(width / 2, height / 2 + scaleDimension(scaleInfo.isMobile ? 90 : 120, scaleInfo), 'Press ENTER for fullscreen, ESC to skip', {
            fontFamily: 'Arial',
            fontSize: scaleInfo.isMobile ? '10px' : '12px',
            color: '#666666',
            align: 'center'
        }).setOrigin(0.5).setAlpha(0);

        this.uiElements.push(keyboardHint);

        // Show hint after other animations
        this.time.delayedCall(1500, () => {
            this.tweens.add({
                targets: keyboardHint,
                alpha: 0.8,
                duration: 400,
                ease: 'Power2'
            });
        });

        // Keyboard event listeners
        this.enterKey.on('down', () => {
            yesButton.bg.emit('pointerdown');
        });

        this.escapeKey.on('down', () => {
            noButton.bg.emit('pointerdown');
        });
    }

    createFloatingParticles() {
        const { width, height } = this.scale;
        const particles = [];

        for (let i = 0; i < 15; i++) {            const particle = this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.Between(1, 3),
                0x666666,
                0.1
            );

            particles.push(particle);
            this.uiElements.push(particle);

            // Floating animation
            this.tweens.add({
                targets: particle,
                y: particle.y - Phaser.Math.Between(50, 150),
                alpha: 0.3,
                duration: Phaser.Math.Between(3000, 6000),
                ease: 'Power1',
                repeat: -1,
                yoyo: true,
                delay: Phaser.Math.Between(0, 2000)
            });

            this.tweens.add({
                targets: particle,
                x: particle.x + Phaser.Math.Between(-30, 30),
                duration: Phaser.Math.Between(4000, 8000),
                ease: 'Sine.easeInOut',
                repeat: -1,
                yoyo: true,
                delay: Phaser.Math.Between(0, 1000)
            });
        }
    }    animatePromptEntrance(background, dialogGlow, dialog, titleText, subtitleText, yesButton, noButton) {
        // Sequence of animations for smooth entrance
        this.tweens.add({
            targets: background,
            alpha: 0.9,
            duration: 400,
            ease: 'Power2'
        });

        this.time.delayedCall(200, () => {
            // Dialog appears with scale and glow
            this.tweens.add({
                targets: [dialogGlow, dialog],
                alpha: 1,
                duration: 600,
                ease: 'Back.easeOut'
            });

            // Text appears sequentially
            this.time.delayedCall(300, () => {
                this.tweens.add({
                    targets: titleText,
                    alpha: 1,
                    y: titleText.y - 10,
                    duration: 400,
                    ease: 'Power2'
                });

                this.time.delayedCall(150, () => {
                    this.tweens.add({
                        targets: subtitleText,
                        alpha: 1,
                        duration: 400,
                        ease: 'Power2'
                    });

                    this.time.delayedCall(200, () => {
                        // Buttons appear with bounce
                        this.tweens.add({
                            targets: [yesButton.bg, yesButton.text, noButton.bg, noButton.text],
                            alpha: 1,
                            y: `-=20`,
                            duration: 500,
                            ease: 'Back.easeOut'
                        });
                    });
                });
            });
        });
    }

    playLogoSequence() {
        // Clear existing UI
        this.clearUI();
        
        const { width, height } = this.scale;
        
        // Add white background that will fade in with the logo
        const whiteBackground = this.add.rectangle(width / 2, height / 2, width, height, 0xFFFFFF)
            .setOrigin(0.5)
            .setAlpha(0);
    
        // Calculate logo scaling
        const logoTexture = this.textures.get('logo');
        let logoScale = 1;
        
        if (logoTexture && logoTexture.getSourceImage()) {
            const imgWidth = logoTexture.getSourceImage().width;
            if (imgWidth > SCREEN_CONFIG.LOGO_MAX_WIDTH) {
                logoScale = SCREEN_CONFIG.LOGO_MAX_WIDTH / imgWidth;
            }
        }
        
        // Create logo
        const logo = this.add.image(width / 2, height / 2, 'logo')
            .setOrigin(0.5)
            .setScale(logoScale)
            .setAlpha(0);
        
        // Create "Presents..." text
        const presentsText = this.add.text(
            width / 2,
            height / 2, 
            'Presents...', 
            {
                fontFamily: 'Arial',
                fontSize: '48px',
                color: '#000000' // Changed to black for better visibility on white
            }
        ).setOrigin(0.5).setAlpha(0);
    
        // Store for cleanup - include the white background
        this.logoElements = [whiteBackground, logo, presentsText];
        
        // Run animation sequence
        this.animateLogoSequence(whiteBackground, logo, presentsText);
    }
    
    animateLogoSequence(whiteBackground, logo, presentsText) {
        // Fade in white background and logo together
        this.tweens.add({
            targets: [whiteBackground, logo],
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // Hold logo on screen
                this.time.delayedCall(2000, () => {
                    // Fade out logo
                    this.tweens.add({
                        targets: logo,
                        alpha: 0,
                        duration: 1000,
                        ease: 'Power2',
                        onComplete: () => {
                            // Fade in "Presents..." text
                            this.tweens.add({
                                targets: presentsText,
                                alpha: 1,
                                duration: 800,
                                ease: 'Power2',
                                onComplete: () => {
                                    // Hold text on screen
                                    this.time.delayedCall(1200, () => {
                                        // Fade out text and background
                                        this.tweens.add({
                                            targets: [presentsText, whiteBackground],
                                            alpha: 0,
                                            duration: 600,
                                            onComplete: () => {
                                                // Transition to main menu
                                                this.cameras.main.fadeOut(600, 24, 26, 27);
                                                this.cameras.main.once('camerafadeoutcomplete', () => {
                                                    this.scene.start('MainMenu');
                                                });
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });
                });
            }
        });
    }
      clearUI() {
        // Clear UI elements
        this.uiElements.forEach(el => el?.destroy());
        this.uiElements = [];
        
        // Clear logo elements
        this.logoElements.forEach(el => el?.destroy());
        this.logoElements = [];
    }

    createUI() {
        // Custom UI redraw method for fullscreen utility
        // Only redraw if we're showing the fullscreen prompt
        if (this.uiElements.length > 0) {
            this.showFullscreenPrompt();
        }
        // Don't redraw during logo sequence to avoid interrupting animations
    }

    shouldRedrawUIOnFullscreenChange() {
        // Only redraw UI if we're showing the fullscreen prompt
        // Don't redraw during logo animations to avoid interrupting them
        return this.uiElements.length > 0;
    }    shutdown() {
        // Clean up keyboard listeners
        if (this.enterKey) {
            this.enterKey.removeAllListeners();
        }
        if (this.escapeKey) {
            this.escapeKey.removeAllListeners();
        }
        
        // Cleanup using fullscreen utility
        FullscreenUtils.cleanupScene(this);
    }
}
