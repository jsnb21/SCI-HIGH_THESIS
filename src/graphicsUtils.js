export class ResolutionSelector {
    constructor(scene, x, y, resolutions, onChange) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.resolutions = resolutions;
        this.onChange = onChange;
        this.currentIndex = 0;

        // Display current resolution
        this.label = scene.add.text(x, y, 'Resolution:', {
            font: '32px Jersey15-Regular',
            color: '#fff'
        }).setOrigin(1, 0.5);

        this.valueText = scene.add.text(x + 20, y, this.getCurrentResString(), {
            font: '32px Jersey15-Regular',
            color: '#ffff00',
            backgroundColor: '#222'
        }).setOrigin(0, 0.5).setPadding(8, 4, 8, 4).setInteractive();

        // Dropdown arrow
        this.arrow = scene.add.text(x + 200, y, '▼', {
            font: '28px Jersey15-Regular',
            color: '#ffff00'
        }).setOrigin(0, 0.5).setInteractive();

        this.valueText.on('pointerdown', () => this.showDropdown());
        this.arrow.on('pointerdown', () => this.showDropdown());

        this.dropdownGroup = null;
    }

    getCurrentResString() {
        const res = this.resolutions[this.currentIndex];
        return `${res.width} x ${res.height}`;
    }

    showDropdown() {
        if (this.dropdownGroup) {
            this.dropdownGroup.clear(true, true);
            this.dropdownGroup = null;
            return;
        }
        this.dropdownGroup = this.scene.add.group();
        const baseY = this.y + 30;
        this.resolutions.forEach((res, i) => {
            const option = this.scene.add.text(this.x + 20, baseY + i * 36, `${res.width} x ${res.height}`, {
                font: '28px Jersey15-Regular',
                color: i === this.currentIndex ? '#ffff00' : '#fff',
                backgroundColor: i === this.currentIndex ? '#444' : '#222'
            }).setOrigin(0, 0.5).setPadding(8, 4, 8, 4).setInteractive();

            option.on('pointerdown', () => {
                this.currentIndex = i;
                this.valueText.setText(this.getCurrentResString());
                if (this.onChange) this.onChange(res);
                this.dropdownGroup.clear(true, true);
                this.dropdownGroup = null;
            });
            option.on('pointerover', () => option.setStyle({ color: '#ffff00', backgroundColor: '#444' }));
            option.on('pointerout', () => option.setStyle({ color: i === this.currentIndex ? '#ffff00' : '#fff', backgroundColor: i === this.currentIndex ? '#444' : '#222' }));

            this.dropdownGroup.add(option);
        });

        // Clicking outside closes dropdown
        this.scene.input.once('pointerdown', (pointer, currentlyOver) => {
            if (!currentlyOver.includes(this.valueText) && !currentlyOver.includes(this.arrow)) {
                if (this.dropdownGroup) {
                    this.dropdownGroup.clear(true, true);
                    this.dropdownGroup = null;
                }
            }
        });
    }
}