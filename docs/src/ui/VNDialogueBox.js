import Phaser from 'phaser';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class VNDialogueBox {
  constructor(scene, dialogueLines, onComplete, options = {}) {
    this.scene = scene;
    this.dialogueLines = dialogueLines;
    this.onComplete = onComplete;
    this.dialogueIndex = 0;
    this.text = this.dialogueLines[this.dialogueIndex] || '';
    this.displayedText = '';
    this.typingEvent = null;
    
    // Choice system properties
    this.showChoices = options.showChoices || false;
    this.choices = options.choices || [];
    this.onChoiceSelected = options.onChoiceSelected || null;
    this.choiceButtons = [];
    this.choicesContainer = null;
    this.choicesActive = false; // Track if choices are currently being shown

    // --- Scaling logic START ---
    const { width, height } = scene.scale;
    const scaleX = width / BASE_WIDTH;
    const scaleY = height / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);

    const marginX = 40 * scale;
    const marginY = 32 * scale;
    const boxWidth = width - marginX * 2;
    const boxHeight = 120 * scale;
    const boxX = marginX;
    const boxY = height - boxHeight - marginY;
    const borderRadius = 20 * scale;
    const borderThickness = 4 * scale;
    // --- Scaling logic END ---

    // Draw border and background
    this.border = scene.add.graphics();
    this.border.lineStyle(borderThickness, 0xffffff, 1);
    this.border.fillStyle(0x222244, 0.8);
    this.border.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    this.border.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    this.border.setDepth(10); // Set high depth for dialogue box

    // Create text object
    this.textObject = scene.add.text(boxX + 20 * scale, boxY + 15 * scale, '', {
      fontFamily: 'Caprasimo-Regular',
      fontSize: `${Math.round(24 * scale)}px`,
      color: '#ffffff',
      wordWrap: { width: boxWidth - 40 * scale }
    });
    this.textObject.setDepth(11); // Text should be above the dialogue box

  // Sounds (guard if missing)
  this.hoverSound = scene.sound.get('se_select') || (scene.sound.add ? scene.sound.add('se_select') : null);
  this.confirmSound = scene.sound.get('se_confirm') || (scene.sound.add ? scene.sound.add('se_confirm') : null);

    // Create continue indicator (initially hidden)
    this.createContinueIndicator(boxX, boxY, boxWidth, boxHeight, scale);

    // Store scale values (must be before displayChoices)
    this._scale = scale;
    this._boxParams = { boxX, boxY, boxWidth, boxHeight, borderRadius, borderThickness };

    // Input handler (only if not showing choices)
    if (!this.showChoices) {
      this.pointerHandler = () => {
        if (this.typingEvent) {
          // First click finishes current line instantly
            this.finishTyping();
            return;
        }
        // Advance or complete
        this.nextDialogue();
      };
      scene.input.on('pointerdown', this.pointerHandler);
      this.typeText(this.text);
    } else {
      // Show choices immediately if this is a choice dialogue
      // But first display the text if there is any
      if (this.text) {
        this.displayedText = this.text;
        this.textObject.setText(this.text);
        // Ensure typing is marked as complete
        this.typingEvent = null;
        // Don't show continue indicator when choices are present
        this.hideContinueIndicator();
      }
      this.displayChoices();
    }
  }

  createContinueIndicator(boxX, boxY, boxWidth, boxHeight, scale) {
    // Position indicator in bottom-right corner of dialogue box
    const indicatorX = boxX + boxWidth - 30 * scale;
    const indicatorY = boxY + boxHeight - 25 * scale;
    
    // Create arrow indicator using graphics
    this.continueArrow = this.scene.add.graphics();
    this.continueArrow.fillStyle(0xffffff, 1);
    
    // Draw a simple right-pointing triangle
    const arrowSize = 8 * scale;
    this.continueArrow.fillTriangle(
      indicatorX, indicatorY - arrowSize/2,           // Top point
      indicatorX, indicatorY + arrowSize/2,           // Bottom point  
      indicatorX + arrowSize, indicatorY              // Right point
    );
    
    this.continueArrow.setDepth(12); // Above text
    this.continueArrow.setVisible(false); // Initially hidden
    
    // Create blinking animation
    this.blinkTween = this.scene.tweens.add({
      targets: this.continueArrow,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      paused: true
    });
  }

  typeText(text) {
    this.displayedText = '';
    if (this.textObject && this.textObject.setText) {
      this.textObject.setText('');
    }
    
    // Hide continue indicator while typing
    this.hideContinueIndicator();
    
    let i = 0;
    this.typingEvent = this.scene.time.addEvent({
      delay: 30,
      repeat: text.length - 1,
      callback: () => {
        this.displayedText += text[i];
        if (this.textObject && this.textObject.setText) {
          this.textObject.setText(this.displayedText);
        }
        i++;
        if (i === text.length) {
          this.typingEvent = null;
          // Show continue indicator when typing is complete
          this.showContinueIndicator();
        }
      }
    });
  }

  finishTyping() {
    if (this.typingEvent) {
      this.typingEvent.remove();
      this.typingEvent = null;
      this.displayedText = this.text;
      if (this.textObject && this.textObject.setText) {
        this.textObject.setText(this.displayedText);
      }
      // Show continue indicator when typing is finished
      this.showContinueIndicator();
    }
  }

  nextDialogue() {
    // If already completed, ignore
    if (this._completed) return;
    // If last line already shown (no typing event), complete now
    if (this.dialogueIndex >= this.dialogueLines.length - 1 && !this.typingEvent) {
      this.completeDialogue();
      return;
    }
    // Otherwise move to next line
    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogueLines.length) {
      this.text = this.dialogueLines[this.dialogueIndex];
  if (this.hoverSound) this.hoverSound.play();
      this.typeText(this.text);
    } else {
      // Safety: if out of range, just complete
      this.completeDialogue();
    }
  }

  completeDialogue() {
    if (this._completed) return;
    this._completed = true;
    this.hideContinueIndicator();
    if (this.pointerHandler) this.scene.input.off('pointerdown', this.pointerHandler);
    // Delay destroy slightly to allow any sounds or chained logic
    this.scene.time.delayedCall(0, () => {
      this.destroy();
      if (this.onComplete) this.onComplete();
    });
  }

  showContinueIndicator() {
    if (this.continueArrow) {
      this.continueArrow.setVisible(true);
      if (this.blinkTween) {
        this.blinkTween.resume();
      }
    }
  }

  hideContinueIndicator() {
    if (this.continueArrow) {
      this.continueArrow.setVisible(false);
      if (this.blinkTween) {
        this.blinkTween.pause();
      }
    }
  }

  displayChoices() {
    this.choicesActive = true;
    // Set dialogue to final index to prevent nextDialogue from continuing
    this.dialogueIndex = this.dialogueLines.length;
    
    const { boxX, boxY, boxWidth, boxHeight } = this._boxParams;
    const scale = this._scale;
    
    // Create container for choices above the dialogue box
    const choiceStartY = boxY - 60 * scale; // Position above dialogue box
    const choiceHeight = 40 * scale;
    const choiceSpacing = 10 * scale;
    
    this.choices.forEach((choiceText, index) => {
      const choiceY = choiceStartY - (index * (choiceHeight + choiceSpacing));
      
      // Create choice background
      const choiceButton = this.scene.add.rectangle(
        boxX + boxWidth / 2, 
        choiceY, 
        boxWidth - 40 * scale, 
        choiceHeight, 
        0x444466, 
        0.9
      );
      choiceButton.setStrokeStyle(2 * scale, 0xffffff, 1);
      choiceButton.setDepth(10);
      choiceButton.setInteractive({ useHandCursor: true });
      
      // Create choice text
      const choiceTextObj = this.scene.add.text(
        boxX + boxWidth / 2,
        choiceY,
        choiceText,
        {
          fontFamily: 'Caprasimo-Regular',
          fontSize: `${Math.round(18 * scale)}px`,
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: boxWidth - 60 * scale }
        }
      );
      choiceTextObj.setOrigin(0.5);
      choiceTextObj.setDepth(11);
      
      // Hover effects with sound (debounced to not spam)
      let hoverArmed = true;
      choiceButton.on('pointerover', () => {
        choiceButton.setFillStyle(0x5566aa, 0.9);
        if (hoverArmed && this.hoverSound) {
          this.hoverSound.play();
          hoverArmed = false;
          // Re-arm after short delay to avoid rapid fire
          this.scene.time.delayedCall(120, () => { hoverArmed = true; });
        }
      });
      choiceButton.on('pointerout', () => {
        choiceButton.setFillStyle(0x444466, 0.9);
      });
      
      // Click handler with confirm sound
      choiceButton.on('pointerdown', () => {
        if (this.confirmSound) this.confirmSound.play();
        this.destroyChoices();
        if (this.onChoiceSelected) {
          this.onChoiceSelected(index, choiceText);
        }
      });
      
      this.choiceButtons.push({ button: choiceButton, text: choiceTextObj });
    });
  }

  destroyChoices() {
    this.choicesActive = false;
    this.choiceButtons.forEach(choice => {
      if (choice.button && choice.button.destroy) choice.button.destroy();
      if (choice.text && choice.text.destroy) choice.text.destroy();
    });
    this.choiceButtons = [];
  }

  destroy() {
    if (this.textObject && this.textObject.destroy) {
      this.textObject.destroy();
      this.textObject = null;
    }
    if (this.border && this.border.destroy) {
      this.border.destroy();
      this.border = null;
    }
    if (this.continueArrow && this.continueArrow.destroy) {
      this.continueArrow.destroy();
      this.continueArrow = null;
    }
    if (this.blinkTween) {
      this.blinkTween.remove();
      this.blinkTween = null;
    }
    this.destroyChoices();
    if (this.pointerHandler) {
      this.scene.input.off('pointerdown', this.pointerHandler);
    }
  }
}
