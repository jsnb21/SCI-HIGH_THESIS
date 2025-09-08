// Mobile utility functions for responsive game design

// Base design dimensions (what the game was originally designed for)
export const BASE_WIDTH = 1920;
export const BASE_HEIGHT = 1080;

// Minimum dimensions for mobile devices
export const MIN_WIDTH = 320;
export const MIN_HEIGHT = 240;

/**
 * Calculate scale factor based on current screen size
 * @param {Phaser.Scene} scene - The current scene
 * @returns {object} - Scaling information
 */
export function getScaleInfo(scene) {
    // Handle case where scene is undefined or doesn't have scale property
    if (!scene || !scene.scale) {
        console.warn('getScaleInfo called with invalid scene, using default values');
        return {
            scaleX: 1,
            scaleY: 1,
            uniformScale: 1,
            finalScale: 1,
            isMobile: false,
            width: BASE_WIDTH,
            height: BASE_HEIGHT
        };
    }
    
    const { width, height } = scene.scale;
    
    // Calculate scale factors
    const scaleX = width / BASE_WIDTH;
    const scaleY = height / BASE_HEIGHT;
    
    // Use the smaller scale factor to maintain aspect ratio
    const uniformScale = Math.min(scaleX, scaleY);
    
    // For mobile devices, ensure minimum readable sizes
    const isMobile = width < 768 || height < 600;
    const mobileScaleMultiplier = isMobile ? 1.2 : 1.0;
    
    const finalScale = uniformScale * mobileScaleMultiplier;
    
    return {
        width,
        height,
        scaleX,
        scaleY,
        uniformScale,
        finalScale,
        isMobile,
        isPortrait: height > width,
        isLandscape: width > height,
        aspectRatio: width / height
    };
}

/**
 * Scale a font size for mobile readability
 * @param {number} baseSize - Base font size
 * @param {object} scaleInfo - Scale information from getScaleInfo
 * @returns {number} - Scaled font size
 */
export function scaleFontSize(baseSize, scaleInfo) {
    let scaledSize = baseSize * scaleInfo.finalScale;
    
    // Ensure minimum readable font sizes on mobile
    if (scaleInfo.isMobile) {
        const minSize = scaleInfo.isPortrait ? 14 : 12;
        scaledSize = Math.max(scaledSize, minSize);
    }
    
    return Math.round(scaledSize);
}

/**
 * Scale a dimension (width, height, padding, etc.)
 * @param {number} baseDimension - Base dimension
 * @param {object} scaleInfo - Scale information from getScaleInfo
 * @returns {number} - Scaled dimension
 */
export function scaleDimension(baseDimension, scaleInfo) {
    return baseDimension * scaleInfo.finalScale;
}

/**
 * Get responsive position for UI elements
 * @param {object} scaleInfo - Scale information from getScaleInfo
 * @param {string} position - Position type: 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
 * @param {object} offset - Offset from edge {x, y}
 * @returns {object} - Position coordinates {x, y}
 */
export function getResponsivePosition(scaleInfo, position, offset = { x: 0, y: 0 }) {
    const { width, height } = scaleInfo;
    const scaledOffsetX = scaleDimension(offset.x, scaleInfo);
    const scaledOffsetY = scaleDimension(offset.y, scaleInfo);
    
    switch (position) {
        case 'top-left':
            return { x: scaledOffsetX, y: scaledOffsetY };
        case 'top-right':
            return { x: width - scaledOffsetX, y: scaledOffsetY };
        case 'bottom-left':
            return { x: scaledOffsetX, y: height - scaledOffsetY };
        case 'bottom-right':
            return { x: width - scaledOffsetX, y: height - scaledOffsetY };
        case 'center':
            return { x: width / 2 + scaledOffsetX, y: height / 2 + scaledOffsetY };
        case 'top-center':
            return { x: width / 2 + scaledOffsetX, y: scaledOffsetY };
        case 'bottom-center':
            return { x: width / 2 + scaledOffsetX, y: height - scaledOffsetY };
        default:
            return { x: width / 2, y: height / 2 };
    }
}

/**
 * Create a responsive text style
 * @param {number} baseFontSize - Base font size
 * @param {object} scaleInfo - Scale information from getScaleInfo
 * @param {object} additionalStyle - Additional style properties
 * @returns {object} - Text style object
 */
export function createResponsiveTextStyle(baseFontSize, scaleInfo, additionalStyle = {}) {
    const scaledFontSize = scaleFontSize(baseFontSize, scaleInfo);
    
    return {
        fontSize: `${scaledFontSize}px`,
        fontFamily: 'Caprasimo-Regular',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: Math.max(1, Math.round(scaledFontSize * 0.05)),
        ...additionalStyle
    };
}

/**
 * Create a responsive button
 * @param {Phaser.Scene} scene - The scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} baseWidth - Base button width
 * @param {number} baseHeight - Base button height
 * @param {string} text - Button text
 * @param {number} baseFontSize - Base font size
 * @param {function} callback - Click callback
 * @returns {object} - Button object with background and text
 */
