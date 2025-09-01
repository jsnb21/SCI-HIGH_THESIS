import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';

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
        
        // Score and streak system
        this.score = 0;
        this.streak = 0;
        this.highestStreak = 0;
        this.baseScore = 100;
        
        // INTENSITY system
        this.enemiesDefeated = 0;
        this.intensity = 1; // Level 1 = normal quizzes, Level 2 = drag-and-drop
        this.intensityThreshold = 10; // Enemies needed to increase intensity
        
        // Enemy system
        this.enemies = [];
        this.maxEnemies = 5;
        this.enemySprites = [];
        this.enemyMoveTimer = 0;
        this.enemyMoveInterval = 1000; // Move enemies every 1 second
        this.enemiesMoving = false;
        
        // Timer system
        this.gameTimer = 60; // 1 minute in seconds
        this.timerText = null;
        this.timerEvent = null;
        
        // Timer icons system
        this.timerIcons = [];
        this.maxTimerIcons = 3;
        this.timerIconSpawnTimer = 0;
        this.timerIconSpawnInterval = 10000; // Spawn timer icon every 10 seconds
        
        // Countdown system
        this.countdownTimer = 3; // 3 second countdown
        this.countdownText = null;
        this.countdownEvent = null;
        this.gameStarted = false;
        
        // Score and quiz system
        this.score = 0;
        this.scoreText = null;
        this.quizActive = false;
        this.currentQuiz = null;
        this.quizContainer = null;
    }

    init(data) {
        // Receive data from the computer lab scene
        this.courseTopic = data?.topic || 'python';
        
        // Initialize/reset streak system
        this.streak = 0;
        this.highestStreak = 0;
        
        // Initialize/reset INTENSITY system
        this.enemiesDefeated = 0;
        this.intensity = 1;
        
        console.log('MainGameplay initialized with topic:', this.courseTopic);
    }

    preload() {
        // Load the goblin sprite for player
        this.load.image('goblinNerd', 'assets/sprites/enemies/goblinNerd.png');
        
        // Load enemy sprites (using existing sprites from the project)
        this.load.image('quizbox', 'assets/sprites/enemies/quizbox.png');
        this.load.image('bigSlime', 'assets/sprites/enemies/bigSlime.png');
        
        // Load timer icon (clock/hourglass icon)
        this.load.image('timerIcon', 'data:image/svg+xml;base64,' + btoa(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="#FFD700" stroke="#FFA500" stroke-width="2"/>
                <circle cx="16" cy="16" r="10" fill="#FFFF00" stroke="#FFD700" stroke-width="1"/>
                <line x1="16" y1="16" x2="16" y2="8" stroke="#FF4500" stroke-width="2" stroke-linecap="round"/>
                <line x1="16" y1="16" x2="22" y2="16" stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="16" cy="16" r="2" fill="#FF4500"/>
                <text x="16" y="28" text-anchor="middle" font-family="Arial" font-size="6" fill="#000">+5s</text>
            </svg>
        `));
        
        // Load quiz data
        this.load.json('pythonQuiz', 'data/quizzes/python.json');
        this.load.json('javaQuiz', 'data/quizzes/java.json');
        this.load.json('cQuiz', 'data/quizzes/C.json');
        this.load.json('cppQuiz', 'data/quizzes/C++.json');
        this.load.json('csharpQuiz', 'data/quizzes/csharp.json');
        this.load.json('webdesignQuiz', 'data/quizzes/webdesign.json');
        
        // Load background tiles (optional - you can add your own)
        this.load.image('grassTile', 'assets/img/bg/grass.png');
        
        // Create a simple colored rectangle if grass tile doesn't exist
        this.load.image('defaultTile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    }

    create() {
        super.create(); // Call BaseScene create method
        
        // Listen for quiz completion
        this.events.on('quiz-completed', this.handleQuizCompletion, this);
        
        // Create background
        this.createBackground();
        
        // Create player sprite
        this.createPlayer();
        
        // Create enemies
        this.createEnemies();
        
        // Create timer (but don't start it yet)
        this.createTimer();
        
        // Create score display
        this.createScoreDisplay();
        
        // Initialize timer icons
        this.initializeTimerIcons();
        
        // Start countdown before game begins
        this.startCountdown();
        
        // Setup input controls
        this.setupInput();
        
        // Setup camera to follow player
        this.setupCamera();

        // Add course topic display
        this.addCourseDisplay();        // Add resize listener to keep board centered
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
        // Create animated starfield background
        this.createStarfield();
        
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
                
                // Get course-specific colors
                const colors = this.getCourseColors(this.courseTopic);
                
                // Create background tile with alternating colors for visibility
                const tile = this.add.rectangle(
                    tileX + this.TILE_SIZE/2, 
                    tileY + this.TILE_SIZE/2, 
                    this.TILE_SIZE, 
                    this.TILE_SIZE, 
                    (x + y) % 2 === 0 ? colors.dark : colors.darker, // Course-specific alternating pattern
                    0.8
                );
                
                // Add border
                tile.setStrokeStyle(2, colors.border, 0.3);
                
                this.backgroundGroup.add(tile);
            }
        }
    }

    createStarfield() {
        // Create animated starfield background
        this.stars = [];
        const numStars = 100;
        
        for (let i = 0; i < numStars; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, this.scale.width),
                Phaser.Math.Between(0, this.scale.height),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 0.9)
            );
            
            star.setDepth(-10); // Behind everything
            star.setScrollFactor(0); // Fixed to camera
            
            // Give each star random movement properties
            star.speedX = Phaser.Math.FloatBetween(-20, -5);
            star.speedY = Phaser.Math.FloatBetween(-5, 5);
            star.twinkleSpeed = Phaser.Math.Between(2000, 4000);
            
            // Add twinkling effect
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: star.twinkleSpeed,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
            
            this.stars.push(star);
        }
        
        // Create star movement update loop
        this.time.addEvent({
            delay: 50, // Update every 50ms
            callback: this.updateStars,
            callbackScope: this,
            loop: true
        });
    }

    updateStars() {
        this.stars.forEach(star => {
            // Move star
            star.x += star.speedX * 0.05;
            star.y += star.speedY * 0.05;
            
            // Wrap around screen
            if (star.x < -10) {
                star.x = this.scale.width + 10;
                star.y = Phaser.Math.Between(0, this.scale.height);
            }
            if (star.y < -10) {
                star.y = this.scale.height + 10;
            }
            if (star.y > this.scale.height + 10) {
                star.y = -10;
            }
        });
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

    createEnemies() {
        // Clear existing enemies
        this.enemies = [];
        if (this.enemySprites) {
            this.enemySprites.forEach(sprite => sprite.destroy());
        }
        this.enemySprites = [];
        
        // Available enemy types
        const enemyTypes = ['quizbox', 'bigSlime', 'goblinNerd'];
        
        // Generate random enemy positions (avoiding player starting position)
        const playerTileX = Math.floor(this.MAP_WIDTH / 2);
        const playerTileY = Math.floor(this.MAP_HEIGHT / 2);
        
        for (let i = 0; i < this.maxEnemies; i++) {
            let enemyTileX, enemyTileY;
            let attempts = 0;
            
            // Try to find a valid position (not on player, not on other enemies)
            do {
                enemyTileX = Phaser.Math.Between(0, this.MAP_WIDTH - 1);
                enemyTileY = Phaser.Math.Between(0, this.MAP_HEIGHT - 1);
                attempts++;
            } while (
                attempts < 50 && (
                    (enemyTileX === playerTileX && enemyTileY === playerTileY) ||
                    this.enemies.some(enemy => enemy.tileX === enemyTileX && enemy.tileY === enemyTileY)
                )
            );
            
            // If we found a valid position, create the enemy
            if (attempts < 50) {
                const enemyType = Phaser.Utils.Array.GetRandom(enemyTypes);
                const enemy = this.createEnemy(enemyTileX, enemyTileY, enemyType);
                this.enemies.push(enemy);
            }
        }
        
        console.log(`Created ${this.enemies.length} enemies`);
    }

    createTimer() {
        // Create timer text at the top center of the screen
        const centerX = this.scale.width / 2;
        
        this.timerText = this.add.text(centerX, 30, '1:00', {
            fontFamily: 'Arial',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 3,
                fill: true
            }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);
        
        // Don't start the timer event yet - will be started after countdown
        this.timerEvent = null;
    }

    createScoreDisplay() {
        // Create score text at the top left of the screen
        this.scoreText = this.add.text(20, 30, 'Score: 0', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 3,
                fill: true
            }
        }).setOrigin(0, 0).setScrollFactor(0);
        
        // Create streak display below the score
        this.streakText = this.add.text(20, 65, 'Streak: 0', {
            fontFamily: 'Arial',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 3,
                fill: true
            }
        }).setOrigin(0, 0).setScrollFactor(0);
    }

    getFormattedCourseName(topic) {
        // Convert topic to stylized display name
        const topicMap = {
            'python': '🐍 PYTHON',
            'java': '☕ JAVA',
            'c': '⚡ C LANG',
            'cpp': '⚙️ C++',
            'csharp': '💎 C#',
            'webdesign': '🌐 WEB DESIGN',
            'javascript': '🟨 JAVASCRIPT'
        };
        
        return topicMap[topic?.toLowerCase()] || `📚 ${(topic || 'PROGRAMMING').toUpperCase()}`;
    }

    getCourseColors(topic) {
        // Return course-specific color schemes
        const colorSchemes = {
            'webdesign': {
                dark: 0x1a237e,     // Dark blue
                darker: 0x0d1460,   // Darker blue
                border: 0x3f51b5    // Blue border
            },
            'python': {
                dark: 0x2d5a27,     // Dark green
                darker: 0x1e3a1c,   // Darker green
                border: 0x4a7c59    // Green border
            },
            'java': {
                dark: 0x5d4037,     // Dark orange/brown
                darker: 0x3e2723,   // Darker orange/brown
                border: 0x8d6e63    // Orange/brown border
            }
        };
        
        // Default to green if course not specified
        return colorSchemes[topic?.toLowerCase()] || colorSchemes.python;
    }

    updateScore(points) {
        this.score += points;
        this.scoreText.setText(`Score: ${this.score}`);
        
        // Add visual effect for score increase
        this.tweens.add({
            targets: this.scoreText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            ease: 'Power2',
            yoyo: true
        });
    }

    updateTimer() {
        this.gameTimer--;
        
        // Format time as MM:SS
        const minutes = Math.floor(this.gameTimer / 60);
        const seconds = this.gameTimer % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.timerText.setText(timeString);
        
        // Change color when time is running out
        if (this.gameTimer <= 10) {
            this.timerText.setColor('#ff0000'); // Red for last 10 seconds
            
            // Add shake animation for last 10 seconds
            this.tweens.add({
                targets: this.timerText,
                x: this.timerText.x + Phaser.Math.Between(-5, 5),
                y: this.timerText.y + Phaser.Math.Between(-3, 3),
                duration: 50,
                ease: 'Power2',
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    // Reset position to center after shake
                    this.timerText.setPosition(this.scale.width / 2, 30);
                }
            });
        } else if (this.gameTimer <= 30) {
            this.timerText.setColor('#ffff00'); // Yellow for last 30 seconds
        }
        
        // Handle timer expiration
        if (this.gameTimer <= 0) {
            this.onTimerExpired();
        }
    }

    onTimerExpired() {
        // Emit timer expired event for any listening scenes (like QuizScene)
        this.events.emit('timer-expired');
        
        // Stop the timer
        if (this.timerEvent) {
            this.timerEvent.remove();
        }
        
        // Display game over message
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        this.add.text(centerX, centerY, 'TIME UP!', {
            fontFamily: 'Arial',
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0);
        
        // Optional: Add a delay before returning to menu or restarting
        this.time.delayedCall(3000, () => {
            this.scene.start('ComputerLab');
        });
    }

    startCountdown() {
        // Create countdown text at the center of the screen
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        this.countdownText = this.add.text(centerX, centerY, '3', {
            fontFamily: 'Arial',
            fontSize: '128px',
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: {
                offsetX: 4,
                offsetY: 4,
                color: '#000000',
                blur: 6,
                fill: true
            }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
        
        // Add countdown instruction text
        this.instructionText = this.add.text(centerX, centerY + 100, 'Get Ready!', {
            fontFamily: 'Arial',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
        
        // Create countdown event
        this.countdownEvent = this.time.addEvent({
            delay: 1000, // 1 second
            callback: this.updateCountdown,
            callbackScope: this,
            repeat: 2 // Will fire 3 times total (3, 2, 1)
        });
        
        // Add scale animation to countdown text
        this.tweens.add({
            targets: this.countdownText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 500,
            ease: 'Power2',
            yoyo: true,
            repeat: -1
        });
    }

    updateCountdown() {
        this.countdownTimer--;
        
        if (this.countdownTimer > 0) {
            this.countdownText.setText(this.countdownTimer.toString());
            
            // Change color as countdown progresses
            if (this.countdownTimer === 2) {
                this.countdownText.setColor('#ffff00'); // Yellow for 2
            } else if (this.countdownTimer === 1) {
                this.countdownText.setColor('#ff8800'); // Orange for 1
            }
        } else {
            // Countdown finished - start the game
            this.startGame();
        }
    }

    startGame() {
        // Remove countdown text and instruction
        if (this.countdownText) {
            this.countdownText.destroy();
        }
        
        if (this.instructionText) {
            this.instructionText.destroy();
        }
        
        // Show "GO!" message briefly
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        const goText = this.add.text(centerX, centerY, 'GO!', {
            fontFamily: 'Arial',
            fontSize: '96px',
            fontWeight: 'bold',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
        
        // Animate GO! text
        this.tweens.add({
            targets: goText,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                goText.destroy();
            }
        });
        
        // Start the actual game timer
        this.timerEvent = this.time.addEvent({
            delay: 1000, // 1 second
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        
        // Mark game as started
        this.gameStarted = true;
        
        console.log('Game started! Timer and enemy movement activated.');
    }

    initializeTimerIcons() {
        // Initialize timer icons array
        this.timerIcons = [];
    }

    spawnTimerIcon() {
        // Don't spawn if we already have max timer icons
        if (this.timerIcons.length >= this.maxTimerIcons) {
            return;
        }

        // Find a random empty position
        const playerTileX = Math.floor((this.player.x - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((this.player.y - this.boardOffsetY) / this.TILE_SIZE);
        
        let attempts = 0;
        let iconTileX, iconTileY;
        
        do {
            iconTileX = Phaser.Math.Between(0, this.MAP_WIDTH - 1);
            iconTileY = Phaser.Math.Between(0, this.MAP_HEIGHT - 1);
            attempts++;
        } while (
            attempts < 50 && (
                (iconTileX === playerTileX && iconTileY === playerTileY) ||
                this.enemies.some(enemy => enemy.tileX === iconTileX && enemy.tileY === iconTileY) ||
                this.timerIcons.some(icon => icon.tileX === iconTileX && icon.tileY === iconTileY)
            )
        );
        
        if (attempts < 50) {
            this.createTimerIcon(iconTileX, iconTileY);
        }
    }

    createTimerIcon(tileX, tileY) {
        // Calculate world position
        const worldX = this.boardOffsetX + (tileX * this.TILE_SIZE) + this.TILE_SIZE / 2;
        const worldY = this.boardOffsetY + (tileY * this.TILE_SIZE) + this.TILE_SIZE / 2;
        
        // Create timer icon sprite
        const iconSprite = this.add.image(worldX, worldY, 'timerIcon');
        iconSprite.setDisplaySize(this.TILE_SIZE * 0.6, this.TILE_SIZE * 0.6);
        
        // Add glow effect
        const glow = this.add.circle(worldX, worldY, this.TILE_SIZE * 0.4, 0xFFD700, 0.3);
        
        // Add floating animation
        this.tweens.add({
            targets: [iconSprite, glow],
            y: worldY - 5,
            duration: 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        
        // Add spinning animation
        this.tweens.add({
            targets: iconSprite,
            rotation: Math.PI * 2,
            duration: 2000,
            ease: 'Linear',
            repeat: -1
        });
        
        // Create timer icon object
        const timerIcon = {
            tileX: tileX,
            tileY: tileY,
            sprite: iconSprite,
            glow: glow
        };
        
        this.timerIcons.push(timerIcon);
        console.log(`Spawned timer icon at (${tileX}, ${tileY})`);
    }

    checkTimerIconCollision(worldX, worldY) {
        // Convert world coordinates to tile coordinates
        const playerTileX = Math.floor((worldX - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((worldY - this.boardOffsetY) / this.TILE_SIZE);
        
        // Check if player is on the same tile as any timer icon
        const collidedIcon = this.timerIcons.find(icon => 
            icon.tileX === playerTileX && icon.tileY === playerTileY
        );
        
        if (collidedIcon) {
            this.collectTimerIcon(collidedIcon);
        }
    }

    addTime(seconds) {
        // Add time but cap at 60 seconds (1 minute)
        this.gameTimer = Math.min(this.gameTimer + seconds, 60);
    }

    collectTimerIcon(icon) {
        // Add 5 seconds to the timer (capped at 60 seconds)
        this.addTime(5);
        
        // Update timer display immediately
        const minutes = Math.floor(this.gameTimer / 60);
        const seconds = this.gameTimer % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.timerText.setText(timeString);
        
        // Reset timer color if it was red/yellow
        if (this.gameTimer > 30) {
            this.timerText.setColor('#ffffff');
        } else if (this.gameTimer > 10) {
            this.timerText.setColor('#ffff00');
        }
        
        // Show +5s effect at timer location
        const effectText = this.add.text(this.timerText.x, this.timerText.y + 40, '+5s', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
        
        // Animate the +5s effect
        this.tweens.add({
            targets: effectText,
            y: effectText.y - 30,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                effectText.destroy();
            }
        });
        
        // Remove icon from array
        const iconIndex = this.timerIcons.indexOf(icon);
        if (iconIndex > -1) {
            this.timerIcons.splice(iconIndex, 1);
        }
        
        // Destroy icon sprites with collection effect
        this.tweens.add({
            targets: [icon.sprite, icon.glow],
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                icon.sprite.destroy();
                icon.glow.destroy();
            }
        });
        
        console.log(`Collected timer icon! Added 5 seconds. New time: ${this.gameTimer}s`);
    }

    createEnemy(tileX, tileY, spriteKey) {
        // Calculate world position
        const worldX = this.boardOffsetX + (tileX * this.TILE_SIZE) + this.TILE_SIZE/2;
        const worldY = this.boardOffsetY + (tileY * this.TILE_SIZE) + this.TILE_SIZE/2;
        
        // Create enemy sprite
        const enemySprite = this.add.image(worldX, worldY, spriteKey);
        enemySprite.setDisplaySize(this.TILE_SIZE * 0.7, this.TILE_SIZE * 0.7);
        enemySprite.setDepth(8);
        
        // Add a slight red tint to distinguish from player
        enemySprite.setTint(0xff8888);
        
        // Store sprite references for cleanup
        this.enemySprites.push(enemySprite);
        
        // Return enemy data
        return {
            tileX: tileX,
            tileY: tileY,
            worldX: worldX,
            worldY: worldY,
            sprite: enemySprite,
            glow: null, // No glow effect
            type: spriteKey,
            hp: 100
        };
    }

    checkEnemyCollision(worldX, worldY) {
        // Convert world coordinates to tile coordinates
        const playerTileX = Math.floor((worldX - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((worldY - this.boardOffsetY) / this.TILE_SIZE);
        
        // Check if player is on the same tile as any enemy
        const collidedEnemy = this.enemies.find(enemy => 
            enemy.tileX === playerTileX && enemy.tileY === playerTileY
        );
        
        if (collidedEnemy) {
            console.log(`Player collided with ${collidedEnemy.type} at (${playerTileX}, ${playerTileY})`);
            this.handleEnemyCollision(collidedEnemy);
            return true;
        }
        
        return false;
    }

    handleEnemyCollision(enemy) {
        // Don't handle collision if quiz is already active or game hasn't started
        if (this.quizActive || !this.gameStarted) {
            return;
        }
        
        // Save game state and start quiz scene
        this.startQuizScene(enemy);
    }

    startQuizScene(enemy) {
        this.quizActive = true;
        this.currentQuiz = enemy;
        
        // Launch quiz scene without pausing main scene (so timer continues)
        // Pass intensity level to determine quiz type
        this.scene.launch('QuizScene', {
            courseTopic: this.courseTopic,
            enemyToDestroy: enemy,
            intensity: this.intensity
        });
    }

    saveGameState() {
        return {
            player: {
                x: this.player.x,
                y: this.player.y,
                tileX: this.player.tileX,
                tileY: this.player.tileY
            },
            enemies: this.enemies.map(enemy => ({
                x: enemy.x,
                y: enemy.y,
                tileX: enemy.tileX,
                tileY: enemy.tileY
            })),
            score: this.score,
            gameTimer: this.gameTimer,
            gameStarted: this.gameStarted,
            timerIcons: this.timerIcons.map(icon => ({
                x: icon.x,
                y: icon.y,
                tileX: icon.tileX,
                tileY: icon.tileY,
                visible: icon.visible
            })),
            courseTopic: this.courseTopic
        };
    }

    loadGameState(gameState) {
        // Restore player position
        this.player.x = gameState.player.x;
        this.player.y = gameState.player.y;
        this.player.tileX = gameState.player.tileX;
        this.player.tileY = gameState.player.tileY;
        
        if (this.playerSprite) {
            this.playerSprite.x = this.player.x;
            this.playerSprite.y = this.player.y;
        }
        
        if (this.playerGlow) {
            this.playerGlow.x = this.player.x;
            this.playerGlow.y = this.player.y;
        }
        
        // Restore enemies
        this.enemies.forEach((enemy, index) => {
            if (gameState.enemies[index]) {
                enemy.x = gameState.enemies[index].x;
                enemy.y = gameState.enemies[index].y;
                enemy.tileX = gameState.enemies[index].tileX;
                enemy.tileY = gameState.enemies[index].tileY;
                
                if (enemy.sprite) {
                    enemy.sprite.x = enemy.x;
                    enemy.sprite.y = enemy.y;
                }
            }
        });
        
        // Restore timer icons
        this.timerIcons.forEach((icon, index) => {
            if (gameState.timerIcons[index]) {
                icon.x = gameState.timerIcons[index].x;
                icon.y = gameState.timerIcons[index].y;
                icon.tileX = gameState.timerIcons[index].tileX;
                icon.tileY = gameState.timerIcons[index].tileY;
                icon.visible = gameState.timerIcons[index].visible;
                
                if (icon.sprite) {
                    icon.sprite.x = icon.x;
                    icon.sprite.y = icon.y;
                    icon.sprite.setVisible(icon.visible);
                }
            }
        });
        
        // Restore game state
        this.score = gameState.score;
        this.gameTimer = gameState.gameTimer;
        this.gameStarted = gameState.gameStarted;
        
        // Update displays
        this.updateScoreDisplay();
        this.updateTimerDisplay();
        
        // Resume game
        this.quizActive = false;
    }

    handleQuizCompletion(data) {
        // Handle quiz results
        if (data.correct) {
            // Increment streak for correct answer
            this.streak++;
            
            // Update highest streak if current streak is higher (stored silently)
            if (this.streak > this.highestStreak) {
                this.highestStreak = this.streak;
            }
            
            // Calculate bonus score based on streak
            const bonusScore = (this.streak - 1) * 50; // x2 = +50, x3 = +100, etc.
            const totalScore = this.baseScore + bonusScore;
            
            // Correct answer - give rewards with streak bonus
            this.updateScore(totalScore);
            this.addTime(10);
            this.updateTimerDisplay();
            this.updateStreakDisplay();
            
            console.log(`Correct answer! Streak: ${this.streak}x, Score: +${totalScore} (+${this.baseScore} base + ${bonusScore} bonus), +10 seconds`);
        } else {
            // Reset streak on wrong answer
            this.streak = 0;
            this.updateStreakDisplay();
            console.log('Wrong answer! Streak reset.');
        }
        
        // Destroy the enemy that was collided with
        if (data.enemyToDestroy) {
            this.destroyEnemy(data.enemyToDestroy);
            
            // Track INTENSITY progression
            if (data.correct) {
                this.enemiesDefeated++;
                this.checkIntensityIncrease();
            }
        }
        
        // Resume game
        this.quizActive = false;
    }

    updateScoreDisplay() {
        if (this.scoreText) {
            this.scoreText.setText(`Score: ${this.score}`);
        }
    }

    updateStreakDisplay() {
        if (this.streakText) {
            // Stop any existing shake animation
            this.tweens.killTweensOf(this.streakText);
            
            if (this.streak > 0) {
                this.streakText.setText(`Streak: ${this.streak}x`);
                
                // Change color and add shake based on streak level
                if (this.streak >= 5) {
                    this.streakText.setColor('#ff0080'); // Hot pink for 5+ streak
                    // Intense shake for very high streaks
                    this.addStreakShake(8, 80, 0.3);
                } else if (this.streak >= 3) {
                    this.streakText.setColor('#ff8000'); // Orange for 3+ streak
                    // Medium shake for high streaks
                    this.addStreakShake(5, 100, 0.4);
                } else {
                    this.streakText.setColor('#ffff00'); // Yellow for active streak
                    // Light shake for low streaks
                    this.addStreakShake(3, 150, 0.6);
                }
            } else {
                this.streakText.setText('Streak: 0');
                this.streakText.setColor('#888888'); // Gray when no streak
                // Reset position when no streak
                this.streakText.setPosition(20, 65);
            }
        }
    }

    addStreakShake(intensity, duration, delay) {
        // Store original position
        const originalX = 20;
        const originalY = 65;
        
        // Create horizontal-only shake animation
        this.tweens.add({
            targets: this.streakText,
            x: originalX + Phaser.Math.Between(-intensity, intensity),
            y: originalY, // Keep Y position fixed
            duration: duration,
            ease: 'Power2',
            yoyo: true,
            repeat: -1,
            delay: delay * 1000,
            onComplete: () => {
                // Reset to original position when done
                this.streakText.setPosition(originalX, originalY);
            }
        });
    }

    checkIntensityIncrease() {
        if (this.enemiesDefeated >= this.intensityThreshold && this.intensity === 1) {
            this.intensity = 2;
            
            // Show INTENSITY increase notification
            this.showIntensityNotification();
            
            console.log(`INTENSITY INCREASED! Level ${this.intensity} - Drag-and-Drop quizzes activated!`);
        }
    }

    showIntensityNotification() {
        // Create dramatic notification
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        const notification = this.add.text(centerX, centerY, 'INTENSITY LEVEL 2\nDRAG & DROP MODE!', {
            fontFamily: 'Arial',
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 5,
                fill: true
            }
        }).setOrigin(0.5).setDepth(1000);
        
        // Animate notification
        notification.setScale(0);
        this.tweens.add({
            targets: notification,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(2000, () => {
                    this.tweens.add({
                        targets: notification,
                        alpha: 0,
                        scaleX: 0.8,
                        scaleY: 0.8,
                        duration: 500,
                        onComplete: () => notification.destroy()
                    });
                });
            }
        });
    }

    updateHighestStreakDisplay() {
        if (this.highestStreakText) {
            this.highestStreakText.setText(`Best: ${this.highestStreak}`);
            
            // Add a brief glow effect when a new record is set
            this.tweens.add({
                targets: this.highestStreakText,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 300,
                ease: 'Back.easeOut',
                yoyo: true,
                onComplete: () => {
                    this.highestStreakText.setScale(1);
                }
            });
            
            // Temporarily change color to gold for new record
            const originalColor = this.highestStreakText.style.color;
            this.highestStreakText.setColor('#ffd700'); // Gold color
            
            this.time.delayedCall(1000, () => {
                this.highestStreakText.setColor('#00ff00'); // Back to green
            });
        }
    }

    updateTimerDisplay() {
        if (this.timerText) {
            const minutes = Math.floor(this.gameTimer / 60);
            const seconds = this.gameTimer % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.timerText.setText(timeString);
            
            // Update timer color based on remaining time
            if (this.gameTimer > 30) {
                this.timerText.setColor('#ffffff');
                if (this.timerShake) {
                    this.timerShake.stop();
                    this.timerText.setScale(1);
                }
            } else if (this.gameTimer > 10) {
                this.timerText.setColor('#ffff00');
                if (this.timerShake) {
                    this.timerShake.stop();
                    this.timerText.setScale(1);
                }
            } else {
                this.timerText.setColor('#ff0000');
                // Start shaking if not already shaking
                if (!this.timerShake || !this.timerShake.isPlaying()) {
                    this.startTimerShake();
                }
            }
        }
    }

    showQuizPopup(enemy) {
        this.quizActive = true;
        this.currentQuiz = enemy;
        
        // Get random quiz question based on course topic
        const quizData = this.getQuizData();
        if (!quizData || !quizData.questions || quizData.questions.length === 0) {
            console.error('No quiz data available');
            this.destroyEnemy(enemy);
            return;
        }
        
        const randomQuestion = Phaser.Utils.Array.GetRandom(quizData.questions);
        
        // Create quiz container
        this.quizContainer = this.add.container(this.scale.width / 2, this.scale.height / 2);
        this.quizContainer.setDepth(2000);
        
        // Create quiz background
        const quizBg = this.add.rectangle(0, 0, 600, 400, 0x000000, 0.9);
        quizBg.setStroke(0xffffff, 4);
        this.quizContainer.add(quizBg);
        
        // Create question text
        const questionText = this.add.text(0, -120, randomQuestion.question, {
            fontFamily: 'Arial',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 540 }
        }).setOrigin(0.5);
        this.quizContainer.add(questionText);
        
        // Create answer buttons
        const answers = randomQuestion.options;
        const correctAnswer = randomQuestion.correct;
        
        for (let i = 0; i < answers.length; i++) {
            const answerBtn = this.add.rectangle(0, -40 + (i * 60), 500, 50, 0x333333);
            answerBtn.setStroke(0xffffff, 2);
            answerBtn.setInteractive();
            
            const answerText = this.add.text(0, -40 + (i * 60), `${String.fromCharCode(65 + i)}. ${answers[i]}`, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 480 }
            }).setOrigin(0.5);
            
            this.quizContainer.add([answerBtn, answerText]);
            
            // Add hover effects
            answerBtn.on('pointerover', () => {
                answerBtn.setFillStyle(0x555555);
            });
            
            answerBtn.on('pointerout', () => {
                answerBtn.setFillStyle(0x333333);
            });
            
            // Add click handler
            answerBtn.on('pointerdown', () => {
                this.handleQuizAnswer(i, correctAnswer, enemy);
            });
        }
        
        // Add title
        const titleText = this.add.text(0, -170, 'Programming Quiz!', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffff00'
        }).setOrigin(0.5);
        this.quizContainer.add(titleText);
    }

    getQuizData() {
        // Get quiz data based on course topic
        const topic = this.courseTopic || 'python';
        switch (topic.toLowerCase()) {
            case 'python': return this.cache.json.get('pythonQuiz');
            case 'java': return this.cache.json.get('javaQuiz');
            case 'c': return this.cache.json.get('cQuiz');
            case 'c++': return this.cache.json.get('cppQuiz');
            case 'csharp': return this.cache.json.get('csharpQuiz');
            case 'webdesign': return this.cache.json.get('webdesignQuiz');
            default: return this.cache.json.get('pythonQuiz');
        }
    }

    handleQuizAnswer(selectedIndex, correctIndex, enemy) {
        const isCorrect = selectedIndex === correctIndex;
        
        // Show result
        this.showQuizResult(isCorrect);
        
        if (isCorrect) {
            // Correct answer - give rewards
            this.updateScore(100);
            this.addTime(10);
            
            // Update timer display
            const minutes = Math.floor(this.gameTimer / 60);
            const seconds = this.gameTimer % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.timerText.setText(timeString);
            
            // Reset timer color if it was red/yellow
            if (this.gameTimer > 30) {
                this.timerText.setColor('#ffffff');
            } else if (this.gameTimer > 10) {
                this.timerText.setColor('#ffff00');
            }
            
            console.log('Correct answer! +100 score, +10 seconds');
        } else {
            console.log('Wrong answer!');
        }
        
        // Destroy enemy after quiz
        setTimeout(() => {
            this.destroyEnemy(enemy);
            this.closeQuizPopup();
        }, 2000);
    }

    showQuizResult(isCorrect) {
        // Create result overlay
        const resultText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 150, 
            isCorrect ? 'CORRECT! +100 Score, +10 Seconds!' : 'WRONG ANSWER!', {
            fontFamily: 'Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: isCorrect ? '#00ff00' : '#ff0000',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(2100);
        
        // Animate result text
        this.tweens.add({
            targets: resultText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 500,
            ease: 'Power2',
            yoyo: true,
            onComplete: () => {
                setTimeout(() => {
                    resultText.destroy();
                }, 1000);
            }
        });
    }

    closeQuizPopup() {
        if (this.quizContainer) {
            this.quizContainer.destroy();
            this.quizContainer = null;
        }
        this.quizActive = false;
        this.currentQuiz = null;
    }

    destroyEnemy(enemy) {
        if (!enemy) return;
        
        // Remove enemy from array
        const enemyIndex = this.enemies.indexOf(enemy);
        if (enemyIndex > -1) {
            this.enemies.splice(enemyIndex, 1);
        }
        
        // Destroy enemy sprites and stop any ongoing animations
        if (enemy.sprite) {
            this.tweens.killTweensOf(enemy.sprite);
            enemy.sprite.destroy();
        }
        
        // Remove from sprite array - be more thorough
        this.enemySprites = this.enemySprites.filter(sprite => {
            if (sprite === enemy.sprite) {
                return false; // Remove this sprite
            }
            // Also remove any destroyed/invalid sprites
            if (!sprite || !sprite.scene) {
                return false;
            }
            return true;
        });
        
        // Create explosion effect
        this.createEnemyDestroyEffect(enemy.worldX, enemy.worldY);
        
        // Respawn a new enemy if under max count
        if (this.enemies.length < this.maxEnemies) {
            this.spawnNewEnemy();
        }
        
        console.log(`Enemy destroyed! Remaining enemies: ${this.enemies.length}`);
    }

    createEnemyDestroyEffect(x, y) {
        // Create explosion particles
        for (let i = 0; i < 8; i++) {
            const particle = this.add.circle(x, y, 6, 0xff4444, 0.8);
            particle.setDepth(15);
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 0.2,
                duration: 400,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    spawnNewEnemy() {
        // Find a random empty position
        const enemyTypes = ['quizbox', 'bigSlime', 'goblinNerd'];
        const playerTileX = Math.floor((this.player.x - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((this.player.y - this.boardOffsetY) / this.TILE_SIZE);
        
        let attempts = 0;
        let enemyTileX, enemyTileY;
        
        do {
            enemyTileX = Phaser.Math.Between(0, this.MAP_WIDTH - 1);
            enemyTileY = Phaser.Math.Between(0, this.MAP_HEIGHT - 1);
            attempts++;
        } while (
            attempts < 50 && (
                (enemyTileX === playerTileX && enemyTileY === playerTileY) ||
                this.enemies.some(enemy => enemy.tileX === enemyTileX && enemy.tileY === enemyTileY)
            )
        );
        
        if (attempts < 50) {
            const enemyType = Phaser.Utils.Array.GetRandom(enemyTypes);
            const enemy = this.createEnemy(enemyTileX, enemyTileY, enemyType);
            this.enemies.push(enemy);
            console.log(`Spawned new ${enemyType} enemy at (${enemyTileX}, ${enemyTileY})`);
        }
    }

    moveEnemiesAwayFromPlayer() {
        if (this.enemies.length === 0 || this.enemiesMoving) return;
        
        this.enemiesMoving = true;
        const playerTileX = Math.floor((this.player.x - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((this.player.y - this.boardOffsetY) / this.TILE_SIZE);
        
        let movedEnemies = 0;
        const totalEnemies = this.enemies.length;
        
        this.enemies.forEach(enemy => {
            const bestMove = this.findBestEnemyMove(enemy, playerTileX, playerTileY);
            
            if (bestMove) {
                // Update enemy tile position
                enemy.tileX = bestMove.x;
                enemy.tileY = bestMove.y;
                
                // Calculate world position
                const newWorldX = this.boardOffsetX + (bestMove.x * this.TILE_SIZE) + this.TILE_SIZE / 2;
                const newWorldY = this.boardOffsetY + (bestMove.y * this.TILE_SIZE) + this.TILE_SIZE / 2;
                
                // Animate enemy movement
                this.tweens.add({
                    targets: enemy.sprite,
                    x: newWorldX,
                    y: newWorldY,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => {
                        movedEnemies++;
                        if (movedEnemies >= totalEnemies) {
                            this.enemiesMoving = false;
                        }
                    }
                });
            } else {
                // Enemy couldn't move, still count it as processed
                movedEnemies++;
                if (movedEnemies >= totalEnemies) {
                    this.enemiesMoving = false;
                }
            }
        });
    }

    findBestEnemyMove(enemy, playerTileX, playerTileY) {
        const deltaX = enemy.tileX - playerTileX;
        const deltaY = enemy.tileY - playerTileY;
        
        // Define all possible moves in order of preference
        const allMoves = [
            {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1},
            {x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}
        ];
        
        // Score each move based on how much it increases distance from player
        const scoredMoves = allMoves.map(move => {
            const newTileX = enemy.tileX + move.x;
            const newTileY = enemy.tileY + move.y;
            
            // Skip invalid moves
            if (!this.isValidEnemyMove(newTileX, newTileY, enemy)) {
                return { ...move, score: -1000, x: newTileX, y: newTileY };
            }
            
            // Calculate distance from player after this move
            const newDeltaX = newTileX - playerTileX;
            const newDeltaY = newTileY - playerTileY;
            const newDistance = Math.sqrt(newDeltaX * newDeltaX + newDeltaY * newDeltaY);
            const currentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Base score: how much distance increases
            let score = (newDistance - currentDistance) * 100;
            
            // Bonus for moving away from player in the preferred direction
            if ((deltaX > 0 && move.x > 0) || (deltaX < 0 && move.x < 0)) score += 50;
            if ((deltaY > 0 && move.y > 0) || (deltaY < 0 && move.y < 0)) score += 50;
            
            // Bonus for diagonal movement (more distance)
            if (move.x !== 0 && move.y !== 0) score += 20;
            
            // Penalty for staying too close to edges (to encourage movement toward center when possible)
            if (newTileX <= 1 || newTileX >= this.MAP_WIDTH - 2) score -= 30;
            if (newTileY <= 1 || newTileY >= this.MAP_HEIGHT - 2) score -= 30;
            
            // Large bonus for moving away when very close to player
            if (currentDistance <= 2) {
                score += 100;
            }
            
            return { ...move, score, x: newTileX, y: newTileY };
        });
        
        // Sort by score (highest first) and pick the best valid move
        scoredMoves.sort((a, b) => b.score - a.score);
        const bestMove = scoredMoves.find(move => move.score > -1000);
        
        return bestMove || null;
    }

    isValidEnemyMove(tileX, tileY, movingEnemy) {
        // Check boundaries
        if (tileX < 0 || tileX >= this.MAP_WIDTH || tileY < 0 || tileY >= this.MAP_HEIGHT) {
            return false;
        }
        
        // Check if position is occupied by player
        const playerTileX = Math.floor((this.player.x - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((this.player.y - this.boardOffsetY) / this.TILE_SIZE);
        if (tileX === playerTileX && tileY === playerTileY) {
            return false;
        }
        
        // Check if position is occupied by another enemy
        return !this.enemies.some(enemy => 
            enemy !== movingEnemy && enemy.tileX === tileX && enemy.tileY === tileY
        );
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

    addCourseDisplay() {
        // Add stylized course topic display in the top-right corner
        if (this.courseTopic) {
            const courseDisplayName = this.getFormattedCourseName(this.courseTopic);
            const courseDisplay = this.add.text(this.scale.width - 20, 30, courseDisplayName, {
                fontFamily: 'Arial',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#00ffff', // Cyan color
                stroke: '#000080', // Dark blue stroke
                strokeThickness: 2,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000040',
                    blur: 4,
                    fill: true
                }
            });
            courseDisplay.setOrigin(1, 0);
            courseDisplay.setScrollFactor(0);
            courseDisplay.setDepth(100);
            
            // Add subtle glow effect to course name
            this.tweens.add({
                targets: courseDisplay,
                alpha: 0.7,
                duration: 1500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
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

    update(time, delta) {
        // Always handle keyboard input and player glow
        this.handleKeyboardInput();
        
        // Update player glow position
        if (this.playerGlow) {
            this.playerGlow.setPosition(this.playerSprite.x, this.playerSprite.y);
        }
        
        // Only run game systems if the game has started and no quiz is active
        if (!this.gameStarted || this.quizActive) {
            return;
        }
        
        // Update enemy movement timer
        this.enemyMoveTimer += delta;
        if (this.enemyMoveTimer >= this.enemyMoveInterval && !this.enemiesMoving) {
            this.moveEnemiesAwayFromPlayer();
            this.enemyMoveTimer = 0;
        }
        
        // Update timer icon spawning
        this.timerIconSpawnTimer += delta;
        if (this.timerIconSpawnTimer >= this.timerIconSpawnInterval) {
            this.spawnTimerIcon();
            this.timerIconSpawnTimer = 0;
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
        
        // Don't allow movement during countdown or quiz
        if (!this.gameStarted || this.quizActive) return;
        
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
        
        // Check for enemy collision at target position
        if (this.checkEnemyCollision(targetX, targetY)) {
            return; // Handle enemy collision and don't move
        }
        
        // Check for timer icon collision at target position
        this.checkTimerIconCollision(targetX, targetY);
        
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