import Phaser from 'phaser';
import { char1, onceOnlyFlags } from '/src/gameManager.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';

export default class NoahProgressTracker extends Phaser.Scene {
    constructor() {
        super('NoahProgressTracker');
    }

    preload() {
        // Load background
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
        this.add.text(width / 2, height * 0.1, "Noah's Learning Progress", {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '36px',
            color: '#1e90ff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Progress cards
        this.createProgressCards();
        
        // Back button
        createBackButton(this, 'Classroom');
    }

    createProgressCards() {
        const { width, height } = this.scale;
        
        const skills = [
            {
                name: 'HTML Structure',
                progress: Math.min(char1.quest1, 100),
                color: 0xe74c3c,
                description: 'Building web page foundations'
            },
            {
                name: 'CSS Styling', 
                progress: Math.min(char1.quest2, 100),
                color: 0x3498db,
                description: 'Making pages beautiful'
            },
            {
                name: 'JavaScript Interactivity',
                progress: Math.min(char1.quest3, 100), 
                color: 0xf1c40f,
                description: 'Adding dynamic behavior'
            }
        ];

        const cardWidth = 200;
        const cardHeight = 280;
        const spacing = 250;
        const startX = width / 2 - spacing;

        skills.forEach((skill, index) => {
            const x = startX + (index * spacing);
            const y = height / 2;

            // Card background
            const card = this.add.rectangle(x, y, cardWidth, cardHeight, 0xffffff, 0.9);
            card.setStrokeStyle(3, skill.color);

            // Skill name
            this.add.text(x, y - 100, skill.name, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '16px',
                color: '#2c3e50',
                wordWrap: { width: cardWidth - 20 },
                align: 'center',
                stroke: '#ffffff',
                strokeThickness: 2
            }).setOrigin(0.5);

            // Progress circle
            this.createProgressCircle(x, y - 20, skill.progress, skill.color);

            // Progress percentage
            this.add.text(x, y - 20, `${skill.progress}%`, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '20px',
                color: '#2c3e50',
                stroke: '#ffffff',
                strokeThickness: 2
            }).setOrigin(0.5);

            // Description
            this.add.text(x, y + 60, skill.description, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '12px',
                color: '#7f8c8d',
                wordWrap: { width: cardWidth - 20 },
                align: 'center'
            }).setOrigin(0.5);

            // Achievement badges
            this.createAchievementBadge(x, y + 100, skill.progress, skill.color);
        });

        // Overall completion status
        const totalProgress = (char1.quest1 + char1.quest2 + char1.quest3) / 3;
        const completionText = totalProgress >= 100 ? 
            "🎉 Web Development Master! 🎉" :
            totalProgress >= 75 ?
            "⭐ Advanced Developer ⭐" :
            totalProgress >= 50 ?
            "📚 Intermediate Learner 📚" :
            "🌱 Beginning Journey 🌱";

        this.add.text(width / 2, height * 0.85, completionText, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: '24px',
            color: '#27ae60',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
    }

    createProgressCircle(x, y, progress, color) {
        const radius = 40;
        
        // Background circle
        const bgCircle = this.add.graphics();
        bgCircle.lineStyle(6, 0xecf0f1);
        bgCircle.strokeCircle(x, y, radius);
        
        // Progress arc
        const progressGraphics = this.add.graphics();
        progressGraphics.lineStyle(6, color);
        
        // Calculate arc angle (progress from 0 to 100 becomes 0 to 2π)
        const startAngle = -Math.PI / 2; // Start from top
        const endAngle = startAngle + (progress / 100) * 2 * Math.PI;
        
        if (progress > 0) {
            progressGraphics.beginPath();
            progressGraphics.arc(x, y, radius, startAngle, endAngle);
            progressGraphics.strokePath();
        }
    }

    createAchievementBadge(x, y, progress, color) {
        if (progress >= 25) {
            // Bronze badge
            const badge = this.add.circle(x - 30, y, 15, 0xcd7f32);
            badge.setStrokeStyle(2, 0xa0522d);
            this.add.text(x - 30, y, '🥉', { fontSize: '16px' }).setOrigin(0.5);
        }
        
        if (progress >= 50) {
            // Silver badge  
            const badge = this.add.circle(x, y, 15, 0xc0c0c0);
            badge.setStrokeStyle(2, 0x808080);
            this.add.text(x, y, '🥈', { fontSize: '16px' }).setOrigin(0.5);
        }
        
        if (progress >= 75) {
            // Gold badge
            const badge = this.add.circle(x + 30, y, 15, 0xffd700);
            badge.setStrokeStyle(2, 0xdaa520);
            this.add.text(x + 30, y, '🥇', { fontSize: '16px' }).setOrigin(0.5);
        }
        
        if (progress >= 100) {
            // Master badge
            const badge = this.add.circle(x, y + 30, 18, 0x9932cc);
            badge.setStrokeStyle(2, 0x663399);
            this.add.text(x, y + 30, '👑', { fontSize: '20px' }).setOrigin(0.5);
        }
    }
}
