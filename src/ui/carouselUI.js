const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

class Carousel {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = config;
        this.carouselIndex = 0;
        this.carouselIcons = [];
        this.breathingTween = null;
        this.iconInfo = [];
        this.onSelectCallback = null;
        this.bgPanel = null;
        this.leftArrow = null;
        this.rightArrow = null;

        this.scene.scale.on('resize', this.onResize, this);
    }

    getScale() {
        const { width, height } = this.scene.scale;
        return Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    }

    create(iconKeys, iconInfo, onSelectCallback = null) {
        this.iconKeys = iconKeys;
        this.iconInfo = iconInfo;
        this.onSelectCallback = onSelectCallback;
        this._createUI();
        return this;
    }    _createUI() {
        // Clean up existing elements and listeners
        if (this._inputListeners) {
            this._inputListeners.forEach(off => off());
            this._inputListeners = [];
        }
        if (this.bgPanel) this.bgPanel.destroy();
        if (this.carouselIcons.length) {
            this.carouselIcons.forEach(icon => icon.destroy());
            this.carouselIcons = [];
        }
        if (this.carouselHeading) this.carouselHeading.destroy();
        if (this.carouselDesc) this.carouselDesc.destroy();
        if (this.leftArrow) this.leftArrow.destroy();
        if (this.rightArrow) this.rightArrow.destroy();
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween = null;
        }

        const scale = this.getScale();
        const iconCount = this.iconKeys.length;
        this.carouselIndex = Math.floor(iconCount / 2);

        const iconSpacing = (this.config.iconSpacing ?? 220) * scale;
        const iconYOffset = (this.config.iconYOffset ?? 0) * scale;
        const iconToTitleGap = (this.config.iconToTitleGap ?? 100) * scale;
        const iconToDescGap = (this.config.iconToDescGap ?? 50) * scale;        let iconCenterX, iconCenterY;
        if (this.scene.cameras && this.scene.cameras.main) {
            iconCenterX = this.scene.cameras.main.centerX;
            iconCenterY = this.scene.cameras.main.centerY + iconYOffset;
        } else {
            iconCenterX = this.scene.scale.width / 2;
            iconCenterY = this.scene.scale.height / 2 + iconYOffset;
        }

        // Use camera width for true full-screen coverage
        const { width, height } = this.scene.scale;
        const actualWidth = this.scene.cameras ? this.scene.cameras.main.width : width;
        const panelWidth = actualWidth + 10; // Add extra pixels to ensure full coverage
        const panelHeight = 340 * scale;

        // Removed black dimmed shadow rectangle beneath the background panel
        this.bgPanel = this.scene.add.graphics();
        this.bgPanel.fillStyle(0x23233a, 0.92);
        this.bgPanel.fillRoundedRect(
            -5, // Start slightly before left edge to ensure full coverage
            iconCenterY - panelHeight / 2,
            panelWidth,
            panelHeight,
            0 // No rounded corners for full width
        );
        // Removed cyan border
        this.bgPanel.setDepth(-1);

        const headingX = iconCenterX;
        const headingY = iconCenterY + iconToTitleGap + (60 * scale);
        const descX = iconCenterX;
        const descY = headingY + iconToDescGap;

        const smallScale = (this.config.smallScale ?? 0.5) * scale;
        const largeScale = (this.config.largeScale ?? 1.0) * scale;

        const headingStyle = {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${Math.round((this.config.headingStyle?.fontSize ?? 56) * scale)}px`,
            color: '#ffe066',
            fontStyle: this.config.headingStyle?.fontStyle || 'bold',
            stroke: '#111122',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 12, fill: true }
        };

        const descStyle = {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${Math.round((this.config.descStyle?.fontSize ?? 36) * scale)}px`,
            color: this.config.descStyle?.color || '#e0e0ff',
            stroke: '#111122',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 8, fill: true }
        };

        for (let i = 0; i < iconCount; i++) {
            const x = iconCenterX + (i - this.carouselIndex) * iconSpacing;
            const scaleVal = (i === this.carouselIndex) ? largeScale : smallScale;

            const icon = this.scene.add.image(x, iconCenterY, this.iconKeys[i])
                .setScale(scaleVal)
                .setInteractive({ useHandCursor: true });

            icon.setTint(i === this.carouselIndex ? 0xffffff : 0x00e0ff);
            icon.setAlpha(i === this.carouselIndex ? 1 : 0.7);

            this.carouselIcons.push(icon);
        }

        this.carouselHeading = this.scene.add.text(headingX, headingY, '', headingStyle).setOrigin(0.5);
        this.carouselDesc = this.scene.add.text(descX, descY, '', descStyle).setOrigin(0.5);

        const arrowSize = 54 * scale;
        this.leftArrow = this.scene.add.text(
            iconCenterX - panelWidth / 2 + arrowSize * 0.7,
            iconCenterY,
            '◀',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${arrowSize}px`,
                color: '#00e0ff',
                stroke: '#111122',
                strokeThickness: 6,
                shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 8, fill: true }
            }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
        this.leftArrow.on('pointerdown', () => {
            this.playHoverSound();
            this.move(-1);
        });

        this.rightArrow = this.scene.add.text(
            iconCenterX + panelWidth / 2 - arrowSize * 0.7,
            iconCenterY,
            '▶',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${arrowSize}px`,
                color: '#00e0ff',
                stroke: '#111122',
                strokeThickness: 6,
                shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 8, fill: true }
            }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
        this.rightArrow.on('pointerdown', () => {
            this.playHoverSound();
            this.move(1);
        });

        this.carouselHeading.setAlpha(0);
        this.carouselDesc.setAlpha(0);
        this.scene.tweens.add({ targets: [this.carouselHeading, this.carouselDesc], alpha: 1, duration: 400, ease: 'Quad.easeOut' });

        this.updateText();
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
        this.setupControls(scale, iconCenterX, iconCenterY, iconSpacing, smallScale, largeScale);

        this._uiConfig = {
            iconCenterX, iconCenterY, iconSpacing, smallScale, largeScale,
            headingX, headingY, descX, descY, headingStyle, descStyle
        };
    }

    setupControls(scale, centerX, centerY, spacing, smallScale, largeScale) {
        if (this._inputListeners) this._inputListeners.forEach(off => off());
        this._inputListeners = [];

        const leftListener = this.scene.input.keyboard.on('keydown-LEFT', () => {
            this.playHoverSound();
            this.move(-1);
        });
        const rightListener = this.scene.input.keyboard.on('keydown-RIGHT', () => {
            this.playHoverSound();
            this.move(1);
        });

        const pointerUpListener = this.scene.input.on('pointerup', (pointer) => {
            if (this.dragDistance > 50) {
                this.move(this.dragDirection);
            }
        });

        const wheelListener = this.scene.input.on('wheel', (_, __, ___, deltaY) => {
            this.playHoverSound();
            this.move(deltaY > 0 ? 1 : -1);
        });

        this.carouselIcons.forEach((icon, i) => {
            icon.removeAllListeners();
            icon.on('pointerover', () => {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
                this.scene.tweens.add({ targets: icon, scale: this._uiConfig.largeScale * 1.08, duration: 120, yoyo: true });
            });
            icon.on('pointerout', () => {
                icon.setTint(i === this.carouselIndex ? 0xffffff : 0x00e0ff);
                icon.setAlpha(i === this.carouselIndex ? 1 : 0.7);
            });
            icon.on('pointerdown', () => {
                if (i === this.carouselIndex) {
                    this.playConfirmSound();
                    this.selectCurrentItem();
                } else {
                    this.playHoverSound();
                    this.move(i - this.carouselIndex);
                }
            });
        });

        this._inputListeners = [
            () => leftListener.removeListener('keydown-LEFT'),
            () => rightListener.removeListener('keydown-RIGHT'),
            () => pointerUpListener.removeListener('pointerup'),
            () => wheelListener.removeListener('wheel')
        ];
    }

    move(direction) {
        if (!this._uiConfig) return;
        const iconCount = this.carouselIcons.length;
        let newIndex = (this.carouselIndex + direction + iconCount) % iconCount;
        this.carouselIndex = newIndex;

        const { iconCenterX, iconCenterY, iconSpacing, smallScale, largeScale } = this._uiConfig;

        this.carouselIcons.forEach((icon, i) => {
            let relativePos = i - this.carouselIndex;
            if (relativePos > Math.floor(iconCount / 2)) relativePos -= iconCount;
            else if (relativePos < -Math.floor(iconCount / 2)) relativePos += iconCount;

            const x = iconCenterX + relativePos * iconSpacing;
            const y = iconCenterY;
            const scaleVal = (i === this.carouselIndex) ? largeScale : smallScale;

            this.scene.tweens.add({ targets: icon, x, y, scale: scaleVal, duration: 300, ease: 'Power2' });

            icon.setTint(i === this.carouselIndex ? 0xffffff : 0x00e0ff);
            this.scene.tweens.add({ targets: icon, alpha: i === this.carouselIndex ? 1 : 0.7, duration: 200 });
        });

        this.scene.tweens.add({
            targets: [this.carouselHeading, this.carouselDesc],
            alpha: 0,
            duration: 100,
            onComplete: () => {
                this.updateText();
                this.scene.tweens.add({
                    targets: [this.carouselHeading, this.carouselDesc],
                    alpha: 1,
                    duration: 180
                });
            }
        });

        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateText() {
        const info = this.iconInfo[this.carouselIndex];
        this.carouselHeading.setText(info.heading);
        this.carouselDesc.setText(info.desc);
    }

    startBreathingEffect(icon) {
        if (!this._uiConfig) return;

        if (this.breathingTween) {
            this.breathingTween.stop();
            icon.setScale(this._uiConfig.largeScale);
        }

        this.breathingTween = this.scene.tweens.add({
            targets: icon,
            scale: {
                from: this._uiConfig.largeScale,
                to: this._uiConfig.largeScale + 0.13 * this.getScale()
            },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    selectCurrentItem() {
        const currentItem = this.iconInfo[this.carouselIndex];
        if (this.onSelectCallback) {
            this.onSelectCallback(currentItem, this.carouselIndex);
        }
    }

    playHoverSound() {
        if (this.scene[this.config.sounds?.hover]) {
            this.scene[this.config.sounds.hover].play();
        }
    }

    playConfirmSound() {
        if (this.scene[this.config.sounds?.confirm]) {
            this.scene[this.config.sounds.confirm].play();
        }
    }

    getCurrentItem() {
        return this.iconInfo[this.carouselIndex];
    }

    getCurrentIndex() {
        return this.carouselIndex;
    }

    setIndex(index) {
        if (index >= 0 && index < this.carouselIcons.length) {
            const direction = index - this.carouselIndex;
            this.move(direction);
        }
    }    onResize() {
        // Disable automatic resize to prevent conflicts with scene resize
        // The scene will handle recreating the carousel when needed
        return;
    }

    destroy() {
        if (this.breathingTween) this.breathingTween.stop();
        if (this.bgPanel) this.bgPanel.destroy();
        this.carouselIcons.forEach(icon => icon.destroy());
        if (this.carouselHeading) this.carouselHeading.destroy();
        if (this.carouselDesc) this.carouselDesc.destroy();
        if (this.leftArrow) this.leftArrow.destroy();
        if (this.rightArrow) this.rightArrow.destroy();
        if (this._inputListeners) this._inputListeners.forEach(off => off());
        this.scene.scale.off('resize', this.onResize, this);
    }
}

export default Carousel;
