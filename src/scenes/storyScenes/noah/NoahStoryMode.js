import Phaser from 'phaser';
import VNDialogueBox from '../../ui/VNDialogueBox.js';
import { createBackButton } from '../../components/buttons/backbutton.js';
import { char1, onceOnlyFlags } from '../../gameManager.js';

export default class NoahStoryMode extends Phaser.Scene {
    constructor() {
        super('NoahStoryMode');
        this.currentChapter = 0;
        this.currentScene = 0;
        this.dialogueBox = null;
        this.storyCompleted = false;
    }

    preload() {
        // Load character sprites
        this.load.image('noah_happy', 'assets/sprites/npcs/noah.png');
        this.load.image('noah_excited', 'assets/sprites/npcs/noah.png');
        this.load.image('noah_thinking', 'assets/sprites/npcs/noah.png');
        
        // Load backgrounds
        this.load.image('classroom_bg', 'assets/img/bg/classroom_day.png');
        this.load.image('library_bg', 'assets/img/bg/libraryBG.png');
        
        // Load sounds
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        const { width, height } = this.scale;
        
        // Initialize story progress if not exists
        if (!char1.storyProgress) {
            char1.storyProgress = {
                chapter: 0,
                scene: 0,
                completed: false
            };
        }

        this.currentChapter = char1.storyProgress.chapter || 0;
        this.currentScene = char1.storyProgress.scene || 0;

        // Set up the scene based on current progress
        this.setupScene();
        
        // Back button
        createBackButton(this, 'Classroom');
        
        // Start the story
        this.startCurrentStory();
    }

    setupScene() {
        const { width, height } = this.scale;
        
        // Clear previous scene elements
        this.children.removeAll();
        
        // Determine background based on chapter
        let bgKey = 'classroom_bg';
        if (this.currentChapter === 1) {
            bgKey = 'library_bg';
        }
        
        // Add background
        this.bg = this.add.image(width / 2, height / 2, bgKey);
        this.bg.setDisplaySize(width, height);
        
        // Add dimming overlay for better readability
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        this.dimOverlay.setDepth(0); // Behind everything else
        
        // Add character sprite - behind dialogue box (half-body size)
        this.noah = this.add.image(width * 0.82, height * 0.72, 'noah_happy');
        this.noah.setScale(0.9); // Half-body appearance
        this.noah.setDepth(1); // Lower depth so dialogue appears in front
        
        // Re-create back button after clearing
        createBackButton(this, 'Classroom');
    }

    startCurrentStory() {
        const storyData = this.getStoryData();
        const currentStorySegment = storyData[this.currentChapter]?.scenes[this.currentScene];
        
        if (currentStorySegment) {
            this.showDialogue(currentStorySegment);
        } else {
            // Story completed or invalid chapter/scene
            if (this.currentChapter >= storyData.length) {
                this.showStoryComplete();
            } else {
                // Invalid scene, reset to start of current chapter
                this.currentScene = 0;
                const resetStorySegment = storyData[this.currentChapter]?.scenes[this.currentScene];
                if (resetStorySegment) {
                    this.showDialogue(resetStorySegment);
                } else {
                    this.showStoryComplete();
                }
            }
        }
    }

    showDialogue(storySegment) {
        if (this.dialogueBox) {
            this.dialogueBox.destroy();
        }

        // Update character expression if specified
        if (storySegment.expression) {
            this.noah.setTexture(`noah_${storySegment.expression}`);
        }

        // Show code example if present
        if (storySegment.codeExample) {
            this.showCodeExample(storySegment.codeExample);
        }

        this.dialogueBox = new VNDialogueBox(
            this, 
            storySegment.dialogue, 
            () => {
                this.onDialogueComplete(storySegment);
            }
        );
    }

