const GRID_WIDTH = 5;
const GRID_HEIGHT = 8;

// Player starts at the middle bottom
let player = {
    x: Math.floor(GRID_WIDTH / 2),
    y: GRID_HEIGHT - 1
};

// Create the grid
function createGrid(width, height) {
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

const grid = createGrid(GRID_WIDTH, GRID_HEIGHT);

// Mark starting position as visited
grid[player.y][player.x].visited = true;

// Get adjacent cells
function getAdjacentCells(x, y) {
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

// Move player if the target cell is adjacent
function movePlayer(targetX, targetY) {
    const adjacents = getAdjacentCells(player.x, player.y);
    if (adjacents.some(cell => cell.x === targetX && cell.y === targetY)) {
        player.x = targetX;
        player.y = targetY;
        grid[player.y][player.x].visited = true;
        return true;
    }
    return false;
}

// Example usage: move up
// movePlayer(player.x, player.y - 1);

// For debugging: print grid with player position
function printGrid() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
        let row = '';
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (player.x === x && player.y === y) {
                row += 'P ';
            } else if (grid[y][x].visited) {
                row += '. ';
            } else {
                row += '# ';
            }
        }
        console.log(row);
    }
}

// Example: printGrid();