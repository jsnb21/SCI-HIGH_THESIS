import gameManager from '../../gameManager.js'; // Add this import
import { createDebouncedClickHandler } from '../../utils/mobileUtils.js'; // Add mobile utils import

// This file is for the back button component in the game, separated to reduce lines of code in the main file

export function createBackButton(scene, targetScene = 'ComputerLab') {
    // Visual style parameters - increased size for PC
    const buttonX = 120;
    const buttonY = 60;
    const buttonWidth = 180; // Increased from 120
    const buttonHeight = 60; // Increased from 40
    // Create button background (rectangle with stroke)
    const buttonBg = scene.add.rectangle(
        buttonX,
        buttonY,
        buttonWidth,
        buttonHeight,
        0x000000,
        0.7 // alpha for semi-transparency
    ).setStrokeStyle(2, 0xffffff)
     .setDepth(9999) // Ensure it's on top
     .setInteractive({ useHandCursor: true }); // Make it interactive

    // Create button text
    const backButton = scene.add.text(
        buttonX,
        buttonY,
        'Back',
        {
            font: '32px Caprasimo-Regular', // Increased from 24px
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