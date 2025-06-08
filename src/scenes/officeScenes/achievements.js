export function renderAchievementsSection(scene, boxObjects, width, y, boxWidth) {
    const gridTop = y + 10;
    const gridHeight = 320;
    const gridWidth = boxWidth - 80;
    const cellSize = 100;
    const cellPadding = 18;
    const cols = 3;

    // Example placeholder achievements with different icons for testing
    const iconKeys = ['profile', 'stats', 'achievements', 'feedback', 'history'];
    const achievements = Array.from({ length: 18 }, (_, i) => ({
        icon: iconKeys[i % iconKeys.length],
        label: `Badge ${i + 1}`
    }));

    // Container for grid items
    const gridContainer = scene.add.container(width / 2 - gridWidth / 2, gridTop).setDepth(13);

    // Mask for scrolling
    const maskShape = scene.add.rectangle(
        width / 2,
        gridTop + gridHeight / 2,
        gridWidth,
        gridHeight,
        0xffffff,
        0
    ).setOrigin(0.5).setDepth(13);
    boxObjects.push(maskShape);

    gridContainer.setMask(maskShape.createBitmapMask());

    // Add achievements to grid
    achievements.forEach((ach, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = col * (cellSize + cellPadding) + cellSize / 2;
        const yCell = row * (cellSize + 18) + cellSize / 2;

        // Icon (placeholder)
        const icon = scene.add.image(x, yCell, ach.icon)
            .setDisplaySize(64, 64)
            .setDepth(13);
        // Label
        const label = scene.add.text(x, yCell + 40, ach.label, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '18px',
            color: '#1e90ff'
        }).setOrigin(0.5).setDepth(13);

        gridContainer.add([icon, label]);
    });

    boxObjects.push(gridContainer);

    // Scrolling logic
    let scrollY = 0;
    const maxScroll = Math.max(0, (Math.ceil(achievements.length / cols) * (cellSize + 18)) - gridHeight);

    function updateGridScroll() {
        gridContainer.y = gridTop - scrollY;
    }

    // Up/Down arrows
    const arrowStyle = {
        fontFamily: 'Jersey15-Regular',
        fontSize: '32px',
        color: '#1e90ff',
        backgroundColor: '#fff'
    };
    const upArrow = scene.add.text(width / 2 + gridWidth / 2 - 18, gridTop + 18, '▲', arrowStyle)
        .setOrigin(0.5).setDepth(14).setInteractive({ useHandCursor: true });
    const downArrow = scene.add.text(width / 2 + gridWidth / 2 - 18, gridTop + gridHeight - 18, '▼', arrowStyle)
        .setOrigin(0.5).setDepth(14).setInteractive({ useHandCursor: true });

    upArrow.on('pointerdown', () => {
        scrollY = Math.max(0, scrollY - 60);
        updateGridScroll();
    });
    downArrow.on('pointerdown', () => {
        scrollY = Math.min(maxScroll, scrollY + 60);
        updateGridScroll();
    });

    boxObjects.push(upArrow, downArrow);

    // Optional: Mouse wheel scroll inside grid
    maskShape.setInteractive();
    maskShape.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        if (deltaY > 0) {
            scrollY = Math.min(maxScroll, scrollY + 60);
        } else if (deltaY < 0) {
            scrollY = Math.max(0, scrollY - 60);
        }
        updateGridScroll();
    });
}