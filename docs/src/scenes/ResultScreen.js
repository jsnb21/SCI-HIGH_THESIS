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
        
    }

    create() {
        super.create();

        // Safety: remove any lingering desktop gameplay HUD overlay if it exists
        if (typeof document !== 'undefined') {
            const domHud = document.getElementById('desktop-game-hud');
            if (domHud) domHud.remove();
        }
        
        // Build layout initially and on resize
        this.buildResultLayout();
        this.scale.on('resize', () => {
            // Clear existing children and rebuild
            this.children.removeAll(true);
            this.buildResultLayout();
        });
    }

    buildResultLayout() {
        // Get sizing info
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 768;
        const isSmallMobile = scaleInfo.width < 480;
        const isWideDesktop = scaleInfo.width >= 1100;
    
        
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
        
    // Background gradient
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(0x000000, 0x000000, 0x0f141f, 0x121a29, 1);
    gradient.fillRect(0, 0, this.scale.width, this.scale.height);
        
    // Responsive panel sizing with dynamic height
    const panelWidth = isMobile ? Math.min(scaleInfo.width * 0.9, 360) : (isWideDesktop ? Math.min(scaleInfo.width * 0.75, 1000) : 780);
    const basePanelHeight = isMobile ? Math.min(scaleInfo.height * 0.75, 420) : (isWideDesktop ? 560 : 600);
    let panelHeight = basePanelHeight;
        const panelX = this.scale.width / 2;
        const panelY = this.scale.height / 2;
        
        // Panel shadow
        const shadow = this.add.rectangle(panelX + 5, panelY + 5, panelWidth, panelHeight, 0x000000, 0.5);
        shadow.setStrokeStyle(2, 0x333333);
        
        // Main panel - normal styling for desktop
        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x16213e);
        panel.setStrokeStyle(3, 0x0f4c75);
        
        // Panel glow effect
        const panelGlow = this.add.rectangle(panelX, panelY, panelWidth + 10, panelHeight + 10, 0x0f4c75, 0.3);
        
        // Title text with proper desktop spacing
        const titleText = this.courseCompleted ? 
            `COURSE COMPLETED!` : 
            'SESSION ENDED';
        
    const titleFontSize = isMobile ? (isSmallMobile ? '26px' : '32px') : (this.courseCompleted ? '50px' : '48px');
        const titleY = panelY - (panelHeight * 0.35);
        
        const title = this.add.text(panelX, titleY, titleText, {
            fontFamily: 'Arial',
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: this.courseCompleted ? '#00ff88' : '#ff6600',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 5,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Course name if completed - better desktop sizing
        if (this.courseCompleted) {
            const courseNameFontSize = isMobile ? '16px' : '32px';
            const courseNameY = titleY + (isMobile ? 30 : 50);
            
            const courseName = this.add.text(panelX, courseNameY, this.courseTopic.toUpperCase(), {
                fontFamily: 'Arial',
                fontSize: courseNameFontSize,
                fontWeight: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0.5);
        }
        
        // Rank display with better desktop sizing
    const rankRadius = isMobile ? (isSmallMobile ? 32 : 40) : (isWideDesktop ? 78 : 68);
    const rankFontSize = isMobile ? (isSmallMobile ? '34px' : '40px') : (isWideDesktop ? '80px' : '72px');
    const rankY = panelY - (panelHeight * 0.08);
        
        const rankBg = this.add.circle(panelX, rankY, rankRadius, rankColor, 0.2);
        const rankBorder = this.add.circle(panelX, rankY, rankRadius);
        rankBorder.setStrokeStyle(isMobile ? 3 : 6, rankColor);
        
        const rankText = this.add.text(panelX, rankY, rank, {
            fontFamily: 'Arial',
            fontSize: rankFontSize,
            fontWeight: 'bold',
            color: rankColor,
            stroke: '#000000',
            strokeThickness: isMobile ? 2 : 6,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: rankGlow,
                blur: isMobile ? 8 : 20,
                fill: true
            }
        }).setOrigin(0.5);
        
    // Stats layout configuration
    // Stats start just below the rank circle so button always sits beneath stats
    const statsTopY = rankY + rankRadius + (isMobile ? (isSmallMobile ? 16 : 28) : 40); // added extra padding below rank
    const statsFontSize = isMobile ? (isSmallMobile ? '14px' : '16px') : (isWideDesktop ? '24px' : '22px');
    const lineHeight = isMobile ? (isSmallMobile ? 24 : 28) : 40; // retained for potential future use
        
        // Create colored stats with icons
        const statsData = [
            { label: '✓ Correct', value: this.correctAnswers, color: '#00ff88' },
            { label: '✗ Wrong', value: this.wrongAnswers, color: '#ff4444' },
            { label: '🔥 Streak', value: `${this.highestStreak}x`, color: '#ffaa00' },
            { label: '⭐ Score', value: this.totalScore, color: '#00ddff' },
            { label: '📊 Accuracy', value: `${accuracy.toFixed(1)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444' }
        ];
        // Decide columns
        const columns = (isMobile || !isWideDesktop) ? 1 : 2;
        const colGap = 40;
        const colWidth = (panelWidth - (isMobile ? 40 : (columns === 2 ? 120 : 80)) - (columns === 2 ? colGap : 0)) / columns;
        const statBgHeight = isMobile ? 26 : 34;
        const statVerticalStart = statsTopY;
        const statsElements = []; // collect for staggered animation
        let maxStatBottom = statsTopY; // track actual bottom

        statsData.forEach((stat, idx) => {
            const targetCol = columns === 1 ? 0 : (idx % columns);
            const rowIndex = columns === 1 ? idx : Math.floor(idx / columns);
            const xBase = panelX - (panelWidth / 2) + (columns === 1 ? 20 : 60) + targetCol * (colWidth + colGap);
            const y = statVerticalStart + rowIndex * (statBgHeight + (isMobile ? 8 : 14));

            const bg = this.add.rectangle(xBase + colWidth / 2, y, colWidth, statBgHeight, 0x0a1628, 0.55);
            bg.setStrokeStyle(1, 0x17324d, 0.9);
            bg.setOrigin(0.5, 0);

            const label = this.add.text(xBase + 8, y + statBgHeight / 2, stat.label, {
                fontFamily: 'Arial',
                fontSize: statsFontSize,
                color: '#ffffff',
                fontWeight: 'bold'
            }).setOrigin(0, 0.5);

            const value = this.add.text(xBase + colWidth - 8, y + statBgHeight / 2, stat.value.toString(), {
                fontFamily: 'Arial',
                fontSize: statsFontSize,
                color: stat.color,
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(1, 0.5);

            statsElements.push(bg, label, value);
            maxStatBottom = Math.max(maxStatBottom, y + statBgHeight);
        });
        
        // Enhanced button design with better desktop sizing
        // Compute button placement after stats (dynamic)
    const lastStatBottom = maxStatBottom;
    const buttonSpacing = isMobile ? 40 : 70; // increased spacing to push button lower
    let buttonY = lastStatBottom + buttonSpacing;
    const minGap = isMobile ? 14 : 20; // required gap between last stat bottom and button top
        const buttonWidth = isMobile ? Math.min(panelWidth * 0.8, 260) : (isWideDesktop ? 420 : 360);
        const buttonHeight = isMobile ? 48 : (isWideDesktop ? 74 : 68);
        const buttonFontSize = isMobile ? (isSmallMobile ? '15px' : '18px') : (isWideDesktop ? '30px' : '26px');
        
        // If overlap would occur (button top too close), push button further down
        if ((buttonY - buttonHeight / 2) < (lastStatBottom + minGap)) {
            buttonY = lastStatBottom + minGap + buttonHeight / 2;
        }

        const buttonBg = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x0f4c75);
        buttonBg.setStrokeStyle(isMobile ? 2 : 3, 0x3282b8);
        
        const buttonGlow = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x3282b8, 0.3);
        
        const buttonText = this.add.text(panelX, buttonY, 'Back to Computer Lab', {
            fontFamily: 'Arial',
            fontSize: buttonFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: isMobile ? 2 : 4,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Enhanced button interactions with proper mobile touch targets
        const interactiveArea = this.add.rectangle(panelX, buttonY, 
            isMobile ? Math.max(buttonWidth, 55) : buttonWidth, 
            isMobile ? Math.max(buttonHeight, 55) : buttonHeight, 
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
                    // Ensure HUD is gone before leaving
                    if (typeof document !== 'undefined') {
                        const domHud = document.getElementById('desktop-game-hud');
                        if (domHud) domHud.remove();
                    }
                    this.scene.start('ComputerLab');
                });
            });
        
        // Auto-extend panel height if content exceeds current panel bottom
    const contentBottom = buttonY + buttonHeight / 2 + (isMobile ? 36 : 48); // extra breathing room at bottom
        const panelTop = panelY - panelHeight / 2;
        let requiredPanelHeight = contentBottom - panelTop;
        if (requiredPanelHeight > panelHeight) {
            panelHeight = requiredPanelHeight;
            // Update rectangle sizes
            panel.setSize(panelWidth, panelHeight);
            panel.setDisplaySize(panelWidth, panelHeight);
            shadow.setSize(panelWidth, panelHeight);
            shadow.setDisplaySize(panelWidth, panelHeight);
            panelGlow.setSize(panelWidth + 10, panelHeight + 10);
            panelGlow.setDisplaySize(panelWidth + 10, panelHeight + 10);
            // Keep centers consistent (we only extended downward so top stays same)
        }

        // Create a container for all elements - no aggressive scaling
    const resultContainer = this.add.container(0, 0);
    // Insert stats elements before button so button naturally sits after them visually
    resultContainer.add([gradient, panelGlow, panel, shadow, title, rankBg, rankBorder, rankText, ...statsElements, buttonBg, buttonGlow, buttonText, interactiveArea]);
    console.log('[ResultScreen] Layout v2 applied: rankY', rankY, 'statsTopY', statsTopY, 'lastStatBottom', lastStatBottom, 'buttonY', buttonY);
        
        // Add course name to container if it exists
        if (this.courseCompleted) {
            // Re-create course name with proper desktop sizing
            const courseNameFontSize = isMobile ? '16px' : '32px';
            const courseNameY = titleY + (isMobile ? 30 : 50);
            
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
        
        // Animate stats with stagger (fade + slight upward motion)
        statsElements.forEach(el => el.setAlpha(0).setY(el.y + 20));
        statsElements.forEach((el, i) => {
            this.tweens.add({
                targets: el,
                alpha: 1,
                y: el.y - 20,
                duration: 300,
                delay: 700 + i * 60,
                ease: 'Power2.out'
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
