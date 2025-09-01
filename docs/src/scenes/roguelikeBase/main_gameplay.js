import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';
import { createBackButton } from '/src/components/buttons/backbutton.js';

export default class MainGameplay extends BaseScene {
    constructor() {
        super('MainGameplay');
        
        // Player properties
        this.player = {
            x: 0,
            y: 0,
            speed: 200 // pixels per second
        };
        
        // Movement properties
        this.cursors = null;
        this.wasdKeys = null;
        this.playerSprite = null;
        
        // Map properties - Increased by 20%
        this.TILE_SIZE = 58; // Increased from 48 (48 * 1.2 = 57.6, rounded to 58)
        this.MAP_WIDTH = 19;  // Increased from 16 (16 * 1.2 = 19.2, rounded to 19)
        this.MAP_HEIGHT = 14; // Increased from 12 (12 * 1.2 = 14.4, rounded to 14)
        
        // Movement state
        this.isMoving = false;
        this.lastDirection = { x: 0, y: 1 }; // facing down by default
        
        // Course data
        this.courseTopic = null;
    }

    init(data) {
        // Receive data from the computer lab scene
        this.courseTopic = data?.topic || 'python';
        console.log('MainGameplay initialized with topic:', this.courseTopic);
    }

    preload() {
        // Load the goblin sprite
        this.load.image('goblinNerd', 'assets/sprites/enemies/goblinNerd.png');
        
        // Load background tiles (optional - you can add your own)
        this.load.image('grassTile', 'assets/img/bg/grass.png');
        
        // Create a simple colored rectangle if grass tile doesn't exist
        this.load.image('defaultTile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    }

    create() {
        super.create(); // Call BaseScene create method
        
        // Add back button to return to computer lab
        createBackButton(this, 'ComputerLab');
        
        // Create background
        this.createBackground();
        
        // Create player sprite
        this.createPlayer();
        
        // Setup input controls
        this.setupInput();
        
        // Setup camera to follow player
        this.setupCamera();
        
        // Add movement instructions
        this.addInstructions();
        
        // Add course topic display
        this.addCourseDisplay();
        
        // Add resize listener to keep board centered
        this.scale.on('resize', this.onResize, this);
    }

    onResize() {
        // Recreate background with new centering
        if (this.backgroundGroup) {
            this.backgroundGroup.destroy();
        }
        this.createBackground();
        
        // Update player position
        const centerTileX = Math.floor(this.MAP_WIDTH / 2);
        const centerTileY = Math.floor(this.MAP_HEIGHT / 2);
        
        this.player.x = this.boardOffsetX + (centerTileX * this.TILE_SIZE) + this.TILE_SIZE/2;
        this.player.y = this.boardOffsetY + (centerTileY * this.TILE_SIZE) + this.TILE_SIZE/2;
        
        if (this.playerSprite) {
            this.playerSprite.setPosition(this.player.x, this.player.y);
        }
        
        // Update camera
        this.setupCamera();
    }

    createBackground() {
        // Calculate centering offsets for the game board
        const boardWidth = this.MAP_WIDTH * this.TILE_SIZE;
        const boardHeight = this.MAP_HEIGHT * this.TILE_SIZE;
        
        // Get screen dimensions
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        
        // Calculate offset to center the board
        const offsetX = Math.max(0, (screenWidth - boardWidth) / 2);
        const offsetY = Math.max(0, (screenHeight - boardHeight) / 2);
        
        // Store offsets for later use
        this.boardOffsetX = offsetX;
        this.boardOffsetY = offsetY;
        
        console.log(`Screen: ${screenWidth}x${screenHeight}, Board: ${boardWidth}x${boardHeight}, Offset: ${offsetX},${offsetY}`);
        
        // Create a tiled background
        this.backgroundGroup = this.add.group();
        
        for (let x = 0; x < this.MAP_WIDTH; x++) {
            for (let y = 0; y < this.MAP_HEIGHT; y++) {
                const tileX = offsetX + (x * this.TILE_SIZE);
                const tileY = offsetY + (y * this.TILE_SIZE);
                
                // Create background tile with alternating colors for visibility
                const tile = this.add.rectangle(
                    tileX + this.TILE_SIZE/2, 
                    tileY + this.TILE_SIZE/2, 
                    this.TILE_SIZE, 
                    this.TILE_SIZE, 
                    (x + y) % 2 === 0 ? 0x2d5a27 : 0x1e3a1c, // Dark green alternating pattern
                    0.8
                );
                
                // Add border
                tile.setStrokeStyle(2, 0x4a7c59, 0.3);
                
                this.backgroundGroup.add(tile);
            }
        }
    }

    createPlayer() {
        // Calculate starting position (center of map) with board offset
        const centerTileX = Math.floor(this.MAP_WIDTH / 2);
        const centerTileY = Math.floor(this.MAP_HEIGHT / 2);
        
        this.player.x = this.boardOffsetX + (centerTileX * this.TILE_SIZE) + this.TILE_SIZE/2;
        this.player.y = this.boardOffsetY + (centerTileY * this.TILE_SIZE) + this.TILE_SIZE/2;
        
        // Create player sprite
        this.playerSprite = this.add.image(this.player.x, this.player.y, 'goblinNerd');
        this.playerSprite.setDisplaySize(this.TILE_SIZE * 0.8, this.TILE_SIZE * 0.8);
        this.playerSprite.setDepth(10);
        
        // Add glow effect to player
        this.createPlayerGlow();
        
        // Note: Removed physics enabling since it's not needed for tile-based movement
        // We'll handle collision detection manually if needed
    }

    createPlayerGlow() {
        // Create glowing effect around player
        this.playerGlow = this.add.circle(this.player.x, this.player.y, this.TILE_SIZE * 0.6, 0x00ffff, 0.3);
        this.playerGlow.setDepth(5);
        
        // Animate the glow
        this.tweens.add({
            targets: this.playerGlow,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.1,
            duration: 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    setupInput() {
        // Create cursor keys for arrow key input
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Create WASD keys
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
        
        // Add number keys for direct 8-directional movement
        this.numberKeys = this.input.keyboard.addKeys('ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE');
        
        // Mouse/touch input for mobile support
        this.input.on('pointerdown', this.handlePointerInput, this);
    }

    setupCamera() {
        // For a board game, we want the camera to show the entire board centered
        // Set camera to show the entire scene without following the player
        this.cameras.main.centerOn(this.scale.width / 2, this.scale.height / 2);
        
        // Calculate zoom to ensure the board is visible with padding
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const boardWidth = this.MAP_WIDTH * this.TILE_SIZE;
        const boardHeight = this.MAP_HEIGHT * this.TILE_SIZE;
        
        // Calculate zoom to fit the board with padding (90% of screen)
        const zoomX = (screenWidth * 0.8) / boardWidth;
        const zoomY = (screenHeight * 0.8) / boardHeight;
        const zoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 1x
        
        this.cameras.main.setZoom(zoom);
        console.log(`Board: ${boardWidth}x${boardHeight}, Screen: ${screenWidth}x${screenHeight}, Zoom: ${zoom}`);
    }

    addInstructions() {
        // Add control instructions
        const instructions = this.add.text(16, 16, [
            '8-DIRECTIONAL MOVEMENT:',
            'Arrow Keys / WASD: Move',
            'Number Keys (1-9): Direct movement',
            'Click/Tap: Move towards pointer',
            '',
            '1=↖  2=↑  3=↗',
            '4=←  5=⚫  6=→', 
            '7=↙  8=↓  9=↘'
        ], {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 10 },
            alpha: 0.8
        });
        instructions.setScrollFactor(0);
        instructions.setDepth(100);
    }

    addCourseDisplay() {
        // Add course topic display in the top-right corner
        if (this.courseTopic) {
            const courseDisplay = this.add.text(this.scale.width - 16, 16, [
                `Course: ${this.courseTopic.toUpperCase()}`,
                'Roguelike Mode'
            ], {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffff00',
                backgroundColor: '#000080',
                padding: { x: 10, y: 8 },
                alpha: 0.9,
                align: 'right'
            });
            courseDisplay.setOrigin(1, 0);
            courseDisplay.setScrollFactor(0);
            courseDisplay.setDepth(100);
        }
    }

    handlePointerInput(pointer) {
        // Get world position of pointer
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        
        // Calculate direction from player to pointer
        const deltaX = worldX - this.player.x;
        const deltaY = worldY - this.player.y;
        
        // Normalize direction for 8-directional movement
        const direction = this.get8DirectionalMovement(deltaX, deltaY);
        
        if (direction.x !== 0 || direction.y !== 0) {
            this.movePlayer(direction.x, direction.y);
        }
    }

    get8DirectionalMovement(deltaX, deltaY) {
        // Convert any direction into one of 8 cardinal/diagonal directions
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        // If movement is too small, ignore it
        if (absX < 10 && absY < 10) {
            return { x: 0, y: 0 };
        }
        
        let x = 0, y = 0;
        
        // Determine horizontal direction
        if (deltaX > 10) x = 1;
        else if (deltaX < -10) x = -1;
        
        // Determine vertical direction  
        if (deltaY > 10) y = 1;
        else if (deltaY < -10) y = -1;
        
        return { x, y };
    }

    update() {
        // Handle keyboard input for 8-directional movement
        this.handleKeyboardInput();
        
        // Update player glow position
        if (this.playerGlow) {
            this.playerGlow.setPosition(this.playerSprite.x, this.playerSprite.y);
        }
    }

    handleKeyboardInput() {
        if (this.isMoving) return; // Prevent movement spam
        
        let moveX = 0;
        let moveY = 0;
        
        // Arrow keys and WASD
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) moveX = -1;
        if (this.cursors.right.isDown || this.wasdKeys.D.isDown) moveX = 1;
        if (this.cursors.up.isDown || this.wasdKeys.W.isDown) moveY = -1;
        if (this.cursors.down.isDown || this.wasdKeys.S.isDown) moveY = 1;
        
        // Number pad controls for direct 8-directional movement
        if (this.numberKeys.ONE.isDown) { moveX = -1; moveY = -1; } // Northwest
        if (this.numberKeys.TWO.isDown) { moveX = 0; moveY = -1; }  // North
        if (this.numberKeys.THREE.isDown) { moveX = 1; moveY = -1; } // Northeast
        if (this.numberKeys.FOUR.isDown) { moveX = -1; moveY = 0; }  // West
        if (this.numberKeys.SIX.isDown) { moveX = 1; moveY = 0; }   // East
        if (this.numberKeys.SEVEN.isDown) { moveX = -1; moveY = 1; } // Southwest
        if (this.numberKeys.EIGHT.isDown) { moveX = 0; moveY = 1; }  // South
        if (this.numberKeys.NINE.isDown) { moveX = 1; moveY = 1; }  // Southeast
        
        // Execute movement if any direction is pressed
        if (moveX !== 0 || moveY !== 0) {
            this.movePlayer(moveX, moveY);
        }
    }

    movePlayer(directionX, directionY) {
        if (this.isMoving) return;
        
        // Calculate target position
        const targetX = this.player.x + (directionX * this.TILE_SIZE);
        const targetY = this.player.y + (directionY * this.TILE_SIZE);
        
        // Check boundaries using board offset
        const minX = this.boardOffsetX + this.TILE_SIZE/2;
        const maxX = this.boardOffsetX + ((this.MAP_WIDTH - 0.5) * this.TILE_SIZE);
        const minY = this.boardOffsetY + this.TILE_SIZE/2;
        const maxY = this.boardOffsetY + ((this.MAP_HEIGHT - 0.5) * this.TILE_SIZE);
        
        if (targetX < minX || targetX > maxX || targetY < minY || targetY > maxY) {
            return; // Can't move outside map
        }
        
        // Store direction for sprite rotation/animation
        this.lastDirection.x = directionX;
        this.lastDirection.y = directionY;
        
        // Update player position
        this.player.x = targetX;
        this.player.y = targetY;
        
        // Animate player movement
        this.animatePlayerMovement(targetX, targetY);
        
        // Rotate player sprite based on movement direction
        this.rotatePlayerSprite(directionX, directionY);
        
        // Create movement effect
        this.createMovementEffect();
    }

    animatePlayerMovement(targetX, targetY) {
        this.isMoving = true;
        
        // Smooth movement animation
        this.tweens.add({
            targets: this.playerSprite,
            x: targetX,
            y: targetY,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.isMoving = false;
            }
        });
    }

    rotatePlayerSprite(directionX, directionY) {
        // Calculate angle based on 8-directional movement
        let angle = 0;
        
        if (directionX === 0 && directionY === -1) angle = -90;      // North
        if (directionX === 1 && directionY === -1) angle = -45;      // Northeast
        if (directionX === 1 && directionY === 0) angle = 0;         // East
        if (directionX === 1 && directionY === 1) angle = 45;        // Southeast
        if (directionX === 0 && directionY === 1) angle = 90;        // South
        if (directionX === -1 && directionY === 1) angle = 135;      // Southwest
        if (directionX === -1 && directionY === 0) angle = 180;      // West
        if (directionX === -1 && directionY === -1) angle = -135;    // Northwest
        
        // Smooth rotation animation
        this.tweens.add({
            targets: this.playerSprite,
            rotation: Phaser.Math.DegToRad(angle),
            duration: 150,
            ease: 'Power2'
        });
    }

    createMovementEffect() {
        // Create particle trail effect
        const trail = this.add.circle(
            this.playerSprite.x, 
            this.playerSprite.y, 
            8, 
            0x00ff00, 
            0.6
        );
        trail.setDepth(1);
        
        // Animate trail fade
        this.tweens.add({
            targets: trail,
            alpha: 0,
            scale: 2,
            duration: 300,
            ease: 'Power2',
            onComplete: () => trail.destroy()
        });
        
        // Removed screen shake for smoother experience
    }

    // Utility function to get current tile position
    getCurrentTilePosition() {
        return {
            x: Math.floor((this.player.x - this.boardOffsetX) / this.TILE_SIZE),
            y: Math.floor((this.player.y - this.boardOffsetY) / this.TILE_SIZE)
        };
    }

    // Function to move to specific tile coordinates
    moveToTile(tileX, tileY) {
        const targetX = this.boardOffsetX + (tileX * this.TILE_SIZE) + this.TILE_SIZE/2;
        const targetY = this.boardOffsetY + (tileY * this.TILE_SIZE) + this.TILE_SIZE/2;
        
        // Check if target is within bounds
        if (tileX >= 0 && tileX < this.MAP_WIDTH && tileY >= 0 && tileY < this.MAP_HEIGHT) {
            this.player.x = targetX;
            this.player.y = targetY;
            this.animatePlayerMovement(targetX, targetY);
        }
    }

    // Clean up when scene is shutdown
    shutdown() {
        if (this.playerGlow) {
            this.playerGlow.destroy();
            this.playerGlow = null;
        }
        
        super.shutdown();
    }
}