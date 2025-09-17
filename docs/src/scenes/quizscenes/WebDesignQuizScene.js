import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';
import { WEB_DESIGN_TUTORIAL_TRIGGERS } from '/src/components/TutorialConfig.js';

export default class WebDesignQuizScene extends BaseQuizScene {
    constructor() {
        super({ key: 'WebDesignQuizScene' });
        this.questions = [];
        this.enemyHpBarHeight = 20;
        
        // Web Design specific tutorial flags
        this.webDesignTutorialFlags = {
            firstTimeTutorialShown: false,
            comboTutorialShown: false,
            lowHealthWarningShown: false,
            victoryTutorialShown: false
        };
    }

    init(data) {
        // Set topic and difficulty for point calculation
        const topicData = {
            ...data,
            topic: 'Web Design', // Use the gameManager topic key
            difficulty: data.difficulty || 'medium' // Default to medium difficulty
        };
        super.init(topicData);
        this.topic = data.topic || 'webdesign'; // Keep for JSON loading
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

    /**
     * Override the checkAndShowTutorial method to include Web Design specific tutorials
     */
    checkAndShowTutorial() {
        // Don't show tutorials if one is already active
        if (this.tutorialManager.isRunning()) {
            return;
        }
        
        // Check for Web Design first-time tutorial
        if (WEB_DESIGN_TUTORIAL_TRIGGERS.firstTime(this) && !this.webDesignTutorialFlags.firstTimeTutorialShown) {
            this.showWebDesignTutorial('firstTime');
            this.webDesignTutorialFlags.firstTimeTutorialShown = true;
            return;
        }
        
        // Check for Web Design combo tutorial
        if (WEB_DESIGN_TUTORIAL_TRIGGERS.combo(this) && !this.webDesignTutorialFlags.comboTutorialShown) {
            this.showWebDesignTutorial('combo');
            this.webDesignTutorialFlags.comboTutorialShown = true;
            return;
        }
        
        // Check for Web Design low health tutorial
        if (WEB_DESIGN_TUTORIAL_TRIGGERS.lowHealth(this) && !this.webDesignTutorialFlags.lowHealthWarningShown) {
            this.showWebDesignTutorial('lowHealth');
            this.webDesignTutorialFlags.lowHealthWarningShown = true;
            return;
        }
        
        // Fall back to base class tutorial checks
        super.checkAndShowTutorial();
    }

    /**
     * Show Web Design specific tutorial
     * @param {string} tutorialType - Type of Web Design tutorial to show
     */
    showWebDesignTutorial(tutorialType) {
        // Import prepareTutorialSteps function dynamically to avoid circular imports
        import('/src/components/TutorialConfig.js').then(module => {
            const steps = module.prepareTutorialSteps(this, tutorialType);
            
            const callbacks = {
                onComplete: async () => {
                    console.log(`Web Design tutorial '${tutorialType}' completed`);
                    
                    // Mark Web Design tutorial as seen in localStorage
                    if (tutorialType === 'firstTime') {
                        localStorage.setItem('sci-high-webdesign-tutorial-seen', 'true');
                    } else if (tutorialType === 'combo') {
                        localStorage.setItem('sci-high-webdesign-combo-tutorial-seen', 'true');
                    } else if (tutorialType === 'lowHealth') {
                        localStorage.setItem('sci-high-webdesign-lowhealth-tutorial-seen', 'true');
                    } else if (tutorialType === 'victory') {
                        localStorage.setItem('sci-high-webdesign-victory-tutorial-seen', 'true');
                        // Re-show victory screen after victory tutorial
                        const { showVictory } = await import('/src/scenes/quizscenes/ui/feedbackUI.js');
                        showVictory(this);
                        return; // Don't resume game timer since we're showing victory screen
                    }
                    
                    // Resume game timer if it was paused
                    if (this.gameTimer && this.gameTimer.isPaused) {
                        this.gameTimer.resume();
                    }
                },
                onSkip: async () => {
                    console.log(`Web Design tutorial '${tutorialType}' skipped`);
                    
                    // Mark as seen even if skipped
                    if (tutorialType === 'firstTime') {
                        localStorage.setItem('sci-high-webdesign-tutorial-seen', 'true');
                    } else if (tutorialType === 'combo') {
                        localStorage.setItem('sci-high-webdesign-combo-tutorial-seen', 'true');
                    } else if (tutorialType === 'lowHealth') {
                        localStorage.setItem('sci-high-webdesign-lowhealth-tutorial-seen', 'true');
                    } else if (tutorialType === 'victory') {
                        localStorage.setItem('sci-high-webdesign-victory-tutorial-seen', 'true');
                        // Re-show victory screen after victory tutorial is skipped
                        const { showVictory } = await import('/src/scenes/quizscenes/ui/feedbackUI.js');
                        showVictory(this);
                        return; // Don't resume game timer since we're showing victory screen
                    }
                    
                    // Resume game timer if it was paused
                    if (this.gameTimer && this.gameTimer.isPaused) {
                        this.gameTimer.resume();
                    }
                }
            };

            // Pause game timer during tutorial
            if (this.gameTimer && !this.gameTimer.isPaused) {
                this.gameTimer.pause();
            }

            this.tutorialManager.init(steps, callbacks);
        });
    }

    /**
     * Check and show victory tutorial during victory dialogue
     */
    checkAndShowVictoryTutorial() {
        // Check for Web Design victory tutorial
        if (WEB_DESIGN_TUTORIAL_TRIGGERS.victory(this) && !this.webDesignTutorialFlags.victoryTutorialShown) {
            this.showWebDesignTutorial('victory');
            this.webDesignTutorialFlags.victoryTutorialShown = true;
            return true; // Return true to indicate tutorial was shown
        }
        return false; // Return false to indicate no tutorial was shown
    }

    /**
     * Override the enemyDefeated method to include victory tutorial check
     */
    enemyDefeated(enemy) {
        super.enemyDefeated(enemy);
        
        // Check and show victory tutorial if applicable
        this.checkAndShowVictoryTutorial();
    }
}