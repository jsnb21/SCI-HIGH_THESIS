// Enhanced Library Scene with Carousel Interface and Ebook Links

import Carousel from '../../ui/carouselUI.js';
import { createBackButton } from '../../components/buttons/backbutton.js';
import { onceOnlyFlags } from '../../gameManager';
import TutorialManager from '../../components/TutorialManager.js';
import { LIBRARY_TUTORIAL_STEPS } from '../../components/TutorialConfig.js';
import { playExclusiveBGM, updateSoundVolumes } from '../../audioUtils.js';

class BaseLibraryScene extends Phaser.Scene {
    constructor() {
        super({ 
            key: 'BaseLibraryScene',
            active: false
        });
        this.carousel = null;
        this.booksData = null;
        this.ebookDialog = null;
        this.isDialogOpen = false;
        this.tutorialManager = null;
        this.topicIcons = ['📚', '💻', '🌐', '📊', '🤖', '🎨'];
    }

    init(data) {
        // Receive data from previous scene
        this.previousScene = data?.previousScene || 'MainHub';
        this.playerData = data?.playerData || {};
        this.gameProgress = data?.gameProgress || {};
    }

    preload() {
        // Load library-specific assets
        this.load.image('libraryBg', 'assets/img/bg/libraryBG.png');
        
        // Load JSON data files
        this.load.json('booksData', `public/library/books.json`);
        this.load.json('libraryData', `public/library/library.json`);
        this.load.json('progressData', `public/library/progress.json`);
        this.load.json('notesData', `public/library/notes.json`);
        
        // Load audio files
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_library', 'assets/audio/bgm/bgm_library.mp3');
        
        // Create topic icons programmatically
        this.createTopicIcons();
    }

    createTopicIcons() {
        // Create programmatic topic icons for each category
        const categories = ['Programming', 'Data Science', 'Web Development', 'Computer Science', 'Machine Learning', 'Design'];
        const icons = ['📚', '📊', '🌐', '💻', '🤖', '🎨'];
        
        categories.forEach((category, index) => {
            const iconKey = `topic_${category.toLowerCase().replace(' ', '_')}`;
            
            // Create a simple colored circle with emoji as topic icon
            const graphics = this.add.graphics();
            graphics.fillStyle(0x4a90e2, 0.8);
            graphics.fillCircle(64, 64, 60);
            graphics.lineStyle(4, 0xffffff, 1);
            graphics.strokeCircle(64, 64, 60);
            
            // Add emoji text
            const emoji = this.add.text(64, 64, icons[index] || '📚', {
                fontSize: '48px',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            
            // Create texture from graphics
            const renderTexture = this.add.renderTexture(0, 0, 128, 128);
            renderTexture.draw(graphics);
            renderTexture.draw(emoji);
            
            // Save as texture
            renderTexture.saveTexture(iconKey);
            
            // Clean up
            graphics.destroy();
            emoji.destroy();
            renderTexture.destroy();
        });
    }

    create() {
        // Load books data
        this.loadBooksData();
        
        // Setup scene
        this.setupBackground();
        this.createLibraryTitle();
        this.createTopicCarousel();
        this.createBackButton();

        // Initialize sound effects and background music
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        playExclusiveBGM(this, 'bgm_library', { loop: true });
        updateSoundVolumes(this);

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);

        // Check if this is the first time visiting the library
        if (!onceOnlyFlags.hasSeen('library_tutorial')) {
            this.time.delayedCall(500, () => {
                this.startLibraryTutorial();
            });
        }

        // Debug features
        this.input.keyboard.on('keydown-T', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                this.startLibraryTutorial();
            }
        });

