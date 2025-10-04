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
        
    }

    preload() {
        this.load.audio('bgm_results', 'assets/audio/bgm/bgm_results.mp3');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        super.create();
        
        // Calculate ranking based on correct/wrong ratio
        const totalQuestions = this.correctAnswers + this.wrongAnswers;
        const accuracy = totalQuestions > 0 ? (this.correctAnswers / totalQuestions) * 100 : 0;
        
        let rank = 'F';
        let rankColor = '#ff0000';
        // No separate glow color needed; glow effects removed
        if (accuracy >= 95) {
            rank = 'S';
            rankColor = '#ffd700';
        } else if (accuracy >= 90) {
            rank = 'A';
            rankColor = '#00ff00';
        } else if (accuracy >= 80) {
            rank = 'B';
            rankColor = '#00ffff';
        } else if (accuracy >= 70) {
            rank = 'C';
            rankColor = '#ffff00';
        } else if (accuracy >= 60) {
            rank = 'D';
            rankColor = '#ff8000';
        } else if (accuracy >= 50) {
            rank = 'E';
            rankColor = '#ff4000';
        }

        // Use QuizScene scaling system
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Mobile detection matching QuizScene
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 900 || scaleInfo.isMobile;
        const isSmallMobile = scaleInfo.width < 500;
        const aspect = this.scale.height / (this.scale.width || 1);
        const isTallMobile = (isMobile || scaleInfo.isPortrait) && aspect > 1.85;
        const TALL_MOBILE_FONT_REDUCE = 0.94;

        // Mobile sizing in GAME UNITS matching QuizScene
        const MOBILE_MAX_WIDTH_RATIO = 0.98;
        const MOBILE_MAX_HEIGHT_RATIO = 0.9;

        // Content width spanning full screen like QuizScene questions
        let contentWidth = isMobile ? this.scale.width * 0.98 : this.scale.width * 0.95;
        if (isTallMobile) {
            contentWidth = this.scale.width * 0.95;
        }

        // Calculate content dimensions
        let titleFontPx = isMobile ? 52 : 42;
        let statFontPx = isMobile ? 32 : 28;
        let rankFontPx = isMobile ? 120 : 150;
        
        if (isTallMobile) {
            titleFontPx = Math.round(titleFontPx * TALL_MOBILE_FONT_REDUCE);
            statFontPx = Math.round(statFontPx * TALL_MOBILE_FONT_REDUCE);
            rankFontPx = Math.round(rankFontPx * TALL_MOBILE_FONT_REDUCE);
        }

        // Layout dimensions - fix broken layout
        const titleHeight = isMobile ? 80 : 100;
        const statRowHeight = isMobile ? 45 : 50;
        const statGap = isMobile ? 25 : 30;
        const rankSize = isMobile ? 100 : 140;
        
        const contentHeight = titleHeight + (5 * statRowHeight) + (4 * statGap) + 200; // Extra padding for button

        // Create main container matching QuizScene
        this.resultContainer = this.add.container(centerX, centerY);
        
        // Determine scaling like QuizScene for full-width layout
        let targetScale = 1;
        if (isMobile) {
            const maxHeight = this.scale.height * MOBILE_MAX_HEIGHT_RATIO;
            if (contentHeight > maxHeight) {
                targetScale = Math.min(targetScale, maxHeight / contentHeight);
            }
            // No width constraint since we want full width
            const MIN_MOBILE_SCALE = 0.7; // Allow smaller scale for full-width
            targetScale = Math.max(targetScale, MIN_MOBILE_SCALE);
        }
        if (isTallMobile) {
            targetScale *= 0.9;
        }

        // Create background like QuizScene - navy blue rectangle with 80% opacity
        const resultBox = this.add.graphics();
        resultBox.fillStyle(0x1a237e, 0.8); // Navy blue color
        resultBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 8);
        this.resultContainer.add(resultBox);

        // Apply scaling to container
        this.resultContainer.setScale(targetScale);
        
        // Create stats data for left side
        const statsData = [
            { label: 'Correct Answers', value: this.correctAnswers, color: '#00ff88', icon: '✓' },
            { label: 'Wrong Answers', value: this.wrongAnswers, color: '#ff4444', icon: '✗' },
            { label: 'Highest Streak', value: `x${this.highestStreak}`, color: '#ffaa00', icon: '🔥' },
            { label: 'Accuracy', value: `${accuracy.toFixed(0)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444', icon: '🎯' },
            { label: 'TOTAL SCORE', value: this.totalScore, color: '#ffd700', icon: '' }
        ];

        // Layout positions - adjusted for full-width container
        const leftSideX = -contentWidth * 0.3; // Stats positioned on left side
        const rightSideX = contentWidth * 0.3; // Rank positioned on right side  
        const statsStartY = -contentHeight/2 + titleHeight + 40; // Proper spacing after title

        // Create title (no glow)
        const titleText = 'RESULTS';
        const title = this.add.text(0, -contentHeight/2 + titleHeight/2, titleText, {
            fontFamily: 'Arial',
            fontSize: `${titleFontPx}px`,
            fontWeight: '900',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: 0, fill: false }
        }).setOrigin(0.5);
        this.resultContainer.add([title]);

        // Store elements for animation
        this.statElements = [];
        this.rankElements = [];

        // Create stats on left side with fixed positioning
        statsData.forEach((stat, index) => {
            const yPos = statsStartY + (index * (statRowHeight + statGap));
            
            // Icon positioned (no glow)
            const iconText = this.add.text(leftSideX - 50, yPos, stat.icon, {
                fontFamily: 'Arial',
                fontSize: `${statFontPx}px`,
                fontWeight: 'bold',
                color: stat.color
            }).setOrigin(0, 0.5);

            // Label text positioned next to icon with enhanced styling
            const labelText = this.add.text(leftSideX - 10, yPos, stat.label, {
                fontFamily: 'Arial',
                fontSize: `${statFontPx}px`,
                fontWeight: '800',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 4,
                    fill: true
                }
            }).setOrigin(0, 0.5);

            // Value positioned far right (no glow)
            const valueText = this.add.text(leftSideX + 420, yPos, stat.value.toString(), {
                fontFamily: 'Arial',
                fontSize: `${statFontPx}px`,
                fontWeight: '900',
                color: stat.color,
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(1, 0.5);

            // Special styling for TOTAL SCORE with dramatic effects
            if (stat.label === 'TOTAL SCORE') {
                labelText.x = leftSideX - 10; // Keep same alignment as other labels
                valueText.x = leftSideX + 420; // Keep same alignment as other values
                labelText.setFontSize(`${Math.floor(statFontPx * 1.2)}px`);
                labelText.setStyle({ fontWeight: '900', color: '#ffd700', stroke: '#ff8800', strokeThickness: 3 });
                valueText.setFontSize(`${Math.floor(statFontPx * 1.4)}px`);
                valueText.setStyle({ fontWeight: '900', color: '#ffd700', stroke: '#ff8800', strokeThickness: 3 });
            }

            this.resultContainer.add([iconText, labelText, valueText]);
            this.statElements.push({ icon: iconText, label: labelText, value: valueText });
        });

    // Create rank on right side (no glow layers)
        const rankCenterY = statsStartY + (2 * (statRowHeight + statGap)); // Center with middle stat (Highest Streak)

    // Removed filled background circles behind rank letter (no bg circles)
        
    // Borders removed (no outer/inner stroke circles)

        // Rank text (no glow)
        const rankText = this.add.text(rightSideX, rankCenterY, rank, {
            fontFamily: 'Arial',
            fontSize: `${rankFontPx}px`,
            fontWeight: '900',
            color: rankColor,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
    this.rankText = rankText;

        // "RANK" label (no glow)
        const rankLabel = this.add.text(rightSideX, rankCenterY - rankSize/2 - 40, 'RANK', {
            fontFamily: 'Arial',
            fontSize: `${Math.floor(statFontPx * 1.2)}px`,
            fontWeight: '800',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
    this.rankLabel = rankLabel;

    this.resultContainer.add([rankText, rankLabel]);
    this.rankElements = [rankText, rankLabel];

        // Create back button - position it at the bottom with proper spacing
        const buttonY = contentHeight/2 - 60; // Proper bottom positioning
        const buttonWidth = isMobile ? 280 : 360;
        const buttonHeight = isMobile ? 50 : 60;
        
        const buttonBg = this.add.rectangle(0, buttonY, buttonWidth, buttonHeight, 0x2c3e50);
        buttonBg.setStrokeStyle(3, 0x4a90e2);
        const buttonText = this.add.text(0, buttonY, 'Back to Computer Lab', {
            fontFamily: 'Arial',
            fontSize: isMobile ? '24px' : '28px',
            fontWeight: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.resultContainer.add([buttonBg, buttonText]);

        // Make button interactive
        buttonBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                buttonBg.setFillStyle(0x4a90e2);
                buttonText.setScale(1.05);
            })
            .on('pointerout', () => {
                buttonBg.setFillStyle(0x2c3e50);
                buttonText.setScale(1);
            })
            .on('pointerdown', () => {
                buttonBg.setScale(0.95);
                buttonText.setScale(0.95);
                this.time.delayedCall(140, () => this.scene.start('ComputerLab'));
            });

        // Initialize all elements as invisible for animation
        this.statElements.forEach(stat => {
            stat.icon.setAlpha(0).setScale(0.8);
            stat.label.setAlpha(0).setScale(0.8);
            stat.value.setAlpha(0).setScale(0.8);
        });

        this.rankElements.forEach(element => {
            element.setAlpha(0).setScale(0.8);
        });

    title.setAlpha(0).setScale(0.8);
        buttonBg.setAlpha(0).setScale(0.8);
        buttonText.setAlpha(0).setScale(0.8);

        // Start sequential animations
        this.createSequentialAnimations();
    }

    createSequentialAnimations() {
        const animationDelay = 300; // Delay between each stat animation

        // 1. Title appears first (no glow)
        this.tweens.add({
            targets: [this.resultContainer.list[1]], // title only
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.out'
        });

        // 2. Stats appear sequentially (Correct -> Wrong -> Streak -> Accuracy -> Score)
        this.statElements.forEach((stat, index) => {
            const delay = 500 + (index * animationDelay);
            
            // Pop-up animation for each stat
            this.tweens.add({
                targets: [stat.icon, stat.label, stat.value],
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 400,
                delay: delay,
                ease: 'Back.out',
                onComplete: () => {
                    // Add a little bounce effect
                    this.tweens.add({
                        targets: [stat.icon, stat.label, stat.value],
                        scaleX: 1.1,
                        scaleY: 1.1,
                        duration: 200,
                        yoyo: true,
                        ease: 'Power2.out'
                    });
                }
            });
        });

        // 3. Rank appears last with subtle effects (no glow)
        const rankDelay = 500 + (this.statElements.length * animationDelay) + 200;
        
        this.tweens.add({
            targets: this.rankElements,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            delay: rankDelay,
            ease: 'Back.out',
            onComplete: () => {
                // Start subtle pulse animation for rank elements
                this.createRankGlowAnimation();
                
                // Create particle effect for high ranks
                const rt = this.rankText;
                const r = rt.text;
                if (r === 'S' || r === 'A') {
                    this.createParticleEffects(rt.x, rt.y, rt.style.color);
                }
            }
        });

        // 4. Button appears at the end
        this.time.delayedCall(rankDelay + 800, () => {
            const buttonElements = this.resultContainer.list.slice(-2); // Last 2 elements are button
            this.tweens.add({
                targets: buttonElements,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 400,
                ease: 'Back.out'
            });
        });
    }

    createRankGlowAnimation() {
        // Subtle, non-glow animations for rank elements
        if (this.rankText) {
            this.tweens.add({
                targets: this.rankText,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 1800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        // Borders removed; no border pulse
        if (this.rankLabel) {
            this.tweens.add({
                targets: this.rankLabel,
                alpha: 0.95,
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createParticleEffects(x, y, color) {
        // Convert world coordinates to screen coordinates since particles are added to scene, not container
        const worldX = this.resultContainer.x + x;
        const worldY = this.resultContainer.y + y;
        
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(worldX, worldY, 3, parseInt(color.replace('#', '0x')));
            particle.setAlpha(0.9);
            const angle = (Math.PI * 2 * i) / 20;
            const distance = 80 + Math.random() * 60;
            
            this.tweens.add({
                targets: particle,
                x: worldX + Math.cos(angle) * distance,
                y: worldY + Math.sin(angle) * distance,
                alpha: 0,
                scaleX: 0.3,
                scaleY: 0.3,
                duration: 1500 + Math.random() * 1000,
                ease: 'Power2.out',
                onComplete: () => particle.destroy()
            });
        }
    }
}
