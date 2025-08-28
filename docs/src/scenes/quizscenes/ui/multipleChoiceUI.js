export function createMultipleChoiceOptions(scene, container, centerX, centerY, boxWidth, boxHeight, questionTextY, options, sf, onSelect) {
    // Safety check to ensure scene is properly initialized
    if (!scene || !scene.add) {
        console.error('Scene is not properly initialized in createMultipleChoiceOptions');
        return;
    }
    
    // Validate options parameter
    if (!options || !Array.isArray(options) || options.length === 0) {
        console.error('Invalid options provided to createMultipleChoiceOptions:', options);
        return;
    }
    
    // Enhanced options styling - dynamic grid layout based on number of options
    const numOptions = options.length;
    const optionWidth = numOptions <= 2 ? (boxWidth - 80 * sf) : (boxWidth - 120 * sf) / 2; // Full width for ≤2 options, half width for >2
    const optionHeight = 48 * sf;
    const optionSpacingX = 20 * sf; // Horizontal spacing between columns
    const optionSpacingY = 16 * sf; // Vertical spacing between rows
    const optionsStartY = questionTextY + 70 * sf; // Increased from 50 to 70 for more gap below question
    
    // Calculate positions based on number of options
    let optionsStartX, optionsEndX;
    if (numOptions <= 2) {
        // Single column layout for 1-2 options
        optionsStartX = centerX;
        optionsEndX = centerX;
    } else {
        // 2-column layout for 3+ options
        optionsStartX = centerX - optionWidth / 2 - optionSpacingX / 2; // Left column center
        optionsEndX = centerX + optionWidth / 2 + optionSpacingX / 2; // Right column center
    }

    // Store option backgrounds for later coloring
    scene._quizOptionBgs = [];

    options.forEach((option, i) => {
        // Calculate position based on layout
        let row, col, x, y;
        
        if (numOptions <= 2) {
            // Vertical stack for 1-2 options
            row = i;
            col = 0;
            x = centerX;
            y = optionsStartY + row * (optionHeight + optionSpacingY);
        } else {
            // 2x2+ grid for 3+ options
            row = Math.floor(i / 2); // 0 for first row, 1 for second row, etc.
            col = i % 2; // 0 for left column, 1 for right column
            x = col === 0 ? optionsStartX : optionsEndX;
            y = optionsStartY + row * (optionHeight + optionSpacingY);
        }

        // Enhanced option background with gradient
        const optionBg = scene.add.graphics().setDepth(121);
        
        // Base gradient
        optionBg.fillGradientStyle(0x4a5568, 0x4a5568, 0x2d3748, 0x2d3748, 0.9);
        optionBg.fillRoundedRect(
            x - optionWidth / 2,
            y - optionHeight / 2,
            optionWidth,
            optionHeight,
            8 * sf
        );
        
        // Border
        optionBg.lineStyle(2 * sf, 0x718096, 0.8);
        optionBg.strokeRoundedRect(
            x - optionWidth / 2,
            y - optionHeight / 2,
            optionWidth,
            optionHeight,
            8 * sf
        );

        // Interactive area
        const optionInteractive = scene.add.rectangle(
            x,
            y,
            optionWidth,
            optionHeight,
            0x000000,
            0
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(122);

        // Enhanced option text
        const optionText = scene.add.text(
            x,
            y,
            option,
            {
                fontSize: `${15 * sf}px`, // Slightly smaller for better fit in grid
                color: '#ffffff',
                wordWrap: { width: optionWidth - 24 * sf },
                align: 'center',
                fontFamily: 'Caprasimo-Regular',
                stroke: '#1a1a2e',
                strokeThickness: 1 * sf
            }
        ).setOrigin(0.5).setDepth(122);

        optionInteractive.on('pointerdown', () => {
            // Disable all options after selection
            scene._quizOptionBgs.forEach(bg => bg.removeInteractive());
            // Determine correct index if available
            const correctIndex = scene.questions?.[scene.currentQuestionIndex]?.correctIndex;
            if (typeof correctIndex === 'number') {
                if (i === correctIndex) {
                    // Green gradient for correct
                    optionBg.clear();
                    optionBg.fillGradientStyle(0x2ecc40, 0x2ecc40, 0x27ae60, 0x27ae60, 1);
                    optionBg.fillRoundedRect(
                        x - optionWidth / 2,
                        y - optionHeight / 2,
                        optionWidth,
                        optionHeight,
                        8 * sf
                    );
                    optionBg.lineStyle(2 * sf, 0x00ff00, 0.8);
                    optionBg.strokeRoundedRect(
                        x - optionWidth / 2,
                        y - optionHeight / 2,
                        optionWidth,
                        optionHeight,
                        8 * sf
                    );
                } else {
                    // Red gradient for wrong
                    optionBg.clear();
                    optionBg.fillGradientStyle(0xff4136, 0xff4136, 0xe74c3c, 0xe74c3c, 1);
                    optionBg.fillRoundedRect(
                        x - optionWidth / 2,
                        y - optionHeight / 2,
                        optionWidth,
                        optionHeight,
                        8 * sf
                    );
                    optionBg.lineStyle(2 * sf, 0xff0000, 0.8);
                    optionBg.strokeRoundedRect(
                        x - optionWidth / 2,
                        y - optionHeight / 2,
                        optionWidth,
                        optionHeight,
                        8 * sf
                    );
                    
                    // Also highlight the correct one
                    if (scene._quizOptionBgs[correctIndex]) {
                        const correctBg = scene._quizOptionBgs[correctIndex];
                        const correctRow = Math.floor(correctIndex / 2);
                        const correctCol = correctIndex % 2;
                        const correctX = correctCol === 0 ? optionsStartX : optionsEndX;
                        const correctY = optionsStartY + correctRow * (optionHeight + optionSpacingY);
                        
                        correctBg.clear();
                        correctBg.fillGradientStyle(0x2ecc40, 0x2ecc40, 0x27ae60, 0x27ae60, 1);
                        correctBg.fillRoundedRect(
                            correctX - optionWidth / 2,
                            correctY - optionHeight / 2,
                            optionWidth,
                            optionHeight,
                            8 * sf
                        );
                        correctBg.lineStyle(2 * sf, 0x00ff00, 0.8);
                        correctBg.strokeRoundedRect(
                            correctX - optionWidth / 2,
                            correctY - optionHeight / 2,
                            optionWidth,
                            optionHeight,
                            8 * sf
                        );
                    }
                }
            }
            onSelect(i);
        });

        optionInteractive.on('pointerover', () => {
            optionText.setScale(1.05);
            // Enhanced hover effect
            optionBg.clear();
            optionBg.fillGradientStyle(0x63b3ed, 0x63b3ed, 0x4299e1, 0x4299e1, 0.9);
            optionBg.fillRoundedRect(
                x - optionWidth / 2,
                y - optionHeight / 2,
                optionWidth,
                optionHeight,
                8 * sf
            );
            optionBg.lineStyle(2 * sf, 0x90cdf4, 1);
            optionBg.strokeRoundedRect(
                x - optionWidth / 2,
                y - optionHeight / 2,
                optionWidth,
                optionHeight,
                8 * sf
            );
        });

        optionInteractive.on('pointerout', () => {
            optionText.setScale(1);
            // Reset to default if not answered
            if (optionBg.fillColor !== 0x2ecc40 && optionBg.fillColor !== 0xff4136) {
                optionBg.clear();
                optionBg.fillGradientStyle(0x4a5568, 0x4a5568, 0x2d3748, 0x2d3748, 0.9);
                optionBg.fillRoundedRect(
                    x - optionWidth / 2,
                    y - optionHeight / 2,
                    optionWidth,
                    optionHeight,
                    8 * sf
                );
                optionBg.lineStyle(2 * sf, 0x718096, 0.8);
                optionBg.strokeRoundedRect(
                    x - optionWidth / 2,
                    y - optionHeight / 2,
                    optionWidth,
                    optionHeight,
                    8 * sf
                );
            }
        });

        container.add(optionBg);
        container.add(optionInteractive);
        container.add(optionText);
        scene._quizOptionBgs.push(optionBg);
    });
}
