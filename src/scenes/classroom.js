import Phaser from 'phaser';

export default class Classroom extends Phaser.Scene {
    constructor() {
        super('Classroom');
    }

    preload() {
        // Load character images and sounds
        this.load.image('char1', 'assets/img/chars/noah.png');
        this.load.image('char2', 'assets/img/chars/lily.png');
        this.load.image('char3', 'assets/img/classroom/char3.png');
        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
    }

    create() {
        const { width, height } = this.scale;

        // Add background color
        this.cameras.main.setBackgroundColor('#f0e6d2');

        // Sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Carousel data
        const charKeys = ['char1', 'char2', 'char3', 'char4', 'char5'];
        const charInfo = [
            { name: "Noah", desc: "A diligent student who loves coding a bit too much.", progress: 0.7 },
            { name: "Lily", desc: "A popular idol, she's talented at singing, dancing, and even web design.", progress: 0.4 },
            { name: "Damian", desc: "A creative thinker and artist.", progress: 0.9 },
            { name: "Bella", desc: "She's shy and timid, yet she's one of the top performers.", progress: 0.5 },
            { name: "Finley", desc: "He can appear cold, but he's a kind man.", progress: 0.9 }
        ];
        const iconCount = charKeys.length;
        const centerX = width / 2;
        const centerY = height / 2 - 40;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIndex = 1; // Start with the second character selected
        this.carouselIcons = [];

        // Add carousel icons
        for (let i = 0; i < iconCount; i++) {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            const icon = this.add.image(x, centerY, charKeys[i]).setScale(scale).setInteractive();
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.8);
            }
            this.carouselIcons.push(icon);
        }

        // Character name and description display
        this.carouselName = this.add.text(centerX, centerY + 180, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '48px',
            color: '#222244',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Increased Y from centerY + 225 to centerY + 255 for more space
        this.carouselDesc = this.add.text(centerX, centerY + 255, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '32px',
            color: '#444466',
            wordWrap: { width: 400 },
            align: 'center' // Center the text horizontally
        }).setOrigin(0.5);

        this.updateCarouselText(charInfo);

        // Breathing effect for selected icon
        this.breathingTween = null;
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);

        // Track if character box is open
        this.characterBoxOpen = false;

        // Keyboard navigation
        this.input.keyboard.on('keydown-LEFT', () => {
            if (!this.characterBoxOpen) {
                this.se_hoverSound.play();
                this.moveCarousel(-1, charInfo);
            }
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            if (!this.characterBoxOpen) {
                this.se_hoverSound.play();
                this.moveCarousel(1, charInfo);
            }
        });

        // Mouse wheel navigation
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (!this.characterBoxOpen) {
                if (deltaY > 0) {
                    this.se_hoverSound.play();
                    this.moveCarousel(1, charInfo);
                } else if (deltaY < 0) {
                    this.se_hoverSound.play();
                    this.moveCarousel(-1, charInfo);
                }
            }
        });

        // Click to select or move carousel
        this.carouselIcons.forEach((icon, i) => {
            icon.on('pointerdown', () => {
                if (this.characterBoxOpen) return;
                if (i === this.carouselIndex) {
                    this.se_confirmSound.play();
                    this.showCharacterBox(charInfo[i], charKeys[i]);
                } else {
                    this.se_hoverSound.play();
                    this.moveCarousel(i - this.carouselIndex, charInfo);
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

    moveCarousel(direction, charInfo) {
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

        this.updateCarouselText(charInfo);
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(charInfo) {
        const info = charInfo[this.carouselIndex];
        this.carouselName.setText(info.name);
        this.carouselDesc.setText(info.desc);
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

    showCharacterBox(charData, charKey) {
        const { width, height } = this.scale;

        // Disable carousel controls
        this.characterBoxOpen = true;

        // Dim background
        const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
            .setDepth(10);

        // Adjusted box size for all content (taller and wider)
        const boxWidth = 600;
        const boxHeight = 540;
        const box = this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0xffffff, 1)
            .setStrokeStyle(4, 0x1e90ff)
            .setDepth(11);

        // --- Layout Y positions ---
        let y = height / 2 - boxHeight / 2 + 100; // Move starting Y further down to keep icon inside the box

        // Character image in box (slightly smaller for better fit)
        const charImg = this.add.image(width / 2, y, charKey)
            .setScale(0.9)
            .setDepth(12);

        y += 70; // Space below image

        // Name
        this.add.text(width / 2, y, charData.name, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '42px',
            color: '#1e90ff'
        }).setOrigin(0.5).setDepth(12);

        y += 42; // Space below name

        // Description
        this.add.text(width / 2, y, charData.desc, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#444466',
            wordWrap: { width: 540 },
            align: 'center'
        }).setOrigin(0.5).setDepth(12);

        y += 48; // Space below description

        // "Quests" label above the progress bars
        this.add.text(width / 2, y, "Quests", {
            fontFamily: 'Jersey15-Regular',
            fontSize: '32px',
            color: '#1e90ff'
        }).setOrigin(0.5).setDepth(12);

        y += 42; // Space below "Quests"

        // --- Progress Bar 1 ---
        this.add.text(width / 2, y, `Main: ${(charData.progress * 100).toFixed(0)}%`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#222244'
        }).setOrigin(0.5).setDepth(12);

        y += 28; // Space below label

        const barBg1 = this.add.rectangle(width / 2, y, 400, 28, 0xcccccc)
            .setDepth(12);
        const barFill1 = this.add.rectangle(
            width / 2 - 200 + (charData.progress * 400) / 2,
            y,
            charData.progress * 400,
            28,
            0x1e90ff
        ).setDepth(12);

        y += 48; // Space below bar

        // --- Progress Bar 2 ---
        this.add.text(width / 2, y, `Side: 50%`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#222244'
        }).setOrigin(0.5).setDepth(12);

        y += 28;

        const barBg2 = this.add.rectangle(width / 2, y, 400, 28, 0xcccccc)
            .setDepth(12);
        const barFill2 = this.add.rectangle(
            width / 2 - 200 + (0.5 * 400) / 2,
            y,
            0.5 * 400,
            28,
            0x4caf50
        ).setDepth(12);

        y += 48;

        // --- Progress Bar 3 ---
        this.add.text(width / 2, y, `Bonus: 20%`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '20px',
            color: '#222244'
        }).setOrigin(0.5).setDepth(12);

        y += 28;

        const barBg3 = this.add.rectangle(width / 2, y, 400, 28, 0xcccccc)
            .setDepth(12);
        const barFill3 = this.add.rectangle(
            width / 2 - 200 + (0.2 * 400) / 2,
            y,
            0.2 * 400,
            28,
            0xff9800
        ).setDepth(12);

        // Close button
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

        closeBtn.on('pointerdown', () => {
            this.se_confirmSound.play();
            dim.destroy();
            box.destroy();
            charImg.destroy();
            barBg1.destroy();
            barFill1.destroy();
            barBg2.destroy();
            barFill2.destroy();
            barBg3.destroy();
            barFill3.destroy();
            closeBtn.destroy();
            // Remove all texts created for the box
            this.children.list.filter(obj => obj.depth === 12 && obj.type === 'Text').forEach(obj => obj.destroy());
            // Re-enable carousel controls
            this.characterBoxOpen = false;
        });
    }
}