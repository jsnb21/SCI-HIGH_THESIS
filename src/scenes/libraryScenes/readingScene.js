class ReadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ReadingScene' });
        
        // Reading state
        this.currentBook = null;
        this.currentPage = 0;
        this.pages = [];
        this.wordsPerPage = 250; // Adjust based on your needs
        
        // UI elements
        this.bookContainer = null;
        this.leftPage = null;
        this.rightPage = null;
        this.leftText = null;
        this.rightText = null;
        this.pageIndicator = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.closeBtn = null;
        
        // Reading progress
        this.readingStartTime = null;
        this.totalReadingTime = 0;
    }
    
    init(data) {
        // Receive data from the calling scene
        this.currentBook = data.book || null;
        this.currentPage = data.book?.currentPage || 0;
        
        if (!this.currentBook) {
            console.error('No book data provided to ReadingScene');
            this.scene.start('MainScene'); // Return to main scene if no book
            return;
        }
        
        // Split book content into pages
        this.pages = this.splitContentIntoPages(this.currentBook.content || 'No content available.');
        
        // Start reading timer
        this.readingStartTime = Date.now();
        
        console.log(`Opening book: ${this.currentBook.title}`);
        console.log(`Total pages: ${this.pages.length}`);
    }
    
    create() {
        // Create background
        this.createBackground();
        
        // Create book interface
        this.createBookInterface();
        
        // Create navigation controls
        this.createNavigation();
        
        // Create UI elements
        this.createUI();
        
        // Setup input handlers
        this.setupInputHandlers();
        
        // Display initial pages
        this.updatePages();
        
        // Add fade-in effect
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }
    
    createBackground() {
        // Create a cozy reading environment background
        const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x2C1810)
            .setOrigin(0, 0);
        
        // Add some texture/pattern if desired
        // You could add a texture here: this.add.image(0, 0, 'reading-bg').setOrigin(0, 0);
    }
    
    createBookInterface() {
        // Main book container
        this.bookContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
        
        // Book shadow for depth
        const shadow = this.add.rectangle(5, 5, 700, 500, 0x000000, 0.3);
        
        // Book base
        const bookBase = this.add.rectangle(0, 0, 700, 500, 0x8B4513);
        
        // Book border (using separate rectangles for border effect)
        const bookBorder = this.add.rectangle(0, 0, 706, 506, 0x654321);
        bookBorder.setDepth(-1); // Put border behind the main book
        
        // Left page
        this.leftPage = this.add.rectangle(-175, 0, 340, 460, 0xFFFFF0);
        
        // Left page border
        const leftPageBorder = this.add.rectangle(-175, 0, 342, 462, 0xE0E0E0);
        leftPageBorder.setDepth(-1);
        
        // Right page
        this.rightPage = this.add.rectangle(175, 0, 340, 460, 0xFFFFF0);
        
        // Right page border
        const rightPageBorder = this.add.rectangle(175, 0, 342, 462, 0xE0E0E0);
        rightPageBorder.setDepth(-1);
        
        // Book spine/center line
        const spine = this.add.rectangle(0, 0, 4, 460, 0x654321);
        
        // Left page text area
        this.leftText = this.add.text(-175, -200, '', {
            fontSize: '14px',
            fill: '#2C1810',
            fontFamily: 'serif',
            wordWrap: { width: 300, useAdvancedWrap: true },
            align: 'left',
            lineSpacing: 4
        }).setOrigin(0.5, 0);
        
        // Right page text area
        this.rightText = this.add.text(175, -200, '', {
            fontSize: '14px',
            fill: '#2C1810',
            fontFamily: 'serif',
            wordWrap: { width: 300, useAdvancedWrap: true },
            align: 'left',
            lineSpacing: 4
        }).setOrigin(0.5, 0);
        
        // Book title on the book cover/header
        const bookTitle = this.add.text(0, -220, this.currentBook.title || 'Untitled Book', {
            fontSize: '18px',
            fill: '#8B4513',
            fontFamily: 'serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Add all elements to container
        this.bookContainer.add([
            shadow, bookBorder, bookBase, leftPageBorder, this.leftPage, 
            rightPageBorder, this.rightPage, spine, this.leftText, this.rightText, bookTitle
        ]);
    }
    
    createNavigation() {
        // Previous page button
        this.prevBtn = this.add.container(100, this.cameras.main.centerY);
        const prevBg = this.add.circle(0, 0, 30, 0x654321, 0.8);
        const prevArrow = this.add.text(0, 0, '◀', {
            fontSize: '24px',
            fill: '#FFF'
        }).setOrigin(0.5);
        
        this.prevBtn.add([prevBg, prevArrow]);
        this.prevBtn.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
        this.prevBtn.on('pointerdown', () => this.previousPage());
        this.prevBtn.on('pointerover', () => prevBg.setAlpha(1));
        this.prevBtn.on('pointerout', () => prevBg.setAlpha(0.8));
        
        // Next page button
        this.nextBtn = this.add.container(this.cameras.main.width - 100, this.cameras.main.centerY);
        const nextBg = this.add.circle(0, 0, 30, 0x654321, 0.8);
        const nextArrow = this.add.text(0, 0, '▶', {
            fontSize: '24px',
            fill: '#FFF'
        }).setOrigin(0.5);
        
        this.nextBtn.add([nextBg, nextArrow]);
        this.nextBtn.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
        this.nextBtn.on('pointerdown', () => this.nextPage());
        this.nextBtn.on('pointerover', () => nextBg.setAlpha(1));
        this.nextBtn.on('pointerout', () => nextBg.setAlpha(0.8));
    }
    
    createUI() {
        // Close button
        this.closeBtn = this.add.container(this.cameras.main.width - 50, 50);
        const closeBg = this.add.circle(0, 0, 25, 0xFF4444, 0.8);
        const closeX = this.add.text(0, 0, '✕', {
            fontSize: '20px',
            fill: '#FFF'
        }).setOrigin(0.5);
        
        this.closeBtn.add([closeBg, closeX]);
        this.closeBtn.setInteractive(new Phaser.Geom.Circle(0, 0, 25), Phaser.Geom.Circle.Contains);
        this.closeBtn.on('pointerdown', () => {
            this.scene.switch('BaseLibraryScene');
        });
        this.closeBtn.on('pointerover', () => closeBg.setAlpha(1));
        this.closeBtn.on('pointerout', () => closeBg.setAlpha(0.8));
        
        // Page indicator
        this.pageIndicator = this.add.text(this.cameras.main.centerX, this.cameras.main.height - 50, '', {
            fontSize: '16px',
            fill: '#D4C4A0',
            fontFamily: 'serif'
        }).setOrigin(0.5);
        
        // Reading progress bar background
        const progressBg = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.height - 20, 300, 6, 0x444444);
        
        // Reading progress bar fill
        this.progressBar = this.add.rectangle(this.cameras.main.centerX - 150, this.cameras.main.height - 20, 0, 6, 0x8B4513);
        this.progressBar.setOrigin(0, 0.5);
    }
    
    setupInputHandlers() {
        // Keyboard controls
        this.input.keyboard.on('keydown-LEFT', () => this.previousPage());
        this.input.keyboard.on('keydown-RIGHT', () => this.nextPage());
        this.input.keyboard.on('keydown-ESC', () => this.closeBook());
        this.input.keyboard.on('keydown-SPACE', () => this.nextPage());
        
        // Mouse wheel support
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.nextPage();
            } else if (deltaY < 0) {
                this.previousPage();
            }
        });
    }
    
    updatePages() {
        // Update left page (even pages)
        const leftPageContent = this.pages[this.currentPage] || '';
        this.leftText.setText(leftPageContent);
        
        // Update right page (odd pages)
        const rightPageContent = this.pages[this.currentPage + 1] || '';
        this.rightText.setText(rightPageContent);
        
        // Update page indicator
        const totalPages = this.pages.length;
        const currentDisplayPage = Math.min(this.currentPage + 1, totalPages);
        const nextDisplayPage = Math.min(this.currentPage + 2, totalPages);
        
        if (totalPages > 1) {
            this.pageIndicator.setText(`Pages ${currentDisplayPage}-${nextDisplayPage} of ${totalPages}`);
        } else {
            this.pageIndicator.setText(`Page ${currentDisplayPage} of ${totalPages}`);
        }
        
        // Update navigation button visibility
        this.prevBtn.setVisible(this.currentPage > 0);
        this.nextBtn.setVisible(this.currentPage + 1 < this.pages.length);
        
        // Update progress bar
        const progress = Math.min((this.currentPage + 1) / this.pages.length, 1);
        this.progressBar.setSize(300 * progress, 6);
        
        // Save reading progress
        this.saveReadingProgress();
        
        // Add page turn effect
        this.addPageTurnEffect();
    }
    
    nextPage() {
        if (this.currentPage + 1 < this.pages.length) {
            this.currentPage += 2; // Skip to next spread (2 pages)
            this.updatePages();
            
            // Play page turn sound (if you have audio)
            // this.sound.play('page-turn');
        }
    }
    
    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage = Math.max(0, this.currentPage - 2);
            this.updatePages();
            
            // Play page turn sound (if you have audio)
            // this.sound.play('page-turn');
        }
    }
    
    addPageTurnEffect() {
        // Simple fade effect for page changes
        this.leftText.setAlpha(0);
        this.rightText.setAlpha(0);
        
        this.tweens.add({
            targets: [this.leftText, this.rightText],
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }
    
    closeBook() {
        console.log('Closing book...');
        
        // Calculate total reading time
        if (this.readingStartTime) {
            this.totalReadingTime += Date.now() - this.readingStartTime;
        }
        
        // Save final reading progress
        this.saveReadingProgress();
        
        // Add fade out effect
        this.cameras.main.fadeOut(300, 0, 0, 0);
        
        // Return to previous scene after fade
        this.time.delayedCall(300, () => {
            this.scene.start('MainScene'); // Replace with your main scene key
        });
    }
    
    saveReadingProgress() {
        if (!this.currentBook) return;
        
        // Update book progress
        this.currentBook.currentPage = this.currentPage;
        this.currentBook.lastRead = new Date().toISOString();
        this.currentBook.readingProgress = Math.min((this.currentPage + 1) / this.pages.length, 1);
        
        // Mark as completed if finished
        if (this.currentPage >= this.pages.length - 2) {
            this.currentBook.status = 'completed';
            this.currentBook.completedDate = new Date().toISOString();
        } else {
            this.currentBook.status = 'reading';
        }
        
        // Add reading time
        if (this.readingStartTime) {
            const sessionTime = Date.now() - this.readingStartTime;
            this.currentBook.totalReadingTime = (this.currentBook.totalReadingTime || 0) + sessionTime;
            this.readingStartTime = Date.now(); // Reset for next session
        }
        
        // Here you would typically save to your game's save system
        // localStorage, server, or your game's data management system
        console.log('Reading progress saved:', {
            book: this.currentBook.title,
            currentPage: this.currentPage,
            progress: (this.currentBook.readingProgress * 100).toFixed(1) + '%',
            status: this.currentBook.status
        });
    }
    
    splitContentIntoPages(content) {
        if (!content || content.length === 0) {
            return ['No content available.'];
        }
        
        // Split content into words
        const words = content.split(/\s+/);
        const pages = [];
        
        // Group words into pages
        for (let i = 0; i < words.length; i += this.wordsPerPage) {
            const pageWords = words.slice(i, i + this.wordsPerPage);
            pages.push(pageWords.join(' '));
        }
        
        // Ensure we have at least one page
        return pages.length > 0 ? pages : ['No content available.'];
    }
    
    // Utility method to set words per page (for different book types)
    setWordsPerPage(count) {
        this.wordsPerPage = count;
        if (this.currentBook && this.currentBook.content) {
            this.pages = this.splitContentIntoPages(this.currentBook.content);
            this.updatePages();
        }
    }
    
    // Method to jump to a specific page
    jumpToPage(pageNumber) {
        if (pageNumber >= 0 && pageNumber < this.pages.length) {
            this.currentPage = pageNumber;
            this.updatePages();
        }
    }
    
    // Get current reading statistics
    getReadingStats() {
        return {
            currentPage: this.currentPage + 1,
            totalPages: this.pages.length,
            progress: Math.min((this.currentPage + 1) / this.pages.length, 1),
            readingTime: this.totalReadingTime,
            wordsRead: (this.currentPage + 1) * this.wordsPerPage
        };
    }
}

export default ReadingScene;