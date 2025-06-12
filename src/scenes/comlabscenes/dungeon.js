import Phaser from 'phaser';

const GRID_WIDTH = 5;
const GRID_HEIGHT = 8;

export default class DungeonScene extends Phaser.Scene {
    constructor() {
        super('DungeonScene');
        this.grid = [];
        this.player = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1 };
    }

    create() {
        this.cameras.main.setBackgroundColor('#E6CC7A'); // Slightly darker background

        this.grid = this.createGrid(GRID_WIDTH, GRID_HEIGHT);
        this.grid[this.player.y][this.player.x].visited = true;

        this.drawGrid();

        this.input.keyboard.on('keydown', this.handleInput, this);
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
        let { x, y } = this.player;
        if (event.key === 'ArrowUp') y -= 1;
        if (event.key === 'ArrowDown') y += 1;
        if (event.key === 'ArrowLeft') x -= 1;
        if (event.key === 'ArrowRight') x += 1;
        this.movePlayer(x, y);
    }

    drawGrid() {
        // Clear previous graphics
        if (this.gridGraphics) this.gridGraphics.clear();
        else this.gridGraphics = this.add.graphics();

        const cellSize = 64;
        const gap = 12; // Increase this value for larger gaps
        const gridPixelWidth = GRID_WIDTH * cellSize;
        const gridPixelHeight = GRID_HEIGHT * cellSize;

        // Center the grid in the game window
        const offsetX = (this.sys.game.config.width - gridPixelWidth) / 2;
        const offsetY = (this.sys.game.config.height - gridPixelHeight) / 2;

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                let color = 0x444444; // default: unvisited
                if (this.grid[y][x].visited) color = 0x888888; // visited
                if (this.player.x === x && this.player.y === y) color = 0x00ff00; // player

                this.gridGraphics.fillStyle(color, 1);
                this.gridGraphics.fillRect(
                    offsetX + x * cellSize + gap / 2,
                    offsetY + y * cellSize + gap / 2,
                    cellSize - gap,
                    cellSize - gap
                );
            }
        }
    }
}