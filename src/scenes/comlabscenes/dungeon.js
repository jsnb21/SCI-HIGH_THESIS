import Phaser from 'phaser';
import { playExclusiveBGM } from '../../audioUtils.js';
import { DungeonHUD, DungeonMenu } from '../../ui/dungeon_hud.js';
import gameManager from '../../gameManager.js';

const GRID_WIDTH = 7;
const GRID_HEIGHT = 8;
const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class DungeonScene extends Phaser.Scene {    constructor() {
        super('DungeonScene');
        this.grid = [];
        this.player = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1, hp: gameManager.getPlayerHP(), buffs: [] };
        this.adjacentCells = [];
        this.breathAlpha = 0.5;
        this.breathDir = 1;
        this.intensity = 1;
        this.hudElements = [];
        this.scaleFactor = 1;        this.offsetX = 0;        this.offsetY = 0;
        this.quizBoxes = [];
        this.quizBoxSprites = []; // Track quiz box sprites
        this.particles = null;
        this.lightingOverlay = null;
        this.playerSprite = null;
          // Progression system variables
        this.enemiesDefeated = 0;
        this.maxIntensity = 3;
        this.playerDamage = 10;
        this.isBossLevel = false;
        
        // Course statistics tracking
        this.courseStats = {
            totalScore: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            comboScore: 0
        };
    }    init(data) {
        // Reset player HP to full when starting a new dungeon
        gameManager.resetPlayerHP();
        console.log('DungeonScene: Player HP reset for new dungeon');
        
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

    create() {        // Reset all persistent state
        this.grid = [];
        this.player = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1, hp: gameManager.getPlayerHP(), buffs: [] };
        this.adjacentCells = [];
        this.breathAlpha = 0.5;
        this.breathDir = 1;
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
        this.isBossLevel = false;
        
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
        this.grid[this.player.y][this.player.x].visited = true;

        // Calculate adjacent cells initially
        this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);

        this.input.keyboard.on('keydown', this.handleInput, this);
        this.input.on('pointerdown', this.handlePointer, this);        this.drawGrid();

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
        this.scale.on('resize', this.onResize, this);
        this.updateScale();        this.events.once('shutdown', this.shutdown, this);

        // Check if this should be a boss level based on current intensity
        this.isBossLevel = this.intensity > this.maxIntensity;
        console.log(`Initial boss level check: intensity=${this.intensity}, maxIntensity=${this.maxIntensity}, isBossLevel=${this.isBossLevel}`);

        // Place quiz boxes based on current level type
        const boxCount = this.isBossLevel ? 1 : 2;
        this.quizBoxes = this.placeQuizBoxes(boxCount);
          // Add resume event handler
        this.events.on('resume', this.onResume, this);
        
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
            console.log('Enemy defeat detected via direct flag');
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
                
                console.log('Quiz stats collected:', {
                    score: quizScene.score,
                    correct: quizScene.correctAnswers,
                    courseStats: this.courseStats
                });
                
                quizScene.enemyDefeated = false; // Reset flag
                console.log('Enemy defeat detected via scene flag');
            }
        }
        
        if (enemyWasDefeated) {
            console.log('Enemy was defeated! Calling onEnemyDefeated()');
            this.onEnemyDefeated();
        }
        
        // Update adjacent cells on resume
        this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);

        // Redraw grid and HUD when scene is resumed
        this.drawGrid();
        this.updateLightingEffects();
        if (this.dungeonHUD && this.dungeonHUD.drawHUD) this.dungeonHUD.drawHUD();
        if (this.dungeonMenu && this.dungeonMenu.createMenuButton) this.dungeonMenu.createMenuButton();
    }shutdown() {
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
        if (this.dungeonHUD) this.dungeonHUD.shutdown();
        if (this.dungeonMenu) this.dungeonMenu.shutdown();
        if (this.quizBoxSprites && this.quizBoxSprites.length) {
            this.quizBoxSprites.forEach(sprite => sprite.destroy());
            this.quizBoxSprites = [];
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

            // Update adjacent cells after moving
            this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);

            // Check for quiz box trigger
            const quizBoxIndex = this.quizBoxes.findIndex(
                pos => pos.x === targetX && pos.y === targetY
            );            if (quizBoxIndex !== -1) {
                // Remove the triggered quiz box so it can't be triggered again
                this.quizBoxes.splice(quizBoxIndex, 1);
                
                // Determine enemy configuration based on intensity and boss level
                const enemyConfig = this.getEnemyConfig();
                
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
            }this.drawGrid();
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
    }    onResize(gameSize) {
        this.updateScale();
        this.drawGrid();
        this.updateLightingEffects();
        if (this.dungeonHUD && this.dungeonHUD.drawHUD) this.dungeonHUD.drawHUD();
        if (this.dungeonMenu && this.dungeonMenu.createMenuButton) this.dungeonMenu.createMenuButton();
    }drawGrid() {
        // Clear previous quiz box sprites and player sprite
        if (this.quizBoxSprites && this.quizBoxSprites.length) {
            this.quizBoxSprites.forEach(sprite => sprite.destroy());
            this.quizBoxSprites = [];
        }
        if (this.playerSprite) {
            this.playerSprite.destroy();
            this.playerSprite = null;
        }

        if (this.gridGraphics) this.gridGraphics.clear();
        else this.gridGraphics = this.add.graphics();

        const cellSize = 64 * this.scaleFactor;
        const gap = 4 * this.scaleFactor;
        const borderWidth = 3 * this.scaleFactor;

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cellX = this.offsetX + x * cellSize + gap / 2;
                const cellY = this.offsetY + y * cellSize + gap / 2;
                const cellWidth = cellSize - gap;
                const cellHeight = cellSize - gap;            let fillColor = 0x4c1d95; // Vibrant purple for unvisited
            let borderColor = 0x8b5cf6;
            let fillAlpha = 1;
            let borderAlpha = 0.9;
            let glowColor = null;

            // Determine cell appearance with vibrant colors
            if (this.grid[y][x].visited) {
                fillColor = 0x059669; // Vibrant emerald for visited
                borderColor = 0x10b981;
                glowColor = 0x34d399;
            }

            // Adjacent cells that can be moved to - bright and pulsing
            if (this.adjacentCells.some(cell => cell.x === x && cell.y === y) &&
                !(this.player.x === x && this.player.y === y)) {
                fillColor = 0xf59e0b; // Vibrant amber
                borderColor = 0xfbbf24;
                fillAlpha = this.breathAlpha;
                borderAlpha = this.breathAlpha;
                glowColor = 0xfde047;
            }            // Draw quiz box if present with enhanced effects
            if (this.quizBoxes.some(pos => pos.x === x && pos.y === y)) {
                // Multi-layered vibrant background for quiz box
                this.gridGraphics.fillStyle(0xdc2626, 1); // Bright red base
                this.gridGraphics.fillRoundedRect(cellX, cellY, cellWidth, cellHeight, 12 * this.scaleFactor);
                
                // Pulsing glow layers
                this.gridGraphics.lineStyle(borderWidth * 3, 0xff6b6b, 0.8); // Bright red outer glow
                this.gridGraphics.strokeRoundedRect(cellX - 4, cellY - 4, cellWidth + 8, cellHeight + 8, 16 * this.scaleFactor);
                
                this.gridGraphics.lineStyle(borderWidth * 2, 0xfbbf24, 1); // Gold middle glow
                this.gridGraphics.strokeRoundedRect(cellX - 2, cellY - 2, cellWidth + 4, cellHeight + 4, 14 * this.scaleFactor);
                
                this.gridGraphics.lineStyle(borderWidth, 0xfde047, 1); // Bright yellow border
                this.gridGraphics.strokeRoundedRect(cellX, cellY, cellWidth, cellHeight, 12 * this.scaleFactor);
                
                // Vibrant inner highlight
                this.gridGraphics.fillStyle(0xf97316, 0.6); // Bright orange overlay
                this.gridGraphics.fillRoundedRect(cellX + 4, cellY + 4, cellWidth - 8, cellHeight - 8, 8 * this.scaleFactor);                // Enhanced quiz box sprite with multiple effects
                const sprite = this.add.image(
                    cellX + cellWidth / 2,
                    cellY + cellHeight / 2,
                    this.isBossLevel ? 'bigSlime' : 'quizbox'
                ).setDisplaySize(cellWidth * 0.8, cellHeight * 0.8);
                
                // Vibrant tinting for different enemy types
                if (this.isBossLevel) {
                    sprite.setTint(0xff0066); // Bright magenta for boss
                } else {
                    sprite.setTint(0x00ffff); // Bright cyan for regular enemies
                }
                    
                    this.quizBoxSprites.push(sprite);
                    
                    // Enhanced floating animation with rotation
                    this.tweens.add({
                        targets: sprite,
                        y: sprite.y - 8 * this.scaleFactor,
                        angle: 5,
                        duration: 1500,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                    
                    // Pulsing scale effect
                    this.tweens.add({
                        targets: sprite,
                        scaleX: sprite.scaleX * 1.2,
                        scaleY: sprite.scaleY * 1.2,
                        duration: 2000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
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

        // Enhanced player representation with multiple effects
        const playerCellX = this.offsetX + this.player.x * cellSize + cellSize / 2;
        const playerCellY = this.offsetY + this.player.y * cellSize + cellSize / 2;
        
        // Multi-layered player glow effect with vibrant colors
        const outerGlow = this.add.circle(playerCellX, playerCellY, cellSize * 0.6, 0xff6b6b, 0.3);
        outerGlow.setDepth(1);
        this.quizBoxSprites.push(outerGlow);
        
        const innerGlow = this.add.circle(playerCellX, playerCellY, cellSize * 0.4, 0xfbbf24, 0.5);
        innerGlow.setDepth(2);
        this.quizBoxSprites.push(innerGlow);
        
        // Player sprite with enhanced effects
        this.playerSprite = this.add.image(playerCellX, playerCellY, 'goblinNerd');
        this.playerSprite.setDisplaySize(cellSize * 0.7, cellSize * 0.7);
        this.playerSprite.setDepth(3);
        this.playerSprite.setTint(0x22d3ee); // Bright cyan tint
        
        // Enhanced player animations
        this.tweens.add({
            targets: [outerGlow, innerGlow],
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0.1,
            duration: 1200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        
        this.tweens.add({
            targets: this.playerSprite,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Update lighting effects
        this.updateLightingEffects();
    }    placeQuizBoxes(count) {
        const positions = [];
        
        // Special placement for boss level - boss goes in the center
        if (this.isBossLevel && count === 1) {
            const centerX = Math.floor(GRID_WIDTH / 2);
            const centerY = Math.floor(GRID_HEIGHT / 2);
            positions.push({ x: centerX, y: centerY });
            console.log(`Boss placed at center: (${centerX}, ${centerY})`);
            return positions;
        }
        
        // Regular enemy placement for non-boss levels
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
        // Enhanced breathing animation for adjacent cells
        this.breathAlpha += this.breathDir * delta * 0.002;
        if (this.breathAlpha > 0.9) {
            this.breathAlpha = 0.9;
            this.breathDir = -1;
        }
        if (this.breathAlpha < 0.5) {
            this.breathAlpha = 0.5;
            this.breathDir = 1;
        }
        
        // Only redraw grid occasionally to improve performance
        if (Math.floor(time / 100) % 2 === 0) {
            this.drawGrid();
        }
    }
    getEnemyConfig() {
        // Determine if this is a boss level
        this.isBossLevel = this.intensity > this.maxIntensity;
        
        let enemyHP, enemyLabel;
        
        if (this.isBossLevel) {
            enemyHP = 200;
            enemyLabel = `Boss Level - HP: ${enemyHP}`;
        } else {
            enemyHP = 100;
            enemyLabel = `Intensity ${this.intensity} - HP: ${enemyHP}`;
        }
        
        return {
            spriteKey: this.isBossLevel ? 'bigSlime' : 'goblinNerd', // Use different sprite for boss
            maxHP: enemyHP,
            label: enemyLabel
        };
    }    onEnemyDefeated() {
        this.enemiesDefeated++;
        console.log(`Enemy defeated! Total defeated: ${this.enemiesDefeated}`);
        console.log(`Current intensity: ${this.intensity}, isBossLevel: ${this.isBossLevel}`);
        
        // Show card reward system before checking for boss defeat
        const isBossReward = this.isBossLevel;
        this.showCardReward(isBossReward, () => {
            // This callback runs after card selection is complete
            this.continueAfterCardReward();
        });
    }
    
    showCardReward(isBossReward, callback) {
        console.log(`Showing card reward - Boss reward: ${isBossReward}`);
        this.cardRewardCallback = callback;
        this.scene.pause(); // Pause current scene
        this.scene.launch('CardRewardScene', {
            returnScene: 'DungeonScene',
            playerLevel: this.intensity,
            isBossReward: isBossReward
        });
    }
    
    continueAfterCardReward() {
        // Check if this was a boss defeat - show results screen
        if (this.isBossLevel && this.courseTopic) {
            console.log(`Boss defeated! Course ${this.courseTopic} completed!`);
            this.completeCourse();
            
            // Launch DungeonCleared scene with course stats
            console.log('Launching DungeonCleared scene with stats:', this.courseStats);
            this.scene.start('DungeonCleared', {
                courseStats: this.courseStats,
                courseTopic: this.courseTopic
            });
            return;
        }
          // Check if intensity should increase (every 2 enemies defeated)
        if (this.enemiesDefeated % 2 === 0 && this.intensity <= this.maxIntensity) {
            this.intensity++;
            console.log(`Intensity increased to ${this.intensity}!`);
            
            // Update boss level status
            this.isBossLevel = this.intensity > this.maxIntensity;
            console.log(`Boss level status: ${this.isBossLevel}`);
            
            // Reset player position to starting position when intensity increases
            this.player.x = Math.floor(GRID_WIDTH / 2);
            this.player.y = GRID_HEIGHT - 1;
            this.grid[this.player.y][this.player.x].visited = true;
            
            // Update adjacent cells after position reset
            this.adjacentCells = this.getAdjacentCells(this.player.x, this.player.y);
            
            // Show intensity increase notification
            this.showIntensityNotification();
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
            "🏆 BOSS LEVEL UNLOCKED! 🏆" : 
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
            console.log(`Course ${courseKey} marked as completed!`);
        }
    }    spawnNewQuizBoxes() {
        // Only spawn new quiz boxes if there are NO enemies currently on the field
        const currentBoxCount = this.quizBoxes.length;
        
        // Don't spawn new enemies until all current enemies are defeated
        if (currentBoxCount > 0) {
            console.log(`Not spawning new enemies - ${currentBoxCount} enemies still remain`);
            return;
        }
        
        const targetBoxCount = this.isBossLevel ? 1 : 2; // Boss level has only 1 enemy
        
        console.log(`Spawning ${targetBoxCount} new enemies for ${this.isBossLevel ? 'boss' : 'regular'} level`);
        const newBoxes = this.placeQuizBoxes(targetBoxCount);
        this.quizBoxes.push(...newBoxes);
        this.drawGrid(); // Redraw to show new boxes
    }

    update(time, delta) {
        // Enhanced breathing animation for adjacent cells
        this.breathAlpha += this.breathDir * delta * 0.002;
        if (this.breathAlpha > 0.9) {
            this.breathAlpha = 0.9;
            this.breathDir = -1;
        }
        if (this.breathAlpha < 0.5) {
            this.breathAlpha = 0.5;
            this.breathDir = 1;
        }
        
        // Only redraw grid occasionally to improve performance
        if (Math.floor(time / 100) % 2 === 0) {
            this.drawGrid();
        }
    }    
    // Debug method to manually trigger boss level (for testing)
    debugTriggerBossLevel() {
        console.log('Debug: Triggering boss level manually');
        this.intensity = this.maxIntensity + 1;
        this.isBossLevel = true;
        this.enemiesDefeated = 6; // Simulate having defeated enough enemies
        
        // Clear existing boxes
        this.quizBoxes = [];
        
        // Place boss in center
        this.quizBoxes = this.placeQuizBoxes(1);
        this.drawGrid();
        
        console.log(`Boss level active: ${this.isBossLevel}, intensity: ${this.intensity}`);
    }

    // Debug method to simulate course completion (for testing)
    debugCompleteWithStats() {
        console.log('Debug: Completing course with sample stats');
        this.courseStats = {
            totalScore: 850,
            correctAnswers: 8,
            wrongAnswers: 2,
            comboScore: 35
        };
        this.completeCourse();
        
        // Use the new DungeonCleared scene
        this.scene.start('DungeonCleared', {
            courseStats: this.courseStats,
            courseTopic: this.courseTopic
        });
    }
    
    // Debug method to test card system (for testing)
    debugTestCardSystem() {
        console.log('Debug: Testing card system');
        this.showCardReward(false, () => {
            console.log('Card reward completed!');
        });
    }
    
    // Debug method to test boss card system (for testing)
    debugTestBossCardSystem() {
        console.log('Debug: Testing boss card system');
        this.showCardReward(true, () => {
            console.log('Boss card reward completed!');
        });
    }
}