import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';
import { getScaleInfo, scaleFontSize, scaleDimension } from '../../utils/mobileUtils.js';

export default class ResultScreen extends BaseScene {
    constructor() {
        super('ResultScreen');
    }

    init(data) {
        // Receive data from main gameplay scene
        this.correctAnswers = data.correctAnswers || 0;
        this.wrongAnswers = data.wrongAnswers || 0;
        this.highestStreak = data.highestStreak || 0;
        this.totalScore = data.totalScore || 0;
        this.courseTopic = data.courseTopic || 'Unknown';
        this.courseCompleted = data.courseCompleted || false;
        
        console.log('ResultScreen initialized with:', data);
    }

    create() {
        super.create();
        
        // Get scale information for mobile responsiveness
        const scaleInfo = getScaleInfo();
        
        // Calculate ranking based on correct/wrong ratio
        const totalQuestions = this.correctAnswers + this.wrongAnswers;
        const accuracy = totalQuestions > 0 ? (this.correctAnswers / totalQuestions) * 100 : 0;
        
        let rank = 'F';
        let rankColor = '#ff0000';
        let rankGlow = '#ff0000';
        
        if (accuracy >= 95) {
            rank = 'S';
            rankColor = '#ffd700';
            rankGlow = '#ffff00';
        } else if (accuracy >= 90) {
            rank = 'A';
            rankColor = '#00ff00';
            rankGlow = '#88ff88';
        } else if (accuracy >= 80) {
            rank = 'B';
            rankColor = '#00ffff';
            rankGlow = '#88ffff';
        } else if (accuracy >= 70) {
            rank = 'C';
            rankColor = '#ffff00';
            rankGlow = '#ffff88';
        } else if (accuracy >= 60) {
            rank = 'D';
            rankColor = '#ff8000';
            rankGlow = '#ffaa00';
        } else if (accuracy >= 50) {
            rank = 'E';
            rankColor = '#ff4000';
            rankGlow = '#ff6600';
        }
        
        // Create gradient background
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x000000, 0x000000, 0x1a1a2e, 0x1a1a2e, 1);
        gradient.fillRect(0, 0, this.scale.width, this.scale.height);
        
        // Create main result panel with responsive dimensions
        const panelWidth = scaleDimension(500, scaleInfo);
        const panelHeight = scaleDimension(450, scaleInfo);
        const panelX = this.scale.width / 2;
        const panelY = this.scale.height / 2;
        
        // Panel shadow
        const shadow = this.add.rectangle(panelX + 5, panelY + 5, panelWidth, panelHeight, 0x000000, 0.5);
        shadow.setStrokeStyle(2, 0x333333);
        
