import Phaser from 'phaser';
import VNDialogueBox from '../../../ui/VNDialogueBox.js';
import { createBackButton } from '../../../components/buttons/backbutton.js';

/**
 * BaseCharacterStoryScene
 * Reusable foundation for simple one-question -> player choices -> response -> return flow.
 * Extend and override getConfig() in subclass to define:
 *  - key: scene key (string)
 *  - portraitKey: texture key for portrait (e.g., 'LilyPortrait')
 *  - portraitPath: asset path for portrait if it may need loading
 *  - backgroundColor: hex string background color
 *  - openingLine: initial NPC line (string)
 *  - choices: array of strings shown as player responses
 *  - responses(choiceIndex, choiceText): function returning NPC response string
 */
export default class BaseCharacterStoryScene extends Phaser.Scene {
  constructor(sceneKey) {
    super(sceneKey);
    this.dialogueBox = null;
    this.portrait = null;
  }

  // Subclasses override this to provide config
  getConfig() {
    return {
      key: 'BaseStory',
      portraitKey: null,
      portraitPath: null,
      backgroundColor: '#000000',
      openingLine: '...'
    };
  }

  preload() {
    const cfg = this.getConfig();
    if (cfg.portraitKey && cfg.portraitPath && !this.textures.exists(cfg.portraitKey)) {
      this.load.image(cfg.portraitKey, cfg.portraitPath);
    }
  }

  create() {
    const cfg = this.getConfig();
    const { width, height } = this.scale;

    // Background
    if (cfg.backgroundColor) {
      this.cameras.main.setBackgroundColor(cfg.backgroundColor);
    }

    // Portrait
    if (cfg.portraitKey && this.textures.exists(cfg.portraitKey)) {
      const baseY = height * 0.60;
      this.portrait = this.add.image(width * 0.5, baseY, cfg.portraitKey).setOrigin(0.5);
      const targetHeightRatio = 0.75;
      const desiredHeight = height * targetHeightRatio;
      const naturalHeight = this.portrait.height;
      const scale = desiredHeight / naturalHeight;
      this.portrait.setScale(Math.min(scale, 1));
      this.portrait.setDepth(5);
      this.portrait.setAlpha(0);
      this.tweens.add({ targets: this.portrait, alpha: 1, duration: 400, ease: 'Power2' });
    }

    // Back button
    this.backButton = createBackButton(this, () => this.returnToClassroom());

    // Start initial dialogue
    this.startOpening();
  }

  startOpening() {
    const cfg = this.getConfig();
    this.dialogueBox = new VNDialogueBox(this, [cfg.openingLine], () => this.showChoices());
  }

  showChoices() {
    const cfg = this.getConfig();
    if (!cfg.choices || !cfg.responses) {
      // Fallback: just return if misconfigured
      this.returnToClassroom();
      return;
    }

    // Replace dialogue box with one showing the opening line & choices
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
      this.dialogueBox = null;
    }
    this.dialogueBox = new VNDialogueBox(this, [cfg.openingLine], null, {
      showChoices: true,
      choices: cfg.choices,
      onChoiceSelected: (index, text) => this.handleChoice(index, text)
    });
  }

  handleChoice(index, text) {
    const cfg = this.getConfig();
    // Cleanup old box
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
      this.dialogueBox = null;
    }
    let reply = '';
    try {
      reply = cfg.responses(index, text) || '';
    } catch (e) {
      console.warn('Response generation failed', e);
    }
    this.dialogueBox = new VNDialogueBox(this, [reply], () => this.returnToClassroom());
  }

  returnToClassroom() {
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
      this.dialogueBox = null;
    }
    this.scene.start('Classroom');
  }
}
