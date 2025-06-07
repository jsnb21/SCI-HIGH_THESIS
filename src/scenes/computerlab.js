import Phaser from 'phaser';

export default class ComputerLab extends Phaser.Scene {
    constructor() {
        super({ key: 'ComputerLab' });
    }

    preload() {
    
        // Load background and icon images
        this.load.image('MainHubBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('Web_Design', 'assets/img/comlab/icons/webDesignIcons.png');
        this.load.image('Python', 'assets/img/comlab/icons/PythonIcon.png');
        this.load.image('Java', 'assets/img/comlab/icons/JavaIcon.png');
        this.load.image('C', 'assets/img/comlab/icons/webDesignIcons.png');
        this.load.image('C++', 'assets/img/comlab/icons/CplusplusIcon.png');
        this.load.image('C#', 'assets/img/comlab/icons/CSharpIcon.png');

        // Load sound effects
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');

        // Load questions JSON
        this.load.json('questions', 'data/questions.json');
    }

    async create() {

        this.cameras.main.setBackgroundColor('#808080');

        this.createCarousel();

        this.createBack();

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');
    }

    createBack(){
        // Create "Back" button in the top right
        const buttonWidth = 100;
        const buttonHeight = 44;
        const buttonRadius = 22;
        const buttonX = this.cameras.main.width - 30 - buttonWidth / 2;
        const buttonY = 20 + buttonHeight / 2;

        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0x1e90ff, 1);
        buttonBg.fillRoundedRect?.(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            buttonRadius
        );

        const backButton = this.add.text(
            buttonX,
            buttonY,
            'Back',
            {
                fontFamily: 'Jersey15-Regular', fontSize: '24px', // ✅ Correct
                padding: { left: 0, right: 0, top: 0, bottom: 0 }
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.switch('MainHub');
         });

        // Make button background respond to pointer events
        buttonBg.setInteractive(
            new Phaser.Geom.Rectangle(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            this.se_confirmSound.play();
            this.scene.switch('MainHub');
        });
    }

    createCarousel() {
        // Carousel icon keys and info
        const iconKeys = ['Web_Design', 'Python', 'Java', 'C', 'C++', 'C#'];
        const iconInfo = [
            { heading: "Web Design", desc: "Learn HTML, CSS &JavaScript" },
            { heading: "Python", desc: "Learn Python" },
            { heading: "Java", desc: "Learn Java" },
            { heading: "C", desc: "Learn about C" },
            { heading: "C++", desc: "Learn about C++" },
            { heading: "C#", desc: "Learn about C#." }
        ];
        const iconCount = iconKeys.length;
        const centerX = this.cameras.main.centerX;
        const centerY = 468;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;

        this.carouselIndex = Math.floor(iconCount / 2);
        this.carouselIcons = [];

        // Add carousel icons
        for (let i = 0; i < iconCount; i++) {
            const x = centerX + (i - this.carouselIndex) * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            const icon = this.add.image(x, centerY, iconKeys[i]).setScale(scale).setInteractive();
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                icon.setAlpha(1);
            } else {
                icon.setTint(0x888888);
                icon.setAlpha(0.8);
            }
            this.carouselIcons.push(icon);
        }

        // Heading and description for the selected icon
        this.carouselHeading = this.add.text(centerX, centerY + 180, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '48px',
            color: '#222244',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.carouselDesc = this.add.text(centerX, centerY + 225, '', {
            fontFamily: 'Jersey15-Regular',
            fontSize: '32px',
            color: '#444466'
        }).setOrigin(0.5);

        // Show info for the initial icon
        this.updateCarouselText(iconInfo);

        // Add breathing effect to the selected icon
        this.breathingTween = null;
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);

        // Keyboard navigation for carousel
        this.input.keyboard.on('keydown-LEFT', () => {
            this.se_hoverSound.play();
            this.moveCarousel(-1, iconInfo);
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            this.se_hoverSound.play();
            this.moveCarousel(1, iconInfo);
        });
        
