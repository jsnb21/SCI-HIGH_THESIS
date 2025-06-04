import Phaser from 'phaser';

export default class Classroom extends Phaser.Scene {
    constructor() {
        super('Classroom');
    }

    preload() {
        // Load assets for carousel icons and sounds
        this.load.image('puzzle_beginner', 'assets/img/classroom/beginner.png');
        this.load.image('puzzle_intermediate', 'assets/img/classroom/intermediate.png');
        this.load.image('puzzle_hard', 'assets/img/classroom/hard.png');
        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
    }

    create() {
        const { width, height } = this.scale;

        // Add background color
        this.cameras.main.setBackgroundColor('#f0e6d2');

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Carousel data
        const iconKeys = ['puzzle_beginner', 'puzzle_intermediate', 'puzzle_hard'];
        const puzzleInfo = [
            { heading: "Beginner Puzzle", desc: "Start with easy logic puzzles." },
            { heading: "Intermediate Puzzle", desc: "Challenge yourself with moderate puzzles." },
            { heading: "Hard Puzzle", desc: "Test your skills with the hardest puzzles!" }
        ];
        const iconCount = iconKeys.length;
        const centerX = width / 2;
        const centerY = height / 2 - 40;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIndex = 1; // Start with Intermediate selected
        this.carouselIcons = [];

        // Add carousel icons
        for (let i = 0; i < iconCount; i++) {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            const icon = this.add.image(x, centerY, iconKeys[i]).setScale(scale).setInteractive();
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.8);
            }
            this.carouselIcons.push(icon);
        }

        // Heading and description for the selected icon
        this.carouselHeading = this.add.text(centerX, centerY + 180, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '48px',
            color: '#222244',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.carouselDesc = this.add.text(centerX, centerY + 225, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '32px',
            color: '#444466'
        }).setOrigin(0.5);

        this.updateCarouselText(puzzleInfo);

        // Breathing effect for selected icon
        this.breathingTween = null;
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);

        // Keyboard navigation
        this.input.keyboard.on('keydown-LEFT', () => {
            this.se_hoverSound.play();
            this.moveCarousel(-1, puzzleInfo);
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            this.se_hoverSound.play();
            this.moveCarousel(1, puzzleInfo);
        });

        // Mouse wheel navigation
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.se_hoverSound.play();
                this.moveCarousel(1, puzzleInfo);
            } else if (deltaY < 0) {
                this.se_hoverSound.play();
                this.moveCarousel(-1, puzzleInfo);
            }
        });

        // Click to select or move carousel
        this.carouselIcons.forEach((icon, i) => {
            icon.on('pointerdown', () => {
                if (i === this.carouselIndex) {
                    this.se_confirmSound.play();
                    // TODO: Transition to the selected puzzle scene
                    // Example: this.scene.start('BeginnerPuzzleScene');
                } else {
                    this.se_hoverSound.play();
                    this.moveCarousel(i - this.carouselIndex, puzzleInfo);
                }
            });
        });

        // Back button
        const backButton = this.add.text(80, 40, 'Back', {
            font: '28px Jersey15-Regular',
            fill: '#1e90ff'
        }).setOrigin(0.5).setInteractive();

        backButton.on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('MainHub');
        });
    }

    moveCarousel(direction, puzzleInfo) {
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

        this.updateCarouselText(puzzleInfo);
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(puzzleInfo) {
        const info = puzzleInfo[this.carouselIndex];
        this.carouselHeading.setText(info.heading);
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
}