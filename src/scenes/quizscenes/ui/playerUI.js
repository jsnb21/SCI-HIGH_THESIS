export function createPlayerUI(scene, x, y, playerConfig, sf) {
    const container = scene.add.container(x, y);
    const playerSprite = scene.add.sprite(0, 0, 'player');
    const maxSpriteWidth = 80 * sf;
    const maxSpriteHeight = 80 * sf;
    const scaleX = maxSpriteWidth / playerSprite.width;
    const scaleY = maxSpriteHeight / playerSprite.height;
    const finalScale = Math.min(scaleX, scaleY);
    playerSprite.setScale(finalScale);

    const hpBarBg = scene.add.graphics();
    hpBarBg.fillStyle(0x444444, 1);
    hpBarBg.fillRect(-60 * sf, 50 * sf, 120 * sf, 12 * sf);

    const hpBar = scene.add.graphics();
    hpBar.fillStyle(0x00ff00, 1);
    const hpPercentage = playerConfig.currentHP / playerConfig.maxHP;
    hpBar.fillRect(-60 * sf, 50 * sf, 120 * hpPercentage * sf, 12 * sf);

    const hpText = scene.add.text(0, 70 * sf, `${playerConfig.label} HP: ${playerConfig.currentHP}/${playerConfig.maxHP}`, {
        fontSize: `${14 * sf}px`,
        color: '#ffffff',
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    container.add([playerSprite, hpBarBg, hpBar, hpText]);
    container.setData({
        maxHP: playerConfig.maxHP,
        currentHP: playerConfig.currentHP,
        hpBar,
        hpText,
        label: playerConfig.label
    });
    return container;
}