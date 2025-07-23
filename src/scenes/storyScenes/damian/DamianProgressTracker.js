import Phaser from 'phaser';
import { createBackButton } from '../../../components/buttons/backbutton.js';
import { char3 } from '../../../gameManager.js';

export default class DamianProgressTracker extends Phaser.Scene {
    constructor() {
        super('DamianProgressTracker');
    }

    preload() {
        // Load character sprite
        this.load.image('damian', 'assets/sprites/npcs/damian.png');
        
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
        
        // Add dimming overlay
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
        
        // Character sprite
        this.damian = this.add.image(width * 0.15, height * 0.7, 'damian');
        this.damian.setScale(0.6);
        
        // Title
        this.add.text(width / 2, 80, "Damian's Java Progress", {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '36px',
            color: '#f57c00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Get current progress
        const storyProgress = char3.storyProgress || { chapter: 0, scene: 0, completed: false };
        
        // Chapter progress
        const chapters = [
            { name: 'Java Foundations', topics: ['Classes', 'Objects', 'Variables'] },
            { name: 'Object-Oriented Design', topics: ['Encapsulation', 'Inheritance', 'Polymorphism'] },
            { name: 'Collections & Generics', topics: ['ArrayList', 'HashMap', 'Generic Types'] },
            { name: 'Exception Handling', topics: ['Try-Catch', 'Finally Block', 'Custom Exceptions'] },
            { name: 'Advanced Java', topics: ['Interfaces', 'Abstract Classes', 'Design Patterns'] }
        ];
        
        // Progress overview
        const completedChapters = storyProgress.chapter;
        const totalChapters = chapters.length;
        const overallProgress = (completedChapters / totalChapters) * 100;
        
        this.add.text(width / 2, 150, `Overall Progress: ${Math.round(overallProgress)}%`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Progress bar for overall progress
        const barWidth = 400;
        const barHeight = 20;
        const barX = width / 2;
        const barY = 180;
        
        // Background bar
        this.add.rectangle(barX, barY, barWidth, barHeight, 0x444444)
            .setStrokeStyle(2, 0x000000);
        
        // Progress bar fill
        this.add.rectangle(
            barX - barWidth / 2 + (overallProgress / 100 * barWidth) / 2,
            barY,
            (overallProgress / 100) * barWidth,
            barHeight,
            0xf57c00
        );
        
        // Chapter breakdown
        let startY = 230;
        
        chapters.forEach((chapter, index) => {
            const isCompleted = index < completedChapters;
            const isCurrent = index === completedChapters;
            const isLocked = index > completedChapters;
            
            let color = '#888888'; // Locked
            let icon = '🔒';
            
            if (isCompleted) {
                color = '#4caf50';
                icon = '✓';
            } else if (isCurrent) {
                color = '#f57c00';
                icon = '▶';
            }
            
            // Chapter name
            this.add.text(width * 0.35, startY, `${icon} ${chapter.name}`, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '20px',
                color: color,
                stroke: '#000000',
                strokeThickness: 2
            });
            
            // Topics learned
            if (isCompleted || isCurrent) {
                chapter.topics.forEach((topic, topicIndex) => {
                    const topicColor = isCompleted || (isCurrent && topicIndex === 0) ? '#ffffff' : '#cccccc';
                    this.add.text(width * 0.4, startY + 30 + (topicIndex * 20), `• ${topic}`, {
                        fontFamily: 'Caprasimo-Regular',
                        fontSize: '14px',
                        color: topicColor,
                        stroke: '#000000',
                        strokeThickness: 1
                    });
                });
            }
            
            startY += 100;
        });
        
        // Quest progress section
        this.add.text(width * 0.7, 230, 'Quest Progress', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#f57c00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Quest 1 progress
        const quest1Progress = char3.quest1 || 0;
        this.createQuestBar(width * 0.7, 270, 'Java Fundamentals', quest1Progress, 200);
        
        // Quest 2 progress
        const quest2Progress = char3.quest2 || 0;
        this.createQuestBar(width * 0.7, 320, 'OOP Mastery', quest2Progress, 200);
        
        // Quest 3 progress
        const quest3Progress = char3.quest3 || 0;
        this.createQuestBar(width * 0.7, 370, 'Advanced Java', quest3Progress, 200);
        
        // Damian's message
        let message = "Ready to create something amazing with Java?";
        if (overallProgress > 80) {
            message = "You're becoming a true Java artist!";
        } else if (overallProgress > 50) {
            message = "Your Java skills are taking shape beautifully!";
        } else if (overallProgress > 20) {
            message = "Great start! Java is like learning a new art form!";
        }
        
        this.add.text(width * 0.15, height * 0.9, `"${message}"`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '16px',
            color: '#f57c00',
            stroke: '#000000',
            strokeThickness: 2,
            wordWrap: { width: 250 },
            align: 'center'
        }).setOrigin(0.5);
        
        // Back button
        createBackButton(this, 'Classroom');
        
        // Continue Story button if there's progress
        if (completedChapters < totalChapters) {
            const continueBtn = this.add.rectangle(width / 2, height - 100, 250, 50, 0xf57c00)
                .setStrokeStyle(3, 0x000000)
                .setInteractive({ useHandCursor: true });
            
            this.add.text(width / 2, height - 100, 'Continue Story', {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            continueBtn.on('pointerover', () => {
                continueBtn.setFillStyle(0xff9800);
            });
            
            continueBtn.on('pointerout', () => {
                continueBtn.setFillStyle(0xf57c00);
            });
            
            continueBtn.on('pointerdown', () => {
                this.scene.start('DamianStoryMode', { chapter: completedChapters });
            });
        }
    }
    
    createQuestBar(x, y, label, progress, width) {
        // Label
        this.add.text(x, y - 15, label, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Progress bar background
        this.add.rectangle(x, y, width, 20, 0x444444)
            .setStrokeStyle(2, 0x000000);
        
        // Progress bar fill
        this.add.rectangle(
            x - width / 2 + (progress / 100 * width) / 2,
            y,
            (progress / 100) * width,
            20,
            0xf57c00
        );
        
        // Progress percentage
        this.add.text(x + width / 2 + 30, y, `${Math.round(progress)}%`, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0, 0.5);
    }
}
