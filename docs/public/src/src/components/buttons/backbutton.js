import gameManager from '../../gameManager.js'; // Add this import
import { createDebouncedClickHandler, getScaleInfo, scaleFontSize, scaleDimension, getSafeArea } from '../../utils/mobileUtils.js'; // Add mobile utils import

// This file is for the back button component in the game, separated to reduce lines of code in the main file

export function createBackButton(scene, targetScene = 'ComputerLab') {
    // Get mobile scaling information
    const scaleInfo = getScaleInfo(scene);
    
    // Responsive button parameters (larger across all devices)
    const baseButtonWidth = 160;
    const baseButtonHeight = 56;
    const baseFontSize = 28;

    // Clamp to maintain a minimum tap target in CSS pixels
    const rawW = scaleDimension(baseButtonWidth, scaleInfo);
    const rawH = scaleDimension(baseButtonHeight, scaleInfo);
    const minW = scaleInfo.isMobile ? 140 : 120;
    const minH = scaleInfo.isMobile ? 48 : 44;
    const buttonWidth = Math.max(rawW, minW);
    const buttonHeight = Math.max(rawH, minH);
    const fontSize = Math.max(scaleFontSize(baseFontSize, scaleInfo), scaleInfo.isMobile ? 18 : 16);
    
    // Position button in top-left using safe area (avoids double-scaling issues)
    const safeArea = getSafeArea(scaleInfo);
    const extraTop = scaleInfo.isMobile ? scaleDimension(12, scaleInfo) : scaleDimension(8, scaleInfo);
    const buttonPosition = {
        x: safeArea.left + buttonWidth / 2,
        y: safeArea.top + buttonHeight / 2 + extraTop
    };
    
    // Create button background (rectangle with stroke)
    const buttonBg = scene.add.rectangle(
        buttonPosition.x,
        buttonPosition.y,
        buttonWidth,
        buttonHeight,
        0x000000,
        0.7 // alpha for semi-transparency
    ).setStrokeStyle(3, 0xffffff)
     .setDepth(9999) // Ensure it's on top
     .setInteractive({ useHandCursor: true }); // Make it interactive

    // Create button text
    const backButton = scene.add.text(
        buttonPosition.x,
        buttonPosition.y,
        'Back',
        {
            font: `${fontSize}px Caprasimo-Regular`,
            fill: '#ffffff',
            padding: { left: 0, right: 0, top: 0, bottom: 0 }
        }
    ).setOrigin(0.5)
     .setDepth(10000); // Ensure it's above the background

    // Define click handler function
    const handleClick = () => {
        if (scene.se_confirmSound) scene.se_confirmSound.play();
        if (scene.restartQuiz) scene.restartQuiz();
        
        // Check if the scene has a custom back handler
        if (scene.goBackToPreviousScene && typeof scene.goBackToPreviousScene === 'function') {
            scene.goBackToPreviousScene();
        } else {
            // Use GameManager to set and get previous scene
            gameManager.setPreviousScene(scene.scene.key);
            scene.scene.start(targetScene);
        }
    };

    // Add hover effects to background
    buttonBg.on('pointerover', () => {
        buttonBg.setFillStyle(0x333333, 0.8); // Lighter on hover
    buttonBg.setStrokeStyle(3, 0xffff00); // Yellow border on hover
        backButton.setStyle({ fill: '#ffff00' }); // Yellow text on hover
    });

    buttonBg.on('pointerout', () => {
        buttonBg.setFillStyle(0x000000, 0.7); // Back to original
    buttonBg.setStrokeStyle(3, 0xffffff); // White border
        backButton.setStyle({ fill: '#ffffff' }); // White text
    });

    // Add click event to background with debouncing
    const debouncedClick = createDebouncedClickHandler(handleClick, 300);
    
    buttonBg.on('pointerdown', (pointer) => {
        // Visual feedback
        buttonBg.setScale(0.95);
        
        // Execute debounced callback
        debouncedClick(pointer);
        
        // Reset scale after a short delay
        scene.time.delayedCall(100, () => {
            buttonBg.setScale(1);
        });
    });

    // Add to persistent elements if the array exists
    if (scene.persistentElements) {
        scene.persistentElements.push(buttonBg, backButton);
    }

    return { buttonBg, backButton };
}