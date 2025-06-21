import Phaser from 'phaser';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class StartupScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartupScene' });
        this._uiElements = [];
        this._logoElements = [];
    }

    preload() {
        this.load.image('logo', 'assets/img/buko_productions-logo.png');
    }

    create() {
        const drawUI = () => {
            this._uiElements.forEach(el => el?.destroy());
            this._uiElements = [];

            const { width, height } = this.scale;

            const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x181A1B).setOrigin(0.5);
            const dialog = this.add.rectangle(width / 2, height / 2, 400, 220, 0x23272f, 1)
                .setOrigin(0.5).setStrokeStyle(2, 0x000000, 0.2);

            const prompt = this.add.text(width / 2, height / 2 - 40, 'Go fullscreen?', {
                fontFamily: 'Arial',
                fontSize: '32px',
                color: '#fff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const btnStyle = {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#fff',
                backgroundColor: '#3B82F6',
                padding: { left: 24, right: 24, top: 10, bottom: 10 }
            };

            const yesBtn = this.add.text(width / 2 - 70, height / 2 + 40, 'Yes', btnStyle)
                .setOrigin(0.5).setInteractive({ useHandCursor: true });
            const noBtn = this.add.text(width / 2 + 70, height / 2 + 40, 'No', btnStyle)
                .setOrigin(0.5).setInteractive({ useHandCursor: true });

            yesBtn.once('pointerdown', () => this.handleFullscreen(drawUI, startLogoSequence));
            noBtn.once('pointerdown', () => startLogoSequence());

            this._uiElements.push(bg, dialog, prompt, yesBtn, noBtn);
        };

        const startLogoSequence = () => {
            this._uiElements.forEach(el => el?.destroy());
            this._uiElements = [];
            this._logoElements.forEach(el => el?.destroy());
            this._logoElements = [];

            // Get dimensions immediately
            const { width, height } = this.scale;

            const logoKey = 'logo';
            const maxLogoWidth = 400;
            const logoTexture = this.textures.get(logoKey);
            let logoScale = 1;

            if (logoTexture && logoTexture.getSourceImage()) {
                const imgWidth = logoTexture.getSourceImage().width;
                if (imgWidth > maxLogoWidth) {
                    logoScale = maxLogoWidth / imgWidth;
                }
            }

            // Create logo with correct position immediately
            const logo = this.add.image(width / 2, height / 2, logoKey)
                .setOrigin(0.5)
                .setScale(logoScale)
                .setAlpha(0);

            // Calculate text position based on logo size
            // Use frame height for more accurate sizing
            const logoHeight = logo.displayHeight || 
                              (logoTexture.getSourceImage()?.height * logoScale) || 
                              100;

            // Store logo position for accurate text placement later
            const logoPosition = {x: width / 2, y: height / 2};

            const presentsText = this.add.text(
                logoPosition.x,
                logoPosition.y + 20, // Position just below where logo was
                'Presents...', 
                {
                    fontFamily: 'Arial',
                    fontSize: '48px',
                    color: '#ffffff'
                }
            ).setOrigin(0.5).setAlpha(0);

            this._logoElements.push(logo, presentsText);

            // Animation sequence with improved timing and positioning
            this.tweens.add({
                targets: logo,
                alpha: 1,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    this.time.delayedCall(2000, () => {
                        this.tweens.add({
                            targets: logo,
                            alpha: 0,
                            duration: 1000,
                            ease: 'Power2',
                            onComplete: () => {
                                // Ensure text is at correct position before showing
                                presentsText.setPosition(logoPosition.x, logoPosition.y + 20);
                                
                                this.tweens.add({
                                    targets: presentsText,
                                    alpha: 1,
                                    duration: 800,
                                    ease: 'Power2',
                                    onComplete: () => {
                                        this.time.delayedCall(1200, () => {
                                            this.tweens.add({
                                                targets: presentsText,
                                                alpha: 0,
                                                duration: 600,
                                                onComplete: () => {
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
        };

        drawUI();

        const redrawIfPrompt = () => {
            if (this._uiElements.length > 0) drawUI();
        };

        window.addEventListener('resize', redrawIfPrompt);
        document.addEventListener('fullscreenchange', () => {
            const canvas = this.game.canvas;
            if (!document.fullscreenElement && this.scene.isActive()) {
                this.scale.resize(BASE_WIDTH, BASE_HEIGHT);
                canvas.style.width = `${BASE_WIDTH}px`;
                canvas.style.height = `${BASE_HEIGHT}px`;
            } else if (document.fullscreenElement && this.scene.isActive()) {
                this.scale.resize(window.innerWidth, window.innerHeight);
                canvas.style.width = '100%';
                canvas.style.height = '100%';
            }
            redrawIfPrompt();
        });
    }

    handleFullscreen(drawUI, startLogoSequence) {
        if (!this.scale.isFullscreen) {
            this.scale.startFullscreen();
            this.time.delayedCall(100, () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                this.scale.resize(w, h);
                const canvas = this.game.canvas;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                drawUI();
                startLogoSequence();
            });
        } else {
            startLogoSequence();
        }
    }
}
