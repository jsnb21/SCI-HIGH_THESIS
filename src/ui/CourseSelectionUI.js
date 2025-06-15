import { createBackButton } from '/src/components/buttons/backbutton.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class CourseSelectionUI {
    constructor(scene) {
        this.scene = scene;
        this.elements = {};
    }

    createUI({
        courseTitle = 'Selected Course',
        iconPath = '',
        description = 'Course description',
        buttonText = 'Start',
        buttonCallback = () => {},
        backCallback = null,
    }) {
        this.destroy();

        const { width, height } = this.scene.scale;
        const scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        const scaleFont = (size) => Math.round(size * scaleFactor);

        // Overlay background
        const overlay = this.scene.add.rectangle(
            width / 2, height / 2, width, height, 0xD6C8F2, 0.92
        ).setDepth(100);
        this.elements.overlay = overlay;

        // Back button
        if (typeof backCallback === 'function') {
            const { buttonBg, backButton } = createBackButton(this.scene);
            buttonBg.setScale(scaleFactor);
            backButton.setScale(scaleFactor);
            buttonBg.on('pointerdown', backCallback);
            backButton.on('pointerdown', backCallback);
            this.elements.backButtonBg = buttonBg;
            this.elements.backButton = backButton;
        }

        // Top bar
        const topBarHeight = 150 * scaleFactor;
        const topBar = this.scene.add.rectangle(
            width / 2, topBarHeight / 2, width, topBarHeight, 0x191970
        ).setDepth(101);
        this.elements.topBar = topBar;

        // Title label
        const titleText = this.scene.add.text(
            width / 2, topBarHeight / 2 - 18 * scaleFactor,
            'Selected Course:', {
                fontFamily: 'Jersey15-Regular',
                fontSize: `${scaleFont(32)}px`,
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(102);
        this.elements.titleText = titleText;

        // Course title
        const courseTitleText = this.scene.add.text(
            width / 2, topBarHeight / 2 + 28 * scaleFactor,
            courseTitle, {
                fontFamily: 'Jersey15-Regular',
                fontSize: `${scaleFont(48)}px`,
                color: '#FFD600',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(102);
        this.elements.courseTitleText = courseTitleText;

        // Icon - 40% down the screen
        const iconY = height * 0.4;
        const icon = this.scene.add.image(
            width / 2, iconY, iconPath
        ).setDisplaySize(180 * scaleFactor, 180 * scaleFactor)
         .setOrigin(0.5).setDepth(102);
        this.elements.icon = icon;

        // Start Button below icon
        const buttonY = iconY + 130 * scaleFactor;
        const baseButtonWidth = 240;
        const baseButtonHeight = 72;
        const buttonWidth = baseButtonWidth * scaleFactor;
        const buttonHeight = baseButtonHeight * scaleFactor;

        const graphics = this.scene.add.graphics({ x: 0, y: 0 }).setDepth(101);
        const drawButton = (fillColor) => {
            graphics.clear();
            graphics.fillStyle(fillColor, 1);
            graphics.lineStyle(14 * scaleFactor, 0x000000, 1);
            graphics.strokeRect(
                width / 2 - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            );
            graphics.fillRect(
                width / 2 - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            );
        };
        drawButton(0xBDBDBD);

        graphics.setInteractive(
            new Phaser.Geom.Rectangle(
                width / 2 - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        )
        .on('pointerdown', buttonCallback)
        .on('pointerover', () => drawButton(0x757575))
        .on('pointerout', () => drawButton(0xBDBDBD));
        this.elements.buttonBg = graphics;

        // Button label
        const buttonLabel = this.scene.add.text(
            width / 2, buttonY, buttonText, {
                fontFamily: 'Jersey15-Regular',
                fontSize: `${scaleFont(42)}px`,
                color: '#000000',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(102);
        this.elements.buttonLabel = buttonLabel;

        // Description - 8% below button
        const descTextY = buttonY + height * 0.20;
        const descText = this.scene.add.text(
            width / 2, descTextY, description, {
                fontFamily: 'Jersey15-Regular',
                fontSize: `${scaleFont(42)}px`,
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 800 * scaleFactor }
            }
        ).setOrigin(0.5).setDepth(102);
        descText.setStroke('#000000', 6 * scaleFactor);
        this.elements.descText = descText;

        return this.elements;
    }

    destroy() {
        Object.values(this.elements).forEach(element => {
            if (element && element.destroy) element.destroy();
        });
        this.elements = {};
    }
}
