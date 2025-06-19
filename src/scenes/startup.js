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

        // Dialog config
        const dialogConfig = {
            width: 380,
            height: 200,
            x: width / 2 - 190,
            y: height / 2 - 100,
            radius: 24
        };

        // Draw drop shadow and dialog background
        const shadow = this.add.graphics()
            .fillStyle(0x000000, 0.25)
            .fillRoundedRect(dialogConfig.x + 8, dialogConfig.y + 8, dialogConfig.width, dialogConfig.height, dialogConfig.radius)
            .setAlpha(0).setDepth(0);

        const dialogBg = this.add.graphics()
            .fillStyle(0x23272f, 1)
            .fillRoundedRect(dialogConfig.x, dialogConfig.y, dialogConfig.width, dialogConfig.height, dialogConfig.radius)
            .setAlpha(0).setDepth(1);

        // Prompt text
        const promptText = this.add.text(
            width / 2, height / 2 - 40, 'Go fullscreen?',
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

        // Helper for button backgrounds
        const makeButtonBg = (x, y, color) => {
            return this.add.graphics()
                .fillStyle(color, 1)
                .fillRoundedRect(x - 60, y - 24, 120, 48, 16)
                .setAlpha(0).setDepth(1);
        };

        // Yes/No buttons and backgrounds
        const yesBtnX = width / 2 - 70, noBtnX = width / 2 + 70, btnY = height / 2 + 40;
        const yesBtnBg = makeButtonBg(yesBtnX, btnY, 0x3B82F6);
        const noBtnBg = makeButtonBg(noBtnX, btnY, 0x64748B);

        const yesBtn = this.add.text(yesBtnX, btnY, 'Yes', buttonStyle)
            .setOrigin(0.5).setAlpha(0).setDepth(2).setInteractive({ useHandCursor: true });
        const noBtn = this.add.text(noBtnX, btnY, 'No', buttonStyle)
            .setOrigin(0.5).setAlpha(0).setDepth(2).setInteractive({ useHandCursor: true });

        // Fade in dialog
        this.tweens.add({
            targets: [shadow, dialogBg, promptText, yesBtn, noBtn, yesBtnBg, noBtnBg],
            alpha: 1,
            duration: 400,
            ease: 'Power2'
        });

        // Button hover effects
        const setBtnBg = (bg, x, y, color) => {
            bg.clear().fillStyle(color, 1).fillRoundedRect(x - 60, y - 24, 120, 48, 16);
        };
        yesBtn.on('pointerover', () => {
            yesBtn.setStyle({ backgroundColor: '#2563EB' });
            setBtnBg(yesBtnBg, yesBtnX, btnY, 0x2563EB);
        });
        yesBtn.on('pointerout', () => {
            yesBtn.setStyle({ backgroundColor: '#3B82F6' });
            setBtnBg(yesBtnBg, yesBtnX, btnY, 0x3B82F6);
        });
        noBtn.on('pointerover', () => {
            noBtn.setStyle({ backgroundColor: '#334155' });
            setBtnBg(noBtnBg, noBtnX, btnY, 0x334155);
        });
        noBtn.on('pointerout', () => {
            noBtn.setStyle({ backgroundColor: '#64748B' });
            setBtnBg(noBtnBg, noBtnX, btnY, 0x64748B);
        });

        // Hide dialog helper
        const hideDialog = () => {
            [shadow, dialogBg, promptText, yesBtn, noBtn, yesBtnBg, noBtnBg].forEach(obj => obj.setVisible(false));
        };

        // Logo sequence
        const startLogoSequence = () => {
            hideDialog();

            // Logo
            const logo = this.add.image(width / 2, height / 2, 'logo').setAlpha(0);
            const maxLogoWidth = 400;
            if (logo.width > maxLogoWidth) logo.setScale(maxLogoWidth / logo.width);

            // Presents text
            const presentsText = this.add.text(
                width / 2, height / 2, 'Presents...',
                { fontFamily: 'Arial', fontSize: '48px', color: '#ffffff' }
            ).setOrigin(0.5).setAlpha(0);

            // Fade in logo
            this.tweens.add({
                targets: logo,
                alpha: 1,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
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
                                        this.time.delayedCall(1200, () => {
                                            // Fade out "Presents..." and transition to MainMenu with a fade
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

        // Button click handlers
        const handleFullscreen = () => {
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
        };
        yesBtn.on('pointerdown', handleFullscreen);
        noBtn.on('pointerdown', startLogoSequence);

        // Fullscreen change handler
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
        });
    }
}
