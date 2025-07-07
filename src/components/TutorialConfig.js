// Tutorial configurations for different quiz scenes and contexts

export const QUIZ_TUTORIAL_STEPS = {
    firstTime: [
        {
            title: "Welcome to SCI-HIGH Quiz Battle!",
            text: "Get ready to test your knowledge in an exciting battle format! Let me show you how everything works.",
            textBoxPosition: { x: 400, y: 200 },
            onShow: (scene) => {
                // Play welcome sound if available
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
            }
        },
        {
            title: "Player Health",
            text: "This shows your current health. You'll lose health when you answer incorrectly, so be careful!",
            target: null, // Will be set dynamically to player health UI
            highlightStyle: {
                borderColor: 0x00FF00,
                pulsate: true
            },
            textBoxPosition: { x: 150, y: 400 }
        },
        {
            title: "Enemy Health",
            text: "This is your opponent's health. Deal damage by answering questions correctly to defeat them!",
            target: null, // Will be set dynamically to enemy health UI
            highlightStyle: {
                borderColor: 0xFF0000,
                pulsate: true
            },
            textBoxPosition: { x: 600, y: 400 }
        },
        {
            title: "Timer",
            text: "Keep an eye on the timer! You have limited time to answer each question. Work quickly but carefully.",
            target: null, // Will be set dynamically to timer
            highlightStyle: {
                borderColor: 0xFFFF00,
                pulsate: true
            },
            textBoxPosition: { x: 600, y: 150 }
        },
        {
            title: "Combo Meter",
            text: "Answer consecutive questions correctly to build up your combo! Higher combos give you more points and damage.",
            target: null, // Will be set dynamically to combo meter
            highlightStyle: {
                borderColor: 0xFF00FF,
                pulsate: true
            },
            textBoxPosition: { x: 150, y: 150 }
        },
        {
            title: "Question Area",
            text: "Questions will appear here. Read them carefully before selecting your answer!",
            target: null, // Will be set dynamically to question area
            highlightStyle: {
                borderColor: 0x00FFFF,
                padding: 15
            },
            textBoxPosition: { x: 400, y: 500 }
        },
        {
            title: "Answer Options",
            text: "Click on one of these options to answer the question. Choose wisely - wrong answers will hurt you!",
            target: null, // Will be set dynamically to answer options
            highlightStyle: {
                borderColor: 0xFFA500,
                padding: 10
            },
            textBoxPosition: { x: 400, y: 150 }
        },
        {
            title: "Ready to Battle!",
            text: "Now you know the basics! Answer questions correctly to defeat enemies and protect your health. Good luck!",
            textBoxPosition: { x: 400, y: 300 },
            buttonText: "Start Battle!"
        }
    ],
    
    powerUps: [
        {
            title: "Power-Up Available!",
            text: "You've earned a power-up! These special abilities can help you in battle.",
            target: null, // Will be set to power-up button
            highlightStyle: {
                borderColor: 0xFFD700,
                pulsate: true
            }
        },
        {
            title: "Double Score",
            text: "This power-up doubles your points for the next few questions. Use it wisely for maximum benefit!",
            target: null
        },
        {
            title: "Second Chance",
            text: "Made a mistake? This power-up lets you try again without losing health. Perfect for tricky questions!",
            target: null
        }
    ],
    
    combo: [
        {
            title: "Combo Building!",
            text: "Great job! You're building a combo streak. Keep answering correctly to increase your damage and score multiplier!",
            target: null, // Will be set to combo meter
            highlightStyle: {
                borderColor: 0xFF00FF,
                pulsate: true
            }
        }
    ],
    
    lowHealth: [
        {
            title: "Health Warning!",
            text: "Your health is getting low! Be extra careful with your next answers or you might lose the battle!",
            target: null, // Will be set to player health
            highlightStyle: {
                borderColor: 0xFF0000,
                pulsate: true,
                borderWidth: 5
            },
            textBoxStyle: {
                backgroundColor: 0x8B0000,
                borderColor: 0xFF0000
            }
        }
    ],
    
    victory: [
        {
            title: "Victory!",
            text: "Congratulations! You've defeated your opponent through the power of knowledge. Well done!",
            textBoxPosition: { x: 400, y: 300 },
            textBoxStyle: {
                backgroundColor: 0x006400,
                borderColor: 0x00FF00
            }
        }
    ]
};

