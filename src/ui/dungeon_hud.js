export class DungeonHUD {
    constructor(scene) {
        this.scene = scene;
        this.hudElements = [];
    }

    drawHUD() {
        // Remove previous HUD elements
        if (this.hudElements.length) {
            this.hudElements.forEach(el => el.destroy());
            this.hudElements = [];
        }

        // Intensity
        const intensityText = this.scene.add.text(16, 16, `Intensity ${this.scene.intensity}`, {
            fontFamily: 'Jersey15-Regular',
            fontSize: '38px',
            color: '#222',
            fontStyle: 'bold'
        }).setDepth(10);
        this.hudElements.push(intensityText);

        // Player HP as heart sprites
        const heartSpacing = 30;
        const heartY = 64;
        const heartXStart = 16;
        for (let i = 0; i < this.scene.player.hp; i++) {
            const heart = this.scene.add.image(heartXStart + i * heartSpacing, heartY, 'heart')
                .setOrigin(0, 0.5)
                .setScale(0.8)
                .setDepth(10);
            this.hudElements.push(heart);
        }

        // Buff icons (max 5 per row)
        const buffSize = 32;
        const buffGap = 8;
        const buffsPerRow = 5;
        let startY = 104;
        let startX = 16;
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
    }
}

export class DungeonMenu {
    constructor(scene) {
        this.scene = scene;
        this.menuBoxGroup = null;
        this.menuButtonBg = null;
        this.menuButtonText = null;
    }

    createMenuButton() {
        const buttonWidth = 120;
        const buttonHeight = 40;
        const margin = 24;
        const buttonX = this.scene.sys.game.config.width - buttonWidth / 2 - margin;
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
                font: '24px Jersey15-Regular',
                fill: '#ffffff',
                padding: { left: 0, right: 0, top: 0, bottom: 0 }
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
        if (this.menuBoxGroup) {
            this.menuBoxGroup.clear(true, true);
        }
        this.menuBoxGroup = this.scene.add.group();

        this.menuDimBg = this.scene.add.rectangle(
            this.scene.sys.game.config.width / 2,
            this.scene.sys.game.config.height / 2,
            this.scene.sys.game.config.width,
            this.scene.sys.game.config.height,
            0x000000,
            0.5
        ).setDepth(1000);
        this.menuBoxGroup.add(this.menuDimBg);

        const boxWidth = 340 * 1.2;
        const boxHeight = 260 * 1.2;
        const baseX = this.scene.sys.game.config.width / 2;
        const baseY = this.scene.sys.game.config.height / 2;

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
            baseY - boxHeight / 2 + 36 * 1.2,
            'Menu',
            {
                font: '38px Jersey15-Regular',
                fill: '#fff'
            }
        ).setOrigin(0.5).setDepth(1002);
        this.menuBoxGroup.add(title);

        const options = [
            { label: 'Back to Dungeon', action: () => this.closeMenuBox() },
            { label: 'Options', action: () => { this.scene.scene.switch('OptionsScene', { prevScene: this.scene.scene.key }); } },
            { label: 'Back to Main Hub', action: () => { this.closeMenuBox(); this.scene.scene.start('MainHub'); } }
        ];

        const optionHeight = 54 * 1.2;
        options.forEach((opt, idx) => {
            const optY = baseY - 30 * 1.2 + idx * optionHeight;
            const optBg = this.scene.add.rectangle(
                baseX,
                optY,
                (boxWidth - 48 * 1.2),
                44 * 1.2,
                0x000000,
                0.7
            ).setStrokeStyle(2, 0xffffff).setDepth(1001);
            this.menuBoxGroup.add(optBg);

            const optText = this.scene.add.text(
                baseX,
                optY,
                opt.label,
                {
                    font: '29px Jersey15-Regular',
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
        if (this.menuBoxGroup) {
            this.menuBoxGroup.clear(true, true);
            this.menuBoxGroup = null;
        }
        this.scene.menuOpen = false;
    }

    shutdown() {
        if (this.menuBoxGroup) {
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
    }
}