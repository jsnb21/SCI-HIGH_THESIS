import gameManager from '/src/gameManager.js';

export function showFeedback(scene, message, color) {
    const sf = scene.scaleFactor;
    const centerX = scene.scale.width / 2;
    const y = scene.scale.height / 2 + 120 * sf;
    
    // Enhanced feedback with background panel
    const feedbackBg = scene.add.graphics();
    const messageWidth = message.length * 12 * sf;
    const panelWidth = Math.max(messageWidth, 300 * sf);
    const panelHeight = 60 * sf;
    
    // Background with gradient
    feedbackBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
    feedbackBg.fillRoundedRect(centerX - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 12 * sf);
    
    // Border based on message type
    const borderColor = color === 0x00ff00 ? 0x00ff88 : 0xff4757;
    feedbackBg.lineStyle(3 * sf, borderColor, 0.8);
    feedbackBg.strokeRoundedRect(centerX - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 12 * sf);
    
    feedbackBg.setDepth(130);
    
    const feedback = scene.add.text(
        centerX, y,
        message,
        {
            fontSize: `${18 * sf}px`,
            color: Phaser.Display.Color.IntegerToColor(color).rgba,
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }
    ).setOrigin(0.5).setDepth(131);
    
    // Enhanced animation
    feedbackBg.setAlpha(0);
    feedback.setAlpha(0);
    
    scene.tweens.add({
        targets: [feedbackBg, feedback],
        alpha: 1,
        duration: 200,
        ease: 'Power2'
    });
    
    scene.tweens.add({
        targets: [feedbackBg, feedback],
        alpha: 0,
        duration: 800,
        delay: 200,
        onComplete: () => {
            feedbackBg.destroy();
            feedback.destroy();
        }
    });
}