        // Main panel
        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x16213e);
        panel.setStrokeStyle(3, 0x0f4c75);
        
        // Panel glow effect
        const panelGlow = this.add.rectangle(panelX, panelY, panelWidth + 10, panelHeight + 10, 0x0f4c75, 0.3);
        
        // Title text with better styling
        const titleText = this.courseCompleted ? 
            `COURSE COMPLETED!` : 
            'SESSION ENDED';
        
        const title = this.add.text(panelX, panelY - 170, titleText, {
            fontFamily: 'Arial',
            fontSize: this.courseCompleted ? '28px' : '32px',
            fontWeight: 'bold',
            color: this.courseCompleted ? '#00ff88' : '#ff6600',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 5,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Course name if completed
        if (this.courseCompleted) {
            const courseName = this.add.text(panelX, panelY - 140, this.courseTopic.toUpperCase(), {
                fontFamily: 'Arial',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0.5);
        }
        
        // Rank display with special effects
        const rankBg = this.add.circle(panelX, panelY - 80, 40, rankColor, 0.2);
        const rankBorder = this.add.circle(panelX, panelY - 80, 40);
        rankBorder.setStrokeStyle(4, rankColor);
        
        const rankText = this.add.text(panelX, panelY - 80, rank, {
            fontFamily: 'Arial',
            fontSize: '48px',
            fontWeight: 'bold',
            color: rankColor,
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: rankGlow,
                blur: 10,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Statistics section
        const statsY = panelY - 10;
        const lineHeight = 28;
        
        // Create colored stats with icons
        const statsData = [
            { label: '✓ Correct Answers', value: this.correctAnswers, color: '#00ff88' },
            { label: '✗ Wrong Answers', value: this.wrongAnswers, color: '#ff4444' },
            { label: '🔥 Highest Streak', value: `${this.highestStreak}x`, color: '#ffaa00' },
            { label: '⭐ Total Score', value: this.totalScore, color: '#00ddff' },
            { label: '📊 Accuracy', value: `${accuracy.toFixed(1)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444' }
        ];
        
        statsData.forEach((stat, index) => {
            // Stat background
            const statBg = this.add.rectangle(panelX, statsY + (index * lineHeight), panelWidth - 40, 24, 0x0a1628, 0.5);
            
            // Stat text
            this.add.text(panelX - 180, statsY + (index * lineHeight), stat.label, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#ffffff',
                fontWeight: 'bold'
            }).setOrigin(0, 0.5);
            
            this.add.text(panelX + 180, statsY + (index * lineHeight), stat.value.toString(), {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: stat.color,
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(1, 0.5);
        });
        
        // Enhanced button design with responsive dimensions
        const buttonY = panelY + scaleDimension(160, scaleInfo);
        const buttonWidth = scaleDimension(280, scaleInfo);
        const buttonHeight = scaleDimension(50, scaleInfo);
        const buttonFontSize = scaleFontSize(18, scaleInfo);
        
        const buttonBg = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x0f4c75);
        buttonBg.setStrokeStyle(scaleDimension(2, scaleInfo), 0x3282b8);
        
        const buttonGlow = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x3282b8, 0.3);
        
        const buttonText = this.add.text(panelX, buttonY, 'Back to Computer Lab', {
            fontFamily: 'Arial',
            fontSize: `${buttonFontSize}px`,
            fontWeight: 'bold',
            color: '#ffffff',
            shadow: {
                offsetX: scaleDimension(1, scaleInfo),
                offsetY: scaleDimension(1, scaleInfo),
                color: '#000000',
                blur: scaleDimension(3, scaleInfo),
                fill: true
            }
        }).setOrigin(0.5);
        
        // Enhanced button interactions
        buttonBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                buttonBg.setFillStyle(0x3282b8);
                buttonGlow.setAlpha(0.6);
                buttonText.setScale(1.05);
                this.tweens.add({
                    targets: buttonGlow,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 200,
                    yoyo: true,
                    repeat: -1
                });
            })
            .on('pointerout', () => {
                buttonBg.setFillStyle(0x0f4c75);
                buttonGlow.setAlpha(0.3);
                buttonText.setScale(1);
                this.tweens.killTweensOf(buttonGlow);
                buttonGlow.setScale(1);
            })
            .on('pointerdown', () => {
                // Button press effect
                buttonBg.setScale(0.95);
                buttonText.setScale(0.95);
                this.time.delayedCall(100, () => {
                    this.scene.start('ComputerLab');
                });
            });
        
        // Entrance animations
        const animatedElements = [panelGlow, panel, title, rankBg, rankBorder, rankText];
        
        animatedElements.forEach((element, index) => {
            element.setAlpha(0);
            element.setScale(0.8);
            
            this.tweens.add({
                targets: element,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 600,
                delay: index * 100,
                ease: 'Back.out'
            });
        });
        
        // Animate stats with stagger
        this.time.delayedCall(800, () => {
            statsData.forEach((_, index) => {
                this.tweens.add({
                    targets: this.children.list.filter(child => 
                        child.y === statsY + (index * lineHeight) && 
                        (child.type === 'Rectangle' || child.type === 'Text')
                    ),
                    alpha: { from: 0, to: 1 },
                    x: { from: '+=50', to: '-=50' },
                    duration: 400,
                    delay: index * 100,
                    ease: 'Power2.out'
                });
            });
        });
        
        // Animate button last
        [buttonGlow, buttonBg, buttonText].forEach((element, index) => {
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: 1,
                duration: 400,
                delay: 1400 + (index * 50),
                ease: 'Power2.out'
            });
        });
        
        // Add particle effects for high ranks
        if (rank === 'S' || rank === 'A') {
            this.createParticleEffects(panelX, panelY - 80, rankColor);
        }
        
        console.log('ResultScreen created successfully');
    }
    
    createParticleEffects(x, y, color) {
        // Create simple particle effect for high ranks
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(x, y, 2, parseInt(color.replace('#', '0x')));
            particle.setAlpha(0.8);
            
            const angle = (Math.PI * 2 * i) / 20;
            const distance = 60 + Math.random() * 40;
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 1500 + Math.random() * 1000,
                ease: 'Power2.out',
                onComplete: () => particle.destroy()
            });
        }
    }
}
