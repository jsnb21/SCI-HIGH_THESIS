import Phaser from 'phaser';
import VNDialogueBox from '../ui/VNDialogueBox';

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
    }

    preload() {
        this.load.image('icon1', 'assets/img/mainhub/classroomIcon.png')
        this.load.image('icon2', 'assets/img/mainhub/libraryIcon.png')
        this.load.image('icon3', 'assets/img/mainhub/officeIcon.png')
        this.load.image('icon4', 'assets/img/mainhub/computerLabIcon.png')
        this.load.image('icon5', 'assets/img/mainhub/canteenIcon.png')
    }

    create() {
        this.cameras.main.setBackgroundColor('#87ceeb');

        // VN Dialogue
        this.vnBox = new VNDialogueBox(this, [
            "Where should I go next?",
            "I should go to the classroom. And ask my professor some things."
        ], () => {
            // After dialogue, show carousel
            this.createCarousel();
        });

        // Back button
        // Draw rounded rectangle
        const buttonWidth = 100;
        const buttonHeight = 44;
        const buttonRadius = 22;
        const buttonX = this.cameras.main.width - 30 - buttonWidth / 2;
        const buttonY = 20 + buttonHeight / 2;

        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0x1e90ff, 1);
        buttonBg.fillRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            buttonRadius
        );

        // Add text on top
        const backButton = this.add.text(
            buttonX,
            buttonY,
            'Back',
            {
                font: '24px Jersey15-Regular',
                fill: '#ffffff',
                // Remove backgroundColor and borderRadius
                padding: { left: 0, right: 0, top: 0, bottom: 0 }
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => {
            this.scene.start('MainMenu');
         });

        // Optional: make both respond to pointer events
        buttonBg.setInteractive(
            new Phaser.Geom.Rectangle(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }

    createCarousel() {
        // Icon keys and info
        const iconKeys = ['icon1', 'icon2', 'icon3', 'icon4', 'icon5'];
        const iconInfo = [
            { heading: "Classroom", desc: "Learn new concepts!" },
            { heading: "Library", desc: "Read and research." },
            { heading: "Office", desc: "Meet your professor." },
            { heading: "Computer Lab", desc: "Take on different courses!" },
            { heading: "Cafeteria", desc: "Take a break and eat." }
        ];
        const iconCount = iconKeys.length;
        const centerX = this.cameras.main.centerX;
        const centerY = 280;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIndex = Math.floor(iconCount / 2);
        this.carouselIcons = [];

        // Add icons
        for (let i = 0; i < iconCount; i++) {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            const icon = this.add.image(x, centerY, iconKeys[i]).setScale(scale).setInteractive();
            this.carouselIcons.push(icon);
        }

        // Heading and description text objects
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

        // Update text for the initial center icon
        this.updateCarouselText(iconInfo);

        // --- Add breathing effect ---
        this.breathingTween = null;
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);

        this.input.keyboard.on('keydown-LEFT', () => this.moveCarousel(-1, iconInfo));
        this.input.keyboard.on('keydown-RIGHT', () => this.moveCarousel(1, iconInfo));

        // Add scroll wheel support
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.moveCarousel(1, iconInfo); // Scroll down/right
            } else if (deltaY < 0) {
                this.moveCarousel(-1, iconInfo); // Scroll up/left
            }
        });

        // Optional: click to select
        this.carouselIcons.forEach((icon, i) => {
            icon.on('pointerdown', () => {
                if (i === this.carouselIndex) {
                    // Selected the center icon
                    if (iconInfo[i].heading === "Computer Lab") {
                        this.scene.start('ComputerLab');
                    }
                    // Add more scene transitions here if needed
                    // else if (iconInfo[i].heading === "Classroom") { ... }
                } else {
                    // Move carousel toward clicked icon
                    this.moveCarousel(i - this.carouselIndex, iconInfo);
                }
            });
        });
    }

    moveCarousel(direction, iconInfo) {
        const iconCount = this.carouselIcons.length;
        let newIndex = Phaser.Math.Clamp(this.carouselIndex + direction, 0, iconCount - 1);
        if (newIndex === this.carouselIndex) return;

        this.carouselIndex = newIndex;
        const centerX = this.cameras.main.centerX;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIcons.forEach((icon, i) => {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            icon.setScale(scale);
            icon.setX(x);
            // Set opacity: 1 for selected, 0.5 for others
            icon.setAlpha(i === this.carouselIndex ? 1 : 0.5);
        });

        // Update text for the new center icon
        this.updateCarouselText(iconInfo);

        // --- Update breathing effect ---
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(iconInfo) {
        const info = iconInfo[this.carouselIndex];
        this.carouselHeading.setText(info.heading);
        this.carouselDesc.setText(info.desc);
    }

    // --- Add this method to your class ---
    startBreathingEffect(icon) {
        // Stop previous tween if exists
        if (this.breathingTween) {
            this.breathingTween.stop();
            // Reset scale to normal
            icon.setScale(1.2);
        }
        // Start new breathing tween on the selected icon
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