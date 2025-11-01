export function createPlayerUI(scene, x, y, playerConfig, sf) {
    const container = scene.add.container(x, y);    // Create hearts display only (no player sprite or background panel)
    const maxHearts = 5; // Convert 100 HP to 5 hearts (20 HP per heart)
    const currentHearts = Math.ceil(playerConfig.currentHP / 20);
    const heartSpacing = 55 * sf; // Increased spacing for better separation
    const heartsStartX = -(maxHearts - 1) * heartSpacing / 2;
    const heartY = 0; // Center hearts vertically in the container
    const hearts = [];

    for (let i = 0; i < maxHearts; i++) {
        const heartX = heartsStartX + i * heartSpacing;
        
        if (i < currentHearts) {
            // Active heart
            const heart = scene.add.image(heartX, heartY, 'heart')
                .setOrigin(0.5, 0.5)
                .setScale(0.08 * sf)
                .setTint(0xff4757);
                
            // Gentle pulsing animation
            scene.tweens.add({
                targets: heart,
                scaleX: 0.1 * sf,
                scaleY: 0.1 * sf,
                duration: 800 + i * 100,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
            
            hearts.push(heart);
        } else {
            // Empty heart
            const emptyHeart = scene.add.image(heartX, heartY, 'heart')
                .setOrigin(0.5, 0.5)
                .setScale(0.08 * sf)
                .setTint(0x4a5568)
                .setAlpha(0.5);
            hearts.push(emptyHeart);
        }
    }

    container.add([...hearts]);
    container.setData({
        maxHP: playerConfig.maxHP,
        currentHP: playerConfig.currentHP,
        hearts,
        label: playerConfig.label
    });

    // Ensure hearts are above other UI elements
    container.setDepth(101);

    return container;
}