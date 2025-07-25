import Phaser from 'phaser';
import { createBackButton } from '../../components/buttons/backbutton.js';
import { char2 } from '../../gameManager.js';

export default class LilyChapterSelect extends Phaser.Scene {
    constructor() {
        super('LilyChapterSelect');
    }

    preload() {
        // Load backgrounds
        this.load.image('classroom_bg', 'assets/img/bg/classroom_day.png');
        
        // Load sounds
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        const { width, height } = this.scale;
        
        // Background
        this.bg = this.add.image(width / 2, height / 2, 'classroom_bg');
        this.bg.setDisplaySize(width, height);
        
        // Add dimming overlay for better readability
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        this.dimOverlay.setDepth(0); // Behind everything else
        
        // Title
        this.add.text(width / 2, height * 0.15, "Lily's Python Journey", {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '36px',
            color: '#ff6b9d',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Chapter buttons
        const chapters = [
            {
                title: "Chapter 1: Python Basics",
                description: "Learn variables, data types, and basic syntax",
                chapter: 0,
                unlocked: true,
                completed: char2.storyProgress && char2.storyProgress.chapter > 0
            },
            {
                title: "Chapter 2: Control Structures", 
                description: "Master loops and conditional statements",
                chapter: 1,
                unlocked: char2.storyProgress && char2.storyProgress.chapter >= 1,
                completed: char2.storyProgress && char2.storyProgress.chapter > 1
            },
            {
                title: "Chapter 3: Functions & Modules",
                description: "Create reusable code and organize projects",
                chapter: 2,
                unlocked: char2.storyProgress && char2.storyProgress.chapter >= 2,
                completed: char2.storyProgress && char2.storyProgress.chapter > 2
            },
            {
                title: "Chapter 4: Object-Oriented Programming",
                description: "Build classes and understand inheritance",
                chapter: 3,
                unlocked: char2.storyProgress && char2.storyProgress.chapter >= 3,
                completed: char2.storyProgress && char2.storyProgress.chapter > 3
            },
            {
                title: "Chapter 5: Data Structures",
                description: "Master lists, dictionaries, and advanced data types",
                chapter: 4,
                unlocked: char2.storyProgress && char2.storyProgress.chapter >= 4,
                completed: char2.storyProgress && char2.storyProgress.chapter > 4
            }
        ];
        
        // Sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        
        // Create chapter buttons
        const startY = height * 0.3;
        const buttonSpacing = 80;
        
        chapters.forEach((chapter, index) => {
            const y = startY + (index * buttonSpacing);
            
            // Button background
            const buttonColor = chapter.unlocked ? 
                (chapter.completed ? 0x4caf50 : 0xff6b9d) : 0x666666;
            
            const button = this.add.rectangle(width / 2, y, 600, 60, buttonColor)
                .setStrokeStyle(3, 0x000000);
            
            // Button text
            const titleText = this.add.text(width / 2 - 200, y - 8, chapter.title, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5);
            
            const descText = this.add.text(width / 2 - 200, y + 12, chapter.description, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0, 0.5);
            
            // Status icon
            if (chapter.completed) {
                this.add.text(width / 2 + 250, y, '✓', {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '24px',
                    color: '#4caf50',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0.5);
            } else if (!chapter.unlocked) {
                this.add.text(width / 2 + 250, y, '🔒', {
                    fontSize: '20px'
                }).setOrigin(0.5);
            }
            
            // Make interactive if unlocked
            if (chapter.unlocked) {
                button.setInteractive({ useHandCursor: true });
                titleText.setInteractive({ useHandCursor: true });
                descText.setInteractive({ useHandCursor: true });
                
                // Hover effects
                const hoverIn = () => {
                    button.setFillStyle(chapter.completed ? 0x66bb6a : 0xff85b3);
                    this.se_hoverSound.play();
                };
                const hoverOut = () => {
                    button.setFillStyle(buttonColor);
                };
                
                button.on('pointerover', hoverIn);
                button.on('pointerout', hoverOut);
                titleText.on('pointerover', hoverIn);
                titleText.on('pointerout', hoverOut);
                descText.on('pointerover', hoverIn);
                descText.on('pointerout', hoverOut);
                
                // Click handler
                const clickHandler = () => {
                    this.se_confirmSound.play();
                    this.scene.start('LilyStoryMode', { chapter: chapter.chapter });
                };
                
                button.on('pointerdown', clickHandler);
                titleText.on('pointerdown', clickHandler);
                descText.on('pointerdown', clickHandler);
            }
        });
        
        // Progress summary
        const completedChapters = chapters.filter(c => c.completed).length;
        const totalChapters = chapters.length;
        
        this.add.text(width / 2, height * 0.85, `Progress: ${completedChapters}/${totalChapters} chapters completed`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '18px',
            color: '#ff6b9d',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Back button
        createBackButton(this, 'Classroom');
        
        // Navigation hint
        this.add.text(width / 2, height * 0.92, 'Select a chapter to begin or continue your Python journey!', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
    }
}
