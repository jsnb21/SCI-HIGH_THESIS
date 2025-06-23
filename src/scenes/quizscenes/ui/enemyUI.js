export function createEnemyUI(scene, centerX, boxTopY, sf) {
    // Enemy sprite above the box
    const enemySpriteY = boxTopY - 100 * sf; // Moved 20 pixels higher (was 50, now 70)
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
