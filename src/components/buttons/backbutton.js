// This file is for the back button component in the game, seperated to reduce lines of code in the main file

export function createBackButton(scene, targetScene = 'ComputerLab') {
    // Create "Back" button in the top right
    const buttonWidth = 100;
    const buttonHeight = 44;
    const buttonRadius = 22;
    const buttonX = scene.cameras.main.width - 30 - buttonWidth / 2;
    const buttonY = 20 + buttonHeight / 2;
    
    const buttonBg = scene.add.graphics();
    buttonBg.fillStyle(0x1e90ff, 1);
    buttonBg.fillRoundedRect(
        buttonX - buttonWidth / 2,
        buttonY - buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        buttonRadius
    );
    
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
        .on('pointerdown', () => {
            scene.se_confirmSound.play();
            if (scene.restartQuiz) scene.restartQuiz();
            scene.scene.start(targetScene);
            scene.scene.stop();
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
        scene.se_confirmSound.play();
        if (scene.restartQuiz) scene.restartQuiz();
        scene.scene.switch(targetScene);
    });
    
    // Add to persistent elements if the array exists
    if (scene.persistentElements) {
        scene.persistentElements.push(buttonBg, backButton);
    }
    
    return { buttonBg, backButton };
}