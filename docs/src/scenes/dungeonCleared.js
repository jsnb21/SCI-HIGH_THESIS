import Phaser from 'phaser';

export default class DungeonCleared extends Phaser.Scene {
    constructor() {
        super('DungeonCleared');
    }

    init(data) {
        this.courseStats = data.courseStats || {
            totalScore: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            comboScore: 0
        };
        this.courseTopic = data.courseTopic || 'webdesign';
        this.scaleFactor = 1;
    }

    preload() {
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
    }

    create() {
        this.updateScale();
        this.showResultsScreen();
        
        // Add resize listener
        this.scale.on('resize', this.onResize, this);
    }

    updateScale() {
        const width = this.scale.width;
        const height = this.scale.height;
        this.scaleFactor = Math.min(width / 816, height / 624);
    }

    onResize() {
        this.updateScale();
        // Clear and recreate the results screen
        this.children.removeAll();
        this.showResultsScreen();
    }

    showResultsScreen() {
        console.log('DungeonCleared: showResultsScreen called with stats:', this.courseStats);
        
        const sf = this.scaleFactor;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Calculate performance metrics
        const totalQuestions = this.courseStats.correctAnswers + this.courseStats.wrongAnswers;
        const mistakes = this.courseStats.wrongAnswers;
        const accuracy = totalQuestions > 0 ? (this.courseStats.correctAnswers / totalQuestions) * 100 : 0;
        
        // Calculate ranking based on total score and mistakes
        let rank = 'D';
        let rankColor = '#8B5A2B'; // Bronze
        
        if (this.courseStats.totalScore >= 800 && mistakes <= 1) {
            rank = 'S';
            rankColor = '#FFD700'; // Gold
        } else if (this.courseStats.totalScore >= 600 && mistakes <= 2) {
            rank = 'A';
            rankColor = '#C0C0C0'; // Silver
        } else if (this.courseStats.totalScore >= 400 && mistakes <= 3) {
            rank = 'B';
            rankColor = '#CD7F32'; // Bronze
        } else if (this.courseStats.totalScore >= 200 && mistakes <= 5) {
            rank = 'C';
            rankColor = '#A0522D'; // Dark bronze
        }
        
        console.log(`Calculated rank: ${rank}, Score: ${this.courseStats.totalScore}, Mistakes: ${mistakes}`);
        
        // Create overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(0, 0, this.scale.width, this.scale.height);
        overlay.setDepth(200);
        
        // Create results panel
        const panelWidth = 600 * sf;
        const panelHeight = 500 * sf;
        const panelBg = this.add.graphics();
        
        // Outer glow
        panelBg.fillStyle(parseInt(rankColor.replace('#', '0x')), 0.3);
        panelBg.fillRoundedRect(
            centerX - panelWidth/2 - 8 * sf,
            centerY - panelHeight/2 - 8 * sf,
            panelWidth + 16 * sf,
            panelHeight + 16 * sf,
            20 * sf
        );
        
        // Main panel
        panelBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
        panelBg.fillRoundedRect(
            centerX - panelWidth/2,
            centerY - panelHeight/2,
            panelWidth,
            panelHeight,
            16 * sf
        );
        
        // Border
        panelBg.lineStyle(4 * sf, parseInt(rankColor.replace('#', '0x')), 0.8);
        panelBg.strokeRoundedRect(
            centerX - panelWidth/2,
            centerY - panelHeight/2,
            panelWidth,
            panelHeight,
            16 * sf
        );
        
        panelBg.setDepth(201);
        
        // Dungeon Cleared Title
        const titleText = this.add.text(centerX, centerY - 180 * sf, 'DUNGEON CLEARED!', {
            fontSize: `${36 * sf}px`,
            fill: '#00ff88',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 4 * sf
        }).setOrigin(0.5).setDepth(202);
        
        // Course name
        const courseNames = {
            'webdesign': 'Web Design',
            'python': 'Python Programming',
            'java': 'Java Programming',
            'C': 'C Programming',
            'C++': 'C++ Programming',
            'C#': 'C# Programming'
        };
        
        const courseName = courseNames[this.courseTopic] || this.courseTopic;
        const courseText = this.add.text(centerX, centerY - 140 * sf, courseName, {
            fontSize: `${22 * sf}px`,
            fill: '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }).setOrigin(0.5).setDepth(202);
        
        // Rank display - larger and more prominent
        const rankText = this.add.text(centerX, centerY - 80 * sf, `RANK: ${rank}`, {
            fontSize: `${52 * sf}px`,
            fill: rankColor,
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 4 * sf
        }).setOrigin(0.5).setDepth(202);
        
        // Statistics
        const statsY = centerY - 20 * sf;
        const lineHeight = 32 * sf;
        
        const totalScoreText = this.add.text(centerX, statsY, `Total Score: ${this.courseStats.totalScore}`, {
            fontSize: `${22 * sf}px`,
            fill: '#ffffff',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }).setOrigin(0.5).setDepth(202);
        
        const mistakesText = this.add.text(centerX, statsY + lineHeight, `Mistakes: ${mistakes}`, {
            fontSize: `${20 * sf}px`,
            fill: mistakes === 0 ? '#00ff88' : mistakes <= 2 ? '#ffd700' : '#ff4757',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }).setOrigin(0.5).setDepth(202);
        
        const accuracyText = this.add.text(centerX, statsY + lineHeight * 2, `Accuracy: ${accuracy.toFixed(1)}%`, {
            fontSize: `${18 * sf}px`,
            fill: '#9c88ff',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }).setOrigin(0.5).setDepth(202);
        
        // Continue button
        const buttonWidth = 220 * sf;
        const buttonHeight = 55 * sf;
        const buttonY = centerY + 140 * sf;
        
        const buttonBg = this.add.graphics();
        buttonBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 1);
        buttonBg.fillRoundedRect(
            centerX - buttonWidth/2,
            buttonY,
            buttonWidth,
            buttonHeight,
            8 * sf
        );
        buttonBg.lineStyle(3 * sf, 0x63b3ed, 0.8);
        buttonBg.strokeRoundedRect(
            centerX - buttonWidth/2,
            buttonY,
            buttonWidth,
            buttonHeight,
            8 * sf
        );
        buttonBg.setDepth(202);
        
        const continueButton = this.add.text(
            centerX,
            buttonY + buttonHeight/2,
            "Return to Hub",
            {
                fontSize: `${22 * sf}px`,
                color: '#ffd700',
                fontFamily: 'Caprasimo-Regular',
                stroke: '#1a1a2e',
                strokeThickness: 2 * sf
            }
        )
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .setDepth(203)
            .on('pointerdown', () => {
                console.log('Returning to Main Hub');
                this.scene.start('MainHub');
            })
            .on('pointerover', () => {
                continueButton.setScale(1.1);
                buttonBg.clear();
                buttonBg.fillGradientStyle(0x3d4758, 0x3d4758, 0x2a2a3e, 0x2a2a3e, 1);
                buttonBg.fillRoundedRect(
                    centerX - buttonWidth/2,
                    buttonY,
                    buttonWidth,
                    buttonHeight,
                    8 * sf
                );
                buttonBg.lineStyle(3 * sf, 0x73c3fd, 1);
                buttonBg.strokeRoundedRect(
                    centerX - buttonWidth/2,
                    buttonY,
                    buttonWidth,
                    buttonHeight,
                    8 * sf
                );
            })
            .on('pointerout', () => {
                continueButton.setScale(1);
                buttonBg.clear();
                buttonBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 1);
                buttonBg.fillRoundedRect(
                    centerX - buttonWidth/2,
                    buttonY,
                    buttonWidth,
                    buttonHeight,
                    8 * sf
                );
                buttonBg.lineStyle(3 * sf, 0x63b3ed, 0.8);
                buttonBg.strokeRoundedRect(
                    centerX - buttonWidth/2,
                    buttonY,
                    buttonWidth,
                    buttonHeight,
                    8 * sf
                );
            });
        
        // Animate elements in
        const elementsToAnimate = [overlay, panelBg, titleText, courseText, rankText, 
                                  totalScoreText, mistakesText, accuracyText, 
                                  buttonBg, continueButton];
        
        elementsToAnimate.forEach((element, index) => {
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: element === overlay ? 0.8 : 1,
                duration: 500,
                delay: index * 80,
                ease: 'Power2'
            });
        });

        // Add celebratory particle effect
        this.createCelebrationEffect(centerX, centerY - 80 * sf, rankColor);
    }

    createCelebrationEffect(x, y, color) {
        const particles = [];
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.circle(x, y, 3, parseInt(color.replace('#', '0x')), 0.8);
            particle.setDepth(210);
            particles.push(particle);
            
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 60 + Math.random() * 40;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 0.2,
                duration: 1000 + Math.random() * 500,
                delay: Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }
}
