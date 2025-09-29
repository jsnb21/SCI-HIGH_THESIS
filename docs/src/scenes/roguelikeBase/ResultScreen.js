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
    const isMobile = scaleInfo.width < 900 || scaleInfo.isMobile;
    const aspect = scaleInfo.height / (scaleInfo.width || 1);
    const isTallMobile = (isMobile || scaleInfo.isPortrait) && aspect > 1.95; // very tall devices (e.g., S Ultra)
        
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
    // Mobile: widen further and increase cap; desktop gets a bit wider as well
    const panelWidth = isMobile ? (
        isTallMobile ? Math.min(scaleInfo.width * 0.995, 520) : Math.min(scaleInfo.width * 0.99, tinyPhone ? 400 : 500)
    ) : Math.min(scaleDimension(640, scaleInfo), scaleInfo.width * 0.9);
    const basePanelHeight = isMobile ? (
        // More height on mobile to fit larger fonts comfortably
        isTallMobile ? Math.min(scaleInfo.height * 0.92, 620) : Math.min(scaleInfo.height * 0.92, 620)
    ) : Math.min(scaleDimension(680, scaleInfo), scaleInfo.height * 0.9);
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
    // Shift title higher on mobile to free vertical space for stats
    let titleY = isMobile ? panelY - panelHeight * (isTallMobile ? 0.45 : 0.44) : panelY - panelHeight * 0.38;
        const title = this.add.text(panelX, titleY, titleText, {
            fontFamily: 'Arial',
            fontSize: isMobile ? 
                (this.courseCompleted ? scaleFontSize(34, scaleInfo) : scaleFontSize(38, scaleInfo)) :
                (this.courseCompleted ? '36px' : '42px'),
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
                fontSize: isMobile ? scaleFontSize(26, scaleInfo) : '28px',
                fontWeight: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0.5);
        }
        
    // Enhanced rank display with special effects and responsive positioning
        // Rank positioned dynamically BELOW title so they never overlap on desktop
    // Reduce rank size slightly on mobile so more stats visible
    // Increase rank size (both platforms) for stronger emphasis
    let rankSize = isMobile ? (tinyPhone ? 46 : (isTallMobile ? 56 : 54)) : 76;
    // Reduce gap under title for mobile to reclaim space
    const desktopTitleRankGap = isMobile ? 0 : 40;
    const mobileTitleRankGap = isMobile ? (isTallMobile ? 10 : 8) : 0;
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
            fontSize: isMobile ? scaleFontSize(isTallMobile ? 58 : 54, scaleInfo) : '64px',
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
        
        // --- FULL SCROLLABLE CONTENT (title, rank, stats, button) ---
    const panelTop = panelY - panelHeight/2;
    const paddingTop = isMobile ? scaleDimension(24, scaleInfo) : 36;
    // Reduce side padding on mobile to gain more horizontal space for stats rows
    const paddingSides = isMobile ? scaleDimension(14, scaleInfo) : 28;
        const paddingBottom = isMobile ? scaleDimension(28, scaleInfo) : 34;
        const innerWidth = panelWidth - paddingSides * 2;

        // Build stats + button after adjusting title/rank to top anchored positions
    title.y = panelTop + paddingTop + title.height/2;
    // Larger gap between title and rank
    const titleRankGap = isMobile ? scaleDimension(24, scaleInfo) : 36;
    rankY = title.y + title.height/2 + titleRankGap + rankSize/2;
        rankOuterGlow.y = rankBg.y = rankBorder.y = rankInnerGlow.y = rankText.y = rankY;

    // Larger gap between rank and stats
    const rankStatsGap = isMobile ? scaleDimension(32, scaleInfo) : 42;
    const statsStartY = rankY + rankSize/2 + rankStatsGap;
        const statsData = [
            { label: '✓ Correct Answers', value: this.correctAnswers, color: '#00ff88' },
            { label: '✗ Wrong Answers', value: this.wrongAnswers, color: '#ff4444' },
            { label: '🔥 Highest Streak', value: `${this.highestStreak}x`, color: '#ffaa00' },
            { label: '⭐ Total Score', value: this.totalScore, color: '#00ddff' },
            { label: '📊 Accuracy', value: `${accuracy.toFixed(1)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444' }
        ];
    const rowHeight = isMobile ? scaleDimension(isTallMobile ? 48 : 46, scaleInfo) : 44;
    const rowGap = isMobile ? scaleDimension(12, scaleInfo) : 14;
    const statFontSize = isMobile ? scaleFontSize(tinyPhone ? 18 : 20, scaleInfo) : '22px';
        const statRowElements = [];
        let statCursorY = statsStartY;
        const leftColX = panelX - innerWidth/2 + innerWidth * 0.04;
        const rightColX = panelX + innerWidth * 0.46;
        statsData.forEach(stat => {
            const centerY = statCursorY + rowHeight/2;
            const bg = this.add.rectangle(panelX, centerY, innerWidth, rowHeight, 0x0a1628, 0.75).setStrokeStyle(1, 0x2c3e50, 0.35);
            const glow = this.add.rectangle(panelX, centerY, innerWidth - 4, rowHeight - 4, stat.color, 0.07);
            const label = this.add.text(leftColX, centerY, stat.label, { fontFamily:'Arial', fontSize: statFontSize, color:'#ffffff', fontWeight:'bold'}).setOrigin(0,0.5);
            const value = this.add.text(rightColX, centerY, stat.value.toString(), { fontFamily:'Arial', fontSize: statFontSize, color: stat.color, fontWeight:'bold'}).setOrigin(1,0.5);
            statRowElements.push([bg, glow, label, value]);
            statCursorY += rowHeight + rowGap;
        });

    const buttonHeight = isMobile ? scaleDimension(58, scaleInfo) : 68;
    const buttonWidth = isMobile ? Math.min(innerWidth, scaleDimension(tinyPhone ? 300 : 380, scaleInfo)) : 400;
    const buttonCenterY = statCursorY + (isMobile ? scaleDimension(18, scaleInfo) : 28) + buttonHeight/2;
        const buttonBg = this.add.rectangle(panelX, buttonCenterY, buttonWidth, buttonHeight, 0x2c3e50).setStrokeStyle(isMobile?scaleDimension(2, scaleInfo):3, 0x4a90e2);
        const buttonGlow = this.add.rectangle(panelX, buttonCenterY, buttonWidth+6, buttonHeight+6, 0x4a90e2, isMobile?0.35:0.4);
    const buttonInner = this.add.rectangle(panelX, buttonCenterY, buttonWidth-(isMobile?12:14), buttonHeight-(isMobile?12:14), 0x34495e, 0.85);
    const buttonText = this.add.text(panelX, buttonCenterY, 'Back to Computer Lab', { fontFamily:'Arial', fontSize: isMobile? `${scaleFontSize(tinyPhone?18:20, scaleInfo)}px` : '24px', fontWeight:'bold', color:'#ffffff', shadow: !isMobile? {offsetX:2, offsetY:2, color:'#000', blur:4, fill:true}: undefined }).setOrigin(0.5);
        const buttonElements = [buttonGlow, buttonBg, buttonInner, buttonText];

        // Content container that will scroll (includes title, rank, stats, button)
        const scrollContainer = this.add.container(0,0, [title, rankOuterGlow, rankBg, rankBorder, rankInnerGlow, rankText, ...statRowElements.flat(), ...buttonElements]);

        const contentBottom = buttonCenterY + buttonHeight/2 + paddingBottom;
        const contentHeight = contentBottom - panelTop;
        const viewportHeight = panelHeight;
        let showScrollHint = false; let hintArrow; let scrollTrack; let scrollThumb;
        if (contentHeight > viewportHeight) {
            showScrollHint = true;
            // Mask for panel interior
            const maskRect = this.add.rectangle(panelX, panelY, panelWidth - 10, panelHeight - 10, 0xffffff, 0.01);
            const geoMask = maskRect.createGeometryMask();
            scrollContainer.setMask(geoMask);

            // Scrollbar
            const trackX = panelX + innerWidth/2 + paddingSides/2 + 4;
            const effectiveHeight = panelHeight - 20;
            scrollTrack = this.add.rectangle(trackX, panelY, 4, effectiveHeight, 0xffffff, 0.15).setDepth(6);
            const thumbHeight = Phaser.Math.Clamp((viewportHeight / contentHeight) * effectiveHeight, 28, effectiveHeight * 0.85);
            scrollThumb = this.add.rectangle(trackX, panelY - effectiveHeight/2 + thumbHeight/2, 6, thumbHeight, 0x4a90e2, 0.9).setDepth(7);

            // Hint arrow
            hintArrow = this.add.text(panelX, panelY + panelHeight/2 - 6, '▼', { fontFamily:'Arial', fontSize: isMobile? '20px':'18px', color:'#4a90e2' }).setOrigin(0.5,1).setDepth(8);
            this.tweens.add({ targets: hintArrow, y: '+=10', alpha:{from:0.4,to:1}, duration:800, yoyo:true, repeat:-1, ease:'Sine.inOut' });

            let scrollOffset = 0; const maxScroll = contentHeight - viewportHeight;
            const applyScroll = () => {
                scrollContainer.y = -scrollOffset;
                const ratio = scrollOffset / maxScroll;
                const thumbRange = effectiveHeight - scrollThumb.height;
                scrollThumb.y = panelY - effectiveHeight/2 + scrollThumb.height/2 + thumbRange * ratio;
            };
            const hideHint = () => { if (showScrollHint) { showScrollHint = false; if (hintArrow) { this.tweens.add({ targets: hintArrow, alpha:0, duration:300, onComplete: ()=> hintArrow.destroy() }); } } };

            // Wheel
            this.input.on('wheel', (_, __, dx, dy) => { if (Math.abs(dy) >= Math.abs(dx)) { hideHint(); scrollOffset = Phaser.Math.Clamp(scrollOffset + dy * 0.45, 0, maxScroll); applyScroll(); }});
            // Drag
            let dragging=false,lastY=0,velocity=0,lastTime=0;
            this.input.on('pointerdown', p=>{ if(p.x>=panelX-panelWidth/2 && p.x<=panelX+panelWidth/2 && p.y>=panelY-panelHeight/2 && p.y<=panelY+panelHeight/2){ dragging=true; lastY=p.y; lastTime=p.time; velocity=0; hideHint(); }});
            this.input.on('pointerup', ()=> dragging=false);
            this.input.on('pointermove', p=>{ if(!dragging) return; const dy=p.y-lastY; const dt=(p.time-lastTime)||16; lastY=p.y; lastTime=p.time; velocity=-dy/dt*16; scrollOffset = Phaser.Math.Clamp(scrollOffset - dy, 0, maxScroll); applyScroll(); });
            // Inertia
            this.time.addEvent({ delay:16, loop:true, callback:()=>{ if(dragging) return; if(Math.abs(velocity)<0.15) return; hideHint(); scrollOffset = Phaser.Math.Clamp(scrollOffset + velocity, 0, maxScroll); velocity *= 0.9; applyScroll(); }});
            applyScroll();
        }

        // Button interactions
        buttonBg.setInteractive({ useHandCursor:true })
            .on('pointerover', () => { buttonBg.setFillStyle(0x4a90e2); buttonInner.setFillStyle(0x5dade2); buttonGlow.setAlpha(isMobile?0.55:0.7); if(!isMobile){ buttonText.setScale(1.05); this.tweens.add({ targets: buttonGlow, scaleX:1.05, scaleY:1.05, duration:300, yoyo:true, repeat:-1 }); } })
            .on('pointerout', () => { buttonBg.setFillStyle(0x2c3e50); buttonInner.setFillStyle(0x34495e); buttonGlow.setAlpha(isMobile?0.35:0.4); if(!isMobile){ buttonText.setScale(1); this.tweens.killTweensOf(buttonGlow); buttonGlow.setScale(1);} })
            .on('pointerdown', () => { buttonBg.setScale(0.95); buttonInner.setScale(0.95); buttonText.setScale(0.95); this.time.delayedCall(140, ()=> this.scene.start('ComputerLab')); });

        // Entrance animations
        const animatedElements = [panelGlow, panel, title, rankOuterGlow, rankBg, rankBorder, rankInnerGlow, rankText];
        animatedElements.forEach((element, index) => {
            element.setAlpha(0); element.setScale(0.8);
            this.tweens.add({ targets: element, alpha:1, scaleX:1, scaleY:1, duration:600, delay:index*100, ease:'Back.out' });
        });
        statRowElements.forEach(row => row.forEach(el => el.setAlpha(0)));
        buttonElements.forEach(el => el.setAlpha(0));
        this.time.delayedCall(600, () => {
            statRowElements.forEach((row, idx) => { this.tweens.add({ targets: row, alpha:{from:0,to:1}, x:{from:'+=35', to:'-=35'}, duration:400, delay:idx*90, ease:'Power2.out' }); });
            this.tweens.add({ targets: buttonElements, alpha:{from:0,to:1}, duration:500, delay: statRowElements.length*90 + 200, ease:'Power2.out' });
        });

        // Rank pulse & particles
        this.time.delayedCall(1000, () => { this.tweens.add({ targets:[rankOuterGlow, rankInnerGlow], alpha:{from:0.2,to:0.5}, scaleX:{from:1,to:1.1}, scaleY:{from:1,to:1.1}, duration:1500, yoyo:true, repeat:-1, ease:'Sine.easeInOut'}); });
        if (rank === 'S' || rank === 'A') this.createParticleEffects(panelX, panelY - 80, rankColor);

        // Resize rebuild
        this.scale.on('resize', () => {
            this.scene.restart({
                correctAnswers: this.correctAnswers,
                wrongAnswers: this.wrongAnswers,
                highestStreak: this.highestStreak,
                totalScore: this.totalScore,
                courseTopic: this.courseTopic,
                courseCompleted: this.courseCompleted
            });
        });
        return; // end create
    }

    createParticleEffects(x, y, color) {
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
