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
    }

    // Create timer at specified position with duration
    create(x, y, duration = 30) {
        this.timeLeft = duration;
        this.timerX = x;
        this.timerY = y;

        // Create timer with background for better visibility
        this.timerBackground = this.scene.add.graphics();
        this.timerBackground.fillStyle(0x000000, 0.7);
        this.timerBackground.fillRoundedRect(x - 60, y - 20, 120, 40, 10);

        this.timerText = this.scene.add.text(x, y, `Time: ${this.timeLeft}`, {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Start the timer event only if it doesn't exist
        if (!this.timerEvent) {
            this.timerEvent = this.scene.time.addEvent({
                delay: 1000,
                callback: this.updateTimer,
                callbackScope: this,
                loop: true,
            });
        }

        this.timerStarted = true;
        return { timerBackground: this.timerBackground, timerText: this.timerText };
    }

    // Update timer position
    updatePosition(x, y) {
        console.log('=== UPDATE TIMER POSITION ===');
        console.log('New position:', x, y);
        console.log('Timer background exists:', !!this.timerBackground);
        console.log('Timer background active:', this.timerBackground?.active);
        console.log('Timer text exists:', !!this.timerText);
        console.log('Timer text active:', this.timerText?.active);
        
        // Store new position
        this.timerX = x;
        this.timerY = y;
        
        // Check if timer elements still exist and are active before updating
        if (this.timerBackground && this.timerBackground.active) {
            console.log('Clearing and redrawing timer background...');
            this.timerBackground.clear();
            this.timerBackground.fillStyle(0x000000, 0.7);
            this.timerBackground.fillRoundedRect(x - 60, y - 20, 120, 40, 10);
            console.log('Timer background redrawn');
        } else if (this.timerStarted) {
            console.log('Timer background missing/inactive, recreating...');
            this.recreateElements(x, y);
            return;
        }
        
        if (this.timerText && this.timerText.active) {
            console.log('Updating timer text position and content...');
            this.timerText.setPosition(x, y);
            this.timerText.setText(`Time: ${this.timeLeft}`);
            console.log('Timer text updated');
        } else {
            console.log('Timer text missing/inactive!');
            if (this.timerStarted) {
                this.recreateElements(x, y);
            }
        }
        
        console.log('=== END UPDATE TIMER POSITION ===');
    }

    // Recreate timer elements if they were destroyed
    recreateElements(x, y) {
        console.log('=== RECREATING TIMER ELEMENTS ===');
        console.log('Previous timer text active:', this.timerText?.active);
        console.log('Previous timer background active:', this.timerBackground?.active);
        
        // Clean up any destroyed references
        this.timerBackground = null;
        this.timerText = null;
        
        console.log('Creating new timer background...');
        // Recreate timer elements
        this.timerBackground = this.scene.add.graphics();
        this.timerBackground.fillStyle(0x000000, 0.7);
        this.timerBackground.fillRoundedRect(x - 60, y - 20, 120, 40, 10);
        this.timerBackground.setDepth(100); // Set high depth to stay on top

        console.log('Creating new timer text...');
        this.timerText = this.scene.add.text(x, y, `Time: ${this.timeLeft}`, {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.timerText.setDepth(100); // Set high depth to stay on top

        // Apply color based on current time
        this.updateTimerColor();

        console.log('Timer elements recreated with depth 100');
        console.log('New timer text active:', this.timerText?.active);
        console.log('New timer background active:', this.timerBackground?.active);
        console.log('=== END RECREATION ===');
    }

    // Update timer display and handle countdown
    updateTimer() {
        if (this.isPaused) return; // Skip update if paused

        this.timeLeft--;
        
        // Stop timer immediately when it hits 0 to prevent negative numbers
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.stop();
            
            // Update display one last time to show 0
            if (this.timerText && this.timerText.active) {
                this.timerText.setText(`Time: ${this.timeLeft}`);
                this.timerText.setFill('#ff0000');
            }
            
            this.handleTimeUp();
            return;
        }
        
        if (this.timerText && this.timerText.active) {
            this.timerText.setText(`Time: ${this.timeLeft}`);
            this.updateTimerColor();
        } else {
            console.warn('Timer text is not active during update!');
        }
    }

    // Update timer text color based on remaining time
    updateTimerColor() {
        if (!this.timerText || !this.timerText.active) return;
        
        if (this.timeLeft <= 10) {
            this.timerText.setFill('#ff0000'); // Red when 10 seconds or less
        } else if (this.timeLeft <= 20) {
            this.timerText.setFill('#ffff00'); // Yellow when 20 seconds or less
        } else {
            this.timerText.setFill('#ffffff'); // White for normal time
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
    }

    // Add time (for correct answers)
    addTime(seconds, maxTime = 30) {
        this.timeLeft = Math.min(this.timeLeft + seconds, maxTime);
        if (this.timerText && this.timerText.active) {
            this.timerText.setText(`Time: ${this.timeLeft}`);
            this.updateTimerColor();
        }
    }

    // Subtract time (for wrong answers)
    subtractTime(seconds) {
        this.timeLeft = Math.max(this.timeLeft - seconds, 0);
        if (this.timerText && this.timerText.active) {
            this.timerText.setText(`Time: ${this.timeLeft}`);
            this.updateTimerColor();
        }
        
        // Check if time ran out
        if (this.timeLeft <= 0) {
            this.stop();
            this.handleTimeUp();
        }
    }

    // Stop the timer
    stop() {
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
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
        
        this.timerBackground = null;
        this.timerText = null;
        this.timerStarted = false;
    }

    // Reset timer
    reset(duration = 30) {
        this.stop();
        this.timeLeft = duration;
        this.timerStarted = false;
    }

    // Get current time left
    getTimeLeft() {
        return this.timeLeft;
    }

    // Check if timer is running
    isRunning() {
        return this.timerEvent !== null;
    }

    // Check if timer elements exist and are active
    isActive() {
        return this.timerText && this.timerText.active && 
               this.timerBackground && this.timerBackground.active;
    }

    // Add pause and resume methods to GameTimer if not present
    pause() {
        this.isPaused = true;
    }
    resume() {
        this.isPaused = false;
    }
}