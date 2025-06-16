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
    }

    _createUI() {
        if (this.carouselIcons.length) {
            this.carouselIcons.forEach(icon => icon.destroy());
            this.carouselIcons = [];
        }
        if (this.carouselHeading) this.carouselHeading.destroy();
        if (this.carouselDesc) this.carouselDesc.destroy();

        const scale = this.getScale();
        const iconCount = this.iconKeys.length;
        this.carouselIndex = Math.floor(iconCount / 2);

        const iconSpacing = (this.config.iconSpacing ?? 220) * scale;
        const iconYOffset = (this.config.iconYOffset ?? 0) * scale;
        const iconToTitleGap = (this.config.iconToTitleGap ?? 100) * scale;
        const iconToDescGap = (this.config.iconToDescGap ?? 50) * scale;

        // FIX: Use fallback values when cameras.main is not available
        let iconCenterX, iconCenterY;
        
        if (this.scene.cameras && this.scene.cameras.main) {
            iconCenterX = this.scene.cameras.main.centerX;
            iconCenterY = this.scene.cameras.main.centerY + iconYOffset;
        } else {
            // Fallback to scale dimensions
            iconCenterX = this.scene.scale.width / 2;
            iconCenterY = this.scene.scale.height / 2 + iconYOffset;
        }

        const headingX = iconCenterX;
        const headingY = iconCenterY + iconToTitleGap + (60 * scale);
        const descX = iconCenterX;
        const descY = headingY + iconToDescGap;

        const smallScale = (this.config.smallScale ?? 0.5) * scale;
        const largeScale = (this.config.largeScale ?? 1.0) * scale;

        const headingStyle = {
            fontFamily: 'Jersey15-Regular',
            fontSize: `${Math.round((this.config.headingStyle?.fontSize ?? 56) * scale)}px`,
            color: this.config.headingStyle?.color || '#222244',
            fontStyle: this.config.headingStyle?.fontStyle || 'bold'
        };
        const descStyle = {
            fontFamily: 'Jersey15-Regular',
            fontSize: `${Math.round((this.config.descStyle?.fontSize ?? 36) * scale)}px`,
            color: this.config.descStyle?.color || '#444466'
        };

        for (let i = 0; i < iconCount; i++) {
            const x = iconCenterX + (i - this.carouselIndex) * iconSpacing;
            const scaleVal = (i === this.carouselIndex) ? largeScale : smallScale;

            const icon = this.scene.add.image(x, iconCenterY, this.iconKeys[i])
                .setScale(scaleVal)
                .setInteractive();

            icon.setTint(i === this.carouselIndex ? 0xffffff : 0x888888);
            icon.setAlpha(i === this.carouselIndex ? 1 : 0.8);

            this.carouselIcons.push(icon);
        }

        this.carouselHeading = this.scene.add.text(headingX, headingY, '', headingStyle).setOrigin(0.5);
        this.carouselDesc = this.scene.add.text(descX, descY, '', descStyle).setOrigin(0.5);

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

            icon.setTint(i === this.carouselIndex ? 0xffffff : 0x888888);
            this.scene.tweens.add({ targets: icon, alpha: i === this.carouselIndex ? 1 : 0.8, duration: 200 });
        });

        this.updateText();
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
                to: this._uiConfig.largeScale + 0.15 * this.getScale()
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
    }

    // Also fix the onResize method to be safer
    onResize() {
        // Use a delayed call to ensure scene is ready
        if (this.scene && this.scene.time) {
            this.scene.time.delayedCall(10, () => {
                this._createUI();
            });
        }
    }

    destroy() {
        if (this.breathingTween) this.breathingTween.stop();
        this.carouselIcons.forEach(icon => icon.destroy());
        if (this.carouselHeading) this.carouselHeading.destroy();
        if (this.carouselDesc) this.carouselDesc.destroy();
        if (this._inputListeners) this._inputListeners.forEach(off => off());
        this.scene.scale.off('resize', this.onResize, this);
    }
}

export default Carousel;
