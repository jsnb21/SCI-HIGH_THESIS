export function createDragAndDropOptions(scene, container, centerX, centerY, boxWidth, boxHeight, questionTextY, dragItems, dropZones, sf, onDrop) {
    const optionsStartY = questionTextY + 50 * sf;
    
    // Calculate maximum text width to determine spacing
    const tempTexts = dragItems.map(item => {
        const tempText = scene.add.text(0, 0, item.text, {
            fontSize: `${14 * sf}px`,
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        const width = tempText.width;
        tempText.destroy();
        return width;
    });
    
    const maxTextWidth = Math.max(...tempTexts);
    const padding = 12 * sf;
    const minWidth = 50 * sf;
    const maxItemWidth = Math.max(maxTextWidth + padding * 2, minWidth);
    const itemSpacing = Math.max(maxItemWidth + 30 * sf, 120 * sf); // Increased spacing from 90 to 120
    
    // Store original positions and states
    scene.dragAndDropState = {
        items: [],
        zones: [],
        correctPositions: {},
        lockedItems: new Set(),
        isAutoSubmitting: false
    };
    
    // Create drop zones first - position them higher to stay within the quiz box
    const zoneStartX = centerX - ((dropZones.length - 1) * itemSpacing) / 2;
    dropZones.forEach((zone, index) => {
        const zoneX = zoneStartX + index * itemSpacing;
        const zoneY = optionsStartY + 80 * sf; // Reduced from 120 to 80 to move zones higher
        
        const dropZone = createDropZone(scene, zoneX, zoneY, sf, zone.label, zone.id);
        scene.dragAndDropState.zones.push({
            zone: dropZone,
            id: zone.id,
            correctItemId: zone.correctItemId,
            currentItem: null
        });
        container.add(dropZone);
    });
    
    // Create draggable items
    const itemStartX = centerX - ((dragItems.length - 1) * itemSpacing) / 2;
    dragItems.forEach((item, index) => {
        const itemX = itemStartX + index * itemSpacing;
        const itemY = optionsStartY;
        
        const dragItem = createDragItem(scene, itemX, itemY, sf, item.text, item.id, item.isDecoy || false);
        scene.dragAndDropState.items.push({
            item: dragItem,
            id: item.id,
            originalX: itemX,
            originalY: itemY,
            currentZone: null,
            isLocked: false,
            isDecoy: item.isDecoy || false
        });
        container.add(dragItem);
    });
    
    // Set up drag and drop interactions
    setupDragAndDropInteractions(scene, onDrop);
}

function createDropZone(scene, x, y, sf, label, id) {
    const zoneContainer = scene.add.container(x, y).setDepth(120);
    
    // Zone background - make it much taller and extend upwards to accommodate text
    const zoneBg = scene.add.graphics();
    zoneBg.lineStyle(3 * sf, 0x4a90e2, 0.8);
    zoneBg.fillStyle(0x2d3748, 0.3);
    // Extend the zone upwards by increasing height and shifting Y position
    zoneBg.strokeRoundedRect(-45 * sf, -35 * sf, 90 * sf, 70 * sf, 8 * sf);
    zoneBg.fillRoundedRect(-45 * sf, -35 * sf, 90 * sf, 70 * sf, 8 * sf);
    
    // Zone label - position it higher up within the extended zone
    const zoneLabel = scene.add.text(0, 15 * sf, label, {
        fontSize: `${10 * sf}px`,
        fill: '#ffffff',
        align: 'center',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
        wordWrap: { width: 80 * sf, useAdvancedWrap: true }
    }).setOrigin(0.5);
    
    zoneContainer.add(zoneBg);
    zoneContainer.add(zoneLabel);
    zoneContainer.setData('id', id);
    zoneContainer.setData('background', zoneBg);
    zoneContainer.setData('occupied', false);
    
    return zoneContainer;
}

function createDragItem(scene, x, y, sf, text, id, isDecoy) {
    const itemContainer = scene.add.container(x, y).setDepth(122);
    
    // Create temporary text to measure dimensions
    const tempText = scene.add.text(0, 0, text, {
        fontSize: `${14 * sf}px`,
        fill: '#ffffff',
        align: 'center',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Calculate dynamic box size based on text
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    const padding = 12 * sf; // Padding around text
    const minWidth = 50 * sf; // Minimum width
    const minHeight = 25 * sf; // Minimum height
    
    const boxWidth = Math.max(textWidth + padding * 2, minWidth);
    const boxHeight = Math.max(textHeight + padding * 1.5, minHeight);
    
    // Item background with dynamic size
    const itemBg = scene.add.graphics();
    const bgColor = isDecoy ? 0xff6b6b : 0x4ecdc4;
    itemBg.fillStyle(bgColor, 0.9);
    itemBg.lineStyle(2 * sf, 0x2d3748, 1);
    itemBg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 6 * sf);
    itemBg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 6 * sf);
    
    // Item text (reuse the temporary text)
    const itemText = tempText;
    
    itemContainer.add(itemBg);
    itemContainer.add(itemText);
    itemContainer.setData('id', id);
    itemContainer.setData('text', text);
    itemContainer.setData('background', itemBg);
    itemContainer.setData('isDecoy', isDecoy);
    itemContainer.setData('boxWidth', boxWidth);
    itemContainer.setData('boxHeight', boxHeight);
    
    // Make interactive with dynamic size
    itemContainer.setInteractive(new Phaser.Geom.Rectangle(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight), Phaser.Geom.Rectangle.Contains);
    itemContainer.setData('isDragging', false);
    
    return itemContainer;
}

function setupDragAndDropInteractions(scene, onDrop) {
    scene.input.setDraggable(scene.dragAndDropState.items.map(item => item.item));
    
    scene.input.on('dragstart', (pointer, gameObject) => {
        const itemState = scene.dragAndDropState.items.find(item => item.item === gameObject);
        if (itemState && itemState.isLocked) return; // Don't allow dragging locked items
        
        gameObject.setData('isDragging', true);
        gameObject.setDepth(125);
        
        // Visual feedback for drag start
        const bg = gameObject.getData('background');
        const boxWidth = gameObject.getData('boxWidth');
        const boxHeight = gameObject.getData('boxHeight');
        
        bg.clear();
        const isDecoy = gameObject.getData('isDecoy');
        const bgColor = isDecoy ? 0xff6b6b : 0x4ecdc4;
        bg.fillStyle(bgColor, 1);
        bg.lineStyle(3 * scene.scaleFactor, 0xffd700, 1);
        bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 6 * scene.scaleFactor);
        bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 6 * scene.scaleFactor);
        
        // Play select sound
        if (scene.se_hoverSound) {
            scene.se_hoverSound.play();
        }
    });
    
    scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (gameObject.getData('isDragging')) {
            gameObject.x = dragX;
            gameObject.y = dragY;
        }
    });
    
    scene.input.on('dragend', (pointer, gameObject) => {
        if (!gameObject.getData('isDragging')) return;
        
        gameObject.setData('isDragging', false);
        gameObject.setDepth(122);
        
        const itemState = scene.dragAndDropState.items.find(item => item.item === gameObject);
        if (!itemState) return;
        
        // Check if dropped on a valid zone
        const dropZone = findDropZone(scene, gameObject.x, gameObject.y);
        
        if (dropZone && !dropZone.getData('occupied')) {
            // Move item to zone
            moveItemToZone(scene, itemState, dropZone, onDrop);
        } else {
            // Return to original position with animation
            returnItemToOriginal(scene, itemState);
        }
    });
}

