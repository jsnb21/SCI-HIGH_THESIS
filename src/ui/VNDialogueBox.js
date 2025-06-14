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

    // Use actual width for the box, with proportional margins
    const marginX = 40 * scale;
    const marginY = 32 * scale;
    const boxWidth = width - marginX * 2;
    const boxHeight = 120 * scale;
    const boxX = marginX;
    const boxY = height - boxHeight - marginY;
    const borderRadius = 20 * scale;
    const borderThickness = 4 * scale;
    // --- Scaling logic END ---

    // Draw the text box border and background with rounded corners
    this.border = scene.add.graphics();
    this.border.lineStyle(borderThickness, 0xffffff, 1); // White border
    this.border.fillStyle(0x222244, 0.8); // Semi-transparent fill
    this.border.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    this.border.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);

    // Create the text object for displaying dialogue inside the box
    this.textObject = scene.add.text(boxX + 20 * scale, boxY + 15 * scale, '', {
      fontFamily: 'Jersey15-Regular',
      fontSize: `${Math.round(32 * scale)}px`,
      color: '#ffffff',
      wordWrap: { width: boxWidth - 40 * scale }
    });

    // Sound
    this.selectSound = scene.sound.get('se_select') || scene.sound.add('se_select');

    // Input
    this.pointerHandler = () => {
      if (this.typingEvent) {
        this.finishTyping();
      } else {
        this.nextDialogue();
      }
    };
    scene.input.on('pointerdown', this.pointerHandler);

    // Start typing first line
    this.typeText(this.text);

    // Store for possible future scaling/redraw
    this._scale = scale;
    this._boxParams = { boxX, boxY, boxWidth, boxHeight, borderRadius, borderThickness };
  }

  typeText(text) {
    this.displayedText = '';
    this.textObject.setText('');
    let i = 0;
    this.typingEvent = this.scene.time.addEvent({
      delay: 30,
      repeat: text.length - 1,
      callback: () => {
        this.displayedText += text[i];
        this.textObject.setText(this.displayedText);
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
      this.textObject.setText(this.displayedText);
    }
  }

  nextDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogueLines.length) {
      this.text = this.dialogueLines[this.dialogueIndex];
      if (this.selectSound) this.selectSound.play();
      this.typeText(this.text);
    } else {
      // Wait for next user input, then call onComplete
      this.scene.input.off('pointerdown', this.pointerHandler); // Remove current handler
      this.scene.input.once('pointerdown', () => {
        this.destroy();
        if (this.onComplete) this.onComplete();
      });
    }
  }

  destroy() {
    this.textObject.destroy();
    this.border.destroy();
    this.scene.input.off('pointerdown', this.pointerHandler);
  }
}