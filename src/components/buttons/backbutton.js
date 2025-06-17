import gameManager from '../../gameManager.js'; // Add this import

// This file is for the back button component in the game, separated to reduce lines of code in the main file

export function createBackButton(scene, targetScene = 'ComputerLab') {
    // Visual style parameters
    const buttonX = 100;
    const buttonY = 50;
    const buttonWidth = 120;
    const buttonHeight = 40;

    // Create button background (rectangle with stroke)
    const buttonBg = scene.add.rectangle(
        buttonX,
        buttonY,
        buttonWidth,
        buttonHeight,
        0x000000,
        0.7 // alpha for semi-transparency
    ).setStrokeStyle(2, 0xffffff)
     .setDepth(9999); // Ensure it's on top

    // Create button text
    const backButton = scene.add.text(
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
     .setDepth(10000) // Ensure it's above the background
     .on('pointerdown', () => {
         if (scene.se_confirmSound) scene.se_confirmSound.play();
         if (scene.restartQuiz) scene.restartQuiz();
         // Use GameManager to set and get previous scene
         gameManager.setPreviousScene(scene.scene.key);
         scene.scene.start(targetScene);
     });

    // Make button background respond to pointer events
    buttonBg.setInteractive(
        new Phaser.Geom.Rectangle(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight
        ),
        Phaser.Geom.Rectangle.Contains
    ).on('pointerdown', () => {
        if (scene.se_confirmSound) scene.se_confirmSound.play();
        if (scene.restartQuiz) scene.restartQuiz();
        // Use GameManager to set and get previous scene
        gameManager.setPreviousScene(scene.scene.key);
        scene.scene.start(targetScene);
    });

    // Add to persistent elements if the array exists
    if (scene.persistentElements) {
        scene.persistentElements.push(buttonBg, backButton);
    }

    return { buttonBg, backButton };
}