class FullscreenToggleUI {
    constructor(scene, width, scaleFactor, BASE_WIDTH, BASE_HEIGHT, scaleFont) {
        this.scene = scene;
        this.width = width;
        this.scaleFactor = scaleFactor;
        this.BASE_WIDTH = BASE_WIDTH;
        this.BASE_HEIGHT = BASE_HEIGHT;
        this.scaleFont = scaleFont;
        this.uiElements = [];
        this.createUI();
    }

    createUI() {
        this.uiElements.forEach(el => el.destroy());
        this.uiElements = [];

        const fsLabel = this.scene.add.text(
            this.width / 2 - 100 * this.scaleFactor,
            320 * this.scaleFactor,
            'Fullscreen',
            {
                font: `${this.scaleFont(32)}px Jersey15-Regular`,
                color: '#fff'
            }
        ).setOrigin(1, 0.5);
        this.uiElements.push(fsLabel);

        const fsButton = this.scene.add.text(
            this.width / 2 + 50 * this.scaleFactor,
            320 * this.scaleFactor,
            this.scene.scale.isFullscreen ? 'On' : 'Off',
            {
                font: `${this.scaleFont(32)}px Jersey15-Regular`,
                color: '#ffff00',
                backgroundColor: '#222'
            }
        ).setOrigin(0, 0.5).setPadding(8, 4, 8, 4).setInteractive();

        fsButton.on('pointerdown', () => {
            if (this.scene.scale.isFullscreen) {
                this.scene.scale.stopFullscreen();
                fsButton.setText('Off');
                this.scene.time.delayedCall(100, () => {
                    // Use window dimensions even when exiting fullscreen
                    this.scene.scale.resize(window.innerWidth, window.innerHeight);
                    const canvas = this.scene.game.canvas;
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    this.scene.time.delayedCall(0, () => this.createUI());
                });
            } else {
                this.scene.scale.startFullscreen();
                fsButton.setText('On');
                this.scene.time.delayedCall(100, () => {
                    const w = window.innerWidth;
                    const h = window.innerHeight;
                    this.scene.scale.resize(w, h);
                    const canvas = this.scene.game.canvas;
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    this.scene.time.delayedCall(0, () => this.createUI());
                });
            }
        });
        this.uiElements.push(fsButton);
    }

    destroy() {
        this.uiElements.forEach(el => el.destroy());
        this.uiElements = [];
    }
}

export default FullscreenToggleUI;