        /*// Mobile Support
        this.input.on('pointerup', (pointer) => {
            if (this.dragDistance > 50) {
                this.moveCarousel(this.dragDirection, iconInfo);
            }
        });
        */

        // Mouse wheel navigation for carousel
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.se_hoverSound.play();
                this.moveCarousel(1, iconInfo);
            } else if (deltaY < 0) {
                this.se_hoverSound.play();
                this.moveCarousel(-1, iconInfo);
            }
        });

        // Click to select or move carousel
        this.carouselIcons.forEach((icon, i) => {
            icon.on('pointerdown', () => {
                if (i === this.carouselIndex) {
                    this.se_confirmSound.play();
                    // Transition to the new scene based on the selected icon
                    if (iconInfo[i].heading === "Web Design") {
                        this.scene.switch('WebDesignScene',{topic: 'webdesign'});
                    } else if (iconInfo[i].heading === "Python") {
                        this.scene.switch('PythonScene', { topic: 'python' }); 
                    } else if (iconInfo[i].heading === "Java"){
                        this.scene.switch('JavaScene', { topic: 'java' }); 
                    } else if (iconInfo[i].heading === "C"){
                        this.scene.switch('CSProgrammingScene', { topic: 'C' });
                    } else if (iconInfo[i].heading === "C++"){
                        this.scene.switch('CPlusplusScene', { topic: 'C++' });
                    } else if (iconInfo[i].heading === "C#"){
                        this.scene.switch('CSharpScene', { topic: 'C#' });
                    }
                } else {
                    this.se_hoverSound.play();
                    this.moveCarousel(i - this.carouselIndex, iconInfo);
                }
            });
        });
    }

    moveCarousel(direction, iconInfo) {
        const iconCount = this.carouselIcons.length;
        
        // Calculate new index with wrap-around
        let newIndex = (this.carouselIndex + direction + iconCount) % iconCount;
        
        this.carouselIndex = newIndex;
        const centerX = this.cameras.main.centerX;
        const spacing = 280;
        const smallScale = 0.7;
        const largeScale = 1.2;
    
        // Update positions for all icons
        this.carouselIcons.forEach((icon, i) => {
            // Calculate position with wrap-around logic
            let relativePos = i - this.carouselIndex;
            
            // Handle wrap-around for smooth transitions
            if (relativePos > Math.floor(iconCount/2)) {
                relativePos -= iconCount;
            } else if (relativePos < -Math.floor(iconCount/2)) {
                relativePos += iconCount;
            }
            
            const x = centerX + relativePos * spacing;
            const scale = (i === this.carouselIndex) ? largeScale : smallScale;
            
            // Animate the movement for smoother transition
            this.tweens.add({
                targets: icon,
                x: x,
                scale: scale,
                duration: 300,
                ease: 'Power2'
            });
    
            if (i === this.carouselIndex) {
                icon.setTint(0xffffff);
                this.tweens.add({
                    targets: icon,
                    alpha: 1,
                    duration: 200
                });
            } else {
                icon.setTint(0x888888);
                this.tweens.add({
                    targets: icon,
                    alpha: 0.8,
                    duration: 200
                });
            }
        });
    
        // Update heading and description
        this.updateCarouselText(iconInfo);
    
        // Update breathing effect
        this.startBreathingEffect(this.carouselIcons[this.carouselIndex]);
    }

    updateCarouselText(iconInfo) {
        // Update heading and description text for the selected icon
        const info = iconInfo[this.carouselIndex];
        this.carouselHeading.setText(info.heading);
        this.carouselDesc.setText(info.desc);
    }

    startBreathingEffect(icon) {
        // Animate the selected icon with a breathing effect
        if (this.breathingTween) {
            this.breathingTween.stop();
            icon.setScale(1.2);
        }
        this.breathingTween = this.tweens.add({
            targets: icon,
            scale: { from: 1.2, to: 1.35 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}