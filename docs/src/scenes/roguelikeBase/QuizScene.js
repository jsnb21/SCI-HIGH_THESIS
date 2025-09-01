import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';

export default class QuizScene extends BaseScene {
    constructor() {
        super('QuizScene');
        
        // Quiz properties
        this.currentQuestion = null;
        this.quizData = null;
        this.enemyData = null;
        this.gameplayState = null;
        this.questionIndex = 0;
        this.selectedAnswer = null;
        
        // UI elements
        this.questionText = null;
        this.answerButtons = [];
        this.titleText = null;
        this.backgroundOverlay = null;
        this.quizContainer = null;
        this.resultContainer = null;
    }

    init(data) {
        // Receive data from main gameplay scene
        this.courseTopic = data.courseTopic;
        this.enemyData = data.enemyToDestroy;
        this.intensity = data.intensity || 1;
        this.selectedAnswer = null;
        this.currentQuestion = null;
        
        console.log('QuizScene initialized with:', data);
    }

    preload() {
        // Load quiz data files
        this.load.json('pythonQuiz', 'data/quizzes/python.json');
        this.load.json('javaQuiz', 'data/quizzes/java.json');
        this.load.json('cQuiz', 'data/quizzes/C.json');
        this.load.json('cppQuiz', 'data/quizzes/C++.json');
        this.load.json('csharpQuiz', 'data/quizzes/csharp.json');
        this.load.json('webdesignQuiz', 'data/quizzes/webdesign.json');
    }

    create() {
        super.create();
        
        // Initialize answer submission flag
        this.answerSubmitted = false;
        this.timerExpired = false; // Add timer expiration flag
        
        // Listen for timer events from main gameplay scene
        const mainScene = this.scene.get('MainGameplay');
        if (mainScene) {
            mainScene.events.on('timer-expired', this.handleTimerExpired, this);
        }
        
        // Create background overlay that doesn't cover the UI area
        // Score at 30px, Streak at 65px + font height, so start overlay at 100px from top
        const overlayHeight = this.scale.height - 100;
        const overlayY = 100 + (overlayHeight / 2);
        
        this.backgroundOverlay = this.add.rectangle(
            this.scale.width / 2, 
            overlayY, 
            this.scale.width, 
            overlayHeight, 
            0x000000, 
            0.85
        );
        
        // Load appropriate quiz data based on course topic
        this.loadQuizData();
        
        // Validate that we have quiz data and create interface
        if (this.currentQuestion) {
            this.createQuizInterface();
        } else {
            console.error('No quiz data available for topic:', this.courseTopic);
            this.returnToGameplay(false);
        }
    }

    loadQuizData() {
        // Check intensity level for quiz type
        if (this.intensity >= 2) {
            // Load drag-and-drop questions from main gameplay scene
            const mainScene = this.scene.get('MainGameplay');
            if (mainScene && mainScene.getDragDropQuestions) {
                this.currentQuestion = mainScene.getDragDropQuestions(this.courseTopic);
                this.currentQuestion.isDragDrop = true;
                console.log('Loaded drag-and-drop question:', this.currentQuestion);
                return;
            }
        }
        
        // Get quiz data based on course topic (normal multiple choice)
        const topic = this.courseTopic || 'python';
        let quizData = null;
        
        switch (topic.toLowerCase()) {
            case 'python':
                quizData = this.cache.json.get('pythonQuiz');
                break;
            case 'java':
                quizData = this.cache.json.get('javaQuiz');
                break;
            case 'c':
                quizData = this.cache.json.get('cQuiz');
                break;
            case 'c++':
                quizData = this.cache.json.get('cppQuiz');
                break;
            case 'c#':
            case 'csharp':
                quizData = this.cache.json.get('csharpQuiz');
                break;
            case 'webdesign':
                quizData = this.cache.json.get('webdesignQuiz');
                break;
            default:
                quizData = this.cache.json.get('pythonQuiz');
                break;
        }
        
        if (quizData && quizData.questions && quizData.questions.length > 0) {
            // Filter questions to only get multiple choice questions (ones with options and correctIndex)
            const multipleChoiceQuestions = quizData.questions.filter(q => 
                q.options && Array.isArray(q.options) && typeof q.correctIndex === 'number'
            );
            
            if (multipleChoiceQuestions.length > 0) {
                // Select a random multiple choice question
                this.currentQuestion = Phaser.Utils.Array.GetRandom(multipleChoiceQuestions);
                console.log('Loaded question for', topic, ':', this.currentQuestion);
            }
        }
    }

