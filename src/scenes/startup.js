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

        this.cameras.main.setBackgroundColor('#181A1B');

        // Dialog dimensions
        const dialogWidth = 380;
        const dialogHeight = 200;
        const dialogX = width / 2 - dialogWidth / 2;
        const dialogY = height / 2 - dialogHeight / 2;

        // Dialog background with rounded corners and drop shadow
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x23272f, 1);
        dialogBg.fillRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 24);
        dialogBg.setAlpha(0);
        dialogBg.setDepth(1);

        // Drop shadow (simple offset rectangle)
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.25);
        shadow.fillRoundedRect(dialogX + 8, dialogY + 8, dialogWidth, dialogHeight, 24);
        shadow.setAlpha(0);
        shadow.setDepth(0);

        // Prompt text
        const promptText = this.add.text(
            width / 2,
            height / 2 - 40,
            'Go fullscreen?',
            {
                fontFamily: "'Segoe UI', Arial, sans-serif",
                fontSize: '30px',
                color: '#fff',
                fontStyle: 'bold',
                align: 'center'
            }
        ).setOrigin(0.5).setAlpha(0).setDepth(2);

        // Button style
        const buttonStyle = {
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: '24px',
            color: '#fff',
            padding: { left: 32, right: 32, top: 12, bottom: 12 },
            align: 'center'
        };

        // Yes button
        const yesBtn = this.add.text(
            width / 2 - 70,
            height / 2 + 40,
            'Yes',
            buttonStyle
        ).setOrigin(0.5).setAlpha(0).setDepth(2).setInteractive({ useHandCursor: true });

        // No button
        const noBtn = this.add.text(
            width / 2 + 70,
            height / 2 + 40,
            'No',
            { ...buttonStyle }
        ).setOrigin(0.5).setAlpha(0).setDepth(2).setInteractive({ useHandCursor: true });

        // Rounded corners for buttons (using graphics behind text)
        const makeButtonBg = (x, y, color = 0x3B82F6) => {
            const g = this.add.graphics();
            g.fillStyle(color, 1);
            g.fillRoundedRect(x - 60, y - 24, 120, 48, 16);
            g.setAlpha(0).setDepth(1);
            return g;
        };
        const yesBtnBg = makeButtonBg(width / 2 - 70, height / 2 + 40, 0x3B82F6);
        const noBtnBg = makeButtonBg(width / 2 + 70, height / 2 + 40, 0x64748B);

        // Fade in dialog
        this.tweens.add({
            targets: [shadow, dialogBg, promptText, yesBtn, noBtn, yesBtnBg, noBtnBg],
            alpha: 1,
            duration: 400,
            ease: 'Power2'
        });

        // Button hover effects
        yesBtn.on('pointerover', () => {
            yesBtn.setStyle({ backgroundColor: '#2563EB' });
            yesBtnBg.clear().fillStyle(0x2563EB, 1).fillRoundedRect(width / 2 - 130, height / 2 + 16, 120, 48, 16);
        });
        yesBtn.on('pointerout', () => {
            yesBtn.setStyle({ backgroundColor: '#3B82F6' });
            yesBtnBg.clear().fillStyle(0x3B82F6, 1).fillRoundedRect(width / 2 - 130, height / 2 + 16, 120, 48, 16);
        });
        noBtn.on('pointerover', () => {
            noBtn.setStyle({ backgroundColor: '#334155' });
            noBtnBg.clear().fillStyle(0x334155, 1).fillRoundedRect(width / 2 + 10, height / 2 + 16, 120, 48, 16);
        });
        noBtn.on('pointerout', () => {
            noBtn.setStyle({ backgroundColor: '#64748B' });
            noBtnBg.clear().fillStyle(0x64748B, 1).fillRoundedRect(width / 2 + 10, height / 2 + 16, 120, 48, 16);
        });

        // Helper to hide dialog
        const hideDialog = () => {
            [shadow, dialogBg, promptText, yesBtn, noBtn, yesBtnBg, noBtnBg].forEach(obj => obj.setVisible(false));
        };

        const startLogoSequence = () => {
            hideDialog();

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
                                                    // Fade out "Presents..." and transition to MainMenu with a fade
                                                    this.tweens.add({
                                                        targets: presentsText,
                                                        alpha: 0,
                                                        duration: 600,
                                                        onComplete: () => {
                                                            // Fade out the whole scene before starting MainMenu
                                                            this.cameras.main.fadeOut(600, 24, 26, 27); // Optional: dark fade color
                                                            this.cameras.main.once('camerafadeoutcomplete', () => {
                                                                this.scene.start('MainMenu');
                                                            });
                                                        }
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

        yesBtn.on('pointerdown', () => {
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
            startLogoSequence();
        });

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
