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

// Web Design-specific tutorial steps
export const WEB_DESIGN_TUTORIAL_STEPS = {
    firstTime: [
        {
            title: "Welcome to Web Design Battle!",
            text: "Ready to test your HTML, CSS, and JavaScript knowledge? Let's learn the basics of web development combat!",
            textBoxPosition: { x: 400, y: 200 },
            onShow: (scene) => {
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
            }
        },
        {
            title: "Your Health Points",
            text: "This represents your coding energy! Wrong answers about HTML tags, CSS properties, or JavaScript will drain your stamina.",
            target: null, // Will be set dynamically to player health UI
            highlightStyle: {
                borderColor: 0x00FF00,
                pulsate: true
            },
            textBoxPosition: { x: 150, y: 400 }
        },
        {
            title: "Enemy Web Bug",
            text: "This web bug represents coding errors! Defeat it by correctly answering web development questions and debugging code!",
            target: null, // Will be set dynamically to enemy health UI
            highlightStyle: {
                borderColor: 0xFF0000,
                pulsate: true
            },
            textBoxPosition: { x: 600, y: 400 }
        },
        {
            title: "Development Timer",
            text: "Web development requires quick thinking! You have limited time to solve each coding challenge, just like in real development.",
            target: null, // Will be set dynamically to timer
            highlightStyle: {
                borderColor: 0xFFFF00,
                pulsate: true
            },
            textBoxPosition: { x: 600, y: 150 }
        },
        {
            title: "Code Combo Meter",
            text: "Chain correct answers to build your coding flow! Higher combos give bonus points and represent your development momentum.",
            target: null, // Will be set dynamically to combo meter
            highlightStyle: {
                borderColor: 0xFF00FF,
                pulsate: true
            },
            textBoxPosition: { x: 150, y: 150 }
        },
        {
            title: "Web Development Questions",
            text: "Questions cover HTML structure, CSS styling, JavaScript functionality, and web best practices. Read carefully!",
            target: null, // Will be set dynamically to question area
            highlightStyle: {
                borderColor: 0x00FFFF,
                padding: 15
            },
            textBoxPosition: { x: 400, y: 500 }
        },
        {
            title: "Code Answer Options",
            text: "Choose the correct HTML tag, CSS property, JavaScript method, or web development concept. Think like a web developer!",
            target: null, // Will be set dynamically to answer options
            highlightStyle: {
                borderColor: 0xFFA500,
                padding: 10
            },
            textBoxPosition: { x: 400, y: 150 }
        },
        {
            title: "Ready to Build the Web!",
            text: "Now you're ready to tackle web development challenges! Use your HTML, CSS, and JavaScript knowledge to win. Good luck, developer!",
            textBoxPosition: { x: 400, y: 300 },
            buttonText: "Start Coding!"
        }
    ],
    
    combo: [
        {
            title: "Coding Flow Achieved!",
            text: "Excellent! You're in the zone! This combo multiplier shows you're thinking like a true web developer.",
            target: null, // Will be set to combo meter
            highlightStyle: {
                borderColor: 0xFF00FF,
                pulsate: true
            },
            textBoxPosition: { x: 150, y: 300 }
        },
        {
            title: "Keep the Momentum!",
            text: "In web development, maintaining focus leads to better code! Keep this streak going for maximum points and damage.",
            textBoxPosition: { x: 400, y: 350 }
        }
    ],
    
    lowHealth: [
        {
            title: "Debug Mode Activated!",
            text: "Your coding energy is low! Take a moment to carefully read each question. In web development, debugging requires patience.",
            textBoxPosition: { x: 400, y: 250 }
        },
        {
            title: "Web Development Tips",
            text: "Remember: HTML provides structure, CSS handles styling, and JavaScript adds interactivity. Think about which technology applies to each question.",
            textBoxPosition: { x: 400, y: 350 }
        }
    ],
    
    victory: [
        {
            title: "Web Development Mastery!",
            text: "Outstanding! You've successfully debugged the web! Your HTML, CSS, and JavaScript skills are impressive.",
            textBoxPosition: { x: 400, y: 250 }
        },
        {
            title: "Build Your Portfolio!",
            text: "You're ready to create amazing websites! Keep practicing these skills and exploring new web technologies.",
            textBoxPosition: { x: 400, y: 350 }
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
    },
    
    carousel: (scene) => {
        // Try to target the carousel background panel first (computer lab uses scene.carousel)
        if (scene.carousel?.bgPanel) {
            console.log('Using carousel bgPanel for highlight');
            return scene.carousel.bgPanel;
        }
        
        // Try to target the character carousel background panel (classroom uses scene.characterCarousel)
        if (scene.characterCarousel?.bgPanel) {
            console.log('Using characterCarousel bgPanel for highlight');
            return scene.characterCarousel.bgPanel;
        }
        
        // Create a custom bounds object for the carousel area based on scene dimensions
        const carouselObj = scene.carousel || scene.characterCarousel;
        if (carouselObj && scene.scale) {
            const { width, height } = scene.scale;
            const centerY = carouselObj.config?.centerY || (height / 2);
            const carouselHeight = 340; // Based on panelHeight in carousel code
            const carouselWidth = width * 0.8; // 80% of screen width
            
            // Create a mock element with proper bounds for the entire carousel area
            const carouselMockElement = {
                getBounds: () => ({
                    x: width * 0.1, // 10% margin on left
                    y: centerY - carouselHeight / 2,
                    width: carouselWidth,
                    height: carouselHeight
                }),
                x: width / 2,
                y: centerY,
                width: carouselWidth,
                height: carouselHeight
            };
            
            console.log('Using custom carousel bounds:', carouselMockElement.getBounds());
            return carouselMockElement;
        }
        
        // Last fallback to carousel object itself
        console.log('Using carousel object as fallback');
        return scene.carousel || scene.characterCarousel || scene.carouselContainer;
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
    // Check if this is a topic-specific tutorial
    const isPythonTutorial = scene.topic === 'python' || scene.courseTopic === 'Python';
    const isWebDesignTutorial = scene.topic === 'webdesign' || scene.courseTopic === 'Web Design';
    const isDungeonScene = scene.scene.key === 'DungeonScene';
    
    let tutorialSource = QUIZ_TUTORIAL_STEPS;
    let elementSelectors = TUTORIAL_ELEMENT_SELECTORS;
    
    if (isDungeonScene) {
        tutorialSource = DUNGEON_TUTORIAL_STEPS;
        elementSelectors = DUNGEON_ELEMENT_SELECTORS;
    } else if (isPythonTutorial) {
        tutorialSource = PYTHON_TUTORIAL_STEPS;
    } else if (isWebDesignTutorial) {
        tutorialSource = WEB_DESIGN_TUTORIAL_STEPS;
    }
    
    const steps = [...(tutorialSource[stepType] || QUIZ_TUTORIAL_STEPS[stepType] || [])];
    
    steps.forEach(step => {
        if (step.target === null || typeof step.target === 'string') {
            let targetElement = null;
            
            // Handle dungeon-specific targeting
            if (isDungeonScene) {
                if (step.target === 'player' || step.title.includes('Your Character')) {
                    targetElement = elementSelectors.player(scene);
                } else if (step.target === 'healthDisplay' || step.title.includes('Health Display')) {
                    targetElement = elementSelectors.healthDisplay(scene);
                } else if (step.target === 'menuButton' || step.title.includes('Dungeon Menu')) {
                    targetElement = elementSelectors.menuButton(scene);
                } else if (step.target === 'quizBox' || step.title.includes('Quiz Box') || step.title.includes('Challenge') || step.title.includes('Boss')) {
                    targetElement = elementSelectors.quizBox(scene);
                } else if (step.target === 'adjacentCells' || step.title.includes('Movement Areas')) {
                    targetElement = elementSelectors.adjacentCells(scene);
                } else if (step.target === 'visitedCells' || step.title.includes('Visited Path')) {
                    targetElement = elementSelectors.visitedCells(scene);
                }
            } else {
                // Handle quiz scene targeting (existing logic)
                if (step.target === 'carousel' || step.title.includes('Programming Languages') || step.title.includes('Your Classmates') || step.title.includes('Library Sections') || step.title.includes('Office Sections')) {
                    targetElement = elementSelectors.carousel(scene);
                    console.log(`Tutorial targeting carousel for step: "${step.title}":`, targetElement);
                } else if (step.title.includes('Player Health') || step.title.includes('Your Health') || step.title.includes('coding stamina') || step.title.includes('coding energy')) {
                    targetElement = elementSelectors.playerHealth(scene);
                    console.log(`Tutorial targeting player health for step: "${step.title}":`, targetElement);
                } else if (step.title.includes('Enemy Health') || step.title.includes('Challenge Enemy') || step.title.includes('Python Challenge') || step.title.includes('Enemy Web Bug') || step.title.includes('web bug')) {
                    targetElement = elementSelectors.enemyHealth(scene);
                    console.log(`Tutorial targeting enemy health for step: "${step.title}":`, targetElement);
                } else if (step.title.includes('Timer') || step.title.includes('Coding Timer') || step.title.includes('Development Timer')) {
                    targetElement = elementSelectors.timer(scene);
                    console.log(`Tutorial targeting timer for step: "${step.title}":`, targetElement);
                } else if (step.title.includes('Combo') || step.title.includes('Mastery') || step.title.includes('Code Combo') || step.title.includes('Coding Flow')) {
                    targetElement = elementSelectors.comboMeter(scene);
                    console.log(`Tutorial targeting combo meter for step: "${step.title}":`, targetElement);
                } else if (step.title.includes('Question') || step.title.includes('Challenge') || step.title.includes('Code Challenge') || step.title.includes('Web Development Questions')) {
                    targetElement = elementSelectors.questionArea(scene);
                    console.log(`Tutorial targeting question area for step: "${step.title}":`, targetElement);
                } else if (step.title.includes('Answer') || step.title.includes('Choose') || step.title.includes('Code Answer')) {
                    targetElement = elementSelectors.answerOptions(scene);
                    console.log(`Tutorial targeting answer options for step: "${step.title}":`, targetElement);
                } else if (step.title.includes('Power-Up')) {
                    targetElement = elementSelectors.powerUpButton(scene);
                    console.log(`Tutorial targeting power-up button for step: "${step.title}":`, targetElement);
                } else if (step.title.includes('Syntax')) {
                    targetElement = elementSelectors.questionArea(scene);
                    console.log(`Tutorial targeting question area for syntax step: "${step.title}":`, targetElement);
                }
            }
            
            if (targetElement) {
                step.target = targetElement;
                console.log(`Dungeon tutorial targeting element for step: "${step.title}":`, targetElement);
            }
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

// Web Design tutorial triggers
export const WEB_DESIGN_TUTORIAL_TRIGGERS = {
    firstTime: (scene) => {
        // Show Web Design first-time tutorial if player hasn't seen it before and is in web design scene
        const hasSeenWebDesignTutorial = localStorage.getItem('sci-high-webdesign-tutorial-seen');
        return !hasSeenWebDesignTutorial && scene.topic === 'webdesign';
    },
    
    combo: (scene) => {
        // Show combo tutorial when player reaches 3x combo for first time in web design
        const hasSeenComboTutorial = localStorage.getItem('sci-high-webdesign-combo-tutorial-seen');
        return scene.comboMeter && 
               scene.comboMeter.getCurrentCombo && 
               scene.comboMeter.getCurrentCombo() >= 3 && 
               !hasSeenComboTutorial && 
               scene.topic === 'webdesign';
    },
    
    lowHealth: (scene) => {
        // Show low health warning when player health drops below 30% in web design
        if (!scene.playerConfig || scene.topic !== 'webdesign') return false;
        const healthRatio = scene.playerConfig.currentHP / scene.playerConfig.maxHP;
        const hasSeenLowHealthTutorial = localStorage.getItem('sci-high-webdesign-lowhealth-tutorial-seen');
        return healthRatio <= 0.3 && !hasSeenLowHealthTutorial;
    },
    
    victory: (scene) => {
        // Show victory tutorial after first web design win
        const hasSeenVictoryTutorial = localStorage.getItem('sci-high-webdesign-victory-tutorial-seen');
        return scene.battleWon && !hasSeenVictoryTutorial && scene.topic === 'webdesign';
    }
};

// Main Hub Tutorial Configuration
export const MAIN_HUB_TUTORIAL_STEPS = {
    firstTimeHub: [
        {
            title: "Welcome to SCI-HIGH!",
            text: "Welcome to your educational adventure! This is the main hub where you can access different areas of the school. Let me show you around!",
            textBoxPosition: { x: 400, y: 200 },
            onShow: (scene) => {
                // Play welcome sound if available
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
            }
        },
        {
            title: "Your Progress",
            text: "This shows your current points and progress. You'll earn points by completing quizzes and challenges throughout the school!",
            target: 'pointsDisplay', // Will be set dynamically to points display
            highlightStyle: {
                borderColor: 0xFFD700,
                pulsate: true,
                padding: 10
            },
            textBoxPosition: { x: 300, y: 150 }
        },
        {
            title: "Leaderboard",
            text: "Check your ranking against other students! Submit your scores to compete with players worldwide.",
            target: 'leaderboardButton', // Will be set dynamically to leaderboard button
            highlightStyle: {
                borderColor: 0x3498DB,
                pulsate: true,
                padding: 5
            },
            textBoxPosition: { x: 300, y: 200 }
        },
        {
            title: "Classroom",
            text: "Visit the Classroom to meet your classmates and get introduced to different subjects. This is a great place to start your learning journey!",
            target: 'classroomIcon', // Will be set dynamically to classroom icon
            highlightStyle: {
                borderColor: 0xFF6B6B,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 200, y: 400 },
            arrow: {
                position: { x: 300, y: 350 },
                rotation: -45
            }
        },
        {
            title: "Computer Lab",
            text: "The Computer Lab is where the real challenges begin! Take programming quizzes in different languages like Python, Java, C++, and more.",
            target: 'comlabIcon', // Will be set dynamically to computer lab icon
            highlightStyle: {
                borderColor: 0x4ECDC4,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 500, y: 400 },
            arrow: {
                position: { x: 450, y: 350 },
                rotation: 45
            }
        },
        {
            title: "Library",
            text: "The Library contains study materials and resources to help you learn. Read books and notes to improve your knowledge!",
            target: 'libraryIcon', // Will be set dynamically to library icon
            highlightStyle: {
                borderColor: 0x95E1D3,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 600, y: 400 }
        },
        {
            title: "Navigation Tips",
            text: "You can navigate between areas using these icons. Your progress will be saved automatically as you explore and learn!",
            textBoxPosition: { x: 400, y: 300 }
        },
        {
            title: "Ready to Explore!",
            text: "That's everything you need to know! Start your educational journey by visiting the Classroom first. Good luck, and have fun learning!",
            textBoxPosition: { x: 400, y: 350 },
            buttonText: "Start Exploring!",
            onComplete: (scene) => {
                // Optionally highlight the classroom icon one more time
                if (scene.carousel && scene.carousel.icons) {
                    const classroomIcon = scene.carousel.icons[0]; // Assuming classroom is first
                    if (classroomIcon) {
                        scene.tweens.add({
                            targets: classroomIcon,
                            scaleX: classroomIcon.scaleX * 1.2,
                            scaleY: classroomIcon.scaleY * 1.2,
                            duration: 500,
                            yoyo: true,
                            repeat: 2
                        });
                    }
                }
            }
        }
    ]
};

// Computer Lab Tutorial Configuration
export const COMPUTER_LAB_TUTORIAL_STEPS = {
    firstTimeComLab: [
        {
            title: "Welcome to the Computer Lab!",
            text: "This is where the real programming challenges begin! Here you can take quizzes in different programming languages and prove your coding skills.",
            textBoxPosition: { x: 400, y: 200 },
            onShow: (scene) => {
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
            }
        },
        {
            title: "Course Progression",
            text: "Some courses may be locked initially. Complete easier courses first to unlock more advanced ones. Look for the lock icons!",
            textBoxPosition: { x: 400, y: 150 }
        },
        {
            title: "Web Design",
            text: "Start with Web Design if you're new to programming! Learn HTML, CSS, and JavaScript fundamentals in an interactive way.",
            target: 'webDesignIcon',
            highlightStyle: {
                borderColor: 0xFF6B6B,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 200, y: 400 },
            arrow: {
                position: { x: 300, y: 350 },
                rotation: -45
            }
        },
        {
            title: "Python Programming",
            text: "Python is perfect for beginners! Learn one of the most popular programming languages with clear syntax and powerful capabilities.",
            target: 'pythonIcon',
            highlightStyle: {
                borderColor: 0x4ECDC4,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 500, y: 400 }
        },
        {
            title: "Advanced Languages",
            text: "Java, C, C++, and C# offer more advanced programming concepts. Take these courses when you're ready for a challenge!",
            textBoxPosition: { x: 400, y: 300 }
        },
        {
            title: "Battle System",
            text: "Each quiz is presented as an exciting battle! Answer questions correctly to defeat enemies and earn points.",
            textBoxPosition: { x: 400, y: 350 }
        },
        {
            title: "Ready to Code!",
            text: "Choose a programming language to start your coding adventure! Remember, practice makes perfect in programming.",
            textBoxPosition: { x: 400, y: 400 },
            buttonText: "Start Coding!"
        }
    ]
};

// Classroom Tutorial Configuration
export const CLASSROOM_TUTORIAL_STEPS = {
    firstTimeClassroom: [
        {
            title: "Welcome to the Classroom!",
            text: "Meet your fellow students! Each character has their own story, quests, and can help you on your learning journey.",
            textBoxPosition: { x: 400, y: 200 },
            onShow: (scene) => {
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
            }
        },
        {
            title: "Your Classmates",
            text: "Use the arrow keys or click to navigate between different students. Each one has unique quests and challenges for you!",
            target: 'carousel',
            highlightStyle: {
                borderColor: 0x00FF7F,
                padding: 20
            },
            textBoxPosition: { x: 400, y: 100 }
        },
        {
            title: "Student Interactions",
            text: "Click on any student to learn more about them, view their quests, and see your progress with their challenges.",
            textBoxPosition: { x: 400, y: 150 }
        },
        {
            title: "Quest System",
            text: "Each student offers different types of quests: Main quests advance the story, side quests provide extra challenges, and bonus quests offer special rewards!",
            textBoxPosition: { x: 400, y: 300 }
        },
        {
            title: "Progress Tracking",
            text: "Your progress with each student is tracked. Complete their quests to build relationships and unlock new opportunities!",
            textBoxPosition: { x: 400, y: 350 }
        },
        {
            title: "Meet Your Classmates!",
            text: "Take your time to get to know everyone. They're here to help you succeed and make your learning journey more enjoyable!",
            textBoxPosition: { x: 400, y: 400 },
            buttonText: "Meet the Class!"
        }
    ]
};

// Library Tutorial Configuration
export const LIBRARY_TUTORIAL_STEPS = {
    firstTimeLibrary: [
        {
            title: "Welcome to the Digital Library!",
            text: "Welcome to your digital library! Here you can browse and read ebooks on various programming topics to enhance your learning.",
            textBoxPosition: { x: 400, y: 200 },
            onShow: (scene) => {
                if (scene.sound && scene.sound.add) {
                    // Play a soft library sound if available
                }
            }
        },
        {
            title: "Topic Carousel",
            text: "Browse different programming topics using this carousel. Each topic contains a collection of ebooks you can read.",
            target: 'carousel',
            highlightStyle: {
                borderColor: 0x00FF7F,
                pulsate: true,
                padding: 20
            },
            textBoxPosition: { x: 400, y: 150 }
        },
        {
            title: "Selecting Topics",
            text: "Click on any topic icon to view the available ebooks in that category. You can navigate left and right to see all topics.",
            target: 'carousel',
            highlightStyle: {
                borderColor: 0x4ECDC4,
                padding: 15
            },
            textBoxPosition: { x: 400, y: 500 }
        },
        {
            title: "Ebook Collections",
            text: "When you select a topic, a dialog will show all available ebooks. Each ebook includes the title, author, and a link to read it.",
            textBoxPosition: { x: 400, y: 250 }
        },
        {
            title: "Reading Ebooks",
            text: "Click the 'READ' button next to any ebook to open it in a new tab. These resources will help you understand concepts better before taking quizzes.",
            textBoxPosition: { x: 400, y: 300 }
        },
        {
            title: "Navigation",
            text: "Use the back button in the top-left corner to return to the main hub when you're done browsing the library.",
            target: 'backButton',
            highlightStyle: {
                borderColor: 0xFFD700,
                pulsate: true,
                padding: 10
            },
            textBoxPosition: { x: 300, y: 150 }
        },
        {
            title: "Happy Reading!",
            text: "Explore the different topics and read the ebooks that interest you. Knowledge gained here will help you excel in your programming quizzes!",
            textBoxPosition: { x: 400, y: 400 },
            buttonText: "Start Exploring!"
        }
    ]
};

// Office Tutorial Configuration
export const OFFICE_TUTORIAL_STEPS = {
    firstTimeOffice: [
        {
            title: "Welcome to the Office!",
            text: "This is your personal space for managing your academic life. Here you can view your profile, check statistics, see achievements, and set goals.",
            textBoxPosition: { x: 400, y: 200 },
            onShow: (scene) => {
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
            }
        },
        {
            title: "Office Sections",
            text: "Navigate between different sections using the arrow keys or by clicking. Each section provides valuable information about your progress.",
            target: 'carousel',
            highlightStyle: {
                borderColor: 0x00FF7F,
                padding: 20
            },
            textBoxPosition: { x: 400, y: 100 }
        },
        {
            title: "Student Profile",
            text: "View and edit your personal information. Keep your profile updated to track your academic journey effectively.",
            target: 'profileSection',
            highlightStyle: {
                borderColor: 0xFF6B6B,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 200, y: 400 }
        },
        {
            title: "Performance Statistics",
            text: "Analyze your quiz performance, completion rates, and improvement over time. Use these insights to focus your studies!",
            target: 'statsSection',
            highlightStyle: {
                borderColor: 0x4ECDC4,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 500, y: 400 }
        },
        {
            title: "Achievements Wall",
            text: "View all the achievements you've unlocked! Achievements celebrate your milestones and motivate you to reach new goals.",
            target: 'achievementsSection',
            highlightStyle: {
                borderColor: 0xFFD700,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 200, y: 300 }
        },
        {
            title: "Feedback & Goals",
            text: "Read feedback on your performance and set new learning goals. This section helps you plan your educational path forward.",
            target: 'feedbackSection',
            highlightStyle: {
                borderColor: 0xFF69B4,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 500, y: 300 }
        },
        {
            title: "Track Your Success!",
            text: "Use the office regularly to monitor your progress and celebrate your achievements. You're doing great - keep it up!",
            textBoxPosition: { x: 400, y: 400 },
            buttonText: "Manage Profile!"
        }
    ]
};

// Dungeon Tutorial Configuration (specifically for web design topic)
export const DUNGEON_TUTORIAL_STEPS = {
    firstTimeDungeon: [
        {
            title: "Welcome to the Web Design Dungeon!",
            text: "You've entered a dangerous coding labyrinth! Navigate through this grid-based dungeon to face web development challenges and grow stronger.",
            textBoxPosition: { x: 400, y: 150 },
            onShow: (scene) => {
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
            }
        },
        {
            title: "Your Character",
            text: "This is you! Use arrow keys or click on adjacent highlighted cells to move through the dungeon. Your health carries over between battles.",
            target: 'player',
            highlightStyle: {
                borderColor: 0x00FF7F,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 200, y: 300 }
        },
        {
            title: "Health Display",
            text: "Keep an eye on your health! It shows how many hit points you have remaining. Losing all health will end your dungeon run.",
            target: 'healthDisplay',
            highlightStyle: {
                borderColor: 0xFF0000,
                pulsate: true,
                padding: 10
            },
            textBoxPosition: { x: 150, y: 100 }
        },
        {
            title: "Dungeon Menu",
            text: "Click the menu button to pause, view stats, or exit the dungeon. Your progress is saved so you can return anytime!",
            target: 'menuButton',
            highlightStyle: {
                borderColor: 0xFFD700,
                pulsate: true,
                padding: 8
            },
            textBoxPosition: { x: 600, y: 100 }
        },
        {
            title: "Quiz Boxes - Your Enemies!",
            text: "These glowing boxes contain web development challenges! Step on them to trigger quiz battles. Defeat enemies to clear the path forward.",
            target: 'quizBox',
            highlightStyle: {
                borderColor: 0xFF6B6B,
                pulsate: true,
                padding: 20
            },
            textBoxPosition: { x: 400, y: 350 }
        },
        {
            title: "Movement Areas",
            text: "Yellow highlighted cells show where you can move next. You can only move to adjacent cells (up, down, left, right) one step at a time.",
            target: 'adjacentCells',
            highlightStyle: {
                borderColor: 0xFFFF00,
                pulsate: true,
                padding: 12
            },
            textBoxPosition: { x: 500, y: 450 }
        },
        {
            title: "Visited Path",
            text: "Green cells show where you've already been. You can return to these areas safely, but new challenges await in unexplored territories.",
            target: 'visitedCells',
            highlightStyle: {
                borderColor: 0x00FF00,
                pulsate: false,
                padding: 10
            },
            textBoxPosition: { x: 300, y: 500 }
        },
        {
            title: "Progressive Difficulty",
            text: "As you defeat more enemies, the challenges become harder and rewards greater. Prepare for increasingly complex web development questions!",
            textBoxPosition: { x: 400, y: 200 }
        },
        {
            title: "Ready for Adventure!",
            text: "Navigate the dungeon, battle coding challenges, and master web development! Click on highlighted areas to move and explore. Good luck, web developer!",
            textBoxPosition: { x: 400, y: 250 },
            buttonText: "Start Exploring!"
        }
    ],

    firstQuizBox: [
        {
            title: "First Web Challenge!",
            text: "You've encountered your first coding challenge! Stepping on quiz boxes will start quiz battles with web development questions.",
            target: 'quizBox',
            highlightStyle: {
                borderColor: 0xFF6B6B,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 400, y: 300 }
        },
        {
            title: "Battle Strategy",
            text: "Answer questions correctly to deal damage, avoid wrong answers to protect your health. Your web development knowledge is your weapon!",
            textBoxPosition: { x: 400, y: 350 }
        }
    ],

    bossEncounter: [
        {
            title: "Boss Challenge Detected!",
            text: "You've reached a boss level! This enhanced enemy will test your mastery of web development concepts with harder questions.",
            target: 'quizBox',
            highlightStyle: {
                borderColor: 0xFF0066,
                pulsate: true,
                padding: 25
            },
            textBoxPosition: { x: 400, y: 200 }
        },
        {
            title: "Boss Battle Tips",
            text: "Boss enemies have more health and ask more challenging questions. Take your time and think carefully about advanced HTML, CSS, and JavaScript concepts!",
            textBoxPosition: { x: 400, y: 300 }
        }
    ]
};

// Dungeon tutorial triggers
export const DUNGEON_TUTORIAL_TRIGGERS = {
    firstQuizBox: (scene) => {
        // Show tutorial when player first approaches a quiz box
        return scene.quizBoxes && scene.quizBoxes.length > 0 && !scene.tutorialFlags?.firstQuizBoxShown;
    },

    bossEncounter: (scene) => {
        // Show boss tutorial when entering boss level
        return scene.isBossLevel && !scene.tutorialFlags?.bossEncounterShown;
    }
};

// Dungeon element selectors for targeting specific UI elements
export const DUNGEON_ELEMENT_SELECTORS = {
    player: (scene) => {
        return scene.playerSprite;
    },
    
    healthDisplay: (scene) => {
        return scene.dungeonHUD?.healthHearts || scene.dungeonHUD?.healthContainer;
    },
    
    menuButton: (scene) => {
        return scene.dungeonMenu?.menuButton;
    },
    
    quizBox: (scene) => {
        // Return the first quiz box sprite if available
        return scene.quizBoxSprites && scene.quizBoxSprites.length > 0 ? scene.quizBoxSprites[0] : null;
    },
    
    adjacentCells: (scene) => {
        // Create a mock element representing the adjacent movement areas
        if (scene.adjacentCells && scene.adjacentCells.length > 0 && scene.offsetX !== undefined) {
            const cellSize = 64 * (scene.scaleFactor || 1);
            const firstAdjacent = scene.adjacentCells[0];
            
            return {
                getBounds: () => ({
                    x: scene.offsetX + firstAdjacent.x * cellSize,
                    y: scene.offsetY + firstAdjacent.y * cellSize,
                    width: cellSize,
                    height: cellSize
                }),
                x: scene.offsetX + firstAdjacent.x * cellSize + cellSize / 2,
                y: scene.offsetY + firstAdjacent.y * cellSize + cellSize / 2,
                width: cellSize,
                height: cellSize
            };
        }
        return null;
    },
    
    visitedCells: (scene) => {
        // Create a mock element for visited cells area
        if (scene.grid && scene.offsetX !== undefined) {
            const cellSize = 64 * (scene.scaleFactor || 1);
            // Find a visited cell (preferably the starting position)
            for (let y = 0; y < scene.grid.length; y++) {
                for (let x = 0; x < scene.grid[y].length; x++) {
                    if (scene.grid[y][x].visited && !(x === scene.player.x && y === scene.player.y)) {
                        return {
                            getBounds: () => ({
                                x: scene.offsetX + x * cellSize,
                                y: scene.offsetY + y * cellSize,
                                width: cellSize,
                                height: cellSize
                            }),
                            x: scene.offsetX + x * cellSize + cellSize / 2,
                            y: scene.offsetY + y * cellSize + cellSize / 2,
                            width: cellSize,
                            height: cellSize
                        };
                    }
                }
            }
        }
        return null;
    }
};
