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
  }

  create() {
    this.dialogueLines = this.cache.json.get('dialogue').lines;
    this.dialogueIndex = 0;
    this.text = this.dialogueLines[this.dialogueIndex];
    this.displayedText = '';

    this.box = this.add.rectangle(400, 500, 700, 100, 0x222244, 0.8).setOrigin(0.5);

    this.textObject = this.add.text(50, 450, '', {
      font: '24px Arial',
      color: '#fff',
      wordWrap: { width: 700 }
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