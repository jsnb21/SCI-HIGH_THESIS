import Phaser from 'phaser';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class VNDialogueBox {
  constructor(scene, dialogueLines, onComplete, options = {}) {
    this.scene = scene;
    this.dialogueLines = dialogueLines;
    this.onComplete = onComplete;
    this._vnOptions = options || {};
    this.dialogueIndex = 0;
  // Support either string lines or { speaker, text } objects
  const firstLine = this.dialogueLines[this.dialogueIndex] || '';
  const parts = this._getLineParts(firstLine);
  this.text = parts.text;
  this.speaker = parts.speaker;
    this.displayedText = '';
    this.typingEvent = null;
    
    // Choice system properties
    this.showChoices = options.showChoices || false;
    this.choices = options.choices || [];
    this.onChoiceSelected = options.onChoiceSelected || null;
    this.choiceButtons = [];
    this.choicesContainer = null;
    this.choicesActive = false; // Track if choices are currently being shown

    // Speaker color map (defaults; can be overridden via options.speakerColors)
    this.speakerColors = Object.assign({
      'Lily': '#ff79c6',     // pink
      'Damian': '#61dafb',   // cyan/blue
      'Finley': '#7CFC00',   // lawn green
      'Secretary': '#ffe066' // gold
    }, options.speakerColors || {});

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

    // Speaker label (optional)
    const speakerStyle = {
      fontFamily: 'Caprasimo-Regular',
      fontSize: `${Math.round(20 * scale)}px`,
      color: '#ffe066',
      stroke: '#000000',
      strokeThickness: 2
    };
  this.speakerObject = scene.add.text(boxX + 20 * scale, boxY + 8 * scale, '', speakerStyle);
    this.speakerObject.setDepth(11);

    // Create text object
    const baseTextY = this.speaker ? (boxY + 36 * scale) : (boxY + 15 * scale);
    this.textObject = scene.add.text(boxX + 20 * scale, baseTextY, '', {
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
      this._updateSpeakerUI();
      this._applyPortraitEmphasis(this.speaker);
      this.typeText(this.text);
    } else {
      // Show choices immediately if this is a choice dialogue
      // But first display the text if there is any
      if (this.text) {
        this.displayedText = this.text;
        this.textObject.setText(this.text);
        this._updateSpeakerUI();
        this._applyPortraitEmphasis(this.speaker);
        // Ensure typing is marked as complete
        this.typingEvent = null;
        // Don't show continue indicator when choices are present
        this.hideContinueIndicator();
      }
      this.displayChoices();
    }
  }

  _getLineParts(line) {
    if (line && typeof line === 'object' && 'text' in line) {
      return { speaker: line.speaker || null, text: String(line.text ?? '') };
    }
    return { speaker: null, text: String(line ?? '') };
  }

  _updateSpeakerUI() {
    const { boxY, boxHeight } = this._boxParams;
    const scale = this._scale;
    const hasSpeaker = !!this.speaker;
    if (this.speakerObject) {
      this.speakerObject.setText(hasSpeaker ? `${this.speaker}:` : '');
      // Apply speaker-specific color if available
      if (hasSpeaker && this.speakerColors && this.speakerColors[this.speaker]) {
        this.speakerObject.setColor(this.speakerColors[this.speaker]);
      } else {
        this.speakerObject.setColor('#ffe066');
      }
      this.speakerObject.setVisible(hasSpeaker);
    }
    if (this.textObject) {
      const textY = hasSpeaker ? (boxY + 36 * scale) : (boxY + 15 * scale);
      this.textObject.setY(textY);
    }
  }

  _applyPortraitEmphasis(activeSpeaker) {
    const portraits = this._vnOptions.portraits || null;
    if (!portraits) return; // Nothing to do if not provided

    const cfg = Object.assign({
      activeScale: 1.08,
      inactiveScale: 0.92,
      activeAlpha: 1.0,
      inactiveAlpha: 0.55,
      duration: 280,
      ease: 'Sine.easeInOut'
    }, this._vnOptions.portraitEmphasis || {});

    const hasActive = activeSpeaker && portraits[activeSpeaker];
    Object.keys(portraits).forEach(name => {
      const obj = portraits[name];
      if (!obj || !obj.setAlpha) return;
      // Cache base scale if not cached yet
      const baseScaleX = obj.getData && obj.getData('baseScaleX') != null ? obj.getData('baseScaleX') : obj.scaleX;
      const baseScaleY = obj.getData && obj.getData('baseScaleY') != null ? obj.getData('baseScaleY') : obj.scaleY;
      if (obj.setData) {
        if (obj.getData('baseScaleX') == null) obj.setData('baseScaleX', baseScaleX);
        if (obj.getData('baseScaleY') == null) obj.setData('baseScaleY', baseScaleY);
      }

      const isActive = hasActive && name === activeSpeaker;
      const targetScaleX = baseScaleX * (isActive ? cfg.activeScale : cfg.inactiveScale);
      const targetScaleY = baseScaleY * (isActive ? cfg.activeScale : cfg.inactiveScale);
      const targetAlpha = isActive ? cfg.activeAlpha : cfg.inactiveAlpha;

      // Tween scale and alpha together for a smooth emphasis change
      this.scene.tweens.add({
        targets: obj,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        alpha: targetAlpha,
        duration: cfg.duration,
        ease: cfg.ease
      });
    });
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
      const parts = this._getLineParts(this.dialogueLines[this.dialogueIndex]);
      this.text = parts.text;
      this.speaker = parts.speaker;
  if (this.hoverSound) this.hoverSound.play();
      this._updateSpeakerUI();
      this._applyPortraitEmphasis(this.speaker);
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
