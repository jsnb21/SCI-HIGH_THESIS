// Enhanced Library Scene with Direct Book Links

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
        this.tutorialManager = null;
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
        this.load.json('booksData', `library/books.json`);
        
        // Load programming language icons from comlab folder
        this.load.image('web-design_logo', 'assets/img/comlab/icons/web-design_logo.png');
        this.load.image('python_logo', 'assets/img/comlab/icons/python_logo.png');
        this.load.image('java_logo', 'assets/img/comlab/icons/java_logo.png');
        this.load.image('cplus_logo', 'assets/img/comlab/icons/cplus_logo.png');
        this.load.image('c_logo', 'assets/img/comlab/icons/c_logo.png');
        this.load.image('csharp_logo', 'assets/img/comlab/icons/csharp_logo.png');
        
        // Load audio files
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_library', 'assets/audio/bgm/bgm_library.mp3');
    }

    createBookIcons() {
        // Create book icons using actual image files from comlab folder
        if (!this.booksData || !this.booksData.books) {
            console.warn('No books data available for creating icons');
            return;
        }

        this.booksData.books.forEach((book, index) => {
            const iconKey = `book_${book.id}`;
            const sourceIconKey = book.icon; // This will be like 'python_logo', 'java_logo', etc.
            
            console.log(`Creating icon for book: ${book.title}, using source: ${sourceIconKey}`);
            
            // Check if the source icon exists in the texture manager
            if (this.textures.exists(sourceIconKey)) {
                // Create a copy of the texture with our book-specific key
                const sourceTexture = this.textures.get(sourceIconKey);
                this.textures.addImage(iconKey, sourceTexture.source[0].image);
                console.log(`Successfully created icon: ${iconKey} from ${sourceIconKey}`);
            } else {
                console.warn(`Source icon ${sourceIconKey} not found for book ${book.title}`);
                // Fallback: create a simple colored rectangle as backup
                const graphics = this.add.graphics();
                graphics.fillStyle(0x4a90e2, 0.8);
                graphics.fillRoundedRect(0, 0, 128, 128, 10);
                graphics.lineStyle(4, 0xffffff, 1);
                graphics.strokeRoundedRect(0, 0, 128, 128, 10);
                
                // Add book title as text
                const titleText = this.add.text(64, 64, book.title, {
                    fontSize: '16px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    align: 'center',
                    wordWrap: { width: 120 }
                }).setOrigin(0.5);
                
                // Create texture from graphics
                const renderTexture = this.add.renderTexture(0, 0, 128, 128);
                renderTexture.draw(graphics);
                renderTexture.draw(titleText);
                
                // Save as texture
                renderTexture.saveTexture(iconKey);
                
                // Clean up
                graphics.destroy();
                titleText.destroy();
                renderTexture.destroy();
            }
        });
    }

    create() {
        // Load books data first
        this.loadBooksData();
        
        // Create book icons after data is loaded
        this.createBookIcons();
        
        // Setup scene
        this.setupBackground();
        this.createLibraryTitle();
        this.createBooksCarousel();
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
    }

    loadBooksData() {
        this.booksData = this.cache.json.get('booksData');
        
        if (!this.booksData || !this.booksData.books) {
            console.warn('Books data not found, using default data');
            this.booksData = {
                books: [
                    {
                        id: 1,
                        title: "Sample Ebook",
                        author: "Sample Author",
                        status: "available",
                        description: "A sample ebook for testing",
                        link: "https://example.com",
                        icon: "📚"
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
            fontFamily: 'Arial',
            color: '#ffe066',
            stroke: '#111122',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 12, fill: true }
        }).setOrigin(0.5).setDepth(100);

        const subtitle = this.add.text(this.cameras.main.centerX, 130, 'Click on any book to open it in a new tab', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#e0e0ff',
            stroke: '#111122',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 8, fill: true }
        }).setOrigin(0.5).setDepth(100);
    }

    createBooksCarousel() {
        // Get books from books data
        const books = this.booksData.books || [];
        const iconKeys = [];
        const iconInfo = [];
        
        books.forEach((book, index) => {
            const iconKey = `book_${book.id}`;
            console.log(`Creating icon for book: ${book.title}, key: ${iconKey}`);
            iconKeys.push(iconKey);
            iconInfo.push({
                heading: book.title, // Use 'heading' for carousel compatibility
                desc: `by ${book.author}`, // Use 'desc' for carousel compatibility
                title: book.title,
                description: `by ${book.author}`,
                book: book
            });
        });

        console.log('Icon keys:', iconKeys);
        console.log('Icon info:', iconInfo);

        // Create carousel
        this.carousel = new Carousel(this, {
            iconYOffset: 50,
            iconSpacing: 200,
            iconToTitleGap: 120,
            iconToDescGap: 60,
            smallScale: 0.15,  // Further reduced from 0.3 to make icons much smaller
            largeScale: 0.25   // Further reduced from 0.5 to make icons much smaller
        });

        this.carousel.create(
            iconKeys,
            iconInfo,
            (selectedData) => this.onBookSelected(selectedData),
            [] // No locked books
        );

        // Add book names above each icon
        this.createBookNameLabels();

        // Override carousel's move method to update our book name labels
        const originalMove = this.carousel.move.bind(this.carousel);
        this.carousel.move = (direction) => {
            originalMove(direction);
            // Update book name labels after carousel moves
            this.time.delayedCall(50, () => {
                this.updateBookNameLabels();
            });
        };
    }

    createBookNameLabels() {
        const books = this.booksData.books || [];
        const scale = this.carousel.getScale();
        const iconSpacing = 200 * scale;
        const iconYOffset = 50 * scale;
        
        let iconCenterX, iconCenterY;
        if (this.cameras && this.cameras.main) {
            iconCenterX = this.cameras.main.centerX;
            iconCenterY = this.cameras.main.centerY + iconYOffset;
        } else {
            iconCenterX = this.scale.width / 2;
            iconCenterY = this.scale.height / 2 + iconYOffset;
        }

        this.bookNameLabels = [];

        books.forEach((book, index) => {
            // Calculate position relative to carousel center
            let relativePos = index - this.carousel.carouselIndex;
            const iconCount = books.length;
            if (relativePos > Math.floor(iconCount / 2)) relativePos -= iconCount;
            else if (relativePos < -Math.floor(iconCount / 2)) relativePos += iconCount;
            
            const x = iconCenterX + relativePos * iconSpacing;
            const y = iconCenterY - 80 * scale; // Position above the icon

            const nameLabel = this.add.text(x, y, book.title, {
                fontSize: `${Math.round(16 * scale)}px`,
                fontFamily: 'Arial',
                color: index === this.carousel.carouselIndex ? '#ffe066' : '#ffffff',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center',
                wordWrap: { width: 120 * scale, useAdvancedWrap: true }
            }).setOrigin(0.5).setDepth(200);

            // Set initial alpha based on selection
            nameLabel.setAlpha(index === this.carousel.carouselIndex ? 1.0 : 0.7);
            
            // Store reference for updates
            nameLabel.bookIndex = index;
            this.bookNameLabels.push(nameLabel);
        });
    }

    updateBookNameLabels() {
        if (!this.bookNameLabels) return;
        
        const books = this.booksData.books || [];
        const scale = this.carousel.getScale();
        const iconSpacing = 200 * scale;
        const iconYOffset = 50 * scale;
        
        let iconCenterX, iconCenterY;
        if (this.cameras && this.cameras.main) {
            iconCenterX = this.cameras.main.centerX;
            iconCenterY = this.cameras.main.centerY + iconYOffset;
        } else {
            iconCenterX = this.scale.width / 2;
            iconCenterY = this.scale.height / 2 + iconYOffset;
        }

        this.bookNameLabels.forEach((label, arrayIndex) => {
            const bookIndex = label.bookIndex;
            
            // Calculate new position
            let relativePos = bookIndex - this.carousel.carouselIndex;
            const iconCount = books.length;
            if (relativePos > Math.floor(iconCount / 2)) relativePos -= iconCount;
            else if (relativePos < -Math.floor(iconCount / 2)) relativePos += iconCount;
            
            const x = iconCenterX + relativePos * iconSpacing;
            const y = iconCenterY - 80 * scale;

            // Animate to new position
            this.tweens.add({
                targets: label,
                x: x,
                y: y,
                duration: 300,
                ease: 'Power2'
            });

            // Update styling based on selection
            const isSelected = bookIndex === this.carousel.carouselIndex;
            label.setColor(isSelected ? '#ffe066' : '#ffffff');
            this.tweens.add({
                targets: label,
                alpha: isSelected ? 1.0 : 0.7,
                duration: 200,
                ease: 'Power2'
            });
        });
    }

    onBookSelected(selectedData) {
        console.log('Book selected data:', selectedData);
        
        let selectedBook = null;
        
        if (typeof selectedData === 'object' && selectedData.book) {
            // If selectedData is the iconInfo object with book property
            selectedBook = selectedData.book;
        } else if (typeof selectedData === 'number') {
            // If selectedData is an index
            const books = this.booksData.books || [];
            selectedBook = books[selectedData];
        }
        
        console.log('Selected book:', selectedBook);
        
        if (selectedBook) {
            this.openEbook(selectedBook);
        } else {
            console.error('No book found from selection:', selectedData);
        }
    }

    openEbook(book) {
        console.log('OpenEbook called with:', book);
        
        if (book.link) {
            console.log('Opening link:', book.link);
            
            // Play confirmation sound
            if (this.se_confirmSound) {
                this.se_confirmSound.play();
            }
            
            // Show visual feedback
            this.showOpeningFeedback(book);
            
            // Open in a new window/tab with better security
            const newWindow = window.open(book.link, '_blank', 'noopener,noreferrer');
            
            // Handle popup blocker
            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                console.warn('Popup blocked for:', book.link);
                this.showPopupBlockedMessage(book);
                return;
            }
            
            console.log(`Successfully opened ebook: ${book.title} at ${book.link}`);
            
            // Mark as reading and save progress
            if (book.status === 'available') {
                book.status = 'reading';
                this.saveReadingProgress(book);
            }
            
            // Update statistics
            this.updateBookAccessStats(book);
            
        } else {
            console.warn(`No link available for book: ${book.title}`);
            this.showNoLinkMessage(book);
        }
    }

    showOpeningFeedback(book) {
        // Create a temporary feedback message
        const feedback = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, 
            `Opening "${book.title}"...`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#00ff00',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 20, y: 10 },
            borderRadius: 10
        }).setOrigin(0.5).setDepth(300);

        // Animate and remove feedback
        this.tweens.add({
            targets: feedback,
            alpha: 0,
            y: feedback.y - 50,
            duration: 2000,
            ease: 'Power2.easeOut',
            onComplete: () => feedback.destroy()
        });
    }

    showPopupBlockedMessage(book) {
        // Show popup blocked message
        const popup = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
        popup.setDepth(400);

        const bg = this.add.graphics();
        bg.fillStyle(0xff4444, 0.9);
        bg.fillRoundedRect(-200, -60, 400, 120, 10);
        bg.lineStyle(2, 0xffffff, 1);
        bg.strokeRoundedRect(-200, -60, 400, 120, 10);
        popup.add(bg);

        const title = this.add.text(0, -20, 'Popup Blocked', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        popup.add(title);

        const message = this.add.text(0, 10, 'Please allow popups and try again', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        popup.add(message);

        const copyButton = this.add.graphics();
        copyButton.fillStyle(0x4a90e2, 1);
        copyButton.fillRoundedRect(-60, 25, 120, 25, 5);
        copyButton.setInteractive(new Phaser.Geom.Rectangle(-60, 25, 120, 25), Phaser.Geom.Rectangle.Contains);
        copyButton.on('pointerdown', () => {
            navigator.clipboard.writeText(book.link);
            this.showCopiedMessage();
            this.closeFeedbackPopup(popup);
        });
        popup.add(copyButton);

        const copyText = this.add.text(0, 37, 'Copy Link', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        popup.add(copyText);

        // Auto close after 5 seconds
        this.time.delayedCall(5000, () => {
            this.closeFeedbackPopup(popup);
        });
    }

    showNoLinkMessage(book) {
        const feedback = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, 
            `No link available for "${book.title}"`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ff6666',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(300);

        this.tweens.add({
            targets: feedback,
            alpha: 0,
            y: feedback.y - 30,
            duration: 2000,
            ease: 'Power2.easeOut',
            onComplete: () => feedback.destroy()
        });
    }

    showCopiedMessage() {
        const feedback = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 100, 
            'Link copied to clipboard!', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#00ff00',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setDepth(300);

        this.tweens.add({
            targets: feedback,
            alpha: 0,
            duration: 1500,
            ease: 'Power2.easeOut',
            onComplete: () => feedback.destroy()
        });
    }

    closeFeedbackPopup(popup) {
        this.tweens.add({
            targets: popup,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => popup.destroy()
        });
    }

    saveReadingProgress(book) {
        // Save to localStorage for persistence
        let progress = JSON.parse(localStorage.getItem('libraryProgress') || '{}');
        
        if (!progress.booksReading) progress.booksReading = [];
        if (!progress.booksAccessed) progress.booksAccessed = [];
        
        // Add to reading list if not already there
        if (!progress.booksReading.find(b => b.id === book.id)) {
            progress.booksReading.push({
                id: book.id,
                title: book.title,
                author: book.author,
                accessedAt: new Date().toISOString()
            });
        }
        
        // Add to accessed list
        if (!progress.booksAccessed.find(b => b.id === book.id)) {
            progress.booksAccessed.push({
                id: book.id,
                title: book.title,
                accessedAt: new Date().toISOString()
            });
        }
        
        localStorage.setItem('libraryProgress', JSON.stringify(progress));
    }

    updateBookAccessStats(book) {
        // Update access statistics
        let stats = JSON.parse(localStorage.getItem('libraryStats') || '{}');
        
        if (!stats.totalAccesses) stats.totalAccesses = 0;
        if (!stats.bookAccesses) stats.bookAccesses = {};
        
        stats.totalAccesses++;
        stats.bookAccesses[book.id] = (stats.bookAccesses[book.id] || 0) + 1;
        stats.lastAccessed = new Date().toISOString();
        
        localStorage.setItem('libraryStats', JSON.stringify(stats));
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
        
        // Clean up carousel
        if (this.carousel) {
            this.carousel = null;
        }

        // Clean up book name labels
        if (this.bookNameLabels) {
            this.bookNameLabels.forEach(label => {
                if (label && label.destroy) {
                    label.destroy();
                }
            });
            this.bookNameLabels = [];
        }
    }
}

export default BaseLibraryScene;