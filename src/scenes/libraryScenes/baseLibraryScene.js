// Enhanced Library Scene with JSON Data Support and Auto Progress Update

class BaseLibraryScene extends Phaser.Scene {
    constructor() {
        super({ 
            key: 'BaseLibraryScene',
            active: false
        });
        this.isPopupOpen = false;
        this.libraryData = null;
        this.editingNote = null; // Track which note is being edited
        this.noteOptionsVisible = false; // Track if note options menu is visible
    }

    init(data) {
        // Receive data from previous scene
        this.previousScene = data?.previousScene || 'MainScene';
        this.playerData = data?.playerData || {};
        this.gameProgress = data?.gameProgress || {};
    }

    preload() {
        // Load library-specific assets
        this.load.image('libraryBg', 'assets/img/bg/libraryBG.jpg');
        
        // Load JSON data files
        this.load.json('libraryData', `/library/library.json`);
        this.load.json('booksData', `/library/books.json`);
        this.load.json('progressData', `/library/progress.json`);
        this.load.json('notesData', `/library/notes.json`);
        
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
        this.createMainMenu();
        this.createPopupContainer();
        
        // Ensure popup is properly hidden initially
        if (this.popupContainer) {
            this.popupContainer.setVisible(false);
            const offScreenX = this.cameras.main.width + (this.cameras.main.width / 4);
            this.popupContainer.setPosition(offScreenX, this.cameras.main.height / 2);
        }
        
        if (this.overlay) {
            this.overlay.setVisible(false);
            this.overlay.setAlpha(0);
        }
    }

    loadJsonData() {
        // Load all JSON data
        this.libraryData = {
            main: this.cache.json.get('libraryData'),
            books: this.cache.json.get('booksData'),
            progress: this.cache.json.get('progressData'),
            notes: this.cache.json.get('notesData')
        };
    }

