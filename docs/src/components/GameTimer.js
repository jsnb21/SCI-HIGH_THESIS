// GameTimer.js - Separated timer functionality for quiz scenes

export default class GameTimer {
    constructor(scene) {
        this.scene = scene;
        this.timeLeft = 30;
        this.timerEvent = null;
        this.timerText = null;
        this.timerBackground = null;
        this.timerStarted = false;
        this.timerX = 0;
        this.timerY = 0;
        this.isPaused = false; // Add isPaused property
    }    // Create timer at specified position with duration
    create(x, y, duration = 30) {
        this.timeLeft = duration;
        this.timerX = x;
        this.timerY = y;
        this.maxTime = duration;

        // Create animated timer background with gradient and glow effect
        this.timerBackground = this.scene.add.graphics();
        this.drawTimerBackground(x, y);

        // Create progress bar background
        this.progressBarBg = this.scene.add.graphics();
        this.progressBarBg.fillStyle(0x2c3e50, 0.8);
        this.progressBarBg.fillRoundedRect(x - 55, y + 15, 110, 8, 4);

        // Create progress bar
        this.progressBar = this.scene.add.graphics();
        this.updateProgressBar();

        // Create main timer text with better styling
        this.timerText = this.scene.add.text(x, y - 5, `${this.timeLeft}`, {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true
            }
        }).setOrigin(0.5);