    showCodeExample(codeExample) {
        const { width, height } = this.scale;
        
        // Create a larger code display area
        const codeBox = this.add.rectangle(width * 0.3, height * 0.4, 520, 320, 0x1e1e1e, 0.9);
        codeBox.setStrokeStyle(3, 0x4a90e2);
        codeBox.setDepth(5); // Above Noah (depth 1) but below dialogue (depth 10)
        
        const codeText = this.add.text(width * 0.3, height * 0.4, codeExample.code, {
            fontFamily: 'Courier New, monospace',
            fontSize: '16px', // Increased from 14px
            color: '#00ff00',
            wordWrap: { width: 490 }, // Adjusted for larger box
            align: 'left',
            lineSpacing: 2 // Add line spacing for better readability
        });
        codeText.setOrigin(0.5);
        codeText.setDepth(6); // Above code box
        
        // Label for the code
        const codeLabel = this.add.text(width * 0.3, height * 0.23, codeExample.title, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px', // Increased from 16px
            color: '#ffffff',
            backgroundColor: '#4a90e2',
            padding: { x: 12, y: 6 } // Slightly more padding
        });
        codeLabel.setOrigin(0.5);
        codeLabel.setDepth(6); // Same as code text
        
        // Store for cleanup
        this.codeElements = [codeBox, codeText, codeLabel];
    }

    onDialogueComplete(storySegment) {
        // Clean up code example if shown
        if (this.codeElements) {
            this.codeElements.forEach(element => element.destroy());
            this.codeElements = null;
        }

        // Update progress
        if (storySegment.progressUpdate) {
            this.updateCharacterProgress(storySegment.progressUpdate);
        }

        // Move to next scene/chapter
        this.currentScene++;
        const storyData = this.getStoryData();
        
        // Check if we need to move to next chapter
        if (this.currentScene >= storyData[this.currentChapter].scenes.length) {
            // Before moving to next chapter, offer quiz
            if (this.shouldOfferQuiz()) {
                this.offerChapterQuiz();
                return;
            }
            
            this.currentChapter++;
            this.currentScene = 0;
            
            // Setup new scene environment
            if (this.currentChapter < storyData.length) {
                this.setupScene();
            }
        }
        
        // Save progress
        char1.storyProgress = {
            chapter: this.currentChapter,
            scene: this.currentScene,
            completed: this.currentChapter >= storyData.length
        };

        // Continue or complete
        if (this.currentChapter < storyData.length) {
            this.time.delayedCall(1000, () => {
                this.startCurrentStory();
            });
        } else {
            this.showStoryComplete();
        }
    }

    updateCharacterProgress(progressUpdate) {
        if (progressUpdate.quest1) {
            char1.quest1 = Math.min(char1.quest1 + progressUpdate.quest1, 100);
        }
        if (progressUpdate.quest2) {
            char1.quest2 = Math.min(char1.quest2 + progressUpdate.quest2, 100);
        }
        if (progressUpdate.quest3) {
            char1.quest3 = Math.min(char1.quest3 + progressUpdate.quest3, 100);
        }
        
        // Update descriptions
        if (progressUpdate.quest1Desc) char1.quest1Desc = progressUpdate.quest1Desc;
        if (progressUpdate.quest2Desc) char1.quest2Desc = progressUpdate.quest2Desc;
        if (progressUpdate.quest3Desc) char1.quest3Desc = progressUpdate.quest3Desc;
    }

    showStoryComplete() {
        const { width, height } = this.scale;
        
        // Completion message
        const completionDialogue = [
            "Congratulations! You've completed Noah's Web Development journey!",
            "Noah has learned the fundamentals of HTML, CSS, and JavaScript.",
            "These skills will serve as a solid foundation for web development!",
            "Continue learning and practicing to become a skilled web developer!"
        ];
        
        this.dialogueBox = new VNDialogueBox(
            this,
            completionDialogue,
            () => {
                // Mark story as completed
                char1.storyProgress.completed = true;
                onceOnlyFlags.setSeen('noah_story_completed');
                
                // Return to classroom
                this.scene.start('Classroom');
            }
        );
    }

    shouldOfferQuiz() {
        // Offer quiz at end of each chapter
        return this.currentChapter < 3; // We have 3 chapters (0, 1, 2)
    }

    offerChapterQuiz() {
        const { width, height } = this.scale;
        
        // Clear previous elements
        this.children.removeAll();
        this.setupScene();
        
        // Quiz offer dialogue
        const chapterNames = ['HTML', 'CSS', 'JavaScript'];
        const quizDialogue = [
            `Great job completing the ${chapterNames[this.currentChapter]} chapter!`,
            "Would you like to take a quiz to test your knowledge?",
            "The quiz will help reinforce what you've learned!"
        ];
        
        this.dialogueBox = new VNDialogueBox(
            this,
            quizDialogue,
            () => {
                this.showQuizOptions();
            }
        );
    }

    showQuizOptions() {
        const { width, height } = this.scale;
        
        // Get quiz descriptions for each chapter
        const chapterQuizInfo = {
            0: {
                title: 'HTML Basics Quiz',
                description: 'Test your knowledge of HTML tags, structure, headings, paragraphs, and basic formatting elements.'
            },
            1: {
                title: 'CSS Styling Quiz',
                description: 'Challenge yourself with CSS selectors, properties, colors, layouts, and styling techniques.'
            },
            2: {
                title: 'JavaScript Fundamentals Quiz',
                description: 'Evaluate your understanding of variables, functions, events, and interactive programming concepts.'
            }
        };
        
        const currentQuizInfo = chapterQuizInfo[this.currentChapter];
        
        // Quiz title
        const quizTitle = this.add.text(width / 2, height * 0.45, currentQuizInfo.title, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '28px',
            color: '#1e90ff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Quiz description
        const quizDescription = this.add.text(width / 2, height * 0.55, currentQuizInfo.description, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            wordWrap: { width: width * 0.7 },
            align: 'center'
        }).setOrigin(0.5);
        
        // Prominent quiz button (centered and larger)
        const quizBtn = this.add.rectangle(width / 2, height * 0.75, 300, 60, 0x4caf50);
        quizBtn.setStrokeStyle(4, 0x2e7d32);
        quizBtn.setInteractive({ useHandCursor: true });
        
        const quizText = this.add.text(width / 2, height * 0.75, 'Start Quiz', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Button handler
        quizBtn.on('pointerdown', () => {
            const quizTypes = ['html', 'css', 'javascript'];
            this.scene.start('NoahStoryQuiz', { chapter: quizTypes[this.currentChapter] });
        });
        
        // Enhanced hover effects
        quizBtn.on('pointerover', () => {
            quizBtn.setFillStyle(0x66bb6a);
            quizBtn.setScale(1.05); // Slight scale up on hover
            this.sound.play('se_select');
        });
        quizBtn.on('pointerout', () => {
            quizBtn.setFillStyle(0x4caf50);
            quizBtn.setScale(1.0); // Return to normal scale
        });
        
        // Store elements for cleanup
        this.quizElements = [quizTitle, quizDescription, quizBtn, quizText];
    }
    getStoryData() {
        return [
            // Chapter 0: Introduction to Web Development
            {
                title: "Chapter 1: The Beginning of Web Development",
                scenes: [
                    {
                        dialogue: [
                            "Hi there! I'm Noah, and I'm excited to learn web development!",
                            "Web development is the process of building and maintaining websites.",
                            "There are three core technologies we need to master:",
                            "HTML for structure, CSS for styling, and JavaScript for interactivity!"
                        ],
                        expression: "happy",
                        progressUpdate: {
                            quest1: 10,
                            quest1Desc: "Started learning web development fundamentals"
                        }
                    },
                    {
                        dialogue: [
                            "Let's start with HTML - HyperText Markup Language!",
                            "HTML is like the skeleton of a website. It provides structure.",
                            "HTML uses tags to define different parts of a webpage.",
                            "Here's what a basic HTML structure looks like:"
                        ],
                        expression: "excited",
                        codeExample: {
                            title: "Basic HTML Structure",
                            code: `<!DOCTYPE html>
<html>
<head>
    <title>My First Page</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>This is my first webpage!</p>
</body>
</html>`
                        },
                        progressUpdate: {
                            quest1: 15,
                            quest1Desc: "Learned HTML basics and structure"
                        }
                    },
                    {
                        dialogue: [
                            "HTML tags come in pairs: opening and closing tags.",
                            "<h1> creates a large heading, and </h1> closes it.",
                            "<p> creates a paragraph, and </p> closes it.",
                            "The content goes between the opening and closing tags!"
                        ],
                        expression: "thinking",
                        codeExample: {
                            title: "HTML Tags Example",
                            code: `<h1>This is a heading</h1>
<h2>This is a smaller heading</h2>
<p>This is a paragraph of text.</p>
<strong>This text is bold!</strong>
<em>This text is italic!</em>`
                        },
                        progressUpdate: {
                            quest1: 20,
                            quest1Desc: "Understanding HTML tags and their usage"
                        }
                    }
                ]
            },
            // Chapter 1: CSS Styling
            {
                title: "Chapter 2: Making it Beautiful with CSS",
                scenes: [
                    {
                        dialogue: [
                            "Now that we understand HTML structure, let's make it look good!",
                            "CSS stands for Cascading Style Sheets.",
                            "CSS controls how HTML elements appear on the page.",
                            "Colors, fonts, layouts, and animations - CSS does it all!"
                        ],
                        expression: "excited",
                        progressUpdate: {
                            quest2: 15,
                            quest2Desc: "Started learning CSS fundamentals"
                        }
                    },
                    {
                        dialogue: [
                            "CSS works with selectors and properties.",
                            "Selectors target HTML elements to style.",
                            "Properties define what aspect to change.",
                            "Here's how to style a heading and paragraph:"
                        ],
                        expression: "happy",
                        codeExample: {
                            title: "Basic CSS Styling",
                            code: `h1 {
    color: blue;
    font-size: 32px;
    text-align: center;
}

p {
    color: #333;
    font-family: Arial, sans-serif;
    line-height: 1.6;
}`
                        },
                        progressUpdate: {
                            quest2: 25,
                            quest2Desc: "Learning CSS selectors and properties"
                        }
                    },
                    {
                        dialogue: [
                            "CSS can make beautiful layouts too!",
                            "We can position elements, create columns, and more.",
                            "The 'display' property is very important for layouts.",
                            "Here's how to create a simple centered container:"
                        ],
                        expression: "thinking",
                        codeExample: {
                            title: "CSS Layout Example",
                            code: `.container {
    width: 80%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
    border-radius: 8px;
}`
                        },
                        progressUpdate: {
                            quest2: 35,
                            quest2Desc: "Understanding CSS layouts and positioning"
                        }
                    }
                ]
            },
            // Chapter 2: JavaScript Interactivity
            {
                title: "Chapter 3: Adding Life with JavaScript",
                scenes: [
                    {
                        dialogue: [
                            "Now for the exciting part - JavaScript!",
                            "JavaScript makes websites interactive and dynamic.",
                            "It can respond to user clicks, validate forms, and much more!",
                            "JavaScript is a programming language that runs in the browser."
                        ],
                        expression: "excited",
                        progressUpdate: {
                            quest3: 15,
                            quest3Desc: "Started learning JavaScript basics"
                        }
                    },
                    {
                        dialogue: [
                            "JavaScript uses variables to store data.",
                            "Functions let us organize our code into reusable blocks.",
                            "We can select HTML elements and change them!",
                            "Here's a simple example of JavaScript in action:"
                        ],
                        expression: "happy",
                        codeExample: {
                            title: "JavaScript Basics",
                            code: `// Variables
let message = "Hello, World!";
let count = 0;

// Function
function greetUser(name) {
    return "Hello, " + name + "!";
}

// Using the function
let greeting = greetUser("Noah");
console.log(greeting);`
                        },
                        progressUpdate: {
                            quest3: 25,
                            quest3Desc: "Learning JavaScript variables and functions"
                        }
                    },
                    {
                        dialogue: [
                            "JavaScript can interact with HTML elements!",
                            "We can change text, colors, and respond to clicks.",
                            "Event listeners let us respond to user actions.",
                            "Here's how to make a button that changes text:"
                        ],
                        expression: "thinking",
                        codeExample: {
                            title: "JavaScript DOM Interaction",
                            code: `// Get an element by its ID
let button = document.getElementById('myButton');
let text = document.getElementById('myText');

// Add event listener
button.addEventListener('click', function() {
    text.textContent = 'Button was clicked!';
    text.style.color = 'red';
});`
                        },
                        progressUpdate: {
                            quest3: 40,
                            quest3Desc: "Understanding JavaScript DOM manipulation"
                        }
                    },
                    {
                        dialogue: [
                            "Excellent work! You've learned the three pillars of web development!",
                            "HTML provides structure, CSS adds style, and JavaScript adds interactivity.",
                            "These three technologies work together to create amazing websites.",
                            "Keep practicing and building projects to improve your skills!"
                        ],
                        expression: "happy",
                        progressUpdate: {
                            quest1: 25,
                            quest2: 15,
                            quest3: 20,
                            quest1Desc: "Completed HTML fundamentals",
                            quest2Desc: "Completed CSS fundamentals", 
                            quest3Desc: "Completed JavaScript fundamentals"
                        }
                    }
                ]
            }
        ];
    }
}
