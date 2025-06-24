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
    }    preload() {
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

        // Enhanced background with gradient
        this.cameras.main.setBackgroundColor('#1a1a2e');
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
        this.updateScale();

        this.events.once('shutdown', this.shutdown, this);

        this.quizBoxes = this.placeQuizBoxes(2);        // Add resume event handler
        this.events.on('resume', this.onResume, this);
    }    init(data) {
        this.courseTopic = data?.courseTopic || 'webdesign'; // Default to webdesign
    }    onResume(data) {
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
        const borderWidth = 2 * this.scaleFactor;

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cellX = this.offsetX + x * cellSize + gap / 2;
                const cellY = this.offsetY + y * cellSize + gap / 2;
                const cellWidth = cellSize - gap;
                const cellHeight = cellSize - gap;

                let fillColor = 0x2d3748; // Dark gray for unvisited
                let borderColor = 0x4a5568;
                let fillAlpha = 1;
                let borderAlpha = 0.8;

                // Determine cell appearance
                if (this.grid[y][x].visited) {
                    fillColor = 0x4a5568; // Lighter for visited
                    borderColor = 0x718096;
                }

                // Adjacent cells that can be moved to
                if (this.adjacentCells.some(cell => cell.x === x && cell.y === y) &&
                    !(this.player.x === x && this.player.y === y)) {
                    fillColor = 0x3182ce; // Blue for moveable
                    borderColor = 0x63b3ed;
                    fillAlpha = this.breathAlpha;
                    borderAlpha = this.breathAlpha;
                }

                // Draw quiz box if present
                if (this.quizBoxes.some(pos => pos.x === x && pos.y === y)) {
                    // Draw enhanced cell background for quiz box
                    this.gridGraphics.fillStyle(0x9f7aea, 1); // Purple background
                    this.gridGraphics.fillRoundedRect(cellX, cellY, cellWidth, cellHeight, 8 * this.scaleFactor);
                    
                    this.gridGraphics.lineStyle(borderWidth, 0xd69e2e, 1); // Gold border
                    this.gridGraphics.strokeRoundedRect(cellX, cellY, cellWidth, cellHeight, 8 * this.scaleFactor);

                    // Draw the quiz box sprite with enhanced effects
                    const sprite = this.add.image(
                        cellX + cellWidth / 2,
                        cellY + cellHeight / 2,
                        'quizbox'
                    ).setDisplaySize(cellWidth * 0.7, cellHeight * 0.7);
                    
                    // Add glow effect to quiz box
                    sprite.setTint(0xffd700);
                    this.quizBoxSprites.push(sprite);
                    
                    // Add floating animation
                    this.tweens.add({
                        targets: sprite,
                        y: sprite.y - 5 * this.scaleFactor,
                        duration: 1000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                } else {
                    // Regular cell
                    this.gridGraphics.fillStyle(fillColor, fillAlpha);
                    this.gridGraphics.fillRoundedRect(cellX, cellY, cellWidth, cellHeight, 6 * this.scaleFactor);
                    
                    this.gridGraphics.lineStyle(borderWidth, borderColor, borderAlpha);
                    this.gridGraphics.strokeRoundedRect(cellX, cellY, cellWidth, cellHeight, 6 * this.scaleFactor);

                    // Add inner highlight for visited cells
                    if (this.grid[y][x].visited) {
                        this.gridGraphics.lineStyle(1 * this.scaleFactor, 0xa0aec0, 0.5);
                        this.gridGraphics.strokeRoundedRect(
                            cellX + borderWidth,
                            cellY + borderWidth,
                            cellWidth - borderWidth * 2,
                            cellHeight - borderWidth * 2,
                            4 * this.scaleFactor
                        );
                    }
                }
            }
        }

        // Draw enhanced player representation
        const playerCellX = this.offsetX + this.player.x * cellSize + cellSize / 2;
        const playerCellY = this.offsetY + this.player.y * cellSize + cellSize / 2;
        
        // Player glow effect
        const playerGlow = this.add.circle(playerCellX, playerCellY, (cellSize * 0.4), 0x00ff00, 0.3);
        playerGlow.setDepth(2);
        this.quizBoxSprites.push(playerGlow); // Track for cleanup
        
        // Player sprite (using goblin as player representation)
        this.playerSprite = this.add.image(playerCellX, playerCellY, 'goblinNerd');
        this.playerSprite.setDisplaySize(cellSize * 0.6, cellSize * 0.6);
        this.playerSprite.setDepth(3);
        this.playerSprite.setTint(0x00ff88); // Green tint for player
        
        // Player idle animation
        this.tweens.add({
            targets: this.playerSprite,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Update lighting effects
        this.updateLightingEffects();
    }

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

    createBackgroundEffects() {
        // Create a gradient background
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        graphics.fillRect(0, 0, this.scale.width, this.scale.height);
        graphics.setDepth(-10);

        // Add some atmospheric dots for texture
        for (let i = 0; i < 30; i++) {
            const x = Phaser.Math.Between(0, this.scale.width);
            const y = Phaser.Math.Between(0, this.scale.height);
            const dot = this.add.circle(x, y, 1, 0x4a5568, 0.3);
            dot.setDepth(-5);
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
                    const particle = this.add.circle(x, y, 1, 0xffffff, 0.2);
                    particle.setDepth(-1);
                    
                    this.tweens.add({
                        targets: particle,
                        y: y + Phaser.Math.Between(-100, 100),
                        x: x + Phaser.Math.Between(-50, 50),
                        alpha: 0,
                        duration: Phaser.Math.Between(3000, 8000),
                        ease: 'Linear',
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
        
        // Dark overlay
        this.lightingOverlay.fillStyle(0x000000, 0.3);
        this.lightingOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
        
        // Light circle around player
        this.lightingOverlay.fillStyle(0x000000, 0);
        this.lightingOverlay.beginPath();
        this.lightingOverlay.arc(playerX, playerY, radius, 0, Math.PI * 2);
        this.lightingOverlay.closePath();
        this.lightingOverlay.fillPath();
        
        // Subtle glow effect
        for (let i = 0; i < 3; i++) {
            this.lightingOverlay.lineStyle(2 + i, 0xffd700, 0.1 - i * 0.03);
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
    }
      onEnemyDefeated() {
        this.enemiesDefeated++;
        console.log(`Enemy defeated! Total defeated: ${this.enemiesDefeated}`);
        console.log(`Current intensity: ${this.intensity}, isBossLevel: ${this.isBossLevel}`);
        
        // Check if intensity should increase (every 2 enemies defeated)
        if (this.enemiesDefeated % 2 === 0 && this.intensity <= this.maxIntensity) {
            this.intensity++;
            console.log(`Intensity increased to ${this.intensity}!`);
            
            // Show intensity increase notification
            this.showIntensityNotification();
        }
        
        // Check if course should be completed (after boss defeat)
        if (this.isBossLevel && this.courseTopic) {
            console.log(`Course ${this.courseTopic} completed!`);
            this.completeCourse();
        }
        
        // Spawn new quiz boxes if needed
        this.spawnNewQuizBoxes();
    }
    
    showIntensityNotification() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Create notification background
        const notificationBg = this.add.graphics();
        notificationBg.fillStyle(0x1a1a2e, 0.9);
        notificationBg.fillRoundedRect(centerX - 150, centerY - 40, 300, 80, 10);
        notificationBg.lineStyle(3, 0xff6b6b, 1);
        notificationBg.strokeRoundedRect(centerX - 150, centerY - 40, 300, 80, 10);
        notificationBg.setDepth(100);
        
        // Create notification text
        const message = this.intensity > this.maxIntensity ? 
            "BOSS LEVEL UNLOCKED!" : 
            `INTENSITY LEVEL ${this.intensity}!`;
            
        const notificationText = this.add.text(centerX, centerY, message, {
            fontSize: '20px',
            fill: this.intensity > this.maxIntensity ? '#ff6b6b' : '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#1a1a2e',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(101);
        
        // Animate notification
        notificationBg.setAlpha(0);
        notificationText.setAlpha(0);
        
        this.tweens.add({
            targets: [notificationBg, notificationText],
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: [notificationBg, notificationText],
            alpha: 0,
            duration: 500,
            delay: 2000,
            ease: 'Power2',
            onComplete: () => {
                notificationBg.destroy();
                notificationText.destroy();
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
    }
      spawnNewQuizBoxes() {
        // Only spawn new quiz boxes if there are less than 2 on the field
        const currentBoxCount = this.quizBoxes.length;
        const targetBoxCount = this.isBossLevel ? 1 : 2; // Boss level has only 1 enemy
        
        if (currentBoxCount < targetBoxCount) {
            const newBoxes = this.placeQuizBoxes(targetBoxCount - currentBoxCount);
            this.quizBoxes.push(...newBoxes);
            this.drawGrid(); // Redraw to show new boxes
        }
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
}