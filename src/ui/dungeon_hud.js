export class DungeonHUD {
    constructor(scene) {
        this.scene = scene;
        this.hudElements = [];
        this.resizeHandler = () => this.drawHUD();
        this.scene.scale.on('resize', this.resizeHandler);
    }

    drawHUD() {
        if (this.hudElements.length) {
            this.hudElements.forEach(el => el.destroy());
            this.hudElements = [];
        }

        const { width, height } = this.scene.scale;
        const scaleFactor = Math.min(width / 816, height / 624);

        const intensityText = this.scene.add.text(
            16 * scaleFactor,
            16 * scaleFactor,
            `Intensity ${this.scene.intensity}`,
            {
                fontFamily: 'Jersey15-Regular',
                fontSize: `${Math.round(38 * scaleFactor)}px`,
                color: '#222',
                fontStyle: 'bold'
            }
        ).setDepth(10);
        this.hudElements.push(intensityText);

        const heartSpacing = 30 * scaleFactor;
        const heartY = 64 * scaleFactor;
        const heartXStart = 16 * scaleFactor;
        for (let i = 0; i < this.scene.player.hp; i++) {
            const heart = this.scene.add.image(
                heartXStart + i * heartSpacing,
                heartY,
                'heart'
            )
                .setOrigin(0, 0.5)
                .setScale(0.8 * scaleFactor)
                .setDepth(10);
            this.hudElements.push(heart);
        }

        const buffSize = 32 * scaleFactor;
        const buffGap = 8 * scaleFactor;
        const buffsPerRow = 5;
        let startY = 104 * scaleFactor;
        let startX = 16 * scaleFactor;
        for (let i = 0; i < this.scene.player.buffs.length; i++) {
            const row = Math.floor(i / buffsPerRow);
            const col = i % buffsPerRow;
            const buff = this.scene.add.graphics().setDepth(10);
            buff.fillStyle(0x3399ff, 1);
            buff.fillCircle(
                startX + col * (buffSize + buffGap) + buffSize / 2,
                startY + row * (buffSize + buffGap) + buffSize / 2,
                buffSize / 2
            );
            this.hudElements.push(buff);
        }
    }

    shutdown() {
        if (this.hudElements && this.hudElements.length) {
            this.hudElements.forEach(el => el.destroy());
            this.hudElements = [];
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
    }

    redrawMenuButton() {
        if (this.menuButtonBg) this.menuButtonBg.destroy();
        if (this.menuButtonText) this.menuButtonText.destroy();

        const { width, height } = this.scene.scale;
        const scaleFactor = Math.min(width / 816, height / 624);

        const buttonWidth = 120 * scaleFactor;
        const buttonHeight = 40 * scaleFactor;
        const margin = 24 * scaleFactor;
        const buttonX = width - buttonWidth / 2 - margin;
        const buttonY = buttonHeight / 2 + margin;

        this.menuButtonBg = this.scene.add.rectangle(
            buttonX,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x000000,
            0.7
        ).setStrokeStyle(2, 0xffffff);

        this.menuButtonText = this.scene.add.text(
            buttonX,
            buttonY,
            'Menu',
            {
                font: `${Math.round(24 * scaleFactor)}px Jersey15-Regular`,
                fill: '#ffffff'
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => this.showMenuBox());

        this.menuButtonBg.setInteractive(
            new Phaser.Geom.Rectangle(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => this.showMenuBox());

        if (!this.scene.persistentElements) this.scene.persistentElements = [];
        this.scene.persistentElements.push(this.menuButtonBg, this.menuButtonText);
    }

    showMenuBox() {
        if (this.menuBoxGroup && this.menuBoxGroup.children) {
            this.menuBoxGroup.clear(true, true);
        }
        this.menuBoxGroup = this.scene.add.group();

        const { width, height } = this.scene.scale;
        const scaleFactor = Math.min(width / 816, height / 624);

        this.menuDimBg = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.5
        ).setDepth(1000);
        this.menuBoxGroup.add(this.menuDimBg);

        const boxWidth = 340 * 1.2 * scaleFactor;
        const boxHeight = 260 * 1.2 * scaleFactor;
        const baseX = width / 2;
        const baseY = height / 2;

        const menuBoxBg = this.scene.add.rectangle(
            baseX,
            baseY,
            boxWidth,
            boxHeight,
            0x222244,
            0.92
        ).setStrokeStyle(4, 0xffffcc, 1).setDepth(1001);
        this.menuBoxGroup.add(menuBoxBg);

        const title = this.scene.add.text(
            baseX,
            baseY - boxHeight / 2 + 36 * 1.2 * scaleFactor,
            'Menu',
            {
                font: `${Math.round(38 * scaleFactor)}px Jersey15-Regular`,
                fill: '#fff'
            }
        ).setOrigin(0.5).setDepth(1002);
        this.menuBoxGroup.add(title);

        const options = [
            { label: 'Back to Dungeon', action: () => this.closeMenuBox() },
            { label: 'Options', action: () => { this.scene.scene.switch('OptionsScene', { prevScene: this.scene.key }); } },
            { 
                label: 'Back to Main Hub', 
                action: () => {
                    this.closeMenuBox();
                    this.scene.scene.stop(this.scene.key);
                    this.scene.scale.resize(816, 624);
                    const canvas = this.scene.game.canvas;
                    canvas.style.width = `816px`;
                    canvas.style.height = `624px`;
                    this.scene.scene.start('MainHub');
                } 
            }
        ];

        const optionHeight = 54 * 1.2 * scaleFactor;
        options.forEach((opt, idx) => {
            const optY = baseY - 30 * 1.2 * scaleFactor + idx * optionHeight;
            const optBg = this.scene.add.rectangle(
                baseX,
                optY,
                (boxWidth - 48 * 1.2 * scaleFactor),
                44 * 1.2 * scaleFactor,
                0x000000,
                0.7
            ).setStrokeStyle(2, 0xffffff).setDepth(1001);
            this.menuBoxGroup.add(optBg);

            const optText = this.scene.add.text(
                baseX,
                optY,
                opt.label,
                {
                    font: `${Math.round(29 * scaleFactor)}px Jersey15-Regular`,
                    fill: '#fff'
                }
            ).setOrigin(0.5)
             .setInteractive({ useHandCursor: true })
             .on('pointerdown', opt.action)
             .setDepth(1002);

            this.menuBoxGroup.add(optText);

            optBg.setInteractive().on('pointerdown', opt.action);
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
}