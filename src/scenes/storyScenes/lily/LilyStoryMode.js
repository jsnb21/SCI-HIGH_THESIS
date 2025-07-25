import Phaser from 'phaser';
import VNDialogueBox from '../../ui/VNDialogueBox.js';
import { createBackButton } from '../../components/buttons/backbutton.js';
import { char2, onceOnlyFlags } from '../../gameManager.js';

export default class LilyStoryMode extends Phaser.Scene {
    constructor() {
        super('LilyStoryMode');
        this.currentChapter = 0;
        this.currentScene = 0;
        this.dialogueBox = null;
        this.storyCompleted = false;
    }

    init(data) {
        if (data && data.chapter !== undefined) {
            this.currentChapter = data.chapter;
            this.currentScene = 0;
        }
    }

    preload() {
        // Load character sprites
        this.load.image('lily_happy', 'assets/sprites/npcs/lily.png');
        this.load.image('lily_excited', 'assets/sprites/npcs/lily.png');
        this.load.image('lily_thinking', 'assets/sprites/npcs/lily.png');
        
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
        if (!char2.storyProgress) {
            char2.storyProgress = {
                chapter: 0,
                scene: 0,
                completed: false
            };
        }

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
        if (this.currentChapter === 1 || this.currentChapter === 4) {
            bgKey = 'library_bg';
        }
        
        // Add background
        this.bg = this.add.image(width / 2, height / 2, bgKey);
        this.bg.setDisplaySize(width, height);
        
        // Add dimming overlay for better readability
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        this.dimOverlay.setDepth(0); // Behind everything else
        
        // Add character sprite - behind dialogue box (half-body size)
        this.lily = this.add.image(width * 0.82, height * 0.72, 'lily_happy');
        this.lily.setScale(0.9); // Half-body appearance
        this.lily.setDepth(1); // Lower depth so dialogue appears in front
        
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

        this.dialogueBox = new VNDialogueBox(this, {
            x: this.scale.width / 2,
            y: this.scale.height - 120,
            width: this.scale.width - 100,
            height: 200,
            backgroundColor: 0x1a1a2e,
            borderColor: 0xff6b9d,
            textColor: '#ffffff',
            fontSize: 24,
            padding: 20
        });

        this.dialogueBox.showDialogue(storySegment.dialogue, storySegment.character, () => {
            this.onDialogueComplete(storySegment);
        });
    }

    onDialogueComplete(storySegment) {
        // Handle story progression
        if (storySegment.action) {
            switch (storySegment.action) {
                case 'next_scene':
                    this.currentScene++;
                    this.startCurrentStory();
                    break;
                case 'next_chapter':
                    this.currentChapter++;
                    this.currentScene = 0;
                    
                    // Update progress
                    char2.storyProgress.chapter = this.currentChapter;
                    char2.storyProgress.scene = this.currentScene;
                    
                    // Update quest progress
                    this.updateQuestProgress();
                    
                    this.setupScene();
                    this.startCurrentStory();
                    break;
                case 'quiz':
                    this.startQuiz(storySegment.quizData);
                    break;
                case 'complete':
                    this.showStoryComplete();
                    break;
                default:
                    this.startCurrentStory();
                    break;
            }
        } else {
            this.currentScene++;
            this.startCurrentStory();
        }
    }

    updateQuestProgress() {
        const chapter = this.currentChapter;
        
        if (chapter >= 1) {
            char2.quest1 = Math.min(100, (chapter / 5) * 100);
            char2.quest1Desc = "Learn Python fundamentals through Lily's story";
        }
        if (chapter >= 3) {
            char2.quest2 = Math.min(100, ((chapter - 2) / 3) * 100);
            char2.quest2Desc = "Master Python control structures and functions";
        }
        if (chapter >= 5) {
            char2.quest3 = 100;
            char2.quest3Desc = "Complete advanced Python concepts";
        }
    }

    startQuiz(quizData) {
        // Start a Python quiz
        this.scene.start('LilyStoryQuiz', {
            quizData: quizData,
            returnScene: 'LilyStoryMode',
            returnData: {
                chapter: this.currentChapter,
                scene: this.currentScene + 1
            }
        });
    }