        // Create seconds label
        this.secondsLabel = this.scene.add.text(x, y + 8, 'SEC', {
            fontSize: '10px',
            fill: '#cccccc',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Add pulsing animation to timer when low
        this.pulseTimer = null;

        // Start the timer event only if it doesn't exist
        if (!this.timerEvent) {
            this.timerEvent = this.scene.time.addEvent({
                delay: 1000,
                callback: this.updateTimer,
                callbackScope: this,
                loop: true,
            });
        }

        // Add entrance animation
        this.timerText.setScale(0);
        this.scene.tweens.add({
            targets: this.timerText,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        this.timerStarted = true;
        return { 
            timerBackground: this.timerBackground, 
            timerText: this.timerText,
            progressBar: this.progressBar,
            progressBarBg: this.progressBarBg,
            secondsLabel: this.secondsLabel
        };
    }

    // Draw enhanced timer background with gradient and effects
    drawTimerBackground(x, y) {
        this.timerBackground.clear();
        
        // Main background with gradient effect
        this.timerBackground.fillGradientStyle(0x34495e, 0x34495e, 0x2c3e50, 0x2c3e50, 1);
        this.timerBackground.fillRoundedRect(x - 65, y - 25, 130, 50, 12);
        
        // Inner glow effect
        this.timerBackground.lineStyle(2, 0x3498db, 0.6);
        this.timerBackground.strokeRoundedRect(x - 63, y - 23, 126, 46, 10);
        
        // Subtle highlight
        this.timerBackground.fillStyle(0xffffff, 0.1);
        this.timerBackground.fillRoundedRect(x - 62, y - 22, 124, 20, 8);
    }

    // Update progress bar based on time remaining
    updateProgressBar() {
        if (!this.progressBar) return;
        
        this.progressBar.clear();
        const percentage = this.timeLeft / this.maxTime;
        const barWidth = 106 * percentage;
        
        // Color based on time remaining
        let color = 0x27ae60; // Green
        if (percentage < 0.3) {
            color = 0xe74c3c; // Red
        } else if (percentage < 0.5) {
            color = 0xf39c12; // Orange
        }
        
        this.progressBar.fillStyle(color, 0.9);
        this.progressBar.fillRoundedRect(this.timerX - 53, this.timerY + 17, barWidth, 4, 2);
        
        // Add shine effect on progress bar
        this.progressBar.fillStyle(0xffffff, 0.3);
        this.progressBar.fillRoundedRect(this.timerX - 53, this.timerY + 17, barWidth, 1, 1);
    }    // Update timer position
    updatePosition(x, y) {
        console.log('=== UPDATE TIMER POSITION ===');
        console.log('New position:', x, y);
        
        // Store new position
        this.timerX = x;
        this.timerY = y;
        
        // Update timer background
        if (this.timerBackground && this.timerBackground.active) {
            this.drawTimerBackground(x, y);
        }
        
        // Update progress bar background
        if (this.progressBarBg && this.progressBarBg.active) {
            this.progressBarBg.clear();
            this.progressBarBg.fillStyle(0x2c3e50, 0.8);
            this.progressBarBg.fillRoundedRect(x - 55, y + 15, 110, 8, 4);
        }
        
        // Update progress bar
        this.updateProgressBar();
        
        // Update timer text
        if (this.timerText && this.timerText.active) {
            this.timerText.setPosition(x, y - 5);
            this.timerText.setText(`${this.timeLeft}`);
        }
        
        // Update seconds label
        if (this.secondsLabel && this.secondsLabel.active) {
            this.secondsLabel.setPosition(x, y + 8);
        }
        
        console.log('=== END UPDATE TIMER POSITION ===');
    }    // Recreate timer elements if they were destroyed
    recreateElements(x, y) {
        console.log('=== RECREATING TIMER ELEMENTS ===');
        
        // Clean up any destroyed references
        this.timerBackground = null;
        this.timerText = null;
        this.progressBar = null;
        this.progressBarBg = null;
        this.secondsLabel = null;
        
        // Recreate all timer elements
        this.timerBackground = this.scene.add.graphics();
        this.drawTimerBackground(x, y);
        this.timerBackground.setDepth(130);

        this.progressBarBg = this.scene.add.graphics();
        this.progressBarBg.fillStyle(0x2c3e50, 0.8);
        this.progressBarBg.fillRoundedRect(x - 55, y + 15, 110, 8, 4);
        this.progressBarBg.setDepth(130);

        this.progressBar = this.scene.add.graphics();
        this.updateProgressBar();
        this.progressBar.setDepth(130);

        this.timerText = this.scene.add.text(x, y - 5, `${this.timeLeft}`, {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true
            }
        }).setOrigin(0.5);
        this.timerText.setDepth(130);

        this.secondsLabel = this.scene.add.text(x, y + 8, 'SEC', {
            fontSize: '10px',
            fill: '#cccccc',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.secondsLabel.setDepth(130);

        // Apply current timer state
        this.updateTimerColor();

        console.log('Timer elements recreated');
        console.log('=== END RECREATION ===');
    }    // Update timer display and handle countdown
    updateTimer() {
        if (this.isPaused) return; // Skip update if paused

        this.timeLeft--;
        
        // Update progress bar
        this.updateProgressBar();
        
        // Check for tutorial triggers when timer is running low
        if (this.scene && this.scene.checkAndShowTutorial && this.timeLeft <= 25 && this.timeLeft > 0) {
            this.scene.checkAndShowTutorial();
        }
        
        // Stop timer immediately when it hits 0 to prevent negative numbers
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.stop();
            
            // Update display one last time to show 0
            if (this.timerText && this.timerText.active) {
                this.timerText.setText(`${this.timeLeft}`);
                this.timerText.setFill('#ff0000');
            }
            
            // Stop pulsing animation if active
            if (this.pulseTimer) {
                this.pulseTimer.remove();
                this.pulseTimer = null;
            }
            
            this.handleTimeUp();
            return;
        }
        
        if (this.timerText && this.timerText.active) {
            this.timerText.setText(`${this.timeLeft}`);
            this.updateTimerColor();
            this.updateTimerEffects();
        } else {
            console.warn('Timer text is not active during update!');
        }
    }

    // Update timer visual effects based on remaining time
    updateTimerEffects() {
        if (!this.timerText || !this.timerText.active) return;
        
        // Start urgent pulsing when time is very low
        if (this.timeLeft <= 5 && !this.pulseTimer) {
            this.startUrgentPulse();
        } else if (this.timeLeft <= 10 && this.timeLeft > 5) {
            this.startWarningEffect();
        }
        
        // Shake effect when time is critically low
        if (this.timeLeft <= 3) {
            this.scene.tweens.add({
                targets: [this.timerText, this.timerBackground, this.progressBar, this.progressBarBg, this.secondsLabel],
                x: this.timerX + Phaser.Math.Between(-2, 2),
                duration: 50,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    if (this.timerText && this.timerText.active) {
                        this.timerText.setPosition(this.timerX, this.timerY - 5);
                    }
                    if (this.secondsLabel && this.secondsLabel.active) {
                        this.secondsLabel.setPosition(this.timerX, this.timerY + 8);
                    }
                }
            });
        }
    }

    // Start urgent pulsing animation
    startUrgentPulse() {
        if (this.pulseTimer) return; // Already pulsing
        
        this.pulseTimer = this.scene.tweens.add({
            targets: this.timerText,
            scale: 1.3,
            duration: 300,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    // Warning effect for medium-low time
    startWarningEffect() {
        if (!this.timerBackground) return;
        
        // Flash the border orange
        this.scene.tweens.add({
            targets: this.timerBackground,
            alpha: 0.7,
            duration: 200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 1
        });
    }    // Update timer text color based on remaining time
    updateTimerColor() {
        if (!this.timerText || !this.timerText.active) return;
        
        if (this.timeLeft <= 5) {
            this.timerText.setFill('#ff0000'); // Bright red when critically low
            this.timerText.setStroke('#ffffff', 3); // White outline for contrast
        } else if (this.timeLeft <= 10) {
            this.timerText.setFill('#ff6b35'); // Orange-red when low
            this.timerText.setStroke('#000000', 3);
        } else if (this.timeLeft <= 20) {
            this.timerText.setFill('#f7b731'); // Yellow when getting low
            this.timerText.setStroke('#000000', 3);
        } else {
            this.timerText.setFill('#ffffff'); // White for normal time
            this.timerText.setStroke('#000000', 3);
        }
    }

    // Handle when time runs out
    handleTimeUp() {
        console.log('=== TIME UP ===');
        
        // Show time up message briefly
        const timeUpText = this.scene.add.text(612, 100, "TIME'S UP!", {
            fontSize: '32px',
            fill: '#ff0000',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Make it flash for attention
        this.scene.tweens.add({
            targets: timeUpText,
            alpha: 0.3,
            duration: 200,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                timeUpText.destroy();
                // Call scene's handleTimeUp method if it exists
                if (this.scene.handleTimeUp) {
                    this.scene.handleTimeUp();
                }
            }
        });
        
        console.log('=== END TIME UP ===');
    }    // Add time (for correct answers)
    addTime(seconds, maxTime = 30) {
        this.timeLeft = Math.min(this.timeLeft + seconds, maxTime);
        
        // Show positive feedback animation
        if (this.timerText && this.timerText.active) {
            const bonusText = this.scene.add.text(this.timerX + 40, this.timerY - 5, `+${seconds}`, {
                fontSize: '16px',
                fill: '#00ff00',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            // Animate bonus text
            this.scene.tweens.add({
                targets: bonusText,
                y: this.timerY - 25,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => bonusText.destroy()
            });
            
            // Brief green flash on timer
            this.timerText.setTint(0x00ff00);
            this.scene.time.delayedCall(200, () => {
                if (this.timerText && this.timerText.active) {
                    this.timerText.clearTint();
                }
            });
            
            this.timerText.setText(`${this.timeLeft}`);
            this.updateTimerColor();
            this.updateProgressBar();
        }
    }

    // Subtract time (for wrong answers)
    subtractTime(seconds) {
        this.timeLeft = Math.max(this.timeLeft - seconds, 0);
        
        // Show negative feedback animation
        if (this.timerText && this.timerText.active) {
            const penaltyText = this.scene.add.text(this.timerX + 40, this.timerY - 5, `-${seconds}`, {
                fontSize: '16px',
                fill: '#ff0000',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            // Animate penalty text
            this.scene.tweens.add({
                targets: penaltyText,
                y: this.timerY - 25,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => penaltyText.destroy()
            });
            
            // Brief red flash on timer
            this.timerText.setTint(0xff0000);
            this.scene.time.delayedCall(200, () => {
                if (this.timerText && this.timerText.active) {
                    this.timerText.clearTint();
                }
            });
            
            this.timerText.setText(`${this.timeLeft}`);
            this.updateTimerColor();
            this.updateProgressBar();
        }
        
        // Check if time ran out
        if (this.timeLeft <= 0) {
            this.stop();
            this.handleTimeUp();
        }
    }    // Stop the timer
    stop() {
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
        
        // Stop any pulsing animations
        if (this.pulseTimer) {
            this.pulseTimer.remove();
            this.pulseTimer = null;
        }
    }

    // Destroy timer elements
    destroy() {
        this.stop();
        
        if (this.timerBackground && this.timerBackground.active) {
            this.timerBackground.destroy();
        }
        if (this.timerText && this.timerText.active) {
            this.timerText.destroy();
        }
        if (this.progressBar && this.progressBar.active) {
            this.progressBar.destroy();
        }
        if (this.progressBarBg && this.progressBarBg.active) {
            this.progressBarBg.destroy();
        }
        if (this.secondsLabel && this.secondsLabel.active) {
            this.secondsLabel.destroy();
        }
        
        this.timerBackground = null;
        this.timerText = null;
        this.progressBar = null;
        this.progressBarBg = null;
        this.secondsLabel = null;
        this.timerStarted = false;
    }

    // Reset timer
    reset(duration = 30) {
        this.stop();
        this.timeLeft = duration;
        this.maxTime = duration;
        this.timerStarted = false;
        
        // Reset visual elements if they exist
        if (this.timerText && this.timerText.active) {
            this.timerText.setText(`${this.timeLeft}`);
            this.timerText.setScale(1);
            this.timerText.clearTint();
        }
        this.updateTimerColor();
        this.updateProgressBar();
    }

    // Get current time left
    getTimeLeft() {
        return this.timeLeft;
    }

    /**
     * Check if timer is currently running
     */
    get isRunning() {
        return this.timerStarted && !this.isPaused && this.timeLeft > 0;
    }
    
    /**
     * Get remaining time
     */
    getTimeRemaining() {
        return this.timeLeft;
    }

    // Check if timer is running
    isRunning() {
        return this.timerEvent !== null;
    }    // Check if timer elements exist and are active
    isActive() {
        return this.timerText && this.timerText.active && 
               this.timerBackground && this.timerBackground.active &&
               this.progressBar && this.progressBar.active;
    }

    // Add pause and resume methods to GameTimer if not present
    pause() {
        this.isPaused = true;
    }
    resume() {
        this.isPaused = false;
    }
}