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
        // Optional: Bloom's taxonomy analytics
        // Accept either aggregated stats per category or raw per-question results
        // bloomStats format: { remembering:{correct: n, wrong: m}, understanding:{...}, ... }
        // questionResults format: [{ bloom: 'remembering'|'understanding'|'applying'|'analyzing'|'evaluating'|'creating', correct: boolean }, ...]
        this.bloomStatsRaw = data.bloomStats || null;
        this.questionResults = Array.isArray(data.questionResults) ? data.questionResults : [];
        
    }

    preload() {
        this.load.audio('bgm_results', 'assets/audio/bgm/bgm_results.mp3');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        super.create();

        // Calculate rank
        const totalQuestions = this.correctAnswers + this.wrongAnswers;
        const accuracy = totalQuestions > 0 ? (this.correctAnswers / totalQuestions) * 100 : 0;
        let rank = 'F';
        let rankColor = '#ff0000';
        if (accuracy >= 95) { rank = 'S'; rankColor = '#ffd700'; }
        else if (accuracy >= 90) { rank = 'A'; rankColor = '#00ff00'; }
        else if (accuracy >= 80) { rank = 'B'; rankColor = '#00ffff'; }
        else if (accuracy >= 70) { rank = 'C'; rankColor = '#ffff00'; }
        else if (accuracy >= 60) { rank = 'D'; rankColor = '#ff8000'; }
        else if (accuracy >= 50) { rank = 'E'; rankColor = '#ff4000'; }

        // Scale info
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const scaleInfo = getScaleInfo(this);
        const isMobile = scaleInfo.width < 900 || scaleInfo.isMobile;
        const aspect = this.scale.height / (this.scale.width || 1);
        const isTallMobile = (isMobile || scaleInfo.isPortrait) && aspect > 1.85;
        const TALL_MOBILE_FONT_REDUCE = 0.94;
        const MOBILE_MAX_HEIGHT_RATIO = 0.9;

        // Content size
        let contentWidth = isMobile ? this.scale.width * 0.98 : this.scale.width * 0.95;
        if (isTallMobile) contentWidth = this.scale.width * 0.95;

        let titleFontPx = isMobile ? 52 : 42;
        let statFontPx = isMobile ? 32 : 28;
        let rankFontPx = isMobile ? 120 : 150;
        if (isTallMobile) {
            titleFontPx = Math.round(titleFontPx * TALL_MOBILE_FONT_REDUCE);
            statFontPx = Math.round(statFontPx * TALL_MOBILE_FONT_REDUCE);
            rankFontPx = Math.round(rankFontPx * TALL_MOBILE_FONT_REDUCE);
        }

        const bloomAnalysis = this.computeBloomAnalysis();
        const bloomEnabled = true;
        const titleHeight = isMobile ? 80 : 100;
    const statRowHeight = isMobile ? 48 : 54;
    const statGap = isMobile ? 32 : 44; // increased gaps so UI isn't too tight
        const rankSize = isMobile ? 100 : 140;
        const bloomHeaderHeight = isMobile ? 34 : 40;
        const bloomPanelHeight = bloomEnabled ? (isMobile ? 260 : 300) : 0;
        const contentHeight = titleHeight + (5 * statRowHeight) + (4 * statGap) + 200 + bloomPanelHeight;

        // Container and background
        this.resultContainer = this.add.container(centerX, centerY);
        const resultBox = this.add.graphics();
        resultBox.fillStyle(0x1a237e, 0.8);
        resultBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 8);
        this.resultContainer.add(resultBox);

        // Scale container
        let targetScale = 1;
        if (isMobile) {
            const maxHeight = this.scale.height * MOBILE_MAX_HEIGHT_RATIO;
            if (contentHeight > maxHeight) targetScale = Math.min(targetScale, maxHeight / contentHeight);
            targetScale = Math.max(targetScale, 0.7);
        }
        if (isTallMobile) targetScale *= 0.9;
        this.resultContainer.setScale(targetScale);

        // Title
        const titleText = 'RESULTS';
        const title = this.add.text(0, -contentHeight/2 + titleHeight/2, titleText, {
            fontFamily: 'Arial', fontSize: `${titleFontPx}px`, fontWeight: '900', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5);
        this.resultContainer.add(title);

        // Stats (left)
        this.statElements = [];
        const statsData = [
            { label: 'Correct Answers', value: this.correctAnswers, color: '#00ff88', icon: '✓' },
            { label: 'Wrong Answers', value: this.wrongAnswers, color: '#ff4444', icon: '✗' },
            { label: 'Highest Streak', value: `x${this.highestStreak}`, color: '#ffaa00', icon: '🔥' },
            { label: 'Accuracy', value: `${accuracy.toFixed(0)}%`, color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffaa00' : '#ff4444', icon: '🎯' },
            { label: 'TOTAL SCORE', value: this.totalScore, color: '#ffd700', icon: '' }
        ];
    const leftSideX = -contentWidth * 0.32;
    const rightSideX = contentWidth * 0.32;
    const valueX = leftSideX + Math.round(contentWidth * 0.36); // dynamic value column based on content width
        const statsStartY = -contentHeight/2 + titleHeight + 40;
        statsData.forEach((stat, index) => {
            const yPos = statsStartY + (index * (statRowHeight + statGap));
            const iconText = this.add.text(leftSideX - 50, yPos, stat.icon, { fontFamily: 'Arial', fontSize: `${statFontPx}px`, fontWeight: 'bold', color: stat.color }).setOrigin(0,0.5);
            const labelText = this.add.text(leftSideX - 10, yPos, stat.label, { fontFamily:'Arial', fontSize:`${statFontPx}px`, fontWeight:'800', color:'#ffffff', stroke:'#000000', strokeThickness:2 }).setOrigin(0,0.5);
            const valueText = this.add.text(valueX, yPos, stat.value.toString(), { fontFamily:'Arial', fontSize:`${statFontPx}px`, fontWeight:'900', color: stat.color, stroke:'#000000', strokeThickness:2 }).setOrigin(1,0.5);
            if (stat.label === 'TOTAL SCORE') {
                labelText.setFontSize(`${Math.floor(statFontPx * 1.2)}px`).setStyle({ fontWeight:'900', color:'#ffd700', stroke:'#ff8800', strokeThickness:3 });
                valueText.setFontSize(`${Math.floor(statFontPx * 1.4)}px`).setStyle({ fontWeight:'900', color:'#ffd700', stroke:'#ff8800', strokeThickness:3 });
            }
            this.resultContainer.add([iconText, labelText, valueText]);
            this.statElements.push({ icon: iconText, label: labelText, value: valueText });
        });

        // Rank (right)
        const rankCenterY = statsStartY + (2 * (statRowHeight + statGap));
        const rankText = this.add.text(rightSideX, rankCenterY, rank, { fontFamily:'Arial', fontSize:`${rankFontPx}px`, fontWeight:'900', color: rankColor, stroke:'#000000', strokeThickness:6 }).setOrigin(0.5);
        this.rankText = rankText;
        const rankLabel = this.add.text(rightSideX, rankCenterY - rankSize/2 - 40, 'RANK', { fontFamily:'Arial', fontSize:`${Math.floor(statFontPx * 1.2)}px`, fontWeight:'800', color:'#ffffff', stroke:'#000000', strokeThickness:2 }).setOrigin(0.5);
        this.rankLabel = rankLabel;
        this.resultContainer.add([rankText, rankLabel]);
        this.rankElements = [rankText, rankLabel];

        // Simplified Bloom suggestion card: show only the "Focus next" suggestion
        if (bloomEnabled) {
            // Wider, roomier Focus panel to avoid cramped layout
            const panelYStart = (-contentHeight/2) + titleHeight + (5 * (statRowHeight + statGap)) + 28;
            const panelWidth = Math.min(Math.max(contentWidth - 80, 520), contentWidth * 0.95); // prefer wider nearly-full width but cap
            const panelHeight = isMobile ? 110 : 140;

            const bloomBg = this.add.graphics();
            bloomBg.fillStyle(0x0b1024, 0.92);
            bloomBg.fillRoundedRect(-panelWidth/2, panelYStart, panelWidth, panelHeight, 12);
            bloomBg.lineStyle(2, 0x1e2a5a, 1);
            bloomBg.strokeRoundedRect(-panelWidth/2, panelYStart, panelWidth, panelHeight, 12);
            this.resultContainer.add(bloomBg);

            const header = this.add.text(-panelWidth/2 + 18, panelYStart + 12, "Focus next", { fontFamily:'Arial', fontSize:`${Math.floor(statFontPx*1.02)}px`, fontWeight:'900', color:'#F4CE14', stroke:'#000000', strokeThickness:2 }).setOrigin(0,0);
            this.resultContainer.add(header);

            const t = bloomAnalysis.target;
            const cardPad = 14;
            const cardW = panelWidth - 36;
            const cardH = isMobile ? 60 : 78;
            const cardY = panelYStart + panelHeight/2 + 6;
            const card = this.add.graphics();
            card.fillStyle(0x11204a, 0.96);
            card.fillRoundedRect(-cardW/2, cardY - cardH/2, cardW, cardH, 10);
            card.lineStyle(2, 0x1e2a5a, 1);
            card.strokeRoundedRect(-cardW/2, cardY - cardH/2, cardW, cardH, 10);
            this.resultContainer.add(card);

            const tip = t ? `🎯 Focus next: ${t.label} — ${t.acc}% accuracy (${t.correct}/${t.correct + t.wrong}). ${t.tip}` : '🎯 No recommendations available';
            // Left-align text inside the card with ample padding so it wraps naturally
            const suggestion = this.add.text(-cardW/2 + cardPad, cardY, tip, { fontFamily:'Arial', fontSize:`${Math.floor(statFontPx * 0.9)}px`, fontWeight:'700', color:'#d6e6ff', align:'left', wordWrap:{ width: cardW - 2*cardPad } }).setOrigin(0,0.5);
            this.resultContainer.add(suggestion);
        }

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

    computeBloomAnalysis() {
        // Merge data from either provided aggregate stats or per-question results
        const categories = ['remembering','understanding','applying','analyzing','evaluating','creating'];
        const labelMap = {
            remembering: 'Remembering',
            understanding: 'Understanding',
            applying: 'Applying',
            analyzing: 'Analyzing',
            evaluating: 'Evaluating',
            creating: 'Creating'
        };
        const tips = {
            remembering: 'Review flashcards or key terms; focus on definitions and recall.',
            understanding: 'Paraphrase concepts and explain in your own words.',
            applying: 'Practice applying rules or formulas to new problems.',
            analyzing: 'Break problems into parts; look for patterns and relationships.',
            evaluating: 'Compare solutions and justify choices with criteria.',
            creating: 'Build something new from concepts; combine ideas into a solution.'
        };

        const agg = {};
        categories.forEach(c => { agg[c] = { correct: 0, wrong: 0 }; });

        if (this.bloomStatsRaw) {
            categories.forEach(c => {
                const s = this.bloomStatsRaw[c];
                if (s) {
                    agg[c].correct += Math.max(0, s.correct|0);
                    agg[c].wrong += Math.max(0, s.wrong|0);
                }
            });
        }

        if (Array.isArray(this.questionResults) && this.questionResults.length) {
            this.questionResults.forEach(q => {
                const cat = (q.bloom || '').toLowerCase();
                if (!agg[cat]) return;
                if (q.correct) agg[cat].correct++; else agg[cat].wrong++;
            });
        }

        const rows = categories
            .map(c => ({ key: c, label: labelMap[c], correct: agg[c].correct, wrong: agg[c].wrong }))
            .map(r => ({ ...r, acc: Math.round((r.correct / Math.max(1, r.correct + r.wrong)) * 100) }));

        const totalAnswered = rows.reduce((s,r)=> s + r.correct + r.wrong, 0);

        // Choose target: prioritize categories with attempts (>0). If none, default to first.
        let attempted = rows.filter(r => (r.correct + r.wrong) > 0);
        if (attempted.length === 0) attempted = rows;

        // Focus by highest wrong; tie-breaker: lowest accuracy
        let target = attempted[0];
        attempted.forEach(r => {
            if (r.wrong > target.wrong) target = r;
            else if (r.wrong === target.wrong && r.acc < target.acc) target = r;
        });
        if (target) target.tip = tips[target.key];

        return { rows, target, total: totalAnswered };
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
