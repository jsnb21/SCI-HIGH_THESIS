import { seVolume } from '../audioUtils.js';

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
        this._selecting = false; // Add debounce flag

        this.scene.scale.on('resize', this.onResize, this);
    }

    getScale() {
        const { width, height } = this.scene.scale;
        return Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    }    create(iconKeys, iconInfo, onSelectCallback = null, lockedStates = null) {
        this.iconKeys = iconKeys;
        this.iconInfo = iconInfo;
        this.onSelectCallback = onSelectCallback;
        this.lockedStates = lockedStates || iconKeys.map(() => false); // Default all unlocked
        this._createUI();
        return this;
    }

    _createUI() {
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
        this.carouselIndex = 0; // Always start with the first icon (Web Design)

        const iconSpacing = (this.config.iconSpacing ?? 220) * scale;
        const iconYOffset = (this.config.iconYOffset ?? 0) * scale;
        const iconToTitleGap = (this.config.iconToTitleGap ?? 120) * scale; // Increased from 100 to 120
        const iconToDescGap = (this.config.iconToDescGap ?? 70) * scale; // Increased from 50 to 70

        let iconCenterX, iconCenterY;
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
        const headingY = iconCenterY + iconToTitleGap + (40 * scale); // Reduced from 60 to 40
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
        };        for (let i = 0; i < iconCount; i++) {
            // Calculate relative position to center the carousel properly
            let relativePos = i - this.carouselIndex;
            if (relativePos > Math.floor(iconCount / 2)) relativePos -= iconCount;
            else if (relativePos < -Math.floor(iconCount / 2)) relativePos += iconCount;
            
            const x = iconCenterX + relativePos * iconSpacing;
            const scaleVal = (i === this.carouselIndex) ? largeScale : smallScale;
            const isLocked = this.lockedStates[i];

            const icon = this.scene.add.image(x, iconCenterY, this.iconKeys[i])
                .setScale(scaleVal)
                .setInteractive({ useHandCursor: !isLocked });

            // Store the icon index for event handling
            icon.iconIndex = i;

            // Apply different visual states for locked/unlocked courses
            if (isLocked) {
                icon.setTint(0x666666); // Dark gray for locked
                icon.setAlpha(0.4);
                  // Add lock overlay for locked courses
                const lockIcon = this.scene.add.text(x, iconCenterY, '🔒', {
                    fontSize: `${Math.round(48 * scale)}px`, // Increased from 24 to 48
                    color: '#ff6666'
                }).setOrigin(0.5).setDepth(10);
                lockIcon.iconIndex = i; // Store the course index for this lock
                lockIcon.isLockIcon = true; // Mark as lock icon
                this.carouselIcons.push(lockIcon);
            } else {
                icon.setTint(i === this.carouselIndex ? 0xffffff : 0x00e0ff);
                icon.setAlpha(i === this.carouselIndex ? 1 : 0.7);
            }

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
        });        this.carouselIcons.forEach((icon, arrayIndex) => {
            // Skip lock icons
            if (icon.isLockIcon) return;
            
            const i = icon.iconIndex;
            if (i === undefined) return;
            
            const isLocked = this.lockedStates[i];
            
            icon.removeAllListeners();
            
            if (!isLocked) {
                icon.on('pointerover', () => {
                    icon.setTint(0xffffff);
                    icon.setAlpha(1);
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
            } else {
                // Show locked message when clicking locked courses
                icon.on('pointerdown', () => {
                    this.showLockedMessage(i);
                });
            }
        });

        this._inputListeners = [
            () => leftListener.removeListener('keydown-LEFT'),
            () => rightListener.removeListener('keydown-RIGHT'),
            () => pointerUpListener.removeListener('pointerup'),
            () => wheelListener.removeListener('wheel')
        ];
    }    move(direction) {
        if (!this._uiConfig) return;
        const iconCount = this.iconKeys.length; // Use iconKeys length instead of carouselIcons
        let newIndex = (this.carouselIndex + direction + iconCount) % iconCount;
        this.carouselIndex = newIndex;

        const { iconCenterX, iconCenterY, iconSpacing, smallScale, largeScale } = this._uiConfig;

        this.carouselIcons.forEach((icon) => {
            // Skip lock icons - they move with their parent icons
            if (icon.isLockIcon) return;
            
            const i = icon.iconIndex;
            if (i === undefined) return;
            
            let relativePos = i - this.carouselIndex;
            if (relativePos > Math.floor(iconCount / 2)) relativePos -= iconCount;
            else if (relativePos < -Math.floor(iconCount / 2)) relativePos += iconCount;

            const x = iconCenterX + relativePos * iconSpacing;
            const y = iconCenterY;
            const scaleVal = (i === this.carouselIndex) ? largeScale : smallScale;

            this.scene.tweens.add({ targets: icon, x, y, scale: scaleVal, duration: 300, ease: 'Power2' });

            const isLocked = this.lockedStates[i];
            if (isLocked) {
                icon.setTint(0x666666);
                this.scene.tweens.add({ targets: icon, alpha: 0.4, duration: 200 });
            } else {
                icon.setTint(i === this.carouselIndex ? 0xffffff : 0x00e0ff);
                this.scene.tweens.add({ targets: icon, alpha: i === this.carouselIndex ? 1 : 0.7, duration: 200 });
            }
        });        // Update lock icons positions
        this.carouselIcons.forEach((lockIcon) => {
            if (!lockIcon.isLockIcon) return;
            
            const i = lockIcon.iconIndex;
            if (i === undefined) return;
            
            let relativePos = i - this.carouselIndex;
            if (relativePos > Math.floor(iconCount / 2)) relativePos -= iconCount;
            else if (relativePos < -Math.floor(iconCount / 2)) relativePos += iconCount;
            
            const x = iconCenterX + relativePos * iconSpacing;
            this.scene.tweens.add({ targets: lockIcon, x, y: iconCenterY, duration: 300, ease: 'Power2' });
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
    }    updateText() {
        const info = this.iconInfo[this.carouselIndex];
        const isLocked = this.lockedStates[this.carouselIndex];
        
        this.carouselHeading.setText(isLocked ? `🔒 ${info.heading}` : info.heading);
        this.carouselDesc.setText(isLocked ? "Complete other courses to unlock" : info.desc);
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
                to: this._uiConfig.largeScale + 0.03 * this.getScale()
            },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    showLockedMessage(courseIndex) {
        const courseName = this.iconInfo[courseIndex]?.heading || "Course";
        // You can customize this message or create a proper dialog
        console.log(`${courseName} is locked! Complete other courses to unlock it.`);
        // Optionally add a visual feedback or sound effect
    }

    selectCurrentItem() {
        // Prevent rapid clicking/selection
        if (this._selecting) {
            return;
        }
        
        const currentItem = this.iconInfo[this.carouselIndex];
        const isLocked = this.lockedStates[this.carouselIndex];
        
        if (isLocked) {
            this.showLockedMessage(this.carouselIndex);
            return;
        }
        
        if (this.onSelectCallback && currentItem) {
            this._selecting = true;
            
            // Reset the selecting flag after a short delay
            this.scene.time.delayedCall(500, () => {
                this._selecting = false;
            });
            
            this.onSelectCallback(currentItem, this.carouselIndex);
        }
    }

    playHoverSound() {
        if (this.scene[this.config.sounds?.hover]) {
            this.scene[this.config.sounds.hover].setVolume(seVolume);
            this.scene[this.config.sounds.hover].play();
        }
    }

    playConfirmSound() {
        if (this.scene[this.config.sounds?.confirm]) {
            this.scene[this.config.sounds.confirm].setVolume(seVolume);
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

    onResize() {
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

    setInteractive(enabled) {
        // Store the current state to restore later if needed
        this._interactiveState = enabled;

        // Enable/disable all icons
        this.carouselIcons.forEach(icon => {
            if (!icon.isLockIcon) {
                if (enabled) {
                    icon.setInteractive({ useHandCursor: !this.lockedStates[icon.iconIndex] });
                } else {
                    icon.disableInteractive();
                }
            }
        });

        // Enable/disable arrow controls
        if (this.leftArrow) {
            if (enabled) {
                this.leftArrow.setInteractive({ useHandCursor: true });
            } else {
                this.leftArrow.disableInteractive();
            }
        }

        if (this.rightArrow) {
            if (enabled) {
                this.rightArrow.setInteractive({ useHandCursor: true });
            } else {
                this.rightArrow.disableInteractive();
            }
        }

        // Disable keyboard input listeners if needed
        if (this._inputListeners) {
            this._inputListeners.forEach(listener => {
                listener.enabled = enabled;
            });
        }
    }
}

export default Carousel;
