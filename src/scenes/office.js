import Phaser from 'phaser';

export default class Office extends Phaser.Scene {
    constructor() {
        super('Office');
    }

    preload() {
        // Load icons for each section
        this.load.image('profile', 'assets/img/office/profile.png');
        this.load.image('stats', 'assets/img/office/stats.png');
        this.load.image('achievements', 'assets/img/office/achievements.png');
        this.load.image('feedback', 'assets/img/office/feedback.png');
        this.load.image('history', 'assets/img/office/history.png');
        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor('#e8f0fe');

        // Sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Carousel data
        const sectionKeys = ['profile', 'stats', 'achievements', 'feedback'];
        const sectionTitles = [
            "Student Profile",
            "Performance Stats",
            "Achievements Wall",
            "Feedback + Goals Board"
        ];
        const sectionDescs = [
            "View and edit your student profile.",
            "See your performance statistics.",
            "Check out your unlocked achievements.",
            "Read feedback and set new goals."
        ];

        const iconCount = sectionKeys.length;
        const centerX = width / 2;
        const centerY = height / 2 - 40;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIndex = 0;
        this.carouselIcons = [];

        // Add carousel icons
        for (let i = 0; i < iconCount; i++) {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            const icon = this.add.image(x, centerY, sectionKeys[i]).setScale(scale).setInteractive();
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.8);
            }
            this.carouselIcons.push(icon);
        }

        // Section title and description display
        this.carouselTitle = this.add.text(centerX, centerY + 180, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '48px',
            color: '#222244',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.carouselDesc = this.add.text(centerX, centerY + 255, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '32px',
            color: '#444466',
            wordWrap: { width: 400 },
            align: 'center'
        }).setOrigin(0.5);

        this.updateCarouselText(sectionTitles, sectionDescs);

        // Breathing effect for selected icon
        this.breathingTween = null;
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);

        // Track if box is open
        this.sectionBoxOpen = false;

        // Keyboard navigation
        this.input.keyboard.on('keydown-LEFT', () => {
            if (!this.sectionBoxOpen) {
                this.se_hoverSound.play();
                this.moveCarousel(-1, sectionTitles, sectionDescs);
            }
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            if (!this.sectionBoxOpen) {
                this.se_hoverSound.play();
                this.moveCarousel(1, sectionTitles, sectionDescs);
            }
        });

        // Mouse wheel navigation
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (!this.sectionBoxOpen) {
                if (deltaY > 0) {
                    this.se_hoverSound.play();
                    this.moveCarousel(1, sectionTitles, sectionDescs);
                } else if (deltaY < 0) {
                    this.se_hoverSound.play();
                    this.moveCarousel(-1, sectionTitles, sectionDescs);
                }
            }
        });

        // Click to select or move carousel
        this.carouselIcons.forEach((icon, i) => {
            icon.on('pointerdown', () => {
                if (this.sectionBoxOpen) return;
                if (i === this.carouselIndex) {
                    this.se_confirmSound.play();
                    this.showSectionBox(sectionKeys[i], sectionTitles[i], sectionDescs[i]);
                } else {
                    this.se_hoverSound.play();
                    this.moveCarousel(i - this.carouselIndex, sectionTitles, sectionDescs);
                }
            });
        });

        // Exit icon as back button (top-left)
        const exitIcon = this.add.rectangle(50, 50, 48, 48, 0x222222, 0.2)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(50, 50, '←', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '32px',
            color: '#1e90ff'
        }).setOrigin(0.5);

        exitIcon.on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('MainHub');
        });
        exitIcon.on('pointerover', () => {
            exitIcon.setFillStyle(0x1e90ff, 0.2);
        });
        exitIcon.on('pointerout', () => {
            exitIcon.setFillStyle(0x222222, 0.2);
        });
    }

    moveCarousel(direction, sectionTitles, sectionDescs) {
        const iconCount = this.carouselIcons.length;
        let newIndex = Phaser.Math.Clamp(this.carouselIndex + direction, 0, iconCount - 1);
        if (newIndex === this.carouselIndex) return;

        this.carouselIndex = newIndex;
        const centerX = this.scale.width / 2;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIcons.forEach((icon, i) => {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            icon.setScale(scale);
            icon.setX(x);
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.8);
            }
        });

        this.updateCarouselText(sectionTitles, sectionDescs);
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(sectionTitles, sectionDescs) {
        this.carouselTitle.setText(sectionTitles[this.carouselIndex]);
        this.carouselDesc.setText(sectionDescs[this.carouselIndex]);
    }

    startBreathingEffect(icon) {
        if (this.breathingTween) {
            this.breathingTween.stop();
            icon.setScale(1.2);
        }
        this.breathingTween = this.tweens.add({
            targets: icon,
            scale: { from: 1.2, to: 1.35 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    showSectionBox(sectionKey, sectionTitle, sectionDesc) {
        const { width, height } = this.scale;
        this.sectionBoxOpen = true;

        // --- Layout constants ---
        const boxWidth = 600;
        const boxHeight = 540;
        const BOX_PADDING_TOP = 40; // Reduced padding for more space
        const SPACING = 24;

        // Group for easy cleanup
        const boxObjects = [];

        // Dim background
        const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
            .setDepth(10);
        boxObjects.push(dim);

        // Main box
        const box = this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0xffffff, 1)
            .setStrokeStyle(4, 0x1e90ff)
            .setDepth(11);
        boxObjects.push(box);

        // Start Y at top of box, add padding
        let y = height / 2 - boxHeight / 2 + BOX_PADDING_TOP;

        // Only add section icon if not 'stats' && sectionKey !== 'profile' && sectionKey !== 'history'
        if (sectionKey !== 'stats' && sectionKey !== 'profile' && sectionKey !== 'history') {
            const sectionImg = this.add.image(width / 2, y, sectionKey)
                .setScale(0.8)
                .setDepth(12);
            boxObjects.push(sectionImg);
            y += 76;
        }

        // Title
        boxObjects.push(
            this.add.text(width / 2, y, 
                sectionKey === 'profile' || sectionKey === 'history' 
                    ? "Student Profile" 
                    : sectionTitle, 
                {
                    fontFamily: 'Jersey15-Regular',
                    fontSize: '42px',
                    color: '#1e90ff'
                }
            ).setOrigin(0.5).setDepth(12)
        );

        y += 38; // <-- Add this line if not present, or increase if needed

        // Description or custom content per section
        let contentText = sectionDesc;
        switch (sectionKey) {
            case 'profile':
            case 'history': {
                // Example data (replace with real player/session data as needed)
                const playerName = "Scott";
                const playerTitle = "The Loop Legend";
                const avatarKey = 'profile'; // Use your avatar image key here
                const completion = 0.65; // 65% completion, replace with real value

                // Avatar
                const avatar = this.add.image(width / 2, y, avatarKey)
                    .setScale(1.1)
                    .setDepth(12);
                boxObjects.push(avatar);

                y += 110;

                // Name and Title
                boxObjects.push(
                    this.add.text(width / 2, y, `${playerName} – ${playerTitle}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '32px',
                        color: '#1e90ff',
                        fontStyle: 'bold'
                    }).setOrigin(0.5).setDepth(12)
                );

                y += 50;

                // Progress Bar Label
                boxObjects.push(
                    this.add.text(width / 2, y, "Game Completion", {
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
                const progressBg = this.add.rectangle(width / 2, y, barWidth, barHeight, 0xeeeeee)
                    .setOrigin(0.5)
                    .setDepth(12);
                boxObjects.push(progressBg);

                // Progress Bar Fill
                const progressFill = this.add.rectangle(
                    barX + (completion * barWidth) / 2,
                    y,
                    completion * barWidth,
                    barHeight - 6,
                    0x1e90ff
                ).setOrigin(0.5, 0.5).setDepth(12);
                boxObjects.push(progressFill);

                // Progress Text
                boxObjects.push(
                    this.add.text(width / 2, y, `${Math.round(completion * 100)}%`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '20px',
                        color: '#ffffff'
                    }).setOrigin(0.5).setDepth(13)
                );

                y += 48;

                // --- Session History Section ---
                boxObjects.push(
                    this.add.text(width / 2, y, "Recent Session Stats", {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '28px',
                        color: '#1e90ff',
                        fontStyle: 'bold'
                    }).setOrigin(0.5).setDepth(12)
                );
                y += 32;

                // Example session stats (replace with real data)
                const enemiesDefeated = 14;
                const questionsAnswered = 37;
                const timePlayed = "00:42";
                const itemsBought = 3;
                const itemsUsed = 2;

                boxObjects.push(
                    this.add.text(width / 2, y, `Enemies Defeated: ${enemiesDefeated}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                y += 24;

                boxObjects.push(
                    this.add.text(width / 2, y, `Questions Answered: ${questionsAnswered}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                y += 24;

                boxObjects.push(
                    this.add.text(width / 2, y, `Time Played: ${timePlayed}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                y += 24;

                boxObjects.push(
                    this.add.text(width / 2, y, `Items Bought: ${itemsBought}   |   Items Used: ${itemsUsed}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );

                // Do NOT add the contentText for profile/history
                break;
            }
            case 'stats': {
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
                    this.add.text(width / 2, yOffset, "Quiz Stats", {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '28px', // header
                        color: '#1e90ff',
                        fontStyle: 'bold'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 32;

                boxObjects.push(
                    this.add.text(width / 2, yOffset, `Total Questions Answered: ${totalQuestions}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '24px', // stat line
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 26;

                boxObjects.push(
                    this.add.text(width / 2, yOffset, `Correct / Incorrect: ${correct} / ${incorrect}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '24px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 26;

                boxObjects.push(
                    this.add.text(width / 2, yOffset, `Fastest Quiz Win: ${fastestWin}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '24px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 26;

                boxObjects.push(
                    this.add.text(width / 2, yOffset, `Avg. Time per Question: ${avgTime}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '24px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 26;

                boxObjects.push(
                    this.add.text(width / 2, yOffset, `Most Missed Topic:`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '24px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                // Highlighted topic
                boxObjects.push(
                    this.add.text(width / 2 + 120, yOffset, mostMissed, {
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
                    this.add.text(width / 2, yOffset, "Lesson Progress", {
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
                    this.add.text(width / 2, yOffset, lessonStr, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '20px', // smaller for checkmarks
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 20;

                // Mastered concepts
                const mastered = ["If Statements", "For Loops"];
                boxObjects.push(
                    this.add.text(width / 2, yOffset, `Mastered: ${mastered.join(", ")}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '20px',
                        color: '#228B22'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 18;

                // Unlocked perks/passives
                const perks = ["Hint Booster", "Time Freeze"];
                boxObjects.push(
                    this.add.text(width / 2, yOffset, `Unlocked Perks: ${perks.join(", ")}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '20px',
                        color: '#1e90ff'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 22;

                // c. Challenge Room Records
                boxObjects.push(
                    this.add.text(width / 2, yOffset, "Challenge Room Records", {
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
                    this.add.text(width / 2, yOffset, `Puzzles Solved: ${puzzlesSolved}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '20px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 16;

                boxObjects.push(
                    this.add.text(width / 2, yOffset, `Highest Difficulty Cleared: ${highestDifficulty}`, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '20px',
                        color: '#444466'
                    }).setOrigin(0.5).setDepth(12)
                );
                yOffset += 16;

                boxObjects.push(
                    this.add.text(width / 2, yOffset, specialMedal, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px', // slightly larger for emphasis
                        color: '#ff9900',
                        fontStyle: 'bold'
                    }).setOrigin(0.5).setDepth(12)
                );
                break;
            }
            case 'achievements': {
                // --- Achievements Grid Placeholder ---
                const gridTop = y + 10; // This now puts the grid below the title
                const gridHeight = 320;
                const gridWidth = boxWidth - 80;
                const cellSize = 100;
                const cellPadding = 18;
                const cols = 3;
                const rows = 8; // Show more than fits to enable scrolling

                // Example placeholder achievements with different icons for testing
                const iconKeys = ['profile', 'stats', 'achievements', 'feedback', 'history'];
                const achievements = Array.from({ length: 18 }, (_, i) => ({
                    icon: iconKeys[i % iconKeys.length], // Cycle through available icons
                    label: `Badge ${i + 1}`
                }));

                // Container for grid items
                const gridContainer = this.add.container(width / 2 - gridWidth / 2, gridTop).setDepth(13);

                // Mask for scrolling
                const maskShape = this.add.rectangle(
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
                    const icon = this.add.image(x, yCell, ach.icon)
                        .setDisplaySize(64, 64)
                        .setDepth(13);
                    // Label
                    const label = this.add.text(x, yCell + 40, ach.label, {
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
                const upArrow = this.add.text(width / 2 + gridWidth / 2 - 18, gridTop + 18, '▲', arrowStyle)
                    .setOrigin(0.5).setDepth(14).setInteractive({ useHandCursor: true });
                const downArrow = this.add.text(width / 2 + gridWidth / 2 - 18, gridTop + gridHeight - 18, '▼', arrowStyle)
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

                break;
            }
            case 'feedback': {
                // Chalkboard/Bulletin Board style feedback
                let boardY = y + 10;

                // Board background (optional, for effect)
                const board = this.add.rectangle(width / 2, boardY + 100, 480, 220, 0x2d4739, 0.18)
                    .setStrokeStyle(4, 0x1e90ff)
                    .setDepth(12);
                boxObjects.push(board);

                // "What you're improving in"
                boxObjects.push(
                    this.add.text(width / 2, boardY + 20, "What you’re improving in:", {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '24px',
                        color: '#1e90ff',
                        fontStyle: 'bold'
                    }).setOrigin(0.5).setDepth(12)
                );

                // Example improvement feedback
                boxObjects.push(
                    this.add.text(width / 2, boardY + 48, "You're getting faster at conditional logic!", {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px',
                        color: '#ffffff',
                        backgroundColor: '#3b6e4d',
                        padding: { left: 8, right: 8, top: 4, bottom: 4 }
                    }).setOrigin(0.5).setDepth(12)
                );

                // "What you're struggling with"
                boxObjects.push(
                    this.add.text(width / 2, boardY + 78, "What you’re struggling with:", {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '24px',
                        color: '#ff4444',
                        fontStyle: 'bold'
                    }).setOrigin(0.5).setDepth(12)
                );

                // Example struggle feedback
                boxObjects.push(
                    this.add.text(width / 2, boardY + 106, "Nested loops are still tricky for you.", {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px',
                        color: '#fffbe6',
                        backgroundColor: '#b44e3e',
                        padding: { left: 8, right: 8, top: 4, bottom: 4 }
                    }).setOrigin(0.5).setDepth(12)
                );

                // Divider line
                boxObjects.push(
                    this.add.rectangle(width / 2, boardY + 130, 340, 2, 0xffffff, 0.2).setDepth(12)
                );

                // "Next recommended lesson or area"
                boxObjects.push(
                    this.add.text(width / 2, boardY + 150, "Next recommended lesson:", {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px',
                        color: '#1e90ff',
                        fontStyle: 'bold'
                    }).setOrigin(0.5).setDepth(12)
                );

                // Example recommendation
                boxObjects.push(
                    this.add.text(width / 2, boardY + 178, "Try tackling Loop Challenges in the Classroom next.", {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '22px',
                        color: '#fffbe6',
                        backgroundColor: '#b48a3e',
                        padding: { left: 8, right: 8, top: 4, bottom: 4 }
                    }).setOrigin(0.5).setDepth(12)
                );

                break;
            }
            case 'history':
                contentText = "Session history: dates, durations, and activities.";
                break;
            default:
                boxObjects.push(
                    this.add.text(width / 2, y, contentText, {
                        fontFamily: 'Jersey15-Regular',
                        fontSize: '24px',
                        color: '#444466',
                        wordWrap: { width: boxWidth - 60 },
                        align: 'center'
                    }).setOrigin(0.5).setDepth(12)
                );
                break;
        }

        // Close button (top right of box)
        const closeBtn = this.add.text(
            width / 2 + boxWidth / 2 - 30,
            height / 2 - boxHeight / 2 + 30,
            '✕',
            {
                fontFamily: 'Jersey15-Regular',
                fontSize: '32px',
                color: '#1e90ff',
                backgroundColor: '#fff'
            }
        ).setOrigin(0.5).setDepth(13).setInteractive({ useHandCursor: true });
        boxObjects.push(closeBtn);

        closeBtn.on('pointerdown', () => {
            this.se_confirmSound.play();
            boxObjects.forEach(obj => obj.destroy());
            this.sectionBoxOpen = false;
        });
    }
}