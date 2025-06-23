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

    // Enhanced continue button
    const buttonWidth = 200 * sf;
    const buttonHeight = 50 * sf;
    const buttonBg = scene.add.graphics();
    
    buttonBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 1);
    buttonBg.fillRoundedRect(
        centerX - buttonWidth/2,
        scene.scale.height/2 + 60 * sf,
        buttonWidth,
        buttonHeight,
        8 * sf
    );
    
    buttonBg.lineStyle(3 * sf, 0x63b3ed, 0.8);
    buttonBg.strokeRoundedRect(
        centerX - buttonWidth/2,
        scene.scale.height/2 + 60 * sf,
        buttonWidth,
        buttonHeight,
        8 * sf
    );
    
    buttonBg.setDepth(60);
    
    const continueButton = scene.add.text(
        centerX,
        scene.scale.height/2 + 85 * sf,
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
            scene.scene.stop();
            // Try to resume DungeonScene, but with better error handling
            try {
                if (scene.scene.manager.isPaused('DungeonScene')) {
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
    scene.isAnswering = false;
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

    // Enhanced restart button
    const restartButtonWidth = 200 * sf;
    const restartButtonHeight = 50 * sf;
    const restartButtonBg = scene.add.graphics();
    
    restartButtonBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 1);
    restartButtonBg.fillRoundedRect(
        centerX - restartButtonWidth/2,
        scene.scale.height/2 + 40 * sf,
        restartButtonWidth,
        restartButtonHeight,
        8 * sf
    );
    
    restartButtonBg.lineStyle(3 * sf, 0x63b3ed, 0.8);
    restartButtonBg.strokeRoundedRect(
        centerX - restartButtonWidth/2,
        scene.scale.height/2 + 40 * sf,
        restartButtonWidth,
        restartButtonHeight,
        8 * sf
    );
    
    restartButtonBg.setDepth(60);

    const restartButton = scene.add.text(centerX, scene.scale.height/2 + 65 * sf, "Try Again", {
        fontSize: `${20 * sf}px`,
        color: '#ffd700',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 2 * sf
    })
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setDepth(61)
        .on('pointerover', () => {
            restartButton.setScale(1.1);
            scene.se_hoverSound?.play();
        })
        .on('pointerout', () => {
            restartButton.setScale(1);
        })
        .on('pointerdown', () => {
            scene.se_confirmSound?.play();
            scene.restartQuiz();
        });

    // Enhanced menu button
    const menuButtonWidth = 180 * sf;
    const menuButtonHeight = 45 * sf;
    const menuButtonBg = scene.add.graphics();
    
    menuButtonBg.fillGradientStyle(0x4a5568, 0x4a5568, 0x2d3748, 0x2d3748, 1);
    menuButtonBg.fillRoundedRect(
        centerX - menuButtonWidth/2,
        scene.scale.height/2 + 110 * sf,
        menuButtonWidth,
        menuButtonHeight,
        8 * sf
    );
    
    menuButtonBg.lineStyle(2 * sf, 0x718096, 0.8);
    menuButtonBg.strokeRoundedRect(
        centerX - menuButtonWidth/2,
        scene.scale.height/2 + 110 * sf,
        menuButtonWidth,
        menuButtonHeight,
        8 * sf
    );
    
    menuButtonBg.setDepth(60);

    const menuButton = scene.add.text(centerX, scene.scale.height/2 + 132 * sf, "Back to Menu", {
        fontSize: `${18 * sf}px`,
        color: '#ffffff',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 2 * sf
    })
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setDepth(61)
        .on('pointerover', () => {
            menuButton.setScale(1.05);
            scene.se_hoverSound?.play();
        })
        .on('pointerout', () => {
            menuButton.setScale(1);
        })        .on('pointerdown', () => {
            scene.se_confirmSound?.play();
            
            // Clean up current scene first
            scene.cleanupAllElements();
            scene.scene.stop();
            
            // Ensure DungeonScene is stopped before going to MainHub
            const sceneManager = scene.scene.manager;
            if (sceneManager.isActive('DungeonScene') || sceneManager.isPaused('DungeonScene')) {
                sceneManager.stop('DungeonScene');
            }
            
            // Start MainHub
            scene.scene.start('MainHub');
        });

    // Animate elements in
    const elementsToAnimate = [overlay, panelBg, gameOverText, defeatText, scoreText, restartButtonBg, restartButton, menuButtonBg, menuButton];
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
    
    scene.persistentElements.push(overlay, panelBg, gameOverText, defeatText, scoreText, restartButtonBg, restartButton, menuButtonBg, menuButton);
}