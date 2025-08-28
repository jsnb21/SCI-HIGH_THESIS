export class DungeonHUD {
    constructor(scene) {
        this.scene = scene;
        this.hudElements = [];
        this.hudBackground = null;
        this.resizeHandler = () => this.drawHUD();
        this.scene.scale.on('resize', this.resizeHandler);
    }

    drawHUD() {
        if (this.hudElements.length) {
            this.hudElements.forEach(el => el.destroy());
            this.hudElements = [];
        }
        if (this.hudBackground) {
            this.hudBackground.destroy();
            this.hudBackground = null;
        }

        const { width, height } = this.scene.scale;
        const scaleFactor = Math.min(width / 816, height / 624);

        // Create enhanced HUD background panel
        this.createHUDBackground(scaleFactor);

        // Enhanced intensity display with better styling
        this.createIntensityDisplay(scaleFactor);

        // Enhanced health display with glowing hearts
        this.createHealthDisplay(scaleFactor);

        // Enhanced buffs display
        this.createBuffsDisplay(scaleFactor);

        // Add mystical elements
        this.createMysticalElements(scaleFactor);
    }

    createHUDBackground(scaleFactor) {
        const { width, height } = this.scene.scale;
        const panelWidth = 280 * scaleFactor;
        const panelHeight = 180 * scaleFactor;
        const margin = 16 * scaleFactor;

        // Main HUD panel with main menu color scheme
        this.hudBackground = this.scene.add.graphics();
        
        // Dark blue-purple background matching main menu buttons
        this.hudBackground.fillStyle(0x222244, 0.92);
        this.hudBackground.fillRoundedRect(margin, margin, panelWidth, panelHeight, 12 * scaleFactor);
        
        // Light yellow/cream border matching main menu
        this.hudBackground.lineStyle(3 * scaleFactor, 0xffffcc, 1);
        this.hudBackground.strokeRoundedRect(margin, margin, panelWidth, panelHeight, 12 * scaleFactor);
        
        // Inner light yellow accent
        this.hudBackground.lineStyle(1 * scaleFactor, 0xffffcc, 0.6);
        this.hudBackground.strokeRoundedRect(
            margin + 2 * scaleFactor, 
            margin + 2 * scaleFactor, 
            panelWidth - 4 * scaleFactor, 
            panelHeight - 4 * scaleFactor, 
            10 * scaleFactor
        );

        // Corner decorative elements in bright yellow
        const cornerSize = 8 * scaleFactor;
        this.hudBackground.fillStyle(0xffff00, 0.8);
        
        // Top corners
        this.hudBackground.fillCircle(margin + cornerSize, margin + cornerSize, cornerSize / 2);
        this.hudBackground.fillCircle(margin + panelWidth - cornerSize, margin + cornerSize, cornerSize / 2);
        
        // Bottom corners
        this.hudBackground.fillCircle(margin + cornerSize, margin + panelHeight - cornerSize, cornerSize / 2);
        this.hudBackground.fillCircle(margin + panelWidth - cornerSize, margin + panelHeight - cornerSize, cornerSize / 2);

        this.hudBackground.setDepth(8);
        this.hudElements.push(this.hudBackground);
    }

    createIntensityDisplay(scaleFactor) {
        const margin = 16 * scaleFactor;
        const textY = margin + 24 * scaleFactor;

        // Title with shadow effect using main menu colors
        const titleShadow = this.scene.add.text(
            margin + 22 * scaleFactor,
            textY + 2 * scaleFactor,
            'INTENSITY',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(18 * scaleFactor)}px`,
                color: '#000000',
                alpha: 0.5
            }
        ).setDepth(9);
        this.hudElements.push(titleShadow);

        const titleText = this.scene.add.text(
            margin + 20 * scaleFactor,
            textY,
            'INTENSITY',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(18 * scaleFactor)}px`,
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 2 * scaleFactor
            }
        ).setDepth(10);
        this.hudElements.push(titleText);

        // Intensity value with glow effect using main menu colors
        const intensityValue = this.scene.add.text(
            margin + 220 * scaleFactor,
            textY,
            `${this.scene.intensity}`,
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(32 * scaleFactor)}px`,
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3 * scaleFactor
            }
        ).setOrigin(0.5, 0).setDepth(10);
        this.hudElements.push(intensityValue);

        // Add pulsing glow to intensity number
        this.scene.tweens.add({
            targets: intensityValue,
            alpha: 0.7,
            duration: 1500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }    createHealthDisplay(scaleFactor) {
        const margin = 16 * scaleFactor;        const healthY = margin + 60 * scaleFactor;        // Enhanced heart display
        const heartSpacing = 35 * scaleFactor;
        const heartY = healthY + 25 * scaleFactor;
        const heartXStart = margin + 20 * scaleFactor;

        // Convert HP from 100-scale to 5-heart scale (20 HP per heart)
        const currentHearts = Math.ceil(this.scene.player.hp / 20);
        const maxHearts = 5;

        for (let i = 0; i < maxHearts; i++) { // Show max 5 hearts
            const heartX = heartXStart + i * heartSpacing;
            
            if (i < currentHearts) {                // Active heart without glow circle
                const heart = this.scene.add.image(heartX, heartY, 'heart')
                    .setOrigin(0.5, 0.5)
                    .setScale(0.05 * scaleFactor)
                    .setTint(0xff4757)
                    .setDepth(10);
                  // Gentle pulsing animation
                this.scene.tweens.add({
                    targets: heart,
                    scaleX: 0.06 * scaleFactor,
                    scaleY: 0.06 * scaleFactor,
                    duration: 800 + i * 100,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });

                this.hudElements.push(heart);            } else {
                // Empty heart (grayed out)
                const emptyHeart = this.scene.add.image(heartX, heartY, 'heart')
                    .setOrigin(0.5, 0.5)
                    .setScale(0.05 * scaleFactor)
                    .setTint(0x4a5568)
                    .setAlpha(0.5)
                    .setDepth(10);
                this.hudElements.push(emptyHeart);
            }
        }
    }

    createBuffsDisplay(scaleFactor) {
        if (this.scene.player.buffs.length === 0) return;

        const margin = 16 * scaleFactor;
        const buffsY = margin + 120 * scaleFactor;

        // Buffs title using main menu color scheme
        const buffsTitle = this.scene.add.text(
            margin + 20 * scaleFactor,
            buffsY,
            'BUFFS',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(14 * scaleFactor)}px`,
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 2 * scaleFactor
            }
        ).setDepth(10);
        this.hudElements.push(buffsTitle);

        const buffSize = 24 * scaleFactor;
        const buffGap = 8 * scaleFactor;
        const buffsPerRow = 6;
        let startY = buffsY + 20 * scaleFactor;
        let startX = margin + 20 * scaleFactor;

        for (let i = 0; i < this.scene.player.buffs.length; i++) {
            const row = Math.floor(i / buffsPerRow);
            const col = i % buffsPerRow;
            const buffX = startX + col * (buffSize + buffGap) + buffSize / 2;
            const buffY = startY + row * (buffSize + buffGap) + buffSize / 2;

            // Buff background glow using main menu colors
            const buffGlow = this.scene.add.circle(buffX, buffY, buffSize / 2 + 2, 0xffffcc, 0.4);
            buffGlow.setDepth(9);
            this.hudElements.push(buffGlow);

            // Buff icon using main menu colors
            const buff = this.scene.add.graphics().setDepth(10);
            buff.fillStyle(0x333388, 1);  // Main menu hover color
            buff.fillCircle(buffX, buffY, buffSize / 2);
            
            // Inner highlight using bright yellow
            buff.fillStyle(0xffff00, 0.8);
            buff.fillCircle(buffX, buffY - 2 * scaleFactor, buffSize / 3);

            this.hudElements.push(buff);

            // Removed floating animation to keep buff icons static
        }
    }

    createMysticalElements(scaleFactor) {
        const margin = 16 * scaleFactor;
        
        // Add floating mystical particles around the HUD using main menu colors
        for (let i = 0; i < 5; i++) {
            const particle = this.scene.add.circle(
                margin + Phaser.Math.Between(20, 260) * scaleFactor,
                margin + Phaser.Math.Between(20, 160) * scaleFactor,
                1 * scaleFactor,
                0xffff00,  // Bright yellow from main menu
                0.6
            ).setDepth(7);

            this.hudElements.push(particle);

            // Gentle floating animation
            this.scene.tweens.add({
                targets: particle,
                y: particle.y + Phaser.Math.Between(-20, 20) * scaleFactor,
                x: particle.x + Phaser.Math.Between(-10, 10) * scaleFactor,
                alpha: 0.2,
                duration: Phaser.Math.Between(2000, 4000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: i * 500
            });
        }
    }

    shutdown() {
        if (this.hudElements && this.hudElements.length) {
            this.hudElements.forEach(el => el.destroy());
            this.hudElements = [];
        }
        if (this.hudBackground) {
            this.hudBackground.destroy();
            this.hudBackground = null;
        }
        this.scene.scale.off('resize', this.resizeHandler);
    }
}