export const TUTORIAL_TRIGGERS = {
    firstTime: (scene) => {
        // Show first-time tutorial if player hasn't seen it before
        const hasSeenTutorial = localStorage.getItem('sci-high-tutorial-seen');
        return !hasSeenTutorial;
    },
    
    powerUp: (scene) => {
        // Show power-up tutorial when first power-up is available
        return scene.availablePowerUps && scene.availablePowerUps.length > 0 && !scene.tutorialFlags?.powerUpTutorialShown;
    },
    
    combo: (scene) => {
        // Show combo tutorial when player reaches 3x combo for first time
        return scene.comboMeter && scene.comboMeter.getCurrentCombo && scene.comboMeter.getCurrentCombo() >= 3 && !scene.tutorialFlags?.comboTutorialShown;
    },
    
    lowHealth: (scene) => {
        // Show low health warning when player health drops below 30%
        if (!scene.playerConfig || !scene.tutorialFlags) return false;
        const healthRatio = scene.playerConfig.currentHP / scene.playerConfig.maxHP;
        return healthRatio <= 0.3 && !scene.tutorialFlags.lowHealthWarningShown;
    },
    
    victory: (scene) => {
        // Show victory tutorial after first win
        return scene.battleWon && !scene.tutorialFlags?.victoryTutorialShown;
    }
};

// Python-specific tutorial steps
export const PYTHON_TUTORIAL_STEPS = {
    firstTime: [
        {
            title: "Welcome to Python Programming Battle!",
            text: "Ready to test your Python knowledge? Let's learn the basics of quiz combat first!",
            textBoxPosition: { x: 400, y: 200 },
            onShow: (scene) => {
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
            }
        },
        {
            title: "Your Health Points",
            text: "This is your coding stamina! Wrong answers will drain your energy, so think carefully about Python syntax and concepts.",
            target: null,
            highlightStyle: {
                borderColor: 0x00FF00,
                pulsate: true
            },
            textBoxPosition: { x: 150, y: 400 }
        },
        {
            title: "Python Challenge Enemy",
            text: "Defeat this coding challenge by answering Python questions correctly! Each right answer deals damage to the problem.",
            target: null,
            highlightStyle: {
                borderColor: 0xFF0000,
                pulsate: true
            },
            textBoxPosition: { x: 600, y: 400 }
        },
        {
            title: "Coding Timer",
            text: "Real programmers work efficiently! You have limited time for each Python question, just like debugging under pressure.",
            target: null,
            highlightStyle: {
                borderColor: 0xFFFF00,
                pulsate: true
            },
            textBoxPosition: { x: 600, y: 150 }
        },
        {
            title: "Python Mastery Combo",
            text: "String together correct answers to build your Python expertise! Higher combos show your growing programming skills.",
            target: null,
            highlightStyle: {
                borderColor: 0xFF00FF,
                pulsate: true
            },
            textBoxPosition: { x: 150, y: 150 }
        },
        {
            title: "Python Code Challenge",
            text: "Python questions will appear here. Read the code carefully - watch for syntax, logic, and Python-specific features!",
            target: null,
            highlightStyle: {
                borderColor: 0x00FFFF,
                padding: 15
            },
            textBoxPosition: { x: 400, y: 500 }
        },
        {
            title: "Choose Your Answer",
            text: "Select the correct Python answer. Remember: Python is case-sensitive, indentation matters, and syntax is strict!",
            target: null,
            highlightStyle: {
                borderColor: 0xFFA500,
                padding: 10
            },
            textBoxPosition: { x: 400, y: 150 }
        },
        {
            title: "Ready to Code!",
            text: "Time to put your Python skills to the test! Remember: clear logic, proper syntax, and Pythonic thinking will lead you to victory!",
            textBoxPosition: { x: 400, y: 300 },
            buttonText: "Start Coding!"
        }
    ],
    
    timer: [
        {
            title: "Python Coding Timer Alert!",
            text: "Time pressure! In real programming, efficient coding is crucial. You have limited time left - focus on the most likely answer!",
            target: null, // Will be set to timer
            highlightStyle: {
                borderColor: 0xFF6B6B,
                pulsate: true,
                borderWidth: 4
            },
            textBoxStyle: {
                backgroundColor: 0x8B4513,
                borderColor: 0xFF6B6B
            }
        }
    ],
    
    syntaxError: [
        {
            title: "Python Syntax Reminder",
            text: "Python is strict about syntax! Remember: proper indentation, colons after statements, and correct variable naming are crucial.",
            target: null,
            highlightStyle: {
                borderColor: 0xFF6B6B,
                pulsate: true
            },
            textBoxStyle: {
                backgroundColor: 0x8B0000,
                borderColor: 0xFF0000
            }
        }
    ],
    
    pythonConcepts: [
        {
            title: "Python Concept Mastery",
            text: "Great! You're demonstrating solid understanding of Python concepts. Keep building on your programming foundation!",
            target: null,
            highlightStyle: {
                borderColor: 0x4CAF50,
                pulsate: true
            },
            textBoxStyle: {
                backgroundColor: 0x1B5E20,
                borderColor: 0x4CAF50
            }
        }
    ],
    
    victory: [
        {
            title: "Python Victory!",
            text: "Excellent! You've conquered this Python challenge through logical thinking and solid programming knowledge. Your coding skills are growing stronger!",
            textBoxPosition: { x: 400, y: 300 },
            textBoxStyle: {
                backgroundColor: 0x1B5E20,
                borderColor: 0x4CAF50
            }
        }
    ]
};

