// Enhanced Library Scene with JSON Data Support and Auto Progress Update

import LibraryUI from './LibraryUI.js';
import { createBackButton } from '../../components/buttons/backbutton.js';

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
        this.load.image('libraryBg', 'assets/img/bg/libraryBG.png');
        
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
        LibraryUI.createMainMenu(this);
        LibraryUI.createPopupContainer(this);
        
        // Create back button to return to previous scene
        const targetScene = this.previousScene === 'MainScene' ? 'MainHub' : this.previousScene;
        this.backButton = createBackButton(this, targetScene);
        
        // Ensure popup is properly hidden initially
        if (this.popupContainer) {
            this.popupContainer.setVisible(false);
            const offScreenX = this.cameras.main.width + (this.cameras.main.width / 4);
            this.popupContainer.setPosition(offScreenX, this.cameras.main.height / 2);
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
        
        this.isPopupOpen = true;
        this.currentPopupType = contentType;
        this.popupScrollY = 0; // Reset scroll position
        
        this.updatePopupContent(contentType);
        this.popupContainer.setVisible(true);
        
        const targetX = this.cameras.main.width - (this.cameras.main.width / 4);
        
        this.tweens.add({
            targets: this.popupContainer,
            x: targetX,
            duration: 400,
            ease: 'Power3.easeOut'
            // Removed mask creation that was causing content to disappear
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
    }
    
    updatePopupContent(contentType) {
        this.popupContent.removeAll(true);
        this.popupScrollY = 0; // Reset scroll position
        // Reset content position to its initial position below header
        this.popupContent.y = this.popupContentStartY || 0;
        this.popupTitle.setText(contentType.toUpperCase());
        
        switch(contentType) {
            case 'Books':
                LibraryUI.createBooksContent(this);
                break;
            case 'Progress':
                LibraryUI.createProgressContent(this);
                break;
            case 'Notes':
                LibraryUI.createNotesContent(this);
                break;
        }
    }

    scrollPopupContent(deltaY) {
        const scrollSpeed = 30;
        this.popupScrollY -= Math.sign(deltaY) * scrollSpeed;
        
        // Get content bounds
        const contentHeight = this.popupContent.getBounds().height;
        const availableHeight = this.popupMaskBounds ? this.popupMaskBounds.height : 
                               (this.cameras.main.height - 160);
        
        // Natural scrolling with reasonable bounds
        if (contentHeight > availableHeight) {
            // Allow scrolling up to show all content, with a small buffer
            const maxScrollUp = -(contentHeight - availableHeight + 20);
            const maxScrollDown = 0;
            
            this.popupScrollY = Phaser.Math.Clamp(this.popupScrollY, maxScrollUp, maxScrollDown);
        } else {
            // If content fits, allow minimal overscroll
            this.popupScrollY = Phaser.Math.Clamp(this.popupScrollY, -20, 20);
        }
        
        // Update content position
        const startY = this.popupContentStartY || 0;
        this.popupContent.y = startY + this.popupScrollY;
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

destroy() {
        // Clean up back button if it exists
        if (this.backButton) {
            if (this.backButton.buttonBg) this.backButton.buttonBg.destroy();
            if (this.backButton.backButton) this.backButton.backButton.destroy();
        }
        
        // Clean up popup mask if it exists
        if (this.popupMask) {
            this.popupContent.clearMask();
            this.popupMask.destroy();
            this.popupMask = null;
        }
        
        // Call parent destroy
        super.destroy();
    }

    // Method to handle going back to previous scene
    goBackToPreviousScene() {
        // If popup is open, close it first
        if (this.isPopupOpen) {
            this.hidePopup(() => {
                this.transitionToPreviousScene();
            });
        } else {
            this.transitionToPreviousScene();
        }
    }

    transitionToPreviousScene() {
        const targetScene = this.previousScene === 'MainScene' ? 'MainHub' : this.previousScene;
        console.log(`Transitioning back to: ${targetScene}`);
        this.scene.start(targetScene);
    }
}


// Export the scene
export default BaseLibraryScene;