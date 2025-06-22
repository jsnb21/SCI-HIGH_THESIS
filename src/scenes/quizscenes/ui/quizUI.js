export function createQuizBox(scene, centerX, centerY, boxWidth, boxHeight, borderRadius) {
    // Enhanced overlay with gradient
    const overlay = scene.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x000000, 0x1a1a2e, 0x1a1a2e, 0.8);
    overlay.fillRect(0, 0, scene.scale.width, scene.scale.height);
    overlay.setDepth(99);
    scene.quizElements.push(overlay);

    // Enhanced quiz box with modern styling
    const boxBg = scene.add.graphics();
    
    // Outer glow
    boxBg.fillStyle(0x63b3ed, 0.2);
    boxBg.fillRoundedRect(
        centerX - boxWidth/2 - 8,
        centerY - boxHeight/2 - 8,
        boxWidth + 16,
        boxHeight + 16,
        borderRadius + 4
    );
    
    // Main background with gradient
    boxBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
    boxBg.fillRoundedRect(
        centerX - boxWidth/2,
        centerY - boxHeight/2,
        boxWidth,
        boxHeight,
        borderRadius
    );
    
    // Glowing border
    boxBg.lineStyle(4, 0x63b3ed, 0.8);
    boxBg.strokeRoundedRect(
        centerX - boxWidth/2,
        centerY - boxHeight/2,
        boxWidth,
        boxHeight,
        borderRadius
    );
    
    // Inner highlight
    boxBg.lineStyle(2, 0xffd700, 0.4);
    boxBg.strokeRoundedRect(
        centerX - boxWidth/2 + 4,
        centerY - boxHeight/2 + 4,
        boxWidth - 8,
        boxHeight - 8,
        borderRadius - 4
    );

    boxBg.setDepth(100);
    scene.quizElements.push(boxBg);

    return boxBg;
}

export function createEnemyUI(scene, centerX, boxTopY, sf) {
    // Enemy sprite above the box
    const enemySpriteY = boxTopY - 80 * sf;
    const enemySprite = scene.add.sprite(0, 0, scene.enemyConfig.spriteKey);
    const maxSpriteWidth = 120 * sf;
    const maxSpriteHeight = 90 * sf;
    const scaleX = maxSpriteWidth / enemySprite.width;
    const scaleY = maxSpriteHeight / enemySprite.height;
    const finalScale = Math.min(scaleX, scaleY);
    enemySprite.setScale(finalScale).setDepth(120);

    // Enhanced enemy glow effect
    const enemyGlow = scene.add.circle(0, 0, maxSpriteWidth * 0.6, 0xff4757, 0.2).setDepth(119);

    // Enhanced HP bar background
    const hpBarY = - (enemySprite.displayHeight / 2) - 25 * sf;
    const hpBarWidth = 120 * sf;
    const hpBarHeight = 12 * sf;
    
    const hpBarBg = scene.add.graphics().setDepth(120);
    hpBarBg.fillStyle(0x2d3748, 0.9);
    hpBarBg.fillRoundedRect(-hpBarWidth / 2, hpBarY, hpBarWidth, hpBarHeight, 6 * sf);
    hpBarBg.lineStyle(2 * sf, 0x4a5568, 0.8);
    hpBarBg.strokeRoundedRect(-hpBarWidth / 2, hpBarY, hpBarWidth, hpBarHeight, 6 * sf);

    // Enhanced HP bar with gradient
    const hpBar = scene.add.graphics().setDepth(121);
    const enemyHpPercentage = scene.enemyHPState.currentHP / scene.enemyHPState.maxHP;
    hpBar.fillGradientStyle(0xff4757, 0xff4757, 0xff6b7d, 0xff6b7d, 1);
    hpBar.fillRoundedRect(-hpBarWidth / 2 + 2 * sf, hpBarY + 2 * sf, (hpBarWidth - 4 * sf) * enemyHpPercentage, hpBarHeight - 4 * sf, 4 * sf);

    // Enhanced enemy label
    const hpText = scene.add.text(0, hpBarY + 20 * sf, `${scene.enemyConfig.label}`, {
        fontSize: `${14 * sf}px`,
        color: '#ffd700',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 2 * sf
    }).setOrigin(0.5).setDepth(120);

    // Container for enemy UI elements (centered at centerX, enemySpriteY)
    const enemyContainer = scene.add.container(centerX, enemySpriteY, [enemyGlow, enemySprite, hpBarBg, hpBar, hpText]).setDepth(120);
    enemyContainer.setData({
        maxHP: scene.enemyHPState.maxHP,
        currentHP: scene.enemyHPState.currentHP,
        hpBar,
        hpBarBg,
        hpText,
        label: scene.enemyConfig.label
    });

    // Add floating animation to enemy
    scene.tweens.add({
        targets: enemyContainer,
        y: enemySpriteY + 5 * sf,
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });

    scene.quizElements.push(enemyContainer);
    return { enemySprite, hpBar, hpText, enemyContainer };
}

