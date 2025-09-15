import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';
import { playExclusiveBGM, updateSoundVolumes } from '../../audioUtils.js';

export default class MainGameplay extends BaseScene {
    constructor() {
        super('MainGameplay');
        
        // Firebase initialization properties
        this.isFirebaseInitialized = false;
        this.database = null;
        this.initializationPromise = null;
        
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
        
        // Map properties - will be set responsively in create()
        this.TILE_SIZE = 58; // Base size, will be adjusted for mobile
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
        this.correctAnswers = 0; // Track correct answers for intensity progression
        this.wrongAnswers = 0; // Track wrong answers for results
        this.intensity3CorrectAnswers = 0; // Track answers in intensity 3 for completion
        this.intensity3PowerUpCounter = 0; // Track correct answers in intensity 3 for power-up spawning
        this.intensity = 1; // Level 1 = multiple choice, Level 2 = mixed, Level 3 = code arrangement
        this.intensityThreshold = 5; // Correct answers needed to reach intensity 2
        this.intensityThreshold2 = 10; // Correct answers needed to reach intensity 3
        
        // Enemy system
        this.enemies = [];
        this.maxEnemies = 5;
        this.enemySprites = [];
        this.enemyMoveTimer = 0;
        this.enemyMoveInterval = 1000; // Move enemies every 1 second
        this.enemiesMoving = false;
        
        // GoblinThug hazard system
        this.goblinThugs = [];
        this.goblinThugSprites = [];
        this.goblinThugSpawnTimer = 0;
        this.goblinThugSpawnInterval = 3000; // Spawn every 3 seconds
        this.goblinThugTimePenalty = 5; // Reduce timer by 5 seconds on collision
        
        // GoblinThug spawn indicators
        this.spawnIndicators = [];
        this.spawnIndicatorDelay = 1000; // Show indicator 1 second before spawn
        this.nextSpawnPositions = []; // Pre-calculated spawn positions
        
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
        
        // Answered questions tracking system - prevents question repetition
        this.answeredQuestions = {
            intensity1: {
                multipleChoice: new Set()
            },
            intensity2: {
                multipleChoice: new Set(),
                dragDrop: new Set()
            },
            intensity3: {
                multipleChoice: new Set(),
                codeArrangement: new Set(),
                combined: new Set() // For combined cycling system
            }
        };
        
        // Power-up system
        this.powerUps = [];
        this.maxPowerUps = 2; // Maximum power-up tiles on the board
        this.powerUpSprites = [];
        this.powerUpActive = false;
        this.currentPowerUp = null;
        this.activePowerUps = {
            streakProtection: false,
            goblinImmunityReady: false,  // Power-up selected, waiting for correct answer
            goblinImmunityActive: false, // Currently immune to one goblin thug
            speedBoost: false
        };
        this.originalPlayerSpeed = 200; // Store original speed for speed boost
    }

    init(data) {
        // Receive data from the computer lab scene
        this.courseTopic = data?.topic || 'python';
        
        // Initialize/reset timer system - ONLY if not resuming from quiz
        if (!data?.gameState) {
            this.gameTimer = 60; // Reset to 1 minute for new session
            this.countdownTimer = 3; // Reset countdown
            this.gameStarted = false; // Reset game started flag
            this.score = 0; // Reset score
            this.quizActive = false; // Reset quiz state
            this.currentQuiz = null;
            this.isMoving = false; // Reset movement state
            
            // Reset enemy movement timers but NOT the movement state flags
            this.enemyMoveTimer = 0;
            this.timerIconSpawnTimer = 0;
            this.goblinThugSpawnTimer = 0;
            
            // Reset enemy movement flags to ensure they can move
            this.enemiesMoving = false;
            
            // Always reset streak system for new sessions
            this.streak = 0;
            this.highestStreak = 0;
            
            // Always reset INTENSITY system for new sessions
            this.enemiesDefeated = 0;
            this.correctAnswers = 0;
            this.wrongAnswers = 0;
            this.intensity3CorrectAnswers = 0;
            this.intensity3PowerUpCounter = 0;
            this.intensity = 1;
            
            // Reset answered questions tracking for new sessions
            this.answeredQuestions = {
                intensity1: {
                    multipleChoice: new Set()
                },
                intensity2: {
                    multipleChoice: new Set(),
                    dragDrop: new Set()
                },
                intensity3: {
                    multipleChoice: new Set(),
                    codeArrangement: new Set(),
                    combined: new Set() // For combined cycling system
                }
            };
            
            // Always reset power-up system for new sessions
            this.activePowerUps = {
                streakProtection: false,
                goblinImmunityReady: false,
                goblinImmunityActive: false,
                speedBoost: false
            };
            this.player.speed = this.originalPlayerSpeed;
            
            console.log('Fresh game session - timer reset to:', this.gameTimer, 'seconds');
        } else {
            // Resuming from quiz - load saved state
            this.loadGameState(data.gameState);
            console.log('Resuming game session - timer restored to:', this.gameTimer, 'seconds');
        }
        
        // Track session start time
        this.sessionStartTime = Date.now();
        
        console.log('MainGameplay initialized with topic:', this.courseTopic);
    }

    setResponsiveTileSize() {
        // Calculate responsive tile size based on screen dimensions
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        const isSmallMobile = screenWidth < 480;
        
        // Base tile size calculations - increased for better mobile visibility
        let baseTileSize;
        if (isSmallMobile) {
            // For very small screens, calculate tile size to fit screen better
            const availableWidth = screenWidth * 0.95;
            const availableHeight = (screenHeight * 0.8); // Account for HUD
            const tileSizeByWidth = availableWidth / this.MAP_WIDTH;
            const tileSizeByHeight = availableHeight / this.MAP_HEIGHT;
            baseTileSize = Math.min(tileSizeByWidth, tileSizeByHeight);
            baseTileSize = Math.max(baseTileSize, 40); // Increased minimum size for better visibility
            baseTileSize = Math.min(baseTileSize, 75); // Increased maximum size
        } else if (isMobile) {
            // For regular mobile screens - increased size
            baseTileSize = 60; // Increased from 52 for better visibility
        } else {
            // Desktop size
            baseTileSize = 58; // Original size
        }
        
        this.TILE_SIZE = Math.round(baseTileSize);
        console.log(`Responsive tile size set to: ${this.TILE_SIZE}px for device: ${isSmallMobile ? 'SmallMobile' : isMobile ? 'Mobile' : 'Desktop'}`);
    }

