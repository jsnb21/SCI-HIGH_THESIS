import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';
import { getScaleInfo } from '../../utils/mobileUtils.js';

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
        this.backgroundOverlay = null;
        this.quizContainer = null;
        this.resultContainer = null;
    }

    init(data) {
        // Receive data from main gameplay scene
        this.courseTopic = data.courseTopic;
        this.enemyData = data.enemyToDestroy;
        this.intensity = data.intensity || 1;
        this.answeredQuestions = data.answeredQuestions || {
            intensity1: { multipleChoice: new Set() },
            intensity2: { multipleChoice: new Set(), dragDrop: new Set() },
            intensity3: { codeArrangement: new Set() }
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
        
        // Get mobile information for responsive overlay positioning
        const scaleInfo = getScaleInfo(this);
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        
        // Calculate UI element positions using the same logic as main gameplay scene
        const scoreY = isMobile ? Math.min(30, screenHeight * 0.05) : 30;
        const streakY = isMobile ? Math.min(65, screenHeight * 0.11) : 65;
        const scoreFontSize = isMobile ? Math.max(18, screenWidth * 0.03) : 24;
        const streakFontSize = isMobile ? Math.max(14, screenWidth * 0.025) : 18;
        
        // Calculate overlay start position based on actual UI element heights
        // Add some padding after the streak text (use font size as height approximation)
        const overlayStartY = Math.max(100, streakY + streakFontSize + 20);
        const overlayHeight = this.scale.height - overlayStartY;
        const overlayY = overlayStartY + (overlayHeight / 2);
        
        this.backgroundOverlay = this.add.rectangle(
            this.scale.width / 2, 
            overlayY, 
            this.scale.width, 
            overlayHeight, 
            0x000000, 
            0.85
        );
        
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
        // Load questions based on intensity level
        if (this.intensity >= 3) {
            // Intensity 3: Try code arrangement first, then expand to all question types
            this.loadCodeArrangementQuestion();
            if (this.currentQuestion) {
                // Check if it's actually a drag-drop question or just multiple choice
                if (this.currentQuestion.prompt || this.currentQuestion.description || 
                    (this.currentQuestion.type && this.currentQuestion.type.includes('drag'))) {
                    this.currentQuestion.isDragDrop = true;
                } else {
                    // It's actually a multiple choice question in the code arrangement section
                }
                return;
            } else {
                // No code arrangement questions available, try loading from combined pool
                this.loadCombinedIntensity3Question();
                if (this.currentQuestion) {
                    return;
                }
            }
        } else if (this.intensity === 2) {
            // Intensity 2: Mix of multiple choice and drag-drop (precedence order)
            const questionType = Math.random() < 0.5 ? 'multipleChoice' : 'dragDrop';
            if (questionType === 'dragDrop') {
                this.loadDragDropQuestion();
                if (this.currentQuestion) {
                    return;
                }
            } else {
                this.loadMultipleChoiceQuestion(2);
                if (this.currentQuestion) {
                    return;
                }
            }
        } else {
            // Intensity 1: Multiple choice only
            this.loadMultipleChoiceQuestion(1);
            if (this.currentQuestion) {
                return;
            }
        }
        
        // Final fallback to intensity 1 multiple choice if nothing else works
        this.loadMultipleChoiceQuestion(1);
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
            // Filter out already answered questions
            const availableQuestions = this.filterAnsweredQuestions(
                quizData.intensity3.codeArrangement, 
                3, 
                'codeArrangement'
            );
            
            if (availableQuestions.length > 0) {
                // Select a random code arrangement question from the available questions
                this.currentQuestion = Phaser.Utils.Array.GetRandom(availableQuestions);
            }
        } else if (quizData && quizData.codeArrangement && quizData.codeArrangement.length > 0) {
            // Fallback to old structure for compatibility
            const availableQuestions = this.filterAnsweredQuestions(
                quizData.codeArrangement, 
                3, 
                'codeArrangement'
            );
            
            if (availableQuestions.length > 0) {
                this.currentQuestion = Phaser.Utils.Array.GetRandom(availableQuestions);
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
                multipleChoice: new Set(),
                dragDrop: new Set(),
                codeArrangement: new Set(),
                combined: new Set() // Special tracker for combined pool
            };
        }

        const combinedSet = this.answeredQuestions[intensityKey].combined;

        // Filter out questions that have already been answered in the combined pool
        const availableQuestions = questions.filter(question => {
            const questionId = this.createQuestionId(question);
            return !combinedSet.has(questionId);
        });


        // If all questions have been answered, reset the combined pool and all individual pools
        if (availableQuestions.length === 0 && questions.length > 0) {
            
            // Clear all intensity 3 question pools to start fresh cycle
            this.answeredQuestions[intensityKey].multipleChoice.clear();
            this.answeredQuestions[intensityKey].dragDrop.clear();
            this.answeredQuestions[intensityKey].codeArrangement.clear();
            this.answeredQuestions[intensityKey].combined.clear();
            
            return questions; // Return all questions after reset
        }

        return availableQuestions;
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
            return !answeredSet.has(questionId);
        });
        
        
        // If all questions have been answered, reset the answered questions for this category
        if (availableQuestions.length === 0 && questions.length > 0) {
            answeredSet.clear();
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
        if (this.currentQuestion.isDragDrop || this.currentQuestion.type === 'drag-and-drop') {
            return this.intensity === 3 ? 'codeArrangement' : 'dragDrop';
        } else {
            return 'multipleChoice';
        }
    }

    createQuizInterface() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        // Use improved mobile detection (CSS-based for detection only)
        const isMobile = scaleInfo.isMobile || scaleInfo.width < 900;
        const isSmallMobile = scaleInfo.width < 500;
        
        // Check if this is a drag-and-drop question (code arrangement - intensity 3)
        if (this.currentQuestion.isDragDrop) {
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
        
        // Create modern quiz box with dynamic size
        const quizBox = this.add.graphics();
        quizBox.fillStyle(0x2a2a3a, 1);
        quizBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 20);
        quizBox.lineStyle(4, 0x64ffda);
        quizBox.strokeRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 20);
        
        // Add glow effect
        const glowBox = this.add.graphics();
        glowBox.lineStyle(8, 0x64ffda, 0.3);
        glowBox.strokeRoundedRect(-contentWidth/2 - 4, -contentHeight/2 - 4, contentWidth + 8, contentHeight + 8, 20);
        
        this.quizContainer.add([glowBox, quizBox]);
        
        // Title with programming language - responsive font size
        const courseTopic = this.courseTopic || 'Programming';
        this.titleText = this.add.text(0, -contentHeight/2 + (titleHeight/2) + 5, `${courseTopic.toUpperCase()} QUIZ CHALLENGE`, {
            fontFamily: 'Arial',
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: '#64ffda',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(this.titleText);
        
        // Question number indicator - responsive
        const questionNumberFontSize = isMobile ? '12px' : '18px';
        const questionNumber = this.add.text(0, -contentHeight/2 + titleHeight + (questionNumberHeight/2), 'Question 1 of 1', {
            fontFamily: 'Arial',
            fontSize: questionNumberFontSize,
            color: '#a0a0a0',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(questionNumber);
        
        // Question text with better formatting - responsive
        this.questionText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + (questionHeight/2) + 10, this.currentQuestion.question, {
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
        
        // Add instruction text - responsive size and consistent bottom margin inside the box
        const instructionFontPx = isMobile
            ? Math.max(14, Math.round(questionFontPx * 0.75))
            : Math.max(16, Math.round(24 * 0.65));
        const instructionFontSize = `${instructionFontPx}px`;
        const instructionMarginBottom = isMobile ? 18 : 22; // keep it safely inside the rounded border
    const instructionY = (contentHeight / 2) - instructionMarginBottom - 3; // raised by 3px
        const instructionText = this.add.text(0, instructionY, 'Tap your answer choice', {
            fontFamily: 'Arial',
            fontSize: instructionFontSize,
            color: '#a0a0a0',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(instructionText);
        
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

    createDragDropInterface(centerX, centerY) {
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.isMobile || scaleInfo.width < 900;
        const isSmallMobile = scaleInfo.width < 500;
        const aspect = this.scale.height / (this.scale.width || 1);
        const isTallMobile = (isMobile || scaleInfo.isPortrait) && aspect > 1.85;
        const TALL_MOBILE_FONT_REDUCE = 0.94;
        const DD_MOBILE_MAX_WIDTH_RATIO = 0.92;  // a bit narrower to fit controls comfortably
        const DD_MOBILE_MAX_HEIGHT_RATIO = 0.86;  // allow more height for blocks
        
        // Create main quiz container
        this.quizContainer = this.add.container(centerX, centerY);
        
        // Calculate responsive dimensions
        let maxWidth = isMobile ? (isSmallMobile ? this.scale.width * (DD_MOBILE_MAX_WIDTH_RATIO - 0.02) : this.scale.width * DD_MOBILE_MAX_WIDTH_RATIO) : Math.min(this.scale.width * 0.92, 1200);
        let maxHeight = isMobile ? (isSmallMobile ? this.scale.height * 0.84 : this.scale.height * 0.82) : Math.min(this.scale.height * 0.86, 820);
        if (isTallMobile) {
            maxWidth = this.scale.width * 0.9; // allow a bit wider on tall devices
            maxHeight = this.scale.height * 0.86; // slightly taller for tall devices
        }
        
        // Responsive font sizes
        let titleFontPx = isMobile ? (isSmallMobile ? 32 : 36) : 30;
        let questionFontPx = isMobile ? (isSmallMobile ? 22 : 26) : 24;
        let descriptionFontPx = isMobile ? (isSmallMobile ? 16 : 18) : 18;
        let instructionFontPx = isMobile ? (isSmallMobile ? 16 : 18) : 18;
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
        
        // Calculate content areas based on number of blocks
        const numberOfBlocks = this.currentQuestion.blocks.length;
        let blockSpacing = isMobile ? (isSmallMobile ? 62 : 68) : 64;
        let titleHeight = isMobile ? (isSmallMobile ? 56 : 62) : 56;
        const questionNumberHeight = 0;
        let questionHeight = isMobile ? (isSmallMobile ? 120 : 132) : 112;
        let instructionHeight = isMobile ? (isSmallMobile ? 120 : 132) : 130;
        const draggableAreaHeight = numberOfBlocks * blockSpacing + (isMobile ? 30 : 40);
        let submitAreaHeight = isMobile ? (isSmallMobile ? 100 : 112) : 108;
        if (isTallMobile) {
            blockSpacing = Math.max(54, blockSpacing - 6);
            questionHeight = Math.max(110, questionHeight - 10);
            instructionHeight = Math.max(108, instructionHeight - 12);
            submitAreaHeight = Math.max(96, submitAreaHeight - 10);
            titleHeight = Math.max(48, titleHeight - 6);
        }
        
        const contentHeight = titleHeight + questionNumberHeight + questionHeight + instructionHeight + draggableAreaHeight + submitAreaHeight;
        const contentWidth = maxWidth;
        
        // Create main background with same style as multiple choice
        const quizBox = this.add.graphics();
    quizBox.fillStyle(0x1a2332, 0.98);
        quizBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 20);
        quizBox.lineStyle(3, 0x34495e, 1);
        quizBox.strokeRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 20);
        
        // Add glow effect
        const glowBox = this.add.graphics();
        glowBox.lineStyle(8, 0x64ffda, 0.3);
        glowBox.strokeRoundedRect(-contentWidth/2 - 4, -contentHeight/2 - 4, contentWidth + 8, contentHeight + 8, 20);
        
        this.quizContainer.add([glowBox, quizBox]);
        
        // Title with programming language - responsive font size
        const courseTopic = this.courseTopic || 'Programming';
        this.titleText = this.add.text(0, -contentHeight/2 + (titleHeight/2) + 5, `${courseTopic.toUpperCase()} CODE ARRANGEMENT`, {
            fontFamily: 'Arial',
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: '#64ffda',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(this.titleText);
        
        // Question text with better formatting - responsive
        this.questionText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + (questionHeight/2) + 10, this.currentQuestion.title, {
            fontFamily: 'Arial',
            fontSize: questionFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: contentWidth - (isMobile ? 60 : 80) },
            lineSpacing: isMobile ? 6 : 8
        }).setOrigin(0.5);
        this.quizContainer.add(this.questionText);
        
        // Description text - responsive
        const descText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + (isMobile ? 15 : 20), this.currentQuestion.description, {
            fontFamily: 'Arial',
            fontSize: descriptionFontSize,
            color: '#bdc3c7',
            align: 'center',
            wordWrap: { width: contentWidth - (isMobile ? 80 : 100) }
        }).setOrigin(0.5);
        this.quizContainer.add(descText);
        
        // Instruction text - responsive
        const instructionText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + (isMobile ? 45 : 60), 'Drag code blocks to arrange them in correct order', {
            fontFamily: 'Arial',
            fontSize: instructionFontSize,
            color: '#64ffda',
            align: 'center',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        this.quizContainer.add(instructionText);
        
        // Add swap behavior note with responsive sizing
        const swapNoteFontSize = isMobile ? '10px' : '12px';
        const swapNote = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + (isMobile ? 75 : 90), 'Note: Unplaced blocks can swap with placed blocks, but placed blocks cannot be removed', {
            fontFamily: 'Arial',
            fontSize: swapNoteFontSize,
            color: '#a0a0a0',
            align: 'center',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        this.quizContainer.add(swapNote);
        
        // Store dimensions for responsive block creation
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;
        this.draggableAreaY = -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + instructionHeight + 50;
        
        // Create shuffled blocks and drop zones
        this.createDragDropBlocks();
        
        // Submit button
        this.createSubmitButton();
        
    // Add entrance animation
        // Determine scale relative to viewport height limit
        let ddTargetScale = 1;
        if (isMobile) {
            const ddMaxHeight = this.scale.height * DD_MOBILE_MAX_HEIGHT_RATIO;
            if (contentHeight > ddMaxHeight) {
                ddTargetScale = Math.min(ddTargetScale, ddMaxHeight / contentHeight);
            }
            // Width constraint pass
            const allowedWidth = scaleInfo.width * DD_MOBILE_MAX_WIDTH_RATIO;
            if (contentWidth * ddTargetScale > allowedWidth) {
                ddTargetScale = Math.min(ddTargetScale, allowedWidth / contentWidth);
            }
            // Minimum safe scale for drag/drop readability
            const MIN_DD_SCALE = 0.78; // larger baseline for drag/drop
            ddTargetScale = Math.max(ddTargetScale, MIN_DD_SCALE);
        }
        if (isTallMobile) {
            ddTargetScale *= 0.97; // gentler shrink
        }
        // Global boost: enlarge drag/drop UI by ~20% with clamps
        const DD_BOOST = 1.2;
        ddTargetScale *= DD_BOOST;
        if (isMobile) {
            // Re-apply width/height constraints after boost
            const allowedWidth = scaleInfo.width * DD_MOBILE_MAX_WIDTH_RATIO;
            if (contentWidth * ddTargetScale > allowedWidth) {
                ddTargetScale = Math.min(ddTargetScale, allowedWidth / contentWidth);
            }
            const ddMaxHeight = this.scale.height * DD_MOBILE_MAX_HEIGHT_RATIO;
            if (contentHeight * ddTargetScale > ddMaxHeight) {
                ddTargetScale = Math.min(ddTargetScale, ddMaxHeight / contentHeight);
            }
            const MIN_DD_SCALE = 0.78;
            ddTargetScale = Math.max(ddTargetScale, MIN_DD_SCALE);
        }
        // If Python topic, boost slightly more on mobile for readability
        if (isMobile) {
            const topic = (this.courseTopic || '').toLowerCase();
            if (topic.includes('python')) {
                ddTargetScale *= 1.12; // bigger extra bump for python code arrangement
                // Re-apply constraints to keep within viewport after bump
                const allowedWidth2 = scaleInfo.width * DD_MOBILE_MAX_WIDTH_RATIO;
                if (contentWidth * ddTargetScale > allowedWidth2) {
                    ddTargetScale = Math.min(ddTargetScale, allowedWidth2 / contentWidth);
                }
                const ddMaxHeight2 = this.scale.height * DD_MOBILE_MAX_HEIGHT_RATIO;
                if (contentHeight * ddTargetScale > ddMaxHeight2) {
                    ddTargetScale = Math.min(ddTargetScale, ddMaxHeight2 / contentHeight);
                }
                const MIN_DD_SCALE2 = 0.78;
                ddTargetScale = Math.max(ddTargetScale, MIN_DD_SCALE2);
            }
        }
        this.quizContainer.setScale(ddTargetScale * 0.85);
        this.quizContainer.setAlpha(0);
        this.tweens.add({
            targets: this.quizContainer,
            scaleX: ddTargetScale,
            scaleY: ddTargetScale,
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
        
        // Calculate responsive dimensions
        const blockWidth = Math.min(350, (this.contentWidth - 100) / 2);
        const blockHeight = 50;
        const blockSpacing = 60;
        
        // Calculate positions for left side (draggable blocks) and right side (drop zones)
        const leftX = -this.contentWidth/4;
        const rightX = this.contentWidth/4;
        const startY = this.draggableAreaY;
        
        // Create drag blocks (left side)
        blocks.forEach((block, index) => {
            const blockY = startY + (index * blockSpacing);
            
            const blockObj = this.add.rectangle(leftX, blockY, blockWidth, blockHeight, 0x3498db);
            blockObj.setStrokeStyle(2, 0x2980b9);
            
            const blockText = this.add.text(leftX, blockY, block, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: blockWidth - 20 }
            }).setOrigin(0.5);
            
            // Make interactive
            blockObj.setInteractive({ draggable: true });
            blockText.setInteractive({ draggable: true });
            
            // Store data
            blockObj.originalText = block;
            blockObj.textObj = blockText;
            blockText.blockObj = blockObj;
            blockText.originalText = block;
            
            this.setupDragEvents(blockObj, blockText);
            
            this.quizContainer.add([blockObj, blockText]);
            this.dragBlocks.push({ block: blockObj, text: blockText, originalText: block });
        });
        
        // Create drop zones (right side) with better styling
        for (let i = 0; i < blocks.length; i++) {
            const dropY = startY + (i * blockSpacing);
            
            const dropZone = this.add.rectangle(rightX, dropY, blockWidth, blockHeight, 0x95a5a6);
            dropZone.setStrokeStyle(2, 0x7f8c8d);
            dropZone.setAlpha(0.3);
            
            const label = this.add.text(rightX, dropY, `${i + 1}. Drop here`, {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#2c3e50',
                align: 'center',
                fontWeight: 'bold'
            }).setOrigin(0.5);
            
            dropZone.setInteractive({ dropZone: true });
            dropZone.index = i;
            dropZone.label = label;
            
            this.quizContainer.add([dropZone, label]);
            this.dropZones.push(dropZone);
        }
    }

    setupDragEvents(blockObj, blockText) {
        // Store initial offsets between block and text
        const textOffsetX = blockText.x - blockObj.x;
        const textOffsetY = blockText.y - blockObj.y;
        
        // Set up drag events for the block
        blockObj.on('dragstart', (pointer, dragX, dragY) => {
            blockObj.setFillStyle(0xffff00); // Yellow highlight
            blockText.setColor('#000000'); // Dark text for visibility
            
            // Store the offset from mouse to block center when drag starts
            blockObj.dragOffsetX = pointer.worldX - (blockObj.x + this.quizContainer.x);
            blockObj.dragOffsetY = pointer.worldY - (blockObj.y + this.quizContainer.y);
        });
        
        blockObj.on('drag', (pointer, dragX, dragY) => {
            // Calculate new position relative to container, accounting for initial offset
            const newX = pointer.worldX - this.quizContainer.x - blockObj.dragOffsetX;
            const newY = pointer.worldY - this.quizContainer.y - blockObj.dragOffsetY;
            
            // Update block position
            blockObj.x = newX;
            blockObj.y = newY;
            
            // Update text position to stay with the block
            blockText.x = newX + textOffsetX;
            blockText.y = newY + textOffsetY;
        });
        
        blockObj.on('dragend', () => {
            // Check if block is in a drop zone to determine styling
            let isInDropZone = false;
            for (let i = 0; i < this.currentOrder.length; i++) {
                if (this.currentOrder[i] === blockObj) {
                    isInDropZone = true;
                    break;
                }
            }
            
            if (isInDropZone) {
                // Keep drop zone styling
                blockObj.setFillStyle(0x2ecc71);
                blockText.setColor('#ffffff');
            } else {
                // Back to original left side styling
                blockObj.setFillStyle(0x3498db);
                blockText.setColor('#ffffff');
            }
        });
        
        // Set up drag events for the text (should move the block too)
        blockText.on('dragstart', (pointer, dragX, dragY) => {
            blockObj.setFillStyle(0xffff00); // Yellow highlight
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
                // Keep drop zone styling
                blockObj.setFillStyle(0x2ecc71);
                blockText.setColor('#ffffff');
            } else {
                // Back to original left side styling
                blockObj.setFillStyle(0x3498db);
                blockText.setColor('#ffffff');
            }
        });
        
        // Drop zone events
        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (this.dropZones.includes(dropZone)) {
                // Calculate positions for repositioning
                const leftX = -this.contentWidth/4;
                const rightX = this.contentWidth/4;
                
                // Get the dragged object (could be block or text)
                let draggedBlock, draggedText;
                if (gameObject.textObj) {
                    // It's a block object
                    draggedBlock = gameObject;
                    draggedText = gameObject.textObj;
                } else if (gameObject.blockObj) {
                    // It's a text object
                    draggedText = gameObject;
                    draggedBlock = gameObject.blockObj;
                }
                
                // Check if there's already something in this drop zone
                const existingBlock = this.currentOrder[dropZone.index];
                
                if (existingBlock) {
                    // SWAP: Find where the dragged item came from
                    let draggedFromIndex = -1;
                    
                    // Check if dragged item was in a drop zone
                    for (let i = 0; i < this.currentOrder.length; i++) {
                        if (this.currentOrder[i] === draggedBlock) {
                            draggedFromIndex = i;
                            break;
                        }
                    }
                    
                    if (draggedFromIndex !== -1) {
                        // Swap positions: move existing block to where dragged item came from
                        const swapDropZone = this.dropZones[draggedFromIndex];
                        existingBlock.x = swapDropZone.x;
                        existingBlock.y = swapDropZone.y;
                        existingBlock.textObj.x = swapDropZone.x;
                        existingBlock.textObj.y = swapDropZone.y;
                        this.currentOrder[draggedFromIndex] = existingBlock;
                        
                        // Keep existing block styled for drop zone
                        existingBlock.setFillStyle(0x2ecc71);
                        existingBlock.setStrokeStyle(3, 0x27ae60);
                        existingBlock.textObj.setStyle({
                            color: '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '15px'
                        });
                        
                        // Update the original drop zone appearance
                        swapDropZone.setAlpha(0.1); // 10% opacity for occupied zones
                        swapDropZone.label.setText(`${draggedFromIndex + 1}.`);
                    } else {
                        // Dragged item came from the left side, send existing block back to left
                        const dragBlockIndex = this.dragBlocks.findIndex(db => db.block === draggedBlock);
                        const originalY = this.draggableAreaY + (dragBlockIndex * 60);
                        existingBlock.x = leftX;
                        existingBlock.y = originalY;
                        existingBlock.textObj.x = leftX;
                        existingBlock.textObj.y = originalY;
                        
                        // Reset block styling when returning to left side
                        existingBlock.setFillStyle(0x3498db);
                        existingBlock.setStrokeStyle(2, 0x2980b9);
                        existingBlock.textObj.setStyle({
                            color: '#ffffff',
                            fontWeight: 'normal',
                            fontSize: '14px'
                        });
                    }
                } else {
                    // No existing block, check if dragged item was in another drop zone
                    for (let i = 0; i < this.currentOrder.length; i++) {
                        if (this.currentOrder[i] === draggedBlock) {
                            // Clear the previous position
                            this.currentOrder[i] = null;
                            this.dropZones[i].setAlpha(0.3);
                            this.dropZones[i].label.setText(`${i + 1}. Drop here`);
                            break;
                        }
                    }
                }
                
                // Place the dragged item in the new position
                draggedBlock.x = dropZone.x;
                draggedBlock.y = dropZone.y;
                draggedText.x = dropZone.x;
                draggedText.y = dropZone.y;
                this.currentOrder[dropZone.index] = draggedBlock;
                
                // Make the block more visible when dropped in zone
                draggedBlock.setFillStyle(0x2ecc71); // Bright green for dropped blocks
                draggedBlock.setStrokeStyle(3, 0x27ae60); // Thicker green border
                draggedText.setStyle({
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '15px' // Slightly larger text
                });
                
                // Update drop zone appearance
                dropZone.setAlpha(0.1); // 10% opacity for occupied drop zones
                dropZone.label.setText(`${dropZone.index + 1}.`);
            }
        });
    }

    createSubmitButton() {
        // Calculate submit button position based on the number of blocks
        const blockSpacing = 60;
        const numberOfBlocks = this.currentQuestion.blocks.length;
        const lastBlockY = this.draggableAreaY + ((numberOfBlocks - 1) * blockSpacing);
        const submitY = lastBlockY + 80; // 80px below the last block
        
        // Create submit button with same style as multiple choice
        const submitBtn = this.add.graphics();
        submitBtn.fillStyle(0x27ae60, 1);
        submitBtn.fillRoundedRect(-100, -25, 200, 50, 10);
        submitBtn.lineStyle(2, 0x229954, 1);
        submitBtn.strokeRoundedRect(-100, -25, 200, 50, 10);
        submitBtn.x = 0;
        submitBtn.y = submitY;
        
        const submitText = this.add.text(0, submitY, 'Submit Order', {
            fontFamily: 'Arial',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Create invisible hit area for better interaction
        const hitArea = this.add.rectangle(0, submitY, 200, 50, 0x000000, 0);
        hitArea.setInteractive();
        
        // Add hover effects
        hitArea.on('pointerover', () => {
            submitBtn.clear();
            submitBtn.fillStyle(0x229954, 1);
            submitBtn.fillRoundedRect(-100, -25, 200, 50, 10);
            submitBtn.lineStyle(3, 0x1e8449, 1);
            submitBtn.strokeRoundedRect(-100, -25, 200, 50, 10);
        });
        
        hitArea.on('pointerout', () => {
            submitBtn.clear();
            submitBtn.fillStyle(0x27ae60, 1);
            submitBtn.fillRoundedRect(-100, -25, 200, 50, 10);
            submitBtn.lineStyle(2, 0x229954, 1);
            submitBtn.strokeRoundedRect(-100, -25, 200, 50, 10);
        });
        
        hitArea.on('pointerdown', () => this.checkDragDropAnswer());
        
        this.quizContainer.add([submitBtn, submitText, hitArea]);
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
        
        // Show result after a brief delay (only if timer hasn't expired)
        this.time.delayedCall(400, () => {
            if (!this.timerExpired) {
                this.showResult(isCorrect);
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
            buttonBg.fillStyle(0x4a5568, 1);
            buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
            buttonBg.lineStyle(2, 0x64ffda, 0.5);
            buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
            
            // Create answer text with responsive sizing
            const answerText = this.add.text(0, 0, `${String.fromCharCode(65 + i)}. ${answers[i]}`, {
                fontFamily: 'Arial',
                fontSize: fontSize,
                color: '#ffffff',
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
                    buttonBg.fillStyle(0x64ffda, 0.3);
                    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
                    buttonBg.lineStyle(2, 0x64ffda);
                    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
                }
            });

            hitArea.on('pointerout', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillStyle(0x4a5568, 1);
                    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
                    buttonBg.lineStyle(2, 0x64ffda, 0.5);
                    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
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
            buttonBg.fillStyle(0x4a5568, 1);
            buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 15);
            buttonBg.lineStyle(3, 0x64ffda, 0.5);
            buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 15);
            
            // Create answer text with responsive sizing
            const textWrapWidth = buttonWidth - (isMobile ? 20 : 20);
            const answerText = this.add.text(0, 0, answers[i], {
                fontFamily: 'Arial',
                fontSize: fontSize,
                fontWeight: 'bold',
                color: '#ffffff',
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
                    buttonBg.fillStyle(0x64ffda, 0.4);
                    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 15);
                    buttonBg.lineStyle(3, 0x64ffda);
                    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 15);
                }
            });

            hitArea.on('pointerout', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillStyle(0x4a5568, 1);
                    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 15);
                    buttonBg.lineStyle(3, 0x64ffda, 0.5);
                    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 15);
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
                // Selected answer
                button.background.clear();
                if (isCorrect) {
                    button.background.fillStyle(0x38a169, 1);
                } else {
                    button.background.fillStyle(0xe53e3e, 1);
                }
                button.background.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius);
                button.background.lineStyle(3, 0xffffff);
                button.background.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius);
            } else if (index === correctIndex && !isCorrect) {
                // Show correct answer if user was wrong
                button.background.clear();
                button.background.fillStyle(0x38a169, 1);
                button.background.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius);
                button.background.lineStyle(2, 0xffffff, 0.7);
                button.background.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius);
            }
            
            // Disable interaction
            button.hitArea.removeInteractive();
        });
        
        // Show result after a brief delay (only if timer hasn't expired)
        this.time.delayedCall(400, () => {
            if (!this.timerExpired) {
                this.showResult(isCorrect);
            }
        });
    }

    showResult(isCorrect) {
        // Don't show result if timer has expired
        if (this.timerExpired) return;
        
        // Create result overlay
        this.resultContainer = this.add.container(this.scale.width / 2, this.scale.height / 2 + 300);
        
        const resultBg = this.add.graphics();
        resultBg.fillStyle(isCorrect ? 0x38a169 : 0xe53e3e, 0.9);
        resultBg.fillRoundedRect(-200, -50, 400, 100, 15);
        resultBg.lineStyle(3, 0xffffff);
        resultBg.strokeRoundedRect(-200, -50, 400, 100, 15);
        
        const resultText = this.add.text(0, -10, 
            isCorrect ? 'CORRECT!' : 'INCORRECT!', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        const rewardText = this.add.text(0, 15, 
            isCorrect ? '+100 Score, +10 Seconds' : 'Better luck next time!', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        this.resultContainer.add([resultBg, resultText, rewardText]);
        
        // Animate result appearance
        this.resultContainer.setScale(0.5);
        this.resultContainer.setAlpha(0);
        
        this.tweens.add({
            targets: this.resultContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Return to gameplay after delay (only if timer hasn't expired)
        this.time.delayedCall(1200, () => {
            if (!this.timerExpired) {
                this.returnToGameplay(isCorrect);
            }
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
            questionType: this.getQuestionType()
        };
        
        // Animate exit
        this.tweens.add({
            targets: [this.quizContainer, this.resultContainer],
            scaleX: 0.8,
            scaleY: 0.8,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeIn',
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
                questionType: this.getQuestionType()
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
