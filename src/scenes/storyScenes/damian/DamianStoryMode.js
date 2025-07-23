import Phaser from 'phaser';
import VNDialogueBox from '../../../ui/VNDialogueBox.js';
import { createBackButton } from '../../../components/buttons/backbutton.js';
import { char3, onceOnlyFlags } from '../../../gameManager.js';

export default class DamianStoryMode extends Phaser.Scene {
    constructor() {
        super('DamianStoryMode');
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
        this.load.image('damian_happy', 'assets/sprites/npcs/damian.png');
        this.load.image('damian_excited', 'assets/sprites/npcs/damian.png');
        this.load.image('damian_thinking', 'assets/sprites/npcs/damian.png');
        
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
        if (!char3.storyProgress) {
            char3.storyProgress = {
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
        this.damian = this.add.image(width * 0.82, height * 0.72, 'damian_happy');
        this.damian.setScale(0.9); // Half-body appearance
        this.damian.setDepth(1); // Lower depth so dialogue appears in front
        
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
            backgroundColor: 0x2e1065,
            borderColor: 0xf57c00,
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
                    char3.storyProgress.chapter = this.currentChapter;
                    char3.storyProgress.scene = this.currentScene;
                    
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
            char3.quest1 = Math.min(100, (chapter / 5) * 100);
            char3.quest1Desc = "Learn Java fundamentals through Damian's creative approach";
        }
        if (chapter >= 3) {
            char3.quest2 = Math.min(100, ((chapter - 2) / 3) * 100);
            char3.quest2Desc = "Master object-oriented programming concepts";
        }
        if (chapter >= 5) {
            char3.quest3 = 100;
            char3.quest3Desc = "Complete advanced Java programming techniques";
        }
    }

    startQuiz(quizData) {
        // Start a Java quiz
        this.scene.start('DamianStoryQuiz', {
            quizData: quizData,
            returnScene: 'DamianStoryMode',
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
            color: '#f57c00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 60, 'Excellent work learning Java with Damian!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Continue button
        const continueBtn = this.add.rectangle(width / 2, height / 2 + 120, 200, 50, 0xf57c00)
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
            this.scene.start('DamianChapterSelect');
        });
    }

    getStoryData() {
        return [
            // Chapter 0: Java Foundations
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Hey! I'm Damian, and I love creating things with code!",
                            "Java is like my favorite art medium - it's structured, powerful, and perfect for building amazing applications!",
                            "Think of Java like painting - we start with a blank canvas and create something beautiful step by step.",
                            "Let's begin with the foundation: classes and objects!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "In Java, everything revolves around classes - they're like blueprints for creating objects.",
                            "public class Artist {\n    private String name;\n    private String specialty;\n}",
                            "This class defines what every Artist should have - a name and a specialty!",
                            "Classes are templates, objects are the actual instances we create from those templates."
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Now let's create an object from our class:",
                            "Artist damian = new Artist();\ndamian.setName('Damian');\ndamian.setSpecialty('Digital Art');",
                            "We use the 'new' keyword to create (instantiate) an object from our class!",
                            "Each object can have different values but follows the same structure."
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What keyword is used to create a new object in Java?",
                                    options: ["create", "new", "make", "build"],
                                    correct: 1
                                },
                                {
                                    question: "What is a class in Java?",
                                    options: ["An object", "A method", "A blueprint for objects", "A variable"],
                                    correct: 2
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Great! You understand the basics of classes and objects!",
                            "Java also requires us to declare variable types - it's strongly typed!",
                            "int age = 20; // Integer\nString name = 'Damian'; // Text\nboolean isCreative = true; // True/False",
                            "This might seem strict, but it helps prevent errors and makes code more reliable!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 1: Object-Oriented Design
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Now for the really exciting part - Object-Oriented Design!",
                            "This is where Java truly shines, like mixing different colors to create a masterpiece!",
                            "We have four main principles: Encapsulation, Inheritance, Polymorphism, and Abstraction.",
                            "Let's start with encapsulation - keeping data safe and organized!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Encapsulation is like having a private art studio - you control who can access your work!",
                            "private String artistName;\npublic String getArtistName() {\n    return artistName;\n}",
                            "We make fields private and use public methods (getters/setters) to access them safely.",
                            "This protects our data from being changed in unwanted ways!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Inheritance is like learning from a master artist - you build upon their techniques!",
                            "class DigitalArtist extends Artist {\n    private String software;\n    public void createDigitalArt() { }\n}",
                            "DigitalArtist 'inherits' everything from Artist and adds its own special abilities!",
                            "This lets us reuse code and create hierarchies of related classes."
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What keyword is used for inheritance in Java?",
                                    options: ["inherits", "extends", "implements", "super"],
                                    correct: 1
                                },
                                {
                                    question: "What does encapsulation help with?",
                                    options: ["Making code faster", "Data protection", "Creating objects", "Inheritance"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Polymorphism means 'many forms' - like how the same paintbrush can create different strokes!",
                            "Artist artist = new DigitalArtist();\nartist.createArt(); // Calls DigitalArtist's version!",
                            "The same method call can behave differently depending on the actual object type!",
                            "This makes our code flexible and easier to extend!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 2: Collections & Generics
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Time to learn about organizing our data - Collections!",
                            "Think of collections like different types of art storage - some for paintings, some for sculptures!",
                            "Java provides ArrayList, HashMap, HashSet, and many more!",
                            "Let's start with ArrayList - a resizable array!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "ArrayList is like having an expandable art portfolio:",
                            "ArrayList<String> artworks = new ArrayList<>();\nartworks.add('Digital Portrait');\nartworks.add('Abstract Landscape');",
                            "Notice the <String> - that's a generic type specification!",
                            "It tells Java that this ArrayList can only contain String objects."
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "HashMap is like a catalog - it connects keys to values:",
                            "HashMap<String, String> artStyles = new HashMap<>();\nartStyles.put('Mona Lisa', 'Renaissance');\nartStyles.put('Starry Night', 'Post-Impressionism');",
                            "Perfect for when you need to look up information by a specific identifier!",
                            "Like finding an artwork's style by its name!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What does <String> represent in ArrayList<String>?",
                                    options: ["A method name", "A generic type", "A variable", "A class name"],
                                    correct: 1
                                },
                                {
                                    question: "What method adds an element to an ArrayList?",
                                    options: ["put()", "add()", "insert()", "append()"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Generics help make our code type-safe and reusable!",
                            "Instead of writing separate classes for different types, we can use generics:",
                            "class ArtCollection<T> {\n    private List<T> items = new ArrayList<>();\n}",
                            "Now we can have ArtCollection<Painting>, ArtCollection<Sculpture>, etc.!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 3: Exception Handling
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Even the best artists make mistakes - that's why we need exception handling!",
                            "In Java, exceptions are like unexpected problems that can occur while our program runs.",
                            "Instead of crashing, we can handle these problems gracefully!",
                            "Let's learn the try-catch mechanism!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Here's how we handle exceptions:",
                            "try {\n    // Code that might fail\n    int result = 10 / 0;\n} catch (ArithmeticException e) {\n    System.out.println('Cannot divide by zero!');\n}",
                            "The try block contains risky code, catch block handles the problem!",
                            "This prevents our program from crashing unexpectedly!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "We can also use 'finally' for code that always runs:",
                            "try {\n    // Risky code\n} catch (Exception e) {\n    // Handle error\n} finally {\n    // Always runs\n}",
                            "Finally is perfect for cleanup code - like putting away your art supplies!",
                            "It runs whether an exception occurred or not!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "What block is used to handle exceptions?",
                                    options: ["handle", "catch", "except", "error"],
                                    correct: 1
                                },
                                {
                                    question: "When does the finally block execute?",
                                    options: ["Only if no exception", "Only if exception occurs", "Always", "Never"],
                                    correct: 2
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "You can also create your own custom exceptions:",
                            "class ArtworkNotFoundException extends Exception {\n    public ArtworkNotFoundException(String message) {\n        super(message);\n    }\n}",
                            "This helps make your code more descriptive and easier to debug!",
                            "Like having specific error messages for different art-related problems!"
                        ],
                        action: 'next_chapter'
                    }
                ]
            },
            // Chapter 4: Advanced Java
            {
                scenes: [
                    {
                        character: 'Damian',
                        dialogue: [
                            "Welcome to advanced Java - where we explore the most powerful features!",
                            "We'll learn about interfaces, abstract classes, and design patterns!",
                            "These are like advanced art techniques - they make your code more professional and elegant!",
                            "Let's start with interfaces!"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "An interface is like a contract - it specifies what methods a class must have:",
                            "interface Drawable {\n    void draw();\n    void setColor(String color);\n}",
                            "Any class that implements Drawable must provide these methods!",
                            "It's like saying 'if you want to be drawable, you must be able to draw and set color!'"
                        ],
                        action: 'next_scene'
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Abstract classes are like incomplete artworks - they provide some implementation but leave parts for others to finish:",
                            "abstract class Artwork {\n    protected String title;\n    public abstract void create();\n    public void displayTitle() { ... }\n}",
                            "You cannot instantiate abstract classes directly, but you can extend them!",
                            "They're perfect when you want to share common code but force subclasses to implement specific methods!"
                        ],
                        action: 'quiz',
                        quizData: {
                            questions: [
                                {
                                    question: "Can you create an object directly from an abstract class?",
                                    options: ["Yes, always", "No, never", "Only with new keyword", "Only if it has methods"],
                                    correct: 1
                                },
                                {
                                    question: "What keyword is used to implement an interface?",
                                    options: ["extends", "implements", "uses", "inherits"],
                                    correct: 1
                                }
                            ]
                        }
                    },
                    {
                        character: 'Damian',
                        dialogue: [
                            "Congratulations! You've mastered Java with me!",
                            "From basic classes to advanced design patterns, you've learned the art of Java programming!",
                            "Remember, programming is like art - it requires practice, creativity, and passion!",
                            "Keep exploring, keep creating, and most importantly, keep coding with style!"
                        ],
                        action: 'complete'
                    }
                ]
            }
        ];
    }
}
