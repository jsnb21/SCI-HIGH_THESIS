import { createBackButton } from '/src/components/buttons/backbutton.js';

export default class CourseSelectionUI {
    constructor(scene) {
        this.scene = scene;
        this.elements = {};
    }

    createUI({
        courseTitle = 'Selected Course', 
        iconPath = '', 
        description = 'Course description', 
        buttonText = 'Start Course',
        buttonCallback = () => {},
        backCallback = null, // Optional: callback for back button
    }) {
        this.destroy();

        const { width, height } = this.scene.scale;

        // Overlay background
        const overlay = this.scene.add.rectangle(
            width / 2, height / 2, width, height, 0xD6C8F2, 0.92
        ).setDepth(100);
        this.elements.overlay = overlay;

        // Back button (using the shared component)
        if (typeof backCallback === 'function') {
            const { buttonBg, backButton } = createBackButton(this.scene);
            buttonBg.on('pointerdown', backCallback);
            backButton.on('pointerdown', backCallback);
            this.elements.backButtonBg = buttonBg;
            this.elements.backButton = backButton;
        }

        // Top bar (height increased by 10%)
        const topBarHeight = 100;
        const topBar = this.scene.add.rectangle(
            width / 2, topBarHeight / 2, width, topBarHeight, 0x191970
        ).setOrigin(0.5, 0.5).setDepth(101);
        this.elements.topBar = topBar;

        // Title text (adjust Y to match new bar height)
        const titleText = this.scene.add.text(
            width / 2, topBarHeight / 2, courseTitle, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '48px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5).setDepth(102);
        this.elements.titleText = titleText;

        // Center group Y start
        const centerY = height / 2;

        // Icon (centered, moved up)
        const icon = this.scene.add.image(
            width / 2, centerY - 120, iconPath
        ).setDisplaySize(180, 180).setOrigin(0.5, 0.5).setDepth(102);
        this.elements.icon = icon;

        // Start Button (more gap below icon)
        const buttonBg = this.scene.add.rectangle(
            width / 2, centerY + 60, 260, 60, 0x4CAF50, 1
        ).setOrigin(0.5, 0.5).setDepth(101).setInteractive({ useHandCursor: true });
        buttonBg.setStrokeStyle(2, 0x388E3C, 1);
        this.elements.buttonBg = buttonBg;

        const buttonLabel = this.scene.add.text(
            width / 2, centerY + 60, buttonText, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '28px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5).setDepth(102);
        this.elements.buttonLabel = buttonLabel;

        buttonBg.on('pointerdown', buttonCallback);
        buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x388E3C, 1));
        buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x4CAF50, 1));

        // Description background (more gap below button)
        const descBg = this.scene.add.rectangle(
            width / 2, centerY + 170, 600, 100, 0x191970, 1
        ).setOrigin(0.5, 0.5).setDepth(101);
        descBg.setStrokeStyle(2, 0xffffff, 0.15);
        this.elements.descBg = descBg;

        // Description text (centered)
        const descText = this.scene.add.text(
            width / 2, centerY + 170, description, {
                fontFamily: 'Jersey15-Regular',
                fontSize: '22px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 560 }
            }
        ).setOrigin(0.5, 0.5).setDepth(102);
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