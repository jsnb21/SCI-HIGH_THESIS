import { createFillInBlankInput } from './fillInBlankUI.js';
import { createMultipleChoiceOptions } from './multipleChoiceUI.js';
import { createDragAndDropOptions } from './dragAndDropUI.js';

export function createQuestionAndOptions(scene, centerX, centerY, boxWidth, boxHeight, questionIndex, question, options, sf, questionType = 'multiple-choice', onSelect) {
    // Safety check to ensure scene is properly initialized
    if (!scene || !scene.add) {
        console.error('Scene is not properly initialized in createQuestionAndOptions');
        return null;
    }
    
    console.log('createQuestionAndOptions called with options:', options, 'questionType:', questionType);
    
    // Container for question and options
    const container = scene.add.container(0, 0).setDepth(121);

    // Enhanced question text with background
    const questionTextY = centerY - boxHeight / 2 + 40 * sf; // Reduced from 50 to 40
    
    // Question background panel
    const questionBg = scene.add.graphics();
    questionBg.fillStyle(0x2d3748, 0.8);
    questionBg.fillRoundedRect(
        centerX - (boxWidth - 40 * sf) / 2,
        questionTextY - 25 * sf,
        boxWidth - 40 * sf,
        50 * sf,
        8 * sf
    );
    questionBg.lineStyle(1 * sf, 0x63b3ed, 0.6);
    questionBg.strokeRoundedRect(
        centerX - (boxWidth - 40 * sf) / 2,
        questionTextY - 25 * sf,
        boxWidth - 40 * sf,
        50 * sf,
        8 * sf
    );
    
    const questionText = scene.add.text(centerX, questionTextY, `Q${questionIndex + 1}: ${question}`, {
        fontSize: `${18 * sf}px`,
        fill: '#ffd700',
        wordWrap: { width: boxWidth - 80 * sf },
        align: 'center',
        fontFamily: 'Caprasimo-Regular',
        stroke: '#1a1a2e',
        strokeThickness: 1 * sf
    }).setOrigin(0.5).setDepth(121);

    container.add(questionBg);
    container.add(questionText);

    // Handle different question types
    if (questionType === 'fill-in-the-blank') {
        createFillInBlankInput(scene, container, centerX, centerY, boxWidth, boxHeight, questionTextY, sf, onSelect);
    } else if (questionType === 'drag-and-drop') {
        createDragAndDropOptions(scene, container, centerX, centerY, boxWidth, boxHeight, questionTextY, options.dragItems, options.dropZones, sf, onSelect);
    } else {
        // Default: multiple choice
        // Additional safety check for options before passing to createMultipleChoiceOptions
        if (!options || !Array.isArray(options)) {
            console.warn('Invalid options in questionUI, creating fallback:', options);
            options = ['Option A', 'Option B', 'Option C', 'Option D'];
        }
        console.log('Calling createMultipleChoiceOptions with options:', options);
        createMultipleChoiceOptions(scene, container, centerX, centerY, boxWidth, boxHeight, questionTextY, options, sf, onSelect);
    }

    scene.quizElements.push(container);
    return container;
}
