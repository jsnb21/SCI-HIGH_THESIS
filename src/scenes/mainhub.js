import Phaser from 'phaser';
import VNDialogueBox from '../ui/VNDialogueBox';

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
    }

    preload() {
        this.load.image('MainHubBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('icon1', 'assets/img/mainhub/classroomIcon.png');
        this.load.image('icon2', 'assets/img/mainhub/libraryIcon.png');
        this.load.image('icon3', 'assets/img/mainhub/officeIcon.png');
        this.load.image('icon4', 'assets/img/mainhub/computerLabIcon.png');
        this.load.image('icon5', 'assets/img/mainhub/canteenIcon.png');

        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
    }

    create() {
        this.bg = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'MainHubBG').setOrigin(0, 0);
        this.bg.setAlpha(0.5);
        this.cameras.main.setBackgroundColor('#87ceeb');

        this.vnBox = new VNDialogueBox(this, [
            "Hmm...",
            "Where should I go next?",
            "I should go to the classroom and ask my professor on what I should do."
        ], () => {
            this.createCarousel();
        });

        const buttonWidth = 100;
        const buttonHeight = 44;
        const buttonRadius = 22;
        const buttonX = this.cameras.main.width - 30 - buttonWidth / 2;
        const buttonY = 20 + buttonHeight / 2;

        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0x1e90ff, 1);
        buttonBg.fillRoundedRect(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);

        const backButton = this.add.text(buttonX, buttonY, 'Back', {
            font: '24px Jersey15-Regular',
            fill: '#ffffff',
            padding: { left: 0, right: 0, top: 0, bottom: 0 }
        }).setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
              this.se_confirmSound.play();
              this.scene.switch('MainMenu');
          });

        buttonBg.setInteractive(
            new Phaser.Geom.Rectangle(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.switch('MainMenu');
        });

        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
    }

    createCarousel() {
        const iconKeys = ['icon1', 'icon2', 'icon3', 'icon4', 'icon5'];
        const iconInfo = [
            { heading: "Classroom", desc: "Meet your classmates!" },
            { heading: "Library", desc: "Read and research." },
            { heading: "Office", desc: "Meet your professor." },
            { heading: "Computer Lab", desc: "Take on different courses!" },
            { heading: "Cafeteria", desc: "Take a break and eat." }
        ];
        const iconCount = iconKeys.length;
        const centerX = this.cameras.main.centerX;
        const centerY = 468;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIndex = Math.floor(iconCount / 2);
        this.carouselIcons = [];

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

        this.updateCarouselText(iconInfo);
        this.breathingTween = null;
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);

        this.input.keyboard.on('keydown-LEFT', () => {
            this.se_hoverSound.play();
            this.moveCarousel(-1, iconInfo);
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            this.se_hoverSound.play();
            this.moveCarousel(1, iconInfo);
        });

        this.input.on('pointerup', (pointer) => {
            if (this.dragDistance > 50) {
                this.moveCarousel(this.dragDirection, iconInfo);
            }
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.se_hoverSound.play();
                this.moveCarousel(1, iconInfo);
            } else if (deltaY < 0) {
                this.se_hoverSound.play();
                this.moveCarousel(-1, iconInfo);
            }
        });

        this.carouselIcons.forEach((icon, i) => {
            icon.on('pointerdown', () => {
                if (i === this.carouselIndex) {
                    this.se_confirmSound.play();
                    if (iconInfo[i].heading === "Computer Lab") {
                        this.scene.switch('ComputerLab');
                    } else if (iconInfo[i].heading === "Classroom") {
                        this.scene.switch('Classroom');
                    } else if (iconInfo[i].heading === "Office") {
                        this.scene.switch('Office');
                    }
                    // Add more transitions if needed
                } else {
                    this.se_hoverSound.play();
                    this.moveCarousel(i - this.carouselIndex, iconInfo);
                }
            });
        });
    }

    moveCarousel(direction, iconInfo) {
        const iconCount = this.carouselIcons.length;
        let newIndex = (this.carouselIndex + direction + iconCount) % iconCount;
        this.carouselIndex = newIndex;
        const centerX = this.cameras.main.centerX;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIcons.forEach((icon, i) => {
            let relativePos = i - this.carouselIndex;
            if (relativePos > Math.floor(iconCount/2)) relativePos -= iconCount;
            else if (relativePos < -Math.floor(iconCount/2)) relativePos += iconCount;
            const x = centerX + relativePos * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;

            this.tweens.add({ targets: icon, x: x, scale: scale, duration: 300, ease: 'Power2' });
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                this.tweens.add({ targets: icon, alpha: 1, duration: 200 });
            } else {
                icon.setTint(0x888888);
                this.tweens.add({ targets: icon, alpha: 0.8, duration: 200 });
            }
        });

        this.updateCarouselText(iconInfo);
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(iconInfo) {
        const info = iconInfo[this.carouselIndex];
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

    update() {
        if (this.bg) {
            this.bg.tilePositionY -= 1;
        }
    }
}
