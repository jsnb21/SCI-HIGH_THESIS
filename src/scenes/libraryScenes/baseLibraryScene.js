// Enhanced Library Scene with JSON Data Support and Auto Progress Update

import LibraryUI from './LibraryUI.js';

class BaseLibraryScene extends Phaser.Scene {
    constructor() {
        super({ 
            key: 'BaseLibraryScene',
            active: false
        });
        this.isPopupOpen = false;
        this.libraryData = null;
    }

    init(data) {
        // Receive data from previous scene
        this.previousScene = data?.previousScene || 'MainScene';
        this.playerData = data?.playerData || {};
        this.gameProgress = data?.gameProgress || {};
    }

    preload() {
        // Load library-specific assets
        this.load.image('libraryBg', 'assets/img/bg/libraryBG.png');
        
        // Load JSON data files
        this.load.json('libraryData', `/library/library.json`);
        this.load.json('booksData', `/library/books.json`);
        this.load.json('progressData', `/library/progress.json`);
        
        // Optional: Load audio and other assets
        // this.load.audio('pageFlip', 'assets/library/page-flip.wav');
    }

    create() {
        // IMPORTANT: Reset all state variables at the start of create
        this.isPopupOpen = false;
        this.currentPopupType = null;
        this.popupScrollY = 0;
        
        // Load and process JSON data
        this.loadJsonData();
        
        // Validate and set defaults for JSON data
        this.validateJsonData();
        
        // Update books read progress based on completed books
        this.updateBooksReadProgress();
        
        // Setup scene
        this.setupBackground();
        LibraryUI.createMainMenu(this);
        LibraryUI.createPopupContainer(this);
        
        // Ensure popup is properly hidden initially
        if (this.popupContainer) {
            this.popupContainer.setVisible(false);
            const offScreenX = this.cameras.main.width + 100; // Off screen to the right
            this.popupContainer.setPosition(offScreenX, this.cameras.main.height / 2);
        }
    }

    loadJsonData() {
        // Load all JSON data
        this.libraryData = {
            main: this.cache.json.get('libraryData'),
            books: this.cache.json.get('booksData'),
            progress: this.cache.json.get('progressData')
        };
    }

