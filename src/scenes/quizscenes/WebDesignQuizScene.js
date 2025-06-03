import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';

export default class WebDesignQuizScene extends BaseQuizScene {
    constructor() {
        super({ key: 'WebDesignQuizScene' });
    }

    init() {
        console.log('[DEBUG] WebDesignQuizScene init()');
        // Initialize questions in init() instead of create()
        this.questions = [
            {
                question: "What does HTML stand for?",
                options: [
                    "Hyperlinks and Text Markup Language", 
                    "Hyper Text Markup Language", 
                    "Home Tool Markup Language", 
                    "Hyper Text Markup Language"
                ],
                correctIndex: 1
            },
            {
                question: "Which HTML tag is used to define an internal style sheet?",
                options: ["<style>", "<script>", "<css>"],
                correctIndex: 0
            },
            {
                question: "What does CSS stand for?",
                options: ["Colorful Style Sheets", "Cascading Style Sheets", "Creative Style Sheets"],
                correctIndex: 1
            }
        ];
    }

    preload() {

        super.preload();
        this.load.image('webDesignEnemy', 'assets/web-design-enemy.png');
    }

    create() {

        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        console.log('[DEBUG] WebDesignQuizScene create()');
        this.showQuestion();

        this.createBack();
    }

    addEnemy(x, y) {
        return this.add.sprite(x, y, 'webDesignEnemy').setScale(0.5).setOrigin(0.5);
    }
}