export function showVictory(scene) {
    // End any active tutorials before showing victory screen
    if (scene.tutorialManager && scene.tutorialManager.isRunning()) {
        scene.tutorialManager.destroy();
    }
    
    scene.cleanupAllElements();
    scene.gameTimer.destroy();
    const sf = scene.scaleFactor;
    const centerX = scene.scale.width / 2;

    // Enhanced background overlay with gradient
    const overlay = scene.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x000000, 0x1a1a2e, 0x1a1a2e, 0.9);
    overlay.fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height);
    overlay.setDepth(50);

    // Enhanced victory panel
    const panelWidth = 500 * sf;
    const panelHeight = 300 * sf;
    const panelBg = scene.add.graphics();
    
    // Outer glow
    panelBg.fillStyle(0x00ff88, 0.3);
    panelBg.fillRoundedRect(
        centerX - panelWidth/2 - 8 * sf,
        scene.scale.height/2 - panelHeight/2 - 8 * sf,
        panelWidth + 16 * sf,
        panelHeight + 16 * sf,
        20 * sf
    );
    
    // Main panel
    panelBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
    panelBg.fillRoundedRect(
        centerX - panelWidth/2,
        scene.scale.height/2 - panelHeight/2,
        panelWidth,
        panelHeight,
        16 * sf
    );
    
    // Border
    panelBg.lineStyle(4 * sf, 0x00ff88, 0.8);
    panelBg.strokeRoundedRect(
        centerX - panelWidth/2,
        scene.scale.height/2 - panelHeight/2,
        panelWidth,
        panelHeight,
        16 * sf
    );
    
    panelBg.setDepth(59);

    const victoryText = scene.add.text(centerX, scene.scale.height/2 - 80 * sf, 'VICTORY!', {
        fontSize: `${48 * sf}px`,
        fill: '#00ff88',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 4 * sf
    }).setOrigin(0.5).setDepth(60);

    const winText = scene.add.text(centerX, scene.scale.height/2 - 30 * sf, 'You have defeated the enemy!', {
        fontSize: `${20 * sf}px`,
        fill: '#ffd700',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 2 * sf
    }).setOrigin(0.5).setDepth(60);    const scoreText = scene.add.text(centerX, scene.scale.height/2 + 10 * sf, `Correct Answers: ${scene.correctAnswers} / ${scene.questions.length}`, {
        fontSize: `${22 * sf}px`,
        fill: '#ffffff',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 2 * sf
    }).setOrigin(0.5).setDepth(60);

    // Display points earned if available
    let pointsText = null;
    if (gameManager && scene.courseTopic) {
        // Calculate points to show what was earned
        const pointsData = gameManager.calculateQuizPoints({
            correctAnswers: scene.correctAnswers,
            totalQuestions: scene.questions.length,
            comboCount: scene.maxComboReached || 0,
            averageAnswerTime: scene.answerTimes ? scene.answerTimes.reduce((sum, time) => sum + time, 0) / scene.answerTimes.length : 5,
            timePerQuestion: 10,
            topic: scene.courseTopic,
            difficulty: scene.difficulty || 'medium'
        });
        
        pointsText = scene.add.text(centerX, scene.scale.height/2 + 35 * sf, `Points Earned: +${pointsData.finalPoints}`, {
            fontSize: `${18 * sf}px`,
            fill: '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }).setOrigin(0.5).setDepth(60);

        // Add leaderboard submission hint
        const leaderboardHint = scene.add.text(centerX, scene.scale.height/2 + 55 * sf, 'Check the Main Hub to submit your score!', {
            fontSize: `${14 * sf}px`,
            fill: '#00ff88',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 1 * sf
        }).setOrigin(0.5).setDepth(60);
    }

    // Check for Web Design victory tutorial before showing the continue button
    if (scene.checkAndShowVictoryTutorial && typeof scene.checkAndShowVictoryTutorial === 'function') {
        const tutorialShown = scene.checkAndShowVictoryTutorial();
        if (tutorialShown) {
            // If tutorial was shown, don't show the continue button yet
            // The tutorial completion callback will handle showing the victory screen again
            return;
        }
    }

    // Enhanced continue button
    const buttonWidth = 200 * sf;
    const buttonHeight = 50 * sf;
    const buttonY = pointsText ? scene.scale.height/2 + 80 * sf : scene.scale.height/2 + 40 * sf; // Raised from +100 to +80, and from +60 to +40
    const buttonBg = scene.add.graphics();
    
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
    
    buttonBg.setDepth(60);
    
    const continueButton = scene.add.text(
        centerX,
        buttonY + 25 * sf, // Use the same buttonY calculation
        "Continue",
        {
            fontSize: `${20 * sf}px`,
            color: '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }
    )
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setDepth(61)        .on('pointerdown', () => {
            // Mark course as completed based on the scene
            if (scene.courseTopic) {
                const courseMap = {
                    'webdesign': 'Web_Design',
                    'python': 'Python',
                    'java': 'Java',
                    'C': 'C',
                    'C++': 'C++',
                    'C#': 'C#'
                };
                
                const courseKey = courseMap[scene.courseTopic];
                if (courseKey) {
                    // Import gameManager here to avoid circular dependencies
                    import('/src/gameManager.js').then(({ default: gameManager }) => {
                        gameManager.setCourseCompleted(courseKey, true);
                        console.log(`Course ${courseKey} marked as completed!`);
                    });
                }
            }            // Pass enemy defeat status and quiz stats to the dungeon scene
            const wasEnemyDefeated = scene.enemyDefeated || false;
            console.log('Victory screen: Enemy was defeated?', wasEnemyDefeated);
            
            scene.scene.stop();
            // Try to resume DungeonScene, but with better error handling
            try {
                if (scene.scene.manager.isPaused('DungeonScene')) {
                    // Pass enemy defeat status when resuming - note: Phaser resume doesn't take data parameter
                    // So we'll set a flag on the scene manager instead
                    const dungeonScene = scene.scene.get('DungeonScene');
                    if (dungeonScene && wasEnemyDefeated) {
                        dungeonScene.enemyWasDefeatedFlag = wasEnemyDefeated;
                        
                        // Also pass quiz stats directly
                        if (scene.score !== undefined) {
                            dungeonScene.courseStats.totalScore += scene.score;
                        }
                        if (scene.correctAnswers !== undefined) {
                            dungeonScene.courseStats.correctAnswers += scene.correctAnswers;
                        }
                        if (scene.questions && scene.correctAnswers !== undefined) {
                            const questionsAnswered = scene.questions.length;
                            const wrongAnswers = questionsAnswered - scene.correctAnswers;
                            dungeonScene.courseStats.wrongAnswers += wrongAnswers;
                        }
                        if (scene.comboMeter && scene.comboMeter.getTotalComboScore) {
                            dungeonScene.courseStats.comboScore += scene.comboMeter.getTotalComboScore();
                        }
                        
                        console.log('Stats passed to dungeon:', dungeonScene.courseStats);
                    }
                    scene.scene.resume('DungeonScene');
                } else if (scene.scene.manager.isActive('DungeonScene')) {
                    // DungeonScene is already active, just switch to it
                    scene.scene.switch('DungeonScene');
                } else {
                    // DungeonScene doesn't exist, go back to main hub
                    scene.scene.start('MainHub');
                }
            } catch (error) {
                console.warn('Error resuming DungeonScene, going to MainHub:', error);
                scene.scene.start('MainHub');
            }
        })
        .on('pointerover', () => {
            continueButton.setScale(1.1);
        })
        .on('pointerout', () => {
            continueButton.setScale(1);
        });

    // Animate elements in
    const elementsToAnimate = [overlay, panelBg, victoryText, winText, scoreText, buttonBg, continueButton];
    elementsToAnimate.forEach((element, index) => {
        element.setAlpha(0);
        scene.tweens.add({
            targets: element,
            alpha: element === overlay ? 0.9 : 1,
            duration: 500,
            delay: index * 100,
            ease: 'Power2'
        });
    });

    scene.persistentElements.push(overlay, panelBg, victoryText, winText, scoreText, buttonBg, continueButton);
}

export function showGameOver(scene) {
    // End any active tutorials before showing game over screen
    if (scene.tutorialManager && scene.tutorialManager.isRunning()) {
        scene.tutorialManager.destroy();
    }
    
    // Ensure the game is completely stopped but UI remains functional
    scene.isAnswering = false;
    scene.isQuizStarted = false;
    
    // Clean up game elements but keep UI functional
    scene.cleanupAllElements();
    if (scene.gameTimer) scene.gameTimer.destroy();
    const sf = scene.scaleFactor;
    const centerX = scene.scale.width / 2;

    // Enhanced background overlay with gradient
    const overlay = scene.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x000000, 0x2d1b69, 0x2d1b69, 0.9);
    overlay.fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height);
    overlay.setDepth(50);

    // Enhanced game over panel
    const panelWidth = 500 * sf;
    const panelHeight = 350 * sf;
    const panelBg = scene.add.graphics();
    
    // Outer glow
    panelBg.fillStyle(0xff4757, 0.3);
    panelBg.fillRoundedRect(
        centerX - panelWidth/2 - 8 * sf,
        scene.scale.height/2 - panelHeight/2 - 8 * sf,
        panelWidth + 16 * sf,
        panelHeight + 16 * sf,
        20 * sf
    );
    
    // Main panel
    panelBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
    panelBg.fillRoundedRect(
        centerX - panelWidth/2,
        scene.scale.height/2 - panelHeight/2,
        panelWidth,
        panelHeight,
        16 * sf
    );
    
    // Border
    panelBg.lineStyle(4 * sf, 0xff4757, 0.8);
    panelBg.strokeRoundedRect(
        centerX - panelWidth/2,
        scene.scale.height/2 - panelHeight/2,
        panelWidth,
        panelHeight,
        16 * sf
    );
    
    panelBg.setDepth(59);

    const gameOverText = scene.add.text(centerX, scene.scale.height/2 - 100 * sf, 'GAME OVER!', {
        fontSize: `${48 * sf}px`,
        fill: '#ff4757',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 4 * sf
    }).setOrigin(0.5).setDepth(60);

    scene.tweens.add({
        targets: gameOverText,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    const defeatText = scene.add.text(centerX, scene.scale.height/2 - 50 * sf, 'You have been defeated...', {
        fontSize: `${20 * sf}px`,
        fill: '#ffd700',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 2 * sf
    }).setOrigin(0.5).setDepth(60);    const scoreText = scene.add.text(centerX, scene.scale.height/2 - 10 * sf, `Correct Answers: ${scene.correctAnswers} / ${scene.questions.length}`, {
        fontSize: `${18 * sf}px`,
        fill: '#ffffff',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 2 * sf
    }).setOrigin(0.5).setDepth(60);

    // Enhanced "Back to Courses" button (centered since we removed try again)
    const backButtonWidth = 220 * sf;
    const backButtonHeight = 50 * sf;
    const backButtonBg = scene.add.graphics();
    
    backButtonBg.fillGradientStyle(0x4a5568, 0x4a5568, 0x2d3748, 0x2d3748, 1);
    backButtonBg.fillRoundedRect(
        centerX - backButtonWidth/2,
        scene.scale.height/2 + 40 * sf,  // Moved up since it's the only button
        backButtonWidth,
        backButtonHeight,
        8 * sf
    );
    
    backButtonBg.lineStyle(2 * sf, 0x718096, 0.8);
    backButtonBg.strokeRoundedRect(
        centerX - backButtonWidth/2,
        scene.scale.height/2 + 40 * sf,  
        backButtonWidth,
        backButtonHeight,
        8 * sf
    );
    
    backButtonBg.setDepth(60);

    const backButton = scene.add.text(centerX, scene.scale.height/2 + 65 * sf, "Back to Courses", {
        fontSize: `${20 * sf}px`,
        color: '#ffffff',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 2 * sf
    })
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setDepth(61)
        .on('pointerover', () => {
            backButton.setScale(1.05);
            scene.se_hoverSound?.play();
        })
        .on('pointerout', () => {
            backButton.setScale(1);
        })
        .on('pointerdown', () => {
            scene.se_confirmSound?.play();
            
            // Clean up current scene first
            scene.cleanupAllElements();
            scene.scene.stop();
            
            // Ensure DungeonScene is stopped before going to ComputerLab
            const sceneManager = scene.scene.manager;
            if (sceneManager.isActive('DungeonScene') || sceneManager.isPaused('DungeonScene')) {
                sceneManager.stop('DungeonScene');
            }
            
            // Go to ComputerLab instead of MainHub
            scene.scene.start('ComputerLab');
        });

    // Animate elements in
    const elementsToAnimate = [overlay, panelBg, gameOverText, defeatText, scoreText, backButtonBg, backButton];
    elementsToAnimate.forEach((element, index) => {
        element.setAlpha(0);
        scene.tweens.add({
            targets: element,
            alpha: element === overlay ? 0.9 : 1,
            duration: 500,
            delay: index * 100,
            ease: 'Power2'
        });
    });
    
    scene.persistentElements.push(overlay, panelBg, gameOverText, defeatText, scoreText, backButtonBg, backButton);
}