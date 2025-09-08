import Phaser from 'phaser';
import BaseScene from './BaseScene.js';
import { playExclusiveBGM, updateSoundVolumes } from '../audioUtils.js';
import { getScaleInfo } from '../utils/mobileUtils.js';

export default class ResultScreen extends BaseScene {
    constructor() {
        super('ResultScreen');
    }

    preload() {
        // Load result screen music and sound effects
        this.load.audio('bgm_results', 'assets/audio/bgm/bgm_results.mp3');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
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
        
        // Get mobile information for responsive design
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        const isSmallMobile = scaleInfo.width < 480;
        
        // Initialize sound effects and background music
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        playExclusiveBGM(this, 'bgm_results', { loop: true });
        updateSoundVolumes(this);
        
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
        
        // Responsive panel sizing - more aggressive for mobile
        const panelWidth = isMobile ? Math.min(scaleInfo.width * 0.95, 320) : 700;
        const panelHeight = isMobile ? Math.min(scaleInfo.height * 0.90, 400) : 600;
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
        
        // Title text with more aggressive mobile sizing
        const titleText = this.courseCompleted ? 
            `COURSE COMPLETED!` : 
            'SESSION ENDED';
        
        const titleFontSize = isMobile ? '20px' : (this.courseCompleted ? '36px' : '40px');
        const titleY = panelY - (panelHeight * 0.4);
        
        const title = this.add.text(panelX, titleY, titleText, {
            fontFamily: 'Arial',
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: this.courseCompleted ? '#00ff88' : '#ff6600',
            stroke: '#000000',
            strokeThickness: isMobile ? 1 : 3,
            align: 'center',
            shadow: {
                offsetX: isMobile ? 1 : 2,
                offsetY: isMobile ? 1 : 2,
                color: '#000000',
                blur: isMobile ? 2 : 5,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Course name if completed - much smaller for mobile
        if (this.courseCompleted) {
            const courseNameFontSize = isMobile ? '14px' : '28px';
            const courseNameY = titleY + (isMobile ? 25 : 40);
            
            const courseName = this.add.text(panelX, courseNameY, this.courseTopic.toUpperCase(), {
                fontFamily: 'Arial',
                fontSize: courseNameFontSize,
                fontWeight: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0.5);
        }
        
        // Rank display with much smaller sizing for mobile
        const rankRadius = isMobile ? 25 : 50;
        const rankFontSize = isMobile ? '28px' : '56px';
        const rankY = panelY - (panelHeight * 0.2);
        
        const rankBg = this.add.circle(panelX, rankY, rankRadius, rankColor, 0.2);
        const rankBorder = this.add.circle(panelX, rankY, rankRadius);
        rankBorder.setStrokeStyle(isMobile ? 2 : 5, rankColor);
        
        const rankText = this.add.text(panelX, rankY, rank, {
            fontFamily: 'Arial',
            fontSize: rankFontSize,
            fontWeight: 'bold',
            color: rankColor,
            stroke: '#000000',
            strokeThickness: isMobile ? 1 : 4,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: rankGlow,
                blur: isMobile ? 5 : 15,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Statistics section with very compact mobile layout
        const statsY = panelY + (panelHeight * 0.05);
        const lineHeight = isMobile ? 22 : 35;
        const statsFontSize = isMobile ? '12px' : '22px';
        
        // Create colored stats with icons
        const statsData = [
            { label: '✓ Correct', value: this.correctAnswers, color: '#00ff88' },
            { label: '✗ Wrong', value: this.wrongAnswers, color: '#ff4444' },
            { label: '🔥 Streak', value: `${this.highestStreak}x`, color: '#ffaa00' },
            { label: '⭐ Score', value: this.totalScore, color: '#00ddff' },
            { label: '📊 Accuracy', value: `${accuracy.toFixed(1)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444' }
        ];
        
        statsData.forEach((stat, index) => {
            // Very compact stat background for mobile
            const statBgWidth = panelWidth - (isMobile ? 20 : 60);
            const statBgHeight = isMobile ? 18 : 30;
            const statBg = this.add.rectangle(panelX, statsY + (index * lineHeight), statBgWidth, statBgHeight, 0x0a1628, 0.5);
            
            // Compact positioning for mobile
            const leftX = panelX - (statBgWidth * 0.35);
            const rightX = panelX + (statBgWidth * 0.35);
            
            // Stat label - shortened for mobile
            const displayLabel = isMobile ? stat.label : 
                stat.label.replace('Correct Answers', 'Correct').replace('Wrong Answers', 'Wrong').replace('Highest Streak', 'Streak').replace('Total Score', 'Score');
            
            this.add.text(leftX, statsY + (index * lineHeight), displayLabel, {
                fontFamily: 'Arial',
                fontSize: statsFontSize,
                color: '#ffffff',
                fontWeight: 'bold'
            }).setOrigin(0, 0.5);
            
            // Stat value
            this.add.text(rightX, statsY + (index * lineHeight), stat.value.toString(), {
                fontFamily: 'Arial',
                fontSize: statsFontSize,
                color: stat.color,
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: isMobile ? 0 : 1
            }).setOrigin(1, 0.5);
        });
        
        // Enhanced button design with compact mobile sizing
        const buttonY = panelY + (panelHeight * 0.4);
        const buttonWidth = isMobile ? 200 : 350;
        const buttonHeight = isMobile ? 35 : 60;
        const buttonFontSize = isMobile ? '14px' : '22px';
        
        const buttonBg = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x0f4c75);
        buttonBg.setStrokeStyle(isMobile ? 2 : 3, 0x3282b8);
        
        const buttonGlow = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x3282b8, 0.3);
        
        const buttonText = this.add.text(panelX, buttonY, isMobile ? 'Back to Lab' : 'Back to Computer Lab', {
            fontFamily: 'Arial',
            fontSize: buttonFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: isMobile ? 2 : 3,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Enhanced button interactions with larger touch targets for mobile
        const interactiveArea = this.add.rectangle(panelX, buttonY, 
            isMobile ? Math.max(buttonWidth, 50) : buttonWidth, 
            isMobile ? Math.max(buttonHeight, 50) : buttonHeight, 
            0x000000, 0);
        
        interactiveArea.setInteractive({ useHandCursor: true })
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
        
        // Create a container for all elements to allow overall scaling if needed
        const resultContainer = this.add.container(0, 0);
        resultContainer.add([panelGlow, panel, shadow, title, rankBg, rankBorder, rankText, buttonBg, buttonGlow, buttonText, interactiveArea]);
        
        // Add course name to container if it exists
        if (this.courseCompleted) {
            // Re-create course name since it was created earlier
            const courseNameFontSize = isMobile ? '14px' : '28px';
            const courseNameY = titleY + (isMobile ? 25 : 40);
            
            const courseName = this.add.text(panelX, courseNameY, this.courseTopic.toUpperCase(), {
                fontFamily: 'Arial',
                fontSize: courseNameFontSize,
                fontWeight: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0.5);
            
            resultContainer.add(courseName);
        }
        
        // Apply additional scaling for very small mobile screens
        if (isMobile && (panelHeight > scaleInfo.height * 0.95 || panelWidth > scaleInfo.width * 0.95)) {
            const scaleFactor = Math.min(
                (scaleInfo.height * 0.9) / panelHeight,
                (scaleInfo.width * 0.9) / panelWidth,
                0.8
            );
            resultContainer.setScale(scaleFactor);
        }
        
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
            this.createParticleEffects(panelX, panelY - 120, rankColor);
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
