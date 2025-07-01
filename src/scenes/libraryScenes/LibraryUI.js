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
        
        // Main menu panel with game's design style
        const panelWidth = Math.min(320 * sf, screenWidth * 0.8);
        const itemCount = scene.libraryData.main.menuItems.length;
        const minHeight = 200 + (itemCount * 10);
        const panelHeight = Math.min(minHeight * sf, screenHeight * 0.7);
        
        // Create background with gradient like feedbackUI
        const menuBg = scene.add.graphics();
        
        // Outer glow effect
        menuBg.fillStyle(0x63b3ed, 0.3);
        menuBg.fillRoundedRect(
            -panelWidth/2 - 8 * sf,
            -panelHeight/2 - 8 * sf,
            panelWidth + 16 * sf,
            panelHeight + 16 * sf,
            20 * sf
        );
        
        // Main panel with gradient
        menuBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
        menuBg.fillRoundedRect(
            -panelWidth/2,
            -panelHeight/2,
            panelWidth,
            panelHeight,
            16 * sf
        );
        
        // Border
        menuBg.lineStyle(3 * sf, 0x63b3ed, 0.8);
        menuBg.strokeRoundedRect(
            -panelWidth/2,
            -panelHeight/2,
            panelWidth,
            panelHeight,
            16 * sf
        );
        
        menuBg.setDepth(2);
        scene.mainMenuContainer.add(menuBg);
        
        // Title with game's style
        const title = scene.add.text(0, -panelHeight/2 + 50 * sf, scene.libraryData.main.title, {
            fontSize: `${Math.min(32 * sf, 28)}px`,
            color: '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
        }).setOrigin(0.5);
        scene.mainMenuContainer.add(title);
        
        // Menu items with reduced spacing
        const startY = -panelHeight/2 + 100 * sf;
        const buttonSpacing = Math.min(60 * sf, Math.max(50 * sf, (panelHeight - 160 * sf) / scene.libraryData.main.menuItems.length));
        
        scene.libraryData.main.menuItems.forEach((item, index) => {
            const y = startY + (index * buttonSpacing);
            const buttonWidth = panelWidth * 0.8;
            const buttonHeight = Math.min(54 * sf, 45);
            
            // Button background with game's style
            const btnBg = scene.add.graphics();
            
            btnBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 1);
            btnBg.fillRoundedRect(
                -buttonWidth/2,
                y - buttonHeight/2,
                buttonWidth,
                buttonHeight,
                8 * sf
            );
            
            btnBg.lineStyle(2 * sf, 0x63b3ed, 0.8);
            btnBg.strokeRoundedRect(
                -buttonWidth/2,
                y - buttonHeight/2,
                buttonWidth,
                buttonHeight,
                8 * sf
            );
            
            btnBg.setDepth(3);
            btnBg.setInteractive(new Phaser.Geom.Rectangle(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
            
            // Icon and text
            const icon = item.icon ? item.icon : ['📚','📊','📝','⚙️'][index] || '';
            const btnText = scene.add.text(0, y, `${icon}  ${item.name}`, {
                fontSize: `${Math.min(18 * sf, 16)}px`,
                color: '#ffd700',
                fontFamily: 'Caprasimo-Regular',
                stroke: '#1a1a2e',
                strokeThickness: 1 * sf
            }).setOrigin(0.5);
            
            // Interactive effects
            btnBg.on('pointerover', () => {
                btnBg.clear();
                btnBg.fillGradientStyle(0x63b3ed, 0x63b3ed, 0x3498db, 0x3498db, 0.8);
                btnBg.fillRoundedRect(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, 8 * sf);
                btnBg.lineStyle(2 * sf, 0xffd700, 1);
                btnBg.strokeRoundedRect(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, 8 * sf);
                btnText.setColor('#ffffff');
                btnText.setScale(1.05);
            });
            
            btnBg.on('pointerout', () => {
                btnBg.clear();
                btnBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 1);
                btnBg.fillRoundedRect(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, 8 * sf);
                btnBg.lineStyle(2 * sf, 0x63b3ed, 0.8);
                btnBg.strokeRoundedRect(-buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, 8 * sf);
                btnText.setColor('#ffd700');
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
        
        // Position popup more to the left and expand to full browser height
        const isSmallScreen = screenWidth < 768;
        const popupWidth = isSmallScreen ? screenWidth * 0.5 : Math.min(screenWidth * 0.45, 500 * sf);
        const popupHeight = screenHeight; // Full browser height
        const popupX = screenWidth * 0.55; // Moved more to the left (was 0.65)
        const popupY = screenHeight / 2;
        
        scene.popupContainer = scene.add.container(popupX, popupY);
        
        // No overlay - popup appears directly without background
        
        // Popup background with game's design
        scene.popupBg = scene.add.graphics();
        
        // Main background only (removed outer glow)
        scene.popupBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
        scene.popupBg.fillRoundedRect(
            -popupWidth/2,
            -popupHeight/2,
            popupWidth,
            popupHeight,
            16 * sf
        );
        
        // Border
        scene.popupBg.lineStyle(4 * sf, 0x63b3ed, 0.8);
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
        
        // Header background
        const headerBg = scene.add.graphics();
        headerBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 1);
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
        
        // Title
        scene.popupTitle = scene.add.text(0, headerY, 'LIBRARY', {
            fontSize: `${Math.min(28 * sf, 24)}px`,
            fontFamily: 'Caprasimo-Regular',
            color: '#ffd700',
            stroke: '#1a1a2e',
            strokeThickness: 2 * sf
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
        
        // Content container for scrolling - positioned below header
        // Calculate position relative to popup container coordinates
        const contentStartY = -popupHeight/2 + headerHeight + 20; // Start below header with some margin
        scene.popupContent = scene.add.container(0, contentStartY);
        scene.popupScrollY = 0;
        scene.popupContentStartY = contentStartY; // Store initial Y position
        
        // Store mask bounds for scroll calculations (but don't create actual mask yet)
        scene.popupMaskBounds = { 
            x: -popupWidth/2 + 10, 
            y: -popupHeight/2 + headerHeight, 
            width: popupWidth - 20, 
            height: popupHeight - headerHeight - 20 
        };
        
        // Store dimensions for later use
        scene.popupDimensions = { width: popupWidth, height: popupHeight, headerHeight };
        
        // Mouse wheel scrolling
        scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (scene.isPopupOpen) {
                scene.scrollPopupContent(deltaY);
            }
        });
        
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
        // Only create mask if it doesn't exist
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
        const maskY = popupY - popupHeight/2 + headerHeight;
        const maskWidth = popupWidth - 20;
        const maskHeight = popupHeight - headerHeight - 20;
        
        scene.popupMask.fillStyle(0xffffff);
        scene.popupMask.fillRect(maskX, maskY, maskWidth, maskHeight);
        
        // Apply mask to content container
        scene.popupContent.setMask(scene.popupMask.createGeometryMask());
        
        // Update mask bounds for scroll calculations
        scene.popupMaskBounds.height = maskHeight;
    }

    static createBooksContent(scene) {
        const sf = scene.scaleFactor || 1;
        const { width: popupWidth, height: popupHeight, headerHeight } = scene.popupDimensions;
        const isSmallScreen = scene.scale.width < 768;
        
        // Since content container now starts below header, start from 0 with some margin
        const startY = 20 * sf; // Small margin from top of content area
        let yOffset = startY;
        
        scene._libraryBookElements = [];
        scene._libraryCategoryHeaders = [];
        
        scene.libraryData.books.categories.forEach((category, categoryIndex) => {
            // Category header with much better spacing to prevent overlap
            const headerY = yOffset;
            const categoryHeaderBg = scene.add.graphics();
            
            const headerWidth = popupWidth * 0.85; // Slightly smaller width
            const headerHeightVal = Math.min(45 * sf, 40); // Increased height
            
            categoryHeaderBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 0.8);
            categoryHeaderBg.fillRoundedRect(
                -headerWidth/2,
                headerY - headerHeightVal/2,
                headerWidth,
                headerHeightVal,
                8 * sf
            );
            
            categoryHeaderBg.lineStyle(2 * sf, 0x63b3ed, 0.6);
            categoryHeaderBg.strokeRoundedRect(
                -headerWidth/2,
                headerY - headerHeightVal/2,
                headerWidth,
                headerHeightVal,
                8 * sf
            );
            
            const categoryHeader = scene.add.text(0, headerY, category.name, {
                fontSize: `${Math.min(22 * sf, 20)}px`,
                color: '#ffd700',
                fontFamily: 'Caprasimo-Regular',
                stroke: '#1a1a2e',
                strokeThickness: 1 * sf
            }).setOrigin(0.5);
            
            scene.popupContent.add([categoryHeaderBg, categoryHeader]);
            scene._libraryCategoryHeaders.push(categoryHeader);
            
            yOffset += 80 * sf; // Much more spacing between header and first book
            
            category.books.forEach((book, bookIndex) => {
                // Book card with much better spacing to prevent overlapping
                const cardWidth = popupWidth * 0.8; // Slightly smaller cards
                const cardHeight = isSmallScreen ? 130 * sf : 110 * sf; // More height for content
                
                const bookBg = scene.add.graphics();
                
                // Card background
                bookBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 0.9);
                bookBg.fillRoundedRect(
                    -cardWidth/2,
                    yOffset - cardHeight/2,
                    cardWidth,
                    cardHeight,
                    12 * sf
                );
                
                bookBg.lineStyle(2 * sf, 0x63b3ed, 0.4);
                bookBg.strokeRoundedRect(
                    -cardWidth/2,
                    yOffset - cardHeight/2,
                    cardWidth,
                    cardHeight,
                    12 * sf
                );
                
                // Book info with responsive layout
                const leftX = -cardWidth/2 + 20 * sf;
                const rightX = cardWidth/2 - 20 * sf;
                
                const bookTitle = scene.add.text(leftX, yOffset - 25 * sf, book.title, {
                    fontSize: `${Math.min(18 * sf, 16)}px`,
                    color: '#ffffff',
                    fontFamily: 'Caprasimo-Regular',
                    stroke: '#1a1a2e',
                    strokeThickness: 1 * sf,
                    wordWrap: { width: cardWidth * 0.6 }
                }).setOrigin(0, 0.5).setDepth(5);
                
                const bookAuthor = scene.add.text(leftX, yOffset, `by ${book.author}`, {
                    fontSize: `${Math.min(14 * sf, 12)}px`,
                    color: '#63b3ed',
                    fontFamily: 'Arial',
                    wordWrap: { width: cardWidth * 0.6 }
                }).setOrigin(0, 0.5).setDepth(5);
                
                const bookPages = scene.add.text(leftX, yOffset + 20 * sf, `${book.pages} pages • ${book.difficulty}`, {
                    fontSize: `${Math.min(12 * sf, 10)}px`,
                    color: '#95A5A6',
                    fontFamily: 'Arial',
                    wordWrap: { width: cardWidth * 0.6 }
                }).setOrigin(0, 0.5).setDepth(5);
                
                // Status badge
                const statusColor = scene.getBookStatusColor(book.status);
                const statusText = book.status.toUpperCase();
                
                const statusBadge = scene.add.graphics();
                const badgeWidth = Math.min(80 * sf, 70);
                const badgeHeight = Math.min(25 * sf, 22);
                
                statusBadge.fillStyle(statusColor, 0.8);
                statusBadge.fillRoundedRect(
                    rightX - badgeWidth,
                    yOffset - 25 * sf - badgeHeight/2,
                    badgeWidth,
                    badgeHeight,
                    12 * sf
                );
                
                const statusTextObj = scene.add.text(rightX - badgeWidth/2, yOffset - 25 * sf, statusText, {
                    fontSize: `${Math.min(12 * sf, 10)}px`,
                    color: '#ffffff',
                    fontFamily: 'Arial Black'
                }).setOrigin(0.5, 0.5).setDepth(5);
                
                // Action button
                const actionBtn = scene.add.graphics();
                const btnWidth = Math.min(60 * sf, 55);
                const btnHeight = Math.min(30 * sf, 25);
                
                // Store original coordinates for reuse
                const btnX = rightX - btnWidth;
                const btnY = yOffset + 10 * sf - btnHeight/2;
                
                // Draw initial state
                actionBtn.fillGradientStyle(0x63b3ed, 0x63b3ed, 0x3498db, 0x3498db, 1);
                actionBtn.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 8 * sf);
                
                actionBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
                
                const actionText = scene.add.text(rightX - btnWidth/2, yOffset + 10 * sf, 'READ', {
                    fontSize: `${Math.min(14 * sf, 12)}px`,
                    color: '#ffffff',
                    fontFamily: 'Arial Black'
                }).setOrigin(0.5, 0.5).setDepth(5);
                
                actionBtn.on('pointerover', () => {
                    actionBtn.clear();
                    actionBtn.fillGradientStyle(0xffd700, 0xffd700, 0xff8c42, 0xff8c42, 1);
                    actionBtn.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 8 * sf);
                    actionText.setScale(1.05);
                });
                
                actionBtn.on('pointerout', () => {
                    actionBtn.clear();
                    actionBtn.fillGradientStyle(0x63b3ed, 0x63b3ed, 0x3498db, 0x3498db, 1);
                    actionBtn.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 8 * sf);
                    actionText.setScale(1);
                });
                
                actionBtn.on('pointerdown', () => { scene.handleBookAction(book); });
                
                scene.popupContent.add([
                    bookBg, bookTitle, bookAuthor, bookPages,
                    statusBadge, statusTextObj, actionBtn, actionText
                ]);
                
                scene._libraryBookElements.push([
                    bookBg, bookTitle, bookAuthor, bookPages, statusBadge, statusTextObj, actionBtn, actionText
                ]);
                
                yOffset += (cardHeight + 25 * sf); // Increased spacing between books
            });
            
            yOffset += 40 * sf; // Increased spacing between categories
        });
        
        // Initial visibility will be handled by the base scene
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
            
            // Label
            const label = scene.add.text(-popupWidth/2 + 40 * sf, yOffset, stat.label, {
                fontSize: `${Math.min(18 * sf, 16)}px`,
                color: '#ffffff',
                fontFamily: 'Caprasimo-Regular'
            }).setOrigin(0, 0.5).setDepth(5);
            
            // Progress value text
            const valueText = scene.add.text(popupWidth/2 - 40 * sf, yOffset, `${stat.value}/${stat.max}`, {
                fontSize: `${Math.min(16 * sf, 14)}px`,
                color: '#63b3ed',
                fontFamily: 'Arial'
            }).setOrigin(1, 0.5).setDepth(5);
            
            yOffset += 30 * sf;
            
            // Progress bar background
            const progressBg = scene.add.graphics();
            progressBg.fillStyle(0x2d3748, 0.8);
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
                color: '#ffd700',
                fontFamily: 'Caprasimo-Regular'
            }).setOrigin(0.5, 0.5).setDepth(5);
            
            scene.popupContent.add(achievementsHeader);
            yOffset += 40 * sf;
            
            scene.libraryData.progress.achievements.forEach((achievement, index) => {
                const achBg = scene.add.graphics();
                achBg.fillStyle(0x2d3748, 0.6);
                achBg.fillRoundedRect(-popupWidth/2 + 20 * sf, yOffset - 20 * sf, popupWidth - 40 * sf, 40 * sf, 8 * sf);
                
                const achText = scene.add.text(0, yOffset, achievement.name || achievement, {
                    fontSize: `${Math.min(16 * sf, 14)}px`,
                    color: '#ffffff',
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
        
        addBtn.fillStyle(0x27AE60, 0.8);
        addBtn.fillRoundedRect(-btnWidth/2, yOffset - btnHeight/2, btnWidth, btnHeight, 8 * sf);
        addBtn.setInteractive(new Phaser.Geom.Rectangle(-btnWidth/2, yOffset - btnHeight/2, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
        
        const addText = scene.add.text(0, yOffset, '+ Add New Note', {
            fontSize: `${Math.min(18 * sf, 16)}px`,
            color: '#ffffff',
            fontFamily: 'Caprasimo-Regular'
        }).setOrigin(0.5, 0.5).setDepth(5);
        
        addBtn.on('pointerdown', () => { scene.showAddNoteDialog(); });
        
        scene.popupContent.add([addBtn, addText]);
        yOffset += 60 * sf;
        
        // Notes categories
        scene.libraryData.notes.categories.forEach((category, categoryIndex) => {
            // Category header
            const categoryHeader = scene.add.text(0, yOffset, category.name, {
                fontSize: `${Math.min(20 * sf, 18)}px`,
                color: '#ffd700',
                fontFamily: 'Caprasimo-Regular'
            }).setOrigin(0.5, 0.5).setDepth(5);
            
            scene.popupContent.add(categoryHeader);
            yOffset += 40 * sf;
            
            // Notes
            if (category.notes.length === 0) {
                const emptyText = scene.add.text(0, yOffset, 'No notes yet', {
                    fontSize: `${Math.min(16 * sf, 14)}px`,
                    color: '#95a5a6',
                    fontFamily: 'Arial',
                    fontStyle: 'italic'
                }).setOrigin(0.5, 0.5).setDepth(5);
                
                scene.popupContent.add(emptyText);
                yOffset += 40 * sf;
            } else {
                category.notes.forEach((note, noteIndex) => {
                    const noteContent = note.content || note;
                    const noteDate = note.date || 'No date';
                    
                    // Note background
                    const noteBg = scene.add.graphics();
                    const noteHeight = 60 * sf;
                    
                    noteBg.fillStyle(0x2d3748, 0.6);
                    noteBg.fillRoundedRect(-popupWidth/2 + 20 * sf, yOffset - noteHeight/2, popupWidth - 40 * sf, noteHeight, 8 * sf);
                    noteBg.setInteractive(new Phaser.Geom.Rectangle(-popupWidth/2 + 20 * sf, yOffset - noteHeight/2, popupWidth - 40 * sf, noteHeight), Phaser.Geom.Rectangle.Contains);
                    
                    // Note text
                    const noteText = scene.add.text(-popupWidth/2 + 40 * sf, yOffset - 10 * sf, noteContent, {
                        fontSize: `${Math.min(14 * sf, 12)}px`,
                        color: '#ffffff',
                        fontFamily: 'Arial',
                        wordWrap: { width: popupWidth - 100 * sf }
                    }).setOrigin(0, 0.5).setDepth(5);
                    
                    // Note date
                    const dateText = scene.add.text(-popupWidth/2 + 40 * sf, yOffset + 15 * sf, noteDate, {
                        fontSize: `${Math.min(12 * sf, 10)}px`,
                        color: '#95a5a6',
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
