import { createBackButton } from '/src/components/buttons/backbutton.js';

export function showFeedback(scene, message, color) {
    const sf = scene.scaleFactor;
    const centerX = scene.scale.width / 2;
    const y = scene.scale.height / 2 + 120 * sf;
    const feedback = scene.add.text(
        centerX, y,
        message,
        {
            fontSize: `${22 * sf}px`,
            color: Phaser.Display.Color.IntegerToColor(color).rgba,
            fontFamily: 'Arial'
        }
    ).setOrigin(0.5);
    scene.tweens.add({
        targets: feedback,
        alpha: 0,
        duration: 1000,
        onComplete: () => feedback.destroy()
    });
}

export function showVictory(scene) {
    scene.cleanupAllElements();
    scene.gameTimer.destroy();
    const sf = scene.scaleFactor;
    const centerX = scene.scale.width / 2;
    const victoryText = scene.add.text(centerX, 200 * sf, 'VICTORY!', {
        fontSize: `${32 * sf}px`,
        fill: '#00ff00',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
    const winText = scene.add.text(centerX, 250 * sf, 'You have defeated the enemy!', {
        fontSize: `${20 * sf}px`,
        fill: '#fff'
    }).setOrigin(0.5);
    const scoreText = scene.add.text(centerX, 290 * sf, `Your Score: ${scene.score} / ${scene.questions.length}`, {
        fontSize: `${22 * sf}px`,
        fill: '#fff',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 1
    }).setOrigin(0.5);

    const continueButton = scene.add.text(
        centerX,
        340 * sf,
        "Continue",
        {
            fontSize: `${20 * sf}px`,
            backgroundColor: '#444',
            padding: { left: 16 * sf, right: 16 * sf, top: 8 * sf, bottom: 8 * sf },
            color: '#ffffff'
        }
    )
        .setInteractive()
        .setOrigin(0.5)
        .on('pointerdown', () => {
            scene.scene.stop(); // Stop the quiz scene
            scene.scene.resume('DungeonScene'); // Resume the dungeon scene
        });

    scene.persistentElements.push(victoryText, winText, scoreText, continueButton);
}

export function showGameOver(scene) {
    scene.isAnswering = false;
    scene.cleanupAllElements();
    if (scene.gameTimer) scene.gameTimer.destroy();
    const sf = scene.scaleFactor;
    const centerX = scene.scale.width / 2;
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height);
    overlay.setDepth(50);

    const gameOverText = scene.add.text(centerX, 170 * sf, 'GAME OVER!', {
        fontSize: `${48 * sf}px`,
        fill: '#ff0000',
        fontFamily: 'Arial',
        stroke: '#ffffff',
        strokeThickness: 3,
        shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#000000',
            blur: 5,
            fill: true
        }
    }).setOrigin(0.5).setDepth(60);

    scene.tweens.add({
        targets: gameOverText,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    const defeatText = scene.add.text(centerX, 240 * sf, 'You have been defeated...', {
        fontSize: `${22 * sf}px`,
        fill: '#ffffff',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 1
    }).setOrigin(0.5).setDepth(60);

    const scoreText = scene.add.text(centerX, 280 * sf, `Questions Answered: ${scene.score} / ${scene.questions.length}`, {
        fontSize: `${18 * sf}px`,
        fill: '#ffff00',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(60);

    const restartButton = scene.add.text(centerX, 350 * sf, "Try Again", {
        fontSize: `${20 * sf}px`,
        backgroundColor: '#444444',
        padding: { x: 20 * sf, y: 10 * sf },
        fill: '#ffffff'
    })
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setDepth(60)
        .on('pointerover', () => {
            restartButton.setStyle({ backgroundColor: '#666666' });
            scene.se_hoverSound?.play();
        })
        .on('pointerout', () => {
            restartButton.setStyle({ backgroundColor: '#444444' });
        })
        .on('pointerdown', () => {
            scene.se_confirmSound?.play();
            scene.restartQuiz();
        });

    const menuButton = scene.add.text(centerX, 400 * sf, "Back to Menu", {
        fontSize: `${18 * sf}px`,
        backgroundColor: '#333333',
        padding: { x: 15 * sf, y: 8 * sf },
        fill: '#ffffff'
    })
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setDepth(60)
        .on('pointerover', () => {
            menuButton.setStyle({ backgroundColor: '#555555' });
            scene.se_hoverSound?.play();
        })
        .on('pointerout', () => {
            menuButton.setStyle({ backgroundColor: '#333333' });
        })
        .on('pointerdown', () => {
            scene.se_confirmSound?.play();
            scene.cleanupAllElements();
            scene.scene.start('ComputerLab');
        });

    const elementsToAnimate = [overlay, gameOverText, defeatText, scoreText, restartButton, menuButton];
    elementsToAnimate.forEach((element, index) => {
        element.setAlpha(0);
        scene.tweens.add({
            targets: element,
            alpha: element === overlay ? 0.8 : 1,
            duration: 500,
            delay: index * 200,
            ease: 'Power2'
        });
    });
    scene.persistentElements.push(overlay, gameOverText, defeatText, scoreText, restartButton, menuButton);
}