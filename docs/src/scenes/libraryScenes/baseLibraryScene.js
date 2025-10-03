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
        
        // Load NEW dedicated library book cover images
        // Files placed in public/assets/img/library : html_book.png, css_book.png, javascript_book.png, python_book.png, java_book.png
        this.load.image('html_book', 'assets/img/library/html_book.png');
        this.load.image('css_book', 'assets/img/library/css_book.png');
        this.load.image('javascript_book', 'assets/img/library/javascript_book.png');
        this.load.image('python_book', 'assets/img/library/python_book.png');
        this.load.image('java_book', 'assets/img/library/java_book.png');
        // Backwards compatibility: keep older icons if some books still reference legacy icon keys
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

        // Font (match MainHub usage if not already loaded globally)
        if (this.load.font) {
            this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
        }
    }

    createBookIcons() {
        // Create book icons using actual image files from comlab folder
        if (!this.booksData || !this.booksData.books) {
            console.warn('No books data available for creating icons');
            return;
        }

        // Mapping from book title (normalized) or legacy icon field to new cover image keys
        const coverMap = {
            'html': 'html_book',
            'css': 'css_book',
            'javascript': 'javascript_book',
            'python': 'python_book',
            'java': 'java_book'
        };

        this.booksData.books.forEach((book, index) => {
            const iconKey = `book_${book.id}`;
            const normalizedTitle = (book.title || '').toLowerCase();
            // Prefer explicit new cover by title; fall back to legacy icon property
            let sourceIconKey = coverMap[normalizedTitle] || book.icon;
            
            
            // Check if the source icon exists in the texture manager
            if (sourceIconKey && this.textures.exists(sourceIconKey)) {
                // Create a copy of the texture with our book-specific key
                const sourceTexture = this.textures.get(sourceIconKey);
                this.textures.addImage(iconKey, sourceTexture.source[0].image);
            } else {
                console.warn(`Source icon ${sourceIconKey} not found for book ${book.title}. Using fallback generated texture.`);
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
        // Establish responsive scale similar to MainHub
        this.BASE_WIDTH = 816; this.BASE_HEIGHT = 624;
        const { width, height } = this.scale;
        this.scaleFactor = Math.min(width / this.BASE_WIDTH, height / this.BASE_HEIGHT);
        const scaleFont = (size) => Math.round(size * this.scaleFactor);

        // Background + audio
        this.setupBackground();
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
        playExclusiveBGM(this, 'bgm_library', { loop: true });
        updateSoundVolumes(this);

        // Data + icons
        this.loadBooksData();
        this.createBookIcons();

    // Removed header & side stats per redesign; just carousel + back
    this.createBooksCarousel();
    this.createBackButton();

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
        
    }

    setupBackground() {
        const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'libraryBg');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        bg.setDepth(-10);
        bg.setAlpha(0.85);
        this.bg = bg;
    }

    // Header removed in minimal redesign

    positionBackButton() { /* no-op after header removal */ }

    createSideStatsPanel() { /* removed per redesign */ }

    createBooksCarousel() {
        // Get books from books data
        const books = this.booksData.books || [];
        const iconKeys = [];
        const iconInfo = [];
        
        books.forEach((book, index) => {
            const iconKey = `book_${book.id}`;
            iconKeys.push(iconKey);
            iconInfo.push({
                heading: book.title, // Use 'heading' for carousel compatibility
                desc: `by ${book.author}`, // Use 'desc' for carousel compatibility
                title: book.title,
                description: `by ${book.author}`,
                book: book
            });
        });


        // Create carousel
        // Align vertical position with MainHub (iconCenterY ~200) and reduce size ~30%
        this.carousel = new Carousel(this, {
            iconCenterY: 200, // Same as MainHub
            iconYOffset: 0,
            iconSpacing: 220,
            iconToTitleGap: 120,
            iconToDescGap: 60,
            smallScale: 0.1 * this.scaleFactor, // reduced from ~0.2
            largeScale: 0.22 * this.scaleFactor // reduced from 0.35 (~37% smaller)
        });

        this.carousel.create(
            iconKeys,
            iconInfo,
            (selectedData) => this.onBookSelected(selectedData),
            [] // No locked books
        );

        // Removed overlay labels for cleaner look
    }

    // Removed createBookNameLabels and updateBookNameLabels (overlay labels)

    onBookSelected(selectedData) {
        
        let selectedBook = null;
        
        if (typeof selectedData === 'object' && selectedData.book) {
            // If selectedData is the iconInfo object with book property
            selectedBook = selectedData.book;
        } else if (typeof selectedData === 'number') {
            // If selectedData is an index
            const books = this.booksData.books || [];
            selectedBook = books[selectedData];
        }
        
        
        if (selectedBook) {
            this.openEbook(selectedBook);
        } else {
            console.error('No book found from selection:', selectedData);
        }
    }

    async openEbook(book) {
        if (book.link) {
            // Confirm with the player before opening a new tab
            const proceed = await this.confirmOpenBook(book);
            if (!proceed) {
                // Optional: subtle canceled feedback
                this.showTransientTip('Opening canceled');
                return;
            }
            
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

    async confirmOpenBook(book) {
        const message = `Open "${book.title}" in a new tab?`;
        // Prefer site-wide modernConfirm if available
        try {
            if (typeof window !== 'undefined' && typeof window.modernConfirm === 'function') {
                const ok = await window.modernConfirm(message, {
                    confirmText: 'Open',
                    cancelText: 'Cancel',
                    theme: 'warning'
                });
                return !!ok;
            }
        } catch (_) { /* fall through to Phaser UI */ }

        // Fallback: Phaser in-scene confirmation UI
        return this.showConfirmOverlay(message, { confirmText: 'Open', cancelText: 'Cancel' });
    }

    showConfirmOverlay(message, { confirmText = 'OK', cancelText = 'Cancel' } = {}) {
        if (this._confirmOverlayActive) return Promise.resolve(false);
        this._confirmOverlayActive = true;

        const depth = 10_000;
        const w = this.scale.width;
        const h = this.scale.height;
        const panelW = Math.min(520, Math.max(360, w * 0.7));
        const panelH = Math.min(260, Math.max(200, h * 0.28));

        const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75)
            .setOrigin(0.5)
            .setDepth(depth)
            .setInteractive();

        const panel = this.add.rectangle(w / 2, h / 2, panelW, panelH, 0x111318, 1)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xF4CE14, 0.6)
            .setDepth(depth + 1);

        const title = this.add.text(w / 2, h / 2 - panelH / 2 + 36, 'Leave Game Tab?', {
            fontFamily: 'Arial Black, Arial',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(depth + 2);

        const body = this.add.text(w / 2, title.y + 34, message, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#d1d5db',
            wordWrap: { width: panelW - 40, useAdvancedWrap: true },
            align: 'center'
        }).setOrigin(0.5).setDepth(depth + 2);

        const btnY = h / 2 + panelH / 2 - 44;

        const makeButton = (x, label, primary) => {
            const btnW = 128, btnH = 40;
            const bgRect = this.add.rectangle(x, btnY, btnW, btnH, primary ? 0xF4CE14 : 0x1F2937, 1)
                .setOrigin(0.5)
                .setStrokeStyle(1, primary ? 0xFDE68A : 0x374151, 0.9)
                .setDepth(depth + 2)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(x, btnY, label, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: primary ? '#111827' : '#e5e7eb',
                fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(depth + 3);

            bgRect.on('pointerover', () => {
                this.tweens.add({ targets: [bgRect, txt], scaleX: 1.04, scaleY: 1.04, duration: 120, ease: 'Power2' });
                if (!primary) bgRect.setFillStyle(0x374151, 1);
            });
            bgRect.on('pointerout', () => {
                this.tweens.add({ targets: [bgRect, txt], scaleX: 1, scaleY: 1, duration: 120, ease: 'Power2' });
                if (!primary) bgRect.setFillStyle(0x1F2937, 1);
            });

            return { bgRect, txt };
        };

        const spacing = 160;
        const okBtn = makeButton(w / 2 - spacing / 2, confirmText, true);
        const cancelBtn = makeButton(w / 2 + spacing / 2, cancelText, false);

        return new Promise(resolve => {
            const cleanup = () => {
                [bg, panel, title, body, okBtn.bgRect, okBtn.txt, cancelBtn.bgRect, cancelBtn.txt].forEach(el => el && el.destroy());
                this._confirmOverlayActive = false;
            };

            okBtn.bgRect.on('pointerdown', () => {
                if (this.se_confirmSound) this.se_confirmSound.play();
                cleanup();
                resolve(true);
            });
            cancelBtn.bgRect.on('pointerdown', () => {
                cleanup();
                resolve(false);
            });

            // Keyboard shortcuts
            const esc = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
            const enter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
            const onEsc = () => { cleanup(); resolve(false); };
            const onEnter = () => { cleanup(); resolve(true); };
            esc?.once('down', onEsc);
            enter?.once('down', onEnter);

            // Close by clicking the dark background (acts like cancel)
            bg.once('pointerdown', onEsc);
        });
    }

    showTransientTip(text) {
        try {
            const tip = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 80, text, {
                fontFamily: 'Arial', fontSize: '14px', color: '#cccccc', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 12, y: 6 }
            }).setOrigin(0.5).setDepth(10_001);
            this.tweens.add({ targets: tip, alpha: 0, y: tip.y + 20, duration: 900, ease: 'Power2', onComplete: () => tip.destroy() });
        } catch { /* no-op */ }
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
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('library_tutorial');
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