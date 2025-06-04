import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';

export default class CQuizScene extends BaseQuizScene {
    constructor() {
        super({ key: 'CQuizScene' });
        this.questions = [];
    }

    init(data) {
        this.topic = data.topic || 'C';
    }

    preload() {
        this.quizKey = `quizData-${this.topic}`;
        this.load.json(this.quizKey, `data/quizzes/${this.topic}.json`);
        this.load.image('webDesignEnemy', 'assets/web-design-enemy.png');
    }

    create() {
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        const quizData = this.cache.json.get(this.quizKey);
        this.questions = quizData?.questions || [];

        super.create();
        this.showQuestion();
    }

    addEnemy(x, y) {
        return this.add.sprite(x, y, 'javaEnemy').setScale(0.5).setOrigin(0.5);
    }
}