    validateJsonData() {
        // Set default structure if data is missing
        if (!this.libraryData.main) {
            this.libraryData.main = {
                title: "LIBRARY MENU",
                menuItems: [
                    { name: 'Books', hasPopup: true, icon: '📚' }
                ]
            };
        }

        if (!this.libraryData.books) {
            this.libraryData.books = {
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
                                pages: 250,
                                difficulty: "beginner"
                            }
                        ]
                    }
                ]
            };
        }

        if (!this.libraryData.progress) {
            this.libraryData.progress = {
                stats: [
                    { label: 'Books Read', value: 0, max: 20, color: '#3498DB' }
                ],
                achievements: []
            };
        }
    }

    /**
     * Updates the Books Read progress based on books with completed/read status
     * Books with color 0xE74C3C (red) are considered completed
     */
    updateBooksReadProgress() {
        let completedBooksCount = 0;
        let totalBooksCount = 0;
        
        // Count both completed and total books
        this.libraryData.books.categories.forEach(category => {
            category.books.forEach(book => {
                totalBooksCount++; // Count every book
                
                // Check if book status corresponds to the red color (0xE74C3C)
                // This assumes books with 'completed', 'read', or 'finished' status use this color
                if (this.getBookStatusColor(book.status) === 0xE74C3C) {
                    completedBooksCount++;
                }
            });
        });
        
        // Update the Books Read progress
        const booksReadStat = this.libraryData.progress.stats.find(stat => stat.label === 'Books Read');
        if (booksReadStat) {
            booksReadStat.value = completedBooksCount;
            booksReadStat.max = totalBooksCount; // Set max to total number of books
            console.log(`Updated Books Read progress: ${completedBooksCount}/${totalBooksCount}`);
        }
        
        // Save the updated data
        this.saveData();
    }

    /**
     * Helper method to get the color associated with a book status
     * @param {string} status - The book status
     * @returns {number} - The color hex value
     */
    getBookStatusColor(status) {
        switch(status.toLowerCase()) {
            case 'available':
                return 0x27AE60; // Green
            case 'reading':
                return 0xF39C12; // Orange
            case 'completed':
            case 'read':
            case 'finished':
                return 0xE74C3C; // Red - This triggers the progress update
            case 'unavailable':
            case 'locked':
                return 0x95A5A6; // Gray
            default:
                return 0x27AE60; // Default to available (green)
        }
    }

    /**
     * Method to mark a book as completed and update progress
     * @param {Object} book - The book object to mark as completed
     */
    markBookAsCompleted(book) {
        const previousStatus = book.status;
        book.status = 'completed'; // or 'read' or 'finished'
        
        // If the book wasn't previously completed, update the progress
        if (this.getBookStatusColor(previousStatus) !== 0xE74C3C) {
            this.updateBooksReadProgress();
        }
        
        console.log(`Book "${book.title}" marked as completed!`);
    }

    setupBackground() {
        this.background = this.add.image(0, 0, 'libraryBg');
        this.background.setOrigin(0, 0);
        // Modern: Add a semi-transparent overlay for glassmorphism
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0xffffff, 0.15);
        overlay.setOrigin(0, 0);
        overlay.setDepth(1);
        
        // Calculate scale to cover entire screen
        const scaleX = this.cameras.main.width / this.background.width;
        const scaleY = this.cameras.main.height / this.background.height;
        const scale = Math.max(scaleX, scaleY);
        
        this.background.setScale(scale);
        this.background.setPosition(
            (this.cameras.main.width - this.background.displayWidth) / 2,
            (this.cameras.main.height - this.background.displayHeight) / 2
        );
    }
    
    // Helper to create a rounded rectangle as a graphics texture
    createRoundedRectTexture(key, width, height, radius, fillColor, fillAlpha, strokeColor, strokeAlpha, strokeWidth, shadowColor, shadowAlpha, shadowBlur) {
        const graphics = this.add.graphics();
        graphics.clear();
        if (shadowColor && shadowBlur) {
            graphics.fillStyle(shadowColor, shadowAlpha || 0.15);
            graphics.fillRoundedRect(4, 4, width, height, radius);
        }
        // Set fillAlpha to 1 for opaque backgrounds
        graphics.fillStyle(fillColor, fillAlpha === undefined ? 1 : fillAlpha);
        graphics.fillRoundedRect(0, 0, width, height, radius);
        if (strokeColor && strokeWidth) {
            graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha || 1);
            graphics.strokeRoundedRect(0, 0, width, height, radius);
        }
        graphics.generateTexture(key, width + 8, height + 8);
        graphics.destroy();
    }

    showPopup(contentType) {
        if (this.isPopupOpen) return;
        
        if (!this.popupContainer || !this.popupContent) {
            console.warn('Popup container not properly initialized');
            return;
        }
        
        this.isPopupOpen = true;
        this.currentPopupType = contentType;
        this.popupScrollY = 0; // Reset scroll position
        
        this.updatePopupContent(contentType);
        this.popupContainer.setVisible(true);
        
        // Position popup at 65% from left (more centered, not stuck to right)
        const targetX = this.cameras.main.width * 0.65;
        
        this.tweens.add({
            targets: this.popupContainer,
            x: targetX,
            duration: 400,
            ease: 'Power3.easeOut'
        });
    }
    
    hidePopup(onComplete) {
        if (!this.isPopupOpen) {
            if (onComplete) onComplete();
            return;
        }
        
        const offScreenX = this.cameras.main.width + 100; // Move off screen to the right
        
        this.tweens.add({
            targets: this.popupContainer,
            x: offScreenX,
            duration: 300,
            ease: 'Power3.easeIn',
            onComplete: () => {
                this.popupContainer.setVisible(false);
                this.isPopupOpen = false;
                this.currentPopupType = null;
                if (onComplete) onComplete();
            }
        });
    }
    
    updatePopupContent(contentType) {
        if (!this.popupContent) {
            console.warn('popupContent not initialized yet');
            return;
        }
        
        this.popupContent.removeAll(true);
        this.popupContent.y = 0; // Reset position
        this.popupTitle.setText(contentType.toUpperCase());
        
        switch(contentType) {
            case 'Books':
                LibraryUI.createBooksContent(this);
                break;
        }
    }

    scrollPopupContent(deltaY) {
        const scrollSpeed = 30;
        this.popupScrollY -= Math.sign(deltaY) * scrollSpeed;
        // Clamp so content never scrolls above header
        const minScroll = 0;
        // Calculate max scroll so last item doesn't scroll too far up
        const contentHeight = this.popupContent.getBounds().height;
        const popupHeight = this.cameras.main.height - 160; // header + some margin
        const maxScroll = Math.max(contentHeight - popupHeight, 0);
        this.popupScrollY = Phaser.Math.Clamp(this.popupScrollY, -maxScroll, minScroll);
        this.popupContent.y = this.popupScrollY;
    }

    scrollPopupContent(deltaY) {
        const scrollSpeed = 30;
        this.popupScrollY -= Math.sign(deltaY) * scrollSpeed;
        // Clamp so content never scrolls above header
        const minScroll = 0;
        // Calculate max scroll so last item doesn't scroll too far up
        const contentHeight = this.popupContent.getBounds().height;
        const popupHeight = this.cameras.main.height - 160; // header + some margin
        const maxScroll = Math.max(contentHeight - popupHeight, 0);
        this.popupScrollY = Phaser.Math.Clamp(this.popupScrollY, -maxScroll, minScroll);
        this.popupContent.y = this.popupScrollY;
    }

    handleBookAction(book) {
        console.log(`Reading book: ${book.title}`);
        book.status = 'reading';

        // Transition to reading scene
        this.scene.switch('ReadingScene', { book: book });
        // or this.scene.launch('ReadingScene', { book: book }); // keeps current scene active
    }
    
    handleMenuClick(menuItem) {
        console.log(`Clicked: ${menuItem}`);
        // Handle non-popup menu items like Settings
        switch(menuItem) {
            case 'Settings':
                // Open settings popup or scene
                break;
        }
    }

    addBook(categoryName, bookData) {
        const category = this.libraryData.books.categories.find(cat => cat.name === categoryName);
        if (category) {
            bookData.id = Date.now(); // Simple ID generation
            category.books.push(bookData);
            this.saveData();
            
            // Update progress after adding a book (this will update the max value)
            this.updateBooksReadProgress();
        }
    }

    removeBook(bookId) {
        this.libraryData.books.categories.forEach(category => {
            category.books = category.books.filter(book => book.id !== bookId);
        });
        this.saveData();
        
        // Update progress after removing a book
        this.updateBooksReadProgress();
    }

    updateProgress(statLabel, newValue) {
        const stat = this.libraryData.progress.stats.find(s => s.label === statLabel);
        if (stat) {
            stat.value = Math.min(newValue, stat.max);
            this.saveData();
        }
    }

    saveData() {
        // Save to localStorage (for client-side persistence)
        // In a real game, you'd save to a server or file system
        try {
            localStorage.setItem('libraryData', JSON.stringify(this.libraryData));
        } catch (e) {
            console.warn('Could not save library data to localStorage');
        }
    }

    loadSavedData() {
        // Load from localStorage if available
        try {
            const savedData = localStorage.getItem('libraryData');
            if (savedData) {
                this.libraryData = JSON.parse(savedData);
            }
        } catch (e) {
            console.warn('Could not load library data from localStorage');
        }
    }
}


// Export the scene
export default BaseLibraryScene;