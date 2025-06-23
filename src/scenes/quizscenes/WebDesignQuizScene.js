import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';

export default class WebDesignQuizScene extends BaseQuizScene {
    constructor() {
        super({ key: 'WebDesignQuizScene' });
        this.questions = [];
        this.enemyHpBarHeight = 20;
    }

    init(data) {
        super.init(data);
        this.topic = data.topic || 'webdesign';
    }    preload() {
        // Call parent preload to load base assets
        super.preload();
        
        this.quizKey = `quizData-${this.topic}`;
        this.load.json(this.quizKey, `data/quizzes/${this.topic}.json`);
    }create() {
        // Load quiz data
        const quizData = this.cache.json.get(this.quizKey);
        const questions = quizData?.questions || [];

        // Use the setQuestions method to apply randomization
        this.setQuestions(questions);        // Add sound effects (from base class)
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        this.se_comboSound = this.sound.add('se_combo');
        this.se_wrongSound = this.sound.add('se_wrong');
        this.se_hurtSound = this.sound.add('se_hurt');
        this.se_explosionSound = this.sound.add('se_explosion');// DON'T call super.create() - it creates duplicate enemy UI
        // Instead, just start the quiz directly
        this.startQuiz();
    }
}