export function createResponsiveButton(scene, x, y, baseWidth, baseHeight, text, baseFontSize, callback) {
    const scaleInfo = getScaleInfo(scene);
    
    const scaledWidth = scaleDimension(baseWidth, scaleInfo);
    const scaledHeight = scaleDimension(baseHeight, scaleInfo);
    
    // Create button background
    const buttonBg = scene.add.rectangle(x, y, scaledWidth, scaledHeight, 0x3498DB);
    buttonBg.setStrokeStyle(2, 0x2980B9);
    buttonBg.setInteractive({ useHandCursor: true });
    
    // Create button text
    const textStyle = createResponsiveTextStyle(baseFontSize, scaleInfo, {
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 1
    });
    
    const buttonText = scene.add.text(x, y, text, textStyle).setOrigin(0.5);
    
    // Add hover effects (only for non-mobile devices to prevent issues)
    if (!scaleInfo.isMobile) {
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x2980B9);
            buttonText.setStyle({ color: '#F1C40F' });
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x3498DB);
            buttonText.setStyle({ color: '#FFFFFF' });
        });
    }
    
    // Add click handler with debouncing for mobile
    if (callback) {
        let lastClickTime = 0;
        const debounceDelay = 300; // 300ms debounce
        
        buttonBg.on('pointerdown', (pointer) => {
            const currentTime = Date.now();
            
            // Prevent double clicks within debounce period
            if (currentTime - lastClickTime < debounceDelay) {
                return;
            }
            
            lastClickTime = currentTime;
            
            // Visual feedback
            buttonBg.setScale(0.95);
            
            // Execute callback
            callback();
            
            // Reset scale after a short delay
            scene.time.delayedCall(100, () => {
                buttonBg.setScale(1);
            });
        });
    }
    
    return {
        background: buttonBg,
        text: buttonText,
        width: scaledWidth,
        height: scaledHeight
    };
}

/**
 * Adjust layout for mobile orientation
 * @param {object} scaleInfo - Scale information from getScaleInfo
 * @param {object} elements - Elements to adjust
 */
export function adjustForMobileOrientation(scaleInfo, elements) {
    if (scaleInfo.isMobile) {
        if (scaleInfo.isPortrait) {
            // Portrait mode adjustments
            elements.forEach(element => {
                if (element.type === 'button') {
                    // Make buttons larger and more spaced out in portrait
                    element.setScale(element.scaleX * 1.2, element.scaleY * 1.2);
                }
            });
        } else {
            // Landscape mode adjustments
            elements.forEach(element => {
                if (element.type === 'text') {
                    // Reduce text size slightly in landscape to fit more content
                    const currentSize = parseInt(element.style.fontSize);
                    element.setFontSize(Math.max(10, currentSize * 0.9));
                }
            });
        }
    }
}

/**
 * Get safe area for mobile devices (avoiding notches, etc.)
 * @param {object} scaleInfo - Scale information from getScaleInfo
 * @returns {object} - Safe area bounds
 */
export function getSafeArea(scaleInfo) {
    const { width, height, isMobile } = scaleInfo;
    
    // Add safe margins for mobile devices
    const safeMargin = isMobile ? scaleDimension(20, scaleInfo) : scaleDimension(10, scaleInfo);
    
    return {
        left: safeMargin,
        right: width - safeMargin,
        top: safeMargin,
        bottom: height - safeMargin,
        width: width - (safeMargin * 2),
        height: height - (safeMargin * 2)
    };
}

/**
 * Create a debounced click handler to prevent double touches on mobile
 * @param {function} callback - The function to call when clicked
 * @param {number} debounceDelay - Delay in milliseconds (default: 300)
 * @returns {function} - Debounced click handler
 */
export function createDebouncedClickHandler(callback, debounceDelay = 300) {
    let lastClickTime = 0;
    
    return function(pointer) {
        const currentTime = Date.now();
        
        // Prevent double clicks within debounce period
        if (currentTime - lastClickTime < debounceDelay) {
            return;
        }
        
        lastClickTime = currentTime;
        callback(pointer);
    };
}

/**
 * Add mobile-safe click handler to a game object
 * @param {Phaser.GameObjects.GameObject} gameObject - The object to add click handler to
 * @param {function} callback - The callback function
 * @param {Phaser.Scene} scene - The scene (for visual feedback)
 * @param {number} debounceDelay - Debounce delay in milliseconds
 */
export function addMobileSafeClickHandler(gameObject, callback, scene, debounceDelay = 300) {
    const debouncedCallback = createDebouncedClickHandler(callback, debounceDelay);
    
    gameObject.on('pointerdown', (pointer) => {
        // Visual feedback
        const originalScale = gameObject.scaleX;
        gameObject.setScale(originalScale * 0.95);
        
        // Execute callback
        debouncedCallback(pointer);
        
        // Reset scale after a short delay
        scene.time.delayedCall(100, () => {
            gameObject.setScale(originalScale);
        });
    });
}
