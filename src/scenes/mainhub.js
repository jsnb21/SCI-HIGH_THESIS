import Phaser from 'phaser';
import VNDialogueBox from '../ui/VNDialogueBox';

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
    }

    preload() {
        // Load background and icon images
        this.load.image('MainHubBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('icon1', 'assets/img/mainhub/classroomIcon.png');
        this.load.image('icon2', 'assets/img/mainhub/libraryIcon.png');
        this.load.image('icon3', 'assets/img/mainhub/officeIcon.png');
        this.load.image('icon4', 'assets/img/mainhub/computerLabIcon.png');
        this.load.image('icon5', 'assets/img/mainhub/canteenIcon.png');

        // Load sound effects
        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
    }

    create() {
        // Add scrolling background
        this.bg = this.add.tileSprite(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            'MainHubBG'
        ).setOrigin(0, 0);
        this.bg.setAlpha(0.5);

        // Set background color
        this.cameras.main.setBackgroundColor('#87ceeb');

        // Show visual novel dialogue, then show carousel
        this.vnBox = new VNDialogueBox(this, [
            "Hmm...",
            "Where should I go next?",
            "I should go to the classroom and ask my professor on what I should do."
        ], () => {
            this.createCarousel();
        });

        // Create "Back" button in the top right
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

        const backButton = this.add.text(
            buttonX,
            buttonY,
            'Back',
            {
                font: '24px Jersey15-Regular',
                fill: '#ffffff',
                padding: { left: 0, right: 0, top: 0, bottom: 0 }
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('MainMenu');
         });

        // Make button background respond to pointer events
        buttonBg.setInteractive(
            new Phaser.Geom.Rectangle(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.start('MainMenu');
        });

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
    }

    createCarousel() {
        // Carousel icon keys and info
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
        const centerY = 468;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIndex = Math.floor(iconCount / 2);
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

        // Show info for the initial icon
        this.updateCarouselText(iconInfo);

        // Add breathing effect to the selected icon
        this.breathingTween = null;
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);

        // Keyboard navigation for carousel
        this.input.keyboard.on('keydown-LEFT', () => {
            this.se_hoverSound.play();
            this.moveCarousel(-1, iconInfo);
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            this.se_hoverSound.play();
            this.moveCarousel(1, iconInfo);
        });

        // Mobile Support
        this.input.on('pointerup', (pointer) => {
            if (this.dragDistance > 50) {
                this.moveCarousel(this.dragDirection, iconInfo);
            }
        });

        // Mouse wheel navigation for carousel
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.se_hoverSound.play();
                this.moveCarousel(1, iconInfo);
            } else if (deltaY < 0) {
                this.se_hoverSound.play();
                this.moveCarousel(-1, iconInfo);
            }
        });

        // Click to select or move carousel
        this.carouselIcons.forEach((icon, i) => {
            icon.on('pointerdown', () => {
                if (i === this.carouselIndex) {
                    this.se_confirmSound.play();
                    // Transition to scene if center icon is selected
                    if (iconInfo[i].heading === "Computer Lab") {
                        this.scene.start('ComputerLab');
                    } else if (iconInfo[i].heading === "Classroom") {
                        this.scene.start('Classroom');
                    }
                    // Add more scene transitions here if needed
                } else {
                    this.se_hoverSound.play();
                    this.moveCarousel(i - this.carouselIndex, iconInfo);
                }
            });
        });
    }


    moveCarousel(direction, iconInfo) {
        const iconCount = this.carouselIcons.length;
        
        // Calculate new index with wrap-around
        let newIndex = (this.carouselIndex + direction + iconCount) % iconCount;
        
        this.carouselIndex = newIndex;
        const centerX = this.cameras.main.centerX;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;
    
        // Update positions for all icons
        this.carouselIcons.forEach((icon, i) => {
            // Calculate position with wrap-around logic
            let relativePos = i - this.carouselIndex;
            
            // Handle wrap-around for smooth transitions
            if (relativePos > Math.floor(iconCount/2)) {
                relativePos -= iconCount;
            } else if (relativePos < -Math.floor(iconCount/2)) {
                relativePos += iconCount;
            }
            
            const x = centerX + relativePos * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            
            // Animate the movement for smoother transition
            this.tweens.add({
                targets: icon,
                x: x,
                scale: scale,
                duration: 300,
                ease: 'Power2'
            });
    
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                this.tweens.add({
                    targets: icon,
                    alpha: 1,
                    duration: 200
                });
            } else {
                icon.setTint(0x888888);
                this.tweens.add({
                    targets: icon,
                    alpha: 0.8,
                    duration: 200
                });
            }
        });
    
        // Update heading and description
        this.updateCarouselText(iconInfo);
    
        // Update breathing effect
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(iconInfo) {
        // Update heading and description text for the selected icon
        const info = iconInfo[this.carouselIndex];
        this.carouselHeading.setText(info.heading);
        this.carouselDesc.setText(info.desc);
    }

    startBreathingEffect(icon) {
        // Animate the selected icon with a breathing effect
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
        // Scroll the background downwards
        if (this.bg) {
            this.bg.tilePositionY -= 1;
        }
    }
}