// LibraryUI.js
// Contains UI-related methods for BaseLibraryScene

export default class LibraryUI {
    static createMainMenu(scene) {
        // Get responsive dimensions
        const sf = scene.scaleFactor || 1;
        const screenWidth = scene.scale.width;
        const screenHeight = scene.scale.height;
        const centerY = screenHeight / 2;
        
        // Position menu to the left side
        const menuX = Math.min(200 * sf, screenWidth * 0.25);
        scene.mainMenuContainer = scene.add.container(menuX, centerY);
        
        // Main menu panel with game's design style - improved sizing
        const panelWidth = Math.min(320 * sf, screenWidth * 0.8);
        const itemCount = scene.libraryData.main.menuItems.length;
        
        // Calculate required space for all elements
        const titleSpace = 80 * sf; // Space for title
        const buttonHeight = Math.min(48 * sf, 40); // Reduced button height
        const buttonSpacing = Math.min(55 * sf, 50); // Reduced spacing
        const topBottomPadding = 30 * sf; // Reduced padding
        
        // Calculate minimum height needed
        const requiredHeight = titleSpace + (itemCount * buttonHeight) + ((itemCount - 1) * (buttonSpacing - buttonHeight)) + topBottomPadding;
        const panelHeight = Math.max(requiredHeight, Math.min(requiredHeight * 1.05, screenHeight * 0.85)); // Allow more screen height
        
        // Create background consistent with main menu theme
        const menuBg = scene.add.graphics();
        
        // Outer glow effect with light yellow
        menuBg.fillStyle(0xffffcc, 0.2);
        menuBg.fillRoundedRect(
            -panelWidth/2 - 8 * sf,
            -panelHeight/2 - 8 * sf,
            panelWidth + 16 * sf,
            panelHeight + 16 * sf,
            20 * sf
        );
        
        // Main panel with dark blue background (consistent with main menu)
        menuBg.fillStyle(0x222244, 0.92);
        menuBg.fillRoundedRect(
            -panelWidth/2,
            -panelHeight/2,
            panelWidth,
            panelHeight,
            16 * sf
        );
        
        // Light yellow border (consistent with main menu)
        menuBg.lineStyle(3 * sf, 0xffffcc, 1);
        menuBg.strokeRoundedRect(
            -panelWidth/2,
            -panelHeight/2,
            panelWidth,
            panelHeight,
            16 * sf
        );
        
        menuBg.setDepth(10); // Higher depth to appear above background
        scene.mainMenuContainer.add(menuBg);
        
        // Title with bright yellow text (consistent with main menu)
        const title = scene.add.text(0, -panelHeight/2 + (titleSpace / 2), scene.libraryData.main.title, {
            fontSize: `${Math.min(32 * sf, 28)}px`,
            color: '#ffff00', // Bright yellow like main menu
            fontFamily: 'Caprasimo-Regular',
            stroke: '#000000', // Black stroke for better readability
            strokeThickness: 4 * sf
        }).setOrigin(0.5);
        title.setDepth(15); // High depth for title
        scene.mainMenuContainer.add(title);
        
        // Menu items with improved spacing calculation
        const startY = -panelHeight/2 + titleSpace;
        const availableHeight = panelHeight - titleSpace - topBottomPadding;
        const totalButtonHeight = itemCount * buttonHeight;
        const totalSpacingNeeded = availableHeight - totalButtonHeight;
        const spaceBetweenButtons = totalSpacingNeeded / (itemCount + 1); // +1 for spacing before first and after last
        
        scene.libraryData.main.menuItems.forEach((item, index) => {
            const y = startY + spaceBetweenButtons + (index * (buttonHeight + spaceBetweenButtons)) + (buttonHeight / 2);
            const buttonWidth = panelWidth * 0.8;
            
            // Button background consistent with main menu theme
            const btnBg = scene.add.graphics();
            
            btnBg.fillStyle(0x222244, 0.92);
            btnBg.fillRoundedRect(
                -buttonWidth/2,
                y - buttonHeight/2,
                buttonWidth,
                buttonHeight,
                8 * sf
            );
            
            btnBg.lineStyle(2 * sf, 0xffffcc, 1);
            btnBg.strokeRoundedRect(
                -buttonWidth/2,
                y - buttonHeight/2,
                buttonWidth,
                buttonHeight,
                8 * sf
            );
            
            btnBg.setDepth(12); // Higher depth for buttons
            btnBg.setInteractive(new Phaser.Geom.Rectangle(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
            
            // Icon and text with bright yellow styling (consistent with main menu)
            const icon = item.icon ? item.icon : ['📚','📊','📝','⚙️'][index] || '';
            const btnText = scene.add.text(0, y, `${icon}  ${item.name}`, {
                fontSize: `${Math.min(18 * sf, 16)}px`,
                color: '#ffff00', // Bright yellow like main menu
                fontFamily: 'Caprasimo-Regular',
                stroke: '#000000', // Black stroke for readability
                strokeThickness: 3 * sf
            }).setOrigin(0.5);
            btnText.setDepth(15); // High depth for text
            
            // Interactive effects consistent with main menu hover style
            btnBg.on('pointerover', () => {
                btnBg.clear();
                btnBg.fillStyle(0x333388, 1); // Lighter blue on hover like main menu
                btnBg.fillRoundedRect(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, 8 * sf);
                btnBg.lineStyle(2 * sf, 0xffffcc, 1);
                btnBg.strokeRoundedRect(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, 8 * sf);
                btnText.setStyle({ color: '#ffffff' }); // White text on hover
                btnText.setScale(1.05);
            });
            
            btnBg.on('pointerout', () => {
                btnBg.clear();
                btnBg.fillStyle(0x222244, 0.92); // Back to dark blue
                btnBg.fillRoundedRect(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, 8 * sf);
                btnBg.lineStyle(2 * sf, 0xffffcc, 1);
                btnBg.strokeRoundedRect(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, 8 * sf);
                btnText.setStyle({ color: '#ffff00' }); // Back to yellow
                btnText.setScale(1);
            });
            
            btnBg.on('pointerdown', () => {
                if (item.hasPopup) {
                    if (scene.isPopupOpen) {
                        if (scene.currentPopupType === item.name) return;
                        scene.hidePopup(() => { scene.showPopup(item.name); });
                    } else {
                        scene.showPopup(item.name);
                    }
                } else {
                    scene.handleMenuClick(item.name);
                }
            });
            
            scene.mainMenuContainer.add([btnBg, btnText]);
        });
    }

    static createPopupContainer(scene) {
        const sf = scene.scaleFactor || 1;
        const screenWidth = scene.scale.width;
        const screenHeight = scene.scale.height;
        
        // Make popup much wider and auto-fit content height
        const isSmallScreen = screenWidth < 768;
        const popupWidth = isSmallScreen ? screenWidth * 0.8 : Math.min(screenWidth * 0.75, 900 * sf);
        const popupHeight = screenHeight * 0.9; // Allow some margin but use most of screen
        const popupX = screenWidth * 0.58; // Better centered
        const popupY = screenHeight / 2;
        
        scene.popupContainer = scene.add.container(popupX, popupY);
        
        // No overlay - popup appears directly without background
        
        // Popup background consistent with main menu theme
        scene.popupBg = scene.add.graphics();
        
        // Main background with dark blue (consistent with main menu)
        scene.popupBg.fillStyle(0x222244, 0.92);
        scene.popupBg.fillRoundedRect(
            -popupWidth/2,
            -popupHeight/2,
            popupWidth,
            popupHeight,
            16 * sf
        );
        
        // Light yellow border (consistent with main menu)
        scene.popupBg.lineStyle(4 * sf, 0xffffcc, 1);
        scene.popupBg.strokeRoundedRect(
            -popupWidth/2,
            -popupHeight/2,
            popupWidth,
            popupHeight,
            16 * sf
        );
        
        scene.popupBg.setDepth(1);
        
        // Header section - more compact
        const headerHeight = Math.min(50 * sf, 45);
        const headerY = -popupHeight/2 + headerHeight/2;
        
        // Header background consistent with main menu theme
        const headerBg = scene.add.graphics();
        headerBg.fillStyle(0x333388, 1); // Slightly lighter blue for header
        headerBg.fillRoundedRect(
            -popupWidth/2 + 10 * sf,
            -popupHeight/2 + 10 * sf,
            popupWidth - 20 * sf,
            headerHeight - 10 * sf,
            12 * sf
        );
        headerBg.setDepth(2);
        
        // Book icon
        const bookIcon = scene.add.text(-popupWidth/3, headerY, '📚', {
            fontSize: `${Math.min(32 * sf, 28)}px`,
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(3);
        
        // Title with bright yellow styling (consistent with main menu)
        scene.popupTitle = scene.add.text(0, headerY, 'LIBRARY', {
            fontSize: `${Math.min(28 * sf, 24)}px`,
            fontFamily: 'Caprasimo-Regular',
            color: '#ffff00', // Bright yellow like main menu
            stroke: '#000000', // Black stroke for readability
            strokeThickness: 3 * sf
        }).setOrigin(0.5).setDepth(3);
        
        // Close button with game's style
        const closeBtnSize = Math.min(32 * sf, 28);
        scene.closeBtn = scene.add.graphics();
        scene.closeBtn.fillStyle(0xff4757, 0.8);
        scene.closeBtn.fillCircle(popupWidth/2 - 30 * sf, headerY, closeBtnSize/2);
        scene.closeBtn.lineStyle(2 * sf, 0xffffff, 0.8);
        scene.closeBtn.strokeCircle(popupWidth/2 - 30 * sf, headerY, closeBtnSize/2);
        scene.closeBtn.setDepth(3);
        scene.closeBtn.setInteractive(new Phaser.Geom.Circle(popupWidth/2 - 30 * sf, headerY, closeBtnSize/2), Phaser.Geom.Circle.Contains);
        
        scene.closeBtnText = scene.add.text(popupWidth/2 - 30 * sf, headerY, '✕', {
            fontSize: `${Math.min(18 * sf, 16)}px`,
            color: '#ffffff',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5).setDepth(4);
        
        scene.closeBtn.on('pointerover', () => {
            scene.closeBtn.clear();
            scene.closeBtn.fillStyle(0xff6b7d, 1);
            scene.closeBtn.fillCircle(popupWidth/2 - 30 * sf, headerY, closeBtnSize/2);
            scene.closeBtn.lineStyle(2 * sf, 0xffffff, 1);
            scene.closeBtn.strokeCircle(popupWidth/2 - 30 * sf, headerY, closeBtnSize/2);
        });
        
        scene.closeBtn.on('pointerout', () => {
            scene.closeBtn.clear();
            scene.closeBtn.fillStyle(0xff4757, 0.8);
            scene.closeBtn.fillCircle(popupWidth/2 - 30 * sf, headerY, closeBtnSize/2);
            scene.closeBtn.lineStyle(2 * sf, 0xffffff, 0.8);
            scene.closeBtn.strokeCircle(popupWidth/2 - 30 * sf, headerY, closeBtnSize/2);
        });
        
        scene.closeBtn.on('pointerdown', () => { scene.hidePopup(); });
        
        // Content container - positioned below header with proper masking
        const contentStartY = -popupHeight/2 + headerHeight + 20;
        scene.popupContent = scene.add.container(0, contentStartY);
        
        // Create mask for content area to prevent overflow
        scene.popupMask = scene.add.graphics();
        const maskX = popupX - popupWidth/2 + 10;
        const maskY = popupY - popupHeight/2 + headerHeight + 10;
        const maskWidth = popupWidth - 20;
        const maskHeight = popupHeight - headerHeight - 30;
        
        scene.popupMask.fillStyle(0xffffff);
        scene.popupMask.fillRect(maskX, maskY, maskWidth, maskHeight);
        scene.popupContent.setMask(scene.popupMask.createGeometryMask());
        
        // Store scroll properties
        scene.popupScrollY = 0;
        scene.popupContentStartY = contentStartY;
        scene.popupMaskBounds = { 
            x: maskX, 
            y: maskY, 
            width: maskWidth, 
            height: maskHeight 
        };
        
        // Add mouse wheel scrolling
        scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (scene.isPopupOpen) {
                scene.scrollPopupContent(deltaY);
            }
        });
        
        // Store dimensions for later use
        scene.popupDimensions = { width: popupWidth, height: popupHeight, headerHeight };
        
        scene.popupContainer.add([
            scene.popupBg,
            headerBg,
            bookIcon,
            scene.closeBtn,
            scene.closeBtnText,
            scene.popupTitle,
            scene.popupContent
        ]);
        
        scene.popupContainer.setVisible(false);
    }

    static createPopupMask(scene) {
        // Update the existing mask if it exists
        if (scene.popupMask) {
            scene.popupMask.destroy();
        }
        
        const { width: popupWidth, height: popupHeight, headerHeight } = scene.popupDimensions;
        
        // Create mask graphics in world coordinates
        scene.popupMask = scene.add.graphics();
        
        // Get the current popup position
        const popupX = scene.popupContainer.x;
        const popupY = scene.popupContainer.y;
        
        // Calculate mask area in world coordinates
        const maskX = popupX - popupWidth/2 + 10;
        const maskY = popupY - popupHeight/2 + headerHeight + 10;
        const maskWidth = popupWidth - 20;
        const maskHeight = popupHeight - headerHeight - 30;
        
        scene.popupMask.fillStyle(0xffffff);
        scene.popupMask.fillRect(maskX, maskY, maskWidth, maskHeight);
        
        // Apply mask to content container
        scene.popupContent.setMask(scene.popupMask.createGeometryMask());
        
        // Update mask bounds for scroll calculations
        scene.popupMaskBounds = {
            x: maskX,
            y: maskY,
            width: maskWidth,
            height: maskHeight
        };
    }

    static createBooksContent(scene) {
        const sf = scene.scaleFactor || 1;
        const { width: popupWidth, height: popupHeight, headerHeight } = scene.popupDimensions;
        const isSmallScreen = scene.scale.width < 768;
        
        // Clear any existing content
        scene.popupContent.removeAll(true);
        
        scene._libraryBookElements = [];
        scene._libraryCategoryHeaders = [];
        
        console.log('Books data structure:', scene.libraryData.books);
        console.log('Categories found:', scene.libraryData.books.categories.length);
        
        // Calculate improved grid layout with better spacing
        const booksPerRow = isSmallScreen ? 2 : 3;
        const cardPadding = 15 * sf; // Reduced padding to fit better
        const cardWidth = (popupWidth - (cardPadding * (booksPerRow + 1))) / booksPerRow;
        const cardHeight = isSmallScreen ? 120 * sf : 110 * sf; // Reduced height to fit more
        const startX = -(popupWidth/2) + cardPadding + (cardWidth/2);
        const startY = 15 * sf; // Reduced start margin
        
        let globalY = startY; // Track global Y position across all categories
        
        scene.libraryData.books.categories.forEach((category, categoryIndex) => {
            console.log(`Category ${categoryIndex}: ${category.name}, Books: ${category.books.length}`);
            
            // Category header positioned ABOVE the books
            const categoryHeaderBg = scene.add.graphics();
            const headerWidth = popupWidth * 0.95;
            const headerHeight = 35 * sf; // Reduced header height
            
            // Draw category header background
            categoryHeaderBg.fillStyle(0x333388, 0.9);
            categoryHeaderBg.fillRoundedRect(
                -headerWidth/2,
                globalY - headerHeight/2,
                headerWidth,
                headerHeight,
                10 * sf
            );
            
            categoryHeaderBg.lineStyle(3 * sf, 0xffffcc, 0.9);
            categoryHeaderBg.strokeRoundedRect(
                -headerWidth/2,
                globalY - headerHeight/2,
                headerWidth,
                headerHeight,
                10 * sf
            );
            
            // Category header text
            const categoryHeader = scene.add.text(0, globalY, category.name, {
                fontSize: `${Math.min(22 * sf, 18)}px`, // Slightly smaller font
                color: '#ffff00',
                fontFamily: 'Caprasimo-Regular',
                stroke: '#000000',
                strokeThickness: 2 * sf
            }).setOrigin(0.5);
            
            scene.popupContent.add([categoryHeaderBg, categoryHeader]);
            scene._libraryCategoryHeaders.push(categoryHeader);
            
            // Move down for books section
            globalY += 50 * sf; // Reduced spacing
            
            // Calculate how many rows we need for this category
            const rowsNeeded = Math.ceil(category.books.length / booksPerRow);
            
            // Display books in organized grid
            category.books.forEach((book, bookIndex) => {
                console.log(`Processing book ${bookIndex + 1}: ${book.title} by ${book.author}`);
                
                const currentRow = Math.floor(bookIndex / booksPerRow);
                const currentCol = bookIndex % booksPerRow;
                
                const x = startX + (currentCol * (cardWidth + cardPadding));
                const y = globalY + (currentRow * (cardHeight + cardPadding));
                
                // Book card background with better styling
                const bookBg = scene.add.graphics();
                bookBg.fillStyle(0x1a1a33, 0.95); // Darker background for better contrast
                bookBg.fillRoundedRect(
                    x - cardWidth/2,
                    y - cardHeight/2,
                    cardWidth,
                    cardHeight,
                    15 * sf
                );
                
                bookBg.lineStyle(3 * sf, 0xffffcc, 0.7);
                bookBg.strokeRoundedRect(
                    x - cardWidth/2,
                    y - cardHeight/2,
                    cardWidth,
                    cardHeight,
                    15 * sf
                );
                
                // Make the entire card interactive
                bookBg.setInteractive(new Phaser.Geom.Rectangle(
                    x - cardWidth/2,
                    y - cardHeight/2,
                    cardWidth,
                    cardHeight
                ), Phaser.Geom.Rectangle.Contains);
                
                // Book title with better positioning and sizing
                const bookTitle = scene.add.text(x, y - 25 * sf, book.title, {
                    fontSize: `${Math.min(13 * sf, 11)}px`, // Smaller font
                    color: '#ffffff',
                    fontFamily: 'Caprasimo-Regular',
                    stroke: '#000000',
                    strokeThickness: 1 * sf,
                    wordWrap: { width: cardWidth * 0.9 },
                    align: 'center'
                }).setOrigin(0.5).setDepth(5);
                
                // Book author
                const bookAuthor = scene.add.text(x, y - 5 * sf, `by ${book.author}`, {
                    fontSize: `${Math.min(10 * sf, 9)}px`, // Smaller font
                    color: '#ffffcc',
                    fontFamily: 'Arial',
                    wordWrap: { width: cardWidth * 0.9 },
                    align: 'center'
                }).setOrigin(0.5).setDepth(5);
                
                // Book info (pages and difficulty)
                const bookInfo = scene.add.text(x, y + 12 * sf, `${book.pages} pages • ${book.difficulty}`, {
                    fontSize: `${Math.min(9 * sf, 8)}px`,
                    color: '#cccccc',
                    fontFamily: 'Arial',
                    align: 'center'
                }).setOrigin(0.5).setDepth(5);
                
                // Status badge with improved positioning
                const statusColor = scene.getBookStatusColor(book.status);
                const statusText = book.status.toUpperCase();
                
                const statusBadge = scene.add.graphics();
                const badgeWidth = Math.min(70 * sf, 60);
                const badgeHeight = Math.min(18 * sf, 16);
                
                statusBadge.fillStyle(statusColor, 0.9);
                statusBadge.fillRoundedRect(
                    x - badgeWidth/2,
                    y + 30 * sf, // Adjusted position
                    badgeWidth,
                    badgeHeight,
                    8 * sf
                );
                
                const statusTextObj = scene.add.text(x, y + 30 * sf + badgeHeight/2, statusText, {
                    fontSize: `${Math.min(9 * sf, 8)}px`,
                    color: '#ffffff',
                    fontFamily: 'Arial Black'
                }).setOrigin(0.5, 0.5).setDepth(5);
                
                // Enhanced hover effects
                bookBg.on('pointerover', () => {
                    bookBg.clear();
                    bookBg.fillStyle(0x2a2a55, 1); // Lighter on hover
                    bookBg.fillRoundedRect(
                        x - cardWidth/2,
                        y - cardHeight/2,
                        cardWidth,
                        cardHeight,
                        15 * sf
                    );
                    bookBg.lineStyle(4 * sf, 0xffffff, 1);
                    bookBg.strokeRoundedRect(
                        x - cardWidth/2,
                        y - cardHeight/2,
                        cardWidth,
                        cardHeight,
                        15 * sf
                    );
                    bookTitle.setScale(1.05);
                    bookAuthor.setScale(1.05);
                });
                
                bookBg.on('pointerout', () => {
                    bookBg.clear();
                    bookBg.fillStyle(0x1a1a33, 0.95);
                    bookBg.fillRoundedRect(
                        x - cardWidth/2,
                        y - cardHeight/2,
                        cardWidth,
                        cardHeight,
                        15 * sf
                    );
                    bookBg.lineStyle(3 * sf, 0xffffcc, 0.7);
                    bookBg.strokeRoundedRect(
                        x - cardWidth/2,
                        y - cardHeight/2,
                        cardWidth,
                        cardHeight,
                        15 * sf
                    );
                    bookTitle.setScale(1);
                    bookAuthor.setScale(1);
                });
                
                bookBg.on('pointerdown', () => { scene.handleBookAction(book); });
                
                const bookElements = [
                    bookBg, bookTitle, bookAuthor, bookInfo,
                    statusBadge, statusTextObj
                ];
                
                scene.popupContent.add(bookElements);
                scene._libraryBookElements.push(bookElements);
            });
            
            // Move global Y position down for next category
            // Add space for all rows of this category plus extra spacing between categories
            globalY += (rowsNeeded * (cardHeight + cardPadding)) + 30 * sf; // Reduced spacing
        });
    }

    static createProgressContent(scene) {
        const sf = scene.scaleFactor || 1;
        const { width: popupWidth, height: popupHeight, headerHeight } = scene.popupDimensions;
        
        // Since content container now starts below header, start from 0 with some margin
        const startY = 20 * sf;
        let yOffset = startY;
        
        // Progress stats
        scene.libraryData.progress.stats.forEach((stat, index) => {
            // Progress bar background
            const barWidth = popupWidth * 0.7;
            const barHeight = 20 * sf;
            
            // Label with bright yellow styling (consistent with main menu)
            const label = scene.add.text(-popupWidth/2 + 40 * sf, yOffset, stat.label, {
                fontSize: `${Math.min(18 * sf, 16)}px`,
                color: '#ffff00', // Bright yellow like main menu
                fontFamily: 'Caprasimo-Regular',
                stroke: '#000000',
                strokeThickness: 2 * sf
            }).setOrigin(0, 0.5).setDepth(5);
            
            // Progress value text with light yellow
            const valueText = scene.add.text(popupWidth/2 - 40 * sf, yOffset, `${stat.value}/${stat.max}`, {
                fontSize: `${Math.min(16 * sf, 14)}px`,
                color: '#ffffcc', // Light yellow for secondary text
                fontFamily: 'Arial'
            }).setOrigin(1, 0.5).setDepth(5);
            
            yOffset += 30 * sf;
            
            // Progress bar background consistent with main menu theme
            const progressBg = scene.add.graphics();
            progressBg.fillStyle(0x222244, 0.8);
            progressBg.fillRoundedRect(-barWidth/2, yOffset - barHeight/2, barWidth, barHeight, 10 * sf);
            
            // Progress bar fill
            const fillWidth = (stat.value / stat.max) * barWidth;
            const progressFill = scene.add.graphics();
            progressFill.fillStyle(parseInt(stat.color.replace('#', '0x')), 1);
            progressFill.fillRoundedRect(-barWidth/2, yOffset - barHeight/2, fillWidth, barHeight, 10 * sf);
            
            scene.popupContent.add([label, valueText, progressBg, progressFill]);
            
            yOffset += 50 * sf;
        });
        
        // Achievements section
        if (scene.libraryData.progress.achievements && scene.libraryData.progress.achievements.length > 0) {
            yOffset += 20 * sf;
            
            const achievementsHeader = scene.add.text(0, yOffset, 'ACHIEVEMENTS', {
                fontSize: `${Math.min(20 * sf, 18)}px`,
                color: '#ffff00', // Bright yellow like main menu
                fontFamily: 'Caprasimo-Regular',
                stroke: '#000000',
                strokeThickness: 2 * sf
            }).setOrigin(0.5, 0.5).setDepth(5);
            
            scene.popupContent.add(achievementsHeader);
            yOffset += 40 * sf;
            
            scene.libraryData.progress.achievements.forEach((achievement, index) => {
                const achBg = scene.add.graphics();
                achBg.fillStyle(0x222244, 0.6);
                achBg.fillRoundedRect(-popupWidth/2 + 20 * sf, yOffset - 20 * sf, popupWidth - 40 * sf, 40 * sf, 8 * sf);
                
                const achText = scene.add.text(0, yOffset, achievement.name || achievement, {
                    fontSize: `${Math.min(16 * sf, 14)}px`,
                    color: '#ffffcc', // Light yellow for achievement text
                    fontFamily: 'Arial'
                }).setOrigin(0.5, 0.5).setDepth(5);
                
                scene.popupContent.add([achBg, achText]);
                yOffset += 50 * sf;
            });
        }
    }

    static createNotesContent(scene) {
        const sf = scene.scaleFactor || 1;
        const { width: popupWidth, height: popupHeight, headerHeight } = scene.popupDimensions;
        
        // Since content container now starts below header, start from 0 with some margin
        const startY = 20 * sf;
        let yOffset = startY;
        
        // Add Note button
        const addBtn = scene.add.graphics();
        const btnWidth = popupWidth * 0.6;
        const btnHeight = 40 * sf;
        
        // Add Note button with main menu styling
        addBtn.fillStyle(0x333388, 0.8); // Using main menu hover color
        addBtn.fillRoundedRect(-btnWidth/2, yOffset - btnHeight/2, btnWidth, btnHeight, 8 * sf);
        addBtn.setInteractive(new Phaser.Geom.Rectangle(-btnWidth/2, yOffset - btnHeight/2, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
        
        const addText = scene.add.text(0, yOffset, '+ Add New Note', {
            fontSize: `${Math.min(18 * sf, 16)}px`,
            color: '#ffff00', // Bright yellow like main menu
            fontFamily: 'Caprasimo-Regular',
            stroke: '#000000',
            strokeThickness: 2 * sf
        }).setOrigin(0.5, 0.5).setDepth(5);
        
        addBtn.on('pointerdown', () => { scene.showAddNoteDialog(); });
        
        scene.popupContent.add([addBtn, addText]);
        yOffset += 60 * sf;
        
        // Notes categories
        scene.libraryData.notes.categories.forEach((category, categoryIndex) => {
            // Category header with main menu styling
            const categoryHeader = scene.add.text(0, yOffset, category.name, {
                fontSize: `${Math.min(20 * sf, 18)}px`,
                color: '#ffff00', // Bright yellow like main menu
                fontFamily: 'Caprasimo-Regular',
                stroke: '#000000',
                strokeThickness: 2 * sf
            }).setOrigin(0.5, 0.5).setDepth(5);
            
            scene.popupContent.add(categoryHeader);
            yOffset += 40 * sf;
            
            // Notes
            if (category.notes.length === 0) {
                const emptyText = scene.add.text(0, yOffset, 'No notes yet', {
                    fontSize: `${Math.min(16 * sf, 14)}px`,
                    color: '#ffffcc', // Light yellow for secondary text
                    fontFamily: 'Arial',
                    fontStyle: 'italic'
                }).setOrigin(0.5, 0.5).setDepth(5);
                
                scene.popupContent.add(emptyText);
                yOffset += 40 * sf;
            } else {
                category.notes.forEach((note, noteIndex) => {
                    const noteContent = note.content || note;
                    const noteDate = note.date || 'No date';
                    
                    // Note background with main menu styling
                    const noteBg = scene.add.graphics();
                    const noteHeight = 60 * sf;
                    
                    noteBg.fillStyle(0x222244, 0.6);
                    noteBg.fillRoundedRect(-popupWidth/2 + 20 * sf, yOffset - noteHeight/2, popupWidth - 40 * sf, noteHeight, 8 * sf);
                    noteBg.setInteractive(new Phaser.Geom.Rectangle(-popupWidth/2 + 20 * sf, yOffset - noteHeight/2, popupWidth - 40 * sf, noteHeight), Phaser.Geom.Rectangle.Contains);
                    
                    // Note text with bright text color
                    const noteText = scene.add.text(-popupWidth/2 + 40 * sf, yOffset - 10 * sf, noteContent, {
                        fontSize: `${Math.min(14 * sf, 12)}px`,
                        color: '#ffffff', // Keep white for readability
                        fontFamily: 'Arial',
                        wordWrap: { width: popupWidth - 100 * sf }
                    }).setOrigin(0, 0.5).setDepth(5);
                    
                    // Note date with light yellow color
                    const dateText = scene.add.text(-popupWidth/2 + 40 * sf, yOffset + 15 * sf, noteDate, {
                        fontSize: `${Math.min(12 * sf, 10)}px`,
                        color: '#ffffcc', // Light yellow for secondary text
                        fontFamily: 'Arial'
                    }).setOrigin(0, 0.5).setDepth(5);
                    
                    // Note options (edit/delete)
                    noteBg.on('pointerdown', () => {
                        scene.showEditNoteDialog(note, category.name);
                    });
                    
                    scene.popupContent.add([noteBg, noteText, dateText]);
                    yOffset += 70 * sf;
                });
            }
            
            yOffset += 20 * sf;
        });
    }
}
