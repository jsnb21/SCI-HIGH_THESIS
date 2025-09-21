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
        
    // Title Y: desktop a bit higher now to allow distinct rank gap
    let titleY = isMobile ? panelY - panelHeight * (isTallMobile ? 0.43 : 0.4) : panelY - panelHeight * 0.38;
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
        // Rank positioned dynamically BELOW title so they never overlap on desktop
    let rankSize = isMobile ? (tinyPhone ? 32 : (isTallMobile ? 40 : 38)) : 56;
    // Larger explicit gaps so rank never touches title: desktop > mobile
    const desktopTitleRankGap = isMobile ? 0 : 40; // increased from 12 -> 40
    const mobileTitleRankGap = isMobile ? (isTallMobile ? 14 : 10) : 0; // slight increase mobile
    const computedTitleBottom = title.y + title.height / 2;
    // Center of rank circle: titleBottom + gap + radius
    let rankY = isMobile
        ? (computedTitleBottom + mobileTitleRankGap + rankSize * 0.5)
        : (computedTitleBottom + desktopTitleRankGap + rankSize * 0.5);
        
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
        
        // --- RESPONSIVE LAYOUT REFACTOR ---
        // We now split logic: desktop keeps spacious fixed layout; mobile gets a dedicated scroll container

        let buttonBg, buttonGlow, buttonInner, buttonText, statsContainer; // unify naming for later animations

        const statsData = [
            { label: '✓ Correct Answers', value: this.correctAnswers, color: '#00ff88' },
            { label: '✗ Wrong Answers', value: this.wrongAnswers, color: '#ff4444' },
            { label: '🔥 Highest Streak', value: `${this.highestStreak}x`, color: '#ffaa00' },
            { label: '⭐ Total Score', value: this.totalScore, color: '#00ddff' },
            { label: '📊 Accuracy', value: `${accuracy.toFixed(1)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444' }
        ];

        if (isMobile) {
            // -------- MOBILE LAYOUT --------
            // Goal: Button always AFTER stats; entire stats+button column scrolls if overflow.
            const verticalPaddingTop = scaleDimension(18, scaleInfo); // padding inside panel before first stat
            const areaTop = rankY + rankSize + scaleDimension(20, scaleInfo); // start below rank
            const areaBottom = panelY + panelHeight / 2 - scaleDimension(14, scaleInfo); // leave small bottom padding
            const scrollAreaHeight = areaBottom - areaTop;
            const contentMaxWidth = panelWidth - scaleDimension(36, scaleInfo);

            statsContainer = this.add.container(0, 0);

            // Build stat rows stacked vertically (simpler for narrow screens)
            const rowGap = scaleDimension(isTallMobile ? 10 : 8, scaleInfo);
            let cursorY = areaTop + verticalPaddingTop;
            const statLabelFont = scaleFontSize(tinyPhone ? 15 : 16 + (isTallMobile ? 1 : 0), scaleInfo);

            statsData.forEach(stat => {
                const rowHeight = scaleDimension(40, scaleInfo);
                const rect = this.add.rectangle(panelX, cursorY + rowHeight / 2, contentMaxWidth, rowHeight, 0x0a1628, 0.75)
                    .setStrokeStyle(1, 0x2c3e50, 0.4);
                const glow = this.add.rectangle(panelX, cursorY + rowHeight / 2, contentMaxWidth - 4, rowHeight - 4, stat.color, 0.08);
                const label = this.add.text(panelX - contentMaxWidth / 2 + scaleDimension(10, scaleInfo), cursorY + rowHeight / 2, stat.label, {
                    fontFamily: 'Arial',
                    fontSize: statLabelFont,
                    color: '#ffffff',
                    fontWeight: 'bold'
                }).setOrigin(0, 0.5);
                const value = this.add.text(panelX + contentMaxWidth / 2 - scaleDimension(10, scaleInfo), cursorY + rowHeight / 2, stat.value.toString(), {
                    fontFamily: 'Arial',
                    fontSize: statLabelFont,
                    color: stat.color,
                    fontWeight: 'bold'
                }).setOrigin(1, 0.5);
                statsContainer.add([rect, glow, label, value]);
                cursorY += rowHeight + rowGap;
            });

            // Button (smaller, proportionate) inserted AFTER stats
            const buttonWidth = Math.min(contentMaxWidth, scaleDimension(tinyPhone ? 240 : 300, scaleInfo));
            const buttonHeight = scaleDimension(48, scaleInfo);
            const buttonY = cursorY + scaleDimension(6, scaleInfo) + buttonHeight / 2;
            buttonBg = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x2c3e50);
            buttonBg.setStrokeStyle(scaleDimension(2, scaleInfo), 0x4a90e2);
            buttonGlow = this.add.rectangle(panelX, buttonY, buttonWidth + 6, buttonHeight + 6, 0x4a90e2, 0.35);
            buttonInner = this.add.rectangle(panelX, buttonY, buttonWidth - 10, buttonHeight - 10, 0x34495e, 0.85);
            buttonText = this.add.text(panelX, buttonY, 'Back to Computer Lab', {
                fontFamily: 'Arial',
                fontSize: `${scaleFontSize(tinyPhone ? 16 : 18, scaleInfo)}px`,
                fontWeight: 'bold',
                color: '#ffffff'
            }).setOrigin(0.5);
            statsContainer.add([buttonGlow, buttonBg, buttonInner, buttonText]);

            // Apply mask for scrolling if content exceeds area
            const totalContentHeight = buttonY + buttonHeight / 2 - areaTop + verticalPaddingTop;
            const needsScroll = totalContentHeight > scrollAreaHeight;
            const maskRect = this.add.rectangle(panelX, areaTop + scrollAreaHeight / 2, panelWidth - 20, scrollAreaHeight, 0xffffff, 0.01);
            const geoMask = maskRect.createGeometryMask();
            statsContainer.setMask(geoMask);

            if (needsScroll) {
                let scrollOffset = 0;
                const maxScroll = totalContentHeight - scrollAreaHeight;
                const applyScroll = () => { statsContainer.y = -scrollOffset; };
                // wheel
                this.input.on('wheel', (_, __, dx, dy) => {
                    if (Math.abs(dy) >= Math.abs(dx)) {
                        scrollOffset = Phaser.Math.Clamp(scrollOffset + dy * 0.4, 0, maxScroll);
                        applyScroll();
                    }
                });
                // drag
                let dragging = false; let lastY = 0; let velocity = 0; let lastTime = 0;
                this.input.on('pointerdown', (p) => { dragging = true; lastY = p.y; velocity = 0; lastTime = p.time; });
                this.input.on('pointerup', () => { dragging = false; });
                this.input.on('pointermove', (p) => {
                    if (!dragging) return;
                    const dy = p.y - lastY; const dt = (p.time - lastTime) || 16;
                    lastY = p.y; lastTime = p.time; velocity = -dy / dt * 16; // approximate px/frame
                    scrollOffset = Phaser.Math.Clamp(scrollOffset - dy, 0, maxScroll);
                    applyScroll();
                });
                // Simple inertial easing
                this.time.addEvent({
                    delay: 16,
                    loop: true,
                    callback: () => {
                        if (dragging) return;
                        if (Math.abs(velocity) < 0.1) return;
                        scrollOffset = Phaser.Math.Clamp(scrollOffset + velocity, 0, maxScroll);
                        velocity *= 0.92; // friction
                        applyScroll();
                    }
                });
            }

            // Button interactions (mobile friendly)
            buttonBg.setInteractive({ useHandCursor: true })
                .on('pointerover', () => { buttonBg.setFillStyle(0x4a90e2); buttonInner.setFillStyle(0x5dade2); buttonGlow.setAlpha(0.55); })
                .on('pointerout', () => { buttonBg.setFillStyle(0x2c3e50); buttonInner.setFillStyle(0x34495e); buttonGlow.setAlpha(0.35); })
                .on('pointerdown', () => {
                    buttonBg.setScale(0.95); buttonInner.setScale(0.95); buttonText.setScale(0.95);
                    this.time.delayedCall(140, () => { this.scene.start('ComputerLab'); });
                });

        } else {
            // -------- DESKTOP LAYOUT (retain previous visual style) --------
            const buttonHeight = 62;
            const buttonWidth = 360;
            const buttonFontSize = 24;
            const bottomMargin = 28;
            const buttonY = panelY + panelHeight / 2 - bottomMargin - buttonHeight / 2;
            const rankBottomBuffer = 40;
            const buttonTopBuffer = 45;
            let statsAreaTop = rankY + rankSize + rankBottomBuffer;
            let statsAreaBottom = buttonY - buttonHeight / 2 - buttonTopBuffer;
            const statsAreaHeight = statsAreaBottom - statsAreaTop;
            const lineHeight = 48; // fixed for desktop
            statsContainer = this.add.container(0,0);
            const effectiveWidth = panelWidth - 40;
            const statLabelFont = '22px';
            statsData.forEach((stat, index) => {
                const yPos = statsAreaTop + lineHeight/2 + index * (lineHeight + 6);
                const statBg = this.add.rectangle(panelX, yPos, effectiveWidth, 36, 0x0a1628, 0.7).setStrokeStyle(1, 0x2c3e50, 0.3);
                const statGlow = this.add.rectangle(panelX, yPos, effectiveWidth - 2, 34, stat.color, 0.08);
                const leftX = panelX - effectiveWidth * 0.46;
                const rightX = panelX + effectiveWidth * 0.46;
                const labelText = this.add.text(leftX, yPos, stat.label, { fontFamily: 'Arial', fontSize: statLabelFont, color: '#ffffff', fontWeight: 'bold'}).setOrigin(0,0.5);
                const valueText = this.add.text(rightX, yPos, stat.value.toString(), { fontFamily: 'Arial', fontSize: statLabelFont, color: stat.color, fontWeight: 'bold'}).setOrigin(1,0.5);
                statsContainer.add([statBg, statGlow, labelText, valueText]);
            });

            buttonBg = this.add.rectangle(panelX, buttonY, buttonWidth, buttonHeight, 0x2c3e50).setStrokeStyle(3, 0x4a90e2);
            buttonGlow = this.add.rectangle(panelX, buttonY, buttonWidth + 4, buttonHeight + 4, 0x4a90e2, 0.4);
            buttonInner = this.add.rectangle(panelX, buttonY, buttonWidth - 8, buttonHeight - 8, 0x34495e, 0.8);
            buttonText = this.add.text(panelX, buttonY, 'Back to Computer Lab', {
                fontFamily: 'Arial', fontSize: `${buttonFontSize}px`, fontWeight: 'bold', color: '#ffffff', shadow: { offsetX:2, offsetY:2, color:'#000', blur:4, fill:true }
            }).setOrigin(0.5);

            buttonBg.setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    buttonBg.setFillStyle(0x4a90e2); buttonInner.setFillStyle(0x5dade2); buttonGlow.setAlpha(0.7); buttonText.setScale(1.05);
                    this.tweens.add({ targets: buttonGlow, scaleX:1.05, scaleY:1.05, duration:300, yoyo:true, repeat:-1 });
                })
                .on('pointerout', () => {
                    buttonBg.setFillStyle(0x2c3e50); buttonInner.setFillStyle(0x34495e); buttonGlow.setAlpha(0.4); buttonText.setScale(1); this.tweens.killTweensOf(buttonGlow); buttonGlow.setScale(1);
                })
                .on('pointerdown', () => { buttonBg.setScale(0.95); buttonInner.setScale(0.95); buttonText.setScale(0.95); this.time.delayedCall(150, () => { this.scene.start('ComputerLab'); }); });
        }
        // --- END RESPONSIVE LAYOUT REFACTOR ---
        
        // Entrance animations with all elements (stats + button handled regardless of platform)
        const animatedElements = [
            panelGlow, panel, title,
            rankOuterGlow, rankBg, rankBorder, rankInnerGlow, rankText,
            statsContainer, buttonGlow, buttonBg, buttonInner, buttonText
        ].filter(Boolean); // filter in case of undefined
        
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

    // TODO (future): extract layout builders (mobile/desktop) into helper methods for clarity & testability.
    
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
