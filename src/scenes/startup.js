import Phaser from 'phaser';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class StartupScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartupScene' });
    }

    preload() {
        this.load.image('logo', 'assets/img/buko_productions-logo.png');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor('#000000');

        // Add "Go Fullscreen" prompt
        const fullscreenPrompt = this.add.text(
            width / 2,
            height / 2 - 40,
            'Go fullscreen?',
            {
                fontFamily: 'Arial',
                fontSize: '32px',
                color: '#ffffff',
                backgroundColor: '#222222',
                padding: { left: 20, right: 20, top: 10, bottom: 10 }
            }
        ).setOrigin(0.5);

        // Yes button
        const yesBtn = this.add.text(
            width / 2 - 60,
            height / 2 + 30,
            'Yes',
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                color: '#ffff00',
                backgroundColor: '#333',
                padding: { left: 16, right: 16, top: 8, bottom: 8 }
            }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // No button
        const noBtn = this.add.text(
            width / 2 + 60,
            height / 2 + 30,
            'No',
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                color: '#ffffff',
                backgroundColor: '#333',
                padding: { left: 16, right: 16, top: 8, bottom: 8 }
            }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const startLogoSequence = () => {
            fullscreenPrompt.setVisible(false);
            yesBtn.setVisible(false);
            noBtn.setVisible(false);

            // --- Logo sequence starts here ---

            // Add logo image, initially invisible
            const logo = this.add.image(0, 0, 'logo').setAlpha(0);

            // Scale logo to fit within a max width (optional)
            const maxLogoWidth = 400;
            if (logo.width > maxLogoWidth) {
                logo.setScale(maxLogoWidth / logo.width);
            }

            // Center the logo after scaling
            logo.setPosition(this.scale.width / 2, this.scale.height / 2);

            // "Presents..." text, centered and hidden initially
            const presentsText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                'Presents...',
                {
                    fontFamily: 'Arial',
                    fontSize: '48px',
                    color: '#ffffff'
                }
            ).setOrigin(0.5).setAlpha(0);

            // Fade in logo
            this.tweens.add({
                targets: logo,
                alpha: 1,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    // Hold logo
                    this.time.delayedCall(2000, () => {
                        // Fade out logo
                        this.tweens.add({
                            targets: logo,
                            alpha: 0,
                            duration: 1000,
                            ease: 'Power2',
                            onComplete: () => {
                                // Fade in "Presents..."
                                this.tweens.add({
                                    targets: presentsText,
                                    alpha: 1,
                                    duration: 800,
                                    ease: 'Power2',
                                    onComplete: () => {
                                        // Hold then fade out and switch scene
                                        this.time.delayedCall(1200, () => {
                                            this.tweens.add({
                                                targets: presentsText,
                                                alpha: 0,
                                                duration: 600,
                                                onComplete: () => {
                                                    this.scene.start('MainMenu');
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

        yesBtn.on('pointerdown', () => {
            // Go fullscreen, then start logo sequence
            if (!this.scale.isFullscreen) {
                this.scale.startFullscreen();
                this.time.delayedCall(100, () => {
                    const w = window.innerWidth;
                    const h = window.innerHeight;
                    this.scale.resize(w, h);
                    const canvas = this.game.canvas;
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    startLogoSequence();
                });
            } else {
                startLogoSequence();
            }
        });

        noBtn.on('pointerdown', () => {
            // Stay windowed, start logo sequence
            startLogoSequence();
        });

        // Handle exiting fullscreen (resize back to base)
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.scene.isActive()) {
                this.scale.resize(BASE_WIDTH, BASE_HEIGHT);
                const canvas = this.game.canvas;
                canvas.style.width = `${BASE_WIDTH}px`;
                canvas.style.height = `${BASE_HEIGHT}px`;
            }
        });
    }
}