export function createTimerText(scene, boxRightX, boxTopY, time, sf) {
    // Timer above the box, right-aligned to the box
    const timerText = scene.add.text(
        boxRightX - 16 * sf, // 16px padding from right edge of box
        boxTopY - 38 * sf,   // 38px above the box
        `Time: ${time}`,
        {
            fontSize: `${22 * sf}px`,
            color: '#fff',
            backgroundColor: '#111',
            padding: { left: 12, right: 12, top: 4, bottom: 4 },
            fontFamily: 'Arial'
        }
    ).setOrigin(1, 0).setDepth(130);
    scene.quizElements.push(timerText);
    return timerText;
}

export function createQuestionAndOptions(scene, centerX, centerY, boxWidth, boxHeight, questionIndex, question, options, sf, onSelect) {
    // Container for question and options
    const container = scene.add.container(0, 0).setDepth(121);

    // Enhanced question text with background
    const questionTextY = centerY - boxHeight / 2 + 50 * sf;
    
    // Question background panel
    const questionBg = scene.add.graphics();
    questionBg.fillStyle(0x2d3748, 0.8);
    questionBg.fillRoundedRect(
        centerX - (boxWidth - 40 * sf) / 2,
        questionTextY - 25 * sf,
        boxWidth - 40 * sf,
        50 * sf,
        8 * sf
    );
    questionBg.lineStyle(1 * sf, 0x63b3ed, 0.6);
    questionBg.strokeRoundedRect(
        centerX - (boxWidth - 40 * sf) / 2,
        questionTextY - 25 * sf,
        boxWidth - 40 * sf,
        50 * sf,
        8 * sf
    );
    
    const questionText = scene.add.text(centerX, questionTextY, `Q${questionIndex + 1}: ${question}`, {
        fontSize: `${18 * sf}px`,
        fill: '#ffd700',
        wordWrap: { width: boxWidth - 80 * sf },
        align: 'center',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 1 * sf
    }).setOrigin(0.5).setDepth(121);

    container.add(questionBg);
    container.add(questionText);

    // Enhanced options styling
    const optionWidth = boxWidth - 80 * sf;
    const optionHeight = 48 * sf;
    const optionSpacing = 12 * sf;
    const optionsStartY = questionTextY + 60 * sf;

    // Store option backgrounds for later coloring
    scene._quizOptionBgs = [];

    options.forEach((option, i) => {
        const y = optionsStartY + i * (optionHeight + optionSpacing);

        // Enhanced option background with gradient
        const optionBg = scene.add.graphics().setDepth(121);
        
        // Base gradient
        optionBg.fillGradientStyle(0x4a5568, 0x4a5568, 0x2d3748, 0x2d3748, 0.9);
        optionBg.fillRoundedRect(
            centerX - optionWidth / 2,
            y - optionHeight / 2,
            optionWidth,
            optionHeight,
            8 * sf
        );
        
        // Border
        optionBg.lineStyle(2 * sf, 0x718096, 0.8);
        optionBg.strokeRoundedRect(
            centerX - optionWidth / 2,
            y - optionHeight / 2,
            optionWidth,
            optionHeight,
            8 * sf
        );

        // Interactive area
        const optionInteractive = scene.add.rectangle(
            centerX,
            y,
            optionWidth,
            optionHeight,
            0x000000,
            0
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(122);

        // Enhanced option text
        const optionText = scene.add.text(
            centerX,
            y,
            option,
            {
                fontSize: `${16 * sf}px`,
                color: '#ffffff',
                wordWrap: { width: optionWidth - 32 * sf },
                align: 'center',
                fontFamily: 'Caprasimo-Regular',
                stroke: '#1a1a2e',
                strokeThickness: 1 * sf
            }
        ).setOrigin(0.5).setDepth(122);

        optionInteractive.on('pointerdown', () => {
            // Disable all options after selection
            scene._quizOptionBgs.forEach(bg => bg.removeInteractive());
            // Determine correct index if available
            const correctIndex = scene.questions?.[scene.currentQuestionIndex]?.correctIndex;
            if (typeof correctIndex === 'number') {
                if (i === correctIndex) {
                    // Green gradient for correct
                    optionBg.clear();
                    optionBg.fillGradientStyle(0x2ecc40, 0x2ecc40, 0x27ae60, 0x27ae60, 1);
                    optionBg.fillRoundedRect(
                        centerX - optionWidth / 2,
                        y - optionHeight / 2,
                        optionWidth,
                        optionHeight,
                        8 * sf
                    );
                    optionBg.lineStyle(2 * sf, 0x00ff00, 0.8);
                    optionBg.strokeRoundedRect(
                        centerX - optionWidth / 2,
                        y - optionHeight / 2,
                        optionWidth,
                        optionHeight,
                        8 * sf
                    );
                } else {
                    // Red gradient for wrong
                    optionBg.clear();
                    optionBg.fillGradientStyle(0xff4136, 0xff4136, 0xe74c3c, 0xe74c3c, 1);
                    optionBg.fillRoundedRect(
                        centerX - optionWidth / 2,
                        y - optionHeight / 2,
                        optionWidth,
                        optionHeight,
                        8 * sf
                    );
                    optionBg.lineStyle(2 * sf, 0xff0000, 0.8);
                    optionBg.strokeRoundedRect(
                        centerX - optionWidth / 2,
                        y - optionHeight / 2,
                        optionWidth,
                        optionHeight,
                        8 * sf
                    );
                    
                    // Also highlight the correct one
                    if (scene._quizOptionBgs[correctIndex]) {
                        const correctBg = scene._quizOptionBgs[correctIndex];
                        correctBg.clear();
                        correctBg.fillGradientStyle(0x2ecc40, 0x2ecc40, 0x27ae60, 0x27ae60, 1);
                        correctBg.fillRoundedRect(
                            centerX - optionWidth / 2,
                            optionsStartY + correctIndex * (optionHeight + optionSpacing) - optionHeight / 2,
                            optionWidth,
                            optionHeight,
                            8 * sf
                        );
                        correctBg.lineStyle(2 * sf, 0x00ff00, 0.8);
                        correctBg.strokeRoundedRect(
                            centerX - optionWidth / 2,
                            optionsStartY + correctIndex * (optionHeight + optionSpacing) - optionHeight / 2,
                            optionWidth,
                            optionHeight,
                            8 * sf
                        );
                    }
                }
            }
            onSelect(i);
        });

        optionInteractive.on('pointerover', () => {
            optionText.setScale(1.05);
            // Enhanced hover effect
            optionBg.clear();
            optionBg.fillGradientStyle(0x63b3ed, 0x63b3ed, 0x4299e1, 0x4299e1, 0.9);
            optionBg.fillRoundedRect(
                centerX - optionWidth / 2,
                y - optionHeight / 2,
                optionWidth,
                optionHeight,
                8 * sf
            );
            optionBg.lineStyle(2 * sf, 0x90cdf4, 1);
            optionBg.strokeRoundedRect(
                centerX - optionWidth / 2,
                y - optionHeight / 2,
                optionWidth,
                optionHeight,
                8 * sf
            );
        });

        optionInteractive.on('pointerout', () => {
            optionText.setScale(1);
            // Reset to default if not answered
            if (optionBg.fillColor !== 0x2ecc40 && optionBg.fillColor !== 0xff4136) {
                optionBg.clear();
                optionBg.fillGradientStyle(0x4a5568, 0x4a5568, 0x2d3748, 0x2d3748, 0.9);
                optionBg.fillRoundedRect(
                    centerX - optionWidth / 2,
                    y - optionHeight / 2,
                    optionWidth,
                    optionHeight,
                    8 * sf
                );
                optionBg.lineStyle(2 * sf, 0x718096, 0.8);
                optionBg.strokeRoundedRect(
                    centerX - optionWidth / 2,
                    y - optionHeight / 2,
                    optionWidth,
                    optionHeight,
                    8 * sf
                );
            }
        });

        container.add(optionBg);
        container.add(optionInteractive);
        container.add(optionText);
        scene._quizOptionBgs.push(optionBg);
    });

    scene.quizElements.push(container);
    return container;
}