import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';

export default class CplusplusQuizScene extends BaseQuizScene {
    constructor() {
        super({ key: 'CplusplusQuizScene' });
        this.questions = [];
        this.enemyHpBarHeight = 20;
    }

    init(data) {
        super.init(data);
        this.topic = data.topic || 'C++';
    }

    preload() {
        // Call parent preload to load base assets
        super.preload();
        
        this.quizKey = `quizData-${this.topic}`;
        this.load.json(this.quizKey, `data/quizzes/${this.topic}.json`);
        this.load.image('boxenemy', 'assets/sprites/enemies/box.png');
    }

    create() {
        // Load quiz data
        const quizData = this.cache.json.get(this.quizKey);
        this.questions = quizData?.questions || [];

        // Add sound effects (from base class)
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        
        // Create the back button (from base class)
        createBackButton(this, 'ComputerLab');

        // DON'T call super.create() - it creates duplicate enemy UI
        // Instead, just start the quiz directly
        this.startQuiz()
    }
}