    showStoryComplete() {
        if (this.dialogueBox) {
            this.dialogueBox.destroy();
        }

        const { width, height } = this.scale;
        
        // Completion message
        this.add.text(width / 2, height / 2, 'Chapter Complete!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '48px',
            color: '#ff6b9d',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 60, 'Great job learning Python with Lily!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Continue button
        const continueBtn = this.add.rectangle(width / 2, height / 2 + 120, 200, 50, 0xff6b9d)
            .setStrokeStyle(3, 0x000000)
            .setInteractive({ useHandCursor: true });

        this.add.text(width / 2, height / 2 + 120, 'Continue', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        continueBtn.on('pointerdown', () => {
            this.scene.start('LilyChapterSelect');
        });
    }

    getStoryData() {
        return [
            // Chapter 0: Python Basics
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Hi there! I'm Lily, and I'm super excited to teach you Python!",
                            "Python is like the perfect language for beginners - it's clean, readable, and so much fun!",
                            "Just like how I practice my dance routines step by step, we'll learn Python one concept at a time.",
                            "Let's start with variables - they're like little containers that hold our data!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "In Python, creating a variable is super simple!",
                            "name = 'Lily' - See? I just stored my name in a variable called 'name'!",
                            "age = 16 - And here's my age in a number variable!",
                            "Python is smart enough to know the difference between text and numbers automatically!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Let's try some basic operations! Python can do math just like a calculator.",
                            "print(5 + 3) would show us 8!",
                            "print('Hello' + ' ' + 'World') would show us 'Hello World'!",
                            "The print() function is like our way to show things to the audience - just like performing on stage!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What would 'print(10 + 5)' display?",
                                    options: ["105", "15", "10 + 5", "Error"],
                                    correct: 1
                                },
                                {
                                    question: "How do you create a variable named 'song' with the value 'Hello'?",
                                    options: ["song = Hello", "song = 'Hello'", "var song = Hello", "song: Hello"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Awesome work! You're getting the hang of Python basics!",
                            "Remember, practice makes perfect - just like my singing and dancing!",
                            "In the next chapter, we'll learn about making decisions in our code with if statements!",
                            "Get ready to make your programs even smarter!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 1: Control Structures
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Welcome back! Now let's learn about making decisions in Python!",
                            "Sometimes in a performance, I need to decide which dance move comes next based on the music.",
                            "In Python, we use 'if' statements to make these kinds of decisions!",
                            "Let's see how it works!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Here's a simple if statement:",
                            "if temperature > 25:\n    print('It's a warm day!')",
                            "The code after the colon only runs if the condition is true!",
                            "Notice the indentation - Python uses spaces to group code together!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "We can also use 'else' for when the condition is false:",
                            "if score >= 80:\n    print('Great job!')\nelse:\n    print('Keep practicing!')",
                            "And 'elif' for multiple conditions - like choosing between different songs to perform!",
                            "Let's practice with some loops next!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What happens if the condition in an if statement is false?",
                                    options: ["The code runs anyway", "Python shows an error", "The code is skipped", "The program stops"],
                                    correct: 2
                                },
                                {
                                    question: "What is used to group code in Python?",
                                    options: ["Curly braces {}", "Parentheses ()", "Indentation", "Square brackets []"],
                                    correct: 2
                                }
                            ]
                        }
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Now let's talk about loops - they're like repeating a dance move!",
                            "A 'for' loop repeats code for each item in a list:",
                            "for i in range(5):\n    print('Hello!')",
                            "This would print 'Hello!' five times - perfect for practice sessions!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 2: Functions & Modules
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Time to learn about functions - they're like choreographed dance routines!",
                            "Instead of repeating the same moves everywhere, we create a routine and call it by name!",
                            "Functions help us organize our code and avoid repetition.",
                            "Let's create our first function!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Here's how we define a function:",
                            "def greet(name):\n    return f'Hello, {name}!'",
                            "The 'def' keyword tells Python we're creating a function.",
                            "Then we can call it like: greet('Lily') and get 'Hello, Lily!' back!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What keyword is used to define a function in Python?",
                                    options: ["function", "def", "create", "make"],
                                    correct: 1
                                },
                                {
                                    question: "What does 'return' do in a function?",
                                    options: ["Stops the function", "Gives back a value", "Prints something", "Creates a variable"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Functions can also have default parameters - like having a backup dance if the main one doesn't work!",
                            "def perform(song='My favorite song'):\n    print(f'Now performing: {song}')",
                            "If we don't specify a song, it uses the default!",
                            "This makes our functions more flexible and user-friendly!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 3: Object-Oriented Programming
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Now for something really exciting - Object-Oriented Programming!",
                            "Think of classes like templates for creating similar things.",
                            "Like how all idols have similar characteristics but are unique individuals!",
                            "Let's create a class together!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Here's a simple class:",
                            "class Idol:\n    def __init__(self, name, talent):\n        self.name = name\n        self.talent = talent\n    def perform(self):\n        print(f'{self.name} is showing off their {self.talent}!')",
                            "The __init__ method is like the blueprint - it sets up each new idol!",
                            "Self refers to the specific instance we're working with!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What is the special method called when creating a new object?",
                                    options: ["__start__", "__init__", "__create__", "__new__"],
                                    correct: 1
                                },
                                {
                                    question: "What does 'self' represent in a class method?",
                                    options: ["The class itself", "A global variable", "The specific instance", "All instances"],
                                    correct: 2
                                }
                            ]
                        }
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "We can also use inheritance - like how different types of performers share basic skills!",
                            "class Singer(Idol):\n    def sing(self):\n        print(f'{self.name} is singing beautifully!')",
                            "Singer inherits everything from Idol but adds its own special abilities!",
                            "This helps us build complex programs efficiently!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 4: Data Structures
            {
                scenes: [
                    {
                        character: 'Lily',
                        dialogue: [
                            "Our final chapter is about data structures - ways to organize information!",
                            "Just like how I organize my songs, dance moves, and performance schedules!",
                            "Python has several built-in data structures that make our life easier.",
                            "Let's explore them together!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Lists are like setlists - ordered collections of items:",
                            "my_songs = ['Hello World', 'Python Love', 'Code Dreams']",
                            "Dictionaries are like address books - they connect keys to values:",
                            "my_info = {'name': 'Lily', 'age': 16, 'talent': 'singing'}"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "How do you access the first item in a list called 'songs'?",
                                    options: ["songs[1]", "songs[0]", "songs.first()", "songs(0)"],
                                    correct: 1
                                },
                                {
                                    question: "How do you get a value from a dictionary using a key?",
                                    options: ["dict.key", "dict[key]", "dict(key)", "dict->key"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Lily',
                        dialogue: [
                            "Congratulations! You've completed your Python journey with me!",
                            "From variables to classes, from loops to data structures - you've learned so much!",
                            "Remember, programming is like performing - it takes practice to get really good at it!",
                            "Keep coding, keep learning, and most importantly, keep having fun!"
                        ],
                        action: 'complete'
                    }
                ]
            }
        ];
    }
}
