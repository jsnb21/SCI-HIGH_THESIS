export default class TutorialManager {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.currentStep = 0;
        this.tutorialSteps = [];
        this.tutorialElements = [];
        this.overlay = null;
        this.highlightBox = null;
        this.textBox = null;
        this.titleText = null;
        this.mainText = null;
        this.arrowPointer = null;
        this.nextButton = null;
        this.skipButton = null;
        this.backButton = null;
        this.callbacks = {
            onComplete: null,
            onSkip: null,
            onStepComplete: null
        };
        
        // Setup debug keys once during construction
        this.setupDebugKeys();
    }

    /**
     * Initialize a tutorial sequence
     * @param {Array} steps - Array of tutorial step objects
     * @param {Object} callbacks - Optional callbacks for tutorial events
     */
    init(steps, callbacks = {}) {
        this.tutorialSteps = steps;
        this.callbacks = { ...this.callbacks, ...callbacks };
        this.currentStep = 0;
        this.isActive = true;
        
        // Disable all scene interactions
        this.disableSceneInteractions();
        
        this.createOverlay();
        this.showStep(this.currentStep);
        
        // Pause game elements if needed
        if (this.scene.gameTimer) {
            this.scene.gameTimer.pause();
        }
    }

    /**
     * Create the dark overlay that dims the screen
     */
    createOverlay() {
        const { width, height } = this.scene.scale;
        
        // Create semi-transparent overlay that blocks interactions but allows tutorial elements to work
        this.overlay = this.scene.add.graphics();
        this.overlay.fillStyle(0x000000, 0.7);
        this.overlay.fillRect(0, 0, width, height);
        this.overlay.setDepth(1000);
        this.overlay.setInteractive({
            hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            useHandCursor: false
        });
        
        // Simple event blocking - tutorial elements will have higher depth and receive events first
        this.overlay.on('pointerdown', (pointer, localX, localY, event) => {
            // Prevent this event from reaching game elements underneath
            if (event && event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
            }
            // Alternative: just consume the event by returning false
            return false;
        });
        
        this.tutorialElements.push(this.overlay);
    }

    /**
     * Show a specific tutorial step
     * @param {number} stepIndex - Index of the step to show
     */
    showStep(stepIndex) {
        if (stepIndex >= this.tutorialSteps.length) {
            this.complete();
            return;
        }

        const step = this.tutorialSteps[stepIndex];
        this.clearStepElements();

        // Create highlight box if target element is specified
        if (step.target) {
            this.createHighlight(step.target, step.highlightStyle);
        }

        // Create text box
        this.createTextBox(step);

        // Create arrow pointer if specified
        if (step.arrow) {
            this.createArrow(step.arrow);
        }

        // Create navigation buttons
        this.createNavigationButtons(step);

        // Call step-specific callback if provided
        if (step.onShow) {
            step.onShow(this.scene);
        }
    }

    /**
     * Create highlight box around target element
     * @param {Object} target - Target element or coordinates
     * @param {Object} style - Highlight style options
     */
    createHighlight(target, style = {}) {
        const defaultStyle = {
            borderColor: 0xFFFF00,
            borderWidth: 3,
            borderAlpha: 1,
            padding: 10,
            cornerRadius: 5,
            pulsate: true
        };
        
        const highlightStyle = { ...defaultStyle, ...style };
        
        let bounds;
        
        // Get bounds from different target types
        if (target.getBounds) {
            bounds = target.getBounds();
        } else if (target.x !== undefined && target.y !== undefined) {
            bounds = {
                x: target.x - (target.width || 50) / 2,
                y: target.y - (target.height || 50) / 2,
                width: target.width || 100,
                height: target.height || 100
            };
        } else if (target.bounds) {
            bounds = target.bounds;
        } else {
            console.warn('Invalid target for highlight');
            return;
        }

        // Clear the overlay area where the highlight will be
        this.overlay.clear();
        const { width, height } = this.scene.scale;
        
        // Create overlay with cutout by drawing around the highlighted area
        this.overlay.fillStyle(0x000000, 0.7);
        
        const cutoutX = bounds.x - highlightStyle.padding;
        const cutoutY = bounds.y - highlightStyle.padding;
        const cutoutWidth = bounds.width + highlightStyle.padding * 2;
        const cutoutHeight = bounds.height + highlightStyle.padding * 2;
        
        // Draw overlay in sections around the cutout area
        // Top section
        if (cutoutY > 0) {
            this.overlay.fillRect(0, 0, width, cutoutY);
        }
        
        // Bottom section
        if (cutoutY + cutoutHeight < height) {
            this.overlay.fillRect(0, cutoutY + cutoutHeight, width, height - (cutoutY + cutoutHeight));
        }
        
        // Left section
        if (cutoutX > 0) {
            this.overlay.fillRect(0, cutoutY, cutoutX, cutoutHeight);
        }
        
        // Right section
        if (cutoutX + cutoutWidth < width) {
            this.overlay.fillRect(cutoutX + cutoutWidth, cutoutY, width - (cutoutX + cutoutWidth), cutoutHeight);
        }

        // Create highlight border
        this.highlightBox = this.scene.add.graphics();
        this.highlightBox.lineStyle(
            highlightStyle.borderWidth,
            highlightStyle.borderColor,
            highlightStyle.borderAlpha
        );
        
        if (highlightStyle.cornerRadius > 0) {
            this.highlightBox.strokeRoundedRect(
                bounds.x - highlightStyle.padding,
                bounds.y - highlightStyle.padding,
                bounds.width + highlightStyle.padding * 2,
                bounds.height + highlightStyle.padding * 2,
                highlightStyle.cornerRadius
            );
        } else {
            this.highlightBox.strokeRect(
                bounds.x - highlightStyle.padding,
                bounds.y - highlightStyle.padding,
                bounds.width + highlightStyle.padding * 2,
                bounds.height + highlightStyle.padding * 2
            );
        }
        
        this.highlightBox.setDepth(1001);
        this.tutorialElements.push(this.highlightBox);

        // Add pulsating effect
        if (highlightStyle.pulsate) {
            this.scene.tweens.add({
                targets: this.highlightBox,
                alpha: 0.3,
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        }
    }

    /**
     * Create text box with tutorial content
     * @param {Object} step - Tutorial step data
     */
    createTextBox(step) {
        const { width, height } = this.scene.scale;
        const boxStyle = {
            width: 600,  // Increased from 400
            height: 220, // Increased from 150
            backgroundColor: 0x1a1a2e,
            borderColor: 0x16213e,
            borderWidth: 4,  // Increased from 3
            cornerRadius: 12, // Increased from 10
            padding: 30,     // Increased from 20
            ...step.textBoxStyle
        };

        // Position text box at center X but at leaderboard Y level
        const scaleFactor = Math.min(width / 816, height / 624);
        const margin = 24 * scaleFactor;
        const buttonHeight = 50 * scaleFactor;
        
        let boxX = width / 2;
        let boxY = buttonHeight / 2 + margin + 60 * scaleFactor; // Slightly below the leaderboard level

        // Create background
        this.textBox = this.scene.add.graphics();
        this.textBox.fillStyle(boxStyle.backgroundColor, 0.95);
        this.textBox.lineStyle(boxStyle.borderWidth, boxStyle.borderColor, 1);
        this.textBox.fillRoundedRect(
            boxX - boxStyle.width / 2,
            boxY - boxStyle.height / 2,
            boxStyle.width,
            boxStyle.height,
            boxStyle.cornerRadius
        );
        this.textBox.strokeRoundedRect(
            boxX - boxStyle.width / 2,
            boxY - boxStyle.height / 2,
            boxStyle.width,
            boxStyle.height,
            boxStyle.cornerRadius
        );
        this.textBox.setDepth(1002);
        this.tutorialElements.push(this.textBox);

        // Create title text if provided
        if (step.title) {
            this.titleText = this.scene.add.text(boxX, boxY - boxStyle.height / 2 + 40, step.title, {
                fontFamily: 'Arial',
                fontSize: '24px',  // Increased from 18px
                fontStyle: 'bold',
                color: '#FFD700',
                align: 'center',
                wordWrap: { width: boxStyle.width - boxStyle.padding * 2 }
            });
            this.titleText.setOrigin(0.5, 0.5);
            this.titleText.setDepth(1003);
            this.tutorialElements.push(this.titleText);
        }

        // Create main text
        this.mainText = this.scene.add.text(
            boxX, 
            boxY + (step.title ? -10 : -20), 
            step.text, 
            {
                fontFamily: 'Arial',
                fontSize: '18px',  // Increased from 14px
                color: '#FFFFFF',
                align: 'center',
                wordWrap: { width: boxStyle.width - boxStyle.padding * 2 }
            }
        );
        this.mainText.setOrigin(0.5, 0.5);
        this.mainText.setDepth(1003);
        this.tutorialElements.push(this.mainText);

        // Store text box position for button placement
        this.textBoxBounds = {
            x: boxX,
            y: boxY,
            width: boxStyle.width,
            height: boxStyle.height
        };
    }

    /**
     * Create arrow pointer
     * @param {Object} arrowConfig - Arrow configuration
     */
    createArrow(arrowConfig) {
        const { startX, startY, endX, endY, color = 0xFFFF00 } = arrowConfig;
        
        this.arrowPointer = this.scene.add.graphics();
        this.arrowPointer.lineStyle(3, color, 1);
        
        // Draw arrow line
        this.arrowPointer.beginPath();
        this.arrowPointer.moveTo(startX, startY);
        this.arrowPointer.lineTo(endX, endY);
        this.arrowPointer.strokePath();
        
        // Draw arrowhead
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;
        
        this.arrowPointer.beginPath();
        this.arrowPointer.moveTo(endX, endY);
        this.arrowPointer.lineTo(
            endX - arrowLength * Math.cos(angle - arrowAngle),
            endY - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.arrowPointer.moveTo(endX, endY);
        this.arrowPointer.lineTo(
            endX - arrowLength * Math.cos(angle + arrowAngle),
            endY - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.arrowPointer.strokePath();
        
        this.arrowPointer.setDepth(1002);
        this.tutorialElements.push(this.arrowPointer);

        // Add floating animation
        this.scene.tweens.add({
            targets: this.arrowPointer,
            y: this.arrowPointer.y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * Create navigation buttons
     * @param {Object} step - Current tutorial step
     */
    createNavigationButtons(step) {
        const boxBounds = this.textBoxBounds;
        
        // Next/Continue button
        const nextButtonText = step.buttonText || (this.currentStep < this.tutorialSteps.length - 1 ? 'Next' : 'Finish');
        this.nextButton = this.scene.add.text(
            boxBounds.x + boxBounds.width / 2 - 80,  // Adjusted position for larger button
            boxBounds.y + boxBounds.height / 2 - 25,
            nextButtonText,
            {
                fontFamily: 'Arial',
                fontSize: '18px',  // Increased from 14px
                color: '#000000',
                backgroundColor: '#4CAF50',
                padding: { x: 20, y: 12 }  // Increased padding
            }
        );
        this.nextButton.setOrigin(0.5, 0.5);
        this.nextButton.setDepth(1003);
        this.nextButton.setInteractive({ useHandCursor: true });
        this.nextButton.on('pointerdown', () => this.nextStep());
        this.nextButton.on('pointerover', () => this.nextButton.setTint(0xCCCCCC));
        this.nextButton.on('pointerout', () => this.nextButton.clearTint());
        this.tutorialElements.push(this.nextButton);

        // Back button (only show if not the first step)
        if (this.currentStep > 0) {
            this.backButton = this.scene.add.text(
                boxBounds.x - 20,  // Position to the left of Next button
                boxBounds.y + boxBounds.height / 2 - 25,
                'Back',
                {
                    fontFamily: 'Arial',
                    fontSize: '18px',
                    color: '#000000',
                    backgroundColor: '#2196F3',
                    padding: { x: 20, y: 12 }
                }
            );
            this.backButton.setOrigin(0.5, 0.5);
            this.backButton.setDepth(1003);
            this.backButton.setInteractive({ useHandCursor: true });
            this.backButton.on('pointerdown', () => this.prevStep());
            this.backButton.on('pointerover', () => this.backButton.setTint(0xCCCCCC));
            this.backButton.on('pointerout', () => this.backButton.clearTint());
            this.tutorialElements.push(this.backButton);
        }

        // Skip button (only show if not the last step)
        if (this.currentStep < this.tutorialSteps.length - 1) {
            this.skipButton = this.scene.add.text(
                boxBounds.x - boxBounds.width / 2 + 80,  // Adjusted position for larger button
                boxBounds.y + boxBounds.height / 2 - 25,
                'Skip Tutorial',
                {
                    fontFamily: 'Arial',
                    fontSize: '16px',  // Increased from 12px
                    color: '#000000',
                    backgroundColor: '#FF9800',
                    padding: { x: 15, y: 10 }  // Increased padding
                }
            );
            this.skipButton.setOrigin(0.5, 0.5);
            this.skipButton.setDepth(1003);
            this.skipButton.setInteractive({ useHandCursor: true });
            this.skipButton.on('pointerdown', () => this.skip());
            this.skipButton.on('pointerover', () => this.skipButton.setTint(0xCCCCCC));
            this.skipButton.on('pointerout', () => this.skipButton.clearTint());
            this.tutorialElements.push(this.skipButton);
        }
    }

    /**
     * Clear elements from current step
     */
    clearStepElements() {
        [this.highlightBox, this.textBox, this.titleText, this.mainText, this.arrowPointer, this.nextButton, this.skipButton, this.backButton].forEach(element => {
            if (element) {
                element.destroy();
            }
        });
        this.highlightBox = null;
        this.textBox = null;
        this.titleText = null;
        this.mainText = null;
        this.arrowPointer = null;
        this.nextButton = null;
        this.skipButton = null;
        this.backButton = null;
        
        // Clear and recreate overlay for next step
        if (this.overlay) {
            this.overlay.clear();
            const { width, height } = this.scene.scale;
            this.overlay.fillStyle(0x000000, 0.7);
            this.overlay.fillRect(0, 0, width, height);
        }
    }

    /**
     * Move to next tutorial step
     */
    nextStep() {
        if (this.callbacks.onStepComplete) {
            this.callbacks.onStepComplete(this.currentStep);
        }

        this.currentStep++;
        this.showStep(this.currentStep);
    }

    /**
     * Go to the previous tutorial step
     */
    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    /**
     * Skip the entire tutorial
     */
    skip() {
        if (this.callbacks.onSkip) {
            this.callbacks.onSkip();
        }
        this.destroy();
    }

    /**
     * Complete the tutorial
     */
    complete() {
        if (this.callbacks.onComplete) {
            this.callbacks.onComplete();
        }
        this.destroy();
    }

    /**
     * Clean up and destroy tutorial elements
     */
    destroy() {
        // Clear current step elements first
        this.clearStepElements();
        
        // Destroy all tutorial elements including overlay
        this.tutorialElements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        
        this.tutorialElements = [];
        this.overlay = null;
        this.isActive = false;
        
        // Re-enable scene interactions
        this.enableSceneInteractions();
        
        // Resume game elements
        if (this.scene.gameTimer) {
            this.scene.gameTimer.resume();
        }
    }
    
    /**
     * Setup debug keys for tutorial testing (only in development)
     */
    setupDebugKeys() {
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            // T key - show first time tutorial
            this.scene.input.keyboard.on('keydown-T', () => {
                if (this.scene.input.keyboard.checkDown(this.scene.input.keyboard.addKey('CTRL'))) {
                    console.log('Showing first time tutorial (Ctrl+T)');
                    this.scene.forceTutorial('firstTime');
                }
            });
            
            // C key - show combo tutorial
            this.scene.input.keyboard.on('keydown-C', () => {
                if (this.scene.input.keyboard.checkDown(this.scene.input.keyboard.addKey('CTRL'))) {
                    console.log('Showing combo tutorial (Ctrl+C)');
                    this.scene.forceTutorial('combo');
                }
            });
            
            // H key - show low health tutorial
            this.scene.input.keyboard.on('keydown-H', () => {
                if (this.scene.input.keyboard.checkDown(this.scene.input.keyboard.addKey('CTRL'))) {
                    console.log('Showing low health tutorial (Ctrl+H)');
                    this.scene.forceTutorial('lowHealth');
                }
            });
            
            // R key - reset tutorial flags
            this.scene.input.keyboard.on('keydown-R', () => {
                if (this.scene.input.keyboard.checkDown(this.scene.input.keyboard.addKey('CTRL'))) {
                    console.log('Resetting tutorial flags (Ctrl+R)');
                    this.scene.resetTutorialFlags();
                    
                    // Reset Python-specific flags if available
                    if (this.scene.resetPythonTutorialFlags) {
                        this.scene.resetPythonTutorialFlags();
                    }
                }
            });
            
            // Python-specific debug keys
            if (this.scene.topic === 'python' || this.scene.courseTopic === 'Python') {
                // S key - show Python syntax tutorial
                this.scene.input.keyboard.on('keydown-S', () => {
                    if (this.scene.input.keyboard.checkDown(this.scene.input.keyboard.addKey('CTRL'))) {
                        console.log('Showing Python syntax tutorial (Ctrl+S)');
                        if (this.scene.showPythonTutorial) {
                            this.scene.showPythonTutorial('syntaxError');
                        }
                    }
                });
                
                // P key - show Python concepts tutorial
                this.scene.input.keyboard.on('keydown-P', () => {
                    if (this.scene.input.keyboard.checkDown(this.scene.input.keyboard.addKey('CTRL'))) {
                        console.log('Showing Python concepts tutorial (Ctrl+P)');
                        if (this.scene.showPythonTutorial) {
                            this.scene.showPythonTutorial('pythonConcepts');
                        }
                    }
                });
                
                // M key - show Python timer tutorial
                this.scene.input.keyboard.on('keydown-M', () => {
                    if (this.scene.input.keyboard.checkDown(this.scene.input.keyboard.addKey('CTRL'))) {
                        console.log('Showing Python timer tutorial (Ctrl+M)');
                        if (this.scene.showPythonTutorial) {
                            this.scene.showPythonTutorial('timer');
                        }
                    }
                });
            }
        }
    }

    /**
     * Check if tutorial is currently active
     */
    isRunning() {
        return this.isActive;
    }

    /**
     * Get current step information
     */
    getCurrentStep() {
        return {
            index: this.currentStep,
            total: this.tutorialSteps.length,
            step: this.tutorialSteps[this.currentStep]
        };
    }
    
    /**
     * Disable all scene interactions during tutorial
     */
    disableSceneInteractions() {
        if (!this.scene) return;
        
        // Store original input state
        this.originalInputState = {
            inputEnabled: this.scene.input.enabled,
            keyboardEnabled: this.scene.input.keyboard ? this.scene.input.keyboard.enabled : true,
            disabledObjects: []
        };
        
        // Don't completely disable scene input - let tutorial elements work
        // Instead, disable specific interactive objects
        this.disableQuizElements();
        
        console.log('Tutorial: Scene interactions disabled (selective)');
    }
    
    /**
     * Re-enable all scene interactions after tutorial
     */
    enableSceneInteractions() {
        if (!this.scene) return;
        
        // Restore scene input (though we didn't disable it completely)
        if (this.originalInputState) {
            // Restore any settings if needed
            if (this.originalInputState.keyboardEnabled !== undefined && this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = this.originalInputState.keyboardEnabled;
            }
        }
        
        // Re-enable quiz elements
        this.enableQuizElements();
        
        console.log('Tutorial: Scene interactions enabled');
    }
    
    /**
     * Disable specific quiz scene elements
     */
    disableQuizElements() {
        if (!this.scene) return;
        
        this.disabledElements = [];
        
        // Disable answer option buttons
        if (this.scene.optionTexts && Array.isArray(this.scene.optionTexts)) {
            this.scene.optionTexts.forEach(option => {
                if (option && option.input && option.input.enabled) {
                    option.disableInteractive();
                    this.disabledElements.push({ element: option, type: 'option' });
                }
            });
        }
        
        // Disable power-up buttons
        if (this.scene.powerUpButton && this.scene.powerUpButton.input && this.scene.powerUpButton.input.enabled) {
            this.scene.powerUpButton.disableInteractive();
            this.disabledElements.push({ element: this.scene.powerUpButton, type: 'powerup' });
        }
        
        // Disable input text fields for fill-in-the-blank questions
        if (this.scene.answerInput && this.scene.answerInput.node) {
            this.scene.answerInput.node.disabled = true;
            this.disabledElements.push({ element: this.scene.answerInput, type: 'input' });
        }
        
        // Disable game timer interactions if present
        if (this.scene.gameTimer && this.scene.gameTimer.pauseButton) {
            if (this.scene.gameTimer.pauseButton.input && this.scene.gameTimer.pauseButton.input.enabled) {
                this.scene.gameTimer.pauseButton.disableInteractive();
                this.disabledElements.push({ element: this.scene.gameTimer.pauseButton, type: 'timer' });
            }
        }
        
        // Disable any other interactive elements in the scene (except tutorial elements)
        if (this.scene.children && this.scene.children.list) {
            this.scene.children.list.forEach(child => {
                if (child.input && child.input.enabled && 
                    !this.tutorialElements.includes(child) && 
                    child !== this.overlay &&
                    !this.isPartOfTutorial(child)) {
                    try {
                        child.disableInteractive();
                        this.disabledElements.push({ element: child, type: 'general' });
                    } catch (e) {
                        // Some elements might not support disabling
                        console.warn('Could not disable element interaction:', e);
                    }
                }
            });
        }
        
        console.log(`Tutorial: Disabled ${this.disabledElements.length} interactive elements`);
    }
    
    /**
     * Check if an element is part of the tutorial system
     */
    isPartOfTutorial(element) {
        return this.tutorialElements.includes(element) || 
               element === this.textBox || 
               element === this.highlightBox || 
               element === this.titleText || 
               element === this.mainText || 
               element === this.arrowPointer || 
               element === this.nextButton || 
               element === this.skipButton;
    }
    
    /**
     * Re-enable quiz scene elements
     */
    enableQuizElements() {
        if (!this.disabledElements) return;
        
        let enabledCount = 0;
        
        this.disabledElements.forEach(item => {
            const element = item.element || item; // Support both old and new structure
            const type = item.type || 'unknown';
            
            if (element) {
                try {
                    if (type === 'input' && element.node) {
                        // Re-enable input fields
                        element.node.disabled = false;
                        enabledCount++;
                    } else if (element.setInteractive) {
                        // Re-enable interactive game objects
                        if (type === 'option' || type === 'powerup' || type === 'timer') {
                            element.setInteractive({ useHandCursor: true });
                        } else {
                            element.setInteractive();
                        }
                        enabledCount++;
                    }
                } catch (e) {
                    console.warn(`Could not re-enable ${type} element interaction:`, e);
                }
            }
        });
        
        console.log(`Tutorial: Re-enabled ${enabledCount} interactive elements`);
        this.disabledElements = [];
    }
    
}
