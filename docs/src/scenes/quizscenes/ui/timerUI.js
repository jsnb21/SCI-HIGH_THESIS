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
