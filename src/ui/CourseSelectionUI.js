import { createBackButton } from '/src/components/buttons/backbutton.js';

/**
 * UI class for displaying the course selection overlay.
 * Handles rendering of overlay, top bar, course title, icon, description, and start/back buttons.
 */
export default class CourseSelectionUI {
    /**
     * @param {Phaser.Scene} scene - The Phaser scene to attach UI elements to.
     */
    constructor(scene) {
        this.scene = scene;
        this.elements = {};
    }

    /**
     * Creates the course selection UI overlay.
     * @param {Object} options - UI configuration options.
     * @param {string} options.courseTitle - The course title to display (yellow, below label).
     * @param {string} options.iconPath - Path to the course icon image.
     * @param {string} options.description - Description text for the course.
     * @param {string} options.buttonText - Text for the start button.
     * @param {Function} options.buttonCallback - Callback for the start button.
     * @param {Function|null} options.backCallback - Optional callback for the back button.
     * @returns {Object} - References to created UI elements.
     */
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

        // --- Overlay background ---
        const overlay = this.scene.add.rectangle(
            width / 2, height / 2, width, height, 0xD6C8F2, 0.92
        ).setDepth(100);
        this.elements.overlay = overlay;

        // --- Back button (optional) ---
        if (typeof backCallback === 'function') {
            const { buttonBg, backButton } = createBackButton(this.scene);
            buttonBg.on('pointerdown', backCallback);
            backButton.on('pointerdown', backCallback);
            this.elements.backButtonBg = buttonBg;
            this.elements.backButton = backButton;
        }

        // --- Top bar ---
        const topBarHeight = 150;
        const topBar = this.scene.add.rectangle(
            width / 2, topBarHeight / 2, width, topBarHeight, 0x191970
        ).setOrigin(0.5, 0.5).setDepth(101);
        this.elements.topBar = topBar;

        // --- Title label ("Selected Course:") ---
        const titleText = this.scene.add.text(
            width / 2, topBarHeight / 2 - 18,
            'Selected Course:', {
                fontFamily: 'Jersey15-Regular',
                fontSize: '32px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5).setDepth(102);
        this.elements.titleText = titleText;

        // --- Course title (yellow, below label) ---
        const courseTitleText = this.scene.add.text(
            width / 2, topBarHeight / 2 + 28,
            courseTitle, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '48px',
                color: '#FFD600',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5).setDepth(102);
        this.elements.courseTitleText = courseTitleText;

        // --- Icon (centered, above button) ---
        const centerY = height / 2;
        const iconY = centerY - 150; // Move icon higher for more space
        const icon = this.scene.add.image(
            width / 2, iconY, iconPath
        ).setDisplaySize(180, 180).setOrigin(0.5, 0.5).setDepth(102);
        this.elements.icon = icon;

        // --- Start Button (rectangle with thick outline) ---
        const buttonWidth = 320;
        const buttonHeight = 100;
        const buttonY = iconY + 180 + 50; // 180 (icon height) + 50px gap

        // Draw button background and border
        const graphics = this.scene.add.graphics({ x: 0, y: 0 }).setDepth(101);
        const drawButton = (fillColor) => {
            graphics.clear();
            graphics.fillStyle(fillColor, 1);
            graphics.lineStyle(14, 0x000000, 1);
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

        // Make button interactive (hover/click)
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

        // --- Start Button Label ---
        const buttonLabel = this.scene.add.text(
            width / 2, buttonY, buttonText, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '52px',
                color: '#000000',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5).setDepth(102);
        this.elements.buttonLabel = buttonLabel;

        // --- Description text (centered, below button) ---
        // Increase the gap below the button from 70px to 120px for more space
        const descTextY = buttonY + buttonHeight / 2 + 120; // 120px gap below button
        const descText = this.scene.add.text(
            width / 2, descTextY, description, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '42px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 800 }
            }
        ).setOrigin(0.5, 0.5).setDepth(102);
        descText.setStroke('#000000', 6);
        this.elements.descText = descText;

        return this.elements;
    }

    /**
     * Destroys all UI elements created by this instance.
     */
    destroy() {
        Object.values(this.elements).forEach(element => {
            if (element && element.destroy) element.destroy();
        });
        this.elements = {};
    }
}