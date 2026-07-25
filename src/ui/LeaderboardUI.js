// Leaderboard UI Component for in-game display
import gameManager from '../gameManager.js';

class LeaderboardUI {
    static createLeaderboardButton(scene, x = 50, y = 100) {
        // Create button background
        const buttonBg = scene.add.rectangle(x, y, 140, 45, 0x3498DB);
        buttonBg.setStrokeStyle(2, 0x2980B9);
        buttonBg.setInteractive({ useHandCursor: true });
        buttonBg.setDepth(100);

        // Create button text
        const buttonText = scene.add.text(x, y, '🏆 Leaderboard', {
            fontSize: '14px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(101);

        // Hover effects
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x2980B9);
            buttonText.setStyle({ color: '#F1C40F' });
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x3498DB);
            buttonText.setStyle({ color: '#FFFFFF' });
        });

        // Click handler
        buttonBg.on('pointerdown', () => {
            gameManager.showLeaderboardDialog(scene);
        });

        return { buttonBg, buttonText };
    }

    static createQuickStatsDisplay(scene, x = 50, y = 150) {
        const container = scene.add.container(x, y);

        // Background
        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(-70, -40, 140, 80, 8);
        bg.lineStyle(2, 0xF1C40F, 0.8);
        bg.strokeRoundedRect(-70, -40, 140, 80, 8);

        // Title
        const title = scene.add.text(0, -25, 'Your Stats', {
            fontSize: '12px',
            color: '#F1C40F',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Current score
        const currentScore = scene.add.text(0, -5, `Score: ${gameManager.getTotalPoints()}`, {
            fontSize: '11px',
            color: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Achievements count
        const achievements = scene.add.text(0, 10, `Achievements: ${gameManager.getAchievements().length}`, {
            fontSize: '11px',
            color: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Best topic
        const stats = gameManager.getPointsStatistics();
        const bestTopic = stats.topTopics[0] || ['None', 0];
        const topicText = scene.add.text(0, 25, `Best: ${bestTopic[0]}`, {
            fontSize: '10px',
            color: '#95A5A6',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        container.add([bg, title, currentScore, achievements, topicText]);
        container.setDepth(100);

        // Update function
        const updateStats = () => {
            currentScore.setText(`Score: ${gameManager.getTotalPoints()}`);
            achievements.setText(`Achievements: ${gameManager.getAchievements().length}`);
            const newStats = gameManager.getPointsStatistics();
            const newBestTopic = newStats.topTopics[0] || ['None', 0];
            topicText.setText(`Best: ${newBestTopic[0]}`);
        };

        return { container, updateStats };
    }

    static async createInGameLeaderboard(scene, x = 50, y = 200, limit = 5) {
        const container = scene.add.container(x, y);

        // Background
        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.9);
        bg.fillRoundedRect(-150, -100, 300, 200, 10);
        bg.lineStyle(2, 0x3498DB, 0.8);
        bg.strokeRoundedRect(-150, -100, 300, 200, 10);

        // Title
        const title = scene.add.text(0, -80, '🏆 Top Players', {
            fontSize: '16px',
            color: '#F1C40F',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, title]);

        try {
            // Dynamic import of leaderboard service
            const { default: leaderboardService } = await import('../services/leaderboardService.js');
            
            // Wait for Firebase to initialize
            let retries = 0;
            while (!leaderboardService.isReady() && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }

            if (leaderboardService.isReady()) {
                const topScores = await leaderboardService.getTopScores('overall', limit);
                
                // Create leaderboard entries
                topScores.forEach((entry, index) => {
                    const y = -50 + (index * 25);
                    
                    // Rank
                    const rank = scene.add.text(-130, y, `${index + 1}.`, {
                        fontSize: '12px',
                        color: index < 3 ? '#F1C40F' : '#FFFFFF',
                        fontFamily: 'Arial',
                        fontStyle: 'bold'
                    }).setOrigin(0, 0.5);

                    // Name
                    const name = scene.add.text(-110, y, entry.name.substring(0, 15), {
                        fontSize: '12px',
                        color: '#FFFFFF',
                        fontFamily: 'Arial'
                    }).setOrigin(0, 0.5);

                    // Score
                    const score = scene.add.text(120, y, entry.score.toString(), {
                        fontSize: '12px',
                        color: '#27AE60',
                        fontFamily: 'Arial',
                        fontStyle: 'bold'
                    }).setOrigin(1, 0.5);

                    container.add([rank, name, score]);
                });
            } else {
                // Show loading/error message
                const errorText = scene.add.text(0, 0, 'Loading...', {
                    fontSize: '14px',
                    color: '#95A5A6',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                container.add(errorText);
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            const errorText = scene.add.text(0, 0, 'Failed to load\nleaderboard', {
                fontSize: '12px',
                color: '#E74C3C',
                fontFamily: 'Arial',
                align: 'center'
            }).setOrigin(0.5);
            container.add(errorText);
        }

        container.setDepth(100);
        return container;
    }

    static createSubmitScorePrompt(scene) {
        // Check if score is worth submitting (has some points)
        const currentScore = gameManager.getTotalPoints();
        if (currentScore === 0) {
            return null;
        }

        // Create subtle prompt
        const promptBg = scene.add.rectangle(
            scene.cameras.main.width - 150,
            100,
            280,
            60,
            0x2ECC71,
            0.9
        );
        promptBg.setStrokeStyle(2, 0x27AE60);
        promptBg.setInteractive({ useHandCursor: true });
        promptBg.setDepth(150);

        const promptText = scene.add.text(
            scene.cameras.main.width - 150,
            100,
            `Submit ${currentScore} points\nto Leaderboard! 🏆`,
            {
                fontSize: '12px',
                color: '#FFFFFF',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(151);

        // Pulse animation
        scene.tweens.add({
            targets: [promptBg, promptText],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Click handler
        promptBg.on('pointerdown', () => {
            gameManager.showLeaderboardDialog(scene);
            promptBg.destroy();
            promptText.destroy();
        });

        // Auto-hide after 10 seconds
        scene.time.delayedCall(10000, () => {
            if (promptBg && promptBg.active) {
                scene.tweens.add({
                    targets: [promptBg, promptText],
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        promptBg.destroy();
                        promptText.destroy();
                    }
                });
            }
        });

        return { promptBg, promptText };
    }
}

export default LeaderboardUI;
