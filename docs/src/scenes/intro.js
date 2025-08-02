import Phaser from 'phaser';
import { updateSoundVolumes, playExclusiveBGM } from '../audioUtils'; // <-- updated import
import VNDialogueBox from '../ui/VNDialogueBox';

// Visual Novel Scene class extending Phaser.Scene
export default class VNScene extends Phaser.Scene {
  constructor() {
    super('VNScene');
  }

  preload() {
    // JSON
    this.load.json('dialogue', 'data/dialogue.json');
    
    // Images
    this.load.image('vnBg', 'assets/img/bg/classroom_day.png');
    this.load.image('Richard', 'assets/sprites/npcs/principal.png');
    
    // Load character tutor images
    this.load.image('Noah', 'assets/sprites/npcs/Noah.png');
    this.load.image('Lily', 'assets/sprites/npcs/Lily.png');
    this.load.image('Damian', 'assets/sprites/npcs/Damian.png');
    this.load.image('Bella', 'assets/sprites/npcs/Bella.png');
    this.load.image('Finley', 'assets/sprites/npcs/Finley.png');
    
    // Audio
    this.load.audio('se_select', 'assets/audio/se/se_select.wav');
    this.load.audio('bgm_main', 'assets/audio/bgm/bgm_mainhub.mp3');
  }

  create() {
    // Add and scale the background image to fit the screen
    const { width, height } = this.scale;
    const bg = this.add.image(width / 2, height / 2, 'vnBg').setDisplaySize(width, height);
    // Add a dim overlay above the background
    const dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
    this.children.moveAbove(dimOverlay, bg);

    // --- MUSIC LOGIC START ---
    playExclusiveBGM(this, 'bgm_main', { loop: true });
    updateSoundVolumes(this);
    // --- MUSIC LOGIC END ---

    // Retrieve dialogue lines from loaded JSON
    const dialogueData = this.cache.json.get('dialogue');
    const dialogueLines = dialogueData && dialogueData.intro ? dialogueData.intro : [];

    if (!dialogueLines.length) {
      // Show error if dialogue missing
      this.add.text(width / 2, height / 2, 'Dialogue not found.', {
        font: '24px Arial',
        color: '#ff0000'
      }).setOrigin(0.5);
      return;
    }

    // Initialize character display
    this.currentCharacter = null;
    this.characterDisplay = null;

    // Character mapping for dialogue lines (0-indexed)
    this.characterMap = {
      0: 'Richard',  // Principal introduction
      1: 'Richard',  // About SCI-HIGH
      2: 'Richard',  // About tutors
      3: 'Noah',     // Noah introduction
      4: 'Lily',     // Lily introduction
      5: 'Damian',   // Damian introduction
      6: 'Bella',    // Bella introduction
      7: 'Finley',   // Finley introduction
      8: 'Richard',  // About tutors helping with exams
      9: 'Richard',  // Finding them in classroom
      10: 'Richard', // Go to Computer Lab
      11: 'Richard'  // Good luck
    };

    // Add initial principal character
    this.showCharacter('Richard');

    // Use VNDialogueBox for dialogue
    this.vnBox = new VNDialogueBox(this, dialogueLines, () => {
      this.scene.start('MainHub');
    });
    this.add.existing(this.vnBox);

    // Override the vnBox's nextDialogue method to handle character switching
    const originalNextDialogue = this.vnBox.nextDialogue.bind(this.vnBox);
    this.vnBox.nextDialogue = () => {
      originalNextDialogue();
      // Update character display based on current dialogue index
      const nextCharacter = this.characterMap[this.vnBox.dialogueIndex];
      if (nextCharacter && nextCharacter !== this.currentCharacter) {
        this.showCharacter(nextCharacter);
      }
    };
  }

  showCharacter(characterKey) {
    // Remove current character if exists
    if (this.characterDisplay) {
      this.characterDisplay.destroy();
    }

    const { width, height } = this.scale;
    
    // Calculate center position, accounting for dialogue box at bottom
    // Position character in the center-upper area to avoid dialogue box overlap
    const characterY = height * 0.45; // Position at 45% of screen height from top
    
    // Responsive scaling for mobile devices
    const isMobile = width < 768 || height < 600;
    const characterScale = isMobile ? 0.175 : 0.56; // 50% smaller for mobile devices
    
    // Add new character
    this.characterDisplay = this.add.image(width / 2, characterY, characterKey);
    this.characterDisplay.setOrigin(0.5, 0.5); // Center origin for better positioning
    this.characterDisplay.setScale(characterScale);
    this.characterDisplay.setDepth(5); // Behind dialogue box but above background
    
    this.currentCharacter = characterKey;

    // Add a subtle fade-in effect
    this.characterDisplay.setAlpha(0);
    this.tweens.add({
      targets: this.characterDisplay,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
  }
}