function findDropZone(scene, x, y) {
    const sf = scene.scaleFactor;
    const threshold = 50 * sf;
    
    for (const zoneState of scene.dragAndDropState.zones) {
        const zone = zoneState.zone;
        const distance = Phaser.Math.Distance.Between(x, y, zone.x, zone.y);
        if (distance < threshold) {
            return zone;
        }
    }
    return null;
}

function moveItemToZone(scene, itemState, dropZone, onDrop) {
    const sf = scene.scaleFactor;
    const zoneState = scene.dragAndDropState.zones.find(z => z.zone === dropZone);
    
    // Remove item from previous zone if any
    if (itemState.currentZone) {
        const prevZoneState = scene.dragAndDropState.zones.find(z => z.zone === itemState.currentZone);
        if (prevZoneState) {
            prevZoneState.currentItem = null;
            prevZoneState.zone.setData('occupied', false);
        }
    }
    
    // Animate item to zone center
    scene.tweens.add({
        targets: itemState.item,
        x: dropZone.x,
        y: dropZone.y,
        duration: 300,
        ease: 'Power2.easeOut',
        onComplete: () => {
            // Check if this is the correct position
            const isCorrect = zoneState.correctItemId === itemState.id && !itemState.isDecoy;
            
            if (isCorrect) {
                // Lock item in correct position
                lockItemInPosition(scene, itemState, dropZone);
                showCorrectFeedback(scene, dropZone.x, dropZone.y, sf);
                
                // Play correct sound
                if (scene.se_confirmSound) {
                    scene.se_confirmSound.play();
                }
                
                // Check if all items are correctly placed
                checkAutoSubmit(scene, onDrop);
            } else {
                // Wrong position - show feedback and return
                showWrongFeedback(scene, dropZone.x, dropZone.y, sf);
                
                // Play wrong sound
                if (scene.se_wrongSound) {
                    scene.se_wrongSound.play();
                }
                
                // Deduct time
                if (scene.gameTimer) {
                    scene.gameTimer.subtractTime(2);
                }
                
                // Return to original position after brief delay
                scene.time.delayedCall(800, () => {
                    returnItemToOriginal(scene, itemState);
                });
            }
        }
    });
    
    // Update states
    itemState.currentZone = dropZone;
    zoneState.currentItem = itemState.item;
    dropZone.setData('occupied', true);
}

