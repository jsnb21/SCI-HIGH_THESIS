import Phaser from 'phaser';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class VNDialogueBox {
  constructor(scene, dialogueLines, onComplete) {
    this.scene = scene;
    this.dialogueLines = dialogueLines;
    this.onComplete = onComplete;
    this.dialogueIndex = 0;
    this.text = this.dialogueLines[this.dialogueIndex];
    this.displayedText = '';
    this.typingEvent = null;

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

    // Sound
    this.selectSound = scene.sound.get('se_select') || scene.sound.add('se_select');

    // Input handler
    this.pointerHandler = () => {
      if (this.typingEvent) {
        this.finishTyping();
      } else {
        this.nextDialogue();
      }
    };
    scene.input.on('pointerdown', this.pointerHandler);

    // Begin typing
    this.typeText(this.text);

    // Store scale values
    this._scale = scale;
    this._boxParams = { boxX, boxY, boxWidth, boxHeight, borderRadius, borderThickness };
  }

  typeText(text) {
    this.displayedText = '';
    if (this.textObject && this.textObject.setText) {
      this.textObject.setText('');
    }
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
    }
  }

  nextDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogueLines.length) {
      this.text = this.dialogueLines[this.dialogueIndex];
      if (this.selectSound) this.selectSound.play();
      this.typeText(this.text);
    } else {
      this.scene.input.off('pointerdown', this.pointerHandler);
      this.scene.input.once('pointerdown', () => {
        this.destroy();
        if (this.onComplete) this.onComplete();
      });
    }
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
    this.scene.input.off('pointerdown', this.pointerHandler);
  }
}
