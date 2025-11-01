export function createQuizBox(scene, centerX, centerY, boxWidth, boxHeight, borderRadius) {
    // Enhanced overlay with gradient
    const overlay = scene.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x000000, 0x1a1a2e, 0x1a1a2e, 0.8);
    overlay.fillRect(0, 0, scene.scale.width, scene.scale.height);
    overlay.setDepth(99);
    scene.quizElements.push(overlay);

    // Enhanced quiz box with modern styling
    const boxBg = scene.add.graphics();
    
    // Outer glow
    boxBg.fillStyle(0x63b3ed, 0.2);
    boxBg.fillRoundedRect(
        centerX - boxWidth/2 - 8,
        centerY - boxHeight/2 - 8,
        boxWidth + 16,
        boxHeight + 16,
        borderRadius + 4
    );
    
    // Main background with gradient
    boxBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
    boxBg.fillRoundedRect(
        centerX - boxWidth/2,
        centerY - boxHeight/2,
        boxWidth,
        boxHeight,
        borderRadius
    );
    
    // Glowing border
    boxBg.lineStyle(4, 0x63b3ed, 0.8);
    boxBg.strokeRoundedRect(
        centerX - boxWidth/2,
        centerY - boxHeight/2,
        boxWidth,
        boxHeight,
        borderRadius
    );
    
    // Inner highlight
    boxBg.lineStyle(2, 0xffd700, 0.4);
    boxBg.strokeRoundedRect(
        centerX - boxWidth/2 + 4,
        centerY - boxHeight/2 + 4,
        boxWidth - 8,
        boxHeight - 8,
        borderRadius - 4
    );

    boxBg.setDepth(100);
    scene.quizElements.push(boxBg);

    return boxBg;
}