    validateJsonData() {
        // Set default structure if data is missing
        if (!this.libraryData.main) {
            this.libraryData.main = {
                title: "LIBRARY MENU",
                menuItems: [
                    { name: 'Books', hasPopup: true, icon: '📚' },
                    { name: 'Progress', hasPopup: true, icon: '📊' },
                    { name: 'Notes', hasPopup: true, icon: '📝' },
                    { name: 'Settings', hasPopup: false, icon: '⚙️' }
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
                    { label: 'Books Read', value: 0, max: 20, color: '#3498DB' },
                    { label: 'Notes Written', value: 0, max: 50, color: '#E74C3C' }
                ],
                achievements: []
            };
        }

        if (!this.libraryData.notes) {
            this.libraryData.notes = {
                categories: [
                    {
                        name: "Study Notes",
                        notes: []
                    }
                ]
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
            
            // Refresh the popup content if it's currently showing Progress
            if (this.isPopupOpen && this.currentPopupType === 'Progress') {
                this.updatePopupContent('Progress');
            }
        }
        
        console.log(`Book "${book.title}" marked as completed!`);
    }

    setupBackground() {
        this.background = this.add.image(0, 0, 'libraryBg');
        this.background.setOrigin(0, 0);
        
        // Calculate scale to cover entire screen
        const scaleX = this.cameras.main.width / this.background.width;
        const scaleY = this.cameras.main.height / this.background.height;
        const scale = Math.max(scaleX, scaleY);
        
        this.background.setScale(scale);
        
        // Center the image
        this.background.setPosition(
            (this.cameras.main.width - this.background.displayWidth) / 2,
            (this.cameras.main.height - this.background.displayHeight) / 2
        );
    }
    
    createMainMenu() {
        // Left side menu container
        this.mainMenuContainer = this.add.container(200, 400);
        
        // Menu background
        const menuBg = this.add.rectangle(0, 0, 250, 400, 0x34495E, 0.9);
        menuBg.setStrokeStyle(2, 0x5D6D7E);
        this.mainMenuContainer.add(menuBg);
        
        // Menu title - FIX: Access through this.libraryData.main.title
        const title = this.add.text(0, -150, this.libraryData.main.title, {
            fontSize: '20px',
            color: '#ECF0F1',
            fontFamily: 'Jersey15-Regular',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.mainMenuContainer.add(title);
        
        // Create menu items from JSON data - FIX: Access through this.libraryData.main.menuItems
        this.libraryData.main.menuItems.forEach((item, index) => {
            const y = -50 + (index * 60);
            
            // Button background
            const btnBg = this.add.rectangle(0, y, 200, 45, 0x3498DB, 0.8);
            btnBg.setStrokeStyle(1, 0x2980B9);
            
            // Button text with icon
            const displayText = item.icon ? `${item.icon} ${item.name}` : item.name;
            const btnText = this.add.text(0, y, displayText, {
                fontSize: '16px',
                color: '#FFFFFF',
                fontFamily: 'Jersey15-Regular',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            // Make interactive
            btnBg.setInteractive();
            btnBg.on('pointerover', () => {
                btnBg.setFillStyle(0x2980B9);
                btnText.setColor('#F1C40F');
            });
            
            btnBg.on('pointerout', () => {
                btnBg.setFillStyle(0x3498DB);
                btnText.setColor('#FFFFFF');
            });
            
            btnBg.on('pointerdown', () => {
                if (item.hasPopup) {
                    if (this.isPopupOpen) {
                        if (this.currentPopupType === item.name) {
                            return;
                        }
                        this.hidePopup(() => {
                            this.showPopup(item.name);
                        });
                    } else {
                        this.showPopup(item.name);
                    }
                } else {
                    this.handleMenuClick(item.name);
                }
            });
            
            this.mainMenuContainer.add([btnBg, btnText]);
        });
    }
    
    createPopupContainer() {
        // Popup container - positioned off-screen initially
        const popupWidth = this.cameras.main.width / 2;
        const popupHeight = this.cameras.main.height;
        const popupX = this.cameras.main.width + (popupWidth / 2);
        const popupY = this.cameras.main.height / 2;
    
        this.popupContainer = this.add.container(popupX, popupY);
        
        // Semi-transparent overlay
        this.overlay = this.add.rectangle(-popupWidth, 0, popupWidth, popupHeight, 0x000000, 0.5);
        this.overlay.setInteractive();
        this.overlay.on('pointerdown', () => {
            this.hidePopup();
        });
        this.overlay.setVisible(false);
        
        // Main popup background
        this.popupBg = this.add.rectangle(0, 0, popupWidth - 20, popupHeight - 40, 0xFFFFFF, 0.95);
        this.popupBg.setStrokeStyle(3, 0x34495E);

        
        
        // Popup header
        this.popupHeader = this.add.rectangle(0, -popupHeight/2 + 40, popupWidth - 20, 80, 0x3498DB);
        
        // Close button
        this.closeBtn = this.add.circle(popupWidth/2 - 50, -popupHeight/2 + 40, 20, 0xE74C3C);
        this.closeBtn.setStrokeStyle(2, 0xC0392B);
        this.closeBtn.setInteractive();
        this.closeBtn.on('pointerover', () => {
            this.closeBtn.setFillStyle(0xC0392B);
        });
        this.closeBtn.on('pointerout', () => {
            this.closeBtn.setFillStyle(0xE74C3C);
        });
        this.closeBtn.on('pointerdown', () => {
            this.hidePopup();
        });
        
        // Close button X
        this.closeBtnText = this.add.text(popupWidth/2 - 50, -popupHeight/2 + 40, '✕', {
            fontSize: '16px',
            color: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Popup title
        this.popupTitle = this.add.text(0, -popupHeight/2 + 40, 'POPUP TITLE', {
            fontSize: '24px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Content area with scrolling capability
        this.popupContent = this.add.container(0, 0);
        this.popupScrollY = 0;
        
        // Add scroll functionality
        this.popupBg.setInteractive();
        this.input.mouse.enabled = true;
        
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this.scrollPopupContent(deltaY);
        });
        
        // Add all elements to popup container
        this.popupContainer.add([
            this.popupBg,
            this.popupHeader,
            this.closeBtn,
            this.closeBtnText,
            this.popupTitle,
            this.popupContent
        ]);
        
        this.popupContainer.setVisible(false);
    }

    scrollPopupContent(deltaY) {
        const scrollSpeed = 30;
        this.popupScrollY -= Math.sign(deltaY) * scrollSpeed;

        // Limit scroll bounds
        this.popupScrollY = Phaser.Math.Clamp(this.popupScrollY, -200, 200);

        this.popupContent.y = this.popupScrollY;
    }

    showPopup(contentType) {
        if (this.isPopupOpen) return;
        
        this.isPopupOpen = true;
        this.currentPopupType = contentType;
        this.popupScrollY = 0; // Reset scroll position
        
        this.overlay.setVisible(true);
        this.updatePopupContent(contentType);
        this.popupContainer.setVisible(true);
        
        const targetX = this.cameras.main.width - (this.cameras.main.width / 4);
        
        this.tweens.add({
            targets: this.popupContainer,
            x: targetX,
            duration: 400,
            ease: 'Power3.easeOut'
        });
        
        this.overlay.setAlpha(0);
        this.tweens.add({
            targets: this.overlay,
            alpha: 1,
            duration: 200,
            ease: 'Power2.easeOut'
        });
    }
    
    hidePopup(onComplete) {
        if (!this.isPopupOpen) {
            if (onComplete) onComplete();
            return;
        }
        
        const offScreenX = this.cameras.main.width + (this.cameras.main.width / 4);
        
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
        
        this.tweens.add({
            targets: this.overlay,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeIn'
        });
    }
    
    updatePopupContent(contentType) {
        this.popupContent.removeAll(true);
        this.popupContent.y = 0; // Reset position
        this.popupTitle.setText(contentType.toUpperCase());
        
        switch(contentType) {
            case 'Books':
                this.createBooksContent();
                break;
            case 'Progress':
                this.createProgressContent();
                break;
            case 'Notes':
                this.createNotesContent();
                break;
        }
    }
    
    createBooksContent() {
        // FIXED: Calculate proper starting position
        const popupHeight = this.cameras.main.height;
        const headerHeight = 80;
        const startY = (-popupHeight/2) + headerHeight + 40; // Start below header with some padding
        let yOffset = startY;
        
        this.libraryData.books.categories.forEach((category, categoryIndex) => {
            // Category header
            const categoryHeader = this.add.text(0, yOffset, category.name, {
                fontSize: '18px',
                color: '#34495E',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            this.popupContent.add(categoryHeader);
            yOffset += 50; // Proper spacing after category header
            
            // Books in category
            category.books.forEach((book, bookIndex) => {
                // Book container
                const bookBg = this.add.rectangle(0, yOffset, 450, 80, 0xECF0F1);
                bookBg.setStrokeStyle(1, 0xBDC3C7);
                
                // Book info
                const bookTitle = this.add.text(-200, yOffset - 15, book.title, {
                    fontSize: '16px',
                    color: '#2C3E50',
                    fontFamily: 'Arial',
                    fontStyle: 'bold'
                }).setOrigin(0, 0.5);
                
                const bookAuthor = this.add.text(-200, yOffset + 5, `by ${book.author}`, {
                    fontSize: '12px',
                    color: '#7F8C8D',
                    fontFamily: 'Arial'
                }).setOrigin(0, 0.5);
                
                const bookPages = this.add.text(-200, yOffset + 20, `${book.pages} pages • ${book.difficulty}`, {
                    fontSize: '10px',
                    color: '#95A5A6',
                    fontFamily: 'Arial'
                }).setOrigin(0, 0.5);
                
                // Status indicator - using the helper method
                const statusColor = this.getBookStatusColor(book.status);
                const statusBg = this.add.rectangle(150, yOffset - 10, 80, 20, statusColor);
                const statusText = this.add.text(150, yOffset - 10, book.status.toUpperCase(), {
                    fontSize: '10px',
                    color: '#FFFFFF',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                
                // Action button
                const actionBtn = this.add.rectangle(150, yOffset + 15, 80, 25, 0x3498DB);
                actionBtn.setInteractive();
                actionBtn.on('pointerdown', () => {
                    this.handleBookAction(book);
                });
                actionBtn.on('pointerover', () => {
                    actionBtn.setFillStyle(0x2980B9);
                });
                actionBtn.on('pointerout', () => {
                    actionBtn.setFillStyle(0x3498DB);
                });
                
                const actionText = this.add.text(150, yOffset + 15, 'READ', {
                    fontSize: '10px',
                    color: '#FFFFFF',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                
                this.popupContent.add([
                    bookBg, bookTitle, bookAuthor, bookPages,
                    statusBg, statusText, actionBtn, actionText
                ]);
                
                yOffset += 100; // Proper spacing between books
            });
            
            yOffset += 30; // Space between categories
        });
    }
    
    createProgressContent() {
        // FIXED: Calculate proper starting position
        const popupHeight = this.cameras.main.height;
        const headerHeight = 80;
        const startY = (-popupHeight/2) + headerHeight + 40; // Start below header with some padding
        let yOffset = startY;
        
        this.libraryData.progress.stats.forEach((stat, index) => {
            // Label
            const label = this.add.text(0, yOffset, stat.label, {
                fontSize: '16px',
                color: '#2C3E50',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            // Progress bar background
            const progressBg = this.add.rectangle(0, yOffset + 25, 350, 20, 0xBDC3C7);
            
            // Progress bar fill
            const fillWidth = (stat.value / stat.max) * 350;
            const progressFill = this.add.rectangle(-175 + (fillWidth/2), yOffset + 25, fillWidth, 20, 
                parseInt(stat.color.replace('#', '0x')));
            
            // Progress text
            const progressText = this.add.text(0, yOffset + 50, `${stat.value}/${stat.max} (${Math.round((stat.value/stat.max)*100)}%)`, {
                fontSize: '12px',
                color: '#7F8C8D',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            
            this.popupContent.add([label, progressBg, progressFill, progressText]);
            
            yOffset += 90; // Proper spacing between progress bars
        });
        
        // Achievements section
        if (this.libraryData.progress.achievements.length > 0) {
            yOffset += 30; // Space before achievements section
            const achievementHeader = this.add.text(0, yOffset, 'ACHIEVEMENTS', {
                fontSize: '18px',
                color: '#34495E',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            this.popupContent.add(achievementHeader);
            yOffset += 50; // Proper spacing after achievements header
            
            this.libraryData.progress.achievements.forEach((achievement, index) => {
                const achievementBg = this.add.rectangle(0, yOffset, 400, 50, 0xF8F9FA);
                achievementBg.setStrokeStyle(1, 0xDEE2E6);
                
                const achievementText = this.add.text(0, yOffset, achievement.name, {
                    fontSize: '14px',
                    color: '#495057',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                
                this.popupContent.add([achievementBg, achievementText]);
                yOffset += 70; // Proper spacing between achievements
            });
        }
    }
    
createNotesContent() {
    const popupHeight = this.cameras.main.height;
    const headerHeight = 80;
    const startY = (-popupHeight/2) + headerHeight + 40;
    let yOffset = startY;
    
    // Add "Add New Note" button at the top
    const addNoteBtn = this.add.rectangle(0, yOffset, 200, 40, 0x27AE60);
    addNoteBtn.setStrokeStyle(2, 0x229954);
    addNoteBtn.setInteractive();
    
    const addNoteText = this.add.text(0, yOffset, '+ Add New Note', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    addNoteBtn.on('pointerover', () => {
        addNoteBtn.setFillStyle(0x229954);
    });
    
    addNoteBtn.on('pointerout', () => {
        addNoteBtn.setFillStyle(0x27AE60);
    });
    
    addNoteBtn.on('pointerdown', () => {
        this.showAddNoteDialog();
    });
    
    this.popupContent.add([addNoteBtn, addNoteText]);
    yOffset += 70;
    
    this.libraryData.notes.categories.forEach((category, categoryIndex) => {
        // Category header
        const categoryHeader = this.add.text(0, yOffset, category.name, {
            fontSize: '18px',
            color: '#34495E',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.popupContent.add(categoryHeader);
        yOffset += 50;
        
        // Notes in category
        if (category.notes.length === 0) {
            const emptyText = this.add.text(0, yOffset, 'No notes yet...', {
                fontSize: '14px',
                color: '#7F8C8D',
                fontFamily: 'Arial',
                fontStyle: 'italic'
            }).setOrigin(0.5);
            
            this.popupContent.add(emptyText);
            yOffset += 50;
        } else {
            category.notes.forEach((note, noteIndex) => {
                // Note container
                const noteContainer = this.add.container(0, yOffset);
                
                // Note background
                const noteBg = this.add.rectangle(0, 0, 450, 80, 0xFFF3CD);
                noteBg.setStrokeStyle(1, 0xFFC107);
                
                // Note text
                const noteText = this.add.text(-200, -10, note.content || note, {
                    fontSize: '14px',
                    color: '#856404',
                    fontFamily: 'Arial',
                    wordWrap: { width: 350 }
                }).setOrigin(0, 0.5);
                
                // Note date if available
                let noteDate = null;
                if (note.date) {
                    noteDate = this.add.text(-200, 25, note.date, {
                        fontSize: '10px',
                        color: '#6C757D',
                        fontFamily: 'Arial'
                    }).setOrigin(0, 0.5);
                }
                
                // Options button (3 dots)
                const optionsBtn = this.add.circle(180, -20, 15, 0x6C757D);
                optionsBtn.setInteractive();
                optionsBtn.setStrokeStyle(1, 0x495057);
                
                const optionsText = this.add.text(180, -20, '⋮', {
                    fontSize: '16px',
                    color: '#FFFFFF',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                
                // Options menu (initially hidden)
                const optionsMenu = this.add.container(180, 10);
                const optionsMenuBg = this.add.rectangle(0, 0, 100, 80, 0xFFFFFF);
                optionsMenuBg.setStrokeStyle(2, 0x6C757D);
                
                // Edit button
                const editBtn = this.add.rectangle(0, -20, 90, 30, 0x17A2B8);
                const editText = this.add.text(0, -20, 'Edit', {
                    fontSize: '12px',
                    color: '#FFFFFF',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                
                // Remove button
                const removeBtn = this.add.rectangle(0, 20, 90, 30, 0xDC3545);
                const removeText = this.add.text(0, 20, 'Remove', {
                    fontSize: '12px',
                    color: '#FFFFFF',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                
                optionsMenu.add([optionsMenuBg, editBtn, editText, removeBtn, removeText]);
                optionsMenu.setVisible(false);
                
                // Button interactions
                optionsBtn.on('pointerover', () => {
                    optionsBtn.setFillStyle(0x495057);
                });
                
                optionsBtn.on('pointerout', () => {
                    optionsBtn.setFillStyle(0x6C757D);
                });
                
                optionsBtn.on('pointerdown', () => {
                    optionsMenu.setVisible(!optionsMenu.visible);
                });
                
                editBtn.setInteractive();
                editBtn.on('pointerdown', () => {
                    this.showEditNoteDialog(note, category.name);
                    optionsMenu.setVisible(false);
                });
                
                removeBtn.setInteractive();
                removeBtn.on('pointerdown', () => {
                    this.showRemoveNoteConfirmation(note, category.name);
                    optionsMenu.setVisible(false);
                });
                
                // Add all elements to note container
                const noteElements = [noteBg, noteText, optionsBtn, optionsText, optionsMenu];
                if (noteDate) noteElements.push(noteDate);
                
                noteContainer.add(noteElements);
                this.popupContent.add(noteContainer);
                
                yOffset += 100;
            });
        }
        
        yOffset += 30;
    });
}

showAddNoteDialog() {
    // Create a simple input dialog
    const dialogBg = this.add.rectangle(this.cameras.main.width/2, this.cameras.main.height/2, 400, 200, 0xFFFFFF);
    dialogBg.setStrokeStyle(3, 0x34495E);
    dialogBg.setDepth(1000);
    
    const dialogTitle = this.add.text(this.cameras.main.width/2, this.cameras.main.height/2 - 60, 'Add New Note', {
        fontSize: '18px',
        color: '#2C3E50',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1001);
    
    // Create HTML input element
    const inputElement = document.createElement('textarea');
    inputElement.style.position = 'absolute';
    inputElement.style.left = (this.cameras.main.width/2 + 150) + 'px';
    inputElement.style.top = (this.cameras.main.height/2 - 20) + 'px';
    inputElement.style.width = '300px';
    inputElement.style.height = '60px';
    inputElement.style.zIndex = '1002';
    inputElement.placeholder = 'Enter your note here...';
    document.body.appendChild(inputElement);
    
    // Save button
    const saveBtn = this.add.rectangle(this.cameras.main.width/2 - 50, this.cameras.main.height/2 + 60, 80, 30, 0x27AE60);
    saveBtn.setStrokeStyle(1, 0x229954);
    saveBtn.setInteractive();
    saveBtn.setDepth(1001);
    
    const saveText = this.add.text(this.cameras.main.width/2 - 50, this.cameras.main.height/2 + 60, 'Save', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(1001);
    
    // Cancel button
    const cancelBtn = this.add.rectangle(this.cameras.main.width/2 + 50, this.cameras.main.height/2 + 60, 80, 30, 0x6C757D);
    cancelBtn.setStrokeStyle(1, 0x495057);
    cancelBtn.setInteractive();
    cancelBtn.setDepth(1001);
    
    const cancelText = this.add.text(this.cameras.main.width/2 + 50, this.cameras.main.height/2 + 60, 'Cancel', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(1001);
    
    const dialogElements = [dialogBg, dialogTitle, saveBtn, saveText, cancelBtn, cancelText];
    
    const closeDialog = () => {
        dialogElements.forEach(element => element.destroy());
        document.body.removeChild(inputElement);
    };
    
    saveBtn.on('pointerdown', () => {
        const noteContent = inputElement.value.trim();
        if (noteContent) {
            this.addNote('Study Notes', {
                content: noteContent,
                date: new Date().toLocaleDateString(),
                id: Date.now()
            });
            this.updatePopupContent('Notes');
        }
        closeDialog();
    });
    
    cancelBtn.on('pointerdown', () => {
        closeDialog();
    });
    
    inputElement.focus();
}

showEditNoteDialog(note, categoryName) {
    // Similar to add dialog but pre-filled with existing note content
    const dialogBg = this.add.rectangle(this.cameras.main.width/2, this.cameras.main.height/2, 400, 200, 0xFFFFFF);
    dialogBg.setStrokeStyle(3, 0x34495E);
    dialogBg.setDepth(1000);
    
    const dialogTitle = this.add.text(this.cameras.main.width/2, this.cameras.main.height/2 - 60, 'Edit Note', {
        fontSize: '18px',
        color: '#2C3E50',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1001);
    
    const inputElement = document.createElement('textarea');
    inputElement.style.position = 'absolute';
    inputElement.style.left = (this.cameras.main.width/2 - 150) + 'px';
    inputElement.style.top = (this.cameras.main.height/2 - 20) + 'px';
    inputElement.style.width = '300px';
    inputElement.style.height = '60px';
    inputElement.style.zIndex = '1002';
    inputElement.value = note.content || note;
    document.body.appendChild(inputElement);
    
    const saveBtn = this.add.rectangle(this.cameras.main.width/2 - 50, this.cameras.main.height/2 + 60, 80, 30, 0x17A2B8);
    saveBtn.setStrokeStyle(1, 0x138496);
    saveBtn.setInteractive();
    saveBtn.setDepth(1001);
    
    const saveText = this.add.text(this.cameras.main.width/2 - 50, this.cameras.main.height/2 + 60, 'Update', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(1001);
    
    const cancelBtn = this.add.rectangle(this.cameras.main.width/2 + 50, this.cameras.main.height/2 + 60, 80, 30, 0x6C757D);
    cancelBtn.setStrokeStyle(1, 0x495057);
    cancelBtn.setInteractive();
    cancelBtn.setDepth(1001);
    
    const cancelText = this.add.text(this.cameras.main.width/2 + 50, this.cameras.main.height/2 + 60, 'Cancel', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(1001);
    
    const dialogElements = [dialogBg, dialogTitle, saveBtn, saveText, cancelBtn, cancelText];
    
    const closeDialog = () => {
        dialogElements.forEach(element => element.destroy());
        document.body.removeChild(inputElement);
    };
    
    saveBtn.on('pointerdown', () => {
        const noteContent = inputElement.value.trim();
        if (noteContent) {
            this.editNote(note.id || note, categoryName, {
                content: noteContent,
                date: note.date || new Date().toLocaleDateString(),
                id: note.id || Date.now()
            });
            this.updatePopupContent('Notes');
        }
        closeDialog();
    });
    
    cancelBtn.on('pointerdown', () => {
        closeDialog();
    });
    
    inputElement.focus();
    inputElement.select();
}


showRemoveNoteConfirmation(note, categoryName) {
    const dialogBg = this.add.rectangle(this.cameras.main.width/2, this.cameras.main.height/2, 350, 150, 0xFFFFFF);
    dialogBg.setStrokeStyle(3, 0xDC3545);
    dialogBg.setDepth(1000);
    
    const dialogTitle = this.add.text(this.cameras.main.width/2, this.cameras.main.height/2 - 30, 'Remove Note', {
        fontSize: '18px',
        color: '#DC3545',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1001);
    
    const confirmText = this.add.text(this.cameras.main.width/2, this.cameras.main.height/2, 'Are you sure you want to remove this note?', {
        fontSize: '14px',
        color: '#2C3E50',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(1001);
    
    const removeBtn = this.add.rectangle(this.cameras.main.width/2 - 60, this.cameras.main.height/2 + 40, 80, 30, 0xDC3545);
    removeBtn.setStrokeStyle(1, 0xC82333);
    removeBtn.setInteractive();
    removeBtn.setDepth(1001);
    
    const removeText = this.add.text(this.cameras.main.width/2 - 60, this.cameras.main.height/2 + 40, 'Remove', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(1001);
    
    const cancelBtn = this.add.rectangle(this.cameras.main.width/2 + 60, this.cameras.main.height/2 + 40, 80, 30, 0x6C757D);
    cancelBtn.setStrokeStyle(1, 0x495057);
    cancelBtn.setInteractive();
    cancelBtn.setDepth(1001);
    
    const cancelText = this.add.text(this.cameras.main.width/2 + 60, this.cameras.main.height/2 + 40, 'Cancel', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(1001);
    
    const dialogElements = [dialogBg, dialogTitle, confirmText, removeBtn, removeText, cancelBtn, cancelText];
    
    const closeDialog = () => {
        dialogElements.forEach(element => element.destroy());
    };
    
    removeBtn.on('pointerdown', () => {
        this.removeNote(note.id || note);
        this.updatePopupContent('Notes');
        closeDialog();
    });
    
    cancelBtn.on('pointerdown', () => {
        closeDialog();
    });
}

editNote(noteId, categoryName, updatedNoteData) {
    const category = this.libraryData.notes.categories.find(cat => cat.name === categoryName);
    if (category) {
        const noteIndex = category.notes.findIndex(note => 
            (note.id && note.id === noteId) || note === noteId
        );
        if (noteIndex !== -1) {
            category.notes[noteIndex] = updatedNoteData;
            this.saveData();
            this.syncWithNotesJson();
        }
    }
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

addNote(categoryName, noteData) {
    const category = this.libraryData.notes.categories.find(cat => cat.name === categoryName);
    if (category) {
        if (typeof noteData === 'string') {
            noteData = {
                content: noteData,
                date: new Date().toLocaleDateString(),
                id: Date.now()
            };
        }
        category.notes.push(noteData);
        this.saveData();
        this.syncWithNotesJson();
    }
}

    removeNote(noteId) {
        this.libraryData.notes.categories.forEach(category => {
            category.notes = category.notes.filter(note => 
                (note.id && note.id !== noteId) && note !== noteId
            );
        });
        this.saveData();
        this.syncWithNotesJson();
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

async syncWithNotesJson() {
    try {
        // In a real implementation, you would make an API call to update the server-side notes.json
        // For now, we'll simulate this with a console log
        console.log('Syncing notes with /library/notes.json:', this.libraryData.notes);
        
        // Example of what the server sync would look like:
        /*
        await fetch('/api/library/notes', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(this.libraryData.notes)
        });
        */
    } catch (error) {
        console.error('Failed to sync notes with server:', error);
    }
}
}


// Export the scene
export default BaseLibraryScene;