// Import the GameTimer class
import GameTimer from '/src/components/GameTimer.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';
import { createPlayerUI } from './ui/playerUI.js';
import { createQuizBox, createEnemyUI, createTimerText, createQuestionAndOptions } from './ui/quizUI.js';
import { showFeedback, showVictory, showGameOver } from './ui/feedbackUI.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class BaseQuizScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.quizElements = [];
        this.persistentElements = [];
        this.enemyHpBarHeight = 10;
        this.gameTimer = null;
        this.playerConfig = {
            maxHP: 100,
            currentHP: 100,
            label: 'Player'
        };
        this.enemyHPState = {
            currentHP: 100,
            maxHP: 100
        };
        this.scaleFactor = 1;
    }

    getScaleFactor() {
        const { width, height } = this.scale.gameSize;
        return Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    }

    init(data) {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.questions = [];
        this.isQuizStarted = false;
        this.enemyConfig = data.enemyConfig || {
            spriteKey: 'boxenemy',
            maxHP: 100,
            label: 'Enemy',
        };
        this.playerConfig = {
            maxHP: 100,
            currentHP: 100,
            label: 'Player'
        };
        this.enemyHPState = {
            currentHP: this.enemyConfig.maxHP,
            maxHP: this.enemyConfig.maxHP
        };
        this.gameTimer = new GameTimer(this);
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('goblin', 'assets/enemies/goblin.png');
        this.load.image('dragon', 'assets/enemies/dragon.png');
        this.load.image('boxenemy', 'assets/sprites/enemies/box.png');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        if (!this.enemyConfig) {
            console.error('enemyConfig is undefined!');
            return;
        }
        this.scale.on('resize', this.onResize, this);
        this.updateScaleAndLayout();
    }

    onResize() {
        this.updateScaleAndLayout();
    }

    updateScaleAndLayout() {
        this.scaleFactor = this.getScaleFactor();
        if (this.isQuizStarted && this.questions && this.currentQuestionIndex < this.questions.length) {
            this.showQuestion();
        }
    }

    handleTimeUp() {
        showGameOver(this);
    }

    startQuiz(initialTime = 30) {
        if (!this.isQuizStarted) {
            this.isQuizStarted = true;
            const sf = this.scaleFactor;
            const centerX = this.scale.width / 2;
            const centerY = this.scale.height / 2;
            const boxWidth = 600 * sf;
            const boxHeight = 340 * sf;
            const boxTopY = centerY - boxHeight / 2;
            const boxRightX = centerX + boxWidth / 2;
            // Timer above the box, right-aligned
            const timerElements = this.gameTimer.create(boxRightX - 16 * sf, boxTopY - 38 * sf, initialTime);
            if (timerElements.timerBackground && timerElements.timerBackground.setDepth) {
                timerElements.timerBackground.setDepth(130);
            }
            if (timerElements.timerText && timerElements.timerText.setDepth) {
                timerElements.timerText.setDepth(130);
            }
            this.persistentElements.push(timerElements.timerBackground, timerElements.timerText);
        }
        this.showQuestion();
    }

    showQuestion() {
        this.isAnswering = false; // <-- Reset answering state at the start of every question
        this.scaleFactor = this.getScaleFactor();
        const sf = this.scaleFactor;
        if (!this.questions || this.currentQuestionIndex >= this.questions.length) {
            showVictory(this);
            return;
        }
        const { question, options } = this.questions[this.currentQuestionIndex];
        this.cleanupQuestionElements();

        // Layout
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const boxWidth = 600 * sf;
        const boxHeight = 340 * sf;
        const boxTopY = centerY - boxHeight / 2;

        // Quiz box
        createQuizBox(this, centerX, centerY, boxWidth, boxHeight, 20 * sf);

        // Enemy UI (above the box)
        const enemyUI = createEnemyUI(this, centerX, boxTopY, sf);
        this.enemyContainer = enemyUI.enemyContainer;

        // Question and options (inside the box)
        createQuestionAndOptions(
            this,
            centerX,
            centerY,
            boxWidth,
            boxHeight,
            this.currentQuestionIndex,
            question,
            options,
            sf,
            (index) => this.checkAnswer(index)
        );

        // Player UI (below the box)
        const playerX = centerX;
        const playerY = centerY + boxHeight / 2 + 70 * sf;
        this.playerContainer = createPlayerUI(this, playerX, playerY, this.playerConfig, sf);
        this.quizElements.push(this.playerContainer);
    }

    cleanupQuestionElements() {
        this.quizElements.forEach(el => {
            if (el && el.active) el.destroy();
        });
        this.quizElements = [];
        this.enemyContainer = null;
        this.playerContainer = null;
        this._quizOptionBgs = []; // <-- Clear option backgrounds to avoid stale references
    }

    damageCharacter(container, amount) {
        const sf = this.scaleFactor;
        let hp = container.getData('currentHP');
        const maxHP = container.getData('maxHP');
        hp = Phaser.Math.Clamp(hp - amount, 0, maxHP);
        container.setData('currentHP', hp);

        const isPlayer = container.getData('label') === 'Player';
        if (isPlayer) {
            this.playerConfig.currentHP = hp;
        } else {
            this.enemyHPState.currentHP = hp;
        }

        const hpBar = container.getData('hpBar');
        hpBar.clear();
        const barColor = isPlayer ? 0x00ff00 : 0xff0000;
        hpBar.fillStyle(barColor, 1);

        if (isPlayer) {
            hpBar.fillRect(-60 * sf, 50 * sf, (hp / maxHP) * 120 * sf, 12 * sf);
        } else {
            // Enemy HP bar is always at the same position relative to the enemy sprite
            const hpBarWidth = 100 * sf;
            hpBar.fillRect(-hpBarWidth / 2, -58 * sf, (hp / maxHP) * hpBarWidth, 10 * sf);
        }

        const hpText = container.getData('hpText');
        const label = container.getData('label');
        const hpDisplay = isPlayer ? `${hp}/${maxHP}` : hp;
        hpText.setText(`${label} HP: ${hpDisplay}`);
    }

    checkAnswer(selectedIndex) {
        if (this.isAnswering) return;
        this.isAnswering = true;
        const correctIndex = this.questions[this.currentQuestionIndex].correctIndex;

        // Calculate feedback position below the quiz box, 20% lower
        const sf = this.scaleFactor;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const boxHeight = 340 * sf;
        // Move feedbackY 20% lower than the previous offset
        const feedbackY = centerY + boxHeight / 2 + (20 * sf * 1.2);

        // --- Pause the timer ---
        this.gameTimer.pause();

        if (selectedIndex === correctIndex) {
            this.score++;
            showFeedback(this, "Correct! You attack the enemy!", 0x00ff00, centerX, feedbackY);
            this.gameTimer.addTime(5);
            if (this.enemyContainer) {
                this.damageCharacter(this.enemyContainer, 20);
            }
        } else {
            showFeedback(this, "Wrong! The enemy attacks you!", 0xff0000, centerX, feedbackY);
            this.gameTimer.subtractTime(3);
            if (this.playerContainer) {
                this.damageCharacter(this.playerContainer, 15);
            }
            const playerHP = this.playerContainer.getData('currentHP');
            if (playerHP <= 0) {
                // --- Resume timer before ending ---
                this.gameTimer.resume();
                showGameOver(this);
                return;
            }
        }
        if (this.enemyContainer) {
            const enemyHP = this.enemyContainer.getData('currentHP');
            if (enemyHP <= 0) {
                // --- Resume timer before ending ---
                this.gameTimer.resume();
                showVictory(this);
                return;
            }
        }
        // --- Wait 1 second before next question or ending ---
        this.time.delayedCall(1000, () => {
            // If this is the last question, show victory after the delay
            if (this.currentQuestionIndex >= this.questions.length - 1) {
                this.gameTimer.resume();
                showVictory(this);
                return;
            }
            this.currentQuestionIndex++;
            this.isAnswering = false;
            this.showQuestion();
            // --- Resume timer after showing next question ---
            this.gameTimer.resume();
        });
    }

    restartQuiz() {
        this.score = 0;
        this.currentQuestionIndex = 0;
        this.isQuizStarted = false;
        this.isAnswering = false; // <-- Reset answering state
        this.playerConfig.currentHP = this.playerConfig.maxHP;
        this.enemyHPState.currentHP = this.enemyHPState.maxHP;
        this.cleanupAllElements();
        this.gameTimer = new GameTimer(this);
        this.startQuiz(30);
        createBackButton(this, 'ComputerLab');
    }

    cleanupAllElements() {
        this.cleanupQuestionElements();
        this.cleanupPersistentElements();
    }

    cleanupPersistentElements() {
        this.persistentElements.forEach(el => {
            if (el && el.active) el.destroy();
        });
        this.persistentElements = [];
    }
}