    createQuizInterface() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Check if this is a drag-and-drop question
        if (this.currentQuestion.isDragDrop) {
            this.createDragDropInterface(centerX, centerY);
            return;
        }
        
        // Create main quiz container for normal multiple choice
        this.quizContainer = this.add.container(centerX, centerY);
        
        // Create temporary question text to measure height
        const tempQuestionText = this.add.text(0, 0, this.currentQuestion.question, {
            fontFamily: 'Arial',
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 620 },
            lineSpacing: 8
        }).setOrigin(0.5);
        
        const questionHeight = tempQuestionText.height;
        tempQuestionText.destroy(); // Remove temporary text
        
        // Calculate content dimensions based on actual content
        const answers = this.currentQuestion.options;
        const numAnswers = answers.length;
        const buttonHeight = 55;
        const buttonSpacing = 70;
        const titleHeight = 60;
        const questionNumberHeight = 30;
        const questionPadding = 70; // Increased from 40 to 70 for more space
        const bottomPadding = 30;
        
        // Calculate required height based on actual content
        const contentHeight = titleHeight + questionNumberHeight + questionHeight + questionPadding + (numAnswers * buttonSpacing) + bottomPadding;
        const contentWidth = 700;
        
        // Create modern quiz box with dynamic size
        const quizBox = this.add.graphics();
        quizBox.fillStyle(0x2a2a3a, 1);
        quizBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 20);
        quizBox.lineStyle(4, 0x64ffda);
        quizBox.strokeRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 20);
        
        // Add glow effect
        const glowBox = this.add.graphics();
        glowBox.lineStyle(8, 0x64ffda, 0.3);
        glowBox.strokeRoundedRect(-contentWidth/2 - 4, -contentHeight/2 - 4, contentWidth + 8, contentHeight + 8, 20);
        
        this.quizContainer.add([glowBox, quizBox]);
        
        // Title with programming language
        const courseTopic = this.courseTopic || 'Programming';
        this.titleText = this.add.text(0, -contentHeight/2 + 30, `${courseTopic.toUpperCase()} QUIZ CHALLENGE`, {
            fontFamily: 'Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#64ffda',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(this.titleText);
        
        // Question number indicator
        const questionNumber = this.add.text(0, -contentHeight/2 + titleHeight + 15, 'Question 1 of 1', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#a0a0a0',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(questionNumber);
        
        // Question text with better formatting
        this.questionText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + (questionHeight/2) + 10, this.currentQuestion.question, {
            fontFamily: 'Arial',
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 620 },
            lineSpacing: 8
        }).setOrigin(0.5);
        this.quizContainer.add(this.questionText);
        
        // Calculate start position for answer buttons
        const buttonStartY = titleHeight + questionNumberHeight + questionHeight + questionPadding - contentHeight/2;
        
        // Create answer options with modern design
        this.createAnswerButtons(buttonStartY);
        
        // Add instruction text
        const instructionText = this.add.text(0, 200, 'Click on your answer choice', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#a0a0a0',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(instructionText);
        
        // Add entrance animation
        this.quizContainer.setScale(0.8);
        this.quizContainer.setAlpha(0);
        
        this.tweens.add({
            targets: this.quizContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
    }

    createDragDropInterface(centerX, centerY) {
        // Create main quiz container
        this.quizContainer = this.add.container(centerX, centerY);
        
        // Calculate responsive dimensions
        const maxWidth = Math.min(this.scale.width * 0.9, 1000);
        const maxHeight = Math.min(this.scale.height * 0.8, 700);
        
        // Calculate content areas
        const titleHeight = 50; // Reduced from 80 to 50
        const questionNumberHeight = 0; // Remove question number area
        const questionHeight = 100;
        const instructionHeight = 120; // Increased from 80 to 120 for more space for note visibility
        const draggableAreaHeight = 300;
        const submitAreaHeight = 80; // Reduced from 120 to 80 for less space above submit
        
        const contentHeight = titleHeight + questionNumberHeight + questionHeight + instructionHeight + draggableAreaHeight + submitAreaHeight;
        const contentWidth = maxWidth;
        
        // Create main background with same style as multiple choice
        const quizBox = this.add.graphics();
        quizBox.fillStyle(0x1a2332, 0.95);
        quizBox.fillRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 20);
        quizBox.lineStyle(3, 0x34495e, 1);
        quizBox.strokeRoundedRect(-contentWidth/2, -contentHeight/2, contentWidth, contentHeight, 20);
        
        // Add glow effect
        const glowBox = this.add.graphics();
        glowBox.lineStyle(8, 0x64ffda, 0.3);
        glowBox.strokeRoundedRect(-contentWidth/2 - 4, -contentHeight/2 - 4, contentWidth + 8, contentHeight + 8, 20);
        
        this.quizContainer.add([glowBox, quizBox]);
        
        // Title with programming language - same style as multiple choice
        const courseTopic = this.courseTopic || 'Programming';
        this.titleText = this.add.text(0, -contentHeight/2 + 30, `${courseTopic.toUpperCase()} CODE ARRANGEMENT`, {
            fontFamily: 'Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#64ffda',
            align: 'center'
        }).setOrigin(0.5);
        this.quizContainer.add(this.titleText);
        
        // Question text with better formatting - same style as multiple choice
        this.questionText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + (questionHeight/2) + 10, this.currentQuestion.title, {
            fontFamily: 'Arial',
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: contentWidth - 80 },
            lineSpacing: 8
        }).setOrigin(0.5);
        this.quizContainer.add(this.questionText);
        
        // Description text
        const descText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + 20, this.currentQuestion.description, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#bdc3c7',
            align: 'center',
            wordWrap: { width: contentWidth - 100 }
        }).setOrigin(0.5);
        this.quizContainer.add(descText);
        
        // Instruction text - same style as multiple choice
        const instructionText = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + 60, 'Drag code blocks to arrange them in correct order', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#64ffda',
            align: 'center',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        this.quizContainer.add(instructionText);
        
        // Add swap behavior note with more space
        const swapNote = this.add.text(0, -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + 90, 'Note: Unplaced blocks can swap with placed blocks, but placed blocks cannot be removed', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#a0a0a0',
            align: 'center',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        this.quizContainer.add(swapNote);
        
        // Store dimensions for responsive block creation
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;
        this.draggableAreaY = -contentHeight/2 + titleHeight + questionNumberHeight + questionHeight + instructionHeight + 50;
        
        // Create shuffled blocks and drop zones
        this.createDragDropBlocks();
        
        // Submit button
        this.createSubmitButton();
        
        // Add entrance animation
        this.quizContainer.setScale(0.8);
        this.quizContainer.setAlpha(0);
        
        this.tweens.add({
            targets: this.quizContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
    }

    createDragDropBlocks() {
        const blocks = [...this.currentQuestion.blocks];
        const correctOrder = this.currentQuestion.correctOrder;
        
        // Shuffle blocks for dragging
        Phaser.Utils.Array.Shuffle(blocks);
        
        this.dragBlocks = [];
        this.dropZones = [];
        this.currentOrder = new Array(blocks.length).fill(null);
        
        // Calculate responsive dimensions
        const blockWidth = Math.min(350, (this.contentWidth - 100) / 2);
        const blockHeight = 50;
        const blockSpacing = 60;
        
        // Calculate positions for left side (draggable blocks) and right side (drop zones)
        const leftX = -this.contentWidth/4;
        const rightX = this.contentWidth/4;
        const startY = this.draggableAreaY;
        
        // Create drag blocks (left side)
        blocks.forEach((block, index) => {
            const blockY = startY + (index * blockSpacing);
            
            const blockObj = this.add.rectangle(leftX, blockY, blockWidth, blockHeight, 0x3498db);
            blockObj.setStrokeStyle(2, 0x2980b9);
            
            const blockText = this.add.text(leftX, blockY, block, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: blockWidth - 20 }
            }).setOrigin(0.5);
            
            // Make interactive
            blockObj.setInteractive({ draggable: true });
            blockText.setInteractive({ draggable: true });
            
            // Store data
            blockObj.originalText = block;
            blockObj.textObj = blockText;
            blockText.blockObj = blockObj;
            blockText.originalText = block;
            
            this.setupDragEvents(blockObj, blockText);
            
            this.quizContainer.add([blockObj, blockText]);
            this.dragBlocks.push({ block: blockObj, text: blockText, originalText: block });
        });
        
        // Create drop zones (right side) with better styling
        for (let i = 0; i < blocks.length; i++) {
            const dropY = startY + (i * blockSpacing);
            
            const dropZone = this.add.rectangle(rightX, dropY, blockWidth, blockHeight, 0x95a5a6);
            dropZone.setStrokeStyle(2, 0x7f8c8d);
            dropZone.setAlpha(0.3);
            
            const label = this.add.text(rightX, dropY, `${i + 1}. Drop here`, {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#2c3e50',
                align: 'center',
                fontWeight: 'bold'
            }).setOrigin(0.5);
            
            dropZone.setInteractive({ dropZone: true });
            dropZone.index = i;
            dropZone.label = label;
            
            this.quizContainer.add([dropZone, label]);
            this.dropZones.push(dropZone);
        }
    }

    setupDragEvents(blockObj, blockText) {
        // Store initial offsets between block and text
        const textOffsetX = blockText.x - blockObj.x;
        const textOffsetY = blockText.y - blockObj.y;
        
        // Set up drag events for the block
        blockObj.on('dragstart', (pointer, dragX, dragY) => {
            blockObj.setFillStyle(0xffff00); // Yellow highlight
            blockText.setColor('#000000'); // Dark text for visibility
            
            // Store the offset from mouse to block center when drag starts
            blockObj.dragOffsetX = pointer.worldX - (blockObj.x + this.quizContainer.x);
            blockObj.dragOffsetY = pointer.worldY - (blockObj.y + this.quizContainer.y);
        });
        
        blockObj.on('drag', (pointer, dragX, dragY) => {
            // Calculate new position relative to container, accounting for initial offset
            const newX = pointer.worldX - this.quizContainer.x - blockObj.dragOffsetX;
            const newY = pointer.worldY - this.quizContainer.y - blockObj.dragOffsetY;
            
            // Update block position
            blockObj.x = newX;
            blockObj.y = newY;
            
            // Update text position to stay with the block
            blockText.x = newX + textOffsetX;
            blockText.y = newY + textOffsetY;
        });
        
        blockObj.on('dragend', () => {
            // Check if block is in a drop zone to determine styling
            let isInDropZone = false;
            for (let i = 0; i < this.currentOrder.length; i++) {
                if (this.currentOrder[i] === blockObj) {
                    isInDropZone = true;
                    break;
                }
            }
            
            if (isInDropZone) {
                // Keep drop zone styling
                blockObj.setFillStyle(0x2ecc71);
                blockText.setColor('#ffffff');
            } else {
                // Back to original left side styling
                blockObj.setFillStyle(0x3498db);
                blockText.setColor('#ffffff');
            }
        });
        
        // Set up drag events for the text (should move the block too)
        blockText.on('dragstart', (pointer, dragX, dragY) => {
            blockObj.setFillStyle(0xffff00); // Yellow highlight
            blockText.setColor('#000000'); // Dark text for visibility
            
            // Store the offset from mouse to text position when drag starts
            blockText.dragOffsetX = pointer.worldX - (blockText.x + this.quizContainer.x);
            blockText.dragOffsetY = pointer.worldY - (blockText.y + this.quizContainer.y);
        });
        
        blockText.on('drag', (pointer, dragX, dragY) => {
            // Calculate new text position relative to container, accounting for initial offset
            const newTextX = pointer.worldX - this.quizContainer.x - blockText.dragOffsetX;
            const newTextY = pointer.worldY - this.quizContainer.y - blockText.dragOffsetY;
            
            // Update text position
            blockText.x = newTextX;
            blockText.y = newTextY;
            
            // Update block position to stay with the text
            blockObj.x = newTextX - textOffsetX;
            blockObj.y = newTextY - textOffsetY;
        });
        
        blockText.on('dragend', () => {
            // Check if block is in a drop zone to determine styling
            let isInDropZone = false;
            for (let i = 0; i < this.currentOrder.length; i++) {
                if (this.currentOrder[i] === blockObj) {
                    isInDropZone = true;
                    break;
                }
            }
            
            if (isInDropZone) {
                // Keep drop zone styling
                blockObj.setFillStyle(0x2ecc71);
                blockText.setColor('#ffffff');
            } else {
                // Back to original left side styling
                blockObj.setFillStyle(0x3498db);
                blockText.setColor('#ffffff');
            }
        });
        
        // Drop zone events
        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (this.dropZones.includes(dropZone)) {
                // Calculate positions for repositioning
                const leftX = -this.contentWidth/4;
                const rightX = this.contentWidth/4;
                
                // Get the dragged object (could be block or text)
                let draggedBlock, draggedText;
                if (gameObject.textObj) {
                    // It's a block object
                    draggedBlock = gameObject;
                    draggedText = gameObject.textObj;
                } else if (gameObject.blockObj) {
                    // It's a text object
                    draggedText = gameObject;
                    draggedBlock = gameObject.blockObj;
                }
                
                // Check if there's already something in this drop zone
                const existingBlock = this.currentOrder[dropZone.index];
                
                if (existingBlock) {
                    // SWAP: Find where the dragged item came from
                    let draggedFromIndex = -1;
                    
                    // Check if dragged item was in a drop zone
                    for (let i = 0; i < this.currentOrder.length; i++) {
                        if (this.currentOrder[i] === draggedBlock) {
                            draggedFromIndex = i;
                            break;
                        }
                    }
                    
                    if (draggedFromIndex !== -1) {
                        // Swap positions: move existing block to where dragged item came from
                        const swapDropZone = this.dropZones[draggedFromIndex];
                        existingBlock.x = swapDropZone.x;
                        existingBlock.y = swapDropZone.y;
                        existingBlock.textObj.x = swapDropZone.x;
                        existingBlock.textObj.y = swapDropZone.y;
                        this.currentOrder[draggedFromIndex] = existingBlock;
                        
                        // Keep existing block styled for drop zone
                        existingBlock.setFillStyle(0x2ecc71);
                        existingBlock.setStrokeStyle(3, 0x27ae60);
                        existingBlock.textObj.setStyle({
                            color: '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '15px'
                        });
                        
                        // Update the original drop zone appearance
                        swapDropZone.setAlpha(0.1); // 10% opacity for occupied zones
                        swapDropZone.label.setText(`${draggedFromIndex + 1}.`);
                    } else {
                        // Dragged item came from the left side, send existing block back to left
                        const dragBlockIndex = this.dragBlocks.findIndex(db => db.block === draggedBlock);
                        const originalY = this.draggableAreaY + (dragBlockIndex * 60);
                        existingBlock.x = leftX;
                        existingBlock.y = originalY;
                        existingBlock.textObj.x = leftX;
                        existingBlock.textObj.y = originalY;
                        
                        // Reset block styling when returning to left side
                        existingBlock.setFillStyle(0x3498db);
                        existingBlock.setStrokeStyle(2, 0x2980b9);
                        existingBlock.textObj.setStyle({
                            color: '#ffffff',
                            fontWeight: 'normal',
                            fontSize: '14px'
                        });
                    }
                } else {
                    // No existing block, check if dragged item was in another drop zone
                    for (let i = 0; i < this.currentOrder.length; i++) {
                        if (this.currentOrder[i] === draggedBlock) {
                            // Clear the previous position
                            this.currentOrder[i] = null;
                            this.dropZones[i].setAlpha(0.3);
                            this.dropZones[i].label.setText(`${i + 1}. Drop here`);
                            break;
                        }
                    }
                }
                
                // Place the dragged item in the new position
                draggedBlock.x = dropZone.x;
                draggedBlock.y = dropZone.y;
                draggedText.x = dropZone.x;
                draggedText.y = dropZone.y;
                this.currentOrder[dropZone.index] = draggedBlock;
                
                // Make the block more visible when dropped in zone
                draggedBlock.setFillStyle(0x2ecc71); // Bright green for dropped blocks
                draggedBlock.setStrokeStyle(3, 0x27ae60); // Thicker green border
                draggedText.setStyle({
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '15px' // Slightly larger text
                });
                
                // Update drop zone appearance
                dropZone.setAlpha(0.1); // 10% opacity for occupied drop zones
                dropZone.label.setText(`${dropZone.index + 1}.`);
            }
        });
    }

    createSubmitButton() {
        // Position the submit button at the bottom of the content area with more space above
        const submitY = this.contentHeight/2 - 60; // Increased from -40 to -60 for more space above
        
        // Create submit button with same style as multiple choice
        const submitBtn = this.add.graphics();
        submitBtn.fillStyle(0x27ae60, 1);
        submitBtn.fillRoundedRect(-100, -25, 200, 50, 10);
        submitBtn.lineStyle(2, 0x229954, 1);
        submitBtn.strokeRoundedRect(-100, -25, 200, 50, 10);
        submitBtn.x = 0;
        submitBtn.y = submitY;
        
        const submitText = this.add.text(0, submitY, 'Submit Order', {
            fontFamily: 'Arial',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Create invisible hit area for better interaction
        const hitArea = this.add.rectangle(0, submitY, 200, 50, 0x000000, 0);
        hitArea.setInteractive();
        
        // Add hover effects
        hitArea.on('pointerover', () => {
            submitBtn.clear();
            submitBtn.fillStyle(0x229954, 1);
            submitBtn.fillRoundedRect(-100, -25, 200, 50, 10);
            submitBtn.lineStyle(3, 0x1e8449, 1);
            submitBtn.strokeRoundedRect(-100, -25, 200, 50, 10);
        });
        
        hitArea.on('pointerout', () => {
            submitBtn.clear();
            submitBtn.fillStyle(0x27ae60, 1);
            submitBtn.fillRoundedRect(-100, -25, 200, 50, 10);
            submitBtn.lineStyle(2, 0x229954, 1);
            submitBtn.strokeRoundedRect(-100, -25, 200, 50, 10);
        });
        
        hitArea.on('pointerdown', () => this.checkDragDropAnswer());
        
        this.quizContainer.add([submitBtn, submitText, hitArea]);
    }

    checkDragDropAnswer() {
        // Prevent multiple submissions and check for timer expiration first
        if (this.answerSubmitted || this.timerExpired) return;
        this.answerSubmitted = true;
        
        // Disable submit button
        this.quizContainer.list[this.quizContainer.list.length - 2].setAlpha(0.5); // Submit button
        this.quizContainer.list[this.quizContainer.list.length - 1].setAlpha(0.5); // Submit text
        
        const userOrder = this.currentOrder.map(item => {
            if (item) {
                return item.originalText || item.textObj.originalText;
            }
            return null;
        });
        
        const correctTexts = this.currentQuestion.correctOrder.map(index => 
            this.currentQuestion.blocks[index]
        );
        
        const isCorrect = userOrder.every((text, index) => text === correctTexts[index]);
        
        console.log('User order:', userOrder);
        console.log('Correct order:', correctTexts);
        console.log('Is correct:', isCorrect);
        
        // Visual feedback for drag and drop blocks
        this.currentOrder.forEach((block, index) => {
            if (block) {
                const userText = block.originalText || block.textObj.originalText;
                const correctText = correctTexts[index];
                const isBlockCorrect = userText === correctText;
                
                if (isBlockCorrect) {
                    // Correct block - green
                    block.setFillStyle(0x38a169);
                    block.setStrokeStyle(3, 0xffffff);
                    block.textObj.setStyle({
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '15px'
                    });
                } else {
                    // Wrong block - red
                    block.setFillStyle(0xe53e3e);
                    block.setStrokeStyle(3, 0xffffff);
                    block.textObj.setStyle({
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '15px'
                    });
                }
                
                // Disable dragging
                block.disableInteractive();
                block.textObj.disableInteractive();
            }
        });
        
        // If wrong, highlight correct blocks on the left side
        if (!isCorrect) {
            this.dragBlocks.forEach((dragBlock) => {
                const correctIndex = correctTexts.findIndex(text => text === dragBlock.originalText);
                if (correctIndex !== -1 && !this.currentOrder[correctIndex]) {
                    // This block should be in a drop zone but isn't
                    dragBlock.block.setFillStyle(0x38a169);
                    dragBlock.block.setStrokeStyle(2, 0xffffff, 0.7);
                    dragBlock.text.setStyle({
                        color: '#ffffff',
                        fontWeight: 'bold'
                    });
                }
            });
        }
        
        // Show result after a brief delay (only if timer hasn't expired)
        this.time.delayedCall(400, () => {
            if (!this.timerExpired) {
                this.showResult(isCorrect);
            }
        });
    }

    createAnswerButtons(startOffset) {
        const answers = this.currentQuestion.options;
        const startY = startOffset || -80; // Start position relative to center
        const buttonHeight = 55;
        const buttonSpacing = 70;
        
        this.answerButtons = [];
        
        for (let i = 0; i < answers.length; i++) {
            const buttonY = startY + (i * buttonSpacing);
            
            // Create button container
            const buttonContainer = this.add.container(0, buttonY);
            
            // Create button background with solid color
            const buttonBg = this.add.graphics();
            buttonBg.fillStyle(0x4a5568, 1);
            buttonBg.fillRoundedRect(-320, -30, 640, 55, 10);
            buttonBg.lineStyle(2, 0x64ffda, 0.5);
            buttonBg.strokeRoundedRect(-320, -30, 640, 55, 10);
            
            // Create answer text with better wrapping and larger font
            const answerText = this.add.text(0, 0, `${String.fromCharCode(65 + i)}. ${answers[i]}`, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 580 }
            }).setOrigin(0.5);
            
            // Create interactive area
            const hitArea = this.add.rectangle(0, 0, 640, 55, 0x000000, 0);
            hitArea.setInteractive();
            
            buttonContainer.add([buttonBg, answerText, hitArea]);
            this.quizContainer.add(buttonContainer);
            
            // Store references
            this.answerButtons.push({
                container: buttonContainer,
                background: buttonBg,
                text: answerText,
                hitArea: hitArea,
                index: i,
                isSelected: false
            });
            
            // Add hover effects
            hitArea.on('pointerover', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillStyle(0x64ffda, 0.3);
                    buttonBg.fillRoundedRect(-320, -30, 640, 55, 10);
                    buttonBg.lineStyle(2, 0x64ffda);
                    buttonBg.strokeRoundedRect(-320, -30, 640, 55, 10);
                }
            });

            hitArea.on('pointerout', () => {
                if (!this.answerButtons[i].isSelected) {
                    buttonBg.clear();
                    buttonBg.fillStyle(0x4a5568, 1);
                    buttonBg.fillRoundedRect(-320, -30, 640, 55, 10);
                    buttonBg.lineStyle(2, 0x64ffda, 0.5);
                    buttonBg.strokeRoundedRect(-320, -30, 640, 55, 10);
                }
            });            // Add click handler
            hitArea.on('pointerdown', () => {
                this.selectAnswer(i);
            });
        }
    }

    selectAnswer(selectedIndex) {
        // Prevent multiple selections and check for timer expiration first
        if (this.selectedAnswer !== null || this.timerExpired) return;
        
        this.selectedAnswer = selectedIndex;
        const correctIndex = this.currentQuestion.correctIndex;
        const isCorrect = selectedIndex === correctIndex;
        
        // Update button appearance to show selection
        this.answerButtons.forEach((button, index) => {
            button.isSelected = true;
            
            if (index === selectedIndex) {
                // Selected answer
                button.background.clear();
                if (isCorrect) {
                    button.background.fillStyle(0x38a169, 1);
                } else {
                    button.background.fillStyle(0xe53e3e, 1);
                }
                button.background.fillRoundedRect(-320, -30, 640, 55, 10);
                button.background.lineStyle(3, 0xffffff);
                button.background.strokeRoundedRect(-320, -30, 640, 55, 10);
            } else if (index === correctIndex && !isCorrect) {
                // Show correct answer if user was wrong
                button.background.clear();
                button.background.fillStyle(0x38a169, 1);
                button.background.fillRoundedRect(-320, -30, 640, 55, 10);
                button.background.lineStyle(2, 0xffffff, 0.7);
                button.background.strokeRoundedRect(-320, -30, 640, 55, 10);
            }
            
            // Disable interaction
            button.hitArea.removeInteractive();
        });
        
        // Show result after a brief delay (only if timer hasn't expired)
        this.time.delayedCall(400, () => {
            if (!this.timerExpired) {
                this.showResult(isCorrect);
            }
        });
    }

    showResult(isCorrect) {
        // Don't show result if timer has expired
        if (this.timerExpired) return;
        
        // Create result overlay
        this.resultContainer = this.add.container(this.scale.width / 2, this.scale.height / 2 + 300);
        
        const resultBg = this.add.graphics();
        resultBg.fillStyle(isCorrect ? 0x38a169 : 0xe53e3e, 0.9);
        resultBg.fillRoundedRect(-200, -50, 400, 100, 15);
        resultBg.lineStyle(3, 0xffffff);
        resultBg.strokeRoundedRect(-200, -50, 400, 100, 15);
        
        const resultText = this.add.text(0, -10, 
            isCorrect ? 'CORRECT!' : 'INCORRECT!', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        const rewardText = this.add.text(0, 15, 
            isCorrect ? '+100 Score, +10 Seconds' : 'Better luck next time!', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        this.resultContainer.add([resultBg, resultText, rewardText]);
        
        // Animate result appearance
        this.resultContainer.setScale(0.5);
        this.resultContainer.setAlpha(0);
        
        this.tweens.add({
            targets: this.resultContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Return to gameplay after delay (only if timer hasn't expired)
        this.time.delayedCall(1200, () => {
            if (!this.timerExpired) {
                this.returnToGameplay(isCorrect);
            }
        });
    }

    returnToGameplay(isCorrect) {
        // Don't proceed if timer has expired (scene should already be stopping)
        if (this.timerExpired) return;
        
        // Prepare result data to send back
        const resultData = {
            correct: isCorrect,
            enemyToDestroy: this.enemyData
        };
        
        // Animate exit
        this.tweens.add({
            targets: [this.quizContainer, this.resultContainer],
            scaleX: 0.8,
            scaleY: 0.8,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeIn',
            onComplete: () => {
                // Send completion event to main gameplay scene and stop quiz scene
                this.scene.get('MainGameplay').events.emit('quiz-completed', resultData);
                this.scene.stop();
            }
        });
    }

    handleTimerExpired() {
        // Immediately close quiz scene when timer runs out - highest priority
        if (!this.timerExpired) {
            this.timerExpired = true;
            this.answerSubmitted = true; // Prevent any answer submission
            
            // Cancel any pending delayed calls
            if (this.time && this.time.removeAllEvents) {
                this.time.removeAllEvents();
            }
            
            // Immediately return to gameplay without any animations or delays
            const resultData = {
                correct: false,
                enemyToDestroy: this.enemyData
            };
            
            // Send completion event and stop scene immediately
            const mainScene = this.scene.get('MainGameplay');
            if (mainScene && mainScene.events) {
                mainScene.events.emit('quiz-completed', resultData);
            }
            this.scene.stop();
        }
    }

    destroy() {
        // Clean up event listeners
        const mainScene = this.scene.get('MainGameplay');
        if (mainScene) {
            mainScene.events.off('timer-expired', this.handleTimerExpired, this);
        }
        super.destroy();
    }
}
