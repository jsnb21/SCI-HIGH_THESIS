import Phaser from 'phaser';
import { createBackButton } from '../../components/buttons/backbutton.js';
import { char1 } from '../../gameManager.js';

export default class NoahChapterSelect extends Phaser.Scene {
    constructor() {
        super('NoahChapterSelect');
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
        this.add.text(width / 2, height * 0.15, "Noah's Web Development Story", {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '36px',
            color: '#1e90ff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Chapter buttons
        const chapters = [
            {
                title: "Chapter 1: HTML Basics",
                description: "Learn the structure of web pages",
                chapter: 0,
                unlocked: true,
                completed: char1.storyProgress && char1.storyProgress.chapter > 0
            },
            {
                title: "Chapter 2: CSS Styling", 
                description: "Make your pages beautiful",
                chapter: 1,
                unlocked: char1.storyProgress && char1.storyProgress.chapter >= 1,
                completed: char1.storyProgress && char1.storyProgress.chapter > 1
            },
            {
                title: "Chapter 3: JavaScript Power",
                description: "Add interactivity to your sites",
                chapter: 2,
                unlocked: char1.storyProgress && char1.storyProgress.chapter >= 2,
                completed: char1.storyProgress && char1.storyProgress.chapter > 2
            }
        ];
        
        const buttonHeight = 80;
        const buttonSpacing = 100;
        const startY = height * 0.35;
        
        chapters.forEach((chapter, index) => {
            const y = startY + (index * buttonSpacing);
            const isUnlocked = chapter.unlocked;
            const isCompleted = chapter.completed;
            
            // Button background - different colors for different states
            let buttonColor = 0x666666; // Locked (gray)
            if (isUnlocked && isCompleted) {
                buttonColor = 0x2e7d32; // Completed (dark green)
            } else if (isUnlocked) {
                buttonColor = 0x4caf50; // Available (green)
            }
            
            const button = this.add.rectangle(
                width / 2, 
                y, 
                500, 
                buttonHeight, 
                buttonColor,
                isUnlocked ? 1 : 0.5
            );
            button.setStrokeStyle(3, isUnlocked ? 0x2e7d32 : 0x444444);
            
            if (isUnlocked) {
                button.setInteractive({ useHandCursor: true });
                
                // Hover effects
                button.on('pointerover', () => {
                    button.setFillStyle(0x66bb6a);
                    this.sound.play('se_select');
                });
                
                button.on('pointerout', () => {
                    button.setFillStyle(0x4caf50);
                });
                
                // Click handler
                button.on('pointerdown', () => {
                    this.sound.play('se_confirm');
                    this.startChapter(chapter.chapter);
                });
            }
            
            // Title text
            this.add.text(width / 2, y - 15, chapter.title, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '20px',
                color: isUnlocked ? '#ffffff' : '#999999',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            // Description text
            this.add.text(width / 2, y + 15, chapter.description, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '14px',
                color: isUnlocked ? '#cccccc' : '#777777'
            }).setOrigin(0.5);
            
            // Lock icon for locked chapters or checkmark for completed
            if (!isUnlocked) {
                this.add.text(width / 2 + 220, y, '🔒', {
                    fontSize: '32px'
                }).setOrigin(0.5);
            } else if (isCompleted) {
                this.add.text(width / 2 + 220, y, '✅', {
                    fontSize: '32px'
                }).setOrigin(0.5);
            }
        });
        
        // Continue Story button (if story is in progress)
        if (char1.storyProgress && char1.storyProgress.chapter < 3 && !char1.storyProgress.completed) {
            const continueBtn = this.add.rectangle(
                width / 2,
                height * 0.8,
                300,
                50,
                0x2196f3
            );
            continueBtn.setStrokeStyle(3, 0x1976d2);
            continueBtn.setInteractive({ useHandCursor: true });
            
            this.add.text(width / 2, height * 0.8, 'Continue Story', {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            continueBtn.on('pointerover', () => {
                continueBtn.setFillStyle(0x42a5f5);
                this.sound.play('se_select');
            });
            
            continueBtn.on('pointerout', () => {
                continueBtn.setFillStyle(0x2196f3);
            });
            
            continueBtn.on('pointerdown', () => {
                this.sound.play('se_confirm');
                this.scene.start('NoahStoryMode');
            });
        }
        
        // Back button
        createBackButton(this, 'Classroom');
    }
    
    startChapter(chapterIndex) {
        // Set the story progress to the selected chapter
        char1.storyProgress = {
            chapter: chapterIndex,
            scene: 0,
            completed: false
        };
        
        // Start the story mode
        this.scene.start('NoahStoryMode');
    }
}
