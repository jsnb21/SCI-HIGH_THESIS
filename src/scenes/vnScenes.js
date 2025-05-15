import Phaser from 'phaser';

export default class VNScene extends Phaser.Scene {
  constructor() {
    super('VNScene');
    this.dialogueIndex = 0;
    this.text = '';
    this.displayedText = '';
    this.typingEvent = null;
    this.dialogueLines = [];
  }

  preload() {
    this.load.json('dialogue', '/data/dialogue.json');
    this.load.image('vnBg', 'assets/img/bg/classroom_day.png'); // Add this line
  }

  create() {
    // Background Image
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'vnBg').setDisplaySize(width, height);

    this.dialogueLines = this.cache.json.get('dialogue').lines;
    this.dialogueIndex = 0;
    this.text = this.dialogueLines[this.dialogueIndex];
    this.displayedText = '';

    // Text Box with Border and Rounded Corners
    const boxX = 50;
    const boxY = 440;
    const boxWidth = 700;
    const boxHeight = 100;
    const borderRadius = 20;
    const borderThickness = 4;

    // Draw border
    const border = this.add.graphics();
    border.lineStyle(borderThickness, 0xffffff, 1); // White border
    border.fillStyle(0x222244, 0.8); // Fill color
    border.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    border.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);

    // Text Object
    this.textObject = this.add.text(boxX + 20, boxY + 15, '', {
      font: '24px Arial',
      color: '#fff',
      wordWrap: { width: boxWidth - 40 }
    });

    this.input.on('pointerdown', () => {
      if (this.typingEvent) {
        this.finishTyping();
      } else {
        this.nextDialogue();
      }
    });

    this.typeText(this.text);
  }

  typeText(text) {
    this.displayedText = '';
    this.textObject.setText('');
    let i = 0;
    this.typingEvent = this.time.addEvent({
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
      this.typeText(this.text);
    } else {
      this.textObject.setText("End of demo.");
    }
  }
}