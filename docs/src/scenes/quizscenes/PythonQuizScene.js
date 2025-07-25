import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';
import { PYTHON_TUTORIAL_TRIGGERS, prepareTutorialSteps } from '/src/components/TutorialConfig.js';

export default class PythonQuizScene extends BaseQuizScene {
    constructor() {
        super({ key: 'PythonQuizScene' });
        this.questions = [];
        this.enemyHpBarHeight = 20;
        
        // Python-specific tutorial flags
        this.pythonTutorialFlags = {
            syntaxErrorShown: false,
            pythonConceptsShown: false
        };
        
        // Track wrong answers for syntax tutorial
        this.wrongAnswerStreak = 0;
    }

    init(data) {
        // Set topic and difficulty for point calculation
        const topicData = {
            ...data,
            topic: 'Python', // Use the gameManager topic key
            difficulty: data.difficulty || 'medium' // Default to medium difficulty
        };
        super.init(topicData);
        this.topic = data.topic || 'python'; // Keep for JSON loading
    }    preload() {
        // Call parent preload to load base assets
        super.preload();
        
        this.quizKey = `quizData-${this.topic}`;
        this.load.json(this.quizKey, `data/quizzes/${this.topic}.json`);
    }    create() {
        // Call parent create to initialize tutorial system and base functionality
        super.create();
        
        // Reset Python tutorial flag so the first-time tutorial shows
        localStorage.removeItem('sci-high-python-tutorial-seen');
        
        // Load quiz data
        const quizData = this.cache.json.get(this.quizKey);
        const questions = quizData?.questions || [];

        // Use the setQuestions method to apply randomization
        this.setQuestions(questions);
        
        // Start the quiz (tutorial system will be triggered automatically)
        this.startQuiz();
        
        // Force tutorial check immediately after scene creation
        this.time.delayedCall(100, () => {
            this.checkAndShowTutorial();
        });
    }
    
    /**
     * Override parent method to include Python-specific tutorial checks
     */
    checkAndShowTutorial() {
        // Call parent method for base tutorials
        super.checkAndShowTutorial();
        
        // Don't show Python tutorials if one is already active
        if (this.tutorialManager.isRunning()) {
            return;
        }
        
        // Debug: Log current state
        console.log('PythonQuizScene tutorial check:', {
            topic: this.topic,
            tutorialFlags: this.tutorialFlags,
            pythonTutorialFlags: this.pythonTutorialFlags,
            localStorage: localStorage.getItem('sci-high-python-tutorial-seen')
        });
        
        // Check for Python-specific first-time tutorial
        if (PYTHON_TUTORIAL_TRIGGERS.firstTime(this) && !this.tutorialFlags.firstTimeTutorialShown) {
            this.showPythonTutorial('firstTime');
            this.tutorialFlags.firstTimeTutorialShown = true;
            return;
        }
        
        // Check for timer tutorial
        if (PYTHON_TUTORIAL_TRIGGERS.timer(this) && !this.tutorialFlags.timerTutorialShown) {
            this.showPythonTutorial('timer');
            this.tutorialFlags.timerTutorialShown = true;
            return;
        }
        
        // Check for syntax error tutorial
        if (PYTHON_TUTORIAL_TRIGGERS.syntaxError(this) && !this.pythonTutorialFlags.syntaxErrorShown) {
            this.showPythonTutorial('syntaxError');
            this.pythonTutorialFlags.syntaxErrorShown = true;
            return;
        }
        
        // Check for Python concepts mastery tutorial
        if (PYTHON_TUTORIAL_TRIGGERS.pythonConcepts(this) && !this.pythonTutorialFlags.pythonConceptsShown) {
            this.showPythonTutorial('pythonConcepts');
            this.pythonTutorialFlags.pythonConceptsShown = true;
            return;
        }
        
        // Check for Python victory tutorial
        if (PYTHON_TUTORIAL_TRIGGERS.victory(this) && !this.tutorialFlags.victoryTutorialShown) {
            this.showPythonTutorial('victory');
            this.tutorialFlags.victoryTutorialShown = true;
            return;
        }
    }
    
    /**
     * Show Python-specific tutorial
     * @param {string} tutorialType - Type of Python tutorial to show
     */
    showPythonTutorial(tutorialType) {
        const steps = prepareTutorialSteps(this, tutorialType);
        
        const callbacks = {
            onComplete: () => {
                console.log(`Python tutorial '${tutorialType}' completed`);
                
                // Mark Python tutorial as seen in localStorage
                if (tutorialType === 'firstTime') {
                    localStorage.setItem('sci-high-python-tutorial-seen', 'true');
                }
                
                // Resume game timer if it was paused
                if (this.gameTimer && this.gameTimer.isPaused) {
                    this.gameTimer.resume();
                }
            },
            onSkip: () => {
                console.log(`Python tutorial '${tutorialType}' skipped`);
                
                // Mark as seen even if skipped
                if (tutorialType === 'firstTime') {
                    localStorage.setItem('sci-high-python-tutorial-seen', 'true');
                }
                
                // Resume game timer if it was paused
                if (this.gameTimer && this.gameTimer.isPaused) {
                    this.gameTimer.resume();
                }
            },
            onStepComplete: (stepIndex) => {
                console.log(`Python tutorial step ${stepIndex} completed`);
            }
        };
        
        this.tutorialManager.init(steps, callbacks);
    }
    
    /**
     * Override answer processing to track Python-specific patterns
     */
    checkAnswer(selectedIndex, userAnswer = null) {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        let isCorrect = false;
        
        // Determine if answer is correct (same logic as parent)
        if (currentQuestion.type === 'fill-in-the-blank') {
            const correctAnswers = currentQuestion.correctAnswers || [];
            isCorrect = correctAnswers.some(answer => 
                userAnswer && userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()
            );
        } else if (currentQuestion.type === 'drag-and-drop') {
            isCorrect = selectedIndex === 0 && userAnswer === null;
        } else {
            const correctIndex = currentQuestion.correctIndex;
            isCorrect = selectedIndex === correctIndex;
        }
        
        // Track wrong answer streaks for Python syntax tutorial
        if (isCorrect) {
            this.wrongAnswerStreak = 0; // Reset streak on correct answer
        } else {
            this.wrongAnswerStreak++;
        }
        
        // Call parent method to handle the rest
        const result = super.checkAnswer(selectedIndex, userAnswer);
        
        // Check for Python-specific tutorials after answer processing
        setTimeout(() => {
            this.checkAndShowTutorial();
        }, 750); // Reduced from 1500ms to 750ms
        
        return result;
    }
    
    /**
     * Reset Python-specific tutorial flags
     */
    resetPythonTutorialFlags() {
        this.pythonTutorialFlags = {
            syntaxErrorShown: false,
            pythonConceptsShown: false
        };
        this.wrongAnswerStreak = 0;
        localStorage.removeItem('sci-high-python-tutorial-seen');
    }
}