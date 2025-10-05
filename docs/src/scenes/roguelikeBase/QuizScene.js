import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';
import { getScaleInfo } from '../../utils/mobileUtils.js';

// Quiz UI color palette (centralized for easy tweaking)
// Panel: semi-transparent dark background (80% opacity)
// Buttons default: soft yellow with golden border
// Correct: bright green with darker green border
// Wrong: vivid magenta/pink with darker border
const QUIZ_UI_COLORS = {
    panelFill: 0x222222,
    panelOpacity: 0.8,
    panelBorder: 0x111111,
    buttonDefaultFill: 0xF9DD72,
    buttonDefaultHover: 0xFFE58A,
    buttonDefaultBorder: 0xB8860B,
    buttonDefaultHoverBorder: 0xDAA520,
    correctFill: 0x00FF4E,
    correctBorder: 0x008F2A,
    wrongFill: 0xFF0066,
    wrongBorder: 0x8B002F
};

export default class QuizScene extends BaseScene {
    constructor() {
        super('QuizScene');
        
        // Quiz properties
        this.currentQuestion = null;
        this.quizData = null;
        this.enemyData = null;
        this.gameplayState = null;
        this.questionIndex = 0;
        this.selectedAnswer = null;
        
        // UI elements
        this.questionText = null;
        this.answerButtons = [];
        this.titleText = null;
        this.quizContainer = null;
        this.resultContainer = null;
        this.tooltipText = null;
    }

    init(data) {
        // Receive data from main gameplay scene
        this.courseTopic = data.courseTopic;
        this.enemyData = data.enemyToDestroy;
        this.intensity = data.intensity || 1;
        // Reworked intensity mapping:
        // 1: multipleChoice only
        // 2: syntaxBlock only
        // 3: codeArrangement only
        // 4+: mixed (all types)
        this.answeredQuestions = data.answeredQuestions || {
            intensity1: { multipleChoice: [] },
            intensity2: { syntaxBlock: [] },
            intensity3: { codeArrangement: [] }
        };
        this.selectedAnswer = null;
        this.currentQuestion = null;
        this.customQuiz = data.customQuiz || null;
        this.customQuizAnswered = new Set(data.customQuizAnswered || []);
        
    }

    preload() {
        // Load quiz data files
        this.load.json('pythonQuiz', 'data/quizzes/python.json');
        this.load.json('javaQuiz', 'data/quizzes/java.json');
        this.load.json('cQuiz', 'data/quizzes/C.json');
        this.load.json('cppQuiz', 'data/quizzes/C++.json');
        this.load.json('csharpQuiz', 'data/quizzes/csharp.json');
        this.load.json('webdesignQuiz', 'data/quizzes/webdesign.json');
    }

