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
    }) {
        // Clear previous elements if they exist
        this.destroy();

        // Create all UI elements including back button
        this.createHeading(courseTitle);
        this.createIcon(iconPath);
        this.createDescription(description);
        this.createMainButton(buttonText, buttonCallback);

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
        this.elements.iconsContainer = this.scene.add.dom(406, 180, 'div', {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        });

        this.elements.iconsContainer.node.innerHTML = `
            <img src="${iconPath}" style="width: 400px; height: 400px;">
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