export const TUTORIAL_ELEMENT_SELECTORS = {
    playerHealth: (scene) => {
        // Return the player health container with hearts
        return scene.playerContainer;
    },
    
    enemyHealth: (scene) => {
        // Return the enemy health UI element  
        return scene.enemyUI?.healthBar || scene.enemyHealthText;
    },
    
    timer: (scene) => {
        // Create a custom bounds object for the timer area
        if (scene.gameTimer && scene.gameTimer.timerX !== undefined && scene.gameTimer.timerY !== undefined) {
            const timerX = scene.gameTimer.timerX;
            const timerY = scene.gameTimer.timerY;
            
            // Create a mock element with proper bounds for the entire timer area
            const timerMockElement = {
                getBounds: () => ({
                    x: timerX - 60, // Timer is about 120px wide (55px radius on each side + padding)
                    y: timerY - 20, // Timer is about 40px tall (including progress bar)
                    width: 120,
                    height: 40
                }),
                x: timerX,
                y: timerY,
                width: 120,
                height: 40
            };
            
            console.log('Using custom timer bounds:', timerMockElement.getBounds());
            return timerMockElement;
        }
        
        // Fallback to timerText if available
        if (scene.gameTimer?.timerText) {
            console.log('Using timerText for timer highlight');
            return scene.gameTimer.timerText;
        }
        
        console.log('No proper timer element found');
        return null;
    },
    
    comboMeter: (scene) => {
        // Return the combo meter element
        return scene.comboMeter?.comboBackground || scene.comboText;
    },
    
    questionArea: (scene) => {
        // Return the question text area
        return scene.questionText || scene.quizBox;
    },
    
    answerOptions: (scene) => {
        // Return the first answer option as representative
        return scene.optionTexts && scene.optionTexts[0];
    },
    
    powerUpButton: (scene) => {
        // Return the power-up button
        return scene.powerUpButton;
    }
};

// Debug helper function to log available elements (development only)
export function debugLogElements(scene) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.group('=== Tutorial Element Debug ===');
        console.log('playerContainer:', scene.playerContainer);
        console.log('gameTimer.timerBackground:', scene.gameTimer?.timerBackground);
        console.log('gameTimer.timerText:', scene.gameTimer?.timerText);
        console.log('comboMeter.comboBackground:', scene.comboMeter?.comboBackground);
        console.log('questionText:', scene.questionText);
        console.log('quizBox:', scene.quizBox);
        console.log('optionTexts:', scene.optionTexts);
        console.groupEnd();
    }
}

// Helper function to get element bounds for tutorial highlighting
export function getElementBounds(element) {
    if (!element) return null;
    
    if (element.getBounds) {
        return element.getBounds();
    }
    
    if (element.x !== undefined && element.y !== undefined) {
        return {
            x: element.x - (element.displayWidth || element.width || 50) / 2,
            y: element.y - (element.displayHeight || element.height || 50) / 2,
            width: element.displayWidth || element.width || 100,
            height: element.displayHeight || element.height || 50
        };
    }
    
    return null;
}

