import Phaser from 'phaser';
import { playExclusiveBGM } from '../../audioUtils.js';
import { DungeonHUD, DungeonMenu } from '../../ui/dungeon_hud.js';

const GRID_WIDTH = 7;
const GRID_HEIGHT = 8;
const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class DungeonScene extends Phaser.Scene {
    constructor() {
        super('DungeonScene');
        this.grid = [];
        this.player = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1, hp: 5, buffs: [] };
        this.adjacentCells = [];
        this.breathAlpha = 0.5;
        this.breathDir = 1;
        this.intensity = 1;
        this.hudElements = [];
        this.scaleFactor = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.quizBoxes = []; // <-- Add this line
    }

    preload() {
        this.load.font('Jersey15-Regular', 'assets/font/Jersey15-Regular.ttf');
        this.load.image('heart', 'assets/sprites/dungeon/heart.png');
        this.load.audio('bgm_dungeon', 'assets/audio/bgm/bgm_dungeon.mp3');
        this.load.image('quizbox', 'assets/sprites/dungeon/quizbox.png'); // <-- Add a quiz box sprite
    }

    create() {
        // Reset all persistent state
        this.grid = [];
        this.player = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1, hp: 5, buffs: [] };
        this.adjacentCells = [];
        this.breathAlpha = 0.5;
        this.breathDir = 1;
        this.intensity = 1;
        this.hudElements = [];
        this.menuOpen = false;
        this.menuBoxGroup = null;

        this.cameras.main.setBackgroundColor('#BFAF6A');
        playExclusiveBGM(this, 'bgm_dungeon', { loop: true, volume: 0.5 });

        this.grid = this.createGrid(GRID_WIDTH, GRID_HEIGHT);
        this.grid[this.player.y][this.player.x].visited = true;

        this.input.keyboard.on('keydown', this.handleInput, this);
        this.input.on('pointerdown', this.handlePointer, this);

        this.drawGrid();

        // Use HUD/Menu classes
        this.dungeonHUD = new DungeonHUD(this);
        this.dungeonHUD.drawHUD();

        this.dungeonMenu = new DungeonMenu(this);
        this.dungeonMenu.createMenuButton();

        // Add resize listener
        this.scale.on('resize', this.onResize, this);
        this.updateScale();

        this.events.once('shutdown', this.shutdown, this);

        this.quizBoxes = this.placeQuizBoxes(2); // <-- Place 2 quiz boxes
    }

    shutdown() {
        if (this.gridGraphics) {
            this.gridGraphics.destroy();
            this.gridGraphics = null;
        }
        if (this.dungeonHUD) this.dungeonHUD.shutdown();
        if (this.dungeonMenu) this.dungeonMenu.shutdown();
    }

    // --- Remove drawHUD, createMenuButton, showMenuBox ---

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

            // Check for quiz box trigger
            const quizBoxIndex = this.quizBoxes.findIndex(
                pos => pos.x === targetX && pos.y === targetY
            );
            if (quizBoxIndex !== -1) {
                // Remove the triggered quiz box so it can't be triggered again
                this.quizBoxes.splice(quizBoxIndex, 1);
                this.scene.start('WebDesignQuizScene');
                return;
            }

            this.drawGrid();
            if (this.dungeonHUD) this.dungeonHUD.drawHUD();
        }
    }

    handleInput(event) {
        if (this.menuOpen) return;
        let { x, y } = this.player;
        if (event.key === 'ArrowUp') y -= 1;
        if (event.key === 'ArrowDown') y += 1;
        if (event.key === 'ArrowLeft') x -= 1;
        if (event.key === 'ArrowRight') x += 1;
        this.movePlayer(x, y);
    }

    handlePointer(pointer) {
        if (this.menuOpen) return;
        const cellSize = 64 * this.scaleFactor;
        const x = Math.floor((pointer.x - this.offsetX) / cellSize);
        const y = Math.floor((pointer.y - this.offsetY) / cellSize);
        this.movePlayer(x, y);
    }

    updateScale() {
        const width = this.scale.width;
        const height = this.scale.height;
        this.scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);

        // Calculate grid size and offsets for centering
        const cellSize = 64 * this.scaleFactor;
        const gridPixelWidth = GRID_WIDTH * cellSize;
        const gridPixelHeight = GRID_HEIGHT * cellSize;
        this.offsetX = (width - gridPixelWidth) / 2;
        this.offsetY = (height - gridPixelHeight) / 2;
    }

    onResize(gameSize) {
        this.updateScale();
        this.drawGrid();
        if (this.dungeonHUD && this.dungeonHUD.drawHUD) this.dungeonHUD.drawHUD();
        if (this.dungeonMenu && this.dungeonMenu.createMenuButton) this.dungeonMenu.createMenuButton();
    }

    drawGrid() {
        if (this.gridGraphics) this.gridGraphics.clear();
        else this.gridGraphics = this.add.graphics();

        const cellSize = 64 * this.scaleFactor;
        const gap = 12 * this.scaleFactor;

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                let color = 0x444444;
                let alpha = 1;

                if (this.grid[y][x].visited) color = 0x888888;
                if (this.player.x === x && this.player.y === y) color = 0x00ff00;

                if (this.adjacentCells.some(cell => cell.x === x && cell.y === y) &&
                    !(this.player.x === x && this.player.y === y)) {
                    color = 0x222222;
                    alpha = this.breathAlpha;
                }

                // Draw quiz box if present
                if (this.quizBoxes.some(pos => pos.x === x && pos.y === y)) {
                    // Draw the quiz box sprite
                    this.add.image(
                        this.offsetX + x * cellSize + cellSize / 2,
                        this.offsetY + y * cellSize + cellSize / 2,
                        'quizbox'
                    ).setDisplaySize(cellSize - gap, cellSize - gap);
                } else {
                    this.gridGraphics.fillStyle(color, alpha);
                    this.gridGraphics.fillRect(
                        this.offsetX + x * cellSize + gap / 2,
                        this.offsetY + y * cellSize + gap / 2,
                        cellSize - gap,
                        cellSize - gap
                    );
                }
            }
        }
    }

    // Add this method to randomly place quiz boxes
    placeQuizBoxes(count) {
        const positions = [];
        while (positions.length < count) {
            const x = Phaser.Math.Between(0, GRID_WIDTH - 1);
            const y = Phaser.Math.Between(0, GRID_HEIGHT - 2); // avoid starting row
            // Avoid player start and duplicates
            if (
                (x !== this.player.x || y !== this.player.y) &&
                !positions.some(pos => pos.x === x && pos.y === y)
            ) {
                positions.push({ x, y });
            }
        }
        return positions;
    }

    update(time, delta) {
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
    }
}