    create() {
        super.create();
        
        // Initialize answer submission flag
        this.answerSubmitted = false;
        this.timerExpired = false; // Add timer expiration flag
        
        // Listen for timer events from main gameplay scene
        const mainScene = this.scene.get('MainGameplay');
        if (mainScene) {
            mainScene.events.on('timer-expired', this.handleTimerExpired, this);
        }
        
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        

        
        // Load appropriate quiz data based on course topic
        if (this.courseTopic === 'custom' && this.customQuiz) {
            this.loadCustomQuizQuestion();
        } else {
            this.loadQuizData();
        }
        
        // Validate that we have quiz data and create interface
        if (this.currentQuestion) {
            this.createQuizInterface();
        } else {
            console.error('No quiz data available for topic:', this.courseTopic, 'intensity:', this.intensity);
            // Show a brief error message before returning to gameplay
            const errorText = this.add.text(
                this.scale.width / 2, 
                this.scale.height / 2, 
                'No quiz questions available!\nReturning to game...', 
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '32px',
                    color: '#ff0000',
                    align: 'center'
                }
            );
            errorText.setOrigin(0.5);
            errorText.setDepth(20);
            
            // Return to gameplay after a short delay
            this.time.delayedCall(2000, () => {
                this.returnToGameplay(false);
            });
        }
    }

    loadQuizData() {
        // New mapping:
        // 1 -> multiple choice only
        // 2 -> syntaxBlock only
        // 3 -> codeArrangement only
        // 4+ -> combined pool of all available types
        if (this.intensity >= 4) {
            this.loadCombinedMaxIntensityQuestion();
            if (!this.currentQuestion) {
                // fallback degrade path
                this.loadCodeArrangementQuestion();
                if (!this.currentQuestion) this.loadSyntaxBlockQuestion();
                if (!this.currentQuestion) this.loadMultipleChoiceQuestion(1);
            }
            return;
        }
        if (this.intensity === 3) {
            this.loadCodeArrangementQuestion();
            if (!this.currentQuestion) {
                // minimal fallback to keep quiz flowing
                this.loadMultipleChoiceQuestion(1);
            }
            return;
        }
        if (this.intensity === 2) {
            this.loadSyntaxBlockQuestion();
            if (!this.currentQuestion) {
                // fallback to multiple choice if no syntaxBlock present
                this.loadMultipleChoiceQuestion(1);
            }
            return;
        }
        // intensity 1
        this.loadMultipleChoiceQuestion(1);
        if (!this.currentQuestion) {
            // fallback search higher pools
            this.loadMultipleChoiceQuestion(2);
            if (!this.currentQuestion) this.loadMultipleChoiceQuestion(3);
        }
    }

    loadCustomQuizQuestion() {
        if (!this.customQuiz || !Array.isArray(this.customQuiz.questions)) return;
        const remaining = this.customQuiz.questions.filter((q, idx) => !this.customQuizAnswered.has(idx));
        if (remaining.length === 0) {
            // All answered; simple recycle or end early
            this.customQuizAnswered.clear();
        }
        const pool = this.customQuiz.questions.filter((q, idx) => !this.customQuizAnswered.has(idx));
        if (pool.length === 0) return; // Still nothing
        const idxInPool = Math.floor(Math.random() * pool.length);
        const question = pool[idxInPool];
        // Track index globally
        const globalIndex = this.customQuiz.questions.indexOf(question);
        this.customQuizAnswered.add(globalIndex);
        // Normalize shape expected by existing UI
        this.currentQuestion = {
            question: question.question || 'Untitled Question',
            options: question.options || [],
            correctIndex: typeof question.correctIndex === 'number' ? question.correctIndex : 0,
            type: 'multiple-choice'
        };
        // Build minimal quizData format used by createQuizInterface / answer handlers
        this.quizData = { questions: [ this.currentQuestion ] };
    }

    loadMultipleChoiceQuestion(intensityLevel) {
        // Get quiz data based on course topic
        const topic = this.courseTopic || 'python';
        let quizData = null;
        
        switch (topic.toLowerCase()) {
            case 'python':
                quizData = this.cache.json.get('pythonQuiz');
                break;
            case 'java':
                quizData = this.cache.json.get('javaQuiz');
                break;
            case 'c':
                quizData = this.cache.json.get('cQuiz');
                break;
            case 'c++':
                quizData = this.cache.json.get('cppQuiz');
                break;
            case 'c#':
            case 'csharp':
                quizData = this.cache.json.get('csharpQuiz');
                break;
            case 'webdesign':
                quizData = this.cache.json.get('webdesignQuiz');
                break;
            default:
                quizData = this.cache.json.get('pythonQuiz');
                break;
        }
        
        // Try to load from intensity-specific structure first
        const intensityKey = `intensity${intensityLevel}`;
        if (quizData && quizData[intensityKey] && quizData[intensityKey].multipleChoice && quizData[intensityKey].multipleChoice.length > 0) {
            // Filter out already answered questions
            const availableQuestions = this.filterAnsweredQuestions(
                quizData[intensityKey].multipleChoice, 
                intensityLevel, 
                'multipleChoice'
            );
            
            if (availableQuestions.length > 0) {
                // Select a random multiple choice question from the available questions
                this.currentQuestion = Phaser.Utils.Array.GetRandom(availableQuestions);
                
                // Randomize answer choices if there are more than 2 options
                if (this.currentQuestion.options.length > 2) {
                    this.randomizeAnswerChoices();
                }
                return; // Successfully loaded
            }
        }
        
        // For intensity 3, also check codeArrangement section (some quizzes have multiple choice there)
        if (intensityLevel === 3 && quizData && quizData[intensityKey] && quizData[intensityKey].codeArrangement && quizData[intensityKey].codeArrangement.length > 0) {
            // Check if codeArrangement questions are actually multiple choice
            const codeQuestions = quizData[intensityKey].codeArrangement.filter(q => 
                q.options && Array.isArray(q.options) && typeof q.correctIndex === 'number'
            );
            
            if (codeQuestions.length > 0) {
                const availableQuestions = this.filterAnsweredQuestions(
                    codeQuestions, 
                    intensityLevel, 
                    'codeArrangement' // Use codeArrangement tracking to avoid conflicts
                );
                
                if (availableQuestions.length > 0) {
                    this.currentQuestion = Phaser.Utils.Array.GetRandom(availableQuestions);
                    
                    // Randomize answer choices if there are more than 2 options
                    if (this.currentQuestion.options.length > 2) {
                        this.randomizeAnswerChoices();
                    }
                    return; // Successfully loaded
                }
            }
        }
        
        // Fallback to old structure for compatibility
        if (quizData && quizData.questions && quizData.questions.length > 0) {
            // Fallback to old structure for compatibility
            const multipleChoiceQuestions = quizData.questions.filter(q => 
                q.options && Array.isArray(q.options) && typeof q.correctIndex === 'number'
            );
            
            // Filter out already answered questions
            const availableQuestions = this.filterAnsweredQuestions(
                multipleChoiceQuestions, 
                intensityLevel, 
                'multipleChoice'
            );
            
            if (availableQuestions.length > 0) {
                this.currentQuestion = Phaser.Utils.Array.GetRandom(availableQuestions);
                
                // Randomize answer choices if there are more than 2 options
                if (this.currentQuestion.options.length > 2) {
                    this.randomizeAnswerChoices();
                }
            }
        }
    }

    loadDragDropQuestion() {
        // Get quiz data based on course topic for intensity 2 drag-drop questions
        const topic = this.courseTopic || 'python';
        let quizData = null;
        
        switch (topic.toLowerCase()) {
            case 'python':
                quizData = this.cache.json.get('pythonQuiz');
                break;
            case 'java':
                quizData = this.cache.json.get('javaQuiz');
                break;
            case 'c':
                quizData = this.cache.json.get('cQuiz');
                break;
            case 'c++':
                quizData = this.cache.json.get('cppQuiz');
                break;
            case 'c#':
            case 'csharp':
                quizData = this.cache.json.get('csharpQuiz');
                break;
            case 'webdesign':
                quizData = this.cache.json.get('webdesignQuiz');
                break;
            default:
                quizData = this.cache.json.get('pythonQuiz');
                break;
        }
        
        if (quizData && quizData.intensity2 && quizData.intensity2.dragDrop && quizData.intensity2.dragDrop.length > 0) {
            // Filter out already answered questions
            const availableQuestions = this.filterAnsweredQuestions(
                quizData.intensity2.dragDrop, 
                2, 
                'dragDrop'
            );
            
            if (availableQuestions.length > 0) {
                // Select a random drag-drop question from the available questions
                this.currentQuestion = Phaser.Utils.Array.GetRandom(availableQuestions);
            }
        }
    }

    loadSyntaxBlockQuestion() {
        // Syntax block selection questions (intensity 2)
        const topic = this.courseTopic || 'python';
        let quizData = null;
        switch (topic.toLowerCase()) {
            case 'python': quizData = this.cache.json.get('pythonQuiz'); break;
            case 'java': quizData = this.cache.json.get('javaQuiz'); break;
            case 'c': quizData = this.cache.json.get('cQuiz'); break;
            case 'c++': quizData = this.cache.json.get('cppQuiz'); break;
            case 'c#':
            case 'csharp': quizData = this.cache.json.get('csharpQuiz'); break;
            case 'webdesign': quizData = this.cache.json.get('webdesignQuiz'); break;
            default: quizData = this.cache.json.get('pythonQuiz'); break;
        }
        if (!quizData) return;
        let pool = [];
        if (quizData.intensity2 && Array.isArray(quizData.intensity2.syntaxBlock)) {
            pool = pool.concat(quizData.intensity2.syntaxBlock.map(q => ({...q, type: 'syntaxBlock'})));
        }
        // Backward compatibility: syntaxBlock stored under multipleChoice
        if (quizData.intensity2 && Array.isArray(quizData.intensity2.multipleChoice)) {
            pool = pool.concat(quizData.intensity2.multipleChoice.filter(q => q.type === 'syntaxBlock'));
        }
        ['intensity1','intensity3'].forEach(key => {
            if (quizData[key] && quizData[key].multipleChoice) {
                pool = pool.concat(quizData[key].multipleChoice.filter(q => q.type === 'syntaxBlock'));
            }
        });
        if (quizData.questions) {
            pool = pool.concat(quizData.questions.filter(q => q.type === 'syntaxBlock'));
        }
        if (pool.length === 0) return;
        const available = this.filterAnsweredQuestions(pool, 2, 'syntaxBlock');
        const pick = available.length > 0 ? available : pool;
        this.currentQuestion = Phaser.Utils.Array.GetRandom(pick);
    }

    loadCodeArrangementQuestion() {
        // Get quiz data based on course topic for intensity 3 code arrangement
        const topic = this.courseTopic || 'python';
        let quizData = null;
        
        switch (topic.toLowerCase()) {
            case 'python':
                quizData = this.cache.json.get('pythonQuiz');
                break;
            case 'java':
                quizData = this.cache.json.get('javaQuiz');
                break;
            case 'c':
                quizData = this.cache.json.get('cQuiz');
                break;
            case 'c++':
                quizData = this.cache.json.get('cppQuiz');
                break;
            case 'c#':
            case 'csharp':
                quizData = this.cache.json.get('csharpQuiz');
                break;
            case 'webdesign':
                quizData = this.cache.json.get('webdesignQuiz');
                break;
            default:
                quizData = this.cache.json.get('pythonQuiz');
                break;
        }
        
        // Try to load from intensity3 structure first
        if (quizData && quizData.intensity3 && quizData.intensity3.codeArrangement && quizData.intensity3.codeArrangement.length > 0) {
            const availableQuestions = this.filterAnsweredQuestions(
                quizData.intensity3.codeArrangement,
                3,
                'codeArrangement'
            );
            if (availableQuestions.length > 0) {
                const picked = Phaser.Utils.Array.GetRandom(availableQuestions);
                // Normalize shape so routing & getQuestionType detect properly
                this.currentQuestion = {
                    ...picked,
                    type: 'codeArrangement',
                    sourceType: 'codeArrangement',
                    isDragDrop: true
                };
            }
        } else if (quizData && quizData.codeArrangement && quizData.codeArrangement.length > 0) {
            const availableQuestions = this.filterAnsweredQuestions(
                quizData.codeArrangement,
                3,
                'codeArrangement'
            );
            if (availableQuestions.length > 0) {
                const picked = Phaser.Utils.Array.GetRandom(availableQuestions);
                this.currentQuestion = {
                    ...picked,
                    type: 'codeArrangement',
                    sourceType: 'codeArrangement',
                    isDragDrop: true
                };
            }
        }
    }

    loadCombinedIntensity3Question() {
        // This method combines all available questions for intensity 3 when code arrangement is exhausted
        const topic = this.courseTopic || 'python';
        let quizData = null;
        
        switch (topic.toLowerCase()) {
            case 'python':
                quizData = this.cache.json.get('pythonQuiz');
                break;
            case 'java':
                quizData = this.cache.json.get('javaQuiz');
                break;
            case 'c':
                quizData = this.cache.json.get('cQuiz');
                break;
            case 'c++':
                quizData = this.cache.json.get('cppQuiz');
                break;
            case 'c#':
            case 'csharp':
                quizData = this.cache.json.get('csharpQuiz');
                break;
            case 'webdesign':
                quizData = this.cache.json.get('webdesignQuiz');
                break;
            default:
                quizData = this.cache.json.get('pythonQuiz');
                break;
        }

        if (!quizData) {
            return;
        }

        // Collect all available questions from intensity 3
        let allQuestions = [];
        
        // Add intensity 3 multiple choice questions
        if (quizData.intensity3 && quizData.intensity3.multipleChoice && quizData.intensity3.multipleChoice.length > 0) {
            allQuestions = allQuestions.concat(quizData.intensity3.multipleChoice.map(q => ({...q, sourceType: 'multipleChoice'})));
        }
        
        // Add intensity 3 code arrangement questions
        if (quizData.intensity3 && quizData.intensity3.codeArrangement && quizData.intensity3.codeArrangement.length > 0) {
            allQuestions = allQuestions.concat(quizData.intensity3.codeArrangement.map(q => ({...q, sourceType: 'codeArrangement'})));
        }

        // If no intensity 3 questions, fall back to other sources
        if (allQuestions.length === 0) {
            // Try intensity 2 questions as fallback
            if (quizData.intensity2) {
                if (quizData.intensity2.multipleChoice && quizData.intensity2.multipleChoice.length > 0) {
                    allQuestions = allQuestions.concat(quizData.intensity2.multipleChoice.map(q => ({...q, sourceType: 'multipleChoice'})));
                }
                if (quizData.intensity2.dragDrop && quizData.intensity2.dragDrop.length > 0) {
                    allQuestions = allQuestions.concat(quizData.intensity2.dragDrop.map(q => ({...q, sourceType: 'dragDrop'})));
                }
            }
            
            // Try intensity 1 questions as final fallback
            if (allQuestions.length === 0 && quizData.intensity1 && quizData.intensity1.multipleChoice && quizData.intensity1.multipleChoice.length > 0) {
                allQuestions = allQuestions.concat(quizData.intensity1.multipleChoice.map(q => ({...q, sourceType: 'multipleChoice'})));
            }
        }

        if (allQuestions.length === 0) {
            return;
        }

        // Use special filtering for combined questions
        const availableQuestions = this.filterCombinedQuestions(allQuestions);
        
        if (availableQuestions.length > 0) {
            this.currentQuestion = Phaser.Utils.Array.GetRandom(availableQuestions);
            
            // Set appropriate flags based on source type
            if (this.currentQuestion.sourceType === 'codeArrangement' || this.currentQuestion.sourceType === 'dragDrop') {
                this.currentQuestion.isDragDrop = true;
            }
            
            // Randomize answer choices if applicable
            if (this.currentQuestion.options && this.currentQuestion.options.length > 2) {
                this.randomizeAnswerChoices();
            }
            
        } else {
        }
    }

    loadCombinedMaxIntensityQuestion() {
        // Intensity 4+: combine every question type
        const topic = this.courseTopic || 'python';
        let quizData = null;
        switch (topic.toLowerCase()) {
            case 'python': quizData = this.cache.json.get('pythonQuiz'); break;
            case 'java': quizData = this.cache.json.get('javaQuiz'); break;
            case 'c': quizData = this.cache.json.get('cQuiz'); break;
            case 'c++': quizData = this.cache.json.get('cppQuiz'); break;
            case 'c#':
            case 'csharp': quizData = this.cache.json.get('csharpQuiz'); break;
            case 'webdesign': quizData = this.cache.json.get('webdesignQuiz'); break;
            default: quizData = this.cache.json.get('pythonQuiz'); break;
        }
        if (!quizData) return;
        let all = [];
        const add = (arr, type) => { if (Array.isArray(arr)) all = all.concat(arr.map(q => ({...q, sourceType: type}))); };
        ['intensity3','intensity2','intensity1'].forEach(level => {
            const bucket = quizData[level];
            if (!bucket) return;
            add(bucket.multipleChoice, 'multipleChoice');
            add(bucket.syntaxBlock, 'syntaxBlock');
            add(bucket.dragDrop, 'dragDrop');
            add(bucket.codeArrangement, 'codeArrangement');
        });
        if (quizData.questions) add(quizData.questions.filter(q => q.options), 'multipleChoice');
        if (all.length === 0) return;
        const available = this.filterCombinedQuestionsMax(all);
        if (available.length === 0) return; // filter handles reset
        this.currentQuestion = Phaser.Utils.Array.GetRandom(available);
        if (this.currentQuestion.sourceType === 'codeArrangement' || this.currentQuestion.sourceType === 'dragDrop') {
            this.currentQuestion.isDragDrop = true;
        }
        if (this.currentQuestion.options && this.currentQuestion.options.length > 2) this.randomizeAnswerChoices();
    }

    randomizeAnswerChoices() {
        if (!this.currentQuestion || !this.currentQuestion.options || this.currentQuestion.options.length <= 2) {
            return; // Don't randomize if there are 2 or fewer options
        }
        
        const originalOptions = [...this.currentQuestion.options];
        const originalCorrectIndex = this.currentQuestion.correctIndex;
        const correctAnswer = originalOptions[originalCorrectIndex];
        
        // Create array of indices to shuffle
        const indices = Array.from({ length: originalOptions.length }, (_, i) => i);
        
        // Shuffle the indices using Phaser's shuffle utility
        Phaser.Utils.Array.Shuffle(indices);
        
        // Create new shuffled options array
        const shuffledOptions = indices.map(index => originalOptions[index]);
        
        // Find the new position of the correct answer
        const newCorrectIndex = shuffledOptions.findIndex(option => option === correctAnswer);
        
        // Update the question with shuffled options and new correct index
        this.currentQuestion.options = shuffledOptions;
        this.currentQuestion.correctIndex = newCorrectIndex;
        
    }

    filterCombinedQuestions(questions) {
        // Special filtering for combined intensity 3 questions that tracks all question types together
        if (!this.answeredQuestions) {
            return questions;
        }

        // Use a special combined tracker for intensity 3
        const intensityKey = 'intensity3';
        if (!this.answeredQuestions[intensityKey]) {
            this.answeredQuestions[intensityKey] = {
                multipleChoice: [],
                dragDrop: [],
                codeArrangement: [],
                combined: [] // Special tracker for combined pool
            };
        }

    const combinedSet = this.answeredQuestions[intensityKey].combined;

        // Filter out questions that have already been answered in the combined pool
        const availableQuestions = questions.filter(question => {
            const questionId = this.createQuestionId(question);
            return !combinedSet.includes(questionId);
        });


        // If all questions have been answered, reset the combined pool and all individual pools
        if (availableQuestions.length === 0 && questions.length > 0) {
            
            // Clear all intensity 3 question pools to start fresh cycle
            this.answeredQuestions[intensityKey].multipleChoice.length = 0;
            this.answeredQuestions[intensityKey].dragDrop.length = 0;
            this.answeredQuestions[intensityKey].codeArrangement.length = 0;
            this.answeredQuestions[intensityKey].combined.length = 0;
            
            return questions; // Return all questions after reset
        }

        return availableQuestions;
    }

    filterCombinedQuestionsMax(questions) {
        // Combined tracking for MAX intensity (4+)
        if (!this.answeredQuestions) return questions;
        const intensityKey = 'intensity4';
        if (!this.answeredQuestions[intensityKey]) {
            this.answeredQuestions[intensityKey] = { multipleChoice: [], syntaxBlock: [], codeArrangement: [], dragDrop: [], combined: [] };
        }
        const combinedSet = this.answeredQuestions[intensityKey].combined;
    const available = questions.filter(q => !combinedSet.includes(this.createQuestionId(q)));
        if (available.length === 0 && questions.length > 0) {
            combinedSet.length = 0;
            return questions;
        }
        return available;
    }

    filterAnsweredQuestions(questions, intensity, questionType) {
        if (!this.answeredQuestions) {
            return questions; // Return all questions if no tracking system
        }
        
        const intensityKey = `intensity${intensity}`;
    const answeredSet = this.answeredQuestions[intensityKey]?.[questionType];
        
        if (!answeredSet) {
            return questions; // Return all questions if no answered questions for this category
        }
        
        // Filter out questions that have already been answered
        const availableQuestions = questions.filter(question => {
            const questionId = this.createQuestionId(question);
            return !answeredSet.includes(questionId);
        });
        
        
        // If all questions have been answered, reset the answered questions for this category
        if (availableQuestions.length === 0 && questions.length > 0) {
            answeredSet.length = 0;
            return questions; // Return all questions after reset
        }
        
        return availableQuestions;
    }

    createQuestionId(questionData) {
        // Create a unique identifier based on question content
        // Use the question text as the primary identifier
        if (questionData.question) {
            return questionData.question;
        } else if (questionData.prompt) {
            return questionData.prompt;
        } else if (questionData.description) {
            return questionData.description;
        } else {
            // Fallback: use JSON string of the question
            return JSON.stringify(questionData);
        }
    }

    getQuestionType() {
        // Determine the type of the current question
        if (!this.currentQuestion) {
            return 'multipleChoice';
        }
        
        // Check if this question has a sourceType (from combined system)
        if (this.currentQuestion.sourceType) {
            return this.currentQuestion.sourceType;
        }
        
        // Legacy detection for questions without sourceType
        if (this.currentQuestion.type === 'syntaxBlock') {
            return 'syntaxBlock';
        }
        if (this.currentQuestion.isDragDrop || this.currentQuestion.type === 'drag-and-drop') {
            return this.intensity === 3 ? 'codeArrangement' : 'dragDrop';
        } else {
            return 'multipleChoice';
        }
    }

    // Minimal Bloom taxonomy classifier (non-invasive)
    // Priority: explicit bloomTarget on question JSON > heuristic by question features > fallback by intensity
    getBloomLevel(question = this.currentQuestion) {
        if (!question) return 'remembering';
        // 1. Explicit metadata override
        if (question.bloomTarget) return question.bloomTarget; // expected values already lowercase
        // 2. Heuristic: detect creation/evaluating patterns with existing fields (no new schema required)
        // Creating: code arrangement with multipleValid solutions or presence of distractors array + correctOrder
        if ((question.type === 'codeArrangement' || question.isDragDrop) && (question.multipleValid || Array.isArray(question.distractors))) {
            return 'creating';
        }
        // Evaluating: syntaxBlock or multiple choice with evaluation criteria hints (keywords) or >4 options w/ best/most wording
        const stem = (question.question || question.prompt || '').toLowerCase();
        if (/(best|most appropriate|optimi(s|z)e|refactor|improv(e|ing)|more (efficient|secure)|avoid)/.test(stem)) {
            return 'evaluating';
        }
        // Analyzing: codeArrangement without multipleValid but with correctOrder OR syntaxBlock with more than 2 distractors
        if ((question.type === 'codeArrangement' || question.isDragDrop) && question.correctOrder) {
            return 'analyzing';
        }
        if (question.type === 'syntaxBlock' && Array.isArray(question.options) && question.options.length >= 4) {
            return 'analyzing';
        }
        // Applying: any intensity >=2 non-trivial question (syntaxBlock or code arrangement) not triggered above
        if (this.intensity >= 2 && (question.type === 'syntaxBlock' || question.type === 'codeArrangement' || question.isDragDrop)) {
            return 'applying';
        }
        // Understanding: multiple choice with >2 options and verbs like 'which of the following'
        if (Array.isArray(question.options) && question.options.length > 2) {
            return 'understanding';
        }
        // Remembering fallback
        return 'remembering';
    }

    createQuizInterface() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        // Use improved mobile detection (CSS-based for detection only)
        const isMobile = scaleInfo.isMobile || scaleInfo.width < 900;
        const isSmallMobile = scaleInfo.width < 500;
        
        // Unified detection for syntax block (includes combined max intensity via sourceType)
        const detectedType = this.getQuestionType();
        if (detectedType === 'syntaxBlock') {
            this.createSyntaxBlockInterface(centerX, centerY);
            return;
        }

        // Check if this is a code arrangement style question
        if (detectedType === 'codeArrangement' || this.currentQuestion.isDragDrop) {
            // Normalize flag for downstream logic
            this.currentQuestion.isDragDrop = true;
            this.createDragDropInterface(centerX, centerY);
            return;
        }
        
        // Check if this is a drag-and-drop question (precedence order - intensity 2)
        if (this.currentQuestion.type === 'drag-and-drop' && this.currentQuestion.options) {
            this.createPrecedenceDragDropInterface(centerX, centerY);
            return;
        }
        
    // Create main quiz container for normal multiple choice
        this.quizContainer = this.add.container(centerX, centerY);
        
        // Tall mobile detection (e.g., Poco X6 Pro 1220x2712 ~ aspect 2.22)
        const aspect = this.scale.height / (this.scale.width || 1);
        const isTallMobile = (isMobile || scaleInfo.isPortrait) && aspect > 1.85;
        const TALL_MOBILE_FONT_REDUCE = 0.94; // gentler reduction on very tall devices
        
        // Mobile sizing in GAME UNITS (avoid CSS pixel mixing)
    const MOBILE_MAX_WIDTH_RATIO = 0.98;   // up to 98% of game width
    const MOBILE_MAX_HEIGHT_RATIO = 0.9; // up to 90% of game height

        // Larger, more readable mobile fonts
    let titleFontPx = isMobile ? 52 : 36;
    let questionFontPx = isMobile ? 38 : 28;
    let contentWidth = isMobile ? Math.min(this.scale.width * MOBILE_MAX_WIDTH_RATIO, 1700) : 980;
        if (isTallMobile) {
            titleFontPx = Math.round(titleFontPx * TALL_MOBILE_FONT_REDUCE);
            questionFontPx = Math.round(questionFontPx * TALL_MOBILE_FONT_REDUCE);
            contentWidth = Math.min(contentWidth, this.scale.width * 0.85);
        }
        const titleFontSize = `${titleFontPx}px`;
        const questionFontSize = `${questionFontPx}px`;
        const questionWrapWidth = contentWidth - 40;
        
        // Create temporary question text to measure height
        const tempQuestionText = this.add.text(0, 0, this.currentQuestion.question, {
            fontFamily: 'Arial',
            fontSize: questionFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: questionWrapWidth },
            lineSpacing: isMobile ? 6 : 8
        }).setOrigin(0.5);
        
        const questionHeight = tempQuestionText.height;
        tempQuestionText.destroy(); // Remove temporary text
        
        // Calculate content dimensions based on actual content - mobile responsive
        const answers = this.currentQuestion.options;
        // Defensive: if options missing, determine correct UI instead of defaulting to syntaxBlock
        if (!Array.isArray(answers)) {
            console.warn('[QuizScene] Expected options array for multiple choice, got:', answers, 'Question:', this.currentQuestion);
            // If it has correctOrder & blocks (array of strings) it's a code arrangement question
            if (this.currentQuestion && this.currentQuestion.blocks && this.currentQuestion.correctOrder) {
                this.currentQuestion.isDragDrop = true;
                this.createDragDropInterface(centerX, centerY);
                return;
            }
            // If it has blocks of objects with a 'code' property → syntaxBlock
            if (this.currentQuestion && Array.isArray(this.currentQuestion.blocks) && this.currentQuestion.blocks.length > 0) {
                const first = this.currentQuestion.blocks[0];
                if (first && typeof first === 'object' && ('code' in first)) {
                    this.createSyntaxBlockInterface(centerX, centerY);
                    return;
                }
            }
            // Abort to avoid rendering empty UI
            return;
        }
        const numAnswers = answers.length;
    let buttonHeight = isMobile ? 84 : 64;
    let buttonSpacing = isMobile ? 92 : 84;
    let titleHeight = isMobile ? 74 : 70;
    let questionNumberHeight = isMobile ? 36 : 30;
    // Extra space between question text and the first option (A)
    // Increased to create more breathing room above the first answer
    let questionPadding = isMobile ? 44 : 84;
        let bottomPadding = isMobile ? 18 : 30;
        if (isTallMobile) {
            buttonHeight = 60;
            buttonSpacing = 68;
            titleHeight = 52;
            questionNumberHeight = 24;
            questionPadding = 40;
            bottomPadding = 16;
        }

    // Title & question number removed; we now repurpose titleHeight as top padding
    titleHeight = isMobile ? 40 : 56; // acts as top spacing above question
    questionNumberHeight = 0;
    // Increase gap below question before answers per new request
    questionPadding = isMobile ? 56 : 72;
    // Add a bit more bottom padding for balance
    bottomPadding = isMobile ? 26 : 40;
        
        // Calculate required height based on layout type
        let buttonsAreaHeight;
        if (numAnswers === 2 && !isMobile) {
            // Side-by-side layout uses less vertical space (only on desktop)
            buttonsAreaHeight = 70 + 30;
        } else {
            // Vertical layout (always on mobile, optional on desktop)
            buttonsAreaHeight = numAnswers * buttonSpacing;
        }
        
        const contentHeight = titleHeight + questionNumberHeight + questionHeight + questionPadding + buttonsAreaHeight + bottomPadding;

        // Determine scaling based on game viewport bounds (height & width constraints)
        let targetScale = 1;
        if (isMobile) {
            const maxHeight = this.scale.height * MOBILE_MAX_HEIGHT_RATIO;
            if (contentHeight > maxHeight) {
                targetScale = Math.min(targetScale, maxHeight / contentHeight);
            }
            // Extra safety: never exceed 90% of game width visually
            const visualWidth = contentWidth; // unscaled width in game units
            const maxVisualWidth = this.scale.width * 0.9;
            if (visualWidth > maxVisualWidth) {
                targetScale = Math.min(targetScale, maxVisualWidth / visualWidth);
            }
            // Ensure overall width respects MOBILE_MAX_WIDTH_RATIO
            const postWidth = contentWidth * targetScale;
            const allowed = this.scale.width * MOBILE_MAX_WIDTH_RATIO;
            if (postWidth > allowed) {
                targetScale = Math.min(targetScale, allowed / contentWidth);
            }
            // Maintain a strong readability baseline on phones
            const MIN_MOBILE_SCALE = 1.3; // ~+30% bigger baseline
            targetScale = Math.max(targetScale, MIN_MOBILE_SCALE);
        }
        if (isTallMobile) {
            // Slight reduction on extremely tall devices to avoid clipping
            targetScale *= 0.98;
        }
        
    // Create quiz background - dark rectangle with 80% opacity
    const quizBox = this.add.graphics();
    // Black background with 80% opacity as per reference
    quizBox.fillStyle(0x000000, 0.8);
    quizBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 8);
    // Remove border for cleaner look
    // quizBox.lineStyle(2, 0x111111, 0.9);
    // quizBox.strokeRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 8);
    this.quizContainer.add(quizBox);
        
        // Title with programming language - responsive font size
        const courseTopic = this.courseTopic || 'Programming';
        // Title removed per request (previously showed course quiz challenge)
        this.titleText = null;
        
        // Removed question number per request
        
        // Question text with better formatting - responsive
    this.questionText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + (questionHeight/2) + 2, this.currentQuestion.question, {
            fontFamily: 'Arial',
            fontSize: questionFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: questionWrapWidth },
            lineSpacing: isMobile ? 6 : 8
        }).setOrigin(0.5);
        this.quizContainer.add(this.questionText);
        
        // Calculate start position for answer buttons
        const buttonStartY = titleHeight + questionNumberHeight + questionHeight + questionPadding - contentHeight/2;
        
        // Create answer options with modern design - pass mobile info
        this.createAnswerButtons(buttonStartY, isMobile, isSmallMobile);
        
        // Add instruction text - dynamically centered between last answer button and panel bottom
        const instructionFontPx = isMobile
            ? Math.max(14, Math.round(questionFontPx * 0.75))
            : Math.max(16, Math.round(24 * 0.65));
        const instructionFontSize = `${instructionFontPx}px`;
        // Determine bottom of last answer button within container coordinates
        let lastAnswerBottom = 0;
        if (this.answerButtons.length > 0) {
            const lastBtn = this.answerButtons[this.answerButtons.length - 1];
            // container y (0) + button container y + half height
            lastAnswerBottom = lastBtn.container.y + (lastBtn.buttonHeight / 2);
        }
        const panelBottom = contentHeight / 2; // since origin is centered
        const availableSpace = panelBottom - lastAnswerBottom; // space from last answer bottom to panel bottom
        // Apply symmetric margins: place instruction halfway in that space
        const instructionY = lastAnswerBottom + (availableSpace / 2);
        this.tooltipText = this.add.text(0, instructionY, 'Tap your answer choice', {
            fontFamily: 'Arial',
            fontSize: instructionFontSize,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(this.tooltipText);
        
        // Add entrance animation with refined scaling
        const INITIAL_SCALE_MULTIPLIER = 0.9; // slight pop-in grow effect
        this.quizContainer.setScale(targetScale * INITIAL_SCALE_MULTIPLIER);
        this.quizContainer.setAlpha(0);
        this.tweens.add({
            targets: this.quizContainer,
            scaleX: targetScale,
            scaleY: targetScale,
            alpha: 1,
            duration: 450,
            ease: 'Back.easeOut'
        });
    }

    /**
     * syntaxBlock question structure example:
     * {
     *   type: 'syntaxBlock',
     *   question: 'Select the Correct Syntax',
     *   instruction: 'Tap the Block with the Correct Syntax', // optional
     *   blocks: [ { code: 'if 5 > 3 {\n    print("Hello World");\n}', correct: false }, ... ]
     * }
     */
    createSyntaxBlockInterface(centerX, centerY){
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.isMobile || scaleInfo.width < 900;
        const isSmallMobile = scaleInfo.width < 520;

        this.quizContainer = this.add.container(centerX, centerY);

        const contentWidth = isMobile ? Math.min(this.scale.width * 0.95, 1900) : 1420;
    // Increase header height to create more breathing room between title and blocks
    const headerHeight = isMobile ? 140 : 130;
    const blockAreaHeight = isMobile ? 380 : 320; // area for blocks (3 side-by-side)
        const footerHeight = isMobile ? 90 : 80;
        const contentHeight = headerHeight + blockAreaHeight + footerHeight;

        // Background panel (match reference: dark #222 with near 0.8 opacity)
        const panel = this.add.graphics();
        panel.fillStyle(0x222222, 0.95);
        panel.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 0);
        this.quizContainer.add(panel);

        // Title
        const titleFontSize = isMobile ? (isSmallMobile ? '40px' : '52px') : '48px';
        const title = this.add.text(0, -contentHeight/2 + (headerHeight/2), this.currentQuestion.question || 'Select the Correct Syntax', {
            fontFamily: 'Arial',
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(title);

        // Clone & shuffle blocks so display order is randomized each time (does not mutate source data)
        const blocks = [...(this.currentQuestion.blocks || [])];
        if (blocks.length > 1) {
            Phaser.Utils.Array.Shuffle(blocks);
        }
    const blockCount = blocks.length;
    const gap = isMobile ? 40 : 60;
    // Use target width then compute total width and center group
    const baseBlockWidth = Math.min(420, (contentWidth - gap * (blockCount + 1)) / Math.max(blockCount,1));
    const blockHeight = isMobile ? 220 : 200;
    const totalWidth = blockCount * baseBlockWidth + (blockCount - 1) * gap;
    const leftEdge = -totalWidth/2; // center relative to container origin
    // Increased verticalOffset to enlarge the visual gap between title and blocks.
    // Chosen so that top and bottom whitespace are closer to symmetrical once tooltip is lifted.
    const verticalOffset = isMobile ? 70 : 60; // previously 20/18
    const blockY = -contentHeight/2 + headerHeight + blockHeight/2 + verticalOffset;

        this.answerButtons = [];
        blocks.forEach((blk, i) => {
            const x = leftEdge + (baseBlockWidth/2) + i * (baseBlockWidth + gap);
            const rect = this.add.rectangle(x, blockY, baseBlockWidth, blockHeight, 0xF9DD72, 1)
                .setStrokeStyle(4, 0xB8860B)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });
            rect.buttonIndex = i;
            this.quizContainer.add(rect);

            // Number label above block (1,2,3)
            const numberLabel = this.add.text(x, blockY - blockHeight/2 - 28, (i+1).toString(), {
                fontFamily: 'Arial',
                fontSize: isMobile ? '46px' : '40px',
                fontWeight: 'bold',
                color: '#ffffff'
            }).setOrigin(0.5);
            this.quizContainer.add(numberLabel);

            // Code text inside (monospace style look via bold + spacing)
            const codeStyle = {
                fontFamily: 'Courier New',
                fontSize: isMobile ? '22px' : '20px',
                color: '#000000',
                align: 'left',
                wordWrap: { width: baseBlockWidth - 40 }
            };
            const codeText = this.add.text(x - baseBlockWidth/2 + 20, blockY - blockHeight/2 + 20, blk.code || '', codeStyle).setOrigin(0,0);
            this.quizContainer.add(codeText);

            // Hover / pointer styling
            rect.on('pointerover', () => {
                if (!rect.selected && !this.answerSubmitted) rect.setFillStyle(0xFFE58A);
            });
            rect.on('pointerout', () => {
                if (!rect.selected && !this.answerSubmitted) rect.setFillStyle(0xF9DD72);
            });
            rect.on('pointerdown', () => {
                if (this.answerSubmitted) return;
                this.handleSyntaxBlockSelection(i, rect);
            });

            this.answerButtons.push({ container: rect, isSyntaxBlock: true, codeText, data: blk });
        });

        const instruction = this.currentQuestion.instruction || 'Tap the Block with the Correct Syntax';
        // Bottom tooltip (reuse tooltipText reference for unified updateTooltip handling)
        // Lift tooltip upward for symmetry with the enlarged top gap
        const tooltipLift = isMobile ? 60 : 55; // amount to move tooltip up from previous position
        this.tooltipText = this.add.text(0, contentHeight/2 - footerHeight/2 - tooltipLift, instruction, {
            fontFamily: 'Arial',
            fontSize: isMobile ? '30px' : '26px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(this.tooltipText);


        // Entrance animation
        const targetScale = isMobile ? 1.3 : 1;
        this.quizContainer.setScale(targetScale * 0.9);
        this.quizContainer.setAlpha(0);
        this.tweens.add({
            targets: this.quizContainer,
            scaleX: targetScale,
            scaleY: targetScale,
            alpha: 1,
            duration: 450,
            ease: 'Back.easeOut'
        });
    }

    handleSyntaxBlockSelection(index, rect){
        if (this.answerSubmitted) return;
        this.answerSubmitted = true;
        const selected = this.answerButtons[index];
        const isCorrect = !!selected.data.correct;
        // Mark visual state
        this.answerButtons.forEach(btn => btn.container.disableInteractive());
        if (isCorrect){
            rect.setFillStyle(QUIZ_UI_COLORS.correctFill).setStrokeStyle(4, QUIZ_UI_COLORS.correctBorder);
            this.handleAnswerResult(true, 'syntaxBlock');
        } else {
            rect.setFillStyle(QUIZ_UI_COLORS.wrongFill).setStrokeStyle(4, QUIZ_UI_COLORS.wrongBorder);
            // Highlight correct one
            const correctBtn = this.answerButtons.find(b => b.data.correct);
            if (correctBtn){
                correctBtn.container.setFillStyle(QUIZ_UI_COLORS.correctFill).setStrokeStyle(4, QUIZ_UI_COLORS.correctBorder);
            }
            this.handleAnswerResult(false, 'syntaxBlock');
        }
    }

    // Unified answer result handler (added to support syntaxBlock integration)
    handleAnswerResult(isCorrect, forcedType){
        // Fallback if this function already existed elsewhere
        if (typeof this.returnToGameplay !== 'function') return;
        // Update tooltip/feedback if available
        if (this.updateTooltip) {
            try { this.updateTooltip(isCorrect); } catch(e) {}
        }
        const qType = forcedType || this.getQuestionType();
        const bloomTarget = this.getBloomLevel();
        // Delay consistent with multiple choice transitions
        this.time.delayedCall(900, () => {
            // Some legacy flows may use emit path; mimic expected structure
            this.events.emit('answer-submitted', { correct: isCorrect, questionType: qType, bloomTarget });
            this.returnToGameplay(isCorrect);
        });
    }

    createDragDropInterface(centerX, centerY) {
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.isMobile || scaleInfo.width < 900;
        const isSmallMobile = scaleInfo.width < 500;
        const aspect = this.scale.height / (this.scale.width || 1);
        const isTallMobile = (isMobile || scaleInfo.isPortrait) && aspect > 1.85;
        const TALL_MOBILE_FONT_REDUCE = 0.94;

        
        // Create main quiz container
        this.quizContainer = this.add.container(centerX, centerY);
        
        // Mobile sizing in GAME UNITS (avoid CSS pixel mixing) - SAME AS MULTIPLE CHOICE
        const MOBILE_MAX_WIDTH_RATIO = 0.98;   // up to 98% of game width
        const MOBILE_MAX_HEIGHT_RATIO = 0.9; // up to 90% of game height
        
        let contentWidth = isMobile ? Math.min(this.scale.width * MOBILE_MAX_WIDTH_RATIO, 1700) : 980;
        if (isTallMobile) {
            contentWidth = Math.min(contentWidth, this.scale.width * 0.85);
        }
        
        // Responsive font sizes (matching multiple choice UI)
        let titleFontPx = isMobile ? 52 : 36;
        let questionFontPx = isMobile ? 38 : 28;
        let descriptionFontPx = isMobile ? (isSmallMobile ? 20 : 22) : 20;
        let instructionFontPx = isMobile ? (isSmallMobile ? 18 : 20) : 18;
        if (isTallMobile) {
            titleFontPx = Math.round(titleFontPx * TALL_MOBILE_FONT_REDUCE);
            questionFontPx = Math.round(questionFontPx * TALL_MOBILE_FONT_REDUCE);
            descriptionFontPx = Math.round(descriptionFontPx * TALL_MOBILE_FONT_REDUCE);
            instructionFontPx = Math.round(instructionFontPx * TALL_MOBILE_FONT_REDUCE);
        }
        const titleFontSize = `${titleFontPx}px`;
        const questionFontSize = `${questionFontPx}px`;
        const descriptionFontSize = `${descriptionFontPx}px`;
        const instructionFontSize = `${instructionFontPx}px`;
        
        // Calculate content areas based on number of blocks (matching multiple choice scale)
        const numberOfBlocks = this.currentQuestion.blocks.length;
        let blockSpacing = isMobile ? (isSmallMobile ? 80 : 90) : 85;
        let titleHeight = isMobile ? (isSmallMobile ? 70 : 80) : 70;
        const questionNumberHeight = 0;
        let questionHeight = 0; // No question text in new design
        let instructionHeight = isMobile ? (isSmallMobile ? 80 : 90) : 100; // Increased for better visibility
        const draggableAreaHeight = numberOfBlocks * blockSpacing + (isMobile ? 100 : 120);
        let submitAreaHeight = 0; // No submit button in new design
        if (isTallMobile) {
            blockSpacing = Math.max(54, blockSpacing - 6);
            questionHeight = Math.max(110, questionHeight - 10);
            instructionHeight = Math.max(108, instructionHeight - 12);
            submitAreaHeight = Math.max(96, submitAreaHeight - 10);
            titleHeight = Math.max(48, titleHeight - 6);
        }
        
        const contentHeight = titleHeight + questionNumberHeight + questionHeight + instructionHeight + draggableAreaHeight + submitAreaHeight;
        // contentWidth already calculated above using multiple choice logic
        
        // Create simple black background with 80% opacity as per reference
        const quizBox = this.add.graphics();
        quizBox.fillStyle(0x000000, 0.8);
        quizBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 8);
        
        this.quizContainer.add(quizBox);
        
        // Simple white title as shown in reference
        this.titleText = this.add.text(0, -contentHeight/2 + (titleHeight/2) + 5, 'Code Arrangement', {
            fontFamily: 'Arial',
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(this.titleText);
        
        // Remove question text and description as they're not in the reference image
        
        // Bottom tooltip as shown in reference image
        this.tooltipText = this.add.text(0, contentHeight/2 - 50, 'Arrange the Code Blocks in the Correct Order', {
            fontFamily: 'Arial',
            fontSize: instructionFontSize,
            color: '#ffffff',
            align: 'center',
            fontWeight: 'normal'
        }).setOrigin(0.5);
        this.quizContainer.add(this.tooltipText);
        
        // Remove swap note as it's not in the reference image
        
        // Store dimensions for responsive block creation
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;
        this.draggableAreaY = -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + instructionHeight + 50;
        
        // Create shuffled blocks and drop zones
        this.createDragDropBlocks();
        
        // Setup auto-checking (no submit button needed)
        this.setupAutoChecking();
        
        // Add background click handler to clear selection
        this.input.on('pointerdown', (pointer, currentlyOver) => {
            // If user clicks on empty space (not on blocks or drop zones), clear selection
            if (currentlyOver.length === 0) {
                this.clearSelection();
            }
        });
        
        // Determine scaling based on game viewport bounds (height & width constraints) - SAME AS MULTIPLE CHOICE
        let targetScale = 1;
        if (isMobile) {
            const maxHeight = this.scale.height * MOBILE_MAX_HEIGHT_RATIO;
            if (contentHeight > maxHeight) {
                targetScale = Math.min(targetScale, maxHeight / contentHeight);
            }
            // Extra safety: never exceed 90% of game width visually
            const visualWidth = contentWidth; // unscaled width in game units
            const maxVisualWidth = this.scale.width * 0.9;
            if (visualWidth > maxVisualWidth) {
                targetScale = Math.min(targetScale, maxVisualWidth / visualWidth);
            }
            // Ensure overall width respects MOBILE_MAX_WIDTH_RATIO
            const postWidth = contentWidth * targetScale;
            const allowed = this.scale.width * MOBILE_MAX_WIDTH_RATIO;
            if (postWidth > allowed) {
                targetScale = Math.min(targetScale, allowed / contentWidth);
            }
            // Maintain a strong readability baseline on phones
            const MIN_MOBILE_SCALE = 1.3; // ~+30% bigger baseline
            targetScale = Math.max(targetScale, MIN_MOBILE_SCALE);
        }
        if (isTallMobile) {
            // Slight reduction on extremely tall devices to avoid clipping
            targetScale *= 0.98;
        }
        
        // Add entrance animation (using same scaling as multiple choice)
        this.quizContainer.setScale(targetScale * 0.85);
        this.quizContainer.setAlpha(0);
        this.tweens.add({
            targets: this.quizContainer,
            scaleX: targetScale,
            scaleY: targetScale,
            alpha: 1,
            duration: 450,
            ease: 'Back.easeOut'
        });
    }

    createPrecedenceDragDropInterface(centerX, centerY) {
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        
        // For now, convert precedence questions to code arrangement format for compatibility
        const dragItems = this.currentQuestion.options.dragItems.filter(item => !item.isDecoy);
        const dropZones = this.currentQuestion.options.dropZones;
        
        // Convert to blocks format
        this.currentQuestion.blocks = dragItems.map(item => item.text);
        this.currentQuestion.correctOrder = dropZones.map(zone => {
            const itemIndex = dragItems.findIndex(item => item.id === zone.correctItemId);
            return itemIndex;
        });
        
        // Mark as drag-drop and use existing interface
        this.currentQuestion.isDragDrop = true;
        this.createDragDropInterface(centerX, centerY);
    }

    createDragDropBlocks() {
        const blocks = [...this.currentQuestion.blocks];
        const correctOrder = this.currentQuestion.correctOrder;
        
        // Shuffle blocks for dragging
        Phaser.Utils.Array.Shuffle(blocks);
        
        this.dragBlocks = [];
        this.dropZones = [];
        this.currentOrder = new Array(blocks.length).fill(null);
        this.selectedBlock = null; // Track currently selected block
        
        // Calculate responsive dimensions (matching multiple choice button scale)
        const blockWidth = Math.min(480, (this.contentWidth - 120) / 2);
        const blockHeight = 70;
        const blockSpacing = 85;
        
        // Calculate positions for left side (draggable blocks) and right side (drop zones)
        const leftX = -this.contentWidth/4;
        const rightX = this.contentWidth/4;
        const startY = this.draggableAreaY;
        
        // Create drag blocks (left side) - styled like multiple choice buttons
        blocks.forEach((block, index) => {
            const blockY = startY + (index * blockSpacing);
            
            // Use yellow/gold styling to match multiple choice buttons
            const blockObj = this.add.rectangle(leftX, blockY, blockWidth, blockHeight, 0xF9DD72);
            blockObj.setStrokeStyle(3, 0xB8860B);
            
            const blockText = this.add.text(leftX, blockY, block, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#000000',
                fontWeight: 'bold',
                align: 'center',
                wordWrap: { width: blockWidth - 30 }
            }).setOrigin(0.5);
            
            // Make interactive for tap selection
            blockObj.setInteractive();
            blockText.setInteractive();
            
            // Store data
            blockObj.originalText = block;
            blockObj.textObj = blockText;
            blockText.blockObj = blockObj;
            blockText.originalText = block;
            
            this.setupTapEvents(blockObj, blockText);
            
            this.quizContainer.add([blockObj, blockText]);
            this.dragBlocks.push({ block: blockObj, text: blockText, originalText: block });
        });
        
        // Create drop zones (right side) - empty zones without text
        for (let i = 0; i < blocks.length; i++) {
            const dropY = startY + (i * blockSpacing);
            
            // Use darker styling to match multiple choice options background
            const dropZone = this.add.rectangle(rightX, dropY, blockWidth, blockHeight, 0x4a5568);
            dropZone.setStrokeStyle(2, 0x718096, 0.8);
            dropZone.setAlpha(0.9);
            
            dropZone.setInteractive();
            dropZone.index = i;
            
            // Set up tap event for drop zone
            dropZone.on('pointerdown', () => {
                this.handleDropZoneTap(dropZone);
            });
            
            this.quizContainer.add(dropZone);
            this.dropZones.push(dropZone);
        }
        
        // Create centered numbers between blocks and drop zones (like in reference image)
        const centerX = (leftX + rightX) / 2;
        for (let i = 0; i < blocks.length; i++) {
            const numberY = startY + (i * blockSpacing);
            
            const numberText = this.add.text(centerX, numberY, `${i + 1}`, {
                fontFamily: 'Arial',
                fontSize: '36px',
                color: '#ffffff',
                align: 'center',
                fontWeight: 'bold'
            }).setOrigin(0.5);
            
            this.quizContainer.add(numberText);
        }
    }

    setupTapEvents(blockObj, blockText) {
        // Set up tap/click events for block selection
        const handleBlockTap = () => {
            this.selectBlock(blockObj, blockText);
        };
        
        blockObj.on('pointerdown', handleBlockTap);
        blockText.on('pointerdown', handleBlockTap);
    }
    
    selectBlock(blockObj, blockText) {
        // Clear previous selection
        this.clearSelection();
        
        // Set new selection
        this.selectedBlock = { block: blockObj, text: blockText };
        
        // Highlight selected block
        blockObj.setFillStyle(0xFFE58A); // Lighter yellow for selection
        blockObj.setStrokeStyle(4, 0xFFD700); // Gold border for selection
        blockText.setColor('#000000');
        
        // Show white outlines on drop zones
        this.showDropZoneOutlines();
    }
    
    clearSelection() {
        if (this.selectedBlock) {
            const { block, text } = this.selectedBlock;
            
            // Check if block is currently placed in a drop zone
            let isPlaced = false;
            for (let i = 0; i < this.currentOrder.length; i++) {
                if (this.currentOrder[i] === block) {
                    isPlaced = true;
                    break;
                }
            }
            
            if (isPlaced) {
                // Keep placed block styling - green
                block.setFillStyle(0x2ecc71);
                block.setStrokeStyle(3, 0x27ae60);
                text.setColor('#ffffff');
            } else {
                // Return to original styling - yellow/gold
                block.setFillStyle(0xF9DD72);
                block.setStrokeStyle(3, 0xB8860B);
                text.setColor('#000000');
            }
        }
        
        this.selectedBlock = null;
        this.hideDropZoneOutlines();
    }
    
    showDropZoneOutlines() {
        this.dropZones.forEach(dropZone => {
            // Add white outline to available drop zones
            if (!this.currentOrder[dropZone.index]) {
                dropZone.setStrokeStyle(4, 0xFFFFFF); // White outline
            }
        });
    }
    
    hideDropZoneOutlines() {
        this.dropZones.forEach(dropZone => {
            // Return to original drop zone styling
            dropZone.setStrokeStyle(2, 0x718096, 0.8);
        });
    }
    
    handleDropZoneTap(dropZone) {
        if (!this.selectedBlock) {
            return; // No block selected
        }
        
        const { block: selectedBlock, text: selectedText } = this.selectedBlock;
        
        // Check if drop zone is already occupied
        if (this.currentOrder[dropZone.index]) {
            // Handle swapping logic here if needed
            this.handleBlockSwap(dropZone, selectedBlock, selectedText);
        } else {
            // Place block in empty drop zone
            this.placeBlockInDropZone(dropZone, selectedBlock, selectedText);
        }
        
        // Clear selection after placement
        this.clearSelection();
    }
    
    placeBlockInDropZone(dropZone, blockObj, blockText) {
        // Remove block from current position if it was placed elsewhere
        const currentIndex = this.currentOrder.indexOf(blockObj);
        if (currentIndex !== -1) {
            this.currentOrder[currentIndex] = null;
            // Reset the previous drop zone opacity
            this.dropZones[currentIndex].setAlpha(0.9);
        }
        
        // Calculate drop zone position
        const dropZoneX = dropZone.x;
        const dropZoneY = dropZone.y;
        
        // Move block to drop zone
        blockObj.x = dropZoneX;
        blockObj.y = dropZoneY;
        blockText.x = dropZoneX;
        blockText.y = dropZoneY;
        
        // Update current order
        this.currentOrder[dropZone.index] = blockObj;
        
        // Style the block for being placed
        blockObj.setFillStyle(0x2ecc71); // Green for placed blocks
        blockObj.setStrokeStyle(3, 0x27ae60);
        blockText.setStyle({
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '18px'
        });
        
        // Update drop zone appearance
        dropZone.setAlpha(0.3); // Lower opacity for occupied drop zones
        
        // Check if all blocks are placed for auto-submission
        this.checkIfAllBlocksPlaced();
    }
    
    handleBlockSwap(dropZone, newBlock, newText) {
        const existingBlock = this.currentOrder[dropZone.index];
        
        if (!existingBlock) return;
        
        // Find where the new block currently is
        const newBlockIndex = this.currentOrder.indexOf(newBlock);
        
        if (newBlockIndex !== -1) {
            // Swap the blocks
            this.currentOrder[newBlockIndex] = existingBlock;
            this.currentOrder[dropZone.index] = newBlock;
            
            // Move existing block to new block's position
            const swapDropZone = this.dropZones[newBlockIndex];
            existingBlock.x = swapDropZone.x;
            existingBlock.y = swapDropZone.y;
            existingBlock.textObj.x = swapDropZone.x;
            existingBlock.textObj.y = swapDropZone.y;
        } else {
            // New block is from left side, send existing block back to left
            const dragBlockIndex = this.dragBlocks.findIndex(db => db.block === newBlock);
            const originalX = this.dragBlocks[dragBlockIndex].block.x; // Use original position
            const originalY = this.dragBlocks[dragBlockIndex].block.y;
            
            existingBlock.x = originalX;
            existingBlock.y = originalY;
            existingBlock.textObj.x = originalX;
            existingBlock.textObj.y = originalY;
            
            // Reset existing block styling
            existingBlock.setFillStyle(0xF9DD72);
            existingBlock.setStrokeStyle(3, 0xB8860B);
            existingBlock.textObj.setColor('#000000');
            
            // Clear the position from current order
            this.currentOrder[dropZone.index] = null;
        }
        
        // Place new block
        this.placeBlockInDropZone(dropZone, newBlock, newText);
        
        // Set up drag events for the text (should move the block too)
        blockText.on('dragstart', (pointer, dragX, dragY) => {
            blockObj.setFillStyle(0xFFE58A); // Lighter yellow for drag highlight
            blockText.setColor('#000000'); // Dark text for visibility
            
            // Store the offset from mouse to text position when drag starts
            blockText.dragOffsetX = pointer.worldX - (blockText.x + this.quizContainer.x);
            blockText.dragOffsetY = pointer.worldY - (blockText.y + this.quizContainer.y);
        });
        
        blockText.on('drag', (pointer, dragX, dragY) => {
            // Calculate new text position relative to container, accounting for initial offset
            const newTextX = pointer.worldX - this.quizContainer.x - blockText.dragOffsetX;
            const newTextY = pointer.worldY - this.quizContainer.y - blockText.dragOffsetY;
            
            // Update text position
            blockText.x = newTextX;
            blockText.y = newTextY;
            
            // Update block position to stay with the text
            blockObj.x = newTextX - textOffsetX;
            blockObj.y = newTextY - textOffsetY;
        });
        
        blockText.on('dragend', () => {
            // Check if block is in a drop zone to determine styling
            let isInDropZone = false;
            for (let i = 0; i < this.currentOrder.length; i++) {
                if (this.currentOrder[i] === blockObj) {
                    isInDropZone = true;
                    break;
                }
            }
            
            if (isInDropZone) {
                // Keep drop zone styling - green for placed blocks
                blockObj.setFillStyle(0x2ecc71);
                blockText.setColor('#ffffff');
            } else {
                // Back to original left side styling - yellow/gold
                blockObj.setFillStyle(0xF9DD72);
                blockText.setColor('#000000');
            }
        });
    }



    setupAutoChecking() {
        // Auto-checking will be triggered in drag events when all blocks are placed
        this.autoCheckEnabled = true;
    }

    checkIfAllBlocksPlaced() {
        // Check if all drop zones are filled
        const allFilled = this.currentOrder.every(slot => slot !== null);
        if (allFilled && this.autoCheckEnabled) {
            // Small delay for better UX
            this.time.delayedCall(300, () => {
                this.checkDragDropAnswer();
            });
        }
    }

    checkDragDropAnswer() {
        // Prevent multiple submissions and check for timer expiration first
        if (this.answerSubmitted || this.timerExpired) return;
        this.answerSubmitted = true;
        
        // Disable submit button
        this.quizContainer.list[this.quizContainer.list.length - 2].setAlpha(0.5); // Submit button
        this.quizContainer.list[this.quizContainer.list.length - 1].setAlpha(0.5); // Submit text
        
        const userOrder = this.currentOrder.map(item => {
            if (item) {
                return item.originalText || item.textObj.originalText;
            }
            return null;
        });
        
        const correctTexts = this.currentQuestion.correctOrder.map(index => 
            this.currentQuestion.blocks[index]
        );
        
        const isCorrect = userOrder.every((text, index) => text === correctTexts[index]);
        
        
        // Visual feedback for drag and drop blocks
        this.currentOrder.forEach((block, index) => {
            if (block) {
                const userText = block.originalText || block.textObj.originalText;
                const correctText = correctTexts[index];
                const isBlockCorrect = userText === correctText;
                
                if (isBlockCorrect) {
                    // Correct block - green
                    block.setFillStyle(0x38a169);
                    block.setStrokeStyle(3, 0xffffff);
                    block.textObj.setStyle({
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '15px'
                    });
                } else {
                    // Wrong block - red
                    block.setFillStyle(0xe53e3e);
                    block.setStrokeStyle(3, 0xffffff);
                    block.textObj.setStyle({
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '15px'
                    });
                }
                
                // Disable dragging
                block.disableInteractive();
                block.textObj.disableInteractive();
            }
        });
        
        // If wrong, highlight correct blocks on the left side
        if (!isCorrect) {
            this.dragBlocks.forEach((dragBlock) => {
                const correctIndex = correctTexts.findIndex(text => text === dragBlock.originalText);
                if (correctIndex !== -1 && !this.currentOrder[correctIndex]) {
                    // This block should be in a drop zone but isn't
                    dragBlock.block.setFillStyle(0x38a169);
                    dragBlock.block.setStrokeStyle(2, 0xffffff, 0.7);
                    dragBlock.text.setStyle({
                        color: '#ffffff',
                        fontWeight: 'bold'
                    });
                }
            });
        }
        
        // Update tooltip immediately (only if timer hasn't expired)
        if (!this.timerExpired) {
            this.updateTooltip(isCorrect);
        }
        
        // Return to gameplay after delay (only if timer hasn't expired)
        this.time.delayedCall(1200, () => {
            if (!this.timerExpired) {
                this.returnToGameplay(isCorrect);
            }
        });
    }

    createAnswerButtons(startOffset, isMobile = false, isSmallMobile = false) {
        const answers = this.currentQuestion.options;
        const startY = startOffset || -80; // Start position relative to center
        const buttonHeight = isMobile ? 54 : 60;
        const buttonSpacing = isMobile ? 62 : 78;
        
        this.answerButtons = [];
        
        // Always use vertical layout on mobile for better readability
        // Only use side-by-side layout on desktop with 2 answers
        if (answers.length === 2 && !isMobile) {
            this.createTwoChoiceButtons(startY, isMobile, isSmallMobile);
            return;
        }
        
        // Vertical layout for 3+ answers or mobile devices
        for (let i = 0; i < answers.length; i++) {
            const buttonY = startY + (i * buttonSpacing);
            
            // Create button container
            const buttonContainer = this.add.container(0, buttonY);
            
            // Much smaller button sizing for mobile
            const buttonWidth = isMobile ? (isSmallMobile ? 300 : 340) : 640;
            const fontSize = isMobile ? (isSmallMobile ? '16px' : '18px') : '18px';
            const textWrapWidth = buttonWidth - 30;
            
            // Create button background with responsive size
            const buttonBg = this.add.graphics();
            // Default: soft yellow fill with brown/gold border (matches reference)
            buttonBg.fillStyle(0xF9DD72, 1); // base yellow
            buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 14);
            buttonBg.lineStyle(4, 0xB8860B, 1); // dark goldenrod border
            buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 14);
            
            // Create answer text with responsive sizing
            const answerText = this.add.text(0, 0, `${String.fromCharCode(65 + i)}. ${answers[i]}`, {
                fontFamily: 'Arial',
                fontSize: fontSize,
                color: '#000000',
                align: 'center',
                wordWrap: { width: textWrapWidth }
            }).setOrigin(0.5);
            
            // Create interactive area with larger touch targets for mobile
            const hitAreaHeight = isMobile ? Math.max(buttonHeight, 56) : buttonHeight;
            const hitArea = this.add.rectangle(0, 0, buttonWidth, hitAreaHeight, 0x000000, 0);
            hitArea.setInteractive();
            
            buttonContainer.add([buttonBg, answerText, hitArea]);
            this.quizContainer.add(buttonContainer);
            
            // Store references
            this.answerButtons.push({
                container: buttonContainer,
                background: buttonBg,
                text: answerText,
                hitArea: hitArea,
                index: i,
                isSelected: false,
                buttonWidth: buttonWidth,
                buttonHeight: buttonHeight
            });
            
            // Add hover effects
            hitArea.on('pointerover', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillStyle(0xFFE58A, 1); // lighter hover
                    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 14);
                    buttonBg.lineStyle(4, 0xDAA520, 1); // golden border
                    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 14);
                }
            });

            hitArea.on('pointerout', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillStyle(0xF9DD72, 1);
                    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 14);
                    buttonBg.lineStyle(4, 0xB8860B, 1);
                    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 14);
                }
            });

            // Add click handler
            hitArea.on('pointerdown', () => {
                this.selectAnswer(i);
            });
        }
    }

    createTwoChoiceButtons(startY, isMobile = false, isSmallMobile = false) {
        const answers = this.currentQuestion.options;
        // Mobile uses vertical layout, desktop uses side-by-side
    const buttonWidth = isMobile ? (isSmallMobile ? 360 : 420) : 300;
    const buttonHeight = isMobile ? (isSmallMobile ? 60 : 68) : 70;
    const spacing = isMobile ? (isSmallMobile ? 84 : 96) : 54; // Larger vertical spacing on mobile
    const fontSize = isMobile ? (isSmallMobile ? '18px' : '20px') : '20px';
        
        for (let i = 0; i < 2; i++) {
            let buttonX, buttonY;
            
            if (isMobile) {
                // Vertical layout for mobile: keep below the question
                buttonX = 0;
                buttonY = startY + (i * spacing);
            } else {
                // Side-by-side layout for desktop
                buttonX = i === 0 ? -(buttonWidth/2 + spacing/2) : (buttonWidth/2 + spacing/2);
                buttonY = startY;
            }
            
            // Create button container
            const buttonContainer = this.add.container(buttonX, buttonY);
            
            // Create button background with responsive size
            const buttonBg = this.add.graphics();
            buttonBg.fillStyle(0xF9DD72, 1);
            buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 18);
            buttonBg.lineStyle(4, 0xB8860B, 1);
            buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 18);
            
            // Create answer text with responsive sizing
            const textWrapWidth = buttonWidth - (isMobile ? 20 : 20);
            const answerText = this.add.text(0, 0, answers[i], {
                fontFamily: 'Arial',
                fontSize: fontSize,
                fontWeight: 'bold',
                color: '#000000',
                align: 'center',
                wordWrap: { width: textWrapWidth }
            }).setOrigin(0.5);
            
            // Create interactive area with larger touch targets for mobile
            const hitAreaHeight = isMobile ? Math.max(buttonHeight, 50) : buttonHeight;
            const hitArea = this.add.rectangle(0, 0, buttonWidth, hitAreaHeight, 0x000000, 0);
            hitArea.setInteractive();
            
            buttonContainer.add([buttonBg, answerText, hitArea]);
            this.quizContainer.add(buttonContainer);
            
            // Store references
            this.answerButtons.push({
                container: buttonContainer,
                background: buttonBg,
                text: answerText,
                hitArea: hitArea,
                index: i,
                isSelected: false,
                buttonWidth: buttonWidth,
                buttonHeight: buttonHeight
            });
            
            // Add hover effects with enhanced styling
            hitArea.on('pointerover', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillStyle(0xFFE58A, 1);
                    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 18);
                    buttonBg.lineStyle(4, 0xDAA520, 1);
                    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 18);
                }
            });

            hitArea.on('pointerout', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillStyle(0xF9DD72, 1);
                    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 18);
                    buttonBg.lineStyle(4, 0xB8860B, 1);
                    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 18);
                }
            });

            // Add click handler
            hitArea.on('pointerdown', () => {
                this.selectAnswer(i);
            });
        }
    }

    selectAnswer(selectedIndex) {
        // Prevent multiple selections and check for timer expiration first
        if (this.selectedAnswer !== null || this.timerExpired) return;
        
        this.selectedAnswer = selectedIndex;
        const correctIndex = this.currentQuestion.correctIndex;
        const isCorrect = selectedIndex === correctIndex;
        
        // Update button appearance to show selection
        this.answerButtons.forEach((button, index) => {
            button.isSelected = true;
            
            // Use the stored responsive dimensions from the button object
            const buttonWidth = button.buttonWidth;
            const buttonHeight = button.buttonHeight;
            const cornerRadius = buttonWidth < 320 ? 10 : (buttonWidth === 280 ? 15 : 10);
            
            if (index === selectedIndex) {
                // Selected answer styling
                button.background.clear();
                if (isCorrect) {
                    // Bright correct green similar to reference (#00FF4E approx)
                    button.background.fillStyle(0x00FF4E, 1);
                    button.background.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius + 4);
                    button.background.lineStyle(4, 0x008F2A, 1);
                    button.background.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius + 4);
                } else {
                    // Wrong magenta/pink (#FF0066-ish) with darker border
                    button.background.fillStyle(0xFF0066, 1);
                    button.background.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius + 4);
                    button.background.lineStyle(4, 0x8B002F, 1);
                    button.background.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius + 4);
                }
            } else if (index === correctIndex && !isCorrect) {
                // Reveal correct answer when user selected wrong
                button.background.clear();
                button.background.fillStyle(0x00FF4E, 1);
                button.background.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius + 4);
                button.background.lineStyle(3, 0x008F2A, 1);
                button.background.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius + 4);
            }
            
            // Disable interaction
            button.hitArea.removeInteractive();
        });
        
        // Update tooltip immediately (only if timer hasn't expired)
        if (!this.timerExpired) {
            this.updateTooltip(isCorrect);
        }
        
        // Return to gameplay after delay (only if timer hasn't expired)
        this.time.delayedCall(1200, () => {
            if (!this.timerExpired) {
                this.returnToGameplay(isCorrect);
            }
        });
    }

    updateTooltip(isCorrect) {
        // Don't update tooltip if timer has expired or tooltip doesn't exist
        if (this.timerExpired || !this.tooltipText) return;
        // If it's a syntaxBlock question show feedback both in top result text (if present) and tooltip
        // syntaxResultText removed (redundant); rely solely on tooltipText

        if (isCorrect) {
            // Preserve reward text style matching multiple choice
            this.tooltipText.setText('Correct! +100pts +10s');
            this.tooltipText.setStyle({ color: '#00FF4E', fontWeight: 'bold' });
        } else {
            this.tooltipText.setText('Wrong! Tap the correct syntax next time');
            this.tooltipText.setStyle({ color: '#FF0066', fontWeight: 'bold' });
        }
        
        // Add a subtle pulse animation to draw attention
        this.tweens.add({
            targets: this.tooltipText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 200,
            ease: 'Power2.easeOut',
            yoyo: true,
            repeat: 1
        });
    }

    returnToGameplay(isCorrect) {
        // Don't proceed if timer has expired (scene should already be stopping)
        if (this.timerExpired) return;
        
        // Prepare result data to send back
        const resultData = {
            correct: isCorrect,
            enemyToDestroy: this.enemyData,
            questionData: this.currentQuestion,
            questionType: this.getQuestionType(),
            bloomTarget: this.getBloomLevel()
        };
        
        // Animate exit - simple fade out
        this.tweens.add({
            targets: this.quizContainer,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Send completion event to main gameplay scene and stop quiz scene
                this.scene.get('MainGameplay').events.emit('quiz-completed', resultData);
                this.scene.stop();
            }
        });
    }

    handleTimerExpired() {
        // Immediately close quiz scene when timer runs out - highest priority
        if (!this.timerExpired) {
            this.timerExpired = true;
            this.answerSubmitted = true; // Prevent any answer submission
            
            // Cancel any pending delayed calls
            if (this.time && this.time.removeAllEvents) {
                this.time.removeAllEvents();
            }
            
            // Immediately return to gameplay without any animations or delays
            const resultData = {
                correct: false,
                enemyToDestroy: this.enemyData,
                questionData: this.currentQuestion,
                questionType: this.getQuestionType(),
                bloomTarget: this.getBloomLevel()
            };
            
            // Send completion event and stop scene immediately
            const mainScene = this.scene.get('MainGameplay');
            if (mainScene && mainScene.events) {
                mainScene.events.emit('quiz-completed', resultData);
            }
            this.scene.stop();
        }
    }

    destroy() {
        // Clean up event listeners
        const mainScene = this.scene.get('MainGameplay');
        if (mainScene) {
            mainScene.events.off('timer-expired', this.handleTimerExpired, this);
        }
        super.destroy();
    }
}
