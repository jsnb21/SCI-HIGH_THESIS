import Phaser from 'phaser';
import { updateSoundVolumes } from './options';
import { playExclusiveBGM } from '../audioUtils';
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
    
    // Audio
    this.load.audio('se_select', 'assets/audio/se/se_select.wav');
    this.load.audio('bgm_main', 'assets/audio/bgm/bgm_main-theme.mp3');
  }

  create() {
    // Add and scale the background image to fit the screen
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'vnBg').setDisplaySize(width, height);

    // --- MUSIC LOGIC START ---
    playExclusiveBGM(this, 'bgm_main', { loop: true });
    updateSoundVolumes(this);
    // --- MUSIC LOGIC END ---

    // Retrieve dialogue lines from loaded JSON
    const dialogueLines = this.cache.json.get('dialogue').intro;

    // Use VNDialogueBox for dialogue
    this.vnBox = new VNDialogueBox(this, dialogueLines, () => {
        this.scene.start('MainHub');
      });
  }
}