        this.input.keyboard.on('keydown-R', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                onceOnlyFlags.flags['library_tutorial'] = false;
                console.log('Library tutorial flag reset');
            }
        });
    }

    loadBooksData() {
        this.booksData = this.cache.json.get('booksData');
        
        if (!this.booksData || !this.booksData.categories) {
            console.warn('Books data not found, using default data');
            this.booksData = {
                categories: [
                    {
                        name: "Programming",
                        books: [
                            {
                                id: 1,
                                title: "Web Design Basics",
                                author: "Jane Smith",
                                status: "available",
                                description: "Learn the fundamentals of web design",
                                link: "https://example.com/web-design-basics"
                            }
                        ]
                    }
                ]
            };
        }
        
        console.log('Loaded books data:', this.booksData);
    }

    setupBackground() {
        // Add library background
        const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'libraryBg');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        bg.setDepth(-10);
    }

    createLibraryTitle() {
        const title = this.add.text(this.cameras.main.centerX, 80, 'DIGITAL LIBRARY', {
            fontSize: '48px',
            fontFamily: 'Caprasimo-Regular',
            color: '#ffe066',
            stroke: '#111122',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 12, fill: true }
        }).setOrigin(0.5).setDepth(100);

        const subtitle = this.add.text(this.cameras.main.centerX, 130, 'Choose a topic to explore available ebooks', {
            fontSize: '24px',
            fontFamily: 'Caprasimo-Regular',
            color: '#e0e0ff',
            stroke: '#111122',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 8, fill: true }
        }).setOrigin(0.5).setDepth(100);
    }

    createTopicCarousel() {
        // Get categories from books data
        const categories = this.booksData.categories || [];
        const iconKeys = [];
        const iconInfo = [];
        
        categories.forEach((category, index) => {
            const iconKey = `topic_${category.name.toLowerCase().replace(' ', '_')}`;
            iconKeys.push(iconKey);
            iconInfo.push({
                title: category.name,
                description: `${category.books.length} ebooks available`,
                category: category
            });
        });

        // Create carousel
        this.carousel = new Carousel(this, {
            iconYOffset: 50,
            iconSpacing: 200,
            iconToTitleGap: 120,
            iconToDescGap: 60,
            smallScale: 0.6,
            largeScale: 1.0
        });

        this.carousel.create(
            iconKeys,
            iconInfo,
            (selectedIndex) => this.onTopicSelected(selectedIndex),
            [] // No locked topics
        );
    }

    onTopicSelected(selectedIndex) {
        const categories = this.booksData.categories || [];
        const selectedCategory = categories[selectedIndex];
        
        if (selectedCategory) {
            this.showEbookDialog(selectedCategory);
        }
    }

    showEbookDialog(category) {
        if (this.isDialogOpen) return;
        
        this.isDialogOpen = true;
        
        // Create dialog container
        this.ebookDialog = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
        this.ebookDialog.setDepth(200);

        // Semi-transparent overlay
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
        overlay.setInteractive();
        overlay.on('pointerdown', () => this.closeEbookDialog());
        this.ebookDialog.add(overlay);

        // Dialog background
        const dialogWidth = Math.min(600, this.cameras.main.width * 0.9);
        const dialogHeight = Math.min(500, this.cameras.main.height * 0.8);
        
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x2a2a3a, 0.95);
        dialogBg.fillRoundedRect(-dialogWidth/2, -dialogHeight/2, dialogWidth, dialogHeight, 20);
        dialogBg.lineStyle(3, 0x4a90e2, 1);
        dialogBg.strokeRoundedRect(-dialogWidth/2, -dialogHeight/2, dialogWidth, dialogHeight, 20);
        this.ebookDialog.add(dialogBg);

        // Title
        const title = this.add.text(0, -dialogHeight/2 + 40, category.name, {
            fontSize: '32px',
            fontFamily: 'Caprasimo-Regular',
            color: '#ffe066',
            stroke: '#111122',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.ebookDialog.add(title);

        // Close button
        const closeBtn = this.add.text(dialogWidth/2 - 30, -dialogHeight/2 + 30, '✕', {
            fontSize: '24px',
            color: '#ff6666',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.closeEbookDialog());
        closeBtn.on('pointerover', () => closeBtn.setScale(1.2));
        closeBtn.on('pointerout', () => closeBtn.setScale(1));
        this.ebookDialog.add(closeBtn);

        // Books list
        this.createBooksList(category, dialogWidth, dialogHeight);

        // Animate dialog appearance
        this.ebookDialog.setScale(0);
        this.tweens.add({
            targets: this.ebookDialog,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    createBooksList(category, dialogWidth, dialogHeight) {
        const books = category.books || [];
        const listStartY = -dialogHeight/2 + 100;
        const itemHeight = 80;
        const maxVisibleItems = Math.floor((dialogHeight - 200) / itemHeight);
        
        // Create scrollable container for books
        const booksContainer = this.add.container(0, 0);
        this.ebookDialog.add(booksContainer);

        books.forEach((book, index) => {
            if (index >= maxVisibleItems) return; // Simple pagination for now
            
            const yPos = listStartY + (index * itemHeight);
            
            // Book item background
            const itemBg = this.add.graphics();
            itemBg.fillStyle(0x3a3a4a, 0.8);
            itemBg.fillRoundedRect(-dialogWidth/2 + 20, yPos - itemHeight/2, dialogWidth - 40, itemHeight - 10, 8);
            itemBg.lineStyle(1, 0x5a5a6a, 1);
            itemBg.strokeRoundedRect(-dialogWidth/2 + 20, yPos - itemHeight/2, dialogWidth - 40, itemHeight - 10, 8);
            booksContainer.add(itemBg);

            // Book title
            const bookTitle = this.add.text(-dialogWidth/2 + 40, yPos - 15, book.title, {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold',
                wordWrap: { width: dialogWidth - 180 }
            }).setOrigin(0, 0.5);
            booksContainer.add(bookTitle);

            // Book author
            const bookAuthor = this.add.text(-dialogWidth/2 + 40, yPos + 5, `by ${book.author}`, {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#cccccc'
            }).setOrigin(0, 0.5);
            booksContainer.add(bookAuthor);

            // Status indicator
            const status = book.status || 'available';
            const statusColor = this.getStatusColor(status);
            const statusText = this.add.text(-dialogWidth/2 + 40, yPos + 20, status.toUpperCase(), {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: statusColor,
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            booksContainer.add(statusText);

            // Link button (if available)
            if (book.link) {
                const linkBtn = this.add.graphics();
                linkBtn.fillStyle(0x4a90e2, 0.9);
                linkBtn.fillRoundedRect(dialogWidth/2 - 120, yPos - 15, 80, 30, 6);
                linkBtn.setInteractive(new Phaser.Geom.Rectangle(dialogWidth/2 - 120, yPos - 15, 80, 30), Phaser.Geom.Rectangle.Contains);
                linkBtn.on('pointerdown', () => this.openEbook(book));
                linkBtn.on('pointerover', () => {
                    linkBtn.clear();
                    linkBtn.fillStyle(0x6ab0f2, 0.9);
                    linkBtn.fillRoundedRect(dialogWidth/2 - 120, yPos - 15, 80, 30, 6);
                });
                linkBtn.on('pointerout', () => {
                    linkBtn.clear();
                    linkBtn.fillStyle(0x4a90e2, 0.9);
                    linkBtn.fillRoundedRect(dialogWidth/2 - 120, yPos - 15, 80, 30, 6);
                });
                booksContainer.add(linkBtn);

                const linkText = this.add.text(dialogWidth/2 - 80, yPos, 'READ', {
                    fontSize: '14px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    fontStyle: 'bold'
                }).setOrigin(0.5);
                booksContainer.add(linkText);
            }
        });

        // Show "no books" message if empty
        if (books.length === 0) {
            const noBooks = this.add.text(0, listStartY + 50, 'No ebooks available in this category yet.', {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#888888'
            }).setOrigin(0.5);
            booksContainer.add(noBooks);
        }
    }

    getStatusColor(status) {
        switch (status.toLowerCase()) {
            case 'available': return '#00ff00';
            case 'reading': return '#ffaa00';
            case 'completed': return '#0088ff';
            default: return '#cccccc';
        }
    }

    openEbook(book) {
        if (book.link) {
            // Open in a new window/tab
            window.open(book.link, '_blank');
            console.log(`Opening ebook: ${book.title} at ${book.link}`);
            
            // Optional: Mark as reading
            if (book.status === 'available') {
                book.status = 'reading';
                // You could save this state to localStorage or send to server
            }
        } else {
            console.warn(`No link available for book: ${book.title}`);
        }
    }

    closeEbookDialog() {
        if (!this.isDialogOpen || !this.ebookDialog) return;
        
        this.tweens.add({
            targets: this.ebookDialog,
            scaleX: 0,
            scaleY: 0,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => {
                this.ebookDialog.destroy();
                this.ebookDialog = null;
                this.isDialogOpen = false;
            }
        });
    }

    createBackButton() {
        // Add a custom back handler method to the scene
        this.goBackToPreviousScene = () => {
            console.log('Returning to previous scene:', this.previousScene);
            this.scene.start(this.previousScene, {
                playerData: this.playerData,
                gameProgress: this.gameProgress
            });
        };
        
        // Create back button - it will automatically use our custom goBackToPreviousScene method
        createBackButton(this, this.previousScene || 'MainHub');
    }

    startLibraryTutorial() {
        const tutorialSteps = [...LIBRARY_TUTORIAL_STEPS.firstTimeLibrary];
        
        // Set dynamic targets for tutorial steps
        tutorialSteps.forEach(step => {
            switch(step.target) {
                case 'carousel':
                    if (this.carousel && this.carousel.container) {
                        step.target = this.carousel.container;
                    }
                    break;
                case 'backButton':
                    // The back button will be found automatically by the tutorial system
                    // or we can set it to a specific element if needed
                    break;
            }
        });

        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('library_tutorial');
                console.log('Library tutorial completed!');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('library_tutorial');
                console.log('Library tutorial skipped!');
            }
        });
    }

    shutdown() {
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
        // Clean up dialog if open
        if (this.ebookDialog) {
            this.ebookDialog.destroy();
            this.ebookDialog = null;
        }
        
        // Clean up carousel
        if (this.carousel) {
            this.carousel = null;
        }
    }
}

export default BaseLibraryScene;
