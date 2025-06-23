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

        // Main HUD panel with gradient and border
        this.hudBackground = this.scene.add.graphics();
        
        // Dark gradient background
        this.hudBackground.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 1);
        this.hudBackground.fillRoundedRect(margin, margin, panelWidth, panelHeight, 12 * scaleFactor);
        
        // Glowing border effect
        this.hudBackground.lineStyle(3 * scaleFactor, 0x4a5568, 0.8);
        this.hudBackground.strokeRoundedRect(margin, margin, panelWidth, panelHeight, 12 * scaleFactor);
        
        // Inner glow
        this.hudBackground.lineStyle(1 * scaleFactor, 0x63b3ed, 0.4);
        this.hudBackground.strokeRoundedRect(
            margin + 2 * scaleFactor, 
            margin + 2 * scaleFactor, 
            panelWidth - 4 * scaleFactor, 
            panelHeight - 4 * scaleFactor, 
            10 * scaleFactor
        );

        // Corner decorative elements
        const cornerSize = 8 * scaleFactor;
        this.hudBackground.fillStyle(0xffd700, 0.6);
        
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
        const textY = margin + 24 * scaleFactor;        // Title with shadow effect
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
                color: '#ffd700',
                stroke: '#2d3748',
                strokeThickness: 2 * scaleFactor
            }
        ).setDepth(10);
        this.hudElements.push(titleText);

        // Intensity value with glow effect
        const intensityValue = this.scene.add.text(
            margin + 220 * scaleFactor,
            textY,
            `${this.scene.intensity}`,
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(32 * scaleFactor)}px`,
                color: '#00ff88',
                stroke: '#1a1a2e',
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
        const heartXStart = margin + 20 * scaleFactor;for (let i = 0; i < 5; i++) { // Show max 5 hearts
            const heartX = heartXStart + i * heartSpacing;
            
            if (i < this.scene.player.hp) {                // Active heart without glow circle
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

        // Buffs title
        const buffsTitle = this.scene.add.text(
            margin + 20 * scaleFactor,
            buffsY,
            'BUFFS',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(14 * scaleFactor)}px`,
                color: '#9f7aea',
                stroke: '#2d3748',
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

            // Buff background glow
            const buffGlow = this.scene.add.circle(buffX, buffY, buffSize / 2 + 2, 0x9f7aea, 0.4);
            buffGlow.setDepth(9);
            this.hudElements.push(buffGlow);

            // Buff icon
            const buff = this.scene.add.graphics().setDepth(10);
            buff.fillStyle(0x9f7aea, 1);
            buff.fillCircle(buffX, buffY, buffSize / 2);
            
            // Inner highlight
            buff.fillStyle(0xd69e2e, 0.8);
            buff.fillCircle(buffX, buffY - 2 * scaleFactor, buffSize / 3);

            this.hudElements.push(buff);

            // Add floating animation
            this.scene.tweens.add({
                targets: [buffGlow, buff],
                y: buffY - 3 * scaleFactor,
                duration: 1000 + i * 200,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }
    }

    createMysticalElements(scaleFactor) {
        const margin = 16 * scaleFactor;
        
        // Add floating mystical particles around the HUD
        for (let i = 0; i < 5; i++) {
            const particle = this.scene.add.circle(
                margin + Phaser.Math.Between(20, 260) * scaleFactor,
                margin + Phaser.Math.Between(20, 160) * scaleFactor,
                1 * scaleFactor,
                0xffd700,
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

        // Enhanced menu button without glow circle
        // Gradient background using graphics
        this.menuButtonBg = this.scene.add.graphics();
        this.menuButtonBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 1);
        this.menuButtonBg.fillRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            8 * scaleFactor
        );
        
        // Glowing border
        this.menuButtonBg.lineStyle(3 * scaleFactor, 0x63b3ed, 0.8);
        this.menuButtonBg.strokeRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            8 * scaleFactor
        );

        // Inner highlight
        this.menuButtonBg.lineStyle(1 * scaleFactor, 0xffd700, 0.6);
        this.menuButtonBg.strokeRoundedRect(
            buttonX - buttonWidth / 2 + 2 * scaleFactor,
            buttonY - buttonHeight / 2 + 2 * scaleFactor,
            buttonWidth - 4 * scaleFactor,
            buttonHeight - 4 * scaleFactor,
            6 * scaleFactor
        );

        this.menuButtonBg.setDepth(9);

        // Enhanced menu text
        this.menuButtonText = this.scene.add.text(
            buttonX,
            buttonY,
            'MENU',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(20 * scaleFactor)}px`,
                color: '#ffd700',
                stroke: '#1a1a2e',
                strokeThickness: 2 * scaleFactor
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => this.showMenuBox())
         .on('pointerover', () => {
             this.menuButtonText.setScale(1.1);
         })
         .on('pointerout', () => {
             this.menuButtonText.setScale(1);
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
         })
         .on('pointerout', () => {
             this.menuButtonText.setScale(1);
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

        // Enhanced menu box with gradient and glow
        const menuBoxBg = this.scene.add.graphics();
        
        // Outer glow
        menuBoxBg.fillStyle(0x63b3ed, 0.2);
        menuBoxBg.fillRoundedRect(
            baseX - boxWidth / 2 - 8 * scaleFactor,
            baseY - boxHeight / 2 - 8 * scaleFactor,
            boxWidth + 16 * scaleFactor,
            boxHeight + 16 * scaleFactor,
            20 * scaleFactor
        );

        // Main background gradient
        menuBoxBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3748, 0x2d3748, 0.95);
        menuBoxBg.fillRoundedRect(
            baseX - boxWidth / 2,
            baseY - boxHeight / 2,
            boxWidth,
            boxHeight,
            16 * scaleFactor
        );

        // Border and highlights
        menuBoxBg.lineStyle(4 * scaleFactor, 0x63b3ed, 0.8);
        menuBoxBg.strokeRoundedRect(
            baseX - boxWidth / 2,
            baseY - boxHeight / 2,
            boxWidth,
            boxHeight,
            16 * scaleFactor
        );

        // Inner highlight
        menuBoxBg.lineStyle(2 * scaleFactor, 0xffd700, 0.4);
        menuBoxBg.strokeRoundedRect(
            baseX - boxWidth / 2 + 4 * scaleFactor,
            baseY - boxHeight / 2 + 4 * scaleFactor,
            boxWidth - 8 * scaleFactor,
            boxHeight - 8 * scaleFactor,
            12 * scaleFactor
        );

        menuBoxBg.setDepth(1001);
        this.menuBoxGroup.add(menuBoxBg);

        // Enhanced title with shadow
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
                color: '#ffd700',
                stroke: '#1a1a2e',
                strokeThickness: 3 * scaleFactor
            }
        ).setOrigin(0.5).setDepth(1002);
        this.menuBoxGroup.add(title);

        const options = [
            { label: 'Continue Adventure', action: () => this.closeMenuBox() },
            { label: 'Game Options', action: () => { this.scene.scene.switch('OptionsScene', { prevScene: this.scene.key }); } },            { 
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
            
            // Enhanced option background
            const optBg = this.scene.add.graphics();
            optBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 0.8);
            optBg.fillRoundedRect(
                baseX - (boxWidth - 60 * scaleFactor) / 2,
                optY - 22 * scaleFactor,
                boxWidth - 60 * scaleFactor,
                44 * scaleFactor,
                8 * scaleFactor
            );
            
            optBg.lineStyle(2 * scaleFactor, 0x4a5568, 0.8);
            optBg.strokeRoundedRect(
                baseX - (boxWidth - 60 * scaleFactor) / 2,
                optY - 22 * scaleFactor,
                boxWidth - 60 * scaleFactor,
                44 * scaleFactor,
                8 * scaleFactor
            );

            optBg.setDepth(1001);
            this.menuBoxGroup.add(optBg);

            // Enhanced option text
            const optText = this.scene.add.text(
                baseX,
                optY,
                opt.label,
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: `${Math.round(18 * scaleFactor)}px`,
                    color: '#ffffff',
                    stroke: '#1a1a2e',
                    strokeThickness: 2 * scaleFactor
                }
            ).setOrigin(0.5)
             .setInteractive({ useHandCursor: true })
             .on('pointerdown', opt.action)
             .on('pointerover', () => {
                 optText.setColor('#ffd700');
                 optText.setScale(1.05);
                 // Add glow effect to background
                 optBg.lineStyle(3 * scaleFactor, 0x63b3ed, 0.8);
                 optBg.strokeRoundedRect(
                     baseX - (boxWidth - 60 * scaleFactor) / 2,
                     optY - 22 * scaleFactor,
                     boxWidth - 60 * scaleFactor,
                     44 * scaleFactor,
                     8 * scaleFactor
                 );
             })
             .on('pointerout', () => {
                 optText.setColor('#ffffff');
                 optText.setScale(1);
                 // Reset background
                 optBg.clear();
                 optBg.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a1a2e, 0x1a1a2e, 0.8);
                 optBg.fillRoundedRect(
                     baseX - (boxWidth - 60 * scaleFactor) / 2,
                     optY - 22 * scaleFactor,
                     boxWidth - 60 * scaleFactor,
                     44 * scaleFactor,
                     8 * scaleFactor
                 );
                 optBg.lineStyle(2 * scaleFactor, 0x4a5568, 0.8);
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
    }    shutdown() {
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
}