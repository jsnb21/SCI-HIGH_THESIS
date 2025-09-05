import Phaser from 'phaser';
import BaseScene from './BaseScene.js';

export default class ResultScreen extends BaseScene {
    constructor() {
        super('ResultScreen');
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.totalScore = 0;
        this.highestStreak = 0;
        this.courseCompleted = false;
        this.courseTopic = '';
    }

    init(data) {
        this.correctAnswers = data.correctAnswers || 0;
        this.wrongAnswers = data.wrongAnswers || 0;
        this.totalScore = data.totalScore || 0;
        this.highestStreak = data.highestStreak || 0;
        this.courseCompleted = data.courseCompleted || false;
        this.courseTopic = data.courseTopic || '';
        
        console.log('ResultScreen initialized with:', data);
    }

    create() {
        super.create();
        
        // Use VNDialogue scaling system for consistency
        const BASE_WIDTH = 816;
        const BASE_HEIGHT = 624;
        const { width, height } = this.scale;
        const scaleX = width / BASE_WIDTH;
        const scaleY = height / BASE_HEIGHT;
        const scale = Math.min(scaleX, scaleY);
        
        // Calculate ranking based on correct/wrong ratio
        const totalQuestions = this.correctAnswers + this.wrongAnswers;
        const accuracy = totalQuestions > 0 ? (this.correctAnswers / totalQuestions) * 100 : 0;
        
        let rank = 'F';
        let rankColor = '#ff0000';
        let rankGlow = '#ff0000';
        let rankEmoji = '💀';
        let rankTitle = 'NEEDS IMPROVEMENT';
        
        if (accuracy >= 95) {
            rank = 'S';
            rankColor = '#ffd700';
            rankGlow = '#ffff00';
            rankEmoji = '👑';
            rankTitle = 'LEGENDARY PERFORMANCE';
        } else if (accuracy >= 90) {
            rank = 'A';
            rankColor = '#00ff00';
            rankGlow = '#88ff88';
            rankEmoji = '⭐';
            rankTitle = 'EXCELLENT WORK';
        } else if (accuracy >= 80) {
            rank = 'B';
            rankColor = '#00ffff';
            rankGlow = '#88ffff';
            rankEmoji = '🎯';
            rankTitle = 'WELL DONE';
        } else if (accuracy >= 70) {
            rank = 'C';
            rankColor = '#ffff00';
            rankGlow = '#ffff88';
            rankEmoji = '👍';
            rankTitle = 'GOOD EFFORT';
        } else if (accuracy >= 60) {
            rank = 'D';
            rankColor = '#ff8000';
            rankGlow = '#ffaa00';
            rankEmoji = '📚';
            rankTitle = 'KEEP STUDYING';
        } else if (accuracy >= 50) {
            rank = 'E';
            rankColor = '#ff4000';
            rankGlow = '#ff6600';
            rankEmoji = '⚠️';
            rankTitle = 'REVIEW REQUIRED';
        }

        // Create dynamic animated background
        this.createAnimatedBackground();
        
        // Create animated background overlay with particle effects
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2, 
            this.cameras.main.height / 2, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            0x000000, 
            0.85
        ).setOrigin(0.5).setDepth(1999);

        // Add fade-in animation to overlay
        overlay.setAlpha(0);
        this.tweens.add({
            targets: overlay,
            alpha: 0.85,
            duration: 500,
            ease: 'Power2'
        });

        // Enhanced dialog background with multiple layers
        const dialogWidth = 750 * scale;
        const dialogHeight = 700 * scale;
        const borderRadius = 30 * scale;
        const borderThickness = 6 * scale;
        
        // Outer glow layers (multiple for depth)
        for (let i = 3; i >= 1; i--) {
            const glowLayer = this.add.graphics();
            glowLayer.lineStyle(borderThickness * (i + 1), 0xF4CE14, 0.1 * i);
            glowLayer.strokeRoundedRect(
                this.cameras.main.width / 2 - dialogWidth / 2 - (borderThickness * i),
                this.cameras.main.height / 2 - dialogHeight / 2 - (borderThickness * i),
                dialogWidth + (borderThickness * i * 2),
                dialogHeight + (borderThickness * i * 2),
                borderRadius + (borderThickness * i)
            );
            glowLayer.setDepth(1998 + i);
            
            // Animate glow layers
            this.tweens.add({
                targets: glowLayer,
                alpha: { from: 0, to: 0.1 * i },
                scaleX: { from: 0.8, to: 1 },
                scaleY: { from: 0.8, to: 1 },
                duration: 600,
                delay: i * 100,
                ease: 'Back.easeOut'
            });
        }
        