function lockItemInPosition(scene, itemState, dropZone) {
    itemState.isLocked = true;
    scene.dragAndDropState.lockedItems.add(itemState.id);
    
    // Update visual to show locked state
    const bg = itemState.item.getData('background');
    const boxWidth = itemState.item.getData('boxWidth');
    const boxHeight = itemState.item.getData('boxHeight');
    
    bg.clear();
    bg.fillStyle(0x27ae60, 1); // Green for correct/locked
    bg.lineStyle(3 * scene.scaleFactor, 0x2ecc71, 1);
    bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 6 * scene.scaleFactor);
    bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 6 * scene.scaleFactor);
    
    // Remove interactivity
    itemState.item.removeInteractive();
    
    // Add lock icon or checkmark
    const checkmark = scene.add.text(dropZone.x + 25 * scene.scaleFactor, dropZone.y - 25 * scene.scaleFactor, '✓', {
        fontSize: `${16 * scene.scaleFactor}px`,
        fill: '#2ecc71',
        fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(126);
    
    scene.quizElements.push(checkmark);
}

function returnItemToOriginal(scene, itemState) {
    // Clear zone occupation if returning
    if (itemState.currentZone) {
        const zoneState = scene.dragAndDropState.zones.find(z => z.zone === itemState.currentZone);
        if (zoneState) {
            zoneState.currentItem = null;
            zoneState.zone.setData('occupied', false);
        }
        itemState.currentZone = null;
    }
    
    // Animate back to original position
    scene.tweens.add({
        targets: itemState.item,
        x: itemState.originalX,
        y: itemState.originalY,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
            // Reset visual style
            const bg = itemState.item.getData('background');
            const boxWidth = itemState.item.getData('boxWidth');
            const boxHeight = itemState.item.getData('boxHeight');
            
            bg.clear();
            const isDecoy = itemState.item.getData('isDecoy');
            const bgColor = isDecoy ? 0xff6b6b : 0x4ecdc4;
            bg.fillStyle(bgColor, 0.9);
            bg.lineStyle(2 * scene.scaleFactor, 0x2d3748, 1);
            bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 6 * scene.scaleFactor);
            bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 6 * scene.scaleFactor);
        }
    });
}

