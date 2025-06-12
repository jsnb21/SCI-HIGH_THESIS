import Phaser from 'phaser';
import { char1, char2, char3, char4, char5 } from '../gameManager';
import { createBackButton } from '../components/buttons/backbutton';

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
        const charObjs = [char1, char2, char3, char4, char5];
        const charInfo = [
            { 
                name: "Noah", 
                desc: "A diligent student who loves coding a bit too much.",
                progress: char1.quest1 / 100,
                side: char1.quest2 / 100,
                bonus: char1.quest3 / 100,
                questDescs: [
                    char1.quest1Desc,
                    char1.quest2Desc,
                    char1.quest3Desc
                ]
            },
            { 
                name: "Lily", 
                desc: "A popular idol, she's talented at singing, dancing, and even web design.",
                progress: char2.quest1 / 100,
                side: char2.quest2 / 100,
                bonus: char2.quest3 / 100,
                questDescs: [
                    char2.quest1Desc,
                    char2.quest2Desc,
                    char2.quest3Desc
                ]
            },
            { 
                name: "Damian", 
                desc: "A creative thinker and artist.",
                progress: char3.quest1 / 100,
                side: char3.quest2 / 100,
                bonus: char3.quest3 / 100,
                questDescs: [
                    char3.quest1Desc,
                    char3.quest2Desc,
                    char3.quest3Desc
                ]
            },
            { 
                name: "Bella", 
                desc: "She's shy and timid, yet she's one of the top performers.",
                progress: char4.quest1 / 100,
                side: char4.quest2 / 100,
                bonus: char4.quest3 / 100,
                questDescs: [
                    char4.quest1Desc,
                    char4.quest2Desc,
                    char4.quest3Desc
                ]
            },
            { 
                name: "Finley", 
                desc: "He can appear cold, but he's a kind man.",
                progress: char5.quest1 / 100,
                side: char5.quest2 / 100,
                bonus: char5.quest3 / 100,
                questDescs: [
                    char5.quest1Desc,
                    char5.quest2Desc,
                    char5.quest3Desc
                ]
            }
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

        // Back button
        createBackButton(this, 'MainHub');
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

        // --- Layout constants ---
        const boxWidth = 600;
        const boxHeight = 540;
        const BOX_PADDING_TOP = 70; // Increased from 36 to 70
        const SPACING = 32;
        const BAR_WIDTH = 400;
        const BAR_HEIGHT = 28;

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

        // Character image
        const charImg = this.add.image(width / 2, y, charKey)
            .setScale(0.8) // Slightly smaller for better fit
            .setDepth(12);
        boxObjects.push(charImg);

        y += 76; // Adjusted for new scale and margin

        // Name
        boxObjects.push(
            this.add.text(width / 2, y, charData.name, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '42px',
                color: '#1e90ff'
            }).setOrigin(0.5).setDepth(12)
        );

        y += 44;

        // Description
        boxObjects.push(
            this.add.text(width / 2, y, charData.desc, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '24px',
                color: '#444466',
                wordWrap: { width: boxWidth - 60 },
                align: 'center'
            }).setOrigin(0.5).setDepth(12)
        );

        y += 54;

        // "Quests" label
        boxObjects.push(
            this.add.text(width / 2, y, "Quests", {
                fontFamily: 'Jersey15-Regular',
                fontSize: '32px',
                color: '#1e90ff'
            }).setOrigin(0.5).setDepth(12)
        );

        y += SPACING + 4;

        // --- Progress Bars and Descriptions ---
        const questColors = [0x1e90ff, 0x4caf50, 0xff9800];
        const questLabels = ['Quest 1', 'Quest 2', 'Quest 3'];
        const questPercents = [charData.progress, charData.side, charData.bonus];

        for (let i = 0; i < 3; i++) {
            // Label
            boxObjects.push(
                this.add.text(width / 2, y, `${questLabels[i]}: ${(questPercents[i] * 100).toFixed(0)}%`, {
                    fontFamily: 'Jersey15-Regular',
                    fontSize: '20px',
                    color: '#222244'
                }).setOrigin(0.5).setDepth(12)
            );
            y += 28;

            // Progress bar background
            boxObjects.push(
                this.add.rectangle(width / 2, y, BAR_WIDTH, BAR_HEIGHT, 0xcccccc)
                    .setDepth(12)
            );
            // Progress bar fill
            boxObjects.push(
                this.add.rectangle(
                    width / 2 - BAR_WIDTH / 2 + (questPercents[i] * BAR_WIDTH) / 2,
                    y,
                    questPercents[i] * BAR_WIDTH,
                    BAR_HEIGHT,
                    questColors[i]
                ).setDepth(12)
            );

            // Description
            y += BAR_HEIGHT;
            boxObjects.push(
                this.add.text(width / 2, y, charData.questDescs[i], {
                    fontFamily: 'Jersey15-Regular',
                    fontSize: '18px',
                    color: '#444466',
                    wordWrap: { width: boxWidth - 60 }
                }).setOrigin(0.5).setDepth(12)
            );
            y += SPACING;
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
            // Re-enable carousel controls
            this.characterBoxOpen = false;
        });
    }
}