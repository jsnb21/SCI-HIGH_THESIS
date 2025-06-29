// LibraryUI.js
// Contains UI-related methods for BaseLibraryScene

export default class LibraryUI {
    static createMainMenu(scene) {
        // Modern card background with shadow
        scene.mainMenuContainer = scene.add.container(350, 400);
        scene.createRoundedRectTexture('menuBgTex', 280, 440, 32, 0xffffff, 1, 0x3498db, 0.10, 0, 0x3498db, 0.10, 16);
        const menuBg = scene.add.image(0, 0, 'menuBgTex').setOrigin(0.5).setDepth(2);
        menuBg.setAlpha(0.98);
        // Modern shadow for card
        // (Phaser doesn't support shadow for images, so we use a slightly offset, semi-transparent rectangle)
        const menuShadow = scene.add.rectangle(6, 8, 280, 440, 0x3498db, 0.10).setOrigin(0.5).setDepth(1);
        scene.mainMenuContainer.add(menuShadow);
        scene.mainMenuContainer.add(menuBg);
        // Modern title
        const title = scene.add.text(0, -170, scene.libraryData.main.title, {
            fontSize: '32px',
            color: '#222',
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: '#b0d4f1', blur: 6, fill: true }
        }).setOrigin(0.5);
        scene.mainMenuContainer.add(title);
        scene.libraryData.main.menuItems.forEach((item, index) => {
            const y = -70 + (index * 70);
            const btnKey = `menuBtnTex_${index}`;
            const btnKeyHover = `menuBtnTex_${index}_hover`;
            const btnKeyActive = `menuBtnTex_${index}_active`;
            // Modern pill button
            scene.createRoundedRectTexture(btnKey, 220, 54, 27, 0xffffff, 1, 0x1abc9c, 0.18, 2, 0x3498db, 0.10, 8);
            scene.createRoundedRectTexture(btnKeyHover, 220, 54, 27, 0x1abc9c, 0.12, 0x1abc9c, 0.18, 2);
            scene.createRoundedRectTexture(btnKeyActive, 220, 54, 27, 0x3498db, 0.18, 0x1abc9c, 0.18, 2);
            const btnBg = scene.add.image(0, y, btnKey).setOrigin(0.5);
            // Modern icon (use emoji or item.icon if available)
            const icon = item.icon ? item.icon : ['📚','📊','📝','⚙️'][index] || '';
            const btnText = scene.add.text(0, y, `${icon}  ${item.name}`, {
                fontSize: '20px',
                color: '#1abc9c',
                fontFamily: 'Arial Black',
                fontStyle: 'bold',
                shadow: { offsetX: 0, offsetY: 1, color: '#b0d4f1', blur: 2, fill: true }
            }).setOrigin(0.5);
            btnBg.setInteractive({ useHandCursor: true });
            btnBg.on('pointerover', () => {
                btnBg.setTexture(btnKeyHover);
                btnText.setColor('#fff');
            });
            btnBg.on('pointerout', () => {
                btnBg.setTexture(btnKey);
                btnText.setColor('#1abc9c');
            });
            btnBg.on('pointerdown', () => {
                btnBg.setTexture(btnKeyActive);
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
            btnBg.on('pointerup', () => {
                btnBg.setTexture(btnKeyHover);
            });
            scene.mainMenuContainer.add([btnBg, btnText]);
        });
    }

    static createPopupContainer(scene) {
        const popupWidth = scene.cameras.main.width / 2;
        const popupHeight = scene.cameras.main.height;
        const popupX = scene.cameras.main.width + (popupWidth / 2);
        const popupY = scene.cameras.main.height / 2;
        scene.popupContainer = scene.add.container(popupX, popupY);
        scene.overlay = scene.add.rectangle(-popupWidth, 0, popupWidth, popupHeight, 0x222222, 0.18);
        scene.overlay.setOrigin(0, 0.5);
        scene.overlay.setInteractive();
        scene.overlay.on('pointerdown', () => { scene.hidePopup(); });
        scene.overlay.setVisible(false);
        scene.createRoundedRectTexture('popupBgTex', popupWidth, popupHeight, 0, 0xffffff, 1, 0x3498db, 1, 6, 0x3498db, 0.10, 24);
        scene.popupBg = scene.add.rectangle(0, 0, popupWidth, popupHeight, 0xffffff, 1).setOrigin(0.5, 0.5).setDepth(1);
        // Modern books header redesign
        // Header bar with rounded corners and drop shadow
        const headerBarKey = 'modernHeaderBarTex';
        scene.createRoundedRectTexture(headerBarKey, popupWidth - 40, 70, 24, 0x1abc9c, 1, 0x3498db, 1, 2, 0x3498db, 0.12, 16);
        const headerBar = scene.add.image(0, -popupHeight/2 + 75, headerBarKey)
            .setOrigin(0.5)
            .setDepth(3)
            .setAlpha(0.98);
        // Book icon (Unicode or emoji for simplicity)
        const bookIcon = scene.add.text(-70, -popupHeight/2 + 75, '\uD83D\uDCD6', {
            fontSize: '36px',
            fontFamily: 'Arial Black',
            color: '#fff',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: '#1abc9c', blur: 6, fill: true }
        }).setOrigin(0.5);
        // Modern title
        scene.popupTitle = scene.add.text(0, -popupHeight/2 + 75, 'BOOKS', {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#fff',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 3, color: '#3498db', blur: 10, fill: true },
            letterSpacing: 2
        }).setOrigin(0.5);
        // Modern close button (circle with hover effect)
        scene.closeBtn = scene.add.circle(popupWidth/2 - 50, -popupHeight/2 + 75, 18, 0xffffff, 0.85);
        scene.closeBtn.setStrokeStyle(2, 0xe74c3c);
        scene.closeBtn.setInteractive({ useHandCursor: true });
        scene.closeBtn.on('pointerover', () => { scene.closeBtn.setFillStyle(0xe74c3c, 0.85); });
        scene.closeBtn.on('pointerout', () => { scene.closeBtn.setFillStyle(0xffffff, 0.85); });
        scene.closeBtn.on('pointerdown', () => { scene.hidePopup(); });
        scene.closeBtnText = scene.add.text(popupWidth/2 - 50, -popupHeight/2 + 75, '✕', {
            fontSize: '20px',
            color: '#e74c3c',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        // Remove old headerGradient and old popupTitle from container
        // Add new modern header bar, icon, title, and close button
        scene.popupContent = scene.add.container(0, 0);
        scene.popupScrollY = 0;
        scene.popupBg.setInteractive();
        scene.input.mouse.enabled = true;
        scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            scene.scrollPopupContent(deltaY);
        });
        scene.popupContainer.add([
            scene.popupBg,
            headerBar,
            bookIcon,
            scene.closeBtn,
            scene.closeBtnText,
            scene.popupTitle,
            scene.popupContent
        ]);
        scene.popupContainer.setVisible(false);
    }

