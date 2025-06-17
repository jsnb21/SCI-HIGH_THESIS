export function createQuizBox(scene, centerX, centerY, boxWidth, boxHeight, radius) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x222222, 1);
    graphics.fillRoundedRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight, radius);
    return graphics;
}

export function createEnemyUI(scene, centerX, centerY, boxHeight, sf) {
    const enemySpriteY = centerY - boxHeight / 2 + 90 * sf;
    const enemySprite = scene.add.sprite(centerX, enemySpriteY, scene.enemyConfig.spriteKey);
    const maxSpriteWidth = 120 * sf;
    const maxSpriteHeight = 90 * sf;
    const scaleX = maxSpriteWidth / enemySprite.width;
    const scaleY = maxSpriteHeight / enemySprite.height;
    const finalScale = Math.min(scaleX, scaleY);
    enemySprite.setScale(finalScale);

    const hpBar = scene.add.graphics();
    hpBar.fillStyle(0xff0000, 1);
    const enemyHpPercentage = scene.enemyHPState.currentHP / scene.enemyHPState.maxHP;
    const hpBarWidth = 100 * sf;
    hpBar.fillRect(centerX - hpBarWidth / 2, enemySpriteY - 50 * sf, hpBarWidth * enemyHpPercentage, 10 * sf);

    const hpText = scene.add.text(centerX, enemySpriteY - 35 * sf, `${scene.enemyConfig.label} HP: ${scene.enemyHPState.currentHP}`, {
        fontSize: `${12 * sf}px`,
        color: '#ffffff',
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    const enemyContainer = scene.add.container(0, 0);
    enemyContainer.add([hpBar, hpText]);
    enemyContainer.setData({
        maxHP: scene.enemyHPState.maxHP,
        currentHP: scene.enemyHPState.currentHP,
        hpBar,
        hpText,
        label: scene.enemyConfig.label
    });

    const enemyBottomY = enemySpriteY + (enemySprite.displayHeight / 2);

    scene.enemyContainer = enemyContainer;
    return { enemySprite, enemyContainer, enemyBottomY };
}

export function createQuestionText(scene, centerX, questionTextY, questionIndex, question, sf) {
    return scene.add.text(centerX, questionTextY, `Q${questionIndex + 1}: ${question}`, {
        fontSize: `${20 * sf}px`,
        fill: '#fff',
        wordWrap: { width: 500 * sf },
        align: 'center',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
}

export function createOptions(scene, centerX, optionsStartY, options, sf, onSelect) {
    const optionSpacingY = 55 * sf;
    const optionSpacingX = 170 * sf;
    const optionsPerRow = 2;
    const optionFontSize = 18 * sf;
    const optionWidth = 200 * sf;
    const elements = [];
    options.forEach((option, index) => {
        const row = Math.floor(index / optionsPerRow);
        const col = index % optionsPerRow;
        const x = centerX - optionSpacingX / 2 + col * optionSpacingX;
        const y = optionsStartY + row * optionSpacingY;
        const optionText = scene.add.text(x, y, option, {
            fontSize: `${optionFontSize}px`,
            backgroundColor: '#444',
            padding: { left: 12 * sf, right: 12 * sf, top: 8 * sf, bottom: 8 * sf },
            align: 'center',
            fontFamily: 'Arial',
            fixedWidth: optionWidth
        })
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on('pointerover', () => {
                optionText.setStyle({ backgroundColor: '#666666' });
                scene.se_hoverSound?.play();
            })
            .on('pointerout', () => {
                optionText.setStyle({ backgroundColor: '#444444' });
            })
            .on('pointerdown', () => {
                scene.se_confirmSound?.play();
                onSelect(index);
            });
        elements.push(optionText);
    });
    return elements;
}