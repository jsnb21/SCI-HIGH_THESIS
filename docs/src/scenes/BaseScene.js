import Phaser from 'phaser';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getResponsivePosition,
    createResponsiveTextStyle,
    createResponsiveButton,
    getSafeArea,
    adjustForMobileOrientation
} from '../utils/mobileUtils.js';

/**
 * Base scene class with mobile scaling utilities
 * All scenes should extend this class for consistent mobile support
 */
export default class BaseScene extends Phaser.Scene {
    constructor(key) {
        super(key);
        this.scaleInfo = null;
        this.safeArea = null;
        this.mobileElements = [];
    }

    create() {
        // Initialize scaling information
        this.updateScaleInfo();
        
        // Listen for resize events
        this.scale.on('resize', this.onResize, this);
        
        // Call the child scene's createMobile method if it exists
        if (this.createMobile) {
            this.createMobile();
        }
    }

    /**
     * Update scaling information when screen size changes
     */
    updateScaleInfo() {
        this.scaleInfo = getScaleInfo(this);
        this.safeArea = getSafeArea(this.scaleInfo);
    }

    /**
     * Handle window resize events
     */
    onResize(gameSize, baseSize, displaySize, resolution) {
        this.updateScaleInfo();
        
        // Adjust mobile elements for new orientation
        if (this.mobileElements.length > 0) {
            adjustForMobileOrientation(this.scaleInfo, this.mobileElements);
        }
        
        // Call child scene's resize handler if it exists
        if (this.onMobileResize) {
            this.onMobileResize(this.scaleInfo);
        }
    }

    /**
     * Create a mobile-responsive text element
     */
    createMobileText(x, y, text, baseFontSize, additionalStyle = {}) {
        const style = createResponsiveTextStyle(baseFontSize, this.scaleInfo, additionalStyle);
        const textElement = this.add.text(x, y, text, style);
        this.mobileElements.push(textElement);
        return textElement;
    }

    /**
     * Create a mobile-responsive button
     */
    createMobileButton(x, y, baseWidth, baseHeight, text, baseFontSize, callback) {
        const button = createResponsiveButton(
            this, x, y, baseWidth, baseHeight, text, baseFontSize, callback
        );
        this.mobileElements.push(button.background);
        this.mobileElements.push(button.text);
        return button;
    }

    /**
     * Get a responsive position based on screen position and offset
     */
    getMobilePosition(position, offset = { x: 0, y: 0 }) {
        return getResponsivePosition(this.scaleInfo, position, offset);
    }

    /**
     * Scale a dimension for mobile
     */
    scaleMobile(dimension) {
        return scaleDimension(dimension, this.scaleInfo);
    }

    /**
     * Scale font size for mobile
     */
    scaleMobileFont(fontSize) {
        return scaleFontSize(fontSize, this.scaleInfo);
    }

    /**
     * Create a mobile-responsive background
     */
    createMobileBackground(key, tint = null) {
        const { width, height } = this.scaleInfo;
        const bg = this.add.tileSprite(0, 0, width, height, key).setOrigin(0, 0);
        if (tint) bg.setTint(tint);
        return bg;
    }

    /**
     * Create a mobile-responsive centered container
     */
    createMobileCenteredContainer(baseWidth, baseHeight) {
        const { width, height } = this.scaleInfo;
        const scaledWidth = this.scaleMobile(baseWidth);
        const scaledHeight = this.scaleMobile(baseHeight);
        
        const container = this.add.container(width / 2, height / 2);
        
        // Add a background for the container if needed
        const bg = this.add.rectangle(0, 0, scaledWidth, scaledHeight, 0x000000, 0.8);
        bg.setStrokeStyle(2, 0xffffff, 0.5);
        container.add(bg);
        
        this.mobileElements.push(container);
        return container;
    }

    /**
     * Create a mobile-responsive UI panel
     */
    createMobilePanel(x, y, baseWidth, baseHeight, color = 0x000000, alpha = 0.8) {
        const scaledWidth = this.scaleMobile(baseWidth);
        const scaledHeight = this.scaleMobile(baseHeight);
        
        const panel = this.add.rectangle(x, y, scaledWidth, scaledHeight, color, alpha);
        panel.setStrokeStyle(this.scaleMobile(2), 0xffffff, 0.5);
        
        this.mobileElements.push(panel);
        return panel;
    }

    /**
     * Add mobile touch controls for common actions
     */
    addMobileTouchControls() {
        if (this.scaleInfo.isMobile) {
            // Add touch-friendly back button if needed
            if (this.scene.key !== 'MainMenu') {
                const backPos = this.getMobilePosition('top-left', { x: 60, y: 60 });
                const backButton = this.createMobileButton(
                    backPos.x, backPos.y, 100, 40, '← Back', 16,
                    () => this.handleBackAction()
                );
                backButton.background.setDepth(1000);
                backButton.text.setDepth(1001);
            }
        }
    }

    /**
     * Handle back action - override in child scenes
     */
    handleBackAction() {
        // Default behavior - go to previous scene or main menu
        if (this.scene.key !== 'MainMenu') {
            this.scene.start('MainMenu');
        }
    }

    /**
     * Show mobile-friendly loading indicator
     */
    showMobileLoader(text = 'Loading...') {
        const { width, height } = this.scaleInfo;
        
        this.loaderBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        this.loaderBg.setDepth(9999);
        
        this.loaderText = this.createMobileText(
            width / 2, height / 2, text, 24, 
            { color: '#ffffff', fontFamily: 'Arial' }
        );
        this.loaderText.setOrigin(0.5).setDepth(10000);
        
        // Animate the loader
        this.tweens.add({
            targets: this.loaderText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Hide mobile loader
     */
    hideMobileLoader() {
        if (this.loaderBg) {
            this.loaderBg.destroy();
            this.loaderBg = null;
        }
        if (this.loaderText) {
            this.loaderText.destroy();
            this.loaderText = null;
        }
    }

    /**
     * Create mobile-responsive grid layout
     */
    createMobileGrid(items, baseItemWidth, baseItemHeight, columns = null) {
        const { width, height } = this.scaleInfo;
        const scaledItemWidth = this.scaleMobile(baseItemWidth);
        const scaledItemHeight = this.scaleMobile(baseItemHeight);
        
        // Auto-calculate columns based on screen width if not specified
        if (!columns) {
            columns = this.scaleInfo.isMobile ? 
                (this.scaleInfo.isPortrait ? 2 : 3) : 
                Math.floor(this.safeArea.width / (scaledItemWidth + this.scaleMobile(20)));
        }
        
        const rows = Math.ceil(items.length / columns);
        const gridWidth = columns * scaledItemWidth + (columns - 1) * this.scaleMobile(20);
        const gridHeight = rows * scaledItemHeight + (rows - 1) * this.scaleMobile(20);
        
        const startX = (width - gridWidth) / 2 + scaledItemWidth / 2;
        const startY = (height - gridHeight) / 2 + scaledItemHeight / 2;
        
        const positions = [];
        for (let i = 0; i < items.length; i++) {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = startX + col * (scaledItemWidth + this.scaleMobile(20));
            const y = startY + row * (scaledItemHeight + this.scaleMobile(20));
            positions.push({ x, y, width: scaledItemWidth, height: scaledItemHeight });
        }
        
        return positions;
    }

    /**
     * Cleanup mobile elements
     */
    destroy() {
        this.mobileElements = [];
        this.scale.off('resize', this.onResize, this);
        super.destroy();
    }
}
