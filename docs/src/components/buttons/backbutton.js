import gameManager from '../../gameManager.js'; // Add this import
import { createDebouncedClickHandler, getScaleInfo, scaleFontSize, scaleDimension, getResponsivePosition } from '../../utils/mobileUtils.js'; // Add mobile utils import

// This file is for the back button component in the game, separated to reduce lines of code in the main file

export function createBackButton(scene, targetScene = 'ComputerLab') {
    // Get mobile scaling information
    const scaleInfo = getScaleInfo(scene);
    
    // Responsive button parameters
    const baseButtonWidth = 120;
    const baseButtonHeight = 40;
    const baseFontSize = 24;
    
    const buttonWidth = scaleDimension(baseButtonWidth, scaleInfo);
    const buttonHeight = scaleDimension(baseButtonHeight, scaleInfo);
    const fontSize = scaleFontSize(baseFontSize, scaleInfo);
    
    // Position button in top-left with appropriate offset
    const buttonPosition = getResponsivePosition(scaleInfo, 'top-left', { 
        x: buttonWidth/2 + 20, 
        y: buttonHeight/2 + 20 
    });
    
    // Create button background (rectangle with stroke)
    const buttonBg = scene.add.rectangle(
        buttonPosition.x,
        buttonPosition.y,
        buttonWidth,
        buttonHeight,
        0x000000,
        0.7 // alpha for semi-transparency
    ).setStrokeStyle(2, 0xffffff)
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
        buttonBg.setStrokeStyle(2, 0xffff00); // Yellow border on hover
        backButton.setStyle({ fill: '#ffff00' }); // Yellow text on hover
    });

    buttonBg.on('pointerout', () => {
        buttonBg.setFillStyle(0x000000, 0.7); // Back to original
        buttonBg.setStrokeStyle(2, 0xffffff); // White border
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