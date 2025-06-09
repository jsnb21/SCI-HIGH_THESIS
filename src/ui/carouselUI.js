/*
How To Use:

1. Import the Carousel class:
    import Carousel from './carouselUI.js';

2. Define Carousel Data:
    const iconKeys = ['Web_Design', 'Python'];
    const iconInfo = [
        { heading: "Web Design", desc: "Learn HTML, CSS &JavaScript" },
        { heading: "Python", desc: "Learn Python" },
        Add more if needed
    ];

3. Create the carousel function:
    createCarousel(iconKeys, iconInfo) {
        // Initialize the carousel
        this.carousel = new Carousel(this, {
            centerY: 400,
            spacing: 300,
            largeScale: 1.3,
            sounds: {
                hover: 'se_hoverSound',
                confirm: 'se_confirmSound'
            }
        });
        
        // Create the carousel with selection callback
        this.carousel.create(iconKeys, iconInfo, (selectedItem, index) => {
            console.log('Selected:', selectedItem.heading);
            // Transition to the new scene based on the selected icon
            if (selectedItem.heading === "Web Design") {
                this.scene.start('WebDesignScene',{topic: 'webdesign'});
        });
    }

4. Then Call the Carousel in your scene:
    this.createCarousel(iconKeys, iconInfo);

5. Dont forget the SEs
*/


class Carousel {
    constructor(scene, config = {}) {
        this.scene = scene;
        
        // Default configuration
        this.config = {
            centerX: config.centerX || scene.cameras.main.centerX,
            centerY: config.centerY || 468,
            spacing: config.spacing || 280,
            smallScale: config.smallScale || 0.7,
            largeScale: config.largeScale || 1.2,
            textOffsetY: config.textOffsetY || 180,
            descOffsetY: config.descOffsetY || 225,
            headingStyle: config.headingStyle || {
                fontFamily: 'Jersey15-Regular',
                fontSize: '48px',
                color: '#222244',
                fontStyle: 'bold'
            },
            descStyle: config.descStyle || {
                fontFamily: 'Jersey15-Regular',
                fontSize: '32px',
                color: '#444466'
            },
            sounds: config.sounds || {
                hover: 'se_hoverSound',
                confirm: 'se_confirmSound'
            }
        };
        
        this.carouselIndex = 0;
        this.carouselIcons = [];
        this.breathingTween = null;
        this.dragDistance = 0;
        this.dragDirection = 0;
    }
    
    create(iconKeys, iconInfo, onSelectCallback = null) {
        const iconCount = iconKeys.length;
        this.carouselIndex = Math.floor(iconCount / 2);
        this.carouselIcons = [];
        this.iconInfo = iconInfo;
        this.onSelectCallback = onSelectCallback;
        
        // Create icons
        for (let i = 0; i < iconCount; i++) {
            const x = this.config.centerX + (i - this.carouselIndex) * this.config.spacing;
            const scale = (i === this.carouselIndex) ? this.config.largeScale : this.config.smallScale;
            const icon = this.scene.add.image(x, this.config.centerY, iconKeys[i])
                .setScale(scale)
                .setInteractive();
                
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.8);
            }
            this.carouselIcons.push(icon);
        }
        
        // Create text elements
        this.carouselHeading = this.scene.add.text(
            this.config.centerX, 
            this.config.centerY + this.config.textOffsetY, 
            '', 
            this.config.headingStyle
        ).setOrigin(0.5);
        
        this.carouselDesc = this.scene.add.text(
            this.config.centerX, 
            this.config.centerY + this.config.descOffsetY, 
            '', 
            this.config.descStyle
        ).setOrigin(0.5);
        
        this.updateText();
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
        this.setupControls();
        
        return this;
    }
    
    setupControls() {
        // Keyboard controls
        this.scene.input.keyboard.on('keydown-LEFT', () => {
            this.playHoverSound();
            this.move(-1);
        });
        
        this.scene.input.keyboard.on('keydown-RIGHT', () => {
            this.playHoverSound();
            this.move(1);
        });
        
        // Mouse/touch controls
        this.scene.input.on('pointerup', (pointer) => {
            if (this.dragDistance > 50) {
                this.move(this.dragDirection);
            }
        });
        
        // Mouse wheel
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.playHoverSound();
                this.move(1);
            } else if (deltaY < 0) {
                this.playHoverSound();
                this.move(-1);
            }
        });
        
        // Icon click handlers
        this.carouselIcons.forEach((icon, i) => {
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
    }
    
    move(direction) {
        const iconCount = this.carouselIcons.length;
        let newIndex = (this.carouselIndex + direction + iconCount) % iconCount;
        this.carouselIndex = newIndex;
        
        this.carouselIcons.forEach((icon, i) => {
            let relativePos = i - this.carouselIndex;
            if (relativePos > Math.floor(iconCount/2)) relativePos -= iconCount;
            else if (relativePos < -Math.floor(iconCount/2)) relativePos += iconCount;
            
            const x = this.config.centerX + relativePos * this.config.spacing;
            const scale = (i === this.carouselIndex) ? this.config.largeScale : this.config.smallScale;
            
            this.scene.tweens.add({ 
                targets: icon, 
                x: x, 
                scale: scale, 
                duration: 300, 
                ease: 'Power2' 
            });
            
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                this.scene.tweens.add({ targets: icon, alpha: 1, duration: 200 });
            } else {
                icon.setTint(0x888888);
                this.scene.tweens.add({ targets: icon, alpha: 0.8, duration: 200 });
            }
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
        if (this.breathingTween) {
            this.breathingTween.stop();
            icon.setScale(this.config.largeScale);
        }
        this.breathingTween = this.scene.tweens.add({
            targets: icon,
            scale: { from: this.config.largeScale, to: this.config.largeScale + 0.15 },
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
        if (this.scene[this.config.sounds.hover]) {
            this.scene[this.config.sounds.hover].play();
        }
    }
    
    playConfirmSound() {
        if (this.scene[this.config.sounds.confirm]) {
            this.scene[this.config.sounds.confirm].play();
        }
    }
    
    // Utility methods
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
    
    destroy() {
        if (this.breathingTween) {
            this.breathingTween.stop();
        }
        this.carouselIcons.forEach(icon => icon.destroy());
        if (this.carouselHeading) this.carouselHeading.destroy();
        if (this.carouselDesc) this.carouselDesc.destroy();
    }
}

// ES6 module export
export default Carousel;