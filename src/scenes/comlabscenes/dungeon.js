import Phaser from 'phaser';
import { playExclusiveBGM } from '../../audioUtils.js';
import { createBackButton } from '../../components/buttons/backbutton.js';

const GRID_WIDTH = 7;
const GRID_HEIGHT = 8;

export default class DungeonScene extends Phaser.Scene {
    constructor() {
        super('DungeonScene');
        this.grid = [];
        this.player = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1, hp: 5, buffs: [] }; // Example: hp and buffs
        this.adjacentCells = [];
        this.breathAlpha = 0.5;
        this.breathDir = 1;
        this.intensity = 1;
        this.hudElements = [];
    }

    preload() {
        this.load.font('Jersey15-Regular', 'assets/font/Jersey15-Regular.ttf');
        this.load.image('heart', 'assets/sprites/dungeon/heart.png')

        this.load.audio('bgm_dungeon', 'assets/audio/bgm/bgm_dungeon.mp3');
    }

    create() {
        this.cameras.main.setBackgroundColor('#BFAF6A'); // Darker background color

        playExclusiveBGM(this, 'bgm_dungeon', { loop: true, volume: 0.5 });

        this.grid = this.createGrid(GRID_WIDTH, GRID_HEIGHT);
        this.grid[this.player.y][this.player.x].visited = true;

        this.input.keyboard.on('keydown', this.handleInput, this);
        this.input.on('pointerdown', this.handlePointer, this);

        this.drawGrid();
        this.drawHUD();

        // Add Menu Button at top right
        this.createMenuButton();
    }

    createMenuButton() {
        const buttonWidth = 120;
        const buttonHeight = 40;
        const margin = 24;
        const buttonX = this.sys.game.config.width - buttonWidth / 2 - margin;
        const buttonY = buttonHeight / 2 + margin;

        // Button background
        this.menuButtonBg = this.add.rectangle(
            buttonX,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x000000,
            0.7
        ).setStrokeStyle(2, 0xffffff);

        // Button text
        this.menuButtonText = this.add.text(
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

        // Make button background respond to pointer events
        this.menuButtonBg.setInteractive(
            new Phaser.Geom.Rectangle(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => this.showMenuBox());

        // Store for cleanup if needed
        if (!this.persistentElements) this.persistentElements = [];
        this.persistentElements.push(this.menuButtonBg, this.menuButtonText);
    }

    showMenuBox() {
        // Prevent multiple menu boxes
        if (this.menuBoxGroup) {
            this.menuBoxGroup.clear(true, true);
        }
        this.menuBoxGroup = this.add.group();

        // --- Dim background ---
        this.menuDimBg = this.add.rectangle(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2,
            this.sys.game.config.width,
            this.sys.game.config.height,
            0x000000,
            0.5
        ).setDepth(1000);
        this.menuBoxGroup.add(this.menuDimBg);

        // Increase size by 20%
        const boxWidth = 340 * 1.2;
        const boxHeight = 260 * 1.2;
        const baseX = this.sys.game.config.width / 2;
        const baseY = this.sys.game.config.height / 2;

        // Menu box background
        const menuBoxBg = this.add.rectangle(
            baseX,
            baseY,
            boxWidth,
            boxHeight,
            0x222244,
            0.92
        ).setStrokeStyle(4, 0xffffcc, 1).setDepth(1001);
        this.menuBoxGroup.add(menuBoxBg);

        // Title
        const title = this.add.text(
            baseX,
            baseY - boxHeight / 2 + 36 * 1.2,
            'Menu',
            {
                font: '38px Jersey15-Regular', // 32px * 1.2
                fill: '#fff'
            }
        ).setOrigin(0.5).setDepth(1002);
        this.menuBoxGroup.add(title);

        // Button options
        const options = [
            { label: 'Back to Dungeon', action: () => this.closeMenuBox() },
            { label: 'Options', action: () => { this.closeMenuBox(); this.scene.start('OptionsScene'); } },
            { label: 'Quit to Hub', action: () => { this.closeMenuBox(); this.scene.start('MainHub'); } }
        ];

        const optionHeight = 54 * 1.2;
        options.forEach((opt, idx) => {
            const optY = baseY - 30 * 1.2 + idx * optionHeight;
            const optBg = this.add.rectangle(
                baseX,
                optY,
                (boxWidth - 48 * 1.2),
                44 * 1.2,
                0x000000,
                0.7
            ).setStrokeStyle(2, 0xffffff).setDepth(1001);
            this.menuBoxGroup.add(optBg);

            const optText = this.add.text(
                baseX,
                optY,
                opt.label,
                {
                    font: '29px Jersey15-Regular', // 24px * 1.2
                    fill: '#fff'
                }
            ).setOrigin(0.5)
             .setInteractive({ useHandCursor: true })
             .on('pointerdown', opt.action)
             .setDepth(1002);

            this.menuBoxGroup.add(optText);

            // Also make background clickable
            optBg.setInteractive().on('pointerdown', opt.action);
        });

        // Disable player movement while menu is open
        this.menuOpen = true;
    }

    closeMenuBox() {
        if (this.menuBoxGroup) {
            this.menuBoxGroup.clear(true, true);
            this.menuBoxGroup = null;
        }
        this.menuOpen = false;
    }

    drawHUD() {
        // Remove previous HUD elements
        if (this.hudElements.length) {
            this.hudElements.forEach(el => el.destroy());
            this.hudElements = [];
        }

        // Intensity
        const intensityText = this.add.text(16, 16, `Intensity ${this.intensity}`, {
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
        for (let i = 0; i < this.player.hp; i++) {
            // Make sure you have a heart sprite loaded as 'heart' in your preload method
            const heart = this.add.image(heartXStart + i * heartSpacing, heartY, 'heart')
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
        for (let i = 0; i < this.player.buffs.length; i++) {
            const row = Math.floor(i / buffsPerRow);
            const col = i % buffsPerRow;
            // For demonstration, draw a colored circle for each buff
            const buff = this.add.graphics().setDepth(10);
            buff.fillStyle(0x3399ff, 1); // Example: blue buff
            buff.fillCircle(
                startX + col * (buffSize + buffGap) + buffSize / 2,
                startY + row * (buffSize + buffGap) + buffSize / 2,
                buffSize / 2
            );
            this.hudElements.push(buff);
            // Optionally, add an icon or text for each buff here
        }
    }

    createGrid(width, height) {
        const grid = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push({ x, y, visited: false });
            }
            grid.push(row);
        }
        return grid;
    }

    getAdjacentCells(x, y) {
        const moves = [
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 },  // down
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 }   // right
        ];
        return moves
            .map(move => ({ x: x + move.dx, y: y + move.dy }))
            .filter(pos =>
                pos.x >= 0 && pos.x < GRID_WIDTH &&
                pos.y >= 0 && pos.y < GRID_HEIGHT
            );
    }

    movePlayer(targetX, targetY) {
        const adjacents = this.getAdjacentCells(this.player.x, this.player.y);
        if (adjacents.some(cell => cell.x === targetX && cell.y === targetY)) {
            this.player.x = targetX;
            this.player.y = targetY;
            this.grid[this.player.y][this.player.x].visited = true;
            this.drawGrid();
        }
    }

    handleInput(event) {
        if (this.menuOpen) return; // Disable movement when menu is open
        let { x, y } = this.player;
        if (event.key === 'ArrowUp') y -= 1;
        if (event.key === 'ArrowDown') y += 1;
        if (event.key === 'ArrowLeft') x -= 1;
        if (event.key === 'ArrowRight') x += 1;
        this.movePlayer(x, y);
    }

    handlePointer(pointer) {
        if (this.menuOpen) return; // Disable movement when menu is open
        const cellSize = 64;
        const gap = 12;
        const gridPixelWidth = GRID_WIDTH * cellSize;
        const gridPixelHeight = GRID_HEIGHT * cellSize;
        const offsetX = (this.sys.game.config.width - gridPixelWidth) / 2;
        const offsetY = (this.sys.game.config.height - gridPixelHeight) / 2;

        // Calculate which cell was clicked
        const x = Math.floor((pointer.x - offsetX) / cellSize);
        const y = Math.floor((pointer.y - offsetY) / cellSize);

        // Only move if clicked cell is adjacent
        this.movePlayer(x, y);
    }

    drawGrid() {
        // Clear previous graphics
        if (this.gridGraphics) this.gridGraphics.clear();
        else this.gridGraphics = this.add.graphics();

        const cellSize = 64;
        const gap = 12;
        const gridPixelWidth = GRID_WIDTH * cellSize;
        const gridPixelHeight = GRID_HEIGHT * cellSize;
        const offsetX = (this.sys.game.config.width - gridPixelWidth) / 2;
        const offsetY = (this.sys.game.config.height - gridPixelHeight) / 2;

        // Update adjacent cells for breathing effect
        this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                let color = 0x444444; // default: unvisited
                let alpha = 1;

                if (this.grid[y][x].visited) color = 0x888888; // visited
                if (this.player.x === x && this.player.y === y) color = 0x00ff00; // player

                // Breathing effect for adjacent cells
                if (this.adjacentCells.some(cell => cell.x === x && cell.y === y) &&
                    !(this.player.x === x && this.player.y === y)) {
                    color = 0x222222; // dark gray/black highlight for selectable
                    alpha = this.breathAlpha;
                }

                this.gridGraphics.fillStyle(color, alpha);
                this.gridGraphics.fillRect(
                    offsetX + x * cellSize + gap / 2,
                    offsetY + y * cellSize + gap / 2,
                    cellSize - gap,
                    cellSize - gap
                );
            }
        }
    }

    update(time, delta) {
        // Animate breathing effect
        this.breathAlpha += this.breathDir * delta * 0.001;
        if (this.breathAlpha > 1) {
            this.breathAlpha = 1;
            this.breathDir = -1;
        }
        if (this.breathAlpha < 0.3) {
            this.breathAlpha = 0.3;
            this.breathDir = 1;
        }
        this.drawGrid();
        this.drawHUD();
    }
}