function showCorrectFeedback(scene, x, y, sf) {
    // Green checkmark effect
    const feedback = scene.add.container(x, y - 40 * sf).setDepth(127);
    
    const bg = scene.add.circle(0, 0, 15 * sf, 0x27ae60, 0.9);
    const checkmark = scene.add.text(0, 0, '✓', {
        fontSize: `${20 * sf}px`,
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    feedback.add([bg, checkmark]);
    scene.quizElements.push(feedback);
    
    // Animate feedback
    feedback.setScale(0);
    scene.tweens.add({
        targets: feedback,
        scale: 1,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
            scene.tweens.add({
                targets: feedback,
                alpha: 0,
                scale: 1.5,
                duration: 500,
                delay: 500,
                onComplete: () => feedback.destroy()
            });
        }
    });
}

function showWrongFeedback(scene, x, y, sf) {
    // Red X effect
    const feedback = scene.add.container(x, y - 40 * sf).setDepth(127);
    
    const bg = scene.add.circle(0, 0, 15 * sf, 0xe74c3c, 0.9);
    const xmark = scene.add.text(0, 0, '✗', {
        fontSize: `${20 * sf}px`,
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    feedback.add([bg, xmark]);
    scene.quizElements.push(feedback);
    
    // Shake animation
    feedback.setScale(0);
    scene.tweens.add({
        targets: feedback,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut',
        onComplete: () => {
            // Shake effect
            scene.tweens.add({
                targets: feedback,
                x: feedback.x + 5 * sf,
                duration: 50,
                yoyo: true,
                repeat: 5,
                onComplete: () => {
                    scene.tweens.add({
                        targets: feedback,
                        alpha: 0,
                        duration: 500,
                        delay: 300,
                        onComplete: () => feedback.destroy()
                    });
                }
            });
        }
    });
}

function checkAutoSubmit(scene, onDrop) {
    if (scene.dragAndDropState.isAutoSubmitting) return;
    
    // Check if all non-decoy items are correctly placed
    const correctItems = scene.dragAndDropState.items.filter(item => !item.isDecoy);
    const correctlyPlaced = correctItems.filter(item => item.isLocked);
    
    if (correctlyPlaced.length === correctItems.length) {
        scene.dragAndDropState.isAutoSubmitting = true;
        
        // Add visual celebration effect
        showCompletionEffect(scene);
        
        // Auto-submit after brief delay
        scene.time.delayedCall(600, () => { // Reduced from 1000ms to 600ms
            onDrop(0, null); // Pass 0 as index and null as answer for auto-submit
        });
    }
}

function showCompletionEffect(scene) {
    const sf = scene.scaleFactor;
    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;
    
    // Create celebration particles
    for (let i = 0; i < 20; i++) {
        const particle = scene.add.circle(
            centerX + (Math.random() - 0.5) * 100 * sf,
            centerY + (Math.random() - 0.5) * 100 * sf,
            3 * sf,
            [0xffd700, 0xff6b7d, 0x4ecdc4, 0x2ecc71][Math.floor(Math.random() * 4)]
        ).setDepth(128);
        
        scene.tweens.add({
            targets: particle,
            y: particle.y - 100 * sf,
            alpha: 0,
            duration: 1000,
            ease: 'Power2.easeOut',
            onComplete: () => particle.destroy()
        });
        
        scene.quizElements.push(particle);
    }
    
    // Play combo sound for completion
    if (scene.se_comboSound) {
        scene.se_comboSound.play();
    }
}