    preload() {
        // Load the goblin sprite for player
        this.load.image('goblinNerd', 'assets/sprites/player/goblinNerd.png');
        
        // Load enemy sprites (goblin-themed enemies)
        this.load.image('goblinProfessor', 'assets/sprites/enemies/goblinProfessor.png');
        this.load.image('goblinHacker', 'assets/sprites/enemies/goblinHacker.png');
        this.load.image('goblinBully', 'assets/sprites/enemies/goblinBully.png');
        this.load.image('goblinThug', 'assets/sprites/enemies/goblinThug.png');
        
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
        
        // Load audio effects
        this.load.audio('se_hurt', 'assets/audio/se/se_hurt.wav');
        this.load.audio('se_combo', 'assets/audio/se/se_combo.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_correct', 'assets/audio/se/se_correct.wav');
        this.load.audio('se_explosion', 'assets/audio/se/se_explosion.wav');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_wrong', 'assets/audio/se/se_wrong.wav');
        this.load.audio('bgm_game1', 'assets/audio/bgm/bgm_game1.mp3');
        
        // Create a simple colored rectangle if grass tile doesn't exist
        this.load.image('defaultTile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    }

    create() {
        super.create(); // Call BaseScene create method
        
        // Set responsive tile size based on screen size
        this.setResponsiveTileSize();
        
        // Initialize sound effects and background music
        playExclusiveBGM(this, 'bgm_game1', { loop: true });
        updateSoundVolumes(this);
        
        // Listen for quiz completion
        this.events.on('quiz-completed', this.handleQuizCompletion, this);
        
        // Create background
        this.createBackground();
        
        // Create player sprite
        this.createPlayer();
        
        // Create enemies
        this.createEnemies();
        
        // Setup camera to follow player (must be after player creation)
        this.setupCamera();
        
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

        // Add course topic display
        this.addCourseDisplay();
        
        // Add mobile control hint
        this.addMobileControlHint();
        
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
        
        // Update camera after player position is set
        this.setupCamera();
        
        // Update HUD positions for responsive design
        this.updateHudPositions();
    }
    
    updateHudPositions() {
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        const isSmallMobile = screenWidth < 480;

        // --- Desktop: HUD moves with player and stays on top of their view ---
        if (!isMobile) {
            const margin = 12;
            const scoreFontSize = 24;
            const streakFontSize = 18;
            const timerFontSize = 32;
            const courseFontSize = 18;

            // Get player position for HUD placement - HUD follows player
            const playerX = this.playerSprite ? this.playerSprite.x : screenWidth / 2;
            const playerY = this.playerSprite ? this.playerSprite.y : screenHeight / 2;
            
            // Calculate HUD offset from player position
            const hudOffsetY = -150; // Position HUD above player
            const hudCenterX = playerX;
            const hudTopY = playerY + hudOffsetY;

            if (this.scoreText) {
                this.scoreText.setPosition(hudCenterX - 200, hudTopY);
                this.scoreText.setFontSize(`${scoreFontSize}px`);
                this.scoreText.setStroke('#000000', 3);
                this.scoreText.setShadow(2, 2, '#000000', 2, true, false);
                this.scoreText.setScrollFactor(1); // Follow world movement
                this.scoreText.setDepth(1000);
            }
            if (this.streakText) {
                this.streakText.setPosition(hudCenterX - 200, hudTopY + scoreFontSize + 2);
                this.streakText.setFontSize(`${streakFontSize}px`);
                this.streakText.setStroke('#000000', 2);
                this.streakText.setShadow(2, 2, '#000000', 2, true, false);
                this.streakText.setScrollFactor(1); // Follow world movement
                this.streakText.setDepth(1000);
            }
            if (this.timerText) {
                this.timerText.setPosition(hudCenterX, hudTopY);
                this.timerText.setFontSize(`${timerFontSize}px`);
                this.timerText.setStroke('#000000', 4);
                this.timerText.setShadow(2, 2, '#000000', 3, true, false);
                this.timerText.setScrollFactor(1); // Follow world movement
                this.timerText.setDepth(1000);
            }
            if (this.courseDisplay) {
                this.courseDisplay.setPosition(hudCenterX + 200, hudTopY);
                this.courseDisplay.setFontSize(`${courseFontSize}px`);
                this.courseDisplay.setOrigin(1, 0);
                this.courseDisplay.setStroke('#000080', 2);
                this.courseDisplay.setShadow(2, 2, '#000040', 2, true, false);
                this.courseDisplay.setScrollFactor(1); // Follow world movement
                this.courseDisplay.setDepth(1000);
            }
            return;
        }

        // --- Mobile HUD logic (improved for zoom consistency) ---
        let scoreX, scoreY, streakY, timerY;
        let scoreFontSize, streakFontSize, timerFontSize, courseFontSize;

        const margin = isSmallMobile ? 10 : 12;

        if (isSmallMobile) {
            scoreX = margin;
            scoreY = margin;
            streakY = margin + 22;
            timerY = margin;
            scoreFontSize = Math.max(18, screenWidth * 0.032);
            streakFontSize = Math.max(14, screenWidth * 0.028);
            timerFontSize = Math.max(24, screenWidth * 0.04);
            courseFontSize = Math.max(14, screenWidth * 0.028);
        } else {
            scoreX = margin;
            scoreY = margin;
            streakY = margin + 25;
            timerY = margin;
            scoreFontSize = Math.max(20, screenWidth * 0.028);
            streakFontSize = Math.max(16, screenWidth * 0.025);
            timerFontSize = Math.max(28, screenWidth * 0.036);
            courseFontSize = Math.max(16, screenWidth * 0.025);
        }

        // Get player position for HUD following
        const playerX = this.player ? this.player.x : 0;
        const playerY = this.player ? this.player.y : 0;
        
        // Calculate HUD offset positions relative to player
        const hudOffsetY = -screenHeight / 2 + margin;
        const hudCenterX = playerX;
        const hudLeftX = playerX - screenWidth / 2 + scoreX;
        const hudRightX = playerX + screenWidth / 2 - margin;

        if (this.scoreText) {
            this.scoreText.setPosition(hudLeftX, playerY + hudOffsetY + scoreY);
            this.scoreText.setFontSize(`${scoreFontSize}px`);
            this.scoreText.setScrollFactor(1); // Follow world movement
            this.scoreText.setDepth(1000);
            this.scoreText.setStroke('#000000', 3);
            this.scoreText.setShadow(2, 2, '#000000', 2, true, false);
        }
        if (this.streakText) {
            this.streakText.setPosition(hudLeftX, playerY + hudOffsetY + streakY);
            this.streakText.setFontSize(`${streakFontSize}px`);
            this.streakText.setScrollFactor(1); // Follow world movement
            this.streakText.setDepth(1000);
            this.streakText.setStroke('#000000', 2);
            this.streakText.setShadow(2, 2, '#000000', 2, true, false);
        }
        if (this.timerText) {
            this.timerText.setPosition(hudCenterX, playerY + hudOffsetY + timerY);
            this.timerText.setFontSize(`${timerFontSize}px`);
            this.timerText.setScrollFactor(1); // Follow world movement
            this.timerText.setDepth(1000);
            this.timerText.setStroke('#000080', 3);
            this.timerText.setShadow(2, 2, '#000040', 3, true, false);
        }
        if (this.courseDisplay) {
            this.courseDisplay.setPosition(hudRightX, playerY + hudOffsetY + margin);
            this.courseDisplay.setFontSize(`${courseFontSize}px`);
            this.courseDisplay.setOrigin(1, 0);
            this.courseDisplay.setScrollFactor(1); // Follow world movement
            this.courseDisplay.setDepth(1000);
            this.courseDisplay.setStroke('#000080', 2);
            this.courseDisplay.setShadow(2, 2, '#000040', 2, true, false);
        }
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
        const isMobile = screenWidth < 768;
        const isSmallMobile = screenWidth < 480;
        
        // Account for HUD space at the top - reduced ONLY on mobile
        let hudHeight;
        if (isSmallMobile) {
            hudHeight = 45; // Much smaller HUD height for very small screens
        } else if (isMobile) {
            hudHeight = 50; // Much smaller HUD height for mobile
        } else {
            hudHeight = 100; // Original HUD height for desktop
        }
        
        const availableHeight = screenHeight - hudHeight;
        
        // Calculate offset to center the board in available space
        const offsetX = Math.max(0, (screenWidth - boardWidth) / 2);
        const offsetY = hudHeight + Math.max(0, (availableHeight - boardHeight) / 2);
        
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
        
        // Create player sprite with enhanced mobile scaling
        this.playerSprite = this.add.image(this.player.x, this.player.y, 'goblinNerd');
        
        // Enhanced sprite scaling for mobile visibility
        const isMobile = this.scale.width < 768;
        const isSmallMobile = this.scale.width < 480;
        
        let spriteScale;
        if (isSmallMobile) {
            spriteScale = this.TILE_SIZE * 0.9; // Larger on very small screens
        } else if (isMobile) {
            spriteScale = this.TILE_SIZE * 0.85; // Slightly larger on mobile
        } else {
            spriteScale = this.TILE_SIZE * 0.8; // Original size for desktop
        }
        
        this.playerSprite.setDisplaySize(spriteScale, spriteScale);
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
        
        // Clear existing goblin thugs
        this.clearGoblinThugs();
        
        // Clear existing spawn indicators
        this.clearSpawnIndicators();
        
        // Available enemy types (goblin-themed enemies)
        const enemyTypes = ['goblinProfessor', 'goblinHacker', 'goblinBully'];
        
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

    createPowerUps() {
        // Clear existing power-ups
        this.powerUps = [];
        if (this.powerUpSprites) {
            this.powerUpSprites.forEach(sprite => sprite.destroy());
        }
        this.powerUpSprites = [];
        
        // Generate random power-up positions (avoiding player starting position and enemies)
        const playerTileX = Math.floor(this.MAP_WIDTH / 2);
        const playerTileY = Math.floor(this.MAP_HEIGHT / 2);
        
        for (let i = 0; i < this.maxPowerUps; i++) {
            let powerUpTileX, powerUpTileY;
            let attempts = 0;
            
            // Try to find a valid position (not on player, not on enemies, not on other power-ups)
            do {
                powerUpTileX = Phaser.Math.Between(0, this.MAP_WIDTH - 1);
                powerUpTileY = Phaser.Math.Between(0, this.MAP_HEIGHT - 1);
                attempts++;
            } while (
                attempts < 50 && (
                    (powerUpTileX === playerTileX && powerUpTileY === playerTileY) ||
                    this.enemies.some(enemy => enemy.tileX === powerUpTileX && enemy.tileY === powerUpTileY) ||
                    this.powerUps.some(powerUp => powerUp.tileX === powerUpTileX && powerUp.tileY === powerUpTileY)
                )
            );
            
            // If we found a valid position, create the power-up
            if (attempts < 50) {
                const powerUp = this.createPowerUp(powerUpTileX, powerUpTileY);
                this.powerUps.push(powerUp);
            }
        }
        
        console.log(`Created ${this.powerUps.length} power-ups`);
    }

    spawnSinglePowerUp() {
        // Don't spawn if we already have maximum power-ups
        if (this.powerUps.length >= this.maxPowerUps) {
            console.log('Maximum power-ups already on board, skipping spawn');
            return;
        }
        
        // Generate random power-up position (avoiding player, enemies, and existing power-ups)
        const playerTileX = Math.floor((this.player.x - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((this.player.y - this.boardOffsetY) / this.TILE_SIZE);
        
        let powerUpTileX, powerUpTileY;
        let attempts = 0;
        
        // Try to find a valid position
        do {
            powerUpTileX = Phaser.Math.Between(0, this.MAP_WIDTH - 1);
            powerUpTileY = Phaser.Math.Between(0, this.MAP_HEIGHT - 1);
            attempts++;
        } while (
            attempts < 50 && (
                (powerUpTileX === playerTileX && powerUpTileY === playerTileY) ||
                this.enemies.some(enemy => enemy.tileX === powerUpTileX && enemy.tileY === powerUpTileY) ||
                this.powerUps.some(powerUp => powerUp.tileX === powerUpTileX && powerUp.tileY === powerUpTileY) ||
                this.goblinThugs.some(thug => thug.tileX === powerUpTileX && thug.tileY === powerUpTileY)
            )
        );
        
        // If we found a valid position, create the power-up
        if (attempts < 50) {
            const powerUp = this.createPowerUp(powerUpTileX, powerUpTileY);
            this.powerUps.push(powerUp);
            console.log(`Power-up spawned at (${powerUpTileX}, ${powerUpTileY})`);
        } else {
            console.log('Could not find valid position for power-up spawn');
        }
    }

    createTimer() {
        // Calculate responsive positions based on screen size
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        
        // Center the timer horizontally
        const centerX = screenWidth / 2;
        const timerY = isMobile ? Math.min(30, screenHeight * 0.05) : 30;
        
        // Responsive font size
        const timerFontSize = isMobile ? Math.max(24, screenWidth * 0.04) : 32;
        
        this.timerText = this.add.text(centerX, timerY, '1:00', {
            fontFamily: 'Arial',
            fontSize: `${timerFontSize}px`,
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
        // Calculate responsive positions based on screen size
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        
        // Use responsive positioning
        const scoreX = isMobile ? Math.min(20, screenWidth * 0.03) : 20;
        const scoreY = isMobile ? Math.min(30, screenHeight * 0.05) : 30;
        const streakY = isMobile ? Math.min(65, screenHeight * 0.11) : 65;
        
        // Responsive font sizes
        const scoreFontSize = isMobile ? Math.max(18, screenWidth * 0.03) : 24;
        const streakFontSize = isMobile ? Math.max(14, screenWidth * 0.025) : 18;
        
        // Create score text at the top left of the screen
        this.scoreText = this.add.text(scoreX, scoreY, 'Score: 0', {
            fontFamily: 'Arial',
            fontSize: `${scoreFontSize}px`,
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
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(1000);
        
        // Create streak display below the score
        this.streakText = this.add.text(scoreX, streakY, 'Streak: 0', {
            fontFamily: 'Arial',
            fontSize: `${streakFontSize}px`,
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
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(1000);
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
        // Prevent timer from going negative
        this.gameTimer = Math.max(0, this.gameTimer - 1);
        
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
        
        // Show result screen when timer expires
        this.showResultScreen(false); // Timer expired, not course completed
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
        
        // Create timer icon sprite with enhanced mobile scaling
        const iconSprite = this.add.image(worldX, worldY, 'timerIcon');
        
        // Enhanced icon scaling for mobile visibility
        const isMobile = this.scale.width < 768;
        const isSmallMobile = this.scale.width < 480;
        
        let iconScale;
        if (isSmallMobile) {
            iconScale = this.TILE_SIZE * 0.7; // Larger on very small screens
        } else if (isMobile) {
            iconScale = this.TILE_SIZE * 0.65; // Slightly larger on mobile
        } else {
            iconScale = this.TILE_SIZE * 0.6; // Original size for desktop
        }
        
        iconSprite.setDisplaySize(iconScale, iconScale);
        
        // Add glow effect with responsive sizing
        const glowSize = isMobile ? this.TILE_SIZE * 0.45 : this.TILE_SIZE * 0.4;
        const glow = this.add.circle(worldX, worldY, glowSize, 0xFFD700, 0.3);
        
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
        // Play timer pickup sound
        this.sound.play('se_select', { volume: 0.8 });
        
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

    showSpawnIndicators() {
        // Determine number of thugs to spawn based on intensity
        let thugCount = 2; // Default for intensity 1
        if (this.intensity === 2) {
            thugCount = 4;
        } else if (this.intensity === 3) {
            thugCount = 6;
        }

        // Clear existing indicators
        this.clearSpawnIndicators();

        // Generate spawn positions and create indicators
        this.nextSpawnPositions = [];
        for (let i = 0; i < thugCount; i++) {
            const position = this.generateSpawnPosition();
            if (position) {
                this.nextSpawnPositions.push(position);
                this.createSpawnIndicator(position.x, position.y);
            }
        }

        console.log(`Showing spawn indicators for ${this.nextSpawnPositions.length} positions`);
    }

    generateSpawnPosition() {
        const playerTileX = Math.floor((this.player.x - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((this.player.y - this.boardOffsetY) / this.TILE_SIZE);
        
        let attempts = 0;
        let spawnTileX, spawnTileY;
        
        do {
            spawnTileX = Phaser.Math.Between(0, this.MAP_WIDTH - 1);
            spawnTileY = Phaser.Math.Between(0, this.MAP_HEIGHT - 1);
            attempts++;
        } while (
            attempts < 50 && (
                (spawnTileX === playerTileX && spawnTileY === playerTileY) ||
                this.enemies.some(enemy => enemy.tileX === spawnTileX && enemy.tileY === spawnTileY) ||
                this.timerIcons.some(icon => icon.tileX === spawnTileX && icon.tileY === spawnTileY) ||
                this.goblinThugs.some(thug => thug.tileX === spawnTileX && thug.tileY === spawnTileY) ||
                this.nextSpawnPositions.some(pos => pos.x === spawnTileX && pos.y === spawnTileY)
            )
        );
        
        if (attempts < 50) {
            return { x: spawnTileX, y: spawnTileY };
        }
        return null;
    }

    createSpawnIndicator(tileX, tileY) {
        // Calculate world position
        const worldX = this.boardOffsetX + (tileX * this.TILE_SIZE) + this.TILE_SIZE / 2;
        const worldY = this.boardOffsetY + (tileY * this.TILE_SIZE) + this.TILE_SIZE / 2;
        
        // Create warning indicator (red circle with pulsing effect)
        const indicator = this.add.circle(worldX, worldY, this.TILE_SIZE * 0.3, 0xff0000, 0.6);
        indicator.setDepth(6); // Above background but below sprites
        
        // Add warning symbol in the center
        const warningText = this.add.text(worldX, worldY, '⚠', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(7);
        
        // Add pulsing animation
        this.tweens.add({
            targets: [indicator, warningText],
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.3,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        
        // Store indicator for cleanup
        this.spawnIndicators.push({
            tileX: tileX,
            tileY: tileY,
            circle: indicator,
            text: warningText
        });
    }

    clearSpawnIndicators() {
        // Destroy all existing spawn indicators
        this.spawnIndicators.forEach(indicator => {
            if (indicator.circle && !indicator.circle.destroyed) {
                indicator.circle.destroy();
            }
            if (indicator.text && !indicator.text.destroyed) {
                indicator.text.destroy();
            }
        });
        
        // Clear arrays
        this.spawnIndicators = [];
    }

    spawnGoblinThugs() {
        // Clear existing thugs first
        this.clearGoblinThugs();
        
        // Clear spawn indicators
        this.clearSpawnIndicators();

        // Use pre-calculated spawn positions
        this.nextSpawnPositions.forEach(position => {
            this.createGoblinThug(position.x, position.y);
        });

        console.log(`Spawned ${this.nextSpawnPositions.length} goblin thugs for intensity ${this.intensity}`);
        
        // Clear spawn positions for next cycle
        this.nextSpawnPositions = [];
    }

    createGoblinThug(tileX, tileY) {
        // Calculate world position
        const worldX = this.boardOffsetX + (tileX * this.TILE_SIZE) + this.TILE_SIZE / 2;
        const worldY = this.boardOffsetY + (tileY * this.TILE_SIZE) + this.TILE_SIZE / 2;
        
        // Create thug sprite with enhanced mobile scaling
        const thugSprite = this.add.image(worldX, worldY, 'goblinThug');
        
        // Enhanced sprite scaling for mobile visibility
        const isMobile = this.scale.width < 768;
        const isSmallMobile = this.scale.width < 480;
        
        let thugSpriteScale;
        if (isSmallMobile) {
            thugSpriteScale = this.TILE_SIZE * 0.9; // Larger on very small screens
        } else if (isMobile) {
            thugSpriteScale = this.TILE_SIZE * 0.85; // Slightly larger on mobile
        } else {
            thugSpriteScale = this.TILE_SIZE * 0.8; // Original size for desktop
        }
        
        thugSprite.setDisplaySize(thugSpriteScale, thugSpriteScale);
        thugSprite.setDepth(7); // Lower depth than enemies but higher than background
        
        // Add menacing red tint to distinguish as hazard
        thugSprite.setTint(0xff4444);
        
        // Create thug object
        const goblinThug = {
            tileX: tileX,
            tileY: tileY,
            sprite: thugSprite
        };
        
        this.goblinThugs.push(goblinThug);
        this.goblinThugSprites.push(thugSprite);
    }

    clearGoblinThugs() {
        // Destroy all existing thug sprites
        this.goblinThugSprites.forEach(sprite => {
            if (sprite && !sprite.destroyed) {
                sprite.destroy();
            }
        });
        
        // Clear arrays
        this.goblinThugs = [];
        this.goblinThugSprites = [];
    }

    checkGoblinThugCollision(worldX, worldY) {
        // Convert world coordinates to tile coordinates
        const playerTileX = Math.floor((worldX - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((worldY - this.boardOffsetY) / this.TILE_SIZE);
        
        // Check if player is on the same tile as any goblin thug
        const collidedThug = this.goblinThugs.find(thug => 
            thug.tileX === playerTileX && thug.tileY === playerTileY
        );
        
        if (collidedThug) {
            this.handleGoblinThugCollision(collidedThug);
        }
    }

    handleGoblinThugCollision(thug) {
        // Check for goblin immunity power-up
        if (this.activePowerUps.goblinImmunityActive) {
            // Player is immune - destroy thug without penalty
            console.log('Goblin immunity active! No damage taken.');
            
            // Deactivate immunity after blocking one thug
            this.activePowerUps.goblinImmunityActive = false;
            
            // Show immunity notification
            this.showPowerUpNotification({
                icon: '✨',
                name: 'Goblin Blocked!'
            });
            
            // Create golden shield effect instead of damage
            const shieldEffect = this.add.circle(this.player.x, this.player.y, this.TILE_SIZE * 0.6, 0xFFD700, 0.5);
            shieldEffect.setDepth(15);
            
            this.tweens.add({
                targets: shieldEffect,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => shieldEffect.destroy()
            });
            
            // Remove the thug
            this.removeGoblinThug(thug);
            return;
        }
        
        // Normal goblin thug collision (no immunity)
        // Play hurt sound effect
        this.sound.play('se_hurt', { volume: 0.8 });
        
        // Create red screen flash effect
        const flashOverlay = this.add.rectangle(
            this.cameras.main ? this.cameras.main.centerX : this.scale.width / 2, 
            this.cameras.main ? this.cameras.main.centerY : this.scale.height / 2, 
            this.scale.width, 
            this.scale.height, 
            0xff6666, 
            0.3
        ).setScrollFactor(0).setDepth(1000);
        
        // Animate the flash effect
        this.tweens.add({
            targets: flashOverlay,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                flashOverlay.destroy();
            }
        });
        
        // Add camera shake effect
        if (this.cameras && this.cameras.main) {
            this.cameras.main.shake(200, 0.02);
        }
        
        // Reduce game timer
        this.gameTimer = Math.max(0, this.gameTimer - this.goblinThugTimePenalty);
        
        // Update timer display immediately
        const minutes = Math.floor(this.gameTimer / 60);
        const seconds = this.gameTimer % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.timerText.setText(timeString);
        
        // Update timer color based on remaining time
        if (this.gameTimer <= 10) {
            this.timerText.setColor('#ff0000'); // Red for critical time
        } else if (this.gameTimer <= 30) {
            this.timerText.setColor('#ffff00'); // Yellow for low time
        }
        
        // Show time penalty effect
        const effectText = this.add.text(this.timerText.x, this.timerText.y + 40, `-${this.goblinThugTimePenalty}s`, {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
        
        // Animate the penalty effect
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
        
        console.log(`Hit goblin thug! Lost ${this.goblinThugTimePenalty} seconds. Time remaining: ${this.gameTimer}s`);
        
        // Remove the thug
        this.removeGoblinThug(thug);
        
        // Check if time ran out
        if (this.gameTimer <= 0) {
            this.onTimerExpired();
        }
    }

    removeGoblinThug(thug) {
        // Remove the thug from the game
        const thugIndex = this.goblinThugs.indexOf(thug);
        if (thugIndex > -1) {
            this.goblinThugs.splice(thugIndex, 1);
        }
        
        const spriteIndex = this.goblinThugSprites.indexOf(thug.sprite);
        if (spriteIndex > -1) {
            this.goblinThugSprites.splice(spriteIndex, 1);
        }
        
        // Destroy thug sprite with effect
        this.tweens.add({
            targets: thug.sprite,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                thug.sprite.destroy();
            }
        });
    }

    createEnemy(tileX, tileY, spriteKey) {
        // Calculate world position
        const worldX = this.boardOffsetX + (tileX * this.TILE_SIZE) + this.TILE_SIZE/2;
        const worldY = this.boardOffsetY + (tileY * this.TILE_SIZE) + this.TILE_SIZE/2;
        
        // Create enemy sprite with enhanced mobile scaling
        const enemySprite = this.add.image(worldX, worldY, spriteKey);
        
        // Enhanced sprite scaling for mobile visibility
        const isMobile = this.scale.width < 768;
        const isSmallMobile = this.scale.width < 480;
        
        let enemySpriteScale;
        if (isSmallMobile) {
            enemySpriteScale = this.TILE_SIZE * 0.8; // Larger on very small screens
        } else if (isMobile) {
            enemySpriteScale = this.TILE_SIZE * 0.75; // Slightly larger on mobile
        } else {
            enemySpriteScale = this.TILE_SIZE * 0.7; // Original size for desktop
        }
        
        enemySprite.setDisplaySize(enemySpriteScale, enemySpriteScale);
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

    createPowerUp(tileX, tileY) {
        // Calculate world position
        const worldX = this.boardOffsetX + (tileX * this.TILE_SIZE) + this.TILE_SIZE/2;
        const worldY = this.boardOffsetY + (tileY * this.TILE_SIZE) + this.TILE_SIZE/2;
        
        // Create power-up sprite using star emoji
        const powerUpSprite = this.add.text(worldX, worldY, '🌟', {
            fontSize: `${this.TILE_SIZE * 0.6}px`,
            fontFamily: 'Arial'
        });
        powerUpSprite.setOrigin(0.5);
        powerUpSprite.setDepth(7); // Below enemies but above background
        
        // Add golden glow effect
        const glowEffect = this.add.circle(worldX, worldY, this.TILE_SIZE * 0.4, 0xFFD700, 0.3);
        glowEffect.setDepth(6);
        
        // Add pulsing animation
        this.tweens.add({
            targets: [powerUpSprite, glowEffect],
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Store sprite references for cleanup
        this.powerUpSprites.push(powerUpSprite);
        this.powerUpSprites.push(glowEffect);
        
        // Return power-up data
        return {
            tileX: tileX,
            tileY: tileY,
            worldX: worldX,
            worldY: worldY,
            sprite: powerUpSprite,
            glow: glowEffect,
            type: 'powerUp'
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

    checkPowerUpCollision(worldX, worldY) {
        // Convert world coordinates to tile coordinates
        const playerTileX = Math.floor((worldX - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((worldY - this.boardOffsetY) / this.TILE_SIZE);
        
        // Check if player is on the same tile as any power-up
        const collidedPowerUp = this.powerUps.find(powerUp => 
            powerUp.tileX === playerTileX && powerUp.tileY === playerTileY
        );
        
        if (collidedPowerUp) {
            console.log(`Player collided with power-up at (${playerTileX}, ${playerTileY})`);
            this.handlePowerUpCollision(collidedPowerUp);
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
        // Pass intensity level and answered questions tracker to determine quiz type and avoid repetition
        this.scene.launch('QuizScene', {
            courseTopic: this.courseTopic,
            enemyToDestroy: enemy,
            intensity: this.intensity,
            answeredQuestions: this.answeredQuestions
        });
    }

    handlePowerUpCollision(powerUp) {
        // Don't handle collision if power-up scene is already active or game hasn't started
        if (this.powerUpActive || !this.gameStarted) {
            return;
        }
        
        // Play power-up pickup sound
        this.sound.play('se_select', { volume: 0.8 });
        
        // Save game state and start power-up scene
        this.startPowerUpScene(powerUp);
    }

    startPowerUpScene(powerUp) {
        this.powerUpActive = true;
        this.currentPowerUp = powerUp;
        
        // Pause the main scene to stop timer, enemy movement, and player movement
        this.scene.pause();
        
        // Launch power-up scene
        this.scene.launch('PowerUpScene', {
            powerUpToCollect: powerUp
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
        // Track the answered question to prevent repetition
        if (data.questionData) {
            this.trackAnsweredQuestion(data.questionData, data.questionType, this.intensity);
        }
        
        // Handle quiz results
        if (data.correct) {
            // Increment streak for correct answer
            this.streak++;
            
            // Increment correct answers for intensity progression
            this.correctAnswers++;
            
            // Track intensity 3 progress for course completion
            if (this.intensity === 3) {
                this.intensity3CorrectAnswers++;
                this.intensity3PowerUpCounter++;
                
                // Spawn power-up every 5 correct answers in intensity 3
                if (this.intensity3PowerUpCounter >= 5) {
                    this.spawnSinglePowerUp();
                    this.intensity3PowerUpCounter = 0; // Reset counter
                    console.log('Power-up spawned after 5 correct answers in intensity 3!');
                }
                
                // Check if course is completed (10 correct answers in intensity 3)
                if (this.intensity3CorrectAnswers >= 10) {
                    this.showResultScreen(true); // Course completed
                    return;
                }
            }
            
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
            
            // Play sound effect based on streak
            if (this.streak >= 3) {
                this.sound.play('se_combo', { volume: 0.8 }); // Combo sound for streaks 3+
            } else {
                this.sound.play('se_correct', { volume: 0.8 }); // Correct answer sound
            }
            
            console.log(`Correct answer! Streak: ${this.streak}x, Score: +${totalScore} (+${this.baseScore} base + ${bonusScore} bonus), +10 seconds`);
            
            // Update player speed if speed boost is active
            this.updatePlayerSpeed();
            
            // Activate goblin immunity if power-up is ready
            if (this.activePowerUps.goblinImmunityReady) {
                this.activePowerUps.goblinImmunityReady = false; // Consume the ready state
                this.activePowerUps.goblinImmunityActive = true; // Activate protection
                console.log('Goblin immunity activated! Next goblin thug will be blocked.');
                
                // Show activation notification
                this.showPowerUpNotification({
                    icon: '✨',
                    name: 'Goblin Ward Active!'
                });
            }
            
            // Check for intensity increase after correct answer
            this.checkIntensityIncrease();
        } else {
            // Play wrong answer sound
            this.sound.play('se_wrong', { volume: 0.8 });
            
            // Increment wrong answers counter
            this.wrongAnswers++;
            
            // Check for streak protection power-up
            if (this.activePowerUps.streakProtection) {
                // Use streak protection to save the streak
                this.activePowerUps.streakProtection = false; // One-time use
                this.showPowerUpNotification({
                    icon: '🛡️',
                    name: 'Streak Protected!'
                });
                console.log('Streak protection activated! Streak preserved.');
            } else {
                // Reset streak on wrong answer
                this.streak = 0;
                console.log('Wrong answer! Streak reset.');
                
                // Reset goblin immunity on wrong answer
                if (this.activePowerUps.goblinImmunityReady || this.activePowerUps.goblinImmunityActive) {
                    this.activePowerUps.goblinImmunityReady = false;
                    this.activePowerUps.goblinImmunityActive = false;
                    console.log('Goblin immunity lost due to wrong answer.');
                }
            }
            
            this.updateStreakDisplay();
            this.updatePlayerSpeed(); // Update speed in case speed boost is active
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

    trackAnsweredQuestion(questionData, questionType, intensity) {
        // Create a unique identifier for the question based on its content
        const questionId = this.createQuestionId(questionData);
        
        // Track the question based on intensity and type
        const intensityKey = `intensity${intensity}`;
        
        if (intensity === 1) {
            // Intensity 1: Only multiple choice
            this.answeredQuestions[intensityKey].multipleChoice.add(questionId);
        } else if (intensity === 2) {
            // Intensity 2: Multiple choice or drag-drop
            if (questionType === 'dragDrop' || questionData.type === 'drag-and-drop') {
                this.answeredQuestions[intensityKey].dragDrop.add(questionId);
            } else {
                this.answeredQuestions[intensityKey].multipleChoice.add(questionId);
            }
        } else if (intensity === 3) {
            // Intensity 3: Enhanced tracking for combined question system
            
            // Track in appropriate individual category
            if (questionType === 'codeArrangement' || questionData.type === 'drag-and-drop' || questionData.isDragDrop) {
                this.answeredQuestions[intensityKey].codeArrangement.add(questionId);
            } else {
                // Multiple choice questions in intensity 3
                if (!this.answeredQuestions[intensityKey].multipleChoice) {
                    this.answeredQuestions[intensityKey].multipleChoice = new Set();
                }
                this.answeredQuestions[intensityKey].multipleChoice.add(questionId);
            }
            
            // Also track in combined pool for cycling system
            if (!this.answeredQuestions[intensityKey].combined) {
                this.answeredQuestions[intensityKey].combined = new Set();
            }
            this.answeredQuestions[intensityKey].combined.add(questionId);
        }
        
        console.log(`Question tracked - Intensity ${intensity}, Type: ${questionType}, ID: ${questionId}`);
        console.log('Total answered questions:', {
            intensity1: this.answeredQuestions.intensity1.multipleChoice.size,
            intensity2: {
                multipleChoice: this.answeredQuestions.intensity2.multipleChoice.size,
                dragDrop: this.answeredQuestions.intensity2.dragDrop.size
            },
            intensity3: {
                multipleChoice: this.answeredQuestions.intensity3.multipleChoice?.size || 0,
                codeArrangement: this.answeredQuestions.intensity3.codeArrangement.size,
                combined: this.answeredQuestions.intensity3.combined?.size || 0
            }
        });
    }

    createQuestionId(questionData) {
        // Create a unique identifier based on question content
        // Use the question text as the primary identifier
        if (questionData.question) {
            return questionData.question;
        } else if (questionData.prompt) {
            return questionData.prompt;
        } else if (questionData.description) {
            return questionData.description;
        } else {
            // Fallback: use JSON string of the question
            return JSON.stringify(questionData);
        }
    }

    handlePowerUpResult(powerUpData, success, selectedPowerUp) {
        console.log('Power-up result:', { success, selectedPowerUp });
        
        if (success && selectedPowerUp) {
            // Apply the selected power-up effect
            this.applyPowerUpEffect(selectedPowerUp.id);
            
            // Show activation notification
            this.showPowerUpNotification(selectedPowerUp);
            
            // Play confirmation sound
            this.sound.play('se_confirm', { volume: 0.6 });
            
            console.log(`Power-up activated: ${selectedPowerUp.name}`);
        }
        
        // Remove the collected power-up from the board
        if (powerUpData) {
            this.destroyPowerUp(powerUpData);
        }
        
        // Resume game and unpause the scene
        this.powerUpActive = false;
        this.scene.resume();
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
        if (this.correctAnswers >= this.intensityThreshold2 && this.intensity === 2) {
            this.intensity = 3;
            
            // Play intensity increase sound
            this.sound.play('se_combo', { volume: 0.8 });
            
            // Show INTENSITY 3 increase notification
            this.showIntensityNotification();
            
            // Spawn power-up on intensity increase
            this.spawnSinglePowerUp();
            
            console.log(`INTENSITY INCREASED! Level ${this.intensity} - Code arrangement quizzes activated! (${this.correctAnswers} correct answers)`);
        } else if (this.correctAnswers >= this.intensityThreshold && this.intensity === 1) {
            this.intensity = 2;
            
            // Play intensity increase sound
            this.sound.play('se_combo', { volume: 0.7 });
            
            // Show INTENSITY increase notification
            this.showIntensityNotification();
            
            // Spawn power-up on intensity increase
            this.spawnSinglePowerUp();
            
            console.log(`INTENSITY INCREASED! Level ${this.intensity} - Drag-and-Drop quizzes activated! (${this.correctAnswers} correct answers)`);
        }
    }

    showIntensityNotification() {
        // Create dramatic notification
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        let notificationText = '';
        if (this.intensity === 2) {
            notificationText = 'INTENSITY LEVEL 2\nDRAG & DROP MODE!';
        } else if (this.intensity === 3) {
            notificationText = 'INTENSITY LEVEL 3\nCODE ARRANGEMENT!';
        }
        
        const notification = this.add.text(centerX, centerY, notificationText, {
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
        
        // Detect mobile for responsive sizing
        const isMobile = this.scale.width < 768;
        
        // Set responsive dimensions
        const containerWidth = isMobile ? Math.min(this.scale.width - 40, 500) : 600;
        const containerHeight = isMobile ? Math.min(this.scale.height - 80, 450) : 400;
        const questionFontSize = isMobile ? '18px' : '20px';
        const answerFontSize = isMobile ? '14px' : '16px';
        const titleFontSize = isMobile ? '20px' : '24px';
        const buttonHeight = isMobile ? 45 : 50;
        const buttonSpacing = isMobile ? 50 : 60;
        const wordWrapWidth = containerWidth - 60;
        
        // Create quiz container
        this.quizContainer = this.add.container(this.scale.width / 2, this.scale.height / 2);
        this.quizContainer.setDepth(2000);
        
        // Create quiz background
        const quizBg = this.add.rectangle(0, 0, containerWidth, containerHeight, 0x000000, 0.9);
        quizBg.setStroke(0xffffff, 4);
        this.quizContainer.add(quizBg);
        
        // Create question text
        const questionY = isMobile ? -containerHeight/2 + 80 : -120;
        const questionText = this.add.text(0, questionY, randomQuestion.question, {
            fontFamily: 'Arial',
            fontSize: questionFontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: wordWrapWidth }
        }).setOrigin(0.5);
        this.quizContainer.add(questionText);
        
        // Create answer buttons
        const answers = randomQuestion.options;
        const correctAnswer = randomQuestion.correct;
        
        // Calculate starting Y position for answers
        const startY = isMobile ? -50 : -40;
        
        for (let i = 0; i < answers.length; i++) {
            const answerY = startY + (i * buttonSpacing);
            const answerBtn = this.add.rectangle(0, answerY, containerWidth - 100, buttonHeight, 0x333333);
            answerBtn.setStroke(0xffffff, 2);
            answerBtn.setInteractive();
            
            const answerText = this.add.text(0, answerY, `${String.fromCharCode(65 + i)}. ${answers[i]}`, {
                fontFamily: 'Arial',
                fontSize: answerFontSize,
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: containerWidth - 120 }
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
        const titleY = isMobile ? -containerHeight/2 + 30 : -170;
        const titleText = this.add.text(0, titleY, 'Programming Quiz!', {
            fontFamily: 'Arial',
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: '#ffff00'
        }).setOrigin(0.5);
        this.quizContainer.add(titleText);
    }

    getQuizData() {
        // Get quiz data based on course topic
        const topic = this.courseTopic || 'python';
        let rawQuizData;
        
        switch (topic.toLowerCase()) {
            case 'python': rawQuizData = this.cache.json.get('pythonQuiz'); break;
            case 'java': rawQuizData = this.cache.json.get('javaQuiz'); break;
            case 'c': rawQuizData = this.cache.json.get('cQuiz'); break;
            case 'c++': rawQuizData = this.cache.json.get('cppQuiz'); break;
            case 'csharp': rawQuizData = this.cache.json.get('csharpQuiz'); break;
            case 'webdesign': rawQuizData = this.cache.json.get('webdesignQuiz'); break;
            default: rawQuizData = this.cache.json.get('pythonQuiz'); break;
        }
        
        if (!rawQuizData) {
            console.error(`No quiz data available for topic: ${topic}`);
            return null;
        }
        
        // Get questions based on current intensity level
        const intensityKey = `intensity${this.intensity}`;
        const intensityData = rawQuizData[intensityKey];
        
        if (!intensityData) {
            console.error(`No quiz data available for topic: ${topic} intensity: ${this.intensity}`);
            return null;
        }
        
        // For intensity 1, use only multiple choice questions
        // For intensity 2+, we can add other question types later
        let questions = [];
        
        if (intensityData.multipleChoice) {
            questions = [...intensityData.multipleChoice];
        }
        
        // Add other question types for higher intensities if they exist
        if (this.intensity >= 2 && intensityData.dragAndDrop) {
            questions = [...questions, ...intensityData.dragAndDrop];
        }
        
        if (this.intensity >= 3 && intensityData.codeArrangement) {
            questions = [...questions, ...intensityData.codeArrangement];
        }
        
        if (questions.length === 0) {
            console.error(`No questions found for topic: ${topic} intensity: ${this.intensity}`);
            return null;
        }
        
        // Convert to expected format for compatibility
        return {
            questions: questions.map(q => ({
                question: q.question,
                options: q.options,
                correct: q.correctIndex || q.correct || 0
            }))
        };
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
        // Get device-responsive positioning
        const isMobile = this.scale.width < 768;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Position result text above the center on mobile, below center on desktop
        const resultY = isMobile ? centerY - 100 : centerY + 150;
        
        // Create result overlay
        const resultText = this.add.text(centerX, resultY, 
            isCorrect ? 'CORRECT! +100 Score, +10 Seconds!' : 'WRONG ANSWER!', {
            fontFamily: 'Arial',
            fontSize: isMobile ? '24px' : '28px',
            fontWeight: 'bold',
            color: isCorrect ? '#00ff00' : '#ff0000',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
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
        
        // Play explosion sound effect
        this.sound.play('se_explosion', { volume: 0.4 });
        
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

    destroyPowerUp(powerUp) {
        if (!powerUp) return;
        
        // Remove power-up from array
        const powerUpIndex = this.powerUps.indexOf(powerUp);
        if (powerUpIndex > -1) {
            this.powerUps.splice(powerUpIndex, 1);
        }
        
        // Destroy power-up sprites and stop any ongoing animations
        if (powerUp.sprite) {
            this.tweens.killTweensOf(powerUp.sprite);
            powerUp.sprite.destroy();
        }
        if (powerUp.glow) {
            this.tweens.killTweensOf(powerUp.glow);
            powerUp.glow.destroy();
        }
        
        // Remove from sprite array
        this.powerUpSprites = this.powerUpSprites.filter(sprite => {
            if (sprite === powerUp.sprite || sprite === powerUp.glow) {
                return false; // Remove this sprite
            }
            // Also remove any destroyed/invalid sprites
            if (!sprite || !sprite.scene) {
                return false;
            }
            return true;
        });
        
        // Create collection effect
        this.createPowerUpCollectEffect(powerUp.worldX, powerUp.worldY);
        
        console.log(`Power-up collected! Remaining power-ups: ${this.powerUps.length}`);
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

    createPowerUpCollectEffect(x, y) {
        // Create golden sparkle particles
        for (let i = 0; i < 12; i++) {
            const particle = this.add.circle(x, y, 4, 0xFFD700, 0.9);
            particle.setDepth(15);
            
            const angle = (i / 12) * Math.PI * 2;
            const distance = 20 + Math.random() * 15;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 0.1,
                duration: 600,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        // Create upward floating star
        const star = this.add.text(x, y, '✨', {
            fontSize: '24px',
            fontFamily: 'Arial'
        });
        star.setOrigin(0.5);
        star.setDepth(15);
        
        this.tweens.add({
            targets: star,
            y: y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 800,
            ease: 'Power2',
            onComplete: () => star.destroy()
        });
    }

    activatePowerUp(powerUpId) {
        console.log(`Activating power-up: ${powerUpId}`);
        
        switch (powerUpId) {
            case 'streakProtection':
                this.activePowerUps.streakProtection = true;
                break;
            case 'goblinImmunity':
                this.activePowerUps.goblinImmunityReady = true;
                console.log('Goblin Ward selected! Answer correctly to activate immunity.');
                break;
            case 'speedBoost':
                this.activePowerUps.speedBoost = true;
                this.updatePlayerSpeed();
                break;
        }
    }

    applyPowerUpEffect(powerUpId) {
        this.activatePowerUp(powerUpId);
    }

    updatePlayerSpeed() {
        if (this.activePowerUps.speedBoost) {
            // Calculate speed based on current streak (max 2x speed)
            const speedMultiplier = Math.min(1 + (this.streak * 0.2), 2.0);
            this.player.speed = this.originalPlayerSpeed * speedMultiplier;
            console.log(`Player speed updated: ${this.player.speed} (${speedMultiplier}x multiplier based on ${this.streak} streak)`);
        } else {
            this.player.speed = this.originalPlayerSpeed;
        }
    }

    showPowerUpNotification(powerUp) {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        const notificationText = `${powerUp.icon} ${powerUp.name} Activated!`;
        const notification = this.add.text(centerX, centerY, notificationText, {
            fontSize: '20px',
            fill: '#FFD700',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        });
        notification.setOrigin(0.5);
        notification.setDepth(20);
        
        // Animate notification
        this.tweens.add({
            targets: notification,
            y: centerY - 50,
            alpha: 0,
            scale: 1.2,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => notification.destroy()
        });
    }

    spawnNewEnemy() {
        // Find a random empty position
        const enemyTypes = ['goblinProfessor', 'goblinHacker', 'goblinBully'];
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
        // Safety check - ensure camera exists before trying to use it
        if (!this.cameras || !this.cameras.main) {
            console.warn('Camera not yet initialized, skipping setupCamera');
            return;
        }

        const boardWidth = this.MAP_WIDTH * this.TILE_SIZE;
        const boardHeight = this.MAP_HEIGHT * this.TILE_SIZE;
        const boardCenterX = this.boardOffsetX + boardWidth / 2;
        const boardCenterY = this.boardOffsetY + boardHeight / 2;

        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        const isSmallMobile = screenWidth < 480;

        // --- Stronger zoom for all devices ---
        let hudHeight;
        let paddingFactor, minZoom, maxZoom;
        if (isSmallMobile) {
            hudHeight = 45;
            paddingFactor = 0.98;
            minZoom = 1.5; // was 1.2
            maxZoom = 3.0;
        } else if (isMobile) {
            hudHeight = 50;
            paddingFactor = 0.95;
            minZoom = 1.5; // was 1.0
            maxZoom = 3.0; // was 2.5
        } else {
            // Desktop: use mobile-like zoom and HUD height!
            hudHeight = 50;
            paddingFactor = 0.95;
            minZoom = 2.5; // was 1.0
            maxZoom = 4.0; // was 2.5
        }
        const availableHeight = screenHeight - hudHeight;

        const zoomX = (screenWidth * paddingFactor) / boardWidth;
        const zoomY = (availableHeight * paddingFactor) / boardHeight;
        let zoom = Math.min(zoomX, zoomY);

        zoom = Math.max(minZoom, Math.min(zoom, maxZoom));
        this.cameras.main.setZoom(zoom);
    
        // Set up camera bounds to keep it within the game board area with some padding
        const padding = this.TILE_SIZE;
        this.cameras.main.setBounds(
            this.boardOffsetX - padding,
            this.boardOffsetY - padding,
            boardWidth + (padding * 2),
            boardHeight + (padding * 2)
        );
    
        // Camera follow
        if (this.playerSprite) {
            const followSpeed = isMobile ? 0.15 : 0.15; // same for all
            this.cameras.main.startFollow(this.playerSprite, true, followSpeed, followSpeed);

            // Center the camera vertically (HUD is now smaller)
            const offsetY = -hudHeight / (6 * zoom);
            this.cameras.main.setFollowOffset(0, offsetY);

            // Deadzone
            const deadzoneWidth = this.TILE_SIZE * 1.5;
            const deadzoneHeight = this.TILE_SIZE * 1.5;
            this.cameras.main.setDeadzone(deadzoneWidth, deadzoneHeight);
        }
    
        this.currentZoom = zoom;
        this.isMobileDevice = isMobile;
        this.isSmallMobileDevice = isSmallMobile;
    
        console.log(`Device: ${isSmallMobile ? 'SmallMobile' : isMobile ? 'Mobile' : 'Desktop'}, Board: ${boardWidth}x${boardHeight}, Screen: ${screenWidth}x${availableHeight}, Zoom: ${zoom.toFixed(2)}, Follow: enabled`);
        
        // Update HUD positions after camera setup
        this.updateHudPositions();
    }

    addCourseDisplay() {
        // Add stylized course topic display in the top-right corner
        if (this.courseTopic) {
            const courseDisplayName = this.getFormattedCourseName(this.courseTopic);
            
            // Enhanced mobile-responsive positioning and styling
            const isMobile = this.scale.width < 768;
            const isSmallMobile = this.scale.width < 480;
            
            let fontSize, strokeThickness, courseX, courseY;
            if (isSmallMobile) {
                fontSize = '16px';
                strokeThickness = 3;
                courseX = this.scale.width - 15;
                courseY = 5; // Absolute top
            } else if (isMobile) {
                fontSize = '18px';
                strokeThickness = 3;
                courseX = this.scale.width - 20;
                courseY = 5; // Absolute top
            } else {
                fontSize = '20px';
                strokeThickness = 2;
                courseX = this.scale.width - 20;
                courseY = 30; // Original position for desktop
            }
            
            this.courseDisplay = this.add.text(courseX, courseY, courseDisplayName, {
                fontFamily: 'Arial',
                fontSize: fontSize,
                fontWeight: 'bold',
                color: '#00ffff', // Cyan color
                stroke: '#000080', // Dark blue stroke
                strokeThickness: strokeThickness,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000040',
                    blur: 4,
                    fill: true
                }
            });
            this.courseDisplay.setOrigin(1, 0);
            this.courseDisplay.setScrollFactor(0);
            this.courseDisplay.setDepth(100);
            
            // Add subtle glow effect to course name
            this.tweens.add({
                targets: this.courseDisplay,
                alpha: 0.7,
                duration: 1500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }
    }

    addMobileControlHint() {
        // Only show hint on mobile devices
        const isMobile = this.scale.width < 768;
        if (!isMobile) return;
        
        // Create mobile control hint
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height * 0.75; // Lower on screen
        
        const hintText = this.add.text(centerX, centerY, 'Tap anywhere to move in that direction', {
            fontFamily: 'Arial',
            fontSize: this.scale.width < 480 ? '16px' : '18px',
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000040',
                blur: 2,
                fill: true
            },
            align: 'center'
        });
        
        hintText.setOrigin(0.5);
        hintText.setScrollFactor(0);
        hintText.setDepth(1000);
        hintText.setAlpha(0);
        
        // Animate hint in and out
        this.tweens.add({
            targets: hintText,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            yoyo: false,
            onComplete: () => {
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: hintText,
                        alpha: 0,
                        duration: 1000,
                        ease: 'Power2',
                        onComplete: () => {
                            hintText.destroy();
                        }
                    });
                });
            }
        });
    }

    handlePointerInput(pointer) {
        // Add click feedback for both mobile and PC
        this.createClickFeedback(pointer.worldX, pointer.worldY);
        
        // Skip if quiz is active or game hasn't started
        if (this.quizActive || !this.gameStarted) {
            return;
        }
        
        // Get world position of pointer (accounting for camera zoom)
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        
        // Calculate direction from player to pointer
        const deltaX = worldX - this.player.x;
        const deltaY = worldY - this.player.y;
        
        // Enhanced touch sensitivity for mobile
        const isMobile = this.scale.width < 768;
        const minDistance = isMobile ? 20 : 10; // Larger minimum distance for mobile
        
        // Normalize direction for 8-directional movement
        const direction = this.get8DirectionalMovement(deltaX, deltaY, minDistance);
        
        if (direction.x !== 0 || direction.y !== 0) {
            this.movePlayer(direction.x, direction.y);
            // Play movement sound feedback
            this.playClickSound();
        } else {
            // Play invalid click sound for clicks that don't result in movement
            this.playInvalidClickSound();
        }
    }

    get8DirectionalMovement(deltaX, deltaY, minDistance = 10) {
        // Convert any direction into one of 8 cardinal/diagonal directions
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        // If movement is too small, ignore it (dynamic threshold for mobile)
        if (absX < minDistance && absY < minDistance) {
            return { x: 0, y: 0 };
        }
        
        let x = 0, y = 0;
        
        // Determine horizontal direction
        if (deltaX > minDistance) x = 1;
        else if (deltaX < -minDistance) x = -1;
        
        // Determine vertical direction  
        if (deltaY > minDistance) y = 1;
        else if (deltaY < -minDistance) y = -1;
        
        return { x, y };
    }

    createClickFeedback(worldX, worldY) {
        // Create visual feedback at click/touch position
        const isMobile = this.scale.width < 768;
        
        // Create ripple effect
        const ripple = this.add.circle(worldX, worldY, 0, 0xffffff, 0.6);
        ripple.setDepth(1000); // High depth to appear above everything
        
        // Create expanding ripple animation
        this.tweens.add({
            targets: ripple,
            radius: isMobile ? 30 : 20, // Larger ripple on mobile
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                ripple.destroy();
            }
        });
        
        // Create inner pulse effect
        const pulse = this.add.circle(worldX, worldY, isMobile ? 15 : 10, 0x00ffff, 0.8);
        pulse.setDepth(1001);
        
        this.tweens.add({
            targets: pulse,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                pulse.destroy();
            }
        });
        
        // Add sparkle particles for extra feedback
        const numSparkles = isMobile ? 6 : 4;
        for (let i = 0; i < numSparkles; i++) {
            const angle = (Math.PI * 2 * i) / numSparkles;
            const distance = isMobile ? 25 : 20;
            const sparkleX = worldX + Math.cos(angle) * distance;
            const sparkleY = worldY + Math.sin(angle) * distance;
            
            const sparkle = this.add.circle(sparkleX, sparkleY, 3, 0xffff00, 1);
            sparkle.setDepth(1002);
            
            this.tweens.add({
                targets: sparkle,
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: 400,
                delay: i * 50,
                ease: 'Power2',
                onComplete: () => {
                    sparkle.destroy();
                }
            });
        }
    }

    playClickSound() {
        // Play a subtle click sound for valid movements
        if (this.sound && this.sound.get('se_select')) {
            this.sound.play('se_select', { volume: 0.3 });
        }
    }

    playInvalidClickSound() {
        // Play a different sound for invalid clicks (optional, softer)
        if (this.sound && this.sound.get('se_select')) {
            this.sound.play('se_select', { volume: 0.15, rate: 0.8 }); // Lower volume and pitch
        }
    }

    createKeyboardFeedback(directionX, directionY) {
        // Create directional arrow feedback for keyboard input
        const playerX = this.playerSprite.x;
        const playerY = this.playerSprite.y;
        
        // Calculate target position for visual indicator
        const targetX = playerX + (directionX * this.TILE_SIZE * 0.7);
        const targetY = playerY + (directionY * this.TILE_SIZE * 0.7);
        
        // Create directional arrow
        const arrow = this.add.triangle(playerX, playerY, 0, -8, -6, 8, 6, 8, 0x00ff00, 0.8);
        arrow.setDepth(1000);
        
        // Rotate arrow to point in movement direction
        let angle = Math.atan2(directionY, directionX) + (Math.PI / 2);
        arrow.setRotation(angle);
        
        // Animate arrow moving in direction and fading
        this.tweens.add({
            targets: arrow,
            x: targetX,
            y: targetY,
            alpha: 0,
            duration: 250,
            ease: 'Power2',
            onComplete: () => {
                arrow.destroy();
            }
        });
        
        // Add pulse effect at player position
        const pulse = this.add.circle(playerX, playerY, 20, 0x00ff00, 0.3);
        pulse.setDepth(999);
        
        this.tweens.add({
            targets: pulse,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                pulse.destroy();
            }
        });
    }

    update(time, delta) {
        // Always handle keyboard input and player glow
        this.handleKeyboardInput();

        // Update player glow position
        if (this.playerGlow) {
            this.playerGlow.setPosition(this.playerSprite.x, this.playerSprite.y);
        }

        // --- Always update HUD positions to follow camera ---
        this.updateHudPositions();

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
        
        // Update goblinThug spawning with indicators
        this.goblinThugSpawnTimer += delta;
        
        // Show spawn indicators 1 second before spawning
        if (this.goblinThugSpawnTimer >= this.goblinThugSpawnInterval - this.spawnIndicatorDelay && 
            this.spawnIndicators.length === 0) {
            this.showSpawnIndicators();
        }
        
        // Spawn thugs at full interval
        if (this.goblinThugSpawnTimer >= this.goblinThugSpawnInterval) {
            this.spawnGoblinThugs();
            this.goblinThugSpawnTimer = 0;
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
            // Create visual feedback at player position for keyboard input
            this.createKeyboardFeedback(moveX, moveY);
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
            // Play invalid move sound for boundary collision
            this.playInvalidClickSound();
            return; // Can't move outside map
        }
        
        // Check for enemy collision at target position
        if (this.checkEnemyCollision(targetX, targetY)) {
            // Play invalid move sound for enemy collision
            this.playInvalidClickSound();
            return; // Handle enemy collision and don't move
        }
        
        // Play successful movement sound
        this.playClickSound();
        
        // Check for power-up collision at target position
        this.checkPowerUpCollision(targetX, targetY);
        
        // Check for timer icon collision at target position
        this.checkTimerIconCollision(targetX, targetY);
        
        // Check for goblin thug collision at target position
        this.checkGoblinThugCollision(targetX, targetY);
        
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

    showResultScreen(courseCompleted = false) {
        // Prepare data for ResultScreen
        const resultData = {
            correctAnswers: this.correctAnswers,
            wrongAnswers: this.wrongAnswers,
            highestStreak: this.highestStreak,
            totalScore: this.score,
            courseTopic: this.courseTopic,
            courseCompleted: courseCompleted,
            intensity3CorrectAnswers: this.intensity3CorrectAnswers,
            startTime: this.sessionStartTime
        };
        
        console.log('Checking for existing student information...');
        
        // Check if student information already exists from intro
        const studentInfo = localStorage.getItem('studentInfo');
        
        if (studentInfo) {
            try {
                const parsedStudentInfo = JSON.parse(studentInfo);
                console.log('Found existing student info, going directly to ResultScreen:', parsedStudentInfo);
                
                // Add student info to result data
                resultData.studentName = `${parsedStudentInfo.firstName} ${parsedStudentInfo.lastName}`;
                resultData.firstName = parsedStudentInfo.firstName;
                resultData.lastName = parsedStudentInfo.lastName;
                resultData.department = parsedStudentInfo.department;
                resultData.strandYear = parsedStudentInfo.strandYear;
                
                // Go directly to ResultScreen since we have student info
                this.scene.start('ResultScreen', resultData);
                
                // Also upload the data to Firebase in the background
                this.uploadGameplayDataInBackground(resultData);
                
            } catch (error) {
                console.error('Error parsing student info, falling back to DataCollectionScreen:', error);
                // Fall back to DataCollectionScreen if parsing fails
                this.scene.start('DataCollectionScreen', resultData);
            }
        } else {
            console.log('No existing student info found, showing DataCollectionScreen');
            // No student info found, show DataCollectionScreen as before
            this.scene.start('DataCollectionScreen', resultData);
        }
    }

    async uploadGameplayDataInBackground(resultData) {
        try {
            console.log('Uploading gameplay data in background...');
            
            // Get student data from localStorage (same way authService stores it)
            let studentId = 'unknown';
            let currentUser = null;
            
            try {
                const userDataStr = localStorage.getItem('sci_high_user');
                if (userDataStr) {
                    currentUser = JSON.parse(userDataStr);
                    studentId = currentUser.studentId || currentUser.uid || 'unknown';
                }
            } catch (e) {
                console.warn('Could not parse user data from localStorage:', e);
            }
            
            // Prepare gameplay data for upload (similar to DataCollectionScreen)
            const gameplayData = {
                studentId: studentId,
                studentName: resultData.studentName,
                firstName: resultData.firstName,
                lastName: resultData.lastName,
                department: resultData.department,
                strandYear: resultData.strandYear,
                courseTopic: resultData.courseTopic,
                sessionData: {
                    courseTopic: resultData.courseTopic,
                    correctAnswers: resultData.correctAnswers,
                    wrongAnswers: resultData.wrongAnswers,
                    highestStreak: resultData.highestStreak,
                    totalScore: resultData.totalScore,
                    intensity3CorrectAnswers: resultData.intensity3CorrectAnswers || 0,
                    courseCompleted: resultData.courseCompleted,
                    sessionDuration: Date.now() - (resultData.startTime || Date.now()),
                    timestamp: new Date().toISOString(),
                    accuracyPercentage: resultData.correctAnswers + resultData.wrongAnswers > 0 ? 
                        ((resultData.correctAnswers / (resultData.correctAnswers + resultData.wrongAnswers)) * 100).toFixed(1) : 0
                }
            };
            
            console.log('Background upload - Prepared gameplay data:', gameplayData);
            
            // Ensure Firebase is initialized
            await this.ensureFirebaseInitialized();
            
            // Upload to Firebase
            if (this.database) {
                const gameplayRef = this.database.ref('gameplay_data');
                const result = await gameplayRef.push(gameplayData);
                console.log('Background gameplay data upload successful:', result.key);
                
                // Also update career stats if available
                try {
                    const { default: careerStatsService } = await import('../../services/careerStatsService.js');
                    await careerStatsService.updateCareerStats(
                        gameplayData.studentId, 
                        resultData.studentName,
                        gameplayData.sessionData,
                        {
                            firstName: resultData.firstName,
                            lastName: resultData.lastName,
                            department: resultData.department,
                            strandYear: resultData.strandYear
                        }
                    );
                    console.log('Background career stats update successful');
                } catch (careerError) {
                    console.warn('Background career stats update failed:', careerError.message);
                }
            } else {
                console.warn('Firebase database not available for background upload');
            }
            
        } catch (error) {
            console.error('Background gameplay data upload failed:', error);
            // Don't throw error since this is background operation
        }
    }

    async ensureFirebaseInitialized() {
        if (this.isFirebaseInitialized) {
            return true;
        }
        
        if (!this.initializationPromise) {
            this.initializationPromise = this.initializeFirebase();
        }
        
        try {
            await this.initializationPromise;
            return this.isFirebaseInitialized;
        } catch (error) {
            console.warn('Firebase initialization failed:', error.message);
            return false;
        }
    }

    async initializeFirebase() {
        try {
            console.log('Starting Firebase initialization for MainGameplay...');
            
            // Firebase config (same as DataCollectionScreen)
            const firebaseConfig = {
                apiKey: "AIzaSyD-Q2woACHgMCTVwd6aX-IUzLovE0ux-28",
                authDomain: "sci-high-website.firebaseapp.com",
                databaseURL: "https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app",
                projectId: "sci-high-website",
                storageBucket: "sci-high-website.appspot.com",
                messagingSenderId: "451463202515",
                appId: "1:451463202515:web:e7f9c7bf69c04c685ef626"
            };
            
            // First check if we have internet connectivity
            if (!navigator.onLine) {
                throw new Error('No internet connection detected');
            }
            
            // Check if Firebase is already loaded
            if (typeof window.firebase === 'undefined') {
                console.log('Loading Firebase scripts...');
                await this.loadFirebaseScripts();
            }
            
            // Wait a bit for Firebase to be available
            let retries = 0;
            while (typeof window.firebase === 'undefined' && retries < 10) {
                console.log(`Waiting for Firebase to load... (attempt ${retries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 300));
                retries++;
            }
            
            if (typeof window.firebase === 'undefined') {
                throw new Error('Firebase failed to load after multiple attempts - check your internet connection');
            }
            
            // Initialize Firebase app if not already done
            if (!window.firebase.apps.length) {
                console.log('Initializing Firebase app...');
                window.firebase.initializeApp(firebaseConfig);
            }
            
            // Test Firebase connection
            this.database = window.firebase.database();
            
            // Try a simple connection test
            await this.database.ref('.info/connected').once('value');
            
            this.isFirebaseInitialized = true;
            console.log('Firebase Database initialized successfully for MainGameplay');
        } catch (error) {
            console.error('Failed to initialize Firebase for MainGameplay:', error);
            this.isFirebaseInitialized = false;
            throw error;
        }
    }

    async loadFirebaseScripts() {
        return new Promise((resolve, reject) => {
            if (typeof window.firebase !== 'undefined') {
                resolve();
                return;
            }

            const scripts = [
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'
            ];
            
            let loaded = 0;
            const timeout = setTimeout(() => {
                reject(new Error('Firebase script loading timeout'));
            }, 10000);
            
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loaded++;
                    if (loaded === scripts.length) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };
                script.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error(`Failed to load Firebase script: ${src}`));
                };
                document.head.appendChild(script);
            });
        });
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