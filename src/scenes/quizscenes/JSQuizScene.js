import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';

export default class JavaScriptQuizScene extends BaseQuizScene {
    constructor() {
        super({ key: 'JavaScriptQuizScene' });
        
        this.questions = [
            {
                question: "What is the result of '2' + 2 in JavaScript?",
                options: ["4", "22", "NaN", "Error"],
                correctIndex: 1
            },
            {
                question: "Which keyword is used to declare a variable in ES6?",
                options: ["var", "let", "const", "both let and const"],
                correctIndex: 3
            }
        ];
    }

    preload() {
        super.preload();
        this.load.image('jsEnemy', 'assets/javascript-enemy.png');
    }

    addEnemy(x, y) {
        return this.add.sprite(x, y, 'jsEnemy').setScale(0.5).setOrigin(0.5);
    }
}