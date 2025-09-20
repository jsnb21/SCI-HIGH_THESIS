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
        
        // Get scale information for mobile responsiveness
    const scaleInfo = getScaleInfo(this);
    const isMobile = scaleInfo.width < 768;
    const aspect = scaleInfo.height / (scaleInfo.width || 1);
    const isTallMobile = isMobile && aspect > 1.95; // very tall devices (e.g., S Ultra)
        
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
        
    // Create main result panel with responsive dimensions for mobile
    // Wider on desktop, almost full width on tiny phones, but keep readable margins
    const tinyPhone = scaleInfo.width < 400;
    const panelWidth = isMobile ? (
        isTallMobile ? Math.min(scaleInfo.width * 0.96, 420) : Math.min(scaleInfo.width * 0.94, tinyPhone ? 360 : 405)
    ) : scaleDimension(560, scaleInfo);
    const basePanelHeight = isMobile ? (
        isTallMobile ? Math.min(scaleInfo.height * 0.92, 560) : Math.min(scaleInfo.height * 0.9, 540)
    ) : scaleDimension(480, scaleInfo);
    const panelHeight = basePanelHeight;
        const panelX = this.scale.width / 2;
        const panelY = this.scale.height / 2;
        
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
        
    let titleY = isMobile ? panelY - panelHeight * (isTallMobile ? 0.43 : 0.4) : panelY - panelHeight * 0.35;
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
    let rankY = isMobile ? panelY - panelHeight * (isTallMobile ? 0.29 : 0.26) : panelY - panelHeight * 0.22; // adjust for tall
    let rankSize = isMobile ? (tinyPhone ? 32 : (isTallMobile ? 40 : 38)) : 54;
        
        // Multi-layer rank background for depth
        const rankOuterGlow = this.add.circle(panelX, rankY, rankSize + 8, rankColor, 0.2);
        const rankBg = this.add.circle(panelX, rankY, rankSize, 0x2c3e50, 0.9);
        const rankBorder = this.add.circle(panelX, rankY, rankSize);
        rankBorder.setStrokeStyle(4, rankColor);
        const rankInnerGlow = this.add.circle(panelX, rankY, rankSize - 8, rankColor, 0.3);
        
        const rankText = this.add.text(panelX, rankY, rank, {
            fontFamily: 'Arial',
            fontSize: isMobile ? scaleFontSize(isTallMobile ? 50 : 44, scaleInfo) : '58px',
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
        
        // --- DYNAMIC LAYOUT (prevents overlap of stats & button) ---
        // Pre-compute button placement first so we know how much vertical space is left for stats
    let buttonY = panelY + panelHeight * (isTallMobile ? 0.46 : 0.44); // adjusted for tall screens
    const buttonHeight = isMobile ? scaleDimension(isTallMobile ? 58 : 54, scaleInfo) : 62;
    const buttonWidth = isMobile ? scaleDimension(tinyPhone ? 280 : (isTallMobile ? 340 : 330), scaleInfo) : 360;
    const buttonFontSize = isMobile ? scaleFontSize(tinyPhone ? 18 : (isTallMobile ? 21 : 20), scaleInfo) : 24;

        // Stats data
        const statsData = [
            { label: '✓ Correct Answers', value: this.correctAnswers, color: '#00ff88' },
            { label: '✗ Wrong Answers', value: this.wrongAnswers, color: '#ff4444' },
            { label: '🔥 Highest Streak', value: `${this.highestStreak}x`, color: '#ffaa00' },
            { label: '⭐ Total Score', value: this.totalScore, color: '#00ddff' },
            { label: '📊 Accuracy', value: `${accuracy.toFixed(1)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444' }
        ];

        // Define vertical region for stats between rank area and button
        const panelTop = panelY - panelHeight / 2;
        const panelBottom = panelY + panelHeight / 2;
        const rankBottomBuffer = isMobile ? scaleDimension(30, scaleInfo) : 40; // gap below rank
        const buttonTopBuffer = isMobile ? scaleDimension(35, scaleInfo) : 45;  // gap above button
        const statsAreaTop = rankY + rankSize + rankBottomBuffer;
    const statsAreaBottom = buttonY - buttonHeight / 2 - buttonTopBuffer;
        let statsAreaHeight = statsAreaBottom - statsAreaTop;

        // If area is too small (e.g. very small screen), reduce buttonY slightly within panel bounds
        if (statsAreaHeight < 120) {
            const adjust = 120 - statsAreaHeight;
            // move button down if there's space otherwise shrink spacing
            if (buttonY + buttonHeight / 2 + adjust <= panelBottom - 10) {
                // we can push button further down
                // NOTE: visual elements (button) created later will read updated buttonY via closure variables? we need new const -> use let for buttonY? Simpler: we cannot reassign const; create new variable
            }
        }

        // Compute line height ensuring it fits without overlap, with a max to keep design roomy
    const maxDesiredLineHeight = isMobile ? scaleDimension(isTallMobile ? 62 : 58, scaleInfo) : 60;
        let lineHeight = Math.min(maxDesiredLineHeight, statsAreaHeight / statsData.length);
        // Guarantee minimum readability
        const minLineHeight = isMobile ? scaleDimension(34, scaleInfo) : 36;
        lineHeight = Math.max(lineHeight, minLineHeight);

        // Recalculate stats area height based on chosen lineHeight so we can vertically center stats block
        const totalStatsBlockHeight = lineHeight * statsData.length;
        let statsStartY = statsAreaTop + (statsAreaHeight - totalStatsBlockHeight) / 2 + lineHeight / 2; // center within area

        // If centering would push past boundaries (due to min height), clamp
        if (statsStartY + totalStatsBlockHeight / 2 > statsAreaBottom) {
            statsStartY = statsAreaTop + lineHeight / 2; // top align
        }

        // Create a container to allow vertical scrolling on very small screens
        const statsContainer = this.add.container(0,0);
        const statRowElements = [];
        const effectiveWidth = panelWidth - 40;
        const statLabelFont = isMobile ? scaleFontSize(tinyPhone ? 15 : 17, scaleInfo) : '22px';
        const statValueFont = statLabelFont;
        statsData.forEach((stat, index) => {
            const yPos = statsStartY + index * lineHeight;
            const rectHeight = Math.min(lineHeight - 8, (isMobile ? 34 : 36));

            const statBg = this.add.rectangle(panelX, yPos, effectiveWidth, rectHeight, 0x0a1628, 0.7);
            statBg.setStrokeStyle(1, 0x2c3e50, 0.3);
            const statGlow = this.add.rectangle(panelX, yPos, effectiveWidth - 2, rectHeight - 2, stat.color, 0.08);

            // If width is small, stack label over value; else keep two-column layout
            const useStack = tinyPhone && effectiveWidth < 320;
            let labelText, valueText;
            if (useStack) {
                labelText = this.add.text(panelX, yPos - rectHeight * 0.25, stat.label, {
                    fontFamily: 'Arial',
                    fontSize: statLabelFont,
                    color: '#ffffff',
                    fontWeight: 'bold',
                    align: 'center'
                }).setOrigin(0.5, 0.5);
                valueText = this.add.text(panelX, yPos + rectHeight * 0.25, stat.value.toString(), {
                    fontFamily: 'Arial',
                    fontSize: statValueFont,
                    color: stat.color,
                    fontWeight: 'bold'
                }).setOrigin(0.5, 0.5);
            } else {
                const leftX = panelX - effectiveWidth * 0.46;
                const rightX = panelX + effectiveWidth * 0.46;
                labelText = this.add.text(leftX, yPos, stat.label, {
                    fontFamily: 'Arial',
                    fontSize: statLabelFont,
                    color: '#ffffff',
                    fontWeight: 'bold'
                }).setOrigin(0, 0.5);
                valueText = this.add.text(rightX, yPos, stat.value.toString(), {
                    fontFamily: 'Arial',
                    fontSize: statValueFont,
                    color: stat.color,
                    fontWeight: 'bold'
                }).setOrigin(1, 0.5);
            }
            statsContainer.add([statBg, statGlow, labelText, valueText]);
            statRowElements.push([statBg, statGlow, labelText, valueText]);
        });

        // If stats extend beyond usable area, apply a crop mask and enable wheel scroll
        const needsScroll = (statsStartY + lineHeight * statsData.length / 2) > statsAreaBottom;
        if (needsScroll) {
            const maskHeight = statsAreaBottom - statsAreaTop;
            const maskShape = this.add.rectangle(panelX, statsAreaTop + maskHeight / 2, panelWidth - 20, maskHeight, 0xffffff, 0.01);
            const geoMask = maskShape.createGeometryMask();
            statsContainer.setMask(geoMask);
            // Track scroll offset
            let scrollOffset = 0;
            const maxScroll = Math.max(0, (lineHeight * statsData.length) - maskHeight + 20);
            const updateScroll = () => {
                statsContainer.y = -scrollOffset;
            };
            this.input.on('wheel', (p, over, dx, dy) => {
                if (Math.abs(dy) > Math.abs(dx)) {
                    scrollOffset = Phaser.Math.Clamp(scrollOffset + dy * 0.5, 0, maxScroll);
                    updateScroll();
                }
            });
            // Touch drag for mobile
            let dragging = false; let lastY = 0;
            this.input.on('pointerdown', (pointer) => { dragging = true; lastY = pointer.y; });
            this.input.on('pointerup', () => { dragging = false; });
            this.input.on('pointermove', (pointer) => {
                if (dragging) {
                    const delta = pointer.y - lastY;
                    lastY = pointer.y;
                    scrollOffset = Phaser.Math.Clamp(scrollOffset - delta, 0, maxScroll);
                    updateScroll();
                }
            });
        }
        // --- END DYNAMIC LAYOUT ---

        // Enhanced button design positioned after stats (now guaranteed not to overlap)
        
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
            buttonBg, buttonGlow, buttonInner, buttonText,
            statsContainer
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
        
        // Animate stats with stagger (using stored row elements)
        this.time.delayedCall(800, () => {
            statRowElements.forEach((row, index) => {
                this.tweens.add({
                    targets: row,
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
