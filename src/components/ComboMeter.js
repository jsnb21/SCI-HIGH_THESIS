export default class ComboMeter {
    constructor(scene) {
        this.scene = scene;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboContainer = null;
        this.comboText = null;
        this.comboBackground = null;
        this.comboBar = null;
        this.comboBarBg = null;
        this.multiplierText = null;
        this.glowEffect = null;
        this.isVisible = false;
    }

    create(x, y, scaleFactor = 1) {
        const sf = scaleFactor;
        
        // Create combo background with gradient
        this.comboBackground = this.scene.add.graphics().setDepth(125);
        this.comboBackground.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.9);
        this.comboBackground.fillRoundedRect(-60 * sf, -15 * sf, 120 * sf, 30 * sf, 15 * sf);
        this.comboBackground.lineStyle(2 * sf, 0xffd700, 0.8);
        this.comboBackground.strokeRoundedRect(-60 * sf, -15 * sf, 120 * sf, 30 * sf, 15 * sf);

        // Create combo bar background
        this.comboBarBg = this.scene.add.graphics().setDepth(126);
        this.comboBarBg.fillStyle(0x2d3748, 0.5);
        this.comboBarBg.fillRoundedRect(-50 * sf, 18 * sf, 100 * sf, 6 * sf, 3 * sf);

        // Create combo bar (progress bar)
        this.comboBar = this.scene.add.graphics().setDepth(127);

        // Create combo text
        this.comboText = this.scene.add.text(0, -3 * sf, 'COMBO x0', {
            fontSize: `${12 * sf}px`,
            color: '#ffffff',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }).setOrigin(0.5).setDepth(128);

        // Create multiplier text (shows when combo is high)
        this.multiplierText = this.scene.add.text(0, 35 * sf, '', {
            fontSize: `${10 * sf}px`,
            color: '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 1 * sf
        }).setOrigin(0.5).setDepth(128);

        // Create glow effect
        this.glowEffect = this.scene.add.circle(0, 0, 70 * sf, 0xffd700, 0).setDepth(124);

        // Create container
        this.comboContainer = this.scene.add.container(x, y, [
            this.glowEffect,
            this.comboBackground,
            this.comboBarBg,
            this.comboBar,
            this.comboText,
            this.multiplierText
        ]).setDepth(125);

        // Initially hidden
        this.comboContainer.setAlpha(0);
        this.isVisible = false;

        return {
            comboContainer: this.comboContainer,
            comboText: this.comboText,
            comboBackground: this.comboBackground,
            comboBar: this.comboBar,
            comboBarBg: this.comboBarBg,
            multiplierText: this.multiplierText,
            glowEffect: this.glowEffect
        };
    }    updateCombo(isCorrect, scaleFactor = 1) {
        const sf = scaleFactor;

        if (isCorrect) {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
              // Show combo meter if it reaches 2 or more
            if (this.combo >= 2 && !this.isVisible) {
                this.show();
            }

            // Play combo sound on every correct answer
            if (this.scene.se_comboSound) {
                // Calculate pitch based on milestones achieved
                const milestones = [3, 5, 7, 10, 15, 20];
                let pitch = 1.0; // Base pitch
                
                // Find the highest milestone achieved
                for (let i = milestones.length - 1; i >= 0; i--) {
                    if (this.combo >= milestones[i]) {
                        pitch = 1.0 + (i + 1) * 0.15; // Increase pitch by 0.15 for each milestone
                        break;
                    }
                }
                
                // Cap at 2.0x pitch
                pitch = Math.min(pitch, 2.0);
                this.scene.se_comboSound.play({ rate: pitch });
            }

            // Update combo text with color based on combo level
            let comboColor = '#ffffff';
            let glowColor = 0xffd700;
            let glowAlpha = 0.2;

            if (this.combo >= 10) {
                comboColor = '#ff4757'; // Red for extreme combo
                glowColor = 0xff4757;
                glowAlpha = 0.4;
            } else if (this.combo >= 7) {
                comboColor = '#ff6b7d'; // Pink for high combo
                glowColor = 0xff6b7d;
                glowAlpha = 0.3;
            } else if (this.combo >= 5) {
                comboColor = '#ffa726'; // Orange for good combo
                glowColor = 0xffa726;
                glowAlpha = 0.25;
            } else if (this.combo >= 3) {
                comboColor = '#ffd700'; // Gold for decent combo
                glowColor = 0xffd700;
                glowAlpha = 0.2;
            }

            this.comboText.setStyle({ color: comboColor });
            this.comboText.setText(`COMBO x${this.combo}`);

            // Update glow effect
            this.glowEffect.setFillStyle(glowColor, glowAlpha);

            // Update combo bar (progress towards next milestone)
            this.updateComboBar(sf);

            // Update multiplier text
            const multiplier = this.getScoreMultiplier();
            if (multiplier > 1) {
                this.multiplierText.setText(`${multiplier}x Score!`);
                this.multiplierText.setAlpha(1);
            } else {
                this.multiplierText.setAlpha(0);
            }

            // Animate combo increase
            this.animateComboIncrease(sf);

        } else {
            // Wrong answer - reset combo
            if (this.combo > 0) {
                this.combo = 0;
                this.hide();
            }
        }
    }

    updateComboBar(scaleFactor = 1) {
        const sf = scaleFactor;
        this.comboBar.clear();

        // Calculate progress towards next milestone
        const milestones = [3, 5, 7, 10, 15, 20];
        let nextMilestone = milestones.find(m => m > this.combo) || (this.combo + 5);
        let prevMilestone = 0;
        
        for (let i = milestones.length - 1; i >= 0; i--) {
            if (milestones[i] <= this.combo) {
                prevMilestone = milestones[i];
                break;
            }
        }

        const progress = (this.combo - prevMilestone) / (nextMilestone - prevMilestone);
        const barWidth = 100 * sf * progress;

        // Color based on combo level
        let barColor1 = 0x4CAF50; // Green
        let barColor2 = 0x8BC34A;

        if (this.combo >= 10) {
            barColor1 = 0xff4757;
            barColor2 = 0xff6b7d;
        } else if (this.combo >= 7) {
            barColor1 = 0xff6b7d;
            barColor2 = 0xffa726;
        } else if (this.combo >= 5) {
            barColor1 = 0xffa726;
            barColor2 = 0xffd700;
        } else if (this.combo >= 3) {
            barColor1 = 0xffd700;
            barColor2 = 0x4CAF50;
        }

        this.comboBar.fillGradientStyle(barColor1, barColor1, barColor2, barColor2, 1);
        this.comboBar.fillRoundedRect(-50 * sf, 18 * sf, barWidth, 6 * sf, 3 * sf);
    }

    animateComboIncrease(scaleFactor = 1) {
        const sf = scaleFactor;

        // Scale animation
        this.scene.tweens.add({
            targets: this.comboContainer,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 150,
            ease: 'Back.easeOut',
            yoyo: true,
            onComplete: () => {
                this.comboContainer.setScale(1);
            }
        });

        // Glow pulse animation
        if (this.combo >= 5) {
            this.scene.tweens.add({
                targets: this.glowEffect,
                alpha: 0.6,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 300,
                ease: 'Sine.easeOut',
                yoyo: true
            });
        }
    }

    show() {
        if (!this.isVisible && this.comboContainer) {
            this.isVisible = true;
            this.scene.tweens.add({
                targets: this.comboContainer,
                alpha: 1,
                y: this.comboContainer.y - 10,
                duration: 300,
                ease: 'Back.easeOut'
            });
        }
    }

    hide() {
        if (this.isVisible && this.comboContainer) {
            this.isVisible = false;
            this.scene.tweens.add({
                targets: this.comboContainer,
                alpha: 0,
                y: this.comboContainer.y + 10,
                duration: 200,
                ease: 'Power2.easeIn',
                onComplete: () => {
                    this.combo = 0;
                    if (this.comboText) {
                        this.comboText.setText('COMBO x0');
                        this.comboText.setStyle({ color: '#ffffff' });
                    }
                    if (this.multiplierText) {
                        this.multiplierText.setAlpha(0);
                    }
                    if (this.comboBar) {
                        this.comboBar.clear();
                    }
                    if (this.glowEffect) {
                        this.glowEffect.setAlpha(0);
                    }
                }
            });
        }
    }

    getScoreMultiplier() {
        if (this.combo >= 10) return 3;
        if (this.combo >= 7) return 2.5;
        if (this.combo >= 5) return 2;
        if (this.combo >= 3) return 1.5;
        return 1;
    }

    getCurrentCombo() {
        return this.combo;
    }

    getMaxCombo() {
        return this.maxCombo;
    }

    getTotalComboScore() {
        // Calculate total combo score based on max combo achieved
        // Higher combos give exponentially more points
        if (this.maxCombo >= 10) return this.maxCombo * 10;
        if (this.maxCombo >= 7) return this.maxCombo * 7;
        if (this.maxCombo >= 5) return this.maxCombo * 5;
        if (this.maxCombo >= 3) return this.maxCombo * 3;
        return this.maxCombo * 1;
    }

    reset() {
        this.combo = 0;
        this.maxCombo = 0;
        if (this.isVisible) {
            this.hide();
        }
    }

    destroy() {
        if (this.comboContainer) {
            this.comboContainer.destroy();
        }
        this.combo = 0;
        this.maxCombo = 0;
        this.isVisible = false;
    }
}