// Function to update tutorial steps with actual element references
export function prepareTutorialSteps(scene, stepType) {
    // Check if this is a Python-specific tutorial
    const isPythonTutorial = scene.topic === 'python' || scene.courseTopic === 'Python';
    const tutorialSource = isPythonTutorial ? PYTHON_TUTORIAL_STEPS : QUIZ_TUTORIAL_STEPS;
    
    const steps = [...(tutorialSource[stepType] || QUIZ_TUTORIAL_STEPS[stepType] || [])];
    
    steps.forEach(step => {
        if (step.target === null) {
            let targetElement = null;
            
            // Determine which element to target based on step content
            if (step.title.includes('Player Health') || step.title.includes('Your Health') || step.title.includes('coding stamina')) {
                targetElement = TUTORIAL_ELEMENT_SELECTORS.playerHealth(scene);
                console.log(`Tutorial targeting player health for step: "${step.title}":`, targetElement);
            } else if (step.title.includes('Enemy Health') || step.title.includes('Challenge Enemy') || step.title.includes('Python Challenge')) {
                targetElement = TUTORIAL_ELEMENT_SELECTORS.enemyHealth(scene);
                console.log(`Tutorial targeting enemy health for step: "${step.title}":`, targetElement);
            } else if (step.title.includes('Timer') || step.title.includes('Coding Timer')) {
                targetElement = TUTORIAL_ELEMENT_SELECTORS.timer(scene);
                console.log(`Tutorial targeting timer for step: "${step.title}":`, targetElement);
            } else if (step.title.includes('Combo') || step.title.includes('Mastery')) {
                targetElement = TUTORIAL_ELEMENT_SELECTORS.comboMeter(scene);
                console.log(`Tutorial targeting combo meter for step: "${step.title}":`, targetElement);
            } else if (step.title.includes('Question') || step.title.includes('Challenge') || step.title.includes('Code Challenge')) {
                targetElement = TUTORIAL_ELEMENT_SELECTORS.questionArea(scene);
                console.log(`Tutorial targeting question area for step: "${step.title}":`, targetElement);
            } else if (step.title.includes('Answer') || step.title.includes('Choose')) {
                targetElement = TUTORIAL_ELEMENT_SELECTORS.answerOptions(scene);
                console.log(`Tutorial targeting answer options for step: "${step.title}":`, targetElement);
            } else if (step.title.includes('Power-Up')) {
                targetElement = TUTORIAL_ELEMENT_SELECTORS.powerUpButton(scene);
                console.log(`Tutorial targeting power-up button for step: "${step.title}":`, targetElement);
            } else if (step.title.includes('Syntax')) {
                targetElement = TUTORIAL_ELEMENT_SELECTORS.questionArea(scene);
                console.log(`Tutorial targeting question area for syntax step: "${step.title}":`, targetElement);
            }
            
            step.target = targetElement;
        }
    });
    
    return steps;
}

// Python-specific tutorial triggers
export const PYTHON_TUTORIAL_TRIGGERS = {
    firstTime: (scene) => {
        // Show Python-specific first-time tutorial
        const hasSeenPythonTutorial = localStorage.getItem('sci-high-python-tutorial-seen');
        const isPythonTopic = scene.topic && scene.topic.toLowerCase() === 'python';
        
        // Debug logging
        console.log('Python tutorial firstTime check:', {
            hasSeenPythonTutorial,
            sceneTopic: scene.topic,
            isPythonTopic,
            willShowTutorial: !hasSeenPythonTutorial && isPythonTopic
        });
        
        return !hasSeenPythonTutorial && isPythonTopic;
    },
    
    timer: (scene) => {
        // Only show timer tutorial if first-time tutorial has been completed
        const hasTimer = scene.gameTimer;
        const isRunning = scene.gameTimer && scene.gameTimer.isRunning;
        const hasntSeenTimerTutorial = !scene.tutorialFlags?.timerTutorialShown;
        const hasSeenFirstTime = scene.tutorialFlags?.firstTimeTutorialShown;
        
        // Debug logging
        console.log('Python tutorial timer check:', {
            hasTimer: !!hasTimer,
            isRunning,
            hasntSeenTimerTutorial,
            hasSeenFirstTime,
            willShowTutorial: hasTimer && isRunning && hasntSeenTimerTutorial && hasSeenFirstTime
        });
        
        // Show timer tutorial only after first-time tutorial is done
        return hasTimer && 
               isRunning && 
               hasntSeenTimerTutorial && 
               hasSeenFirstTime;
    },
    
    syntaxError: (scene) => {
        // Show syntax reminder after multiple wrong answers in a row
        return scene.wrongAnswerStreak >= 2 && !scene.tutorialFlags?.syntaxErrorShown;
    },
    
    pythonConcepts: (scene) => {
        // Show concept mastery when player shows good understanding
        return scene.correctAnswers >= 3 && scene.comboMeter?.getCurrentCombo() >= 2 && !scene.tutorialFlags?.pythonConceptsShown;
    },
    
    victory: (scene) => {
        // Python-specific victory message
        return scene.battleWon && !scene.tutorialFlags?.victoryTutorialShown && scene.topic === 'python';
    }
};
