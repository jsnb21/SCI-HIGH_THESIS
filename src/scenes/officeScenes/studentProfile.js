export function renderProfileSection(scene, boxObjects, width, y) {
    // Example data (replace with real player/session data as needed)
    const playerName = "Scott";
    const playerTitle = "The Loop Legend";
    const avatarKey = 'profile'; // Use your avatar image key here
    const completion = 0.65; // 65% completion, replace with real value
    const totalTimePlayed = "03:27:15"; // Example total time played

    // Avatar
    const avatar = scene.add.image(width / 2, y, avatarKey)
        .setScale(1.1)
        .setDepth(12);
    boxObjects.push(avatar);

    y += 110;

    // Name and Title
    boxObjects.push(
        scene.add.text(width / 2, y, `${playerName} – ${playerTitle}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '32px',
            color: '#1e90ff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(12)
    );

    y += 50;

    // Progress Bar Label
    boxObjects.push(
        scene.add.text(width / 2, y, "Game Completion", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '22px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );

    y += 30;

    // Progress Bar Background
    const barWidth = 320;
    const barHeight = 28;
    const barX = width / 2 - barWidth / 2;
    const progressBg = scene.add.rectangle(width / 2, y, barWidth, barHeight, 0xeeeeee)
        .setOrigin(0.5)
        .setDepth(12);
    boxObjects.push(progressBg);

    // Progress Bar Fill
    const progressFill = scene.add.rectangle(
        barX + (completion * barWidth) / 2,
        y,
        completion * barWidth,
        barHeight - 6,
        0x1e90ff
    ).setOrigin(0.5, 0.5).setDepth(12);
    boxObjects.push(progressFill);

    // Progress Text
    boxObjects.push(
        scene.add.text(width / 2, y, `${Math.round(completion * 100)}%`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(13)
    );

    y += 48;

    // Total Time Played
    boxObjects.push(
        scene.add.text(width / 2, y, `Total Time Played: ${totalTimePlayed}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '22px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );

    // Return the updated y if needed
    return y;
}