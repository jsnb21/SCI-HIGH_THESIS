import Phaser from 'phaser';

// Visual Novel Scene class extending Phaser.Scene
export default class VNScene extends Phaser.Scene {
  constructor() {
    super('VNScene'); // Call Phaser.Scene constructor with scene key
    this.dialogueIndex = 0;      // Tracks current dialogue line index
    this.text = '';              // Current full text to display
    this.displayedText = '';     // Text currently shown (for typing effect)
    this.typingEvent = null;     // Reference to the typing timer event
    this.dialogueLines = [];     // Array of dialogue lines loaded from JSON
  }

  preload() {
    // Load dialogue JSON and background image assets before scene starts
    this.load.json('dialogue', '/data/dialogue.json');
    this.load.image('vnBg', 'assets/img/bg/classroom_day.png'); // Background image
  }

  create() {
    // Set up the scene after assets are loaded

    // Add and scale the background image to fit the screen
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'vnBg').setDisplaySize(width, height);

    // Retrieve dialogue lines from loaded JSON
    this.dialogueLines = this.cache.json.get('dialogue').lines;
    this.dialogueIndex = 0;
    this.text = this.dialogueLines[this.dialogueIndex];
    this.displayedText = '';

    // Define text box properties (position, size, style)
    const boxX = 50;
    const boxY = 440;
    const boxWidth = 700;
    const boxHeight = 100;
    const borderRadius = 20;
    const borderThickness = 4;

    // Draw the text box border and background with rounded corners
    const border = this.add.graphics();
    border.lineStyle(borderThickness, 0xffffff, 1); // White border
    border.fillStyle(0x222244, 0.8); // Semi-transparent fill
    border.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    border.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);

    // Create the text object for displaying dialogue inside the box
    this.textObject = this.add.text(boxX + 20, boxY + 15, '', {
      font: '24px Arial',
      color: '#fff',
      wordWrap: { width: boxWidth - 40 }
    });

    // Set up input: clicking advances dialogue or finishes typing effect
    this.input.on('pointerdown', () => {
      if (this.typingEvent) {
        this.finishTyping(); // Instantly show full line if still typing
      } else {
        this.nextDialogue(); // Otherwise, go to next line
      }
    });

    // Start typing the first line of dialogue
    this.typeText(this.text);
  }

  // Typing effect: gradually reveals text one character at a time
  typeText(text) {
    this.displayedText = '';
    this.textObject.setText('');
    let i = 0;
    this.typingEvent = this.time.addEvent({
      delay: 30, // Milliseconds between each character
      repeat: text.length - 1,
      callback: () => {
        this.displayedText += text[i];
        this.textObject.setText(this.displayedText);
        i++;
        if (i === text.length) {
          this.typingEvent = null; // Typing finished
        }
      }
    });
  }

  // Instantly finish typing effect and show full text
  finishTyping() {
    if (this.typingEvent) {
      this.typingEvent.remove(); // Stop the typing timer
      this.typingEvent = null;
      this.displayedText = this.text;
      this.textObject.setText(this.displayedText);
    }
  }

  // Advance to the next dialogue line, or show end message if finished
  nextDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogueLines.length) {
      this.text = this.dialogueLines[this.dialogueIndex];
      this.typeText(this.text);
    } else {
      this.textObject.setText("End of demo."); // No more lines
    }
  }
}