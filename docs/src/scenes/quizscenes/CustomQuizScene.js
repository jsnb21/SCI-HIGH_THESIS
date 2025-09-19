import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';

/**
 * CustomQuizScene
 * Simplified version: uses a static sample quiz (no Firebase required).
 * Start with: this.scene.start('CustomQuizScene');
 */
export default class CustomQuizScene extends BaseQuizScene {
  constructor() {
    super({ key: 'CustomQuizScene' });
    this.quizMeta = null;
  }

  init(data) {
    // Provide a generic topic label for gameManager point tracking
    const topicData = {
      ...data,
      topic: data.topic || 'Custom',
      difficulty: data.difficulty || 'medium'
    };
    super.init(topicData);
  // No external identifiers needed in simplified version
  }

  preload() {
    super.preload();
    // No static JSON to load; quiz fetched at runtime in create()
  }

  async create() {
    super.create();
    
    this.startQuiz();
  }

  /**
   * Utility to show a basic inline message in the center when quiz can't load
   */
  showInlineMessage(message) {
    const sf = this.getScaleFactor();
    const text = this.add.text(this.scale.width / 2, this.scale.height / 2, message, {
      fontFamily: 'Caprasimo-Regular',
      fontSize: `${32 * sf}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
      wordWrap: { width: 800 * sf }
    }).setOrigin(0.5).setDepth(200);

    // Add a back instruction if main hub is available
    this.time.delayedCall(500, () => {
      const hint = this.add.text(this.scale.width / 2, this.scale.height / 2 + 80 * sf, 'Press ESC to return', {
        fontFamily: 'Caprasimo-Regular',
        fontSize: `${20 * sf}px`,
        color: '#ffd54f',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(200);

      this.input.keyboard.once('keydown-ESC', () => {
        this.scene.start('MainHub');
      });
    });
  }
}
