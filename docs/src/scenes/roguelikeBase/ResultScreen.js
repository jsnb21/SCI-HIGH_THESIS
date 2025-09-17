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
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        
        // Debug logging
        console.log('ResultScreen (roguelikeBase) - Mobile detection:', {
            width: scaleInfo.width,
            height: scaleInfo.height,
            isMobile
        });
        
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
        
        // Create main result panel with MUCH larger responsive dimensions for mobile
        const panelWidth = isMobile ? Math.min(scaleInfo.width * 0.95, 380) : scaleDimension(500, scaleInfo);
        const panelHeight = isMobile ? Math.min(scaleInfo.height * 0.90, 500) : scaleDimension(450, scaleInfo);
        const panelX = this.scale.width / 2;
        const panelY = this.scale.height / 2;
        
        console.log('ResultScreen - Panel dimensions:', {
            panelWidth,
            panelHeight,
            isMobile,
            screenWidth: scaleInfo.width,
            screenHeight: scaleInfo.height
        });
        
        // Panel shadow
        const shadow = this.add.rectangle(panelX + 5, panelY + 5, panelWidth, panelHeight, 0x000000, 0.5);
        shadow.setStrokeStyle(2, 0x333333);
        
        // Main panel - consistent design for both mobile and PC
        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a2332);
        panel.setStrokeStyle(3, 0x4a90e2); // Blue border for both platforms
        
        // Panel glow effect
        const panelGlow = this.add.rectangle(panelX, panelY, panelWidth + 10, panelHeight + 10, 0x0f4c75, 0.3);
        
        // Title text with better styling and responsive positioning
        const titleText = this.courseCompleted ? 
            `COURSE COMPLETED!` : 
            'SESSION ENDED';
        
        let titleY = isMobile ? panelY - panelHeight * 0.4 : panelY - panelHeight * 0.35;
        const title = this.add.text(panelX, titleY, titleText, {
            fontFamily: 'Arial',
            fontSize: isMobile ? 
                (this.courseCompleted ? scaleFontSize(28, scaleInfo) : scaleFontSize(32, scaleInfo)) :
                (this.courseCompleted ? '32px' : '36px'),
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
            let courseNameY = isMobile ? panelY - panelHeight * 0.3 : panelY - panelHeight * 0.25;
            const courseName = this.add.text(panelX, courseNameY, this.courseTopic.toUpperCase(), {
                fontFamily: 'Arial',
                fontSize: isMobile ? scaleFontSize(22, scaleInfo) : '26px',
                fontWeight: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0.5);
        }
        
        // Enhanced rank display with special effects and responsive positioning
        let rankY = isMobile ? panelY - panelHeight * 0.25 : panelY - panelHeight * 0.2; // Moved up more
        let rankSize = isMobile ? 35 : 50;
        
        // Multi-layer rank background for depth
        const rankOuterGlow = this.add.circle(panelX, rankY, rankSize + 8, rankColor, 0.2);
        const rankBg = this.add.circle(panelX, rankY, rankSize, 0x2c3e50, 0.9);
        const rankBorder = this.add.circle(panelX, rankY, rankSize);
        rankBorder.setStrokeStyle(4, rankColor);
        const rankInnerGlow = this.add.circle(panelX, rankY, rankSize - 8, rankColor, 0.3);
        
        const rankText = this.add.text(panelX, rankY, rank, {
            fontFamily: 'Arial',
            fontSize: isMobile ? scaleFontSize(44, scaleInfo) : '56px',
            fontWeight: 'bold',
            color: rankColor,
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: rankGlow,
                blur: 15,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Statistics section with improved spacing and moved up for better distribution
        const statsY = isMobile ? panelY - panelHeight * 0.05 : panelY - panelHeight * 0.02; // Moved up
        const lineHeight = isMobile ? scaleDimension(58, scaleInfo) : 60; // Even larger spacing for shadows
        
        // Create colored stats with icons and better styling
        const statsData = [
            { label: '✓ Correct Answers', value: this.correctAnswers, color: '#00ff88' },
            { label: '✗ Wrong Answers', value: this.wrongAnswers, color: '#ff4444' },
            { label: '🔥 Highest Streak', value: `${this.highestStreak}x`, color: '#ffaa00' },
            { label: '⭐ Total Score', value: this.totalScore, color: '#00ddff' },
            { label: '📊 Accuracy', value: `${accuracy.toFixed(1)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444' }
        ];
        
        statsData.forEach((stat, index) => {
            const yPos = statsY + (index * lineHeight);
            
            // Enhanced stat background with gradient effect
            const statBg = this.add.rectangle(panelX, yPos, panelWidth - 40, isMobile ? 32 : 34, 0x0a1628, 0.7);
            statBg.setStrokeStyle(1, 0x2c3e50, 0.3);
            
            // Add subtle glow effect
            const statGlow = this.add.rectangle(panelX, yPos, panelWidth - 38, isMobile ? 30 : 32, stat.color, 0.1);
            
            // Responsive positioning with better spacing
            let leftX = isMobile ? panelX - panelWidth * 0.32 : panelX - panelWidth * 0.35;
            let rightX = isMobile ? panelX + panelWidth * 0.32 : panelX + panelWidth * 0.35;
            
            // Stat label with subtle shadow for better readability
            this.add.text(leftX, yPos, stat.label, {
                fontFamily: 'Arial',
                fontSize: isMobile ? scaleFontSize(18, scaleInfo) : '22px',
                color: '#ffffff',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 0.5,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 0.5, // Very subtle shadow
                    fill: true
                }
            }).setOrigin(0, 0.5);
            
            // Stat value with subtle shadow for better readability
            this.add.text(rightX, yPos, stat.value.toString(), {
                fontFamily: 'Arial',
                fontSize: isMobile ? scaleFontSize(18, scaleInfo) : '22px',
                color: stat.color,
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 0.5,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 0.5, // Very subtle shadow
                    fill: true
                }
            }).setOrigin(1, 0.5);
        });
        
        // Enhanced button design positioned lower inside the panel with larger font
        const buttonY = isMobile ? 
            panelY + panelHeight * 0.45 :  // Lower position to accommodate larger stats spacing
            panelY + panelHeight * 0.45;   // Lower position for both mobile and PC
        const buttonWidth = isMobile ? scaleDimension(300, scaleInfo) : 320;
        const buttonHeight = isMobile ? scaleDimension(55, scaleInfo) : 60;
        const buttonFontSize = isMobile ? scaleFontSize(20, scaleInfo) : 24; // Larger font
        
        // Enhanced button design with better mobile styling
        const buttonBg = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x2c3e50);
        buttonBg.setStrokeStyle(scaleDimension(3, scaleInfo), 0x4a90e2);
        
        // Multi-layer button effect
        const buttonGlow = this.add.rectangle(panelX, buttonY, buttonWidth + 4, buttonHeight + 4, 0x4a90e2, 0.4);
        const buttonInner = this.add.rectangle(panelX, buttonY, buttonWidth - 8, buttonHeight - 8, 0x34495e, 0.8);
        
        const buttonText = this.add.text(panelX, buttonY, 'Back to Computer Lab', {
            fontFamily: 'Arial',
            fontSize: `${buttonFontSize}px`,
            fontWeight: 'bold',
            color: '#ffffff',
            shadow: {
                offsetX: scaleDimension(2, scaleInfo),
                offsetY: scaleDimension(2, scaleInfo),
                color: '#000000',
                blur: scaleDimension(4, scaleInfo),
                fill: true
            }
        }).setOrigin(0.5);
        
        // Enhanced button interactions with better visual feedback
        buttonBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                buttonBg.setFillStyle(0x4a90e2);
                buttonInner.setFillStyle(0x5dade2);
                buttonGlow.setAlpha(0.7);
                buttonText.setScale(1.05);
                this.tweens.add({
                    targets: buttonGlow,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 300,
                    yoyo: true,
                    repeat: -1
                });
            })
            .on('pointerout', () => {
                buttonBg.setFillStyle(0x2c3e50);
                buttonInner.setFillStyle(0x34495e);
                buttonGlow.setAlpha(0.4);
                buttonText.setScale(1);
                this.tweens.killTweensOf(buttonGlow);
                buttonGlow.setScale(1);
            })
            .on('pointerdown', () => {
                // Enhanced button press effect
                buttonBg.setScale(0.95);
                buttonInner.setScale(0.95);
                buttonText.setScale(0.95);
                this.time.delayedCall(150, () => {
                    this.scene.start('ComputerLab');
                });
            });
        
        // Entrance animations with all new elements
        const animatedElements = [
            panelGlow, panel, title, 
            rankOuterGlow, rankBg, rankBorder, rankInnerGlow, rankText,
            buttonBg, buttonGlow, buttonInner, buttonText
        ];
        
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
        
        // Add subtle pulsing animation to rank
        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: [rankOuterGlow, rankInnerGlow],
                alpha: { from: 0.2, to: 0.5 },
                scaleX: { from: 1, to: 1.1 },
                scaleY: { from: 1, to: 1.1 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
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