    static createBooksContent(scene) {
        const popupHeight = scene.cameras.main.height;
        const headerHeight = 80;
        const scrollSafeMargin = 32;
        const startY = (-popupHeight/2) + headerHeight + 60 + scrollSafeMargin;
        let yOffset = startY;
        scene._libraryBookElements = [];
        scene._libraryCategoryHeaders = [];
        scene.libraryData.books.categories.forEach((category, categoryIndex) => {
            // Modern category header
            const headerY = yOffset;
            const catHeaderKey = `catHeaderTex_${categoryIndex}`;
            scene.createRoundedRectTexture(catHeaderKey, 340, 48, 18, 0x1abc9c, 0.12, 0x3498db, 0.18, 2);
            const categoryHeaderBg = scene.add.image(0, headerY, catHeaderKey).setOrigin(0.5).setDepth(9);
            const categoryHeader = scene.add.text(0, headerY, category.name, {
                fontSize: '28px',
                color: '#1abc9c',
                fontFamily: 'Arial Black',
                fontStyle: 'bold',
                shadow: { offsetX: 0, offsetY: 2, color: '#b0d4f1', blur: 6, fill: true },
                depth: 10
            }).setOrigin(0.5);
            scene.popupContent.add([categoryHeaderBg, categoryHeader]);
            scene._libraryCategoryHeaders.push(categoryHeader);
            yOffset += 60;
            if (category.books.length > 0) {
                yOffset += 16;
            }
            let isFirstBook = true;
            category.books.forEach((book, bookIndex) => {
                // Modern book card
                const bookCardKey = `bookCardTex_${categoryIndex}_${bookIndex}`;
                scene.createRoundedRectTexture(bookCardKey, 500, 110, 22, 0xffffff, 1, 0x1abc9c, 0.12, 2, 0x3498db, 0.10, 8);
                const bookBg = scene.add.image(0, yOffset, bookCardKey).setOrigin(0.5).setDepth(5);
                // Book info
                const leftX = -220;
                const bookTitle = scene.add.text(leftX, yOffset - 32, book.title, {
                    fontSize: '20px',
                    color: '#222',
                    fontFamily: 'Arial Black',
                    fontStyle: 'bold',
                    wordWrap: { width: 260 }
                }).setOrigin(0, 0.5).setDepth(5);
                const bookAuthor = scene.add.text(leftX, yOffset - 6, `by ${book.author}`, {
                    fontSize: '14px',
                    color: '#1abc9c',
                    fontFamily: 'Arial',
                    wordWrap: { width: 260 }
                }).setOrigin(0, 0.5).setDepth(5);
                const bookPages = scene.add.text(leftX, yOffset + 20, `${book.pages} pages • ${book.difficulty}`, {
                    fontSize: '12px',
                    color: '#95A5A6',
                    fontFamily: 'Arial',
                    wordWrap: { width: 260 }
                }).setOrigin(0, 0.5).setDepth(5);
                // Status badge (modern pill)
                const statusColor = scene.getBookStatusColor(book.status);
                const statusTextStr = book.status.toUpperCase();
                const statusTextObj = scene.add.text(0, 0, statusTextStr, {
                    fontSize: '14px',
                    color: '#fff',
                    fontFamily: 'Arial Black',
                    fontStyle: 'bold',
                    align: 'center',
                    shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 2, fill: true },
                    padding: { left: 16, right: 16, top: 6, bottom: 6 }
                }).setOrigin(0.5, 0.5).setDepth(5);
                const statusBadgeKey = `bookStatusTex_${categoryIndex}_${bookIndex}`;
                const statusBadgeWidth = statusTextObj.width + 32;
                const statusBadgeHeight = statusTextObj.height + 12;
                scene.createRoundedRectTexture(statusBadgeKey, statusBadgeWidth, statusBadgeHeight, 16, statusColor, 1);
                const statusBg = scene.add.image(180, yOffset - 24, statusBadgeKey).setOrigin(0.5, 0.5).setDepth(5);
                statusTextObj.setPosition(180, yOffset - 24);
                // Action button (modern pill)
                const actionTextStr = 'READ';
                const actionTextObj = scene.add.text(0, 0, actionTextStr, {
                    fontSize: '16px',
                    color: '#fff',
                    fontFamily: 'Arial Black',
                    fontStyle: 'bold',
                    align: 'center',
                    shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 2, fill: true },
                    padding: { left: 20, right: 20, top: 8, bottom: 8 }
                }).setOrigin(0.5, 0.5).setDepth(5);
                const actionBtnKey = `bookActionBtnTex_${categoryIndex}_${bookIndex}`;
                const actionBtnKeyHover = `bookActionBtnTex_${categoryIndex}_${bookIndex}_hover`;
                const actionBtnWidth = actionTextObj.width + 36;
                const actionBtnHeight = actionTextObj.height + 16;
                scene.createRoundedRectTexture(actionBtnKey, actionBtnWidth, actionBtnHeight, 18, 0x3498db, 1);
                scene.createRoundedRectTexture(actionBtnKeyHover, actionBtnWidth, actionBtnHeight, 18, 0x1abc9c, 1);
                const actionBtn = scene.add.image(180, yOffset + 24, actionBtnKey).setOrigin(0.5, 0.5).setDepth(5);
                actionBtn.setInteractive({ useHandCursor: true });
                actionBtn.on('pointerdown', () => { scene.handleBookAction(book); });
                actionBtn.on('pointerover', () => { actionBtn.setTexture(actionBtnKeyHover); });
                actionBtn.on('pointerout', () => { actionBtn.setTexture(actionBtnKey); });
                actionTextObj.setPosition(180, yOffset + 24);
                scene.popupContent.add([
                    bookBg, bookTitle, bookAuthor, bookPages,
                    statusBg, statusTextObj, actionBtn, actionTextObj
                ]);
                scene._libraryBookElements.push([
                    bookBg, bookTitle, bookAuthor, bookPages, statusBg, statusTextObj, actionBtn, actionTextObj
                ]);
                yOffset += 130;
                isFirstBook = false;
            });
            yOffset += 32;
        });
        scene.input.on('wheel', () => {
            LibraryUI.updateBooksScrollVisibility(scene);
        });
        LibraryUI.updateBooksScrollVisibility(scene);
    }

    static updateBooksScrollVisibility(scene) {
        if (!scene._libraryBookElements || !scene._libraryCategoryHeaders) return;
        // Calculate the Y threshold (bottom of header area in popup coordinates)
        const popupHeaderBottom = (-scene.cameras.main.height/2) + 80 + 60; // headerHeight + extra margin
        // Hide book elements above header
        scene._libraryBookElements.forEach(group => {
            // All elements in group share the same y (bookBg.y)
            const y = group[0].y + (scene.popupContent.y || 0);
            const visible = y > popupHeaderBottom;
            group.forEach(el => el.setVisible(visible));
        });
        // Hide category headers above header
        scene._libraryCategoryHeaders.forEach(header => {
            const y = header.y + (scene.popupContent.y || 0);
            header.setVisible(y > popupHeaderBottom);
        });
    }

    static createProgressContent(scene) {
        const popupHeight = scene.cameras.main.height;
        const headerHeight = 80;
        const startY = (-popupHeight/2) + headerHeight + 60;
        let yOffset = startY;
        scene.libraryData.progress.stats.forEach((stat, index) => {
            // Modern stat card
            const statCardKey = `progressCardTex_${index}`;
            scene.createRoundedRectTexture(statCardKey, 400, 60, 16, 0xffffff, 1, 0x1abc9c, 0.10, 2);
            const statCard = scene.add.image(0, yOffset + 20, statCardKey).setOrigin(0.5);
            const label = scene.add.text(-150, yOffset, stat.label, {
                fontSize: '18px',
                color: '#3498db',
                fontFamily: 'Arial Black',
                fontStyle: 'bold',
                shadow: { offsetX: 0, offsetY: 1, color: '#b0d4f1', blur: 2, fill: true }
            }).setOrigin(0, 0.5);
            const fillWidth = (stat.value / stat.max) * 220;
            const progressBgKey = `progressBgTex_${index}`;
            scene.createRoundedRectTexture(progressBgKey, 220, 18, 9, 0xffffff, 1, 0x3498db, 1, 1);
            const progressBg = scene.add.image(60, yOffset + 20, progressBgKey).setOrigin(0, 0.5);
            const progressFillKey = `progressFillTex_${index}`;
            scene.createRoundedRectTexture(progressFillKey, Math.max(fillWidth, 2), 18, 9, parseInt(stat.color.replace('#', '0x')), 1);
            const progressFill = scene.add.image(60, yOffset + 20, progressFillKey).setOrigin(0, 0.5);
            const progressText = scene.add.text(170, yOffset + 20, `${stat.value}/${stat.max} (${Math.round((stat.value/stat.max)*100)}%)`, {
                fontSize: '13px',
                color: '#1abc9c',
                fontFamily: 'Arial Black'
            }).setOrigin(0, 0.5);
            scene.popupContent.add([statCard, label, progressBg, progressFill, progressText]);
            yOffset += 80;
        });
        if (scene.libraryData.progress.achievements.length > 0) {
            yOffset += 36;
            const achievementHeader = scene.add.text(0, yOffset, 'ACHIEVEMENTS', {
                fontSize: '22px',
                color: '#1abc9c',
                fontFamily: 'Arial Black',
                fontStyle: 'bold',
                shadow: { offsetX: 0, offsetY: 2, color: '#b0d4f1', blur: 4, fill: true }
            }).setOrigin(0.5);
            scene.popupContent.add(achievementHeader);
            yOffset += 54;
            scene.libraryData.progress.achievements.forEach((achievement, index) => {
                const achievementBgKey = `achievementBgTex_${index}`;
                scene.createRoundedRectTexture(achievementBgKey, 420, 54, 14, 0xffffff, 1, 0x1abc9c, 1, 1);
                const achievementBg = scene.add.image(0, yOffset, achievementBgKey).setOrigin(0.5);
                const achievementText = scene.add.text(0, yOffset, achievement.name, {
                    fontSize: '16px',
                    color: '#3498db',
                    fontFamily: 'Arial Black'
                }).setOrigin(0.5);
                scene.popupContent.add([achievementBg, achievementText]);
                yOffset += 74;
            });
        }
    }

    static createNotesContent(scene) {
        const popupHeight = scene.cameras.main.height;
        const headerHeight = 80;
        const startY = (-popupHeight/2) + headerHeight + 60;
        let yOffset = startY;
        const addNoteBtnKey = 'addNoteBtnTex';
        const addNoteBtnKeyHover = 'addNoteBtnTex_hover';
        scene.createRoundedRectTexture(addNoteBtnKey, 220, 48, 24, 0x1abc9c, 1, 0x16a085, 1, 2);
        scene.createRoundedRectTexture(addNoteBtnKeyHover, 220, 48, 24, 0x16a085, 1, 0x16a085, 1, 2);
        const addNoteBtn = scene.add.image(0, yOffset, addNoteBtnKey).setOrigin(0.5);
        addNoteBtn.setInteractive({ useHandCursor: true });
        const addNoteText = scene.add.text(0, yOffset, '+ Add New Note', {
            fontSize: '18px',
            color: '#fff',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        addNoteBtn.on('pointerover', () => { addNoteBtn.setTexture(addNoteBtnKeyHover); });
        addNoteBtn.on('pointerout', () => { addNoteBtn.setTexture(addNoteBtnKey); });
        addNoteBtn.on('pointerdown', () => { scene.showAddNoteDialog(); });
        scene.popupContent.add([addNoteBtn, addNoteText]);
        yOffset += 80;
        scene.libraryData.notes.categories.forEach((category, categoryIndex) => {
            // Modern note category header
            const catHeaderKey = `noteCatHeaderTex_${categoryIndex}`;
            scene.createRoundedRectTexture(catHeaderKey, 320, 40, 14, 0x1abc9c, 0.10, 0x3498db, 0.10, 2);
            const categoryHeaderBg = scene.add.image(0, yOffset, catHeaderKey).setOrigin(0.5);
            const categoryHeader = scene.add.text(0, yOffset, category.name, {
                fontSize: '20px',
                color: '#3498db',
                fontFamily: 'Arial Black',
                fontStyle: 'bold',
                shadow: { offsetX: 0, offsetY: 2, color: '#b0d4f1', blur: 4, fill: true }
            }).setOrigin(0.5);
            scene.popupContent.add([categoryHeaderBg, categoryHeader]);
            yOffset += 48;
            if (category.notes.length > 0) {
                yOffset += 18;
            }
            if (category.notes.length === 0) {
                const emptyText = scene.add.text(0, yOffset, 'No notes yet.', {
                    fontSize: '15px',
                    color: '#95A5A6',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                scene.popupContent.add(emptyText);
                yOffset += 40;
            } else {
                category.notes.forEach((note, noteIndex) => {
                    // Modern note card
                    const noteBgKey = `noteBgTex_${categoryIndex}_${noteIndex}`;
                    scene.createRoundedRectTexture(noteBgKey, 440, 80, 18, 0xffffff, 1, 0x1abc9c, 0.10, 2);
                    const noteBg = scene.add.image(0, yOffset, noteBgKey).setOrigin(0.5);
                    const noteText = scene.add.text(-200, yOffset, note.text, {
                        fontSize: '15px',
                        color: '#222',
                        fontFamily: 'Arial',
                        wordWrap: { width: 380 }
                    }).setOrigin(0, 0.5);
                    scene.popupContent.add([noteBg, noteText]);
                    yOffset += 100;
                });
            }
            yOffset += 36;
        });
    }
}
