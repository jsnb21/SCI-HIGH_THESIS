import Phaser from 'phaser';
import { playExclusiveBGM } from '../../audioUtils.js';
import { DungeonHUD, DungeonMenu } from '../../ui/dungeon_hud.js';
import gameManager from '../../gameManager.js';
import TutorialManager from '../../components/TutorialManager.js';
import { DUNGEON_TUTORIAL_TRIGGERS, prepareTutorialSteps } from '../../components/TutorialConfig.js';
import { getScaleInfo } from '../../utils/mobileUtils.js';

const GRID_WIDTH = 7;
const GRID_HEIGHT = 8;
const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class DungeonScene extends Phaser.Scene {
    constructor() {
        super('DungeonScene');
        this.grid = [];
        this.player = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1, hp: gameManager.getPlayerHP(), buffs: [] };
        this.adjacentCells = [];
        this.intensity = 1;
        this.hudElements = [];
        this.scaleFactor = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.quizBoxes = [];
        this.quizBoxSprites = []; // Track quiz box sprites
        this.particles = null;
        this.lightingOverlay = null;
        this.playerSprite = null;
        
        // Mobile-specific properties
        this.isMobile = false;
        this.touchControls = null;
        this.virtualDPad = null;
        this.lastTouchTime = 0;
        this.touchSensitivity = 200; // ms between touches
        
        // Progression system variables
        this.enemiesDefeated = 0;
        this.maxIntensity = 3;
        this.playerDamage = 10;
        
        // Course statistics tracking
        this.courseStats = {
            totalScore: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            comboScore: 0
        };

        // Initialize tutorial system
        this.tutorialManager = null;
        this.tutorialFlags = {
            firstTimeTutorialShown: false,
            firstQuizBoxShown: false,
            bossEncounterShown: false
        };
    }    init(data) {
        // Reset player HP to full when starting a new dungeon
        gameManager.resetPlayerHP();
        
        // Store course topic for completion tracking
        this.courseTopic = data?.courseTopic || null;
    }

    preload() {
        this.load.font('Jersey15-Regular', 'assets/font/Jersey15-Regular.ttf');
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
        this.load.image('heart', 'assets/sprites/dungeon/heart.png');
        this.load.audio('bgm_dungeon', 'assets/audio/bgm/bgm_dungeon.mp3');
        this.load.image('quizbox', 'assets/sprites/enemies/box.png');
        this.load.image('goblinNerd', 'assets/sprites/enemies/goblinNerd.png');
        this.load.image('bigSlime', 'assets/sprites/enemies/big_slime.png');
    }

    create() {
        // Detect mobile device
        this.isMobile = this.detectMobile();
        
        // Reset all persistent state
        this.grid = [];
        this.player = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1, hp: gameManager.getPlayerHP(), buffs: [] };
        this.adjacentCells = [];
        this.intensity = 1;
        this.hudElements = [];
        this.menuOpen = false;
        this.menuBoxGroup = null;
        this.particles = null;
        this.lightingOverlay = null;
        this.playerSprite = null;
          // Initialize progression variables
        this.enemiesDefeated = 0;
        this.maxIntensity = 3;
        this.playerDamage = 10;
        
        // Reset course statistics
        this.courseStats = {
            totalScore: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            comboScore: 0
        };

        // Enhanced background with gradient
        this.cameras.main.setBackgroundColor('#ff6b6b');
        this.createBackgroundEffects();
        playExclusiveBGM(this, 'bgm_dungeon', { loop: true, volume: 0.5 });

        this.grid = this.createGrid(GRID_WIDTH, GRID_HEIGHT);
        
        // Validate grid creation
        if (!this.grid || this.grid.length !== GRID_HEIGHT) {
            console.error('Grid creation failed - invalid dimensions');
            return;
        }
        
        // Validate each row
        for (let y = 0; y < GRID_HEIGHT; y++) {
            if (!this.grid[y] || !Array.isArray(this.grid[y]) || this.grid[y].length !== GRID_WIDTH) {
                console.error(`Grid row ${y} is invalid`);
                return;
            }
        }
        
        this.grid[this.player.y][this.player.x].visited = true;

        // Calculate adjacent cells initially
        this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);

        this.input.keyboard.on('keydown', this.handleInput, this);
        this.input.on('pointerdown', this.handlePointer, this);

        // Add mobile-specific input handling
        if (this.isMobile) {
            this.setupMobileControls();
        }

        // Calculate scale and centering BEFORE drawing anything
        this.updateScale();
        
        // Draw initial grid
        this.drawGrid();

        // Create atmospheric particles
        this.createParticleEffects();

        // Create lighting overlay
        this.createLightingEffects();

        // Use HUD/Menu classes
        this.dungeonHUD = new DungeonHUD(this);
        this.dungeonHUD.drawHUD();

        this.dungeonMenu = new DungeonMenu(this);
        this.dungeonMenu.createMenuButton();

        // Add resize listener
        this.scale.on('resize', this.onResize, this);        this.events.once('shutdown', this.shutdown, this);

        // Initialize tutorial system first
        this.tutorialManager = new TutorialManager(this);
        this.setupTutorialSystem();

        // Place quiz boxes
        const boxCount = 3;
        console.log('About to place quiz boxes...');
        this.quizBoxes = this.placeQuizBoxes(boxCount);
        console.log('Quiz boxes placed:', this.quizBoxes);
        
        // Validate quiz box positions
        if (!this.quizBoxes || this.quizBoxes.length === 0) {
            console.error('Quiz box placement failed');
            return;
        }
        
        // Simple validation - just check that positions are valid
        for (const quizBox of this.quizBoxes) {
            if (typeof quizBox.x !== 'number' || typeof quizBox.y !== 'number' ||
                quizBox.x < 0 || quizBox.x >= GRID_WIDTH ||
                quizBox.y < 0 || quizBox.y >= GRID_HEIGHT) {
                console.error(`Invalid quiz box position: (${quizBox.x}, ${quizBox.y})`);
                return;
            }
        }
        
        // Draw grid with quiz boxes immediately - no pathfinding delays
        console.log('About to draw grid with quiz boxes...');
        this.drawGrid();
        this.updateLightingEffects();
        console.log('Grid drawn, quiz box sprites:', this.quizBoxSprites.length);
          
        // Add resume event handler
        this.events.on('resume', this.onResume, this);
        
        // Check and show tutorial immediately - don't wait
        this.time.delayedCall(100, () => {
            // Check if basic tutorial has been seen
            const basicTutorialSeen = localStorage.getItem('sci-high-dungeon-basic-tutorial-seen');
            
            if (!basicTutorialSeen) {
                // Show basic tutorial first
                this.showInitialDungeonTutorial();
            } else {
                // Skip to advanced tutorials
                this.checkAndShowTutorial();
            }
        });
        
        // Expose debug methods for testing
        if (typeof window !== 'undefined') {
            window.dungeonScene = this;
        }
    }    onResume(data) {
        // Check if returning from card reward scene
        if (this.cardRewardProcessed) {
            this.cardRewardProcessed = false;
            if (this.cardRewardCallback) {
                this.cardRewardCallback();
                this.cardRewardCallback = null;
            }
            // Update display and return early
            this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);
            this.drawGrid();
            this.updateLightingEffects();
            if (this.dungeonHUD && this.dungeonHUD.drawHUD) this.dungeonHUD.drawHUD();
            if (this.dungeonMenu && this.dungeonMenu.createMenuButton) this.dungeonMenu.createMenuButton();
            return;
        }
        
        // Sync player HP from GameManager when returning from quiz
        this.player.hp = gameManager.getPlayerHP();
        
        // Check if enemy was defeated - either from flag or scene
        let enemyWasDefeated = false;
        
        // Check for direct flag set by victory screen
        if (this.enemyWasDefeatedFlag) {
            enemyWasDefeated = true;
            this.enemyWasDefeatedFlag = false; // Reset flag
        } else {
            // Check if an enemy was defeated - check the correct quiz scene based on course topic
            const quizSceneMap = {
                'webdesign': 'WebDesignQuizScene',
                'python': 'PythonQuizScene', 
                'java': 'JavaQuizScene',
                'C': 'CQuizScene',
                'C++': 'CplusplusQuizScene',
                'C#': 'CSharpQuizScene'
            };
            
            const quizSceneName = quizSceneMap[this.courseTopic] || 'WebDesignQuizScene';
            const quizScene = this.scene.get(quizSceneName);
            
            if (quizScene && quizScene.enemyDefeated) {
                enemyWasDefeated = true;
                
                // Collect quiz statistics
                if (quizScene.score !== undefined) {
                    this.courseStats.totalScore += quizScene.score;
                }
                if (quizScene.correctAnswers !== undefined) {
                    this.courseStats.correctAnswers += quizScene.correctAnswers;
                }
                if (quizScene.questions && quizScene.correctAnswers !== undefined) {
                    const questionsAnswered = quizScene.questions.length;
                    const wrongAnswers = questionsAnswered - quizScene.correctAnswers;
                    this.courseStats.wrongAnswers += wrongAnswers;
                }
                if (quizScene.comboMeter && quizScene.comboMeter.getTotalComboScore) {
                    this.courseStats.comboScore += quizScene.comboMeter.getTotalComboScore();
                }
                
                quizScene.enemyDefeated = false; // Reset flag
            }
        }
        
        if (enemyWasDefeated) {
            this.onEnemyDefeated();
        }
        
        // Update adjacent cells on resume
        this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);

        // Redraw grid and HUD when scene is resumed
        this.drawGrid();
        this.updateLightingEffects();
        if (this.dungeonHUD && this.dungeonHUD.drawHUD) this.dungeonHUD.drawHUD();
        if (this.dungeonMenu && this.dungeonMenu.createMenuButton) this.dungeonMenu.createMenuButton();
    }
    
    shutdown() {
        if (this.gridGraphics) {
            this.gridGraphics.destroy();
            this.gridGraphics = null;
        }
        if (this.particles) {
            this.particles.destroy();
            this.particles = null;
        }
        if (this.lightingOverlay) {
            this.lightingOverlay.destroy();
            this.lightingOverlay = null;
        }
        if (this.playerSprite) {
            this.playerSprite.destroy();
            this.playerSprite = null;
        }
        if (this.virtualDPad) {
            this.virtualDPad.destroy();
            this.virtualDPad = null;
        }
        if (this.mobileInstructions) {
            this.mobileInstructions.destroy();
            this.mobileInstructions = null;
        }
        if (this.dungeonHUD) this.dungeonHUD.shutdown();
        if (this.dungeonMenu) this.dungeonMenu.shutdown();
        if (this.quizBoxSprites && this.quizBoxSprites.length) {
            this.quizBoxSprites.forEach(sprite => sprite.destroy());
            this.quizBoxSprites = [];
        }
        
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
    }

    createGrid(width, height) {
        const grid = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push({ x, y, visited: false, walkable: true, isWall: false });
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
                pos.y >= 0 && pos.y < GRID_HEIGHT &&
                this.grid[pos.y][pos.x].walkable // Only include walkable cells
            );
    }

    movePlayer(targetX, targetY) {
        const adjacents = this.getAdjacentCells(this.player.x, this.player.y);
        if (adjacents.some(cell => cell.x === targetX && cell.y === targetY)) {
            this.player.x = targetX;
            this.player.y = targetY;
            this.grid[this.player.y][this.player.x].visited = true;

            // Update adjacent cells after moving
            this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);

            // Check for quiz box trigger
            const quizBoxIndex = this.quizBoxes.findIndex(
                pos => pos.x === targetX && pos.y === targetY
            );            if (quizBoxIndex !== -1) {
                // Check for first quiz box tutorial before proceeding
                if (!this.tutorialFlags.firstQuizBoxShown) {
                    this.checkAndShowTutorial();
                    // Still proceed with quiz after tutorial
                }

                // Get the specific quiz box being triggered
                const triggeredQuizBox = this.quizBoxes[quizBoxIndex];

                // Remove the triggered quiz box so it can't be triggered again
                this.quizBoxes.splice(quizBoxIndex, 1);
                
                // Determine enemy configuration based on intensity and the specific quiz box
                const enemyConfig = this.getEnemyConfig(triggeredQuizBox);
                
                // Determine correct quiz scene based on course topic
                const quizSceneMap = {
                    'webdesign': 'WebDesignQuizScene',
                    'python': 'PythonQuizScene', 
                    'java': 'JavaQuizScene',
                    'C': 'CQuizScene',
                    'C++': 'CplusplusQuizScene',
                    'C#': 'CSharpQuizScene'
                };
                
                const quizSceneName = quizSceneMap[this.courseTopic] || 'WebDesignQuizScene';
                
                this.scene.pause(); // Pause DungeonScene
                this.scene.launch(quizSceneName, { 
                    returnScene: 'DungeonScene',
                    topic: this.courseTopic,
                    enemyConfig: enemyConfig,
                    playerDamage: this.playerDamage
                });
                return;
            }

            // Check for boss encounter tutorial trigger
            if (this.intensity > this.maxIntensity && !this.tutorialFlags.bossEncounterShown) {
                this.checkAndShowTutorial();
            }

            this.drawGrid();
            this.updateLightingEffects();
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
        
        // Enhanced mobile touch handling with debouncing
        const currentTime = Date.now();
        if (this.lastTouchTime && currentTime - this.lastTouchTime < this.touchSensitivity) {
            return; // Ignore rapid touches
        }
        this.lastTouchTime = currentTime;
        
        // Check if touch is on virtual D-pad (mobile only)
        if (this.isMobile && this.isPointerOnVirtualDPad(pointer)) {
            return; // Don't process grid movement if touching D-pad
        }
        
        const cellSize = this.getCellSize();
        const x = Math.floor((pointer.x - this.offsetX) / cellSize);
        const y = Math.floor((pointer.y - this.offsetY) / cellSize);
        
        // Validate coordinates are within grid bounds
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
            this.movePlayer(x, y);
        }
    }

    updateScale() {
        const width = this.scale.width;
        const height = this.scale.height;
        
        // Enhanced mobile scaling
        if (this.isMobile) {
            // More aggressive scaling for mobile to ensure visibility
            const mobileScaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT) * 0.8;
            this.scaleFactor = Math.max(mobileScaleFactor, 0.5); // Minimum scale of 0.5
        } else {
            this.scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        }

        // Calculate grid size and offsets for centering
        const cellSize = this.getCellSize();
        const gridPixelWidth = GRID_WIDTH * cellSize;
        const gridPixelHeight = GRID_HEIGHT * cellSize;
        
        // Adjust offsets for mobile to account for virtual controls
        if (this.isMobile) {
            this.offsetX = (width - gridPixelWidth) / 2;
            this.offsetY = Math.max((height - gridPixelHeight) / 2 - 50, 20); // Leave space for mobile UI
        } else {
            this.offsetX = (width - gridPixelWidth) / 2;
            this.offsetY = (height - gridPixelHeight) / 2;
        }
    }    onResize(gameSize) {
        this.updateScale();
        this.drawGrid();
        this.updateLightingEffects();
        if (this.dungeonHUD && this.dungeonHUD.drawHUD) this.dungeonHUD.drawHUD();
        if (this.dungeonMenu && this.dungeonMenu.createMenuButton) this.dungeonMenu.createMenuButton();
        
        // Recreate mobile controls on resize
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }    drawGrid() {
        // Clear previous quiz box sprites and player sprite
        if (this.quizBoxSprites && this.quizBoxSprites.length) {
            this.quizBoxSprites.forEach(sprite => {
                if (sprite && sprite.destroy) {
                    sprite.destroy();
                }
            });
            this.quizBoxSprites = [];
        }
        if (this.playerSprite) {
            this.playerSprite.destroy();
            this.playerSprite = null;
        }

        if (this.gridGraphics) this.gridGraphics.clear();
        else this.gridGraphics = this.add.graphics();

        const cellSize = this.getCellSize();
        const gap = 4 * this.scaleFactor;
        const borderWidth = Math.max(3 * this.scaleFactor, 1); // Ensure minimum border width

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cellX = this.offsetX + x * cellSize + gap / 2;
                const cellY = this.offsetY + y * cellSize + gap / 2;
                const cellWidth = cellSize - gap;
                const cellHeight = cellSize - gap;            let fillColor = 0x1a1a1a; // Dark gray for walls
            let borderColor = 0x374151;
            let fillAlpha = 1;
            let borderAlpha = 0.9;
            let glowColor = null;

            // Check if this cell is a wall
            if (this.grid[y][x].isWall) {
                fillColor = 0x1a1a1a; // Dark walls
                borderColor = 0x374151;
            } else {
                // Walkable area colors
                if (this.grid[y][x].visited) {
                    fillColor = 0x059669; // Vibrant emerald for visited
                    borderColor = 0x10b981;
                    glowColor = 0x34d399;
                } else {
                    fillColor = 0x4c1d95; // Vibrant purple for unvisited walkable
                    borderColor = 0x8b5cf6;
                }
            }

            // Adjacent cells that can be moved to - bright and static
            if (this.adjacentCells.some(cell => cell.x === x && cell.y === y) &&
                !(this.player.x === x && this.player.y === y)) {
                fillColor = 0xf59e0b; // Vibrant amber
                borderColor = 0xfbbf24;
                glowColor = 0xfde047;
            }            // Draw quiz box if present with enhanced effects
            const quizBox = this.quizBoxes.find(pos => pos.x === x && pos.y === y);
            if (quizBox) {
                console.log(`Rendering quiz box at (${x}, ${y}) with difficulty: ${quizBox.difficulty}`);
                
                // Get difficulty colors
                let difficultyColors = this.getDifficultyColors(quizBox.difficulty);
                
                // Multi-layered vibrant background for quiz box with difficulty color
                this.gridGraphics.fillStyle(difficultyColors.base, 1);
                this.gridGraphics.fillRoundedRect(cellX, cellY, cellWidth, cellHeight, 12 * this.scaleFactor);
                
                // Pulsing glow layers with difficulty colors
                this.gridGraphics.lineStyle(borderWidth * 3, difficultyColors.outerGlow, 0.8);
                this.gridGraphics.strokeRoundedRect(cellX - 4, cellY - 4, cellWidth + 8, cellHeight + 8, 16 * this.scaleFactor);
                
                this.gridGraphics.lineStyle(borderWidth * 2, difficultyColors.middleGlow, 1);
                this.gridGraphics.strokeRoundedRect(cellX - 2, cellY - 2, cellWidth + 4, cellHeight + 4, 14 * this.scaleFactor);
                
                this.gridGraphics.lineStyle(borderWidth, difficultyColors.border, 1);
                this.gridGraphics.strokeRoundedRect(cellX, cellY, cellWidth, cellHeight, 12 * this.scaleFactor);
                
                // Vibrant inner highlight with difficulty color
                this.gridGraphics.fillStyle(difficultyColors.overlay, 0.6);
                this.gridGraphics.fillRoundedRect(cellX + 4, cellY + 4, cellWidth - 8, cellHeight - 8, 8 * this.scaleFactor);                // Enhanced quiz box sprite with static effects
                const sprite = this.add.image(
                    cellX + cellWidth / 2,
                    cellY + cellHeight / 2,
                    quizBox.sprite || 'quizbox'  // Use the assigned sprite or fallback to quizbox
                ).setDisplaySize(cellWidth * 0.8, cellHeight * 0.8);
                
                // Tinting based on difficulty
                sprite.setTint(difficultyColors.spriteTint);
                
                // Set depth to ensure visibility
                sprite.setDepth(10);
                
                // Make sure sprite is visible
                sprite.setAlpha(1);
                sprite.setVisible(true);
                    
                this.quizBoxSprites.push(sprite);
                } else {
                    // Regular cell with enhanced gradients
                    this.gridGraphics.fillStyle(fillColor, fillAlpha);
                    this.gridGraphics.fillRoundedRect(cellX, cellY, cellWidth, cellHeight, 8 * this.scaleFactor);
                    
                    // Vibrant border with glow effect
                    if (glowColor) {
                        this.gridGraphics.lineStyle(borderWidth * 1.5, glowColor, 0.3);
                        this.gridGraphics.strokeRoundedRect(cellX - 2, cellY - 2, cellWidth + 4, cellHeight + 4, 10 * this.scaleFactor);
                    }
                    
                    this.gridGraphics.lineStyle(borderWidth, borderColor, borderAlpha);
                    this.gridGraphics.strokeRoundedRect(cellX, cellY, cellWidth, cellHeight, 8 * this.scaleFactor);                // Enhanced inner highlights for visited cells
                if (this.grid[y][x].visited) {
                    this.gridGraphics.fillStyle(0x22d3ee, 0.3); // Bright cyan overlay
                    this.gridGraphics.fillRoundedRect(cellX + 2, cellY + 2, cellWidth - 4, cellHeight - 4, 6 * this.scaleFactor);
                    
                    this.gridGraphics.lineStyle(2 * this.scaleFactor, 0x06b6d4, 0.8);
                    this.gridGraphics.strokeRoundedRect(
                        cellX + borderWidth,
                        cellY + borderWidth,
                        cellWidth - borderWidth * 2,
                        cellHeight - borderWidth * 2,
                        6 * this.scaleFactor
                    );
                }
                }
            }
        }

        // Enhanced player representation with static effects
        const playerCellX = this.offsetX + this.player.x * cellSize + cellSize / 2;
        const playerCellY = this.offsetY + this.player.y * cellSize + cellSize / 2;
        
        // Adjust glow size for mobile
        const glowSizeMultiplier = this.isMobile ? 0.8 : 1.0;
        
        // Multi-layered player glow effect with vibrant colors
        const outerGlow = this.add.circle(playerCellX, playerCellY, cellSize * 0.6 * glowSizeMultiplier, 0xff6b6b, 0.3);
        outerGlow.setDepth(1);
        this.quizBoxSprites.push(outerGlow);
        
        const innerGlow = this.add.circle(playerCellX, playerCellY, cellSize * 0.4 * glowSizeMultiplier, 0xfbbf24, 0.5);
        innerGlow.setDepth(2);
        this.quizBoxSprites.push(innerGlow);
        
        // Player sprite with mobile-friendly sizing
        this.playerSprite = this.add.image(playerCellX, playerCellY, 'goblinNerd');
        const spriteSize = this.isMobile ? cellSize * 0.8 : cellSize * 0.7; // Slightly larger on mobile
        this.playerSprite.setDisplaySize(spriteSize, spriteSize);
        this.playerSprite.setDepth(3);
        this.playerSprite.setTint(0x22d3ee); // Bright cyan tint

        // Update lighting effects
        this.updateLightingEffects();
    }

    placeQuizBoxes(count) {
        const positions = [];
        
        // Random placement logic - only on walkable tiles
        while (positions.length < count) {
            const x = Phaser.Math.Between(0, GRID_WIDTH - 1);
            const y = Phaser.Math.Between(0, GRID_HEIGHT - 2); // avoid starting row
            
            // Avoid player start, duplicates, and ensure walkable
            if (
                (x !== this.player.x || y !== this.player.y) &&
                this.grid[y][x].walkable &&
                !positions.some(pos => pos.x === x && pos.y === y)
            ) {
                const newPos = { 
                    x, 
                    y, 
                    difficulty: this.getRandomDifficulty(),
                    sprite: this.getRandomEnemySprite()
                };
                console.log(`Created quiz box at (${x}, ${y}) with difficulty: ${newPos.difficulty}, sprite: ${newPos.sprite}`);
                positions.push(newPos);
            }
        }
        
        return positions;
    }

    getRandomDifficulty() {
        const difficulties = ['easy', 'medium', 'hard'];
        return Phaser.Utils.Array.GetRandom(difficulties);
    }

    getRandomEnemySprite() {
        const enemySprites = ['quizbox', 'goblinNerd', 'bigSlime'];
        return Phaser.Utils.Array.GetRandom(enemySprites);
    }

    getDifficultyColors(difficulty) {
        switch (difficulty) {
            case 'easy':
                return {
                    base: 0x22c55e,        // Green base
                    outerGlow: 0x4ade80,   // Light green outer glow
                    middleGlow: 0x86efac,  // Lighter green middle glow
                    border: 0xbbf7d0,     // Very light green border
                    overlay: 0x16a34a,    // Dark green overlay
                    spriteTint: 0x00ff7f   // Spring green sprite tint
                };
            case 'medium':
                return {
                    base: 0xeab308,        // Yellow base
                    outerGlow: 0xfbbf24,   // Light yellow outer glow
                    middleGlow: 0xfde047,  // Lighter yellow middle glow
                    border: 0xfef3c7,     // Very light yellow border
                    overlay: 0xd97706,    // Dark yellow overlay
                    spriteTint: 0xffff00   // Pure yellow sprite tint
                };
            case 'hard':
                return {
                    base: 0xdc2626,        // Red base
                    outerGlow: 0xff6b6b,   // Light red outer glow
                    middleGlow: 0xfbbf24,  // Gold middle glow (keeping existing)
                    border: 0xfde047,     // Yellow border (keeping existing)
                    overlay: 0xf97316,    // Orange overlay (keeping existing)
                    spriteTint: 0xff0000   // Pure red sprite tint
                };
            default:
                // Default to medium difficulty colors
                return this.getDifficultyColors('medium');
        }
    }

    createBackgroundEffects() {
        // Create a vibrant gradient background
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x667eea, 0x764ba2, 0xf093fb, 0xf5576c, 1);
        graphics.fillRect(0, 0, this.scale.width, this.scale.height);
        graphics.setDepth(-10);

        // Add colorful atmospheric particles for texture
        for (let i = 0; i < 30; i++) {
            const x = Phaser.Math.Between(0, this.scale.width);
            const y = Phaser.Math.Between(0, this.scale.height);
            const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3];
            const color = Phaser.Utils.Array.GetRandom(colors);
            const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.6);
            dot.setDepth(-5);
            
            // Add floating animation to dots
            this.tweens.add({
                targets: dot,
                y: y - Phaser.Math.Between(20, 50),
                alpha: 0.2,
                duration: Phaser.Math.Between(3000, 6000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }
    }

    createParticleEffects() {
        // Create floating dust particles for atmosphere
        const particleConfig = {
            x: { min: 0, max: this.scale.width },
            y: { min: -50, max: this.scale.height + 50 },
            scale: { min: 0.1, max: 0.3 },
            alpha: { min: 0.1, max: 0.4 },
            speed: { min: 10, max: 30 },
            lifespan: { min: 3000, max: 8000 },
            quantity: 2,
            frequency: 500
        };

        // Create simple particle emitter using graphics
        this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.scene.isActive()) {
                    const x = Phaser.Math.Between(0, this.scale.width);
                    const y = Phaser.Math.Between(-50, this.scale.height + 50);
                    
                    // Create vibrant floating particles
                    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3, 0xfbbf24];
                    const color = Phaser.Utils.Array.GetRandom(colors);
                    
                    const particle = this.add.circle(x, y, Phaser.Math.Between(2, 5), color, 0.6);
                    particle.setDepth(-1);
                    
                    this.tweens.add({
                        targets: particle,
                        y: y + Phaser.Math.Between(-100, 100),
                        x: x + Phaser.Math.Between(-50, 50),
                        alpha: 0,
                        scaleX: 0.2,
                        scaleY: 0.2,
                        duration: Phaser.Math.Between(3000, 8000),
                        ease: 'Sine.easeInOut',
                        onComplete: () => particle.destroy()
                    });
                }
            },
            loop: true
        });
    }

    createLightingEffects() {
        // Create a lighting overlay that follows the player
        this.lightingOverlay = this.add.graphics();
        this.lightingOverlay.setDepth(5);
        this.updateLightingEffects();
    }

    updateLightingEffects() {
        if (!this.lightingOverlay) return;

        this.lightingOverlay.clear();
        
        const cellSize = 64 * this.scaleFactor;
        const playerX = this.offsetX + this.player.x * cellSize + cellSize / 2;
        const playerY = this.offsetY + this.player.y * cellSize + cellSize / 2;
        
        // Create a radial gradient effect around the player
        const radius = cellSize * 2;
        
        // Dark overlay with reduced opacity for brighter look
        this.lightingOverlay.fillStyle(0x000000, 0.15);
        this.lightingOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
        
        // Light circle around player
        this.lightingOverlay.fillStyle(0x000000, 0);
        this.lightingOverlay.beginPath();
        this.lightingOverlay.arc(playerX, playerY, radius, 0, Math.PI * 2);
        this.lightingOverlay.closePath();
        this.lightingOverlay.fillPath();
        
        // Subtle glow effect with vibrant colors
        for (let i = 0; i < 3; i++) {
            this.lightingOverlay.lineStyle(2 + i, 0xff6b6b, 0.15 - i * 0.04);
            this.lightingOverlay.strokeCircle(playerX, playerY, radius - i * 10);
        }
    }    update(time, delta) {
        // Remove the constant grid redrawing to prevent interference with quiz box visibility
        // Grid will be redrawn when needed (player movement, enemy defeat, etc.)
    }
    getEnemyConfig(quizBox = null) {
        let enemyHP = 100;
        let enemyLabel = `Intensity ${this.intensity} - HP: ${enemyHP}`;
        let spriteKey = 'goblinNerd'; // Default sprite
        
        // Use the quiz box's sprite if available
        if (quizBox && quizBox.sprite) {
            spriteKey = quizBox.sprite;
        }
        
        return {
            spriteKey: spriteKey,
            maxHP: enemyHP,
            label: enemyLabel
        };
    }    onEnemyDefeated() {
        this.enemiesDefeated++;
        
        // Show card reward system
        this.showCardReward(false, () => {
            // This callback runs after card selection is complete
            this.continueAfterCardReward();
        });
    }
    
    showCardReward(isBossReward, callback) {
        this.cardRewardCallback = callback;
        this.scene.pause(); // Pause current scene
        this.scene.launch('CardRewardScene', {
            returnScene: 'DungeonScene',
            playerLevel: this.intensity,
            isBossReward: false
        });
    }
    
    continueAfterCardReward() {
        // Check if intensity should increase (every 2 enemies defeated)
        if (this.enemiesDefeated % 2 === 0 && this.intensity <= this.maxIntensity) {
            this.intensity++;
            
            // Reset player position to starting position when intensity increases
            this.player.x = Math.floor(GRID_WIDTH / 2);
            this.player.y = GRID_HEIGHT - 1;
            this.grid[this.player.y][this.player.x].visited = true;
            
            // Update adjacent cells after position reset
            this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);
            
            // Show intensity increase notification
            this.showIntensityNotification();
        }
        
        // Check if we've reached max course completion
        if (this.intensity > this.maxIntensity && this.courseTopic) {
            this.completeCourse();
            
            // Launch DungeonCleared scene with course stats
            this.scene.start('DungeonCleared', {
                courseStats: this.courseStats,
                courseTopic: this.courseTopic
            });
            return;
        }
        
        // Spawn new quiz boxes if needed (only if no enemies remain)
        this.spawnNewQuizBoxes();
    }
      showIntensityNotification() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Enhanced notification background with gradient
        const notificationBg = this.add.graphics();
        
        // Gradient background
        notificationBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x4c1d95, 0x7c2d12, 1);
        notificationBg.fillRoundedRect(centerX - 200, centerY - 80, 400, 160, 15);
        
        // Multiple glowing borders
        notificationBg.lineStyle(4, 0xfbbf24, 1);
        notificationBg.strokeRoundedRect(centerX - 200, centerY - 80, 400, 160, 15);
        
        notificationBg.lineStyle(2, 0xfef3c7, 0.8);
        notificationBg.strokeRoundedRect(centerX - 196, centerY - 76, 392, 152, 12);
        
        notificationBg.setDepth(100);
        
        // Enhanced notification text with glow effect
        const message = this.intensity > this.maxIntensity ? 
            "🏆 COURSE COMPLETE! 🏆" : 
            `⚡ INTENSITY LEVEL ${this.intensity}! ⚡`;
            
        const notificationText = this.add.text(centerX, centerY - 30, message, {
            fontSize: '24px',
            fill: this.intensity > this.maxIntensity ? '#ff1744' : '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 5,
                stroke: true,
                fill: true
            }
        }).setOrigin(0.5).setDepth(101);
        
        // Enhanced position reset notification
        const resetText = this.add.text(centerX, centerY + 20, '🔄 Player position reset! 🔄', {
            fontSize: '16px',
            fill: '#00ffff',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 3,
                stroke: true,
                fill: true
            }
        }).setOrigin(0.5).setDepth(101);
        
        // Particle burst effect
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(centerX, centerY, 3, 0xffd700, 1);
            particle.setDepth(102);
            
            this.tweens.add({
                targets: particle,
                x: centerX + Phaser.Math.Between(-150, 150),
                y: centerY + Phaser.Math.Between(-100, 100),
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: 1000,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }
        
        // Enhanced animations
        notificationBg.setAlpha(0);
        notificationText.setAlpha(0);
        resetText.setAlpha(0);
        
        // Scale-in animation
        notificationBg.setScale(0.5);
        notificationText.setScale(0.5);
        resetText.setScale(0.5);
        
        this.tweens.add({
            targets: [notificationBg, notificationText, resetText],
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });
        
        // Pulsing effect
        this.tweens.add({
            targets: notificationText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 3
        });
        
        // Fade out animation
        this.tweens.add({
            targets: [notificationBg, notificationText, resetText],
            alpha: 0,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 600,
            delay: 3000,
            ease: 'Power2.easeIn',
            onComplete: () => {
                notificationBg.destroy();
                notificationText.destroy();
                resetText.destroy();
            }
        });
    }
    
    completeCourse() {
        // Mark course as completed in game manager
        const courseMap = {
            'webdesign': 'Web_Design',
            'python': 'Python',
            'java': 'Java',
            'C': 'C',
            'C++': 'C++',
            'C#': 'C#'
        };
        
        const courseKey = courseMap[this.courseTopic];
        if (courseKey) {
            gameManager.setCourseCompleted(courseKey, true);
        }
    }    spawnNewQuizBoxes() {
        // Validate grid state before spawning
        if (!this.grid || this.grid.length === 0) {
            console.error('Cannot spawn quiz boxes - grid not properly initialized');
            return;
        }
        
        // Only spawn new quiz boxes if there are NO enemies currently on the field
        const currentBoxCount = this.quizBoxes.length;
        
        // Don't spawn new enemies until all current enemies are defeated
        if (currentBoxCount > 0) {
            return;
        }
        
        const targetBoxCount = 3; // Always spawn 3 enemies
        
        const newBoxes = this.placeQuizBoxes(targetBoxCount);
        
        // Validate new boxes before adding them
        if (!newBoxes || newBoxes.length === 0) {
            console.error('Failed to place new quiz boxes');
            return;
        }
        
        this.quizBoxes = newBoxes; // Replace instead of push to avoid accumulation
        
        // Immediately redraw grid to show new boxes
        this.drawGrid();
        this.updateLightingEffects();
    }
    
    // Enhanced notification method
    showNotification(title, message = '') {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Notification background
        const notificationBg = this.add.graphics();
        notificationBg.fillStyle(0x1a1a2e, 0.9);
        notificationBg.fillRoundedRect(centerX - 150, centerY - 60, 300, 120, 10);
        notificationBg.lineStyle(2, 0xfbbf24, 1);
        notificationBg.strokeRoundedRect(centerX - 150, centerY - 60, 300, 120, 10);
        notificationBg.setDepth(100);
        
        // Title text
        const titleText = this.add.text(centerX, centerY - 20, title, {
            fontSize: '18px',
            fill: '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(101);
        
        // Message text
        const messageText = this.add.text(centerX, centerY + 10, message, {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Caprasimo-Regular'
        }).setOrigin(0.5).setDepth(101);
        
        // Fade out animation
        this.tweens.add({
            targets: [notificationBg, titleText, messageText],
            alpha: 0,
            duration: 600,
            delay: 2000,
            ease: 'Power2.easeIn',
            onComplete: () => {
                notificationBg.destroy();
                titleText.destroy();
                messageText.destroy();
            }
        });
    }

    // Tutorial System Methods
    setupTutorialSystem() {
        // Set up keyboard event listeners for debug keys
        this.input.keyboard.on('keydown', (event) => {
            if (event.shiftKey && event.code === 'KeyT') {
                // Shift+T: Manual tutorial trigger (for testing)
                this.triggerManualTutorial();
            } else if (event.shiftKey && event.code === 'KeyR') {
                // Shift+R: Reset tutorial flags (for testing)
                this.resetTutorialFlags();
            }
        });
    }

    checkAndShowTutorial() {
        if (!this.tutorialManager) {
            return;
        }

        // Check each tutorial trigger condition
        for (const [triggerName, triggerFunction] of Object.entries(DUNGEON_TUTORIAL_TRIGGERS)) {
            const shouldTrigger = triggerFunction(this);
            
            if (shouldTrigger) {
                const tutorialSteps = prepareTutorialSteps(this, triggerName);
                
                this.tutorialManager.init(tutorialSteps, {
                    onComplete: () => {
                        this.onTutorialComplete(triggerName);
                    },
                    onSkip: () => {
                        this.onTutorialComplete(triggerName);
                    }
                });
                break; // Only show one tutorial at a time
            }
        }
    }

    onTutorialComplete(tutorialType) {
        // Mark tutorial as seen and update flags
        if (tutorialType === 'firstTimeDungeon') {
            localStorage.setItem('sci-high-dungeon-tutorial-seen', 'true');
            this.tutorialFlags.firstTimeTutorialShown = true;
        } else if (tutorialType === 'firstQuizBox') {
            this.tutorialFlags.firstQuizBoxShown = true;
        } else if (tutorialType === 'bossEncounter') {
            this.tutorialFlags.bossEncounterShown = true;
        }
    }

    triggerManualTutorial() {
        if (!this.tutorialManager) {
            return;
        }

        // Trigger basic tutorial manually for testing
        this.showInitialDungeonTutorial();
    }

    resetTutorialFlags() {
        // Reset localStorage flags
        localStorage.removeItem('sci-high-dungeon-tutorial-seen');
        localStorage.removeItem('sci-high-dungeon-basic-tutorial-seen');
        
        // Reset scene flags
        this.tutorialFlags = {
            firstTimeTutorialShown: false,
            firstQuizBoxShown: false,
            bossEncounterShown: false
        };
        
        // Show notification to user
        this.showNotification('Tutorial flags reset!', 'Press Shift+T to trigger tutorial');
    }

    showInitialDungeonTutorial() {
        if (!this.tutorialManager) {
            return;
        }

        // Create mobile-aware tutorial steps
        const controlsText = this.isMobile ? 
            "Welcome to the dungeon! You can move your character by tapping on the highlighted tiles around your player, or use the virtual D-pad in the bottom-left corner." :
            "Welcome to the dungeon! You can move your character using the arrow keys on your keyboard, or by clicking on the highlighted tiles around your player.";

        const tutorialSteps = [
            {
                title: "🎮 Dungeon Controls",
                text: controlsText,
                textBoxPosition: { x: 400, y: 150 }
            },
            {
                title: "⚔️ Combat System",
                text: "Move your character into an enemy (the colored boxes) to start a quiz-battle! Each enemy has different difficulty levels indicated by their colors.",
                textBoxPosition: { x: 400, y: 200 }
            },
            {
                title: "🎯 Your Goal",
                text: "Defeat all enemies in the dungeon to progress! Your intensity level will increase as you defeat more enemies, making them stronger but earning you better rewards.",
                textBoxPosition: { x: 400, y: 250 }
            },
            {
                title: "✨ Let's Begin!",
                text: "Good luck, adventurer! Use your programming knowledge to defeat the enemies and conquer the dungeon!",
                textBoxPosition: { x: 400, y: 300 },
                buttonText: "Start Adventure!"
            }
        ];

        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                // Mark tutorial as seen
                localStorage.setItem('sci-high-dungeon-basic-tutorial-seen', 'true');
                
                // Now check for other tutorials
                this.checkAndShowTutorial();
            },
            onSkip: () => {
                // Mark tutorial as seen even if skipped
                localStorage.setItem('sci-high-dungeon-basic-tutorial-seen', 'true');
                
                // Now check for other tutorials
                this.checkAndShowTutorial();
            }
        });
    }

    // Pathfinding and connectivity methods
    isPathExists(startX, startY, endX, endY) {
        // Validate input parameters and grid state
        if (!this.grid || this.grid.length === 0) {
            console.warn('Grid not initialized for pathfinding');
            return false;
        }
        
        // Additional grid validation
        if (this.grid.length !== GRID_HEIGHT) {
            console.error(`Grid height mismatch - expected ${GRID_HEIGHT}, got ${this.grid.length}`);
            return false;
        }
        
        // Check bounds for all coordinates
        if (startX < 0 || startX >= GRID_WIDTH || startY < 0 || startY >= GRID_HEIGHT ||
            endX < 0 || endX >= GRID_WIDTH || endY < 0 || endY >= GRID_HEIGHT) {
            console.warn(`Pathfinding coordinates out of bounds: start(${startX},${startY}) end(${endX},${endY})`);
            return false;
        }
        
        // Check if required rows exist and are arrays
        if (!this.grid[startY] || !Array.isArray(this.grid[startY]) || this.grid[startY].length !== GRID_WIDTH) {
            console.error(`Grid row ${startY} is invalid - exists: ${!!this.grid[startY]}, isArray: ${Array.isArray(this.grid[startY])}, length: ${this.grid[startY] ? this.grid[startY].length : 'N/A'}`);
            return false;
        }
        
        if (!this.grid[endY] || !Array.isArray(this.grid[endY]) || this.grid[endY].length !== GRID_WIDTH) {
            console.error(`Grid row ${endY} is invalid - exists: ${!!this.grid[endY]}, isArray: ${Array.isArray(this.grid[endY])}, length: ${this.grid[endY] ? this.grid[endY].length : 'N/A'}`);
            return false;
        }
        
        // Check if start and end positions are walkable
        if (!this.grid[startY][startX] || !this.grid[startY][startX].walkable ||
            !this.grid[endY][endX] || !this.grid[endY][endX].walkable) {
            console.warn(`Pathfinding: start or end position not walkable - start: ${this.grid[startY][startX] ? this.grid[startY][startX].walkable : 'N/A'}, end: ${this.grid[endY][endX] ? this.grid[endY][endX].walkable : 'N/A'}`);
            return false;
        }

        const visited = new Set();
        const queue = [{ x: startX, y: startY }];
        visited.add(`${startX},${startY}`);

        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.x === endX && current.y === endY) {
                return true;
            }

            const neighbors = this.getAdjacentPositions(current.x, current.y, GRID_WIDTH, GRID_HEIGHT);
            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.y}`;
                if (!visited.has(key) && 
                    this.grid[neighbor.y] && 
                    this.grid[neighbor.y][neighbor.x] && 
                    this.grid[neighbor.y][neighbor.x].walkable) {
                    visited.add(key);
                    queue.push(neighbor);
                }
            }
        }

        return false;
    }

    ensurePathToQuizBoxes() {
        // Validate grid state before proceeding
        if (!this.grid || this.grid.length === 0) {
            console.warn('Cannot ensure paths - grid not initialized');
            return;
        }
        
        const playerStartX = Math.floor(GRID_WIDTH / 2);
        const playerStartY = GRID_HEIGHT - 1;

        // Validate player starting position
        if (!this.grid[playerStartY] || !this.grid[playerStartY][playerStartX]) {
            console.warn('Player starting position invalid in grid');
            return;
        }

        // Get all walkable positions as potential quiz box positions
        let potentialPositions = [];
        
        try {
            // For default dungeon, check all walkable positions
            potentialPositions = this.getAllWalkablePositions();
        } catch (error) {
            console.error('Error getting potential positions:', error);
            return;
        }

        // Ensure at least 2 positions are reachable for regular levels, 1 for boss
        const requiredPositions = this.isBossLevel ? 1 : 2;
        const reachablePositions = [];
        
        for (const pos of potentialPositions) {
            try {
                if (this.isPathExists(playerStartX, playerStartY, pos.x, pos.y)) {
                    reachablePositions.push(pos);
                }
            } catch (error) {
                console.error(`Error checking path to position (${pos.x}, ${pos.y}):`, error);
                console.error('Grid state:', {
                    gridExists: !!this.grid,
                    gridLength: this.grid ? this.grid.length : 'N/A',
                    playerStart: `(${playerStartX}, ${playerStartY})`,
                    targetPosition: `(${pos.x}, ${pos.y})`
                });
            }
        }

        if (reachablePositions.length < requiredPositions) {
            this.createAdditionalPaths(playerStartX, playerStartY, potentialPositions, requiredPositions - reachablePositions.length);
        }
    }

    createAdditionalPaths(startX, startY, targetPositions, neededPaths) {
        // Create direct paths to unreachable positions
        const unreachablePositions = targetPositions.filter(pos => 
            !this.isPathExists(startX, startY, pos.x, pos.y)
        );

        for (let i = 0; i < Math.min(neededPaths, unreachablePositions.length); i++) {
            const target = unreachablePositions[i];
            this.createDirectPath(startX, startY, target.x, target.y);
        }
    }

    createDirectPath(startX, startY, endX, endY) {
        // Create a direct walkable path between two points
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY));

        for (let i = 0; i <= steps; i++) {
            const x = Math.round(startX + (deltaX * i) / steps);
            const y = Math.round(startY + (deltaY * i) / steps);
            
            if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                this.grid[y][x].walkable = true;
                this.grid[y][x].isWall = false;
                
                // Also make adjacent cells walkable for wider paths
                const neighbors = this.getAdjacentPositions(x, y, GRID_WIDTH, GRID_HEIGHT);
                neighbors.forEach(neighbor => {
                    if (Math.random() < 0.5) { // 50% chance to make adjacent cells walkable
                        this.grid[neighbor.y][neighbor.x].walkable = true;
                        this.grid[neighbor.y][neighbor.x].isWall = false;
                    }
                });
            }
        }
    }

    getAllWalkablePositions() {
        const positions = [];
        
        // Validate grid before processing
        if (!this.grid || this.grid.length === 0) {
            console.warn('Cannot get walkable positions - grid not initialized');
            return positions;
        }
        
        for (let y = 0; y < GRID_HEIGHT - 1; y++) {
            if (this.grid[y]) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    if (this.grid[y][x] && this.grid[y][x].walkable) {
                        positions.push({ x, y });
                    }
                }
            }
        }
        return positions;
    }

    getAdjacentPositions(x, y, width, height) {
        const positions = [];
        const directions = [
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 },  // down
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 }   // right
        ];
        
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                positions.push({ x: newX, y: newY });
            }
        }
        
        return positions;
    }
    
    // Mobile-specific methods
    detectMobile() {
        const scaleInfo = getScaleInfo(this);
        return scaleInfo.isMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }
    
    getCellSize() {
        return this.isMobile ? Math.max(48 * this.scaleFactor, 32) : 64 * this.scaleFactor;
    }
    
    setupMobileControls() {
        // Clean up existing mobile controls
        if (this.virtualDPad) {
            this.virtualDPad.destroy();
            this.virtualDPad = null;
        }
        
        if (!this.isMobile) return;
        
        // Create virtual D-pad container
        this.virtualDPad = this.add.container(0, 0);
        this.virtualDPad.setDepth(1000);
        
        // D-pad position (bottom-left corner)
        const dpadX = 80;
        const dpadY = this.scale.height - 80;
        const buttonSize = 50;
        const buttonGap = 5;
        
        // D-pad background
        const dpadBg = this.add.circle(dpadX, dpadY, buttonSize + 15, 0x1a1a1a, 0.6);
        dpadBg.setStrokeStyle(2, 0x4a5568, 0.8);
        this.virtualDPad.add(dpadBg);
        
        // Create directional buttons
        const directions = [
            { key: 'up', x: 0, y: -buttonSize - buttonGap, dx: 0, dy: -1, text: '↑' },
            { key: 'down', x: 0, y: buttonSize + buttonGap, dx: 0, dy: 1, text: '↓' },
            { key: 'left', x: -buttonSize - buttonGap, y: 0, dx: -1, dy: 0, text: '←' },
            { key: 'right', x: buttonSize + buttonGap, y: 0, dx: 1, dy: 0, text: '→' }
        ];
        
        directions.forEach(dir => {
            const buttonX = dpadX + dir.x;
            const buttonY = dpadY + dir.y;
            
            // Button background
            const button = this.add.circle(buttonX, buttonY, buttonSize / 2, 0x4a5568, 0.8);
            button.setStrokeStyle(2, 0x718096, 1);
            button.setInteractive({ useHandCursor: true });
            
            // Button text
            const buttonText = this.add.text(buttonX, buttonY, dir.text, {
                fontSize: '24px',
                fill: '#ffffff',
                fontFamily: 'Caprasimo-Regular'
            }).setOrigin(0.5);
            
            // Button interaction
            button.on('pointerdown', () => {
                const newX = this.player.x + dir.dx;
                const newY = this.player.y + dir.dy;
                this.movePlayer(newX, newY);
                
                // Visual feedback
                button.setFillStyle(0x63b3ed, 1);
                this.time.delayedCall(150, () => {
                    button.setFillStyle(0x4a5568, 0.8);
                });
            });
            
            this.virtualDPad.add([button, buttonText]);
        });
        
        // Add tap-to-move instructions for mobile
        const instructionText = this.add.text(this.scale.width / 2, 30, 
            'Tap grid to move or use D-pad', {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);
        
        if (this.mobileInstructions) {
            this.mobileInstructions.destroy();
        }
        this.mobileInstructions = instructionText;
    }
    
    isPointerOnVirtualDPad(pointer) {
        if (!this.virtualDPad || !this.isMobile) return false;
        
        const dpadX = 80;
        const dpadY = this.scale.height - 80;
        const dpadRadius = 120; // Detection radius around D-pad
        
        const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, dpadX, dpadY);
        return distance <= dpadRadius;
    }
}