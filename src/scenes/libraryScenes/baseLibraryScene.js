// Enhanced Library Scene with JSON Data Support

class BaseLibraryScene extends Phaser.Scene {
    constructor() {
        super({ 
            key: 'BaseLibraryScene',
            active: false // Scene won't start automatically
        });
        this.isPopupOpen = false;
        this.libraryData = null; // Store loaded JSON data
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
                    { label: 'Quests Completed', value: 0, max: 15, color: '#27AE60' },
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
                
                // Status indicator
                const statusColor = book.status === 'available' ? 0x27AE60 : 
                                  book.status === 'reading' ? 0xF39C12 : 0xE74C3C;
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
        // FIXED: Calculate proper starting position
        const popupHeight = this.cameras.main.height;
        const headerHeight = 80;
        const startY = (-popupHeight/2) + headerHeight + 40; // Start below header with some padding
        let yOffset = startY;
        
        this.libraryData.notes.categories.forEach((category, categoryIndex) => {
            // Category header
            const categoryHeader = this.add.text(0, yOffset, category.name, {
                fontSize: '18px',
                color: '#34495E',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            this.popupContent.add(categoryHeader);
            yOffset += 50; // Proper spacing after category header
            
            // Notes in category
            if (category.notes.length === 0) {
                const emptyText = this.add.text(0, yOffset, 'No notes yet...', {
                    fontSize: '14px',
                    color: '#7F8C8D',
                    fontFamily: 'Arial',
                    fontStyle: 'italic'
                }).setOrigin(0.5);
                
                this.popupContent.add(emptyText);
                yOffset += 50; // Proper spacing for empty text
            } else {
                category.notes.forEach((note, noteIndex) => {
                    // Note background
                    const noteBg = this.add.rectangle(0, yOffset, 450, 80, 0xFFF3CD);
                    noteBg.setStrokeStyle(1, 0xFFC107);
                    
                    // Note text
                    const noteText = this.add.text(0, yOffset - 10, note.content || note, {
                        fontSize: '14px',
                        color: '#856404',
                        fontFamily: 'Arial',
                        wordWrap: { width: 400 }
                    }).setOrigin(0.5);
                    
                    // Note date if available
                    if (note.date) {
                        const noteDate = this.add.text(0, yOffset + 25, note.date, {
                            fontSize: '10px',
                            color: '#6C757D',
                            fontFamily: 'Arial'
                        }).setOrigin(0.5);
                        
                        this.popupContent.add([noteBg, noteText, noteDate]);
                    } else {
                        this.popupContent.add([noteBg, noteText]);
                    }
                    
                    yOffset += 100; // Proper spacing between notes
                });
            }
            
            yOffset += 30; // Space between categories
        });
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

    // Utility methods for data management
    addBook(categoryName, bookData) {
        const category = this.libraryData.books.categories.find(cat => cat.name === categoryName);
        if (category) {
            bookData.id = Date.now(); // Simple ID generation
            category.books.push(bookData);
            this.saveData();
        }
    }

    removeBook(bookId) {
        this.libraryData.books.categories.forEach(category => {
            category.books = category.books.filter(book => book.id !== bookId);
        });
        this.saveData();
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
        }
    }

    removeNote(noteId) {
        this.libraryData.notes.categories.forEach(category => {
            category.notes = category.notes.filter(note => note.id !== noteId);
        });
        this.saveData();
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