export class DungeonMenu {
    constructor(scene) {
        this.scene = scene;
        this.menuBoxGroup = null;
        this.menuButtonBg = null;
        this.menuButtonText = null;
        this.resizeHandler = () => this.redrawMenuButton();
        this.scene.scale.on('resize', this.resizeHandler);
    }

    createMenuButton() {
        this.redrawMenuButton();
    }    redrawMenuButton() {
        if (this.menuButtonBg) this.menuButtonBg.destroy();
        if (this.menuButtonText) this.menuButtonText.destroy();

        const { width, height } = this.scene.scale;
        const scaleFactor = Math.min(width / 816, height / 624);

        const buttonWidth = 140 * scaleFactor;
        const buttonHeight = 50 * scaleFactor;
        const margin = 24 * scaleFactor;
        const buttonX = width - buttonWidth / 2 - margin;
        const buttonY = buttonHeight / 2 + margin;

        // Enhanced menu button with main menu color scheme
        this.menuButtonBg = this.scene.add.graphics();
        
        // Dark blue-purple background matching main menu buttons
        this.menuButtonBg.fillStyle(0x222244, 0.92);
        this.menuButtonBg.fillRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            8 * scaleFactor
        );
        
        // Light yellow/cream border matching main menu
        this.menuButtonBg.lineStyle(3 * scaleFactor, 0xffffcc, 1);
        this.menuButtonBg.strokeRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            8 * scaleFactor
        );

        // Inner highlight using light yellow
        this.menuButtonBg.lineStyle(1 * scaleFactor, 0xffffcc, 0.6);
        this.menuButtonBg.strokeRoundedRect(
            buttonX - buttonWidth / 2 + 2 * scaleFactor,
            buttonY - buttonHeight / 2 + 2 * scaleFactor,
            buttonWidth - 4 * scaleFactor,
            buttonHeight - 4 * scaleFactor,
            6 * scaleFactor
        );

        this.menuButtonBg.setDepth(9);

        // Enhanced menu text using main menu colors
        this.menuButtonText = this.scene.add.text(
            buttonX,
            buttonY,
            'MENU',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(20 * scaleFactor)}px`,
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 2 * scaleFactor
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => this.showMenuBox())
         .on('pointerover', () => {
             this.menuButtonText.setScale(1.1);
             // Change text color to white on hover like main menu
             this.menuButtonText.setStyle({ color: '#ffffff' });
             // Update background to hover color
             this.menuButtonBg.clear();
             this.menuButtonBg.fillStyle(0x333388, 1);
             this.menuButtonBg.fillRoundedRect(
                 buttonX - buttonWidth / 2,
                 buttonY - buttonHeight / 2,
                 buttonWidth,
                 buttonHeight,
                 8 * scaleFactor
             );
             this.menuButtonBg.lineStyle(3 * scaleFactor, 0xffffcc, 1);
             this.menuButtonBg.strokeRoundedRect(
                 buttonX - buttonWidth / 2,
                 buttonY - buttonHeight / 2,
                 buttonWidth,
                 buttonHeight,
                 8 * scaleFactor
             );
         })
         .on('pointerout', () => {
             this.menuButtonText.setScale(1);
             // Restore original text color
             this.menuButtonText.setStyle({ color: '#ffff00' });
             // Restore original background
             this.menuButtonBg.clear();
             this.menuButtonBg.fillStyle(0x222244, 0.92);
             this.menuButtonBg.fillRoundedRect(
                 buttonX - buttonWidth / 2,
                 buttonY - buttonHeight / 2,
                 buttonWidth,
                 buttonHeight,
                 8 * scaleFactor
             );
             this.menuButtonBg.lineStyle(3 * scaleFactor, 0xffffcc, 1);
             this.menuButtonBg.strokeRoundedRect(
                 buttonX - buttonWidth / 2,
                 buttonY - buttonHeight / 2,
                 buttonWidth,
                 buttonHeight,
                 8 * scaleFactor
             );
         })
         .setDepth(10);

        // Make the entire button area interactive
        const buttonArea = this.scene.add.rectangle(
            buttonX,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x000000,
            0
        ).setInteractive({ useHandCursor: true })
         .on('pointerdown', () => this.showMenuBox())
         .on('pointerover', () => {
             this.menuButtonText.setScale(1.1);
             this.menuButtonText.setStyle({ color: '#ffffff' });
             this.menuButtonBg.clear();
             this.menuButtonBg.fillStyle(0x333388, 1);
             this.menuButtonBg.fillRoundedRect(
                 buttonX - buttonWidth / 2,
                 buttonY - buttonHeight / 2,
                 buttonWidth,
                 buttonHeight,
                 8 * scaleFactor
             );
             this.menuButtonBg.lineStyle(3 * scaleFactor, 0xffffcc, 1);
             this.menuButtonBg.strokeRoundedRect(
                 buttonX - buttonWidth / 2,
                 buttonY - buttonHeight / 2,
                 buttonWidth,
                 buttonHeight,
                 8 * scaleFactor
             );
         })
         .on('pointerout', () => {
             this.menuButtonText.setScale(1);
             this.menuButtonText.setStyle({ color: '#ffff00' });
             this.menuButtonBg.clear();
             this.menuButtonBg.fillStyle(0x222244, 0.92);
             this.menuButtonBg.fillRoundedRect(
                 buttonX - buttonWidth / 2,
                 buttonY - buttonHeight / 2,
                 buttonWidth,
                 buttonHeight,
                 8 * scaleFactor
             );
             this.menuButtonBg.lineStyle(3 * scaleFactor, 0xffffcc, 1);
             this.menuButtonBg.strokeRoundedRect(
                 buttonX - buttonWidth / 2,
                 buttonY - buttonHeight / 2,
                 buttonWidth,
                 buttonHeight,
                 8 * scaleFactor
             );
         })
         .setDepth(9);

        if (!this.scene.persistentElements) this.scene.persistentElements = [];
        this.scene.persistentElements.push(this.menuButtonBg, this.menuButtonText, buttonArea);
    }

    showMenuBox() {
        if (this.menuBoxGroup && this.menuBoxGroup.children) {
            this.menuBoxGroup.clear(true, true);
        }
        this.menuBoxGroup = this.scene.add.group();

        const { width, height } = this.scene.scale;
        const scaleFactor = Math.min(width / 816, height / 624);

        // Enhanced dimmed background
        this.menuDimBg = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.6
        ).setDepth(1000);
        this.menuBoxGroup.add(this.menuDimBg);

        const boxWidth = 400 * scaleFactor;
        const boxHeight = 320 * scaleFactor;
        const baseX = width / 2;
        const baseY = height / 2;

        // Enhanced menu box with main menu color scheme
        const menuBoxBg = this.scene.add.graphics();
        
        // Outer glow using light yellow
        menuBoxBg.fillStyle(0xffffcc, 0.2);
        menuBoxBg.fillRoundedRect(
            baseX - boxWidth / 2 - 8 * scaleFactor,
            baseY - boxHeight / 2 - 8 * scaleFactor,
            boxWidth + 16 * scaleFactor,
            boxHeight + 16 * scaleFactor,
            20 * scaleFactor
        );

        // Main dark blue-purple background matching main menu buttons
        menuBoxBg.fillStyle(0x222244, 0.95);
        menuBoxBg.fillRoundedRect(
            baseX - boxWidth / 2,
            baseY - boxHeight / 2,
            boxWidth,
            boxHeight,
            16 * scaleFactor
        );

        // Light yellow border matching main menu
        menuBoxBg.lineStyle(4 * scaleFactor, 0xffffcc, 0.8);
        menuBoxBg.strokeRoundedRect(
            baseX - boxWidth / 2,
            baseY - boxHeight / 2,
            boxWidth,
            boxHeight,
            16 * scaleFactor
        );

        // Inner light yellow accent
        menuBoxBg.lineStyle(2 * scaleFactor, 0xffffcc, 0.4);
        menuBoxBg.strokeRoundedRect(
            baseX - boxWidth / 2 + 4 * scaleFactor,
            baseY - boxHeight / 2 + 4 * scaleFactor,
            boxWidth - 8 * scaleFactor,
            boxHeight - 8 * scaleFactor,
            12 * scaleFactor
        );

        menuBoxBg.setDepth(1001);
        this.menuBoxGroup.add(menuBoxBg);

        // Enhanced title with shadow using main menu colors
        const titleShadow = this.scene.add.text(
            baseX + 2 * scaleFactor,
            baseY - boxHeight / 2 + 42 * scaleFactor,
            'DUNGEON MENU',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(28 * scaleFactor)}px`,
                color: '#000000',
                alpha: 0.5
            }
        ).setOrigin(0.5).setDepth(1002);
        this.menuBoxGroup.add(titleShadow);

        const title = this.scene.add.text(
            baseX,
            baseY - boxHeight / 2 + 40 * scaleFactor,
            'DUNGEON MENU',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(28 * scaleFactor)}px`,
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3 * scaleFactor
            }
        ).setOrigin(0.5).setDepth(1002);
        this.menuBoxGroup.add(title);

        const options = [
            { label: 'Continue Adventure', action: () => this.closeMenuBox() },
            { label: 'Game Options', action: () => { this.scene.scene.switch('OptionsScene', { prevScene: this.scene.key }); } },
            { 
                label: 'Return to Hub', 
                action: () => {
                    this.closeMenuBox();
                    this.scene.scene.stop(this.scene.key);
                    this.scene.scene.start('MainHub');
                } 
            }
        ];

        const optionHeight = 60 * scaleFactor;
        const startY = baseY - 20 * scaleFactor;

        options.forEach((opt, idx) => {
            const optY = startY + idx * optionHeight;
            
            // Enhanced option background using main menu colors
            const optBg = this.scene.add.graphics();
            optBg.fillStyle(0x222244, 0.8);  // Same as main menu button background
            optBg.fillRoundedRect(
                baseX - (boxWidth - 60 * scaleFactor) / 2,
                optY - 22 * scaleFactor,
                boxWidth - 60 * scaleFactor,
                44 * scaleFactor,
                8 * scaleFactor
            );
            
            optBg.lineStyle(2 * scaleFactor, 0xffffcc, 0.8);  // Light yellow border
            optBg.strokeRoundedRect(
                baseX - (boxWidth - 60 * scaleFactor) / 2,
                optY - 22 * scaleFactor,
                boxWidth - 60 * scaleFactor,
                44 * scaleFactor,
                8 * scaleFactor
            );

            optBg.setDepth(1001);
            this.menuBoxGroup.add(optBg);

            // Enhanced option text using main menu colors
            const optText = this.scene.add.text(
                baseX,
                optY,
                opt.label,
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: `${Math.round(18 * scaleFactor)}px`,
                    color: '#ffff00',  // Bright yellow like main menu
                    stroke: '#000000',  // Black stroke
                    strokeThickness: 2 * scaleFactor
                }
            ).setOrigin(0.5)
             .setInteractive({ useHandCursor: true })
             .on('pointerdown', opt.action)
             .on('pointerover', () => {
                 optText.setColor('#ffffff');  // White on hover like main menu
                 optText.setScale(1.05);
                 // Change background to hover color
                 optBg.clear();
                 optBg.fillStyle(0x333388, 1);  // Main menu hover color
                 optBg.fillRoundedRect(
                     baseX - (boxWidth - 60 * scaleFactor) / 2,
                     optY - 22 * scaleFactor,
                     boxWidth - 60 * scaleFactor,
                     44 * scaleFactor,
                     8 * scaleFactor
                 );
                 optBg.lineStyle(3 * scaleFactor, 0xffffcc, 1);
                 optBg.strokeRoundedRect(
                     baseX - (boxWidth - 60 * scaleFactor) / 2,
                     optY - 22 * scaleFactor,
                     boxWidth - 60 * scaleFactor,
                     44 * scaleFactor,
                     8 * scaleFactor
                 );
             })
             .on('pointerout', () => {
                 optText.setColor('#ffff00');  // Back to bright yellow
                 optText.setScale(1);
                 // Reset background
                 optBg.clear();
                 optBg.fillStyle(0x222244, 0.8);
                 optBg.fillRoundedRect(
                     baseX - (boxWidth - 60 * scaleFactor) / 2,
                     optY - 22 * scaleFactor,
                     boxWidth - 60 * scaleFactor,
                     44 * scaleFactor,
                     8 * scaleFactor
                 );
                 optBg.lineStyle(2 * scaleFactor, 0xffffcc, 0.8);
                 optBg.strokeRoundedRect(
                     baseX - (boxWidth - 60 * scaleFactor) / 2,
                     optY - 22 * scaleFactor,
                     boxWidth - 60 * scaleFactor,
                     44 * scaleFactor,
                     8 * scaleFactor
                 );
             })
             .setDepth(1002);

            this.menuBoxGroup.add(optText);

            // Make the entire option area interactive
            const optArea = this.scene.add.rectangle(
                baseX,
                optY,
                boxWidth - 60 * scaleFactor,
                44 * scaleFactor,
                0x000000,
                0
            ).setInteractive({ useHandCursor: true })
             .on('pointerdown', opt.action)
             .setDepth(1001);

            this.menuBoxGroup.add(optArea);
        });

        this.scene.menuOpen = true;
    }

    closeMenuBox() {
        if (this.menuBoxGroup && this.menuBoxGroup.children) {
            this.menuBoxGroup.clear(true, true);
            this.menuBoxGroup = null;
        }
        this.scene.menuOpen = false;
    }
    
    shutdown() {
        if (this.menuBoxGroup && this.menuBoxGroup.children) {
            this.menuBoxGroup.clear(true, true);
            this.menuBoxGroup = null;
        }
        if (this.menuButtonBg) {
            this.menuButtonBg.destroy();
            this.menuButtonBg = null;
        }
        if (this.menuButtonText) {
            this.menuButtonText.destroy();
            this.menuButtonText = null;
        }
        this.scene.scale.off('resize', this.resizeHandler);
    }

    // Method to update HUD content without recreating elements (preserves animations)
    updateHUD() {
        if (!this.hudElements.length) {
            // If HUD doesn't exist, create it
            this.drawHUD();
            return;
        }

        // Check if health changed - if so, need to redraw health display
        const currentHP = this.scene.player.hp;
        const currentHearts = Math.ceil(currentHP / 20);
        
        // Count existing heart sprites to see if health changed
        const existingHearts = this.hudElements.filter(el => 
            el.texture && el.texture.key === 'heart' && el.tint === 0xff4757
        ).length;
        
        // If health changed significantly, redraw the HUD
        if (Math.abs(currentHearts - existingHearts) > 0) {
            this.drawHUD();
            return;
        }

        // Find and update intensity text
        const intensityText = this.hudElements.find(el => 
            el.text && typeof el.text === 'string' && 
            !isNaN(parseInt(el.text)) && parseInt(el.text) > 0
        );
        if (intensityText && intensityText.setText) {
            intensityText.setText(`${this.scene.intensity}`);
        }
        
        // For buffs, check if buff count changed
        const currentBuffCount = this.scene.player.buffs ? this.scene.player.buffs.length : 0;
        const displayedBuffs = this.hudElements.filter(el => 
            el.fillColor !== undefined && el.radius !== undefined
        ).length / 2; // Each buff has 2 elements (glow + icon)
        
        // If buff count changed significantly, redraw HUD
        if (Math.abs(currentBuffCount - displayedBuffs) > 1) {
            this.drawHUD();
        }
    }
}