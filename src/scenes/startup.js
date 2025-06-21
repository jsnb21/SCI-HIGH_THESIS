import Phaser from 'phaser';

const SCREEN_CONFIG = {
    BASE_WIDTH: 816,
    BASE_HEIGHT: 624,
    LOGO_MAX_WIDTH: 400
};

export default class StartupScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartupScene' });
        this.uiElements = [];
        this.logoElements = [];
    }

    preload() {
        this.load.image('logo', 'assets/img/buko_productions-logo.png');
    }

    create() {
        // Set up event listeners
        window.addEventListener('resize', () => this.handleResize());
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        
        // Start with fullscreen prompt
        this.showFullscreenPrompt();
    }

    showFullscreenPrompt() {
        // Clear any existing elements
        this.clearUI();
        
        const { width, height } = this.scale;

        // Create UI elements
        const background = this.add.rectangle(width / 2, height / 2, width, height, 0x181A1B).setOrigin(0.5);
        
        const dialog = this.add.rectangle(width / 2, height / 2, 400, 220, 0x23272f, 1)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x000000, 0.2);
            
        const promptText = this.add.text(width / 2, height / 2 - 40, 'Go fullscreen?', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const buttonStyle = {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#fff',
            backgroundColor: '#3B82F6',
            padding: { left: 24, right: 24, top: 10, bottom: 10 }
        };

        const yesButton = this.add.text(width / 2 - 70, height / 2 + 40, 'Yes', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
            
        const noButton = this.add.text(width / 2 + 70, height / 2 + 40, 'No', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Add event listeners
        yesButton.once('pointerdown', () => this.enterFullscreen());
        noButton.once('pointerdown', () => this.playLogoSequence());

        // Store elements for cleanup
        this.uiElements = [background, dialog, promptText, yesButton, noButton];
    }

    playLogoSequence() {
        // Clear existing UI
        this.clearUI();
        
        const { width, height } = this.scale;
        
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
                color: '#ffffff'
            }
        ).setOrigin(0.5).setAlpha(0);
        
        // Store for cleanup
        this.logoElements = [logo, presentsText];
        
        // Run animation sequence
        this.animateLogoSequence(logo, presentsText);
    }
    
    animateLogoSequence(logo, presentsText) {
        // Fade in logo
        this.tweens.add({
            targets: logo,
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
                                        // Fade out text
                                        this.tweens.add({
                                            targets: presentsText,
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
    
    enterFullscreen() {
        if (!this.scale.isFullscreen) {
            this.scale.startFullscreen();
            
            // Need a small delay to ensure fullscreen is applied
            this.time.delayedCall(100, () => {
                this.resizeToFullscreen();
                this.playLogoSequence();
            });
        } else {
            this.playLogoSequence();
        }
    }
    
    resizeToFullscreen() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        this.scale.resize(w, h);
        
        const canvas = this.game.canvas;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }
    
    handleFullscreenChange() {
        const canvas = this.game.canvas;
        
        if (!document.fullscreenElement && this.scene.isActive()) {
            // Exit fullscreen - revert to base size
            this.scale.resize(SCREEN_CONFIG.BASE_WIDTH, SCREEN_CONFIG.BASE_HEIGHT);
            canvas.style.width = `${SCREEN_CONFIG.BASE_WIDTH}px`;
            canvas.style.height = `${SCREEN_CONFIG.BASE_HEIGHT}px`;
        } else if (document.fullscreenElement && this.scene.isActive()) {
            this.resizeToFullscreen();
        }
        
        // Redraw UI if we're still showing the fullscreen prompt
        if (this.uiElements.length > 0) {
            this.showFullscreenPrompt();
        }
    }
    
    handleResize() {
        // Only redraw if we're showing the fullscreen prompt
        if (this.uiElements.length > 0) {
            this.showFullscreenPrompt();
        }
    }
    
    clearUI() {
        // Clear UI elements
        this.uiElements.forEach(el => el?.destroy());
        this.uiElements = [];
        
        // Clear logo elements
        this.logoElements.forEach(el => el?.destroy());
        this.logoElements = [];
    }
}
