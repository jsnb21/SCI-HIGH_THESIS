// Base Library Scene

class BaseLibraryScene extends Phaser.Scene {
    constructor() {
        super({ 
            key: 'BaseLibraryScene',
            active: false // Scene won't start automatically
        });
        this.isPopupOpen = false;
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
        // this.load.image('bookshelf', 'assets/library/bookshelf.png');
        // this.load.image('book', 'assets/library/book.png');
        // this.load.audio('pageFlip', 'assets/library/page-flip.wav');
    
    }

    create() {
        // Setup scene
        this.setupBackground();
        this.createMainMenu();
        this.createPopupContainer();
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
        
        // Menu title
        const title = this.add.text(0, -150, 'LIBRARY MENU', {
            fontSize: '20px',
            color: '#ECF0F1',
            fontFamily: 'Jersey15-Regular',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.mainMenuContainer.add(title);
        
        // Menu items with popup triggers
        const menuItems = [
            { name: 'Books', hasPopup: true },
            { name: 'Progress', hasPopup: true },
            { name: 'Notes', hasPopup: true },
            { name: 'Settings', hasPopup: false }
        ];
        
        menuItems.forEach((item, index) => {
            const y = -50 + (index * 60);
            
            // Button background
            const btnBg = this.add.rectangle(0, y, 200, 45, 0x3498DB, 0.8);
            btnBg.setStrokeStyle(1, 0x2980B9);
            
            // Button text
            const btnText = this.add.text(0, y, item.name, {
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
                            // Same popup, do nothing
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
        const popupWidth = this.cameras.main.width / 2; // Half screen width
        const popupHeight = this.cameras.main.height;   // Full height
        const popupX = this.cameras.main.width + (popupWidth / 2); // Off-screen right
        const popupY = this.cameras.main.height / 2;
        
        this.popupContainer = this.add.container(popupX, popupY);
        
        // Semi-transparent overlay (covers left half of screen)
        this.overlay = this.add.rectangle(-popupWidth, 0, popupWidth, popupHeight, 0x000000, 0.5);
        this.overlay.setInteractive();
        this.overlay.on('pointerdown', () => {
            this.hidePopup(); // Click overlay to close
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
        
        // Content area
        this.popupContent = this.add.container(0, 0);
        
        // Add all elements to popup container
        this.popupContainer.add([
            this.popupBg,
            this.popupHeader,
            this.closeBtn,
            this.closeBtnText,
            this.popupTitle,
            this.popupContent
        ]);
        
        // Initially hidden
        this.popupContainer.setVisible(false);
    }
    
    showPopup(contentType) {
        if (this.isPopupOpen) return;
        
        this.isPopupOpen = true;
        this.currentPopupType = contentType; // Track which popup is open
        
        // Show overlay
        this.overlay.setVisible(true);
        
        // Update popup content based on type
        this.updatePopupContent(contentType);
        
        // Show popup container
        this.popupContainer.setVisible(true);
        
        // Animate popup sliding in from right
        const targetX = this.cameras.main.width - (this.cameras.main.width / 4); // Right half position
        
        this.tweens.add({
            targets: this.popupContainer,
            x: targetX,
            duration: 400,
            ease: 'Power3.easeOut'
        });
        
        // Fade in overlay
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
        
        // Animate popup sliding out to right
        const offScreenX = this.cameras.main.width + (this.cameras.main.width / 4);
        
        this.tweens.add({
            targets: this.popupContainer,
            x: offScreenX,
            duration: 300,
            ease: 'Power3.easeIn',
            onComplete: () => {
                this.popupContainer.setVisible(false);
                this.isPopupOpen = false;
                if (onComplete) onComplete();
            }
        });
        
        // Fade out overlay
        this.tweens.add({
            targets: this.overlay,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.popupContainer.setVisible(false);
                this.isPopupOpen = false;
                this.currentPopupType = null; // Clear popup type
                if (onComplete) onComplete();
            }
        });
    }
    
    updatePopupContent(contentType) {
        // Clear existing content
        this.popupContent.removeAll(true);
        
        // Update title
        this.popupTitle.setText(contentType.toUpperCase());
        
        // Create content based on type
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
        const books = [
            'Web Design Basics',
            'Java Programming Essentials',
            'Python for Beginners',
            'C++ Advanced Techniques',
        ];
        
        books.forEach((book, index) => {
            const y = -150 + (index * 60);
            
            // Book item background
            const bookBg = this.add.rectangle(0, y, 400, 50, 0xECF0F1);
            bookBg.setStrokeStyle(1, 0xBDC3C7);
            
            // Book title
            const bookTitle = this.add.text(-150, y, book, {
                fontSize: '16px',
                color: '#2C3E50',
                fontFamily: 'Arial'
            }).setOrigin(0, 0.5);
            
            // Read button
            const readBtn = this.add.rectangle(150, y, 80, 30, 0x27AE60);
            readBtn.setInteractive();
            readBtn.on('pointerdown', () => {
                console.log(`Reading: ${book}`);
                // Add your read book logic here
            });
            
            const readText = this.add.text(150, y, 'READ', {
                fontSize: '12px',
                color: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            
            this.popupContent.add([bookBg, bookTitle, readBtn, readText]);
        });
    }
    
    createProgressContent() {
        // Progress bars and stats
        const stats = [
            { label: 'Books Read', value: 12, max: 20 },
            { label: 'Quests Completed', value: 8, max: 15 },
            { label: 'Notes Written', value: 25, max: 50 }
        ];
        
        stats.forEach((stat, index) => {
            const y = -100 + (index * 80);
            
            // Label
            const label = this.add.text(0, y - 20, stat.label, {
                fontSize: '16px',
                color: '#2C3E50',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            
            // Progress bar background
            const progressBg = this.add.rectangle(0, y + 10, 300, 20, 0xBDC3C7);
            
            // Progress bar fill
            const fillWidth = (stat.value / stat.max) * 300;
            const progressFill = this.add.rectangle(-150 + (fillWidth/2), y + 10, fillWidth, 20, 0x3498DB);
            
            // Progress text
            const progressText = this.add.text(0, y + 35, `${stat.value}/${stat.max}`, {
                fontSize: '12px',
                color: '#7F8C8D',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            
            this.popupContent.add([label, progressBg, progressFill, progressText]);
        });
    }
    
    createNotesContent() {
        const notes = [
            'Remember to review Web Design concepts.',
            'Java loops and conditionals are crucial for programming.',
            'Python syntax is beginner-friendly, practice daily.',
            'C++ memory management requires careful handling.',
            'Keep track of your progress in the library.'
        ];
        
        notes.forEach((note, index) => {
            const y = -150 + (index * 70);
            
            // Note background
            const noteBg = this.add.rectangle(0, y, 450, 60, 0xFFF3CD);
            noteBg.setStrokeStyle(1, 0xFFC107);
            
            // Note text
            const noteText = this.add.text(0, y, note, {
                fontSize: '14px',
                color: '#856404',
                fontFamily: 'Arial',
                wordWrap: { width: 400 }
            }).setOrigin(0.5);
            
            this.popupContent.add([noteBg, noteText]);
        });
    }
    
    handleMenuClick(menuItem) {
        console.log(`Clicked: ${menuItem}`);
        // Handle non-popup menu items
    }

}

// Export the scene
export default BaseLibraryScene;