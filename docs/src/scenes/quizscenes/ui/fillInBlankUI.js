import { getScaleInfo } from '../../../utils/mobileUtils.js';

// Enhanced mobile detection function
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
};

export function createFillInBlankInput(scene, container, centerX, centerY, boxWidth, boxHeight, questionTextY, sf, onSelect) {
    const scaleInfo = getScaleInfo(scene);
    const isMobile = scaleInfo.isMobile || isMobileDevice();
    
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

    // Instruction text above input - different text for mobile
    const instructionText = scene.add.text(centerX, inputY - 40 * sf, 
        isMobile ? 'Use the virtual keyboard below or type your answer' : 'Type your answer and press Enter or click Submit', {
        fontSize: `${12 * sf}px`,
        fill: '#a0aec0',
        align: 'center',
        fontFamily: 'Caprasimo-Regular'
    }).setOrigin(0.5).setDepth(122);

    // Character counter for mobile users
    const charCountText = scene.add.text(centerX + inputWidth / 2 - 10 * sf, inputY + inputHeight / 2 + 15 * sf, '0/50', {
        fontSize: `${10 * sf}px`,
        fill: '#888888',
        align: 'right',
        fontFamily: 'Caprasimo-Regular'
    }).setOrigin(1, 0).setDepth(122);

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

    // Virtual Keyboard Implementation for Mobile
    let virtualKeyboard = null;
    let keyboardButtons = [];
    let keyboardVisible = true;
    let keyboardToggleButton = null;
    
    const createKeyboardToggle = () => {
        if (!isMobile) return;
        
        const toggleY = submitButtonY + 40 * sf;
        const toggleWidth = 150 * sf;
        const toggleHeight = 30 * sf;
        
        const toggleBg = scene.add.graphics().setDepth(125);
        const updateToggleButton = () => {
            toggleBg.clear();
            const color = keyboardVisible ? 0x22c55e : 0x6b7280;
            toggleBg.fillStyle(color, 0.9);
            toggleBg.fillRoundedRect(
                centerX - toggleWidth / 2,
                toggleY - toggleHeight / 2,
                toggleWidth,
                toggleHeight,
                5 * sf
            );
            toggleBg.lineStyle(1 * sf, keyboardVisible ? 0x16a34a : 0x4b5563, 1);
            toggleBg.strokeRoundedRect(
                centerX - toggleWidth / 2,
                toggleY - toggleHeight / 2,
                toggleWidth,
                toggleHeight,
                5 * sf
            );
        };
        
        updateToggleButton();
        
        const toggleText = scene.add.text(centerX, toggleY, 
            keyboardVisible ? '⌨️ Hide Keyboard' : '⌨️ Show Keyboard', {
            fontSize: `${10 * sf}px`,
            fill: '#ffffff',
            align: 'center',
            fontFamily: 'Caprasimo-Regular'
        }).setOrigin(0.5).setDepth(126);
        
        const toggleButton = scene.add.rectangle(
            centerX,
            toggleY,
            toggleWidth,
            toggleHeight,
            0x000000,
            0
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(127);
        
        toggleButton.on('pointerdown', () => {
            keyboardVisible = !keyboardVisible;
            if (virtualKeyboard) {
                virtualKeyboard.setVisible(keyboardVisible);
            }
            toggleText.setText(keyboardVisible ? '⌨️ Hide Keyboard' : '⌨️ Show Keyboard');
            updateToggleButton();
        });
        
        keyboardToggleButton = { bg: toggleBg, text: toggleText, button: toggleButton };
        container.add([toggleBg, toggleText, toggleButton]);
    };
    
    const createVirtualKeyboard = () => {
        if (!isMobile || virtualKeyboard) return;
        
        const keyboardContainer = scene.add.container(0, 0).setDepth(130);
        virtualKeyboard = keyboardContainer;
        
        const keyboardY = submitButtonY + 100 * sf; // Position after toggle button
        const keySize = 35 * sf;
        const keyGap = 5 * sf;
        
        // Define keyboard layout
        const keyRows = [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
        ];
        
        // Create keyboard background
        const totalWidth = (keyRows[0].length * keySize) + ((keyRows[0].length - 1) * keyGap);
        const totalHeight = (keyRows.length * keySize) + ((keyRows.length - 1) * keyGap) + (keySize * 0.5); // Extra space for special keys
        
        const keyboardBg = scene.add.graphics().setDepth(129);
        keyboardBg.fillStyle(0x2a2a3e, 0.95);
        keyboardBg.fillRoundedRect(
            centerX - totalWidth / 2 - 10 * sf,
            keyboardY - 10 * sf,
            totalWidth + 20 * sf,
            totalHeight + 20 * sf,
            10 * sf
        );
        keyboardBg.lineStyle(2 * sf, 0x4a5568, 1);
        keyboardBg.strokeRoundedRect(
            centerX - totalWidth / 2 - 10 * sf,
            keyboardY - 10 * sf,
            totalWidth + 20 * sf,
            totalHeight + 20 * sf,
            10 * sf
        );
        
        keyboardContainer.add(keyboardBg);
        
        // Create keys
        keyRows.forEach((row, rowIndex) => {
            const rowWidth = (row.length * keySize) + ((row.length - 1) * keyGap);
            const rowStartX = centerX - rowWidth / 2;
            const currentY = keyboardY + (rowIndex * (keySize + keyGap));
            
            row.forEach((key, keyIndex) => {
                const keyX = rowStartX + (keyIndex * (keySize + keyGap)) + (keySize / 2);
                
                // Key background
                const keyBg = scene.add.graphics().setDepth(131);
                keyBg.fillStyle(0x4a5568, 1);
                keyBg.fillRoundedRect(
                    keyX - keySize / 2,
                    currentY - keySize / 2,
                    keySize,
                    keySize,
                    5 * sf
                );
                keyBg.lineStyle(1 * sf, 0x718096, 1);
                keyBg.strokeRoundedRect(
                    keyX - keySize / 2,
                    currentY - keySize / 2,
                    keySize,
                    keySize,
                    5 * sf
                );
                
                // Key text
                const keyText = scene.add.text(keyX, currentY, key, {
                    fontSize: `${14 * sf}px`,
                    fill: '#ffffff',
                    align: 'center',
                    fontFamily: 'Caprasimo-Regular'
                }).setOrigin(0.5).setDepth(132);
                
                // Key button
                const keyButton = scene.add.rectangle(
                    keyX,
                    currentY,
                    keySize,
                    keySize,
                    0x000000,
                    0
                ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(133);
                
                // Key press handler
                keyButton.on('pointerdown', () => {
                    if (isSubmitted) return;
                    
                    // Visual feedback
                    keyBg.clear();
                    keyBg.fillStyle(0x63b3ed, 1);
                    keyBg.fillRoundedRect(
                        keyX - keySize / 2,
                        currentY - keySize / 2,
                        keySize,
                        keySize,
                        5 * sf
                    );
                    
                    // Add character to input
                    if (userInput.length < 50) {
                        userInput += key.toLowerCase();
                        updateInputDisplay();
                    }
                    
                    // Reset key appearance
                    scene.time.delayedCall(100, () => {
                        keyBg.clear();
                        keyBg.fillStyle(0x4a5568, 1);
                        keyBg.fillRoundedRect(
                            keyX - keySize / 2,
                            currentY - keySize / 2,
                            keySize,
                            keySize,
                            5 * sf
                        );
                        keyBg.lineStyle(1 * sf, 0x718096, 1);
                        keyBg.strokeRoundedRect(
                            keyX - keySize / 2,
                            currentY - keySize / 2,
                            keySize,
                            keySize,
                            5 * sf
                        );
                    });
                });
                
                keyboardContainer.add([keyBg, keyText, keyButton]);
                keyboardButtons.push({ bg: keyBg, text: keyText, button: keyButton });
            });
        });
        
        // Add special keys row
        const specialKeysY = keyboardY + (keyRows.length * (keySize + keyGap));
        const specialKeyWidth = keySize * 1.5;
        
        // Space bar
        const spaceX = centerX;
        const spaceBg = scene.add.graphics().setDepth(131);
        spaceBg.fillStyle(0x4a5568, 1);
        spaceBg.fillRoundedRect(
            spaceX - (specialKeyWidth * 1.5) / 2,
            specialKeysY - keySize / 2,
            specialKeyWidth * 1.5,
            keySize,
            5 * sf
        );
        spaceBg.lineStyle(1 * sf, 0x718096, 1);
        spaceBg.strokeRoundedRect(
            spaceX - (specialKeyWidth * 1.5) / 2,
            specialKeysY - keySize / 2,
            specialKeyWidth * 1.5,
            keySize,
            5 * sf
        );
        
        const spaceText = scene.add.text(spaceX, specialKeysY, 'SPACE', {
            fontSize: `${12 * sf}px`,
            fill: '#ffffff',
            align: 'center',
            fontFamily: 'Caprasimo-Regular'
        }).setOrigin(0.5).setDepth(132);
        
        const spaceButton = scene.add.rectangle(
            spaceX,
            specialKeysY,
            specialKeyWidth * 1.5,
            keySize,
            0x000000,
            0
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(133);
        
        spaceButton.on('pointerdown', () => {
            if (isSubmitted || userInput.length >= 50) return;
            
            // Visual feedback
            spaceBg.clear();
            spaceBg.fillStyle(0x63b3ed, 1);
            spaceBg.fillRoundedRect(
                spaceX - (specialKeyWidth * 1.5) / 2,
                specialKeysY - keySize / 2,
                specialKeyWidth * 1.5,
                keySize,
                5 * sf
            );
            
            userInput += ' ';
            updateInputDisplay();
            
            // Reset appearance
            scene.time.delayedCall(100, () => {
                spaceBg.clear();
                spaceBg.fillStyle(0x4a5568, 1);
                spaceBg.fillRoundedRect(
                    spaceX - (specialKeyWidth * 1.5) / 2,
                    specialKeysY - keySize / 2,
                    specialKeyWidth * 1.5,
                    keySize,
                    5 * sf
                );
                spaceBg.lineStyle(1 * sf, 0x718096, 1);
                spaceBg.strokeRoundedRect(
                    spaceX - (specialKeyWidth * 1.5) / 2,
                    specialKeysY - keySize / 2,
                    specialKeyWidth * 1.5,
                    keySize,
                    5 * sf
                );
            });
        });
        
        // Backspace button
        const backspaceX = centerX + (specialKeyWidth * 1.2);
        const backspaceBg = scene.add.graphics().setDepth(131);
        backspaceBg.fillStyle(0x6b5b95, 1);
        backspaceBg.fillRoundedRect(
            backspaceX - specialKeyWidth / 2,
            specialKeysY - keySize / 2,
            specialKeyWidth,
            keySize,
            5 * sf
        );
        backspaceBg.lineStyle(1 * sf, 0x8b7bb8, 1);
        backspaceBg.strokeRoundedRect(
            backspaceX - specialKeyWidth / 2,
            specialKeysY - keySize / 2,
            specialKeyWidth,
            keySize,
            5 * sf
        );
        
        const backspaceText = scene.add.text(backspaceX, specialKeysY, '⌫', {
            fontSize: `${16 * sf}px`,
            fill: '#ffffff',
            align: 'center',
            fontFamily: 'Caprasimo-Regular'
        }).setOrigin(0.5).setDepth(132);
        
        const backspaceButton = scene.add.rectangle(
            backspaceX,
            specialKeysY,
            specialKeyWidth,
            keySize,
            0x000000,
            0
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(133);
        
        backspaceButton.on('pointerdown', () => {
            if (isSubmitted) return;
            
            // Visual feedback
            backspaceBg.clear();
            backspaceBg.fillStyle(0x9333ea, 1);
            backspaceBg.fillRoundedRect(
                backspaceX - specialKeyWidth / 2,
                specialKeysY - keySize / 2,
                specialKeyWidth,
                keySize,
                5 * sf
            );
            
            userInput = userInput.slice(0, -1);
            updateInputDisplay();
            
            // Reset appearance
            scene.time.delayedCall(100, () => {
                backspaceBg.clear();
                backspaceBg.fillStyle(0x6b5b95, 1);
                backspaceBg.fillRoundedRect(
                    backspaceX - specialKeyWidth / 2,
                    specialKeysY - keySize / 2,
                    specialKeyWidth,
                    keySize,
                    5 * sf
                );
                backspaceBg.lineStyle(1 * sf, 0x8b7bb8, 1);
                backspaceBg.strokeRoundedRect(
                    backspaceX - specialKeyWidth / 2,
                    specialKeysY - keySize / 2,
                    specialKeyWidth,
                    keySize,
                    5 * sf
                );
            });
        });
        
        // Clear button
        const clearX = centerX - (specialKeyWidth * 1.2);
        const clearBg = scene.add.graphics().setDepth(131);
        clearBg.fillStyle(0xdc2626, 1);
        clearBg.fillRoundedRect(
            clearX - specialKeyWidth / 2,
            specialKeysY - keySize / 2,
            specialKeyWidth,
            keySize,
            5 * sf
        );
        clearBg.lineStyle(1 * sf, 0xf87171, 1);
        clearBg.strokeRoundedRect(
            clearX - specialKeyWidth / 2,
            specialKeysY - keySize / 2,
            specialKeyWidth,
            keySize,
            5 * sf
        );
        
        const clearText = scene.add.text(clearX, specialKeysY, 'CLEAR', {
            fontSize: `${11 * sf}px`,
            fill: '#ffffff',
            align: 'center',
            fontFamily: 'Caprasimo-Regular'
        }).setOrigin(0.5).setDepth(132);
        
        const clearButton = scene.add.rectangle(
            clearX,
            specialKeysY,
            specialKeyWidth,
            keySize,
            0x000000,
            0
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(133);
        
        clearButton.on('pointerdown', () => {
            if (isSubmitted) return;
            
            // Visual feedback
            clearBg.clear();
            clearBg.fillStyle(0xef4444, 1);
            clearBg.fillRoundedRect(
                clearX - specialKeyWidth / 2,
                specialKeysY - keySize / 2,
                specialKeyWidth,
                keySize,
                5 * sf
            );
            
            userInput = '';
            updateInputDisplay();
            
            // Reset appearance
            scene.time.delayedCall(100, () => {
                clearBg.clear();
                clearBg.fillStyle(0xdc2626, 1);
                clearBg.fillRoundedRect(
                    clearX - specialKeyWidth / 2,
                    specialKeysY - keySize / 2,
                    specialKeyWidth,
                    keySize,
                    5 * sf
                );
                clearBg.lineStyle(1 * sf, 0xf87171, 1);
                clearBg.strokeRoundedRect(
                    clearX - specialKeyWidth / 2,
                    specialKeysY - keySize / 2,
                    specialKeyWidth,
                    keySize,
                    5 * sf
                );
            });
        });
        
        keyboardContainer.add([spaceBg, spaceText, spaceButton]);
        keyboardContainer.add([backspaceBg, backspaceText, backspaceButton]);
        keyboardContainer.add([clearBg, clearText, clearButton]);
        
        keyboardButtons.push(
            { bg: spaceBg, text: spaceText, button: spaceButton },
            { bg: backspaceBg, text: backspaceText, button: backspaceButton },
            { bg: clearBg, text: clearText, button: clearButton }
        );
        
        container.add(keyboardContainer);
    };

    // Create physical keyboard input handling
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
        
        // Update character counter
        const charCount = userInput.length;
        charCountText.setText(`${charCount}/50`);
        
        // Change color based on character count
        if (charCount >= 45) {
            charCountText.setFill('#ff6b6b'); // Red when approaching limit
        } else if (charCount >= 30) {
            charCountText.setFill('#fbbf24'); // Yellow when getting close
        } else {
            charCountText.setFill('#888888'); // Gray when plenty of space
        }
    };

    const submitAnswer = () => {
        if (isSubmitted || userInput.trim().length === 0) return;
        
        isSubmitted = true;
        
        // Hide cursor and stop blinking
        cursor.setVisible(false);
        cursorTween.stop();
        
        // Hide virtual keyboard if it exists
        if (virtualKeyboard) {
            virtualKeyboard.setVisible(false);
        }
        
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

    // Add keyboard event listener for desktop
    if (!isMobile) {
        scene.input.keyboard.on('keydown', handleKeyInput);
    }

    // Create virtual keyboard for mobile
    if (isMobile) {
        createKeyboardToggle();
        createVirtualKeyboard();
    }

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
    container.add(charCountText);
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
        // Clean up virtual keyboard
        if (virtualKeyboard) {
            virtualKeyboard.destroy();
            virtualKeyboard = null;
        }
        // Clean up toggle button
        if (keyboardToggleButton) {
            keyboardToggleButton.bg.destroy();
            keyboardToggleButton.text.destroy();
            keyboardToggleButton.button.destroy();
            keyboardToggleButton = null;
        }
        keyboardButtons = [];
    };
}
