import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';

export default class PythonQuizScene extends BaseQuizScene {
    constructor() {
        super({ key: 'PythonQuizScene' });
        this.questions = [];
    }

    init(data) {
        this.topic = data.topic || 'python';
    }

    preload() {

        super.preload();
        this.load.image('pythonEnemy', 'assets/web-design-enemy.png');
        this.load.json('quizData', `data/quizzes/python.json`);
    }

    create() {
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        const quizData = this.cache.json.get('quizData');
        this.questions = quizData.questions || [];

        super.create();
        this.showQuestion();
    }


    addEnemy(x, y) {
        return this.add.sprite(x, y, 'pythonEnemy').setScale(0.5).setOrigin(0.5);
    }
}