        // Main dialog background with animated gradient
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1, 1, 1, 1);
        gradient.fillRoundedRect(
            this.cameras.main.width / 2 - dialogWidth / 2,
            this.cameras.main.height / 2 - dialogHeight / 2,
            dialogWidth,
            dialogHeight,
            borderRadius
        );
        gradient.setDepth(2000);
        
        // Main border with pulsing effect
        const dialogBg = this.add.graphics();
        dialogBg.setDepth(2001);
        
        const updateBorder = (intensity = 1) => {
            dialogBg.clear();
            dialogBg.lineStyle(borderThickness, 0xF4CE14, 0.8 + (intensity * 0.2));
            dialogBg.strokeRoundedRect(
                this.cameras.main.width / 2 - dialogWidth / 2,
                this.cameras.main.height / 2 - dialogHeight / 2,
                dialogWidth,
                dialogHeight,
                borderRadius
            );
            
            // Inner highlight
            dialogBg.lineStyle(2, 0xffffff, 0.3 + (intensity * 0.2));
            dialogBg.strokeRoundedRect(
                this.cameras.main.width / 2 - dialogWidth / 2 + 8,
                this.cameras.main.height / 2 - dialogHeight / 2 + 8,
                dialogWidth - 16,
                dialogHeight - 16,
                borderRadius - 8
            );
        };
        
        updateBorder();
        
        // Pulsing border animation
        this.tweens.add({
            targets: { intensity: 0 },
            intensity: 1,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: (tween, target) => {
                updateBorder(target.intensity);
            }
        });

        // Add scale-in animation for dialog
        gradient.setScale(0);
        dialogBg.setScale(0);
        this.tweens.add({
            targets: [gradient, dialogBg],
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            ease: 'Elastic.easeOut',
            delay: 200
        });

        // Enhanced title with multiple text effects
        const titleText = this.courseCompleted ? 
            '🎓 COURSE MASTERED!' : 
            '📊 SESSION COMPLETE';
        
        // Title shadow/glow effect
        const titleShadow = this.add.text(
            this.cameras.main.width / 2 + 3, 
            this.cameras.main.height / 2 - 280 * scale + 3,
            titleText, 
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(this.courseCompleted ? 32 : 36 * scale)}px`,
                color: '#000000',
                alpha: 0.5
            }
        ).setOrigin(0.5).setDepth(2002);
        
        const title = this.add.text(
            this.cameras.main.width / 2, 
            this.cameras.main.height / 2 - 280 * scale,
            titleText, 
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(this.courseCompleted ? 32 : 36 * scale)}px`,
                color: this.courseCompleted ? '#00ff88' : '#F4CE14',
                stroke: '#000',
                strokeThickness: 4,
                shadow: { offsetX: 0, offsetY: 0, color: this.courseCompleted ? '#00ff88' : '#F4CE14', blur: 15, fill: true }
            }
        ).setOrigin(0.5).setDepth(2003);

        // Add complex animation to title
        this.tweens.add({
            targets: [title, titleShadow],
            scaleX: { from: 0, to: 1.1 },
            scaleY: { from: 0, to: 1.1 },
            alpha: { from: 0, to: 1 },
            duration: 800,
            ease: 'Elastic.easeOut',
            delay: 400,
            onComplete: () => {
                // Continuous gentle pulse
                this.tweens.add({
                    targets: title,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 2500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // Course name with typewriter effect
        let courseName = null;
        if (this.courseCompleted) {
            courseName = this.add.text(
                this.cameras.main.width / 2, 
                this.cameras.main.height / 2 - 230 * scale,
                '', 
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: `${Math.round(22 * scale)}px`,
                    color: '#ffffff',
                    stroke: '#000',
                    strokeThickness: 2,
                    shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
                }
            ).setOrigin(0.5).setDepth(2003);
            
            // Typewriter effect
            const fullText = this.courseTopic.toUpperCase();
            let currentText = '';
            let charIndex = 0;
            
            this.time.addEvent({
                delay: 800,
                callback: () => {
                    this.time.addEvent({
                        delay: 50,
                        callback: () => {
                            if (charIndex < fullText.length) {
                                currentText += fullText[charIndex];
                                courseName.setText(currentText + '|');
                                charIndex++;
                            } else {
                                courseName.setText(fullText);
                            }
                        },
                        repeat: fullText.length
                    });
                }
            });
        }
        
        // Enhanced rank display with multiple effects
        this.createEnhancedRankDisplay(scale, rank, rankColor, rankGlow, rankEmoji, rankTitle, accuracy);
        
        // Enhanced statistics with better visual hierarchy
        this.createEnhancedStatistics(scale, accuracy);

        // Enhanced continue button with more polish
        this.createEnhancedContinueButton(scale);
        
        // Create celebration effects for high performance
        if (rank === 'S' || rank === 'A') {
            this.createCelebrationEffects(rank);
        }
        
        // Animate elements appearing with more sophisticated timing
        const elementsToAnimate = [title, titleShadow, courseName].filter(Boolean);
        elementsToAnimate.forEach((element, index) => {
            if (element === title || element === titleShadow) return; // Already animated
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: 1,
                scaleX: { from: 0.8, to: 1 },
                scaleY: { from: 0.8, to: 1 },
                duration: 400,
                ease: 'Back.easeOut',
                delay: 600 + (index * 200)
            });
        });
    }

    createAnimatedBackground() {
        // Create animated particle background
        for (let i = 0; i < 30; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, this.cameras.main.width),
                Phaser.Math.Between(0, this.cameras.main.height),
                Phaser.Math.Between(1, 3),
                0xF4CE14,
                0.1
            ).setDepth(1998);
            
            // Animate particles
            this.tweens.add({
                targets: particle,
                y: particle.y - this.cameras.main.height - 100,
                alpha: { from: 0, to: 0.3, to: 0 },
                duration: Phaser.Math.Between(8000, 15000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 5000)
            });
        }
    }

    createEnhancedRankDisplay(scale, rank, rankColor, rankGlow, rankEmoji, rankTitle, accuracy) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Rank container with multiple layers
        const rankContainer = this.add.container(centerX, centerY - 160 * scale).setDepth(2004);
        
        // Multiple glow circles for depth
        for (let i = 4; i >= 1; i--) {
            const glowCircle = this.add.graphics();
            glowCircle.fillStyle(parseInt(rankGlow.replace('#', '0x')), 0.05 * i);
            glowCircle.fillCircle(0, 0, (80 + i * 15) * scale);
            rankContainer.add(glowCircle);
            
            // Animate glow circles
            this.tweens.add({
                targets: glowCircle,
                scaleX: { from: 0.5, to: 1.2 },
                scaleY: { from: 0.5, to: 1.2 },
                alpha: { from: 0, to: 0.05 * i },
                duration: 1000 + (i * 200),
                ease: 'Power2.easeOut',
                delay: 1000 + (i * 100)
            });
        }
        
        // Main rank background with animated border
        const rankBg = this.add.graphics();
        const drawRankBg = (pulseIntensity = 0) => {
            rankBg.clear();
            rankBg.fillStyle(parseInt(rankColor.replace('#', '0x')), 0.15 + (pulseIntensity * 0.1));
            rankBg.fillCircle(0, 0, 70 * scale);
            rankBg.lineStyle(6 * scale, parseInt(rankColor.replace('#', '0x')), 0.8 + (pulseIntensity * 0.2));
            rankBg.strokeCircle(0, 0, 70 * scale);
            
            // Inner highlight ring
            rankBg.lineStyle(2 * scale, 0xffffff, 0.4 + (pulseIntensity * 0.3));
            rankBg.strokeCircle(0, 0, 60 * scale);
        };
        
        drawRankBg();
        rankContainer.add(rankBg);
        
        // Animate rank background pulse
        this.tweens.add({
            targets: { pulse: 0 },
            pulse: 1,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: (tween, target) => {
                drawRankBg(target.pulse);
            }
        });
        
        // Rank emoji background
        const emojiText = this.add.text(0, -10 * scale, rankEmoji, {
            fontSize: `${Math.round(28 * scale)}px`,
        }).setOrigin(0.5);
        rankContainer.add(emojiText);
        
        // Main rank text with multiple effects
        const rankText = this.add.text(0, 20 * scale, rank, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${Math.round(42 * scale)}px`,
            color: rankColor,
            stroke: '#000',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 0, color: rankGlow, blur: 20, fill: true }
        }).setOrigin(0.5);
        rankContainer.add(rankText);
        
        // Rank title
        const rankTitleText = this.add.text(0, 110 * scale, rankTitle, {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${Math.round(14 * scale)}px`,
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2,
            alpha: 0.9
        }).setOrigin(0.5);
        rankContainer.add(rankTitleText);
        
        // Accuracy percentage with animated counter
        const accuracyText = this.add.text(0, 130 * scale, '0%', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${Math.round(16 * scale)}px`,
            color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);
        rankContainer.add(accuracyText);
        
        // Animate accuracy counter
        this.tweens.add({
            targets: { value: 0 },
            value: accuracy,
            duration: 2000,
            ease: 'Power2.easeOut',
            delay: 1500,
            onUpdate: (tween, target) => {
                accuracyText.setText(`${Math.round(target.value)}%`);
            }
        });
        
        // Scale in animation for rank container
        rankContainer.setScale(0);
        this.tweens.add({
            targets: rankContainer,
            scaleX: 1,
            scaleY: 1,
            duration: 800,
            ease: 'Elastic.easeOut',
            delay: 1000
        });
        
        // Rotation animation for rank text
        this.tweens.add({
            targets: rankText,
            rotation: { from: -Math.PI, to: 0 },
            duration: 1000,
            ease: 'Back.easeOut',
            delay: 1200
        });
        
        return rankContainer;
    }

    createEnhancedStatistics(scale, accuracy) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        const statsY = centerY - 20 * scale;
        const lineHeight = 42 * scale;
        
        // Create colored stats with enhanced visuals
        const statsData = [
            { label: 'Correct Answers', value: this.correctAnswers, color: '#00ff88', icon: '🎯' },
            { label: 'Wrong Answers', value: this.wrongAnswers, color: '#ff4444', icon: '❌' },
            { label: 'Highest Streak', value: `${this.highestStreak}x`, color: '#ffaa00', icon: '⚡' },
            { label: 'Total Score', value: this.totalScore, color: '#00ddff', icon: '💎' },
            { label: 'Accuracy Rate', value: `${accuracy.toFixed(1)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444', icon: '📈' }
        ];
        
        const statsContainer = this.add.container(0, 0).setDepth(2003);
        
        statsData.forEach((stat, index) => {
            const yPos = statsY + (index * lineHeight);
            
            // Enhanced stat background with gradient and glow
            const statBg = this.add.graphics();
            statBg.fillGradientStyle(
                0x0a1628, 0x0a1628, 
                0x1a2642, 0x1a2642, 
                0.6, 0.6, 
                0.8, 0.8
            );
            statBg.fillRoundedRect(
                centerX - 320 * scale, 
                yPos - 18 * scale, 
                640 * scale, 
                36 * scale, 
                12 * scale
            );
            
            // Border with glow
            statBg.lineStyle(3 * scale, parseInt(stat.color.replace('#', '0x')), 0.6);
            statBg.strokeRoundedRect(
                centerX - 320 * scale, 
                yPos - 18 * scale, 
                640 * scale, 
                36 * scale, 
                12 * scale
            );
            
            // Inner highlight
            statBg.lineStyle(1, 0xffffff, 0.2);
            statBg.strokeRoundedRect(
                centerX - 315 * scale, 
                yPos - 13 * scale, 
                630 * scale, 
                26 * scale, 
                10 * scale
            );
            
            statsContainer.add(statBg);
            
            // Stat icon
            const statIcon = this.add.text(
                centerX - 290 * scale, 
                yPos, 
                stat.icon, {
                fontSize: `${Math.round(20 * scale)}px`,
            }).setOrigin(0, 0.5);
            statsContainer.add(statIcon);
            
            // Stat label with better typography
            const statLabel = this.add.text(
                centerX - 260 * scale, 
                yPos, 
                stat.label, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(16 * scale)}px`,
                color: '#ffffff',
                stroke: '#000',
                strokeThickness: 2
            }).setOrigin(0, 0.5);
            statsContainer.add(statLabel);
            
            // Stat value with enhanced styling
            const statValue = this.add.text(
                centerX + 300 * scale, 
                yPos, 
                stat.value, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(20 * scale)}px`,
                color: stat.color,
                stroke: '#000',
                strokeThickness: 2,
                shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
            }).setOrigin(1, 0.5);
            statsContainer.add(statValue);
            
            // Slide in animation for each stat
            const statElements = [statBg, statIcon, statLabel, statValue];
            statElements.forEach(element => {
                element.setAlpha(0);
                element.setX(element.x - 50 * scale);
            });
            
            this.tweens.add({
                targets: statElements,
                alpha: 1,
                x: `+=${50 * scale}`,
                duration: 500,
                ease: 'Back.easeOut',
                delay: 1800 + (index * 100)
            });
        });
        
        return statsContainer;
    }

    createEnhancedContinueButton(scale) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Enhanced button creation
        const createButton = (x, y, width, height, text, buttonType, callback) => {
            const cornerRadius = 20 * scale;
            const borderWidth = 3 * scale;
            
            // Color scheme for continue button
            const colors = {
                bg: [0x379777, 0x2d7a5f],
                bgHover: [0x4fb085, 0x379777],
                border: 0x5fd4a5,
                text: '#ffffff',
                textHover: '#F4CE14',
                icon: '🚀'
            };
            
            // Button container
            const buttonContainer = this.add.container(x, y).setDepth(2001);
            
            // Button background
            const btnBg = this.add.graphics();
            const drawButton = (bgColors, isHover = false) => {
                btnBg.clear();
                btnBg.fillGradientStyle(bgColors[0], bgColors[0], bgColors[1], bgColors[1], 1, 1, 1, 1);
                btnBg.fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
                btnBg.lineStyle(borderWidth, colors.border, isHover ? 1 : 0.8);
                btnBg.strokeRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
                
                if (isHover) {
                    btnBg.lineStyle(1, 0xffffff, 0.3);
                    btnBg.strokeRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, cornerRadius - 3);
                }
            };
            
            drawButton(colors.bg);
            buttonContainer.add(btnBg);

            // Button text
            const btnText = this.add.text(0, 0, `${colors.icon} ${text}`, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(18 * scale)}px`,
                color: colors.text,
                stroke: '#000',
                strokeThickness: 3,
                shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
            }).setOrigin(0.5);
            
            buttonContainer.add(btnText);
            buttonContainer.setInteractive(
                new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
                Phaser.Geom.Rectangle.Contains
            );
            buttonContainer.input.useHandCursor = true;

            // Hover effects
            buttonContainer.on('pointerover', () => {
                drawButton(colors.bgHover, true);
                btnText.setStyle({ color: colors.textHover });
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    ease: 'Power2'
                });
            });
            
            buttonContainer.on('pointerout', () => {
                drawButton(colors.bg);
                btnText.setStyle({ color: colors.text });
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Power2'
                });
            });
            
            buttonContainer.on('pointerdown', () => {
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 100,
                    ease: 'Power2'
                });
            });
            
            buttonContainer.on('pointerup', () => {
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100,
                    ease: 'Power2',
                    onComplete: () => callback()
                });
            });

            return buttonContainer;
        };

        // Create continue button
        this.continueButton = createButton(
            centerX,
            centerY + 250 * scale,
            260 * scale,
            55 * scale,
            'Continue',
            'confirm',
            () => this.handleContinue()
        );
        
        // Slide-in animation for button
        this.continueButton.setScale(0);
        this.continueButton.setAlpha(0);
        this.tweens.add({
            targets: this.continueButton,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 500,
            ease: 'Elastic.easeOut',
            delay: 2500
        });
    }

    createCelebrationEffects(rank) {
        // Create firework-like effects for S and A ranks
        const colors = rank === 'S' ? [0xffd700, 0xffff00, 0xffa500] : [0x00ff00, 0x88ff88, 0x44ff44];
        
        for (let i = 0; i < 20; i++) {
            this.time.delayedCall(i * 100, () => {
                const x = Phaser.Math.Between(100, this.cameras.main.width - 100);
                const y = Phaser.Math.Between(100, this.cameras.main.height - 100);
                
                // Create burst effect
                for (let j = 0; j < 8; j++) {
                    const particle = this.add.circle(x, y, 3, colors[j % colors.length]).setDepth(2005);
                    const angle = (Math.PI * 2 * j) / 8;
                    const distance = Phaser.Math.Between(50, 100);
                    
                    this.tweens.add({
                        targets: particle,
                        x: x + Math.cos(angle) * distance,
                        y: y + Math.sin(angle) * distance,
                        alpha: { from: 1, to: 0 },
                        scale: { from: 1, to: 0 },
                        duration: 1000,
                        ease: 'Power2.easeOut',
                        onComplete: () => particle.destroy()
                    });
                }
            });
        }
        
        // Screen flash effect for S rank
        if (rank === 'S') {
            const flash = this.add.rectangle(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                this.cameras.main.width,
                this.cameras.main.height,
                0xffd700,
                0.3
            ).setDepth(2006);
            
            this.tweens.add({
                targets: flash,
                alpha: { from: 0.3, to: 0 },
                duration: 500,
                repeat: 2,
                yoyo: true,
                onComplete: () => flash.destroy()
            });
        }
    }

    handleContinue() {
        // Add exit animation
        this.tweens.add({
            targets: this.children.list,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                // Resume the roguelike scene if it was paused
                const roguelikeScene = this.scene.get('roguelike');
                if (roguelikeScene && roguelikeScene.scene.isPaused()) {
                    roguelikeScene.scene.resume();
                    console.log('Roguelike scene resumed from ResultScreen');
                }
                this.scene.start('MainHub');
            }
        });
    }
}
