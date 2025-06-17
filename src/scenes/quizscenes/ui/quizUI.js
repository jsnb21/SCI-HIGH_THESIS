export function createQuizBox(scene, centerX, centerY, boxWidth, boxHeight, borderRadius) {
    // Overlay
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, scene.scale.width, scene.scale.height);
    overlay.setDepth(99);
    scene.quizElements.push(overlay);

    // Quiz box (centered)
    const box = scene.add.rectangle(centerX, centerY, boxWidth, boxHeight, 0x222222, 1)
        .setOrigin(0.5)
        .setStrokeStyle(4, 0xffffff, 0.8)
        .setDepth(100);
    scene.quizElements.push(box);

    return box;
}

export function createEnemyUI(scene, centerX, boxTopY, sf) {
    // Enemy sprite above the box
    const enemySpriteY = boxTopY - 60 * sf;
    const enemySprite = scene.add.sprite(0, 0, scene.enemyConfig.spriteKey);
    const maxSpriteWidth = 120 * sf;
    const maxSpriteHeight = 90 * sf;
    const scaleX = maxSpriteWidth / enemySprite.width;
    const scaleY = maxSpriteHeight / enemySprite.height;
    const finalScale = Math.min(scaleX, scaleY);
    enemySprite.setScale(finalScale).setDepth(120);

    // HP bar above sprite
    const hpBarY = - (enemySprite.displayHeight / 2) - 18 * sf;
    const hpBarWidth = 100 * sf;
    const hpBar = scene.add.graphics().setDepth(120);
    const enemyHpPercentage = scene.enemyHPState.currentHP / scene.enemyHPState.maxHP;
    hpBar.fillStyle(0xff0000, 1);
    hpBar.fillRect(-hpBarWidth / 2, hpBarY, hpBarWidth * enemyHpPercentage, 10 * sf);

    const hpText = scene.add.text(0, hpBarY + 14 * sf, `${scene.enemyConfig.label} HP: ${scene.enemyHPState.currentHP}`, {
        fontSize: `${12 * sf}px`,
        color: '#ffffff',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(120);

    // Container for enemy UI elements (centered at centerX, enemySpriteY)
    const enemyContainer = scene.add.container(centerX, enemySpriteY, [enemySprite, hpBar, hpText]).setDepth(120);
    enemyContainer.setData({
        maxHP: scene.enemyHPState.maxHP,
        currentHP: scene.enemyHPState.currentHP,
        hpBar,
        hpText,
        label: scene.enemyConfig.label
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

    // Question text
    const questionTextY = centerY - boxHeight / 2 + 40 * sf;
    const questionText = scene.add.text(centerX, questionTextY, `Q${questionIndex + 1}: ${question}`, {
        fontSize: `${20 * sf}px`,
        fill: '#fff',
        wordWrap: { width: boxWidth - 60 * sf },
        align: 'center',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(121);

    container.add(questionText);

    // Options
    const optionWidth = boxWidth - 60 * sf;
    const optionHeight = 48 * sf;
    const optionSpacing = 18 * sf;
    const optionsStartY = questionTextY + 50 * sf;

    // Store option backgrounds for later coloring
    scene._quizOptionBgs = [];

    options.forEach((option, i) => {
        const y = optionsStartY + i * (optionHeight + optionSpacing);

        // Option background
        const optionBg = scene.add.rectangle(
            centerX,
            y,
            optionWidth,
            optionHeight,
            0x444444,
            1
        ).setOrigin(0.5).setInteractive().setDepth(121);

        // Option text with word wrap
        const optionText = scene.add.text(
            centerX,
            y,
            option,
            {
                fontSize: `${18 * sf}px`,
                color: '#fff',
                wordWrap: { width: optionWidth - 32 * sf },
                align: 'center',
                fontFamily: 'Arial'
            }
        ).setOrigin(0.5).setDepth(121);

        optionBg.on('pointerdown', () => {
            // Disable all options after selection
            scene._quizOptionBgs.forEach(bg => bg.disableInteractive());
            // Determine correct index if available
            const correctIndex = scene.questions?.[scene.currentQuestionIndex]?.correctIndex;
            if (typeof correctIndex === 'number') {
                if (i === correctIndex) {
                    optionBg.setFillStyle(0x2ecc40, 1); // Green for correct
                } else {
                    optionBg.setFillStyle(0xff4136, 1); // Red for wrong
                    // Also highlight the correct one
                    if (scene._quizOptionBgs[correctIndex]) {
                        scene._quizOptionBgs[correctIndex].setFillStyle(0x2ecc40, 1);
                    }
                }
            }
            onSelect(i);
        });
        optionBg.on('pointerover', () => optionBg.setFillStyle(0x666666, 1));
        optionBg.on('pointerout', () => {
            // Only reset color if not already marked as correct/wrong
            if (optionBg.fillColor !== 0x2ecc40 && optionBg.fillColor !== 0xff4136) {
                optionBg.setFillStyle(0x444444, 1);
            }
        });

        container.add(optionBg);
        container.add(optionText);
        scene._quizOptionBgs.push(optionBg);
    });

    scene.quizElements.push(container);
    return container;
}