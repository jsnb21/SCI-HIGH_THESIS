export function renderFeedbackSection(scene, boxObjects, width, y) {
    // Chalkboard/Bulletin Board style feedback
    let boardY = y + 10;

    // Board background (optional, for effect)
    const board = scene.add.rectangle(width / 2, boardY + 100, 480, 220, 0x2d4739, 0.18)
        .setStrokeStyle(4, 0x1e90ff)
        .setDepth(12);
    boxObjects.push(board);

    // "What you're improving in"
    boxObjects.push(
        scene.add.text(width / 2, boardY + 20, "What you’re improving in:", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#1e90ff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(12)
    );

    // Example improvement feedback
    boxObjects.push(
        scene.add.text(width / 2, boardY + 48, "You're getting faster at conditional logic!", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '22px',
            color: '#ffffff',
            backgroundColor: '#3b6e4d',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0.5).setDepth(12)
    );

    // "What you're struggling with"
    boxObjects.push(
        scene.add.text(width / 2, boardY + 78, "What you’re struggling with:", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#ff4444',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(12)
    );

    // Example struggle feedback
    boxObjects.push(
        scene.add.text(width / 2, boardY + 106, "Nested loops are still tricky for you.", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '22px',
            color: '#fffbe6',
            backgroundColor: '#b44e3e',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0.5).setDepth(12)
    );

    // Divider line
    boxObjects.push(
        scene.add.rectangle(width / 2, boardY + 130, 340, 2, 0xffffff, 0.2).setDepth(12)
    );

    // "Next recommended lesson or area"
    boxObjects.push(
        scene.add.text(width / 2, boardY + 150, "Next recommended lesson:", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '22px',
            color: '#1e90ff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(12)
    );

    // Example recommendation
    boxObjects.push(
        scene.add.text(width / 2, boardY + 178, "Try tackling Loop Challenges in the Classroom next.", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '22px',
            color: '#fffbe6',
            backgroundColor: '#b48a3e',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0.5).setDepth(12)
    );
}