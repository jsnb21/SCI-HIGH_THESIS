import { createBackButton } from '/src/components/buttons/backbutton.js';
import { createDebouncedClickHandler } from '/src/utils/mobileUtils.js';

const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class CourseSelectionUI {
    constructor(scene) {
        this.scene = scene;
        this.elements = {};
    }    createUI({
        courseTitle = 'Selected Course',
        iconPath = '',
        description = 'Course description',
        buttonText = 'Start',
        buttonCallback = () => {},
        backCallback = null,
    }) {
        this.destroy();        const { width, height } = this.scene.scale;
        const scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        const scaleFont = (size) => Math.round(size * scaleFactor);

        // Get actual camera dimensions for full coverage
        const actualWidth = this.scene.cameras ? this.scene.cameras.main.width : width;
        const actualHeight = this.scene.cameras ? this.scene.cameras.main.height : height;

        // Modern dark overlay with full coverage
        const overlay = this.scene.add.rectangle(
            actualWidth / 2, actualHeight / 2, 
            actualWidth + 10, actualHeight + 10, // Add extra pixels for full coverage
            0x0f0f23, 0.95
        ).setDepth(100);
        this.elements.overlay = overlay;

        // Back button with modern styling
        if (typeof backCallback === 'function') {
            const backButtonSize = 48 * scaleFactor;
            const backButtonBg = this.scene.add.circle(
                50 * scaleFactor, 50 * scaleFactor, backButtonSize / 2, 0x2d3748, 0.9
            ).setDepth(103).setInteractive({ useHandCursor: true });
            
            const backIcon = this.scene.add.text(
                50 * scaleFactor, 50 * scaleFactor, '←', {
                    fontFamily: 'Arial',
                    fontSize: `${scaleFont(28)}px`,
                    color: '#ffffff'
                }
            ).setOrigin(0.5).setDepth(104);

            backButtonBg.on('pointerdown', createDebouncedClickHandler(backCallback, 300));
            backButtonBg.on('pointerover', () => backButtonBg.setFillStyle(0x4a5568));
            backButtonBg.on('pointerout', () => backButtonBg.setFillStyle(0x2d3748));
            
            this.elements.backButtonBg = backButtonBg;
            this.elements.backIcon = backIcon;
        }

        // Modern card container
        const cardWidth = Math.min(600 * scaleFactor, width * 0.9);
        const cardHeight = Math.min(700 * scaleFactor, height * 0.85);
        const cardX = width / 2;
        const cardY = height / 2;

        // Card background with subtle shadow
        const cardShadow = this.scene.add.rectangle(
            cardX + 4 * scaleFactor, cardY + 4 * scaleFactor, 
            cardWidth, cardHeight, 0x000000, 0.2
        ).setDepth(101);
        this.elements.cardShadow = cardShadow;

        const card = this.scene.add.rectangle(
            cardX, cardY, cardWidth, cardHeight, 0x1a202c
        ).setDepth(102);
        this.elements.card = card;

        // Card border with gradient effect
        const cardBorder = this.scene.add.graphics().setDepth(102);
        cardBorder.lineStyle(2 * scaleFactor, 0x4299e1, 1);
        cardBorder.strokeRoundedRect(
            cardX - cardWidth / 2, cardY - cardHeight / 2,
            cardWidth, cardHeight, 12 * scaleFactor
        );
        this.elements.cardBorder = cardBorder;

        // Modern header section
        const headerY = cardY - cardHeight / 2 + 80 * scaleFactor;
        
        // Course category badge
        const categoryBadge = this.scene.add.rectangle(
            cardX, headerY - 30 * scaleFactor, 120 * scaleFactor, 24 * scaleFactor, 0x4299e1
        ).setDepth(103);
        this.elements.categoryBadge = categoryBadge;
        
        const categoryText = this.scene.add.text(
            cardX, headerY - 30 * scaleFactor, 'COURSE', {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(14)}px`,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setDepth(104);
        this.elements.categoryText = categoryText;

        // Modern course title
        const courseTitleText = this.scene.add.text(
            cardX, headerY + 20 * scaleFactor, courseTitle, {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(36)}px`,
                color: '#ffffff',
                fontStyle: 'bold',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(103);
        this.elements.courseTitleText = courseTitleText;

        // Modern icon with glow effect
        const iconY = cardY - 50 * scaleFactor;
        const iconGlow = this.scene.add.circle(
            cardX, iconY, 100 * scaleFactor, 0x4299e1, 0.3
        ).setDepth(102);
        this.elements.iconGlow = iconGlow;

        const icon = this.scene.add.image(cardX, iconY, iconPath)
            .setDisplaySize(160 * scaleFactor, 160 * scaleFactor)
            .setOrigin(0.5).setDepth(103);
        this.elements.icon = icon;

        // Modern gradient button
        const buttonY = cardY + 120 * scaleFactor;
        const buttonWidth = 280 * scaleFactor;
        const buttonHeight = 56 * scaleFactor;

        const buttonGraphics = this.scene.add.graphics().setDepth(103);
        const drawModernButton = (isHovered = false) => {
            buttonGraphics.clear();
            
            // Button background with gradient
            const color = isHovered ? 0x3182ce : 0x4299e1;
            buttonGraphics.fillStyle(color, 1);
            buttonGraphics.fillRoundedRect(
                cardX - buttonWidth / 2, buttonY - buttonHeight / 2,
                buttonWidth, buttonHeight, 28 * scaleFactor
            );
            
            // Subtle border
            buttonGraphics.lineStyle(1 * scaleFactor, 0x63b3ed, 0.8);
            buttonGraphics.strokeRoundedRect(
                cardX - buttonWidth / 2, buttonY - buttonHeight / 2,
                buttonWidth, buttonHeight, 28 * scaleFactor
            );
        };
        drawModernButton();

        buttonGraphics.setInteractive(
            new Phaser.Geom.Rectangle(
                cardX - buttonWidth / 2, buttonY - buttonHeight / 2,
                buttonWidth, buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        )
        .on('pointerdown', createDebouncedClickHandler(buttonCallback, 300))
        .on('pointerover', () => drawModernButton(true))
        .on('pointerout', () => drawModernButton(false));
        this.elements.buttonGraphics = buttonGraphics;

        // Modern button text
        const buttonLabel = this.scene.add.text(
            cardX, buttonY, buttonText, {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(18)}px`,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setDepth(104);
        this.elements.buttonLabel = buttonLabel;

        // Modern description with better typography
        const descY = cardY + 200 * scaleFactor;
        const descText = this.scene.add.text(
            cardX, descY, description, {
                fontFamily: 'Arial',
                fontSize: `${scaleFont(16)}px`,
                color: '#a0aec0',
                align: 'center',
                wordWrap: { width: cardWidth * 0.8 },
                lineSpacing: 8 * scaleFactor
            }
        ).setOrigin(0.5).setDepth(103);
        this.elements.descText = descText;

        // Add subtle animations
        this.scene.tweens.add({
            targets: [card, cardBorder],
            scaleX: { from: 0.8, to: 1 },
            scaleY: { from: 0.8, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 400,
            ease: 'Back.easeOut'
        });

        this.scene.tweens.add({
            targets: iconGlow,
            scaleX: { from: 0.8, to: 1.1 },
            scaleY: { from: 0.8, to: 1.1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return this.elements;
    }

    destroy() {
        Object.values(this.elements).forEach(element => {
            if (element && element.destroy) element.destroy();
        });
        this.elements = {};
    }
}
