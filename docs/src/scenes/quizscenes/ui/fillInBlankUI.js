export function createFillInBlankInput(scene, container, centerX, centerY, boxWidth, boxHeight, questionTextY, sf, onSelect) {
    const inputY = questionTextY + 80 * sf;
    const inputWidth = 400 * sf;
    const inputHeight = 50 * sf;

    // Input background with focus styling
    const inputBg = scene.add.graphics().setDepth(121);
    inputBg.fillStyle(0x1a1a2e, 0.9);
    inputBg.fillRoundedRect(
        centerX - inputWidth / 2,
        inputY - inputHeight / 2,
        inputWidth,
        inputHeight,
        8 * sf
    );
    // Active blue border to indicate it's ready for input
    inputBg.lineStyle(3 * sf, 0x63b3ed, 1);
    inputBg.strokeRoundedRect(
        centerX - inputWidth / 2,
        inputY - inputHeight / 2,
        inputWidth,
        inputHeight,
        8 * sf
    );

    // Instruction text above input
    const instructionText = scene.add.text(centerX, inputY - 40 * sf, 'Type your answer and press Enter or click Submit', {
        fontSize: `${12 * sf}px`,
        fill: '#a0aec0',
        align: 'center',
        fontFamily: 'Caprasimo-Regular'
    }).setOrigin(0.5).setDepth(122);

    // Placeholder text
    const placeholderText = scene.add.text(centerX, inputY, 'Click here and start typing...', {
        fontSize: `${16 * sf}px`,
        fill: '#888888',
        align: 'center',
        fontFamily: 'Caprasimo-Regular'
    }).setOrigin(0.5).setDepth(122);

    // User input text
    const inputText = scene.add.text(centerX, inputY, '', {
        fontSize: `${16 * sf}px`,
        fill: '#ffffff',
        align: 'center',
        fontFamily: 'Caprasimo-Regular',
        wordWrap: { width: inputWidth - 20 * sf }
    }).setOrigin(0.5).setDepth(122);

    // Blinking cursor
    const cursor = scene.add.text(centerX, inputY, '|', {
        fontSize: `${18 * sf}px`,
        fill: '#63b3ed',
        align: 'center',
        fontFamily: 'Caprasimo-Regular'
    }).setOrigin(0.5).setDepth(123);

    // Create blinking animation for cursor
    const cursorTween = scene.tweens.add({
        targets: cursor,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        yoyo: true,
        repeat: -1
    });

    // Submit button
    const submitButtonY = inputY + 70 * sf;
    const submitButtonWidth = 120 * sf;
    const submitButtonHeight = 40 * sf;

    const submitBg = scene.add.graphics().setDepth(121);
    submitBg.fillGradientStyle(0x4a5568, 0x4a5568, 0x2d3748, 0x2d3748, 0.9);
    submitBg.fillRoundedRect(
        centerX - submitButtonWidth / 2,
        submitButtonY - submitButtonHeight / 2,
        submitButtonWidth,
        submitButtonHeight,
        8 * sf
    );
    submitBg.lineStyle(2 * sf, 0x718096, 0.8);
    submitBg.strokeRoundedRect(
        centerX - submitButtonWidth / 2,
        submitButtonY - submitButtonHeight / 2,
        submitButtonWidth,
        submitButtonHeight,
        8 * sf
    );

    const submitText = scene.add.text(centerX, submitButtonY, 'Submit', {
        fontSize: `${16 * sf}px`,
        fill: '#ffffff',
        align: 'center',
        fontFamily: 'Caprasimo-Regular'
    }).setOrigin(0.5).setDepth(122);

    const submitButton = scene.add.rectangle(
        centerX,
        submitButtonY,
        submitButtonWidth,
        submitButtonHeight,
        0x000000,
        0
    ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(123);

    // Store user input
    let userInput = '';
    let isSubmitted = false;

    // Create virtual keyboard input handling
    const handleKeyInput = (event) => {
        if (isSubmitted) return;

        if (event.key === 'Backspace') {
            userInput = userInput.slice(0, -1);
        } else if (event.key === 'Enter') {
            submitAnswer();
        } else if (event.key.length === 1 && userInput.length < 50) { // Limit input length
            userInput += event.key;
        }
        
        updateInputDisplay();
    };

    const updateInputDisplay = () => {
        if (userInput.length > 0) {
            inputText.setText(userInput);
            placeholderText.setVisible(false);
            
            // Position cursor at the end of the text
            const textBounds = inputText.getBounds();
            cursor.setX(textBounds.right + 5 * sf);
            cursor.setVisible(true);
        } else {
            inputText.setText('');
            placeholderText.setVisible(true);
            
            // Center cursor when no text
            cursor.setX(centerX);
            cursor.setVisible(true);
        }
    };

    const submitAnswer = () => {
        if (isSubmitted || userInput.trim().length === 0) return;
        
        isSubmitted = true;
        
        // Hide cursor and stop blinking
        cursor.setVisible(false);
        cursorTween.stop();
        
        // Visual feedback
        submitBg.clear();
        submitBg.fillStyle(0x2ecc40, 0.9);
        submitBg.fillRoundedRect(
            centerX - submitButtonWidth / 2,
            submitButtonY - submitButtonHeight / 2,
            submitButtonWidth,
            submitButtonHeight,
            8 * sf
        );
        submitText.setText('Submitted!');
        
        // Remove event listener
        scene.input.keyboard.off('keydown', handleKeyInput);
        
        // Call the callback with the user's answer
        onSelect(null, userInput.trim());
    };

    // Add keyboard event listener
    scene.input.keyboard.on('keydown', handleKeyInput);

    // Submit button click handler
    submitButton.on('pointerdown', submitAnswer);

    // Hover effects for submit button
    submitButton.on('pointerover', () => {
        if (!isSubmitted) {
            submitBg.clear();
            submitBg.fillGradientStyle(0x63b3ed, 0x63b3ed, 0x4299e1, 0x4299e1, 0.9);
            submitBg.fillRoundedRect(
                centerX - submitButtonWidth / 2,
                submitButtonY - submitButtonHeight / 2,
                submitButtonWidth,
                submitButtonHeight,
                8 * sf
            );
            submitBg.lineStyle(2 * sf, 0x90cdf4, 1);
            submitBg.strokeRoundedRect(
                centerX - submitButtonWidth / 2,
                submitButtonY - submitButtonHeight / 2,
                submitButtonWidth,
                submitButtonHeight,
                8 * sf
            );
        }
    });

    submitButton.on('pointerout', () => {
        if (!isSubmitted) {
            submitBg.clear();
            submitBg.fillGradientStyle(0x4a5568, 0x4a5568, 0x2d3748, 0x2d3748, 0.9);
            submitBg.fillRoundedRect(
                centerX - submitButtonWidth / 2,
                submitButtonY - submitButtonHeight / 2,
                submitButtonWidth,
                submitButtonHeight,
                8 * sf
            );
            submitBg.lineStyle(2 * sf, 0x718096, 0.8);
            submitBg.strokeRoundedRect(
                centerX - submitButtonWidth / 2,
                submitButtonY - submitButtonHeight / 2,
                submitButtonWidth,
                submitButtonHeight,
                8 * sf
            );
        }
    });

    container.add(instructionText);
    container.add(inputBg);
    container.add(placeholderText);
    container.add(inputText);
    container.add(cursor);
    container.add(submitBg);
    container.add(submitText);
    container.add(submitButton);

    // Initialize display
    updateInputDisplay();

    // Store reference for cleanup
    scene._fillInBlankCleanup = () => {
        scene.input.keyboard.off('keydown', handleKeyInput);
        if (cursorTween) {
            cursorTween.stop();
        }
    };
}
