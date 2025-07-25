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
        this.bookTitle = null; // Store reference to book title
        this.pageIndicator = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.closeBtn = null;
        
        // Reading progress
        this.readingStartTime = null;
        this.totalReadingTime = 0;
    }
    
    init(data) {
        console.log('ReadingScene init called with data:', data);
        
        // Receive data from the calling scene
        this.currentBook = data.book || null;
        this.currentPage = data.book?.currentPage || 0;
        
        if (!this.currentBook) {
            console.error('No book data provided to ReadingScene');
            this.scene.start('BaseLibraryScene');
            return;
        }
        
        this.pages = this.processBookContent(this.currentBook.content);
        
        // Start reading timer
        this.readingStartTime = Date.now();
        
        console.log(`Opening book: ${this.currentBook.title}`);
        console.log(`Total pages: ${this.pages.length}`);
    }
    
    create() {
        console.log('ReadingScene create called, current book:', this.currentBook?.title);
        
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
        
        // Update book title and content for current book
        this.updateBookContent();
        
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
    const shadow = this.add.rectangle(5, 5, 1000, 800, 0x000000, 0.3);
   
    // Book base
    const bookBase = this.add.rectangle(0, 0, 1000, 800, 0x8B4513);
   
    // Book border (using separate rectangles for border effect)
    const bookBorder = this.add.rectangle(0, 0, 1006, 806, 0x654321);
    bookBorder.setDepth(-1); // Put border behind the main book
   
    // Combined pages - single large page area
    this.combinedPages = this.add.rectangle(0, 0, 900, 700, 0xFFFFF0);
   
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
   
    // Book title on the book cover/header - Initialize with placeholder
    this.bookTitle = this.add.text(0, -300, 'Loading...', {
        fontSize: '18px',
        fill: '#8B4513',
        fontFamily: 'serif',
        fontStyle: 'bold'
    }).setOrigin(0.5);
   
    // Add all elements to container (removed spine and separate pages)
    this.bookContainer.add([
        shadow, bookBorder, bookBase, this.combinedPages,
        this.leftText, this.rightText, this.bookTitle
    ]);
}
    
    // Update book content when switching books
    updateBookContent() {
        console.log('Updating book content for:', this.currentBook?.title);
        
        if (this.currentBook && this.bookTitle) {
            const newTitle = this.currentBook.title || 'Untitled Book';
            console.log('Setting book title to:', newTitle);
            this.bookTitle.setText(newTitle);
        } else {
            console.warn('Cannot update book content - missing book or title element');
        }
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
            this.closeBook();
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
        // Get current pages
        const leftPageContent = this.pages[this.currentPage] || '';
        const rightPageContent = this.pages[this.currentPage + 1] || '';
        
        // Apply special formatting if needed
        this.leftText.setText(this.formatPageContent(leftPageContent, this.currentPage));
        this.rightText.setText(this.formatPageContent(rightPageContent, this.currentPage + 1));
        
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
        
        this.saveReadingProgress();
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
        
        // Return to library scene after fade
        this.time.delayedCall(300, () => {
            this.scene.start('BaseLibraryScene');
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
            this.pages = this.processBookContent(this.currentBook.content);
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
    
    // Force refresh of the scene
    refresh() {
        console.log('Refreshing ReadingScene with current book:', this.currentBook?.title);
        this.updateBookContent();
        this.updatePages();
    }
    
    // Clean shutdown
    shutdown() {
        console.log('ReadingScene shutting down');
        
        // Clean up timers
        if (this.readingStartTime) {
            this.totalReadingTime += Date.now() - this.readingStartTime;
            this.readingStartTime = null;
        }
        
        // Remove input listeners
        this.input.keyboard.off('keydown-LEFT');
        this.input.keyboard.off('keydown-RIGHT'); 
        this.input.keyboard.off('keydown-ESC');
        this.input.keyboard.off('keydown-SPACE');
        
        // Call parent shutdown
        super.shutdown();
    }

    // Process book content - Custom Pages Only
    processBookContent(content) {
        if (!content) {
            return ['No content available.'];
        }
        
        // Handle custom pages
        if (content.pages && Array.isArray(content.pages)) {
            return this.processCustomPages(content.pages);
        }
        
        // Handle plain text content - split into pages
        if (typeof content === 'string') {
            return this.splitContentIntoPages(content);
        }
        
        // Handle object with direct text content
        if (content.text) {
            return this.splitContentIntoPages(content.text);
        }
        
        return ['No content available.'];
    }

    // Process custom pages array
    processCustomPages(pages) {
        const processedPages = [];
        
        pages.forEach(page => {
            if (typeof page === 'string') {
                // Simple string page
                processedPages.push(page);
            } else if (page.type) {
                // Typed page object
                switch (page.type) {
                    case 'cover':
                        processedPages.push(this.createCoverPage(page));
                        break;
                        
                    case 'table-of-contents':
                        processedPages.push(this.createTOCPage(page));
                        break;
                        
                    case 'chapter-start':
                        processedPages.push(this.createChapterStartPage(page));
                        break;
                        
                    case 'content':
                        const contentResult = this.createContentPage(page);
                        if (Array.isArray(contentResult)) {
                            processedPages.push(...contentResult);
                        } else {
                            processedPages.push(contentResult);
                        }
                        break;
                        
                    default:
                        processedPages.push(page.content || 'Page content not available');
                }
            } else {
                // Simple page object with content property
                processedPages.push(page.content || 'Page content not available');
            }
        });
        
        return processedPages.length > 0 ? processedPages : ['No content available.'];
    }

    // Create specialized page types
    createCoverPage(data) {
        return `



                    ${data.title || 'Untitled'}

                    ${data.subtitle || ''}

                    by ${data.author || 'Unknown Author'}




                    ${data.publisher || ''}
                    ${data.year || new Date().getFullYear()}`;
    }

    createTOCPage(data) {
        let toc = `${data.title || 'Table of Contents'}\n\n`;
        
        if (data.items) {
            toc += data.items.join('\n');
        } else if (data.chapters) {
            toc += data.chapters.map(ch => `${ch.title} ..................... ${ch.page}`).join('\n');
        }
        
        return toc;
    }

    createChapterStartPage(data) {
        return `



                Chapter ${data.chapterNumber || ''}

                ${data.title || 'Untitled Chapter'}




                ${data.content || ''}`;
    }

    createContentPage(data) {
        // Handle regular content pages
        let content = '';
        
        // Add title if provided
        if (data.title) {
            content += `${data.title}\n\n`;
        }
        
        // Add main content
        const mainContent = data.content || 'No content available';
        
        // Check if content is too long for one page
        const words = mainContent.split(/\s+/);
        if (words.length > this.wordsPerPage) {
            // Split into multiple pages but return as array
            const contentPages = this.splitContentIntoPages(mainContent);
            
            // Add title only to first page
            if (data.title) {
                contentPages[0] = `${data.title}\n\n${contentPages[0]}`;
            }
            
            return contentPages; // Return array for multi-page content
        } else {
            // Single page content
            content += mainContent;
            return content;
        }
    }

    // Format page content based on page type
    formatPageContent(content, pageIndex) {
        // You can add special formatting here based on content type
        // For example, center alignment for cover pages, etc.
        return content;
    }

    // Method to add a new page dynamically
    addNewPage(pageData, insertIndex = null) {
        let newPageContent = '';
        
        if (typeof pageData === 'string') {
            newPageContent = pageData;
        } else if (pageData.type) {
            switch (pageData.type) {
                case 'cover':
                    newPageContent = this.createCoverPage(pageData.data || pageData);
                    break;
                case 'table-of-contents':
                    newPageContent = this.createTOCPage(pageData.data || pageData);
                    break;
                case 'chapter-start':
                    newPageContent = this.createChapterStartPage(pageData.data || pageData);
                    break;
                case 'content':
                    const contentResult = this.createContentPage(pageData.data || pageData);
                    if (Array.isArray(contentResult)) {
                        // Handle multi-page content
                        if (insertIndex !== null && insertIndex >= 0 && insertIndex <= this.pages.length) {
                            this.pages.splice(insertIndex, 0, ...contentResult);
                        } else {
                            this.pages.push(...contentResult);
                        }
                        this.updatePages();
                        return this.pages.length - contentResult.length; // Return index of first new page
                    } else {
                        newPageContent = contentResult;
                    }
                    break;
                default:
                    newPageContent = pageData.content || 'New page content';
            }
        } else {
            newPageContent = pageData.content || 'New page content';
        }
        
        // Insert at specific index or append to end
        if (insertIndex !== null && insertIndex >= 0 && insertIndex <= this.pages.length) {
            this.pages.splice(insertIndex, 0, newPageContent);
        } else {
            this.pages.push(newPageContent);
        }
        
        // Update display if we're viewing the affected area
        this.updatePages();
        
        console.log(`Added new page. Total pages: ${this.pages.length}`);
        return this.pages.length - 1; // Return index of new page
    }

    // Method to remove a page
    removePage(pageIndex) {
        if (pageIndex >= 0 && pageIndex < this.pages.length) {
            this.pages.splice(pageIndex, 1);
            
            // Adjust current page if necessary
            if (this.currentPage >= this.pages.length) {
                this.currentPage = Math.max(0, this.pages.length - 2);
            }
            
            this.updatePages();
            console.log(`Removed page ${pageIndex}. Total pages: ${this.pages.length}`);
        }
    }

    // Method to update specific page content
    updatePageContent(pageIndex, newContent) {
        if (pageIndex >= 0 && pageIndex < this.pages.length) {
            this.pages[pageIndex] = newContent;
            
            // Update display if we're currently viewing this page
            if (pageIndex === this.currentPage || pageIndex === this.currentPage + 1) {
                this.updatePages();
            }
            
            console.log(`Updated page ${pageIndex} content`);
        }
    }
}

export default ReadingScene;