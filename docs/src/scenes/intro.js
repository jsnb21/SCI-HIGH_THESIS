import Phaser from 'phaser';
import { updateSoundVolumes, playExclusiveBGM } from '../audioUtils'; // <-- updated import
import VNDialogueBox from '../ui/VNDialogueBox';
import LoadingScreen from '../ui/LoadingScreen';

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
    this.load.image('SCI-HIGH_SCHOOL', 'assets/img/bg/SCI-HIGH_SCHOOL.png'); // Correct path
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
    const { width, height } = this.scale;
    
    // Start with the opening sequence
    this.startOpeningSequence();
  }

  startOpeningSequence() {
    const { width, height } = this.scale;
    
    // Create black background
    const blackBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
    blackBg.setDepth(0);
    
    // Add SCI-HIGH school image (initially invisible)
    const schoolImage = this.add.image(width / 2, height / 2, 'SCI-HIGH_SCHOOL');
    schoolImage.setDisplaySize(width, height);
    schoolImage.setAlpha(0);
    schoolImage.setDepth(1);
    
    // Create additional dark overlay for the school image to make it darker
    const schoolDarkOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
    schoolDarkOverlay.setAlpha(0);
    schoolDarkOverlay.setDepth(1.5);
    
    // Create dim overlay (initially invisible) - increased opacity for darker effect
    const dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    dimOverlay.setAlpha(0);
    dimOverlay.setDepth(2);
    
    // Create text elements (initially invisible)
    const textStyle = {
      fontSize: `${Math.min(width, height) * 0.04}px`,
      color: '#FFFFFF',
      fontFamily: 'Helvetica',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 5
    };
    
    const line1 = this.add.text(width / 2, height * 0.3, 'SCI-HIGH is where I will reach my dreams one step closer...', textStyle);
    line1.setOrigin(0.5).setAlpha(0).setDepth(3);
    
    const line2 = this.add.text(width / 2, height * 0.45, 'To become a smarter and better programmer...', textStyle);
    line2.setOrigin(0.5).setAlpha(0).setDepth(3);
    
    const line3 = this.add.text(width / 2, height * 0.6, 'In this place where I must aim high to soar high!', textStyle);
    line3.setOrigin(0.5).setAlpha(0).setDepth(3);
    
    // Animation sequence using regular tweens and delayed calls - improved pacing
    // 1. Fade in school image with dark overlay (faster)
    this.tweens.add({
      targets: schoolImage,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });
    
    // Fade in the school dark overlay at the same time to make it darker
    this.tweens.add({
      targets: schoolDarkOverlay,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });
    
    // 2. Wait for 2 seconds, then dim the image even more (reduced from 4s to 2.5s)
    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: dimOverlay,
        alpha: 1,
        duration: 800,
        ease: 'Power2'
      });
    });
    
    // 3. Fade in text lines one by one (faster overlapping timing)
    this.time.delayedCall(3500, () => {
      this.tweens.add({
        targets: line1,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
    });
    
    this.time.delayedCall(4800, () => {
      this.tweens.add({
        targets: line2,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
    });
    
    this.time.delayedCall(6100, () => {
      this.tweens.add({
        targets: line3,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
    });
    
    // 4. Fade out everything and start normal intro (much faster - reduced from 13.5s to 8.5s)
    this.time.delayedCall(8500, () => {
      this.tweens.add({
        targets: [schoolImage, schoolDarkOverlay, dimOverlay, line1, line2, line3, blackBg],
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
          // Clean up opening sequence elements
          schoolImage.destroy();
          schoolDarkOverlay.destroy();
          dimOverlay.destroy();
          line1.destroy();
          line2.destroy();
          line3.destroy();
          blackBg.destroy();
          
          // Start normal intro
          this.startNormalIntro();
        }
      });
    });
  }

  startNormalIntro() {
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
      10: 'Richard', // Fill up details line - proceed to gameplay
      11: 'Richard', // Go to Computer Lab
      12: 'Richard'  // Good luck
    };

    // Add initial principal character
    this.showCharacter('Richard');

    // Use VNDialogueBox for dialogue
    this.vnBox = new VNDialogueBox(this, dialogueLines, () => {
      // This callback is called when all dialogue is finished
      this.proceedToMainHub();
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
    
    // Apply special positioning for principal Richard
    let characterY, characterScale;
    if (characterKey === 'Richard') {
      // Position principal so half of his body is covered by the dialogue box
      characterY = height * 0.7; // Lower position so dialogue box covers upper half
      
      // Responsive scaling for mobile devices - increased size for principal
      const isMobile = width < 768 || height < 600;
      characterScale = isMobile ? 0.35 : 0.8; // Larger scale for more presence
    } else {
      // Default positioning for other characters
      characterY = height * 0.45; // Position at 45% of screen height from top
      
      // Responsive scaling for mobile devices
      const isMobile = width < 768 || height < 600;
      characterScale = isMobile ? 0.175 : 0.56; // 50% smaller for mobile devices
    }
    
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

  proceedToMainHub() {
    // Proceed to main hub
    LoadingScreen.transitionToMainHub(this, 'Preparing SCI-HIGH Academy...', 2500);
  }

  shutdown() {
    super.shutdown();
  }
}