import Phaser from 'phaser';
import { createBackButton } from '/src/components/buttons/backbutton.js';
import { char1 } from '/src/gameManager.js';
import { DEFAULT_TEXT_STYLE } from '/src/game.js';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    createResponsiveTextStyle,
    createDebouncedClickHandler
} from '/src/utils/mobileUtils.js';

export default class NoahChapterSelect extends Phaser.Scene {
    constructor() {
        super('NoahChapterSelect');
    }

    preload() {
        // Load backgrounds
        this.load.image('classroom_bg', 'assets/img/bg/classroom_day.png');
        
        // Load sounds
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
    }

    create() {
        // Get responsive scaling info
        let scaleInfo;
        try {
            scaleInfo = getScaleInfo(this);
        } catch (error) {
            console.warn('Mobile utils not available, using fallback scaling');
            const { width, height } = this.scale;
            scaleInfo = {
                width,
                height,
                finalScale: Math.min(width / 1920, height / 1080),
                isMobile: width < 768 || height < 600,
                isPortrait: height > width
            };
        }
        
        const { width, height } = scaleInfo;
        
        // Background
        this.bg = this.add.image(width / 2, height / 2, 'classroom_bg');
        this.bg.setDisplaySize(width, height);
        
        // Add dimming overlay for better readability
        this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        this.dimOverlay.setDepth(0); // Behind everything else
        
        // Sound effects
        this.hoverSound = this.sound.add('se_select');
        this.confirmSound = this.sound.add('se_confirm');
        
        // Title with main menu styling
        const titleStyle = createResponsiveTextStyle(48, scaleInfo, {
            color: '#1e90ff',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { 
                offsetX: 4, 
                offsetY: 4, 
                color: '#000', 
                blur: 8, 
                fill: true 
            }
        });
        
        this.add.text(width / 2, height * 0.15, "Noah's Web Development Story", titleStyle)
            .setOrigin(0.5);
        
        // Chapter buttons
        const chapters = [
            {
                title: "Chapter 1: HTML Basics",
                description: "Learn the structure of web pages",
                chapter: 0,
                unlocked: true,
                completed: char1.storyProgress && char1.storyProgress.chapter > 0
            },
            {
                title: "Chapter 2: CSS Styling", 
                description: "Make your pages beautiful",
                chapter: 1,
                unlocked: char1.storyProgress && char1.storyProgress.chapter >= 1,
                completed: char1.storyProgress && char1.storyProgress.chapter > 1
            },
            {
                title: "Chapter 3: JavaScript Power",
                description: "Add interactivity to your sites",
                chapter: 2,
                unlocked: char1.storyProgress && char1.storyProgress.chapter >= 2,
                completed: char1.storyProgress && char1.storyProgress.chapter > 2
            }
        ];
        
        const buttonHeight = 80;
        const buttonSpacing = 100;
        const startY = height * 0.35;
        
        chapters.forEach((chapter, index) => {
            const y = startY + (index * buttonSpacing);
            const isUnlocked = chapter.unlocked;
            const isCompleted = chapter.completed;
            
            // Create main menu style button
            this.createStoryButton(
                width / 2, 
                y, 
                chapter.title, 
                chapter.description, 
                isUnlocked, 
                isCompleted,
                () => this.startChapter(chapter.chapter),
                scaleInfo
            );
        });
        
        // Continue Story button (if story is in progress)
        if (char1.storyProgress && char1.storyProgress.chapter < 3 && !char1.storyProgress.completed) {
            this.createContinueButton(width / 2, height * 0.8, scaleInfo);
        }
        
        // Back button
        createBackButton(this, 'Classroom');
    }
    
    createStoryButton(x, y, title, description, isUnlocked, isCompleted, onClick, scaleInfo) {
        // Calculate button dimensions
        const btnWidth = scaleDimension(500, scaleInfo);
        const btnHeight = scaleDimension(80, scaleInfo);
        const corner = scaleDimension(25, scaleInfo);
        const strokeWidth = scaleDimension(3, scaleInfo);
        
        // Determine button colors based on state
        let bgColor, hoverColor, borderColor, textColor, descColor;
        
        if (!isUnlocked) {
            // Locked state
            bgColor = 0x222244;
            hoverColor = 0x222244;
            borderColor = 0x444444;
            textColor = '#888888';
            descColor = '#666666';
        } else if (isCompleted) {
            // Completed state
            bgColor = 0x2e7d32;
            hoverColor = 0x4caf50;
            borderColor = 0x66bb6a;
            textColor = '#ffffff';
            descColor = '#cccccc';
        } else {
            // Available state
            bgColor = 0x222244;
            hoverColor = 0x333388;
            borderColor = 0xffffcc;
            textColor = '#ffff00';
            descColor = '#ffffff';
        }
        
        // Button background with main menu styling
        const bg = this.add.graphics();
        bg.fillStyle(bgColor, 0.92);
        bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        bg.lineStyle(strokeWidth, borderColor, 1);
        bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        
        // Title text with main menu styling
        const titleStyle = createResponsiveTextStyle(24, scaleInfo, {
            color: textColor,
            stroke: '#000000',
            strokeThickness: scaleDimension(4, scaleInfo),
            shadow: { 
                offsetX: scaleDimension(2, scaleInfo), 
                offsetY: scaleDimension(2, scaleInfo), 
                color: '#000', 
                blur: scaleDimension(4, scaleInfo), 
                fill: true 
            }
        });
        
        const titleText = this.add.text(x, y - scaleDimension(15, scaleInfo), title, titleStyle)
            .setOrigin(0.5);
        
        // Description text
        const descStyle = createResponsiveTextStyle(16, scaleInfo, {
            color: descColor,
            stroke: '#000000',
            strokeThickness: scaleDimension(2, scaleInfo)
        });
        
        const descText = this.add.text(x, y + scaleDimension(15, scaleInfo), description, descStyle)
            .setOrigin(0.5);
        
        // Status icon
        const iconX = x + btnWidth / 2 - scaleDimension(40, scaleInfo);
        let statusIcon = null;
        
        if (!isUnlocked) {
            statusIcon = this.add.text(iconX, y, '🔒', {
                fontSize: `${scaleDimension(32, scaleInfo)}px`
            }).setOrigin(0.5);
        } else if (isCompleted) {
            statusIcon = this.add.text(iconX, y, '✅', {
                fontSize: `${scaleDimension(32, scaleInfo)}px`
            }).setOrigin(0.5);
        }
        
        // Interactivity for unlocked buttons
        if (isUnlocked) {
            const hitArea = this.add.rectangle(x, y, btnWidth, btnHeight, 0x000000, 0)
                .setInteractive({ useHandCursor: true });
            
            // Hover effects (only for non-mobile)
            if (!scaleInfo.isMobile) {
                hitArea.on('pointerover', () => {
                    titleText.setStyle({ color: '#ffffff' });
                    bg.clear();
                    bg.fillStyle(hoverColor, 1);
                    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
                    bg.lineStyle(strokeWidth, borderColor, 1);
                    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
                    if (!this.hoverSound.isPlaying) this.hoverSound.play();
                });
                
                hitArea.on('pointerout', () => {
                    titleText.setStyle({ color: textColor });
                    bg.clear();
                    bg.fillStyle(bgColor, 0.92);
                    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
                    bg.lineStyle(strokeWidth, borderColor, 1);
                    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
                });
            }
            
            // Click handler with debouncing
            const debouncedClick = createDebouncedClickHandler(() => {
                this.confirmSound.play();
                onClick();
            }, 300);
            
            hitArea.on('pointerdown', (pointer) => {
                // Visual feedback
                titleText.setScale(0.96);
                descText.setScale(0.96);
                
                // Execute debounced callback
                debouncedClick(pointer);
                
                // Reset scale after a short delay
                this.time.delayedCall(100, () => {
                    titleText.setScale(1);
                    descText.setScale(1);
                });
            });
        }
    }
    
    createContinueButton(x, y, scaleInfo) {
        const btnWidth = scaleDimension(300, scaleInfo);
        const btnHeight = scaleDimension(50, scaleInfo);
        const corner = scaleDimension(25, scaleInfo);
        const strokeWidth = scaleDimension(3, scaleInfo);
        
        // Button background with main menu styling
        const bg = this.add.graphics();
        bg.fillStyle(0x2196f3, 0.92);
        bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        bg.lineStyle(strokeWidth, 0x64b5f6, 1);
        bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        
        // Button text with main menu styling
        const textStyle = createResponsiveTextStyle(24, scaleInfo, {
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: scaleDimension(4, scaleInfo),
            shadow: { 
                offsetX: scaleDimension(2, scaleInfo), 
                offsetY: scaleDimension(2, scaleInfo), 
                color: '#000', 
                blur: scaleDimension(4, scaleInfo), 
                fill: true 
            }
        });
        
        const text = this.add.text(x, y, 'Continue Story', textStyle)
            .setOrigin(0.5);
        
        const hitArea = this.add.rectangle(x, y, btnWidth, btnHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        
        // Hover effects (only for non-mobile)
        if (!scaleInfo.isMobile) {
            hitArea.on('pointerover', () => {
                text.setStyle({ color: '#ffffff' });
                bg.clear();
                bg.fillStyle(0x42a5f5, 1);
                bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
                bg.lineStyle(strokeWidth, 0x64b5f6, 1);
                bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
                if (!this.hoverSound.isPlaying) this.hoverSound.play();
            });
            
            hitArea.on('pointerout', () => {
                text.setStyle({ color: '#ffffff' });
                bg.clear();
                bg.fillStyle(0x2196f3, 0.92);
                bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
                bg.lineStyle(strokeWidth, 0x64b5f6, 1);
                bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
            });
        }
        
        // Click handler with debouncing
        const debouncedClick = createDebouncedClickHandler(() => {
            this.confirmSound.play();
            this.scene.start('NoahStoryMode');
        }, 300);
        
        hitArea.on('pointerdown', (pointer) => {
            // Visual feedback
            text.setScale(0.96);
            
            // Execute debounced callback
            debouncedClick(pointer);
            
            // Reset scale after a short delay
            this.time.delayedCall(100, () => {
                text.setScale(1);
            });
        });
    }
    
    startChapter(chapterIndex) {
        // Set the story progress to the selected chapter
        char1.storyProgress = {
            chapter: chapterIndex,
            scene: 0,
            completed: false
        };
        
        // Start the story mode
        this.scene.start('NoahStoryMode');
    }
}
