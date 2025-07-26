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
        isMobile ? 'Tap the input field to open keyboard' : 'Type your answer and press Enter or click Submit', {
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

    // Hidden HTML input for mobile devices to trigger native keyboard
    let hiddenInput = null;
    
    const createHiddenInput = () => {
        if (!isMobile) return;
        
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.maxLength = 50;
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.left = '-9999px';
        hiddenInput.style.top = '-9999px';
        hiddenInput.style.opacity = '0';
        hiddenInput.style.pointerEvents = 'none';
        hiddenInput.style.fontSize = '16px'; // Prevents zoom on iOS
        
        // Add input event listener
        hiddenInput.addEventListener('input', (e) => {
            if (isSubmitted) return;
            userInput = e.target.value;
            updateInputDisplay();
        });
        
        // Add enter key listener
        hiddenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitAnswer();
            }
        });
        
        // Add blur listener to keep focus if not submitted
        hiddenInput.addEventListener('blur', () => {
            if (!isSubmitted) {
                setTimeout(() => hiddenInput.focus(), 10);
            }
        });
        
        document.body.appendChild(hiddenInput);
    };
    
    // Create interactive area for mobile input
    const inputInteractiveArea = scene.add.rectangle(
        centerX,
        inputY,
        inputWidth,
        inputHeight,
        0x000000,
        0
    ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(124);
    
    // Handle mobile input area tap
    inputInteractiveArea.on('pointerdown', () => {
        if (isMobile && hiddenInput && !isSubmitted) {
            hiddenInput.focus();
        }
    });

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
        
        // Remove hidden input if it exists
        if (hiddenInput) {
            hiddenInput.blur();
            document.body.removeChild(hiddenInput);
            hiddenInput = null;
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

    // Create hidden input for mobile native keyboard
    if (isMobile) {
        createHiddenInput();
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
    container.add(inputInteractiveArea);

    // Initialize display
    updateInputDisplay();

    // Store reference for cleanup
    scene._fillInBlankCleanup = () => {
        scene.input.keyboard.off('keydown', handleKeyInput);
        if (cursorTween) {
            cursorTween.stop();
        }
        // Clean up hidden input
        if (hiddenInput) {
            hiddenInput.blur();
            document.body.removeChild(hiddenInput);
            hiddenInput = null;
        }
    };
}
