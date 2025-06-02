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
        backButtonCallback = () => this.scene.scene.start('ComputerLab')
    }) {
        // Clear previous elements if they exist
        this.destroy();

        // Create all UI elements including back button
        this.createHeading(courseTitle);
        this.createIcon(iconPath);
        this.createDescription(description);
        this.createMainButton(buttonText, buttonCallback);
        this.createBackButton(backButtonCallback);

        return this.elements;
    }

    createHeading(courseTitle) {
        this.elements.heading = this.scene.add.dom(612, 30, 'h1', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '48px',
            color: '#ffffff',
            textAlign: 'center',
            backgroundColor: '#191970',
            padding: '30px',
            borderRadius: '5px' 
        }, courseTitle);
    }

    createIcon(iconPath) {
        this.elements.iconsContainer = this.scene.add.dom(306, 100, 'div', {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        });

        this.elements.iconsContainer.node.innerHTML = `
            <img src="${iconPath}" style="width: 600px; height: 600px;">
        `;
    }

    createDescription(description) {
        this.elements.description = this.scene.add.dom(612, 600, 'p', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '24px',
            color: '#ffffff',
            textAlign: 'center',
            width: '600px',
            padding: '20px',
            backgroundColor: '#191970',
            borderRadius: '5px'
        }, description);
    }

    createMainButton(buttonText, buttonCallback) {
        this.elements.button = this.scene.add.text(612, 700, buttonText, {
            font: '32px Jersey15-Regular',
            fill: '#ffffff',
            fontSize: '36px',
            padding: { left: 0, right: 0, top: 0, bottom: 0 },
            backgroundColor: '#808080',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', buttonCallback);
    }

    createBackButton(callback) {
        // Create "Back" button in the top right
        const buttonWidth = 100;
        const buttonHeight = 44;
        const buttonRadius = 22;
        const buttonX = this.scene.cameras.main.width - 30 - buttonWidth / 2;
        const buttonY = 20 + buttonHeight / 2;

        // Create button background
        const buttonBg = this.scene.add.graphics();
        buttonBg.fillStyle(0x1e90ff, 1);
        buttonBg.fillRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            buttonRadius
        );

        // Create button text
        const backButton = this.scene.add.text(
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
         .on('pointerdown', callback);

        // Make button background respond to pointer events
        buttonBg.setInteractive(
            new Phaser.Geom.Rectangle(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', callback);

        // Store references for cleanup
        this.elements.backButton = backButton;
        this.elements.backButtonBg = buttonBg;
    }

    destroy() {
        Object.values(this.elements).forEach(element => {
            if (element.destroy) {
                element.destroy();
            } else if (element.node && element.node.parentNode) {
                element.node.parentNode.removeChild(element.node);
            }
        });
        this.elements = {};
    }
}