export function renderStatsSection(scene, boxObjects, width, y) {
    let yOffset = y;

    // Example stats (replace with real data)
    const totalQuestions = 120;
    const correct = 95;
    const incorrect = 25;
    const fastestWin = "00:18";
    const avgTime = "00:32";
    const mostMissed = "Recursion";

    // a. Quiz Stats
    boxObjects.push(
        scene.add.text(width / 2, yOffset, "Quiz Stats", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '28px',
            color: '#1e90ff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 32;

    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Total Questions Answered: ${totalQuestions}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 26;

    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Correct / Incorrect: ${correct} / ${incorrect}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 26;

    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Fastest Quiz Win: ${fastestWin}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 26;

    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Avg. Time per Question: ${avgTime}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 26;

    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Most Missed Topic:`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );
    // Highlighted topic
    boxObjects.push(
        scene.add.text(width / 2 + 120, yOffset, mostMissed, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#ff4444',
            fontStyle: 'bold',
            backgroundColor: '#fffbe6',
            padding: { left: 6, right: 6, top: 2, bottom: 2 }
        }).setOrigin(0, 0.5).setDepth(12)
    );
    yOffset += 32;

    // b. Lesson Progress
    boxObjects.push(
        scene.add.text(width / 2, yOffset, "Lesson Progress", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '28px',
            color: '#1e90ff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 28;

    // Example lesson progress
    const lessons = ["Variables", "Loops", "Functions", "Recursion", "OOP"];
    const completed = [true, true, true, false, false];
    let lessonStr = lessons.map((l, i) => completed[i] ? `✔ ${l}` : `✗ ${l}`).join("   ");
    boxObjects.push(
        scene.add.text(width / 2, yOffset, lessonStr, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 20;

    // Mastered concepts
    const mastered = ["If Statements", "For Loops"];
    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Mastered: ${mastered.join(", ")}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#228B22'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 18;

    // Unlocked perks/passives
    const perks = ["Hint Booster", "Time Freeze"];
    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Unlocked Perks: ${perks.join(", ")}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#1e90ff'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 22;

    // c. Challenge Room Records
    boxObjects.push(
        scene.add.text(width / 2, yOffset, "Challenge Room Records", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '28px',
            color: '#1e90ff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 28;

    // Example challenge stats
    const puzzlesSolved = 42;
    const highestDifficulty = "Hard";
    const specialMedal = "Bug-Free Streak: 10 puzzles in a row";

    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Puzzles Solved: ${puzzlesSolved}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 16;

    boxObjects.push(
        scene.add.text(width / 2, yOffset, `Highest Difficulty Cleared: ${highestDifficulty}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#444466'
        }).setOrigin(0.5).setDepth(12)
    );
    yOffset += 16;

    boxObjects.push(
        scene.add.text(width / 2, yOffset, specialMedal, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '22px',
            color: '#ff9900',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(12)
    );
}