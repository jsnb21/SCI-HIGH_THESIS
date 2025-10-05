import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';
import { playExclusiveBGM, updateSoundVolumes } from '../../audioUtils.js';
import DomHudManager from '../../ui/DomHudManager.js';
import TimerController from '../../components/TimerController.js';

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
        // Freeze/timeout state
        this.freezeGameplay = false; // when true, block input and game loops
        this._timeUpHandled = false; // guard to handle timer expiry once
        
        // Course data
        this.courseTopic = null;
        
        // Score and streak system
        this.score = 0;
        this.streak = 0;
        this.highestStreak = 0;
        this.baseScore = 100;
    // Phase 1: DOM HUD manager instance
    this._domHud = null;
        
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
        this.spawnIndicatorsShown = false; // Prevent repeated showSpawnIndicators calls
        
    // Timer system
    this.gameTimer = 60; // 1 minute in seconds
    this.timerText = null;
    this.timerEvent = null; // legacy field; TimerController now manages ticking
    this._timer = null; // TimerController instance
        
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
        
        // Answered questions tracking system - prevents question repetition (use arrays)
        this.answeredQuestions = {
            intensity1: {
                multipleChoice: []
            },
            intensity2: {
                multipleChoice: [],
                dragDrop: [],
                syntaxBlock: []
            },
            intensity3: {
                multipleChoice: [],
                codeArrangement: [],
                combined: [] // For combined cycling system across all types at intensity 3
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
            speedBoost: false,
            freezeOnCorrectReady: false // Next correct answer freezes a random enemy
        };
        this.originalPlayerSpeed = 200; // Store original speed for speed boost
        // Power-up cadence (popup every N correct answers)
        this.correctAnswersSincePowerUp = 0;

    this._resultShown = false; // guard to prevent duplicate result screens
    }

    init(data) {
        // Receive data from the computer lab scene
        this.courseTopic = data?.topic || 'python';
        // Inject custom quiz questions if provided (for topic 'custom')
        this.customQuiz = data?.customQuiz || null; // { ownerId, quizId, meta, questions }
        
        // Initialize/reset timer system - ONLY if not resuming from quiz
        if (!data?.gameState) {
            this.gameTimer = 60; // Reset to 1 minute for new session
            this.countdownTimer = 3; // Reset countdown
            this.gameStarted = false; // Reset game started flag
            this.score = 0; // Reset score
            this.quizActive = false; // Reset quiz state
            this.powerUpActive = false; // Reset power-up state
            this.currentQuiz = null;
            this.isMoving = false; // Reset movement state
            
            // Reset all freezing flags for clean scene reentry
            this.freezeGameplay = false;
            this.enemiesMoving = false;
            this._timeUpHandled = false;
            this._resultShown = false;
            // Reset custom quiz answered tracking if custom quiz session
            if (this.customQuiz) {
                this.customQuizAnswered = new Set();
            }
            
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
            
            // Reset answered questions tracking for new sessions (use arrays)
            this.answeredQuestions = {
                intensity1: {
                    multipleChoice: []
                },
                intensity2: {
                    multipleChoice: [],
                    dragDrop: [],
                    syntaxBlock: []
                },
                intensity3: {
                    multipleChoice: [],
                    codeArrangement: [],
                    combined: [] // For combined cycling system
                }
            };
            
            // Always reset power-up system for new sessions
            this.activePowerUps = {
                streakProtection: false,
                goblinImmunityReady: false,
                goblinImmunityActive: false,
                speedBoost: false,
                freezeOnCorrectReady: false
            };
            this.player.speed = this.originalPlayerSpeed;
            // Reset power-up cadence counter
            this.correctAnswersSincePowerUp = 0;

            // Also reset PowerUpScene's level tracking so a fresh game starts at LVL 1
            try {
                const powerUpScene = this.scene.get('PowerUpScene');
                if (powerUpScene && typeof powerUpScene.resetPowerUpLevels === 'function') {
                    powerUpScene.resetPowerUpLevels();
                }
            } catch (_) { /* scene may not be available yet; ignore */ }
            
        } else {
            // Resuming from quiz - load saved state
            this.loadGameState(data.gameState);
        }
        
        // Track session start time
        this.sessionStartTime = Date.now();
        
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
            // Desktop / large screens: expand board to use height and a target width percentage
            const hudHeight = 60; // unified HUD height (+10px)
            const availableHeight = screenHeight - hudHeight - 20; // small bottom margin
            const tileSizeByHeight = availableHeight / this.MAP_HEIGHT;
            const targetWidthPortion = 0.9; // occupy 90% of screen width if possible
            const tileSizeByWidth = (screenWidth * targetWidthPortion) / this.MAP_WIDTH;
            baseTileSize = Math.min(tileSizeByHeight, tileSizeByWidth);
            // Allow a chunkier board on desktop so we can lean less on zoom for fill
            baseTileSize = Math.max(60, Math.min(baseTileSize, 110)); // expanded upper clamp
        }
        
        this.TILE_SIZE = Math.round(baseTileSize);
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
        
        // Load audio effects
        this.load.audio('se_hurt', 'assets/audio/se/se_hurt.wav');
        this.load.audio('se_combo', 'assets/audio/se/se_combo.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('se_correct', 'assets/audio/se/se_correct.wav');
        this.load.audio('se_explosion', 'assets/audio/se/se_explosion.wav');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_wrong', 'assets/audio/se/se_wrong.wav');
        this.load.audio('bgm_game1', 'assets/audio/bgm/bgm_game1.mp3');
        
        // Create a simple default tile for background texture
        this.load.image('defaultTile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    }

    create() {
        super.create(); // Call BaseScene create method
        // Phase 0: lightweight debug hooks (no behavior change)
        try {
            // eslint-disable-next-line global-require, import/no-unresolved
            const dbg = require('../../utils/debug.js');
            this.__DEBUG__ = dbg && dbg.DEBUG;
            this.__dlog__ = (scope, ...args) => (dbg && dbg.DEBUG && dbg.dlog ? dbg.dlog(scope, ...args) : null);
            if (this.__dlog__) this.__dlog__('Scene', 'create()', { topic: this.courseTopic });
        } catch (_) { /* ignore if module not present in build */ }
        
        // Reset all freezing/blocking flags to ensure fresh gameplay state
        this.freezeGameplay = false;
        this.enemiesMoving = false;
        this._timeUpHandled = false;
        this._resultShown = false;
        
        // Clear any old/conflicting student data to ensure fresh names
        this.clearOldStudentData();
        
        // Check and upload any pending scores from previous sessions
        this.checkAndUploadPendingScores();
        
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
        
    // Create score display (mobile / base HUD first)
    this.createScoreDisplay();

    // Initialize timer icons
    this.initializeTimerIcons();

    // Start countdown before game begins
    this.startCountdown();
        
        // Setup input controls
        this.setupInput();

    // Course topic is displayed in the DOM HUD; no Phaser text needed
        
        // Add mobile control hint
        this.addMobileControlHint();

        // Unified HUD (DOM for all devices) via DomHudManager
        this.time.delayedCall(0, () => {
            if (!this._domHud) this._domHud = new DomHudManager(this);
            this._domHud.init();
            // Optional: mirror element refs for compatibility with legacy code
            this.domHudActive = this._domHud.domHudActive;
            this.domScoreEl = this._domHud.domScoreEl;
            this.domStreakEl = this._domHud.domStreakEl;
            this.domTimerEl = this._domHud.domTimerEl;
            this.domCourseEl = this._domHud.domCourseEl;
            // Kick a sync on next frame after DOM is attached
            requestAnimationFrame(() => this.syncDomHud());
        });
        this.time.delayedCall(150, () => this.syncDomHud());
        
    // Add resize listener: lightweight handler that debounces heavy work
    this.scale.on('resize', this.onResizeEvent, this);
        if (this.__dlog__) this.__dlog__('Scene', 'resize listener attached');
    }

    onResize() {
        // Recreate background with new centering
        if (this.backgroundGroup) {
            this.backgroundGroup.destroy();
        }
        // Recalculate tile size on resize for consistent scaling
        this.setResponsiveTileSize();
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
        
        // Legacy desktopHudContainer no longer used; remove if exists
        if (this.desktopHudContainer) { this.desktopHudContainer.destroy(); this.desktopHudContainer = null; }

    // Always use DOM HUD; Phaser HUD texts are not used
    this.scoreText = null;
    this.streakText = null;
    this.timerText = null;
    this.courseDisplay = null;
    if (!this._domHud) this._domHud = new DomHudManager(this);
    this._domHud.init();
    // Ensure HUD text reflects current state after any DOM re-creation
    this.syncDomHud();
    // Rebind to canvas and update responsive sizes
    this.updateDomHudBounds();
        // Update HUD positions for responsive design (mobile or after recreation)
        this.updateHudPositions();
    }

    // Lightweight event handler for Phaser scale resize; coalesces frequent events
    onResizeEvent() {
        // Cancel any in-flight scheduled work
        if (this._resizeRaf) {
            try { cancelAnimationFrame(this._resizeRaf); } catch (_) {}
            this._resizeRaf = null;
        }
        if (this._resizeTimer) {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = null;
        }

        // Schedule on next animation frame for smoothness
        this._resizeRaf = requestAnimationFrame(() => {
            this._resizeRaf = null;
            // Minor debounce to coalesce rapid sequences
            this._resizeTimer = setTimeout(() => {
                this._resizeTimer = null;
                if (typeof this.onResize === 'function') this.onResize();
            }, 16); // ~1 frame at 60fps
        });
    }

    updateHudPositions() {
        // Legacy desktopHudContainer (deprecated path). Keep pinned if still present.
        if (this.desktopHudContainer) {
            this.desktopHudContainer.setPosition(0, 0);
            if (this.desktopHudBar && this.desktopHudBar.width !== this.scale.width) {
                this.desktopHudBar.width = this.scale.width;
            }
            // DOM HUD supersedes this; proceed no further
            return;
        }
        // DOM-only HUD: no Phaser HUD elements to reposition
        return;
    }

    createDesktopHUD() { /* deprecated: replaced by DOM HUD */ }

    ensureDomHud() { if (!this._domHud) this._domHud = new DomHudManager(this); this._domHud.init(); }

    updateDomHudBounds() { if (this._domHud) this._domHud.updateBounds(); }

    syncDomHud() {
        if (this._domHud) {
            const courseName = this.getFormattedCourseName(this.courseTopic).replace(/^[^A-Z0-9]*\s*/, '');
            this._domHud.sync({ score: this.score, streak: this.streak, seconds: this.gameTimer, course: courseName });
        }
    }

    // NEW: Explicitly remove / clean up DOM HUD elements (prevents lingering in other scenes on some mobile browsers)
    removeDomHud() { if (this._domHud) this._domHud.destroy(); }

    getCurrentTimeString() {
        // Always compute from numeric state so DOM HUD stays accurate even if Phaser text hidden
        const minutes = Math.floor(this.gameTimer / 60);
        const seconds = this.gameTimer % 60;
        return `${minutes}:${seconds.toString().padStart(2,'0')}`;
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
        
        // Unified mobile-style HUD height
    const hudHeight = 60; // +10px to match taller HUD bar
        
        const availableHeight = screenHeight - hudHeight;
        
    // Keep board nearer top (mobile style) with small gap
    const offsetX = Math.max(0, (screenWidth - boardWidth) / 2);
    const offsetY = hudHeight + 10;
        
        // Store offsets for later use
        this.boardOffsetX = offsetX;
        this.boardOffsetY = offsetY;
        
        
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
        
    }

    createPowerUps() {
        // Disabled: board-spawned power-ups are no longer used. Use popup cadence instead.
        // Clear any existing sprites leftover from older sessions
        this.powerUps = [];
        if (this.powerUpSprites) {
            this.powerUpSprites.forEach(sprite => sprite.destroy());
        }
        this.powerUpSprites = [];
    }

    spawnSinglePowerUp() {
        // Disabled: power-ups are no longer placed on the board
        return;
    }

    createTimer() {
        // DOM HUD only: don't create Phaser timer text
        this.timerText = null;
        // Don't start the timer event yet - will be started after countdown
        this.timerEvent = null;
        // Initialize TimerController (do not start here)
        this._initTimerController();
    }

    _initTimerController() {
        // Clean up any previous instance
        if (this._timer) {
            try { this._timer.destroy(); } catch (_) {}
            this._timer = null;
        }
    // Allow ticking during quizzes; still pause for power-up scenes and freezes
    const shouldTick = () => !!(this.gameStarted && !this.freezeGameplay && !this.powerUpActive);
        this._timer = new TimerController(this, {
            initial: this.gameTimer,
            cap: 60,
            shouldTick,
            onTick: (secs) => {
                // Mirror seconds to scene state for existing helpers/HUD
                this.gameTimer = secs;
                if (this.timerText && !this.domHudActive) {
                    const m = Math.floor(secs / 60);
                    const s = secs % 60;
                    this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
                }
                // Keep DOM HUD and color/shake behavior consistent
                if (typeof this.syncDomHud === 'function') this.syncDomHud();
                if (typeof this.updateTimerDisplay === 'function') this.updateTimerDisplay();
            },
            onExpired: () => {
                this.onTimerExpired();
            }
        });
    }

    createScoreDisplay() {
        // DOM HUD only: don't create Phaser score/streak texts
        this.scoreText = null;
        this.streakText = null;
    }

    getFormattedCourseName(topic) {
        // Return plain (emoji-free) stylized course names; visual icon now provided by comlab/icons assets
        const topicMap = {
            'python': 'PYTHON',
            'java': 'JAVA',
            'c': 'C LANG',
            'cpp': 'C++',
            'csharp': 'C#',
            'webdesign': 'WEB DESIGN',
            'javascript': 'JAVASCRIPT'
        };
        const key = topic?.toLowerCase();
        return topicMap[key] || (topic ? topic.toUpperCase() : 'PROGRAMMING');
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
        if (this.scoreText && !this.domHudActive) this.scoreText.setText(`Score: ${this.score}`);
        this.syncDomHud();
        
        // Add visual effect for score increase (Phaser HUD only)
        if (this.scoreText) {
            this.tweens.add({
                targets: this.scoreText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 200,
                ease: 'Power2',
                yoyo: true
            });
        }
    }

    updateTimer() {
        if (this.__dlog__) this.__dlog__('Timer', 'tick-guard', {
            gameStarted: this.gameStarted,
            freeze: this.freezeGameplay,
            quiz: this.quizActive,
            powerUp: this.powerUpActive
        });
        // Delegate to TimerController's ticking; if called directly, do a guarded sub
    // Keep ticking during quizzes; only stop when frozen or power-up popup is active
    if (!this.gameStarted || this.freezeGameplay || this.powerUpActive) return;
        if (this._timer) {
            this._timer.sub(1);
        }
    }

    onTimerExpired() {
        if (this.__dlog__) this.__dlog__('Timer', 'expired');
        // Prevent duplicate handling
        if (this._timeUpHandled) return;
        this._timeUpHandled = true;

        // Emit timer expired event for any listening scenes (like QuizScene)
        this.events.emit('timer-expired');

        // Stop the ticking timer (controller + legacy event if any)
        if (this._timer) this._timer.stop();
        if (this.timerEvent) { try { this.timerEvent.remove(); } catch (_) {} this.timerEvent = null; }

        // Freeze core gameplay systems (inputs/movement/spawns)
        this.freezeGameplay = true;
        this.enemiesMoving = false;

        // Stop any timer shake tween
        if (typeof this.stopTimerShake === 'function') this.stopTimerShake();

        // Show a centered "TIME'S UP!" overlay, then transition to results
        this.showTimesUpOverlay();
        this.time.delayedCall(1800, () => {
            this.showResultScreen(false); // Timer expired, not course completed
        });
    }

    startCountdown() {
        if (this.__dlog__) this.__dlog__('Countdown', 'start');
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
        if (this.__dlog__) this.__dlog__('Countdown', 'tick', { next: this.countdownTimer - 1 });
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
        if (this.__dlog__) this.__dlog__('Game', 'startGame');
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
        
        // Start the actual game timer (via TimerController; prevent duplicate events)
        if (!this._timer) this._initTimerController();
        this._timer.setSeconds(this.gameTimer);
        this._timer.start();
        if (this.__dlog__) this.__dlog__('Timer', 'controller started');
        
        // Mark game as started and ensure it's not frozen
        this.gameStarted = true;
        this.freezeGameplay = false;
        this.enemiesMoving = false; // Reset to allow enemy movement to start fresh
        this.syncDomHud();
        if (this.__dlog__) this.__dlog__('HUD', 'synced after start');
        
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
        // Use controller to handle cap/emit
        if (!this._timer) this._initTimerController();
        const gained = this._timer.add(seconds);
        this.gameTimer = this._timer.getSeconds();
        if (gained !== 0) this.animateTimeDelta(gained);
    }

    collectTimerIcon(icon) {
        // Play timer pickup sound
        this.sound.play('se_select', { volume: 0.8 });
        
        // Add 5 seconds to the timer (capped at 60 seconds)
        this.addTime(5);
        
            // Timer delta animation handled by addTime -> animateTimeDelta
            this.updateTimerDisplay();
            this.syncDomHud();

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
        let failedAttempts = 0;
        for (let i = 0; i < thugCount && failedAttempts < 10; i++) {
            const position = this.generateSpawnPosition();
            if (position) {
                this.nextSpawnPositions.push(position);
                this.createSpawnIndicator(position.x, position.y);
                failedAttempts = 0; // Reset failed attempts on success
            } else {
                failedAttempts++;
                i--; // Retry this iteration
            }
        }

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
                (this.enemies && this.enemies.some(enemy => enemy.tileX === spawnTileX && enemy.tileY === spawnTileY)) ||
                (this.timerIcons && this.timerIcons.some(icon => icon.tileX === spawnTileX && icon.tileY === spawnTileY)) ||
                (this.goblinThugs && this.goblinThugs.some(thug => thug.tileX === spawnTileX && thug.tileY === spawnTileY)) ||
                (this.nextSpawnPositions && this.nextSpawnPositions.some(pos => pos.x === spawnTileX && pos.y === spawnTileY))
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
        const playerTileX = Math.floor((this.player.x - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((this.player.y - this.boardOffsetY) / this.TILE_SIZE);
        this.nextSpawnPositions.forEach(position => {
            const thug = this.createGoblinThug(position.x, position.y);
            // If a thug spawns on the player's current tile, trigger immediate collision/damage
            if (thug && thug.tileX === playerTileX && thug.tileY === playerTileY) {
                this.handleGoblinThugCollision(thug);
            }
        });

        
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
        return goblinThug;
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
        // Check for goblin ward power-up
        if (this.activePowerUps.goblinWard && this.activePowerUps.goblinWard.active) {
            const level = this.activePowerUps.goblinWard.level;
            
            // Show ward notification
            this.showPowerUpNotification({
                icon: '🔆',
                name: `Goblin Ward LVL ${level}!`
            });
            
            // Level 2: Create explosion that removes nearby goblins
            if (level >= 2) {
                this.createGoblinExplosion(thug.x, thug.y);
            }
            
                // Level 3: Double player speed temporarily
                if (level >= 3) {
                    const originalSpeed = this.player.speed;
                    this.player.speed *= 2;
                    this.time.delayedCall(3000, () => {
                        this.player.speed = originalSpeed;
                    });
                    this.showSpeedBoostPopup('SPEED BOOST!');
                }            // Create golden shield effect
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
            
            // Deactivate ward after blocking one thug
            this.activePowerUps.goblinWard.active = false;
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
        
        // Reduce game timer and animate delta
    const before = this._timer ? this._timer.getSeconds() : this.gameTimer;
    const lost = this._timer ? this._timer.sub(this.goblinThugTimePenalty) : Math.min(before, this.goblinThugTimePenalty);
    this.gameTimer = this._timer ? this._timer.getSeconds() : Math.max(0, this.gameTimer - this.goblinThugTimePenalty);
        if (lost !== 0) this.animateTimeDelta(-lost);
        this.updateTimerDisplay();
        
        
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
            this.handleEnemyCollision(collidedEnemy);
            return true;
        }
        
        return false;
    }

    checkPowerUpCollision(worldX, worldY) {
        // Disabled: power-ups are no longer on the board
        return false;
        // Convert world coordinates to tile coordinates
        const playerTileX = Math.floor((worldX - this.boardOffsetX) / this.TILE_SIZE);
        const playerTileY = Math.floor((worldY - this.boardOffsetY) / this.TILE_SIZE);
        
        // Check if player is on the same tile as any power-up
        const collidedPowerUp = this.powerUps.find(powerUp => 
            powerUp.tileX === playerTileX && powerUp.tileY === playerTileY
        );
        
        if (collidedPowerUp) {
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
    // Reset reward guard so this question can grant rewards exactly once
    this.quizRewardApplied = false;
        
        // Launch quiz scene without pausing main scene (so timer continues)
        // Pass intensity level and answered questions tracker to determine quiz type and avoid repetition
        this.scene.launch('QuizScene', {
            courseTopic: this.courseTopic,
            enemyToDestroy: enemy,
            intensity: this.intensity,
            answeredQuestions: this.answeredQuestions,
            customQuiz: this.customQuiz || null,
            customQuizAnswered: this.customQuizAnswered ? Array.from(this.customQuizAnswered) : []
        });
    }

    handlePowerUpCollision(powerUp) {
        // Disabled: board collisions are not used anymore
        return;
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
        this.currentPowerUp = powerUp || null;
        
        // Pause the main scene to stop timer, enemy movement, and player movement
        this.scene.pause();
        
        // Launch power-up scene; no board item is required for popup-triggered selection
        this.scene.launch('PowerUpScene', {
            powerUpToCollect: this.currentPowerUp
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
    if (!this._timer) this._initTimerController();
    this._timer.setSeconds(this.gameTimer);
        this.gameStarted = gameState.gameStarted;
        
        // Update displays
        this.updateScoreDisplay();
        this.updateTimerDisplay();
        
        // Resume game
        this.quizActive = false;
    }

    handleQuizCompletion(data) {
        // Prevent double application if inline path already handled rewards
        if (this.quizRewardApplied) {
            // Still clean up enemy if provided
            if (data && data.enemyToDestroy) {
                this.destroyEnemy(data.enemyToDestroy);
            }
            this.quizActive = false;
            return;
        }
        // Initialize per-session bloom stats holder
        if (!this.sessionBloomStats) {
            this.sessionBloomStats = {
                remembering: { correct: 0, total: 0 },
                understanding: { correct: 0, total: 0 },
                applying: { correct: 0, total: 0 },
                analyzing: { correct: 0, total: 0 },
                evaluating: { correct: 0, total: 0 },
                creating: { correct: 0, total: 0 }
            };
        }
        if (data && data.bloomTarget) {
            const bt = data.bloomTarget;
            if (!this.sessionBloomStats[bt]) {
                this.sessionBloomStats[bt] = { correct: 0, total: 0 };
            }
            this.sessionBloomStats[bt].total += 1;
            if (data.correct) this.sessionBloomStats[bt].correct += 1;
        }
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
            // Increment cadence for power-up selection popup
            this.correctAnswersSincePowerUp++;
            
            // Track intensity 3 progress for course completion
            if (this.intensity === 3) {
                this.intensity3CorrectAnswers++;
                
                // Check if course is completed (10 correct answers in intensity 3)
                if (this.intensity3CorrectAnswers >= 10) {
                    this.showResultScreen(true); // Course completed
                    return;
                }
            }

            // Trigger power-up selection popup every 5 correct answers (global cadence)
            if (this.correctAnswersSincePowerUp >= 5) {
                this.correctAnswersSincePowerUp = 0; // reset cadence
                if (!this.powerUpActive && this.gameStarted && !this.freezeGameplay) {
                    this.startPowerUpScene(null);
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
            // Prevent duplicate reward application from any other path
            this.quizRewardApplied = true;
            
            // Play sound effect based on streak
            if (this.streak >= 3) {
                this.sound.play('se_combo', { volume: 0.8 }); // Combo sound for streaks 3+
            } else {
                this.sound.play('se_correct', { volume: 0.8 }); // Correct answer sound
            }
            
            
            // Update player speed if speed boost is active
            this.updatePlayerSpeed();
            
            // Activate goblin immunity if power-up is ready
            if (this.activePowerUps.goblinImmunityReady) {
                this.activePowerUps.goblinImmunityReady = false; // Consume the ready state
                this.activePowerUps.goblinImmunityActive = true; // Activate protection
                
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
            
            // Check for streak shield power-up
            if (this.activePowerUps.streakShield && this.activePowerUps.streakShield.active && this.streak > 0) {
                const level = this.activePowerUps.streakShield.level;
                
                // Level 1: Prevent streak from breaking
                this.showPowerUpNotification({
                    icon: '🛡️',
                    name: 'Streak Protected!'
                });
                
                // Level 2: Give +2 seconds bonus on wrong answer during streak
                if (level >= 2) {
                    this.addTime(2);
                }
                
                // Level 3: Give +50 points bonus on wrong answer during streak
                if (level >= 3) {
                    this.updateScore(50);
                }
                
                // Use streak shield (one-time use per activation)
                this.activePowerUps.streakShield.active = false;
            } else {
                // Reset streak on wrong answer
                this.streak = 0;
                
                // Reset goblin ward on wrong answer
                if (this.activePowerUps.goblinWard && this.activePowerUps.goblinWard.active) {
                    this.activePowerUps.goblinWard.active = false;
                }
            }
            
            this.updateStreakDisplay();
            // Prevent duplicate reward application from any other path
            this.quizRewardApplied = true;
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
            const arr = this.answeredQuestions[intensityKey]?.multipleChoice;
            if (arr && !arr.includes(questionId)) arr.push(questionId);
        } else if (intensity === 2) {
            // Syntax block only
            if (questionType === 'syntaxBlock' || questionData.type === 'syntaxBlock') {
                const arr = this.answeredQuestions[intensityKey]?.syntaxBlock;
                if (arr && !arr.includes(questionId)) arr.push(questionId);
            }
        } else if (intensity === 3) {
            // Code arrangement only
            if (questionType === 'codeArrangement' || questionData.isDragDrop || questionData.type === 'drag-and-drop') {
                const arr = this.answeredQuestions[intensityKey]?.codeArrangement;
                if (arr && !arr.includes(questionId)) arr.push(questionId);
                const combined = this.answeredQuestions[intensityKey]?.combined;
                if (combined && !combined.includes(questionId)) combined.push(questionId);
            }
        } else if (intensity >= 4) {
            // MAX intensity: track all in combined pool plus specific type
            const bucket = this.answeredQuestions.intensity4 || (this.answeredQuestions.intensity4 = { multipleChoice:[], syntaxBlock:[], codeArrangement:[], dragDrop:[], combined:[] });
            const pushUnique = (a) => { if (!a.includes(questionId)) a.push(questionId); };
            if (questionType === 'syntaxBlock') pushUnique(bucket.syntaxBlock);
            else if (questionType === 'codeArrangement') pushUnique(bucket.codeArrangement);
            else if (questionType === 'dragDrop') pushUnique(bucket.dragDrop);
            else pushUnique(bucket.multipleChoice);
            pushUnique(bucket.combined);
        }
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
        
        if (success && selectedPowerUp) {
            // Apply the selected power-up effect
            this.applyPowerUpEffect(selectedPowerUp.id);
            
            // Show activation notification
            this.showPowerUpNotification(selectedPowerUp);
            
            // Play confirmation sound
            this.sound.play('se_confirm', { volume: 0.6 });
            
        }
        
        // If a board power-up was involved, remove it; popup-triggered selection passes null
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
            if (this.streakText) this.tweens.killTweensOf(this.streakText);
            
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

    // Reset current streak and sync both Phaser and DOM HUDs
    resetStreak() {
        this.streak = 0;
        // Update Phaser HUD text via existing helper
        try { this.updateStreakDisplay(); } catch (_) {}
        // Update DOM HUD if active
        if (this.domHudActive && this.domStreakEl) {
            try { this.domStreakEl.textContent = 'Streak: 0'; } catch (_) {}
        }
        // Ensure unified HUD reflects latest values
        if (typeof this.syncDomHud === 'function') {
            try { this.syncDomHud(); } catch (_) {}
        }
    }

    // Reset all power-up related state so nothing carries to the next scene/session
    resetPowerUps() {
        try {
            // Flags and references
            this.powerUpActive = false;
            this.currentPowerUp = null;

            // Ensure container exists, then clear flags
            this.activePowerUps = this.activePowerUps || {};
            this.activePowerUps.streakProtection = false;
            this.activePowerUps.goblinImmunityReady = false;
            this.activePowerUps.goblinImmunityActive = false;

            // Structured/leveled power-ups
            if (this.activePowerUps.streakShield) {
                this.activePowerUps.streakShield.active = false;
                this.activePowerUps.streakShield = null;
            }
            if (this.activePowerUps.goblinWard) {
                this.activePowerUps.goblinWard.active = false;
                this.activePowerUps.goblinWard = null;
            }
            if (this.activePowerUps.swiftSteps) {
                this.activePowerUps.swiftSteps.active = false;
                this.activePowerUps.swiftSteps = null;
            }

            // Cadence/progression tied to power-ups
            this.correctAnswersSincePowerUp = 0;
            this.intensity3PowerUpCounter = 0;

            // Restore player speed baseline
            if (this.player) {
                const base = this.originalPlayerSpeed != null ? this.originalPlayerSpeed : 200;
                this.player.speed = base;
            }

            // Destroy lingering board power-up sprites
            if (Array.isArray(this.powerUpSprites)) {
                try {
                    this.powerUpSprites.forEach(s => {
                        try { if (this.tweens && this.tweens.killTweensOf && s) this.tweens.killTweensOf(s); } catch {}
                        if (s && s.destroy && !s.destroyed) s.destroy();
                    });
                } finally {
                    this.powerUpSprites = [];
                }
            }
            if (Array.isArray(this.powerUps)) {
                this.powerUps = [];
            }
        } catch (e) {
            console.warn('resetPowerUps encountered an issue:', e);
        }
    }

    addStreakShake(intensity, duration, delay) {
        // If Phaser streak text isn't present (DOM HUD only), skip tweening entirely
        if (!this.streakText) return;
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
                if (this.streakText) this.streakText.setPosition(originalX, originalY);
            }
        });
    }

    checkIntensityIncrease() {
        // Threshold logic reused; assume thresholds remain meaning of steps between intensities.
        if (this.correctAnswers >= this.intensityThreshold && this.intensity === 1) {
            // Move to intensity 2 (syntax block)
            this.intensity = 2;
            this.sound.play('se_combo', { volume: 0.7 });
            this.showIntensityNotification();
        } else if (this.correctAnswers >= this.intensityThreshold2 && this.intensity === 2) {
            // Move to intensity 3 (code arrangement)
            this.intensity = 3;
            this.sound.play('se_combo', { volume: 0.8 });
            this.showIntensityNotification();
        } else if (this.correctAnswers >= this.intensityThreshold2 + 5 && this.intensity === 3) {
            // Simple additional rule: after some extra correct answers escalate to MAX (4)
            this.intensity = 4;
            this.sound.play('se_combo', { volume: 0.9 });
            this.showIntensityNotification();
        }
    }

    showIntensityNotification() {
        // Create dramatic notification
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        let notificationText = '';
        if (this.intensity === 2) {
            notificationText = 'INTENSITY LEVEL 2\nSYNTAX CHECK MODE!';
        } else if (this.intensity === 3) {
            notificationText = 'INTENSITY LEVEL 3\nCODE ARRANGEMENT MODE!';
        } else if (this.intensity >= 4) {
            notificationText = 'MAX INTENSITY\nALL QUESTION TYPES!';
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

    // Display a dramatic camera-fixed TIME'S UP overlay
    showTimesUpOverlay() {
        // Dim the screen slightly
        const dim = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width * 2,
            this.scale.height * 2,
            0x000000,
            0.55
        ).setOrigin(0.5).setScrollFactor(0).setDepth(3000).setInteractive();

        // Big headline
        const title = this.add.text(this.scale.width / 2, this.scale.height / 2, "TIME'S UP!", {
            fontFamily: 'Arial',
            fontSize: this.scale.width < 768 ? '72px' : '96px',
            fontWeight: 'bold',
            color: '#ff5555',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 6, fill: true },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

        // Subtext
        const subtitle = this.add.text(this.scale.width / 2, this.scale.height / 2 + 80, 'Calculating your results…', {
            fontFamily: 'Arial',
            fontSize: this.scale.width < 768 ? '22px' : '26px',
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

        // Animate pop-in
        title.setScale(0.6);
        this.tweens.add({ targets: title, scale: 1.1, duration: 320, ease: 'Back.Out' });
        // Gentle pulse
        this.tweens.add({ targets: title, scale: 1.15, yoyo: true, duration: 500, repeat: -1, ease: 'Sine.inOut', delay: 340 });

        // Store refs in case we ever need cleanup (auto-destroyed on scene switch)
        this._timesUpDim = dim;
        this._timesUpTitle = title;
        this._timesUpSubtitle = subtitle;
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
        // Always update DOM HUD timer visuals via DomHudManager (centralized threshold coloring)
        if (this._domHud && this._domHud.domHudActive && typeof this._domHud.updateTimerVisual === 'function') {
            this._domHud.updateTimerVisual(this.gameTimer);
        }
    }

    startTimerShake() {
        // Prevent duplicate tweens
        if (!this.timerText) return;
        if (this.timerShake && this.timerShake.isPlaying()) return;
        const originalX = this.timerText.x;
        const originalY = this.timerText.y;
        this.timerShake = this.tweens.add({
            targets: this.timerText,
            x: originalX + 2,
            y: originalY,
            duration: 80,
            yoyo: true,
            repeat: -1
        });
    }

    stopTimerShake() {
        if (this.timerShake) {
            this.timerShake.stop();
            this.timerShake = null;
        }
    }

    // --- TIMER DELTA ANIMATIONS ---
    animateTimeDelta(delta) {
        // delta > 0 => gained time, delta < 0 => lost time
        const sign = delta > 0 ? '+' : '';
        const color = delta > 0 ? '#00ff66' : '#ff3333';
        const textStr = `${sign}${delta}s`;

        // Flash the timer itself green/red briefly for feedback
        const flashPhaserTimer = () => {
            if (!this.timerText) return;
            const originalColor = this.timerText.style.color || '#ffffff';
            // Set to green/red
            this.timerText.setColor(color);
            // Brief flash then revert using existing updateTimerDisplay for threshold color
            this.time.delayedCall(250, () => {
                try {
                    this.updateTimerDisplay();
                } catch (_) {
                    this.timerText.setColor(originalColor);
                }
            });
        };

        const flashDomTimer = () => {
            if (this._domHud && this._domHud.domHudActive && typeof this._domHud.flashTimerDelta === 'function') {
                this._domHud.flashTimerDelta(delta);
            }
        };

        // If DOM HUD is active (desktop), create a floating DOM element instead of Phaser text (since timerText is hidden)
        if (this._domHud && this._domHud.domHudActive && this._domHud.domTimerEl) {
            // DOM HUD: flash timer element color
            flashDomTimer();
            const label = document.createElement('div');
            label.textContent = textStr;
            Object.assign(label.style, {
                position: 'absolute',
                left: '50%',
                top: '54px', // just under the HUD bar
                transform: 'translateX(-50%)',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
                fontSize: '26px',
                color: color,
                textShadow: '2px 2px 4px #000',
                opacity: '1',
                pointerEvents: 'none',
                zIndex: '10000'
            });
            const parent = document.getElementById('desktop-game-hud')?.parentNode || document.body;
            parent.appendChild(label);

            // Simple JS animation (no Phaser tween for DOM element)
            const start = performance.now();
            const duration = 900;
            const startY = 54;
            const endY = 20; // float upward
            const animate = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const ease = 1 - Math.pow(1 - t, 3);
                const currentY = startY + (endY - startY) * ease;
                const currentScale = 1 + 0.3 * ease;
                label.style.top = currentY + 'px';
                label.style.transform = `translateX(-50%) scale(${currentScale})`;
                label.style.opacity = (1 - t).toString();
                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    label.remove();
                }
            };
            requestAnimationFrame(animate);
            return; // Skip Phaser-based floating text
        }

    // Phaser text fallback (mobile or when DOM HUD not active)
    flashPhaserTimer();
        const baseX = this.timerText ? this.timerText.x : this.scale.width / 2;
        // Place below timer so it doesn't overlap the digits, then rises past them
        const baseY = (this.timerText ? this.timerText.y : 30) + 42;
        const floatText = this.add.text(baseX, baseY, textStr, {
            fontFamily: 'Arial',
            fontSize: '30px',
            fontWeight: 'bold',
            color,
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1500);

        this.tweens.add({
            targets: floatText,
            y: baseY - 32,
            alpha: 0,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 900,
            ease: 'Power2.out',
            onComplete: () => floatText.destroy()
        });

        if (this.timerText) {
            this.flashTimerColor(color, 300);
            this.tweens.add({
                targets: this.timerText,
                scaleX: 1.25,
                scaleY: 1.25,
                yoyo: true,
                duration: 260,
                ease: 'Back.out'
            });
        }
    }

    flashTimerColor(color, duration=380) {
        if (!this.timerText || this.domHudActive) return; // DOM HUD uses its own style
        this.timerText.setColor(color);
        this.time.delayedCall(duration, () => {
            if (this.gameTimer <= 10) {
                this.timerText.setColor('#ff0000');
            } else if (this.gameTimer <= 30) {
                this.timerText.setColor('#ffff00');
            } else {
                this.timerText.setColor('#ffffff');
            }
        });
    }
    // --- END TIMER DELTA ANIMATIONS ---

    showQuizPopup(enemy) {
        this.quizActive = true;
        this.currentQuiz = enemy;
    // Reset reward guard for inline popup path
    this.quizRewardApplied = false;
        
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
        const isSmallMobile = this.scale.width < 500;

        // Dynamic dimensions with safe padding (compressed for very small heights)
        const maxPopupWidth = 640;
        const horizontalPadding = isMobile ? 20 : 40;
        const maxHeightAvailable = this.scale.height - (isMobile ? 60 : 120);
        const baseHeight = isMobile ? 440 : 420;
        let containerWidth = Math.min(maxPopupWidth, this.scale.width - horizontalPadding);
        let containerHeight = Math.min(baseHeight, maxHeightAvailable);

        // Apply further compression if still tall relative to viewport
        const heightRatio = containerHeight / this.scale.height;
        if (heightRatio > 0.8) {
            containerHeight = Math.floor(this.scale.height * 0.78);
        }

        // Font sizes adaptive
        let questionFontSize = isSmallMobile ? 15 : (isMobile ? 17 : 20);
        let answerFontSize = isSmallMobile ? 13 : (isMobile ? 15 : 16);
        let titleFontSize = isSmallMobile ? 18 : (isMobile ? 22 : 26);
        let buttonHeight = isSmallMobile ? 40 : (isMobile ? 46 : 54);
        let buttonSpacing = isSmallMobile ? 44 : (isMobile ? 50 : 60);

        // Additional squeeze for ultra narrow / short
        if (this.scale.height < 560) {
            questionFontSize -= 1; answerFontSize -= 1; titleFontSize -= 1; buttonHeight -= 2; buttonSpacing -= 4;
        }
        if (this.scale.height < 520) {
            questionFontSize -= 1; answerFontSize -= 1; buttonSpacing -= 4; containerHeight -= 20;
        }

        const wordWrapWidth = containerWidth - (isMobile ? 48 : 80);
        const maxAnswerWidth = containerWidth - (isMobile ? 64 : 120);

        // Reserve a max space for question; if it exceeds, we'll scroll it
        const reservedTop = (isMobile ? 140 : 150); // title+question approx
        const scrollAreaHeight = containerHeight - reservedTop - 30; // rest for answers
        
        // Create quiz container
        this.quizContainer = this.add.container(this.scale.width / 2, this.scale.height / 2);
        this.quizContainer.setDepth(2000);
        
        // Dim overlay behind popup (captures taps)
        const overlay = this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x000000, 0.55)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive();
        this.quizContainer.add(overlay);

        // Create quiz background (rounded look via graphics for nicer mobile feel)
        const quizBg = this.add.rectangle(0, 0, containerWidth, containerHeight, 0x0b1a2a, 0.92);
        quizBg.setStroke(0x4a90e2, 3);
        this.quizContainer.add(quizBg);

        // Subtle inner glow frame
        const innerFrame = this.add.rectangle(0, 0, containerWidth - 12, containerHeight - 12, 0x12283d, 0.95)
            .setStrokeStyle(2, 0x255d85, 0.8);
        this.quizContainer.add(innerFrame);
        
        // Title (top)
        const titleY = -containerHeight/2 + (isMobile ? 32 : 36);
        const titleText = this.add.text(0, titleY, 'Programming Quiz!', {
            fontFamily: 'Arial',
            fontSize: `${titleFontSize}px`,
            fontWeight: 'bold',
            color: '#ffff66',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX:1, offsetY:1, color:'#000000', blur:3, fill:true }
        }).setOrigin(0.5);
        this.quizContainer.add(titleText);

        // Question text block
        const questionY = titleY + (isMobile ? 40 : 50);
        const questionText = this.add.text(0, questionY, randomQuestion.question, {
            fontFamily: 'Arial',
            fontSize: `${questionFontSize}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: wordWrapWidth }
        }).setOrigin(0.5, 0.5);
        this.quizContainer.add(questionText);

        // If question taller than allowed slice, apply mask + allow touch scroll on question
        const maxQuestionHeight = isMobile ? 110 : 140;
        let questionScrollable = false;
        if (questionText.height > maxQuestionHeight) {
            const qMaskGfx = this.add.graphics();
            qMaskGfx.fillStyle(0xffffff, 0.0001);
            qMaskGfx.fillRect(-wordWrapWidth/2, questionY - maxQuestionHeight/2, wordWrapWidth, maxQuestionHeight);
            const qMask = qMaskGfx.createGeometryMask();
            questionText.setMask(qMask);
            questionScrollable = true;
            // Enable vertical drag on overlay for question region if pointer within bounds
            let qDragStartY = null; let qStartOffset = 0;
            const qUpper = questionY - maxQuestionHeight/2;
            const qLower = questionY + maxQuestionHeight/2;
            this.input.on('pointerdown', (p)=>{ if(p.y >= this.scale.height/2 + qUpper - containerHeight/2 && p.y <= this.scale.height/2 + qLower - containerHeight/2){ qDragStartY = p.y; qStartOffset = questionText.y; }});
            this.input.on('pointermove', (p)=>{ if(qDragStartY!==null){ const dy = p.y - qDragStartY; questionText.y = Phaser.Math.Clamp(qStartOffset + dy, questionY - (questionText.height - maxQuestionHeight)/2, questionY + (questionText.height - maxQuestionHeight)/2); }});
            this.input.on('pointerup', ()=>{ qDragStartY=null; });
        }

        // Scroll container for answer buttons (simulate by grouping and clipping via mask)
    const answersGroupY = questionY + (isMobile ? 60 : 70) + (questionScrollable ? (Math.min(questionText.height - maxQuestionHeight, 40)) : 0);
        const answersContainer = this.add.container(0, answersGroupY);
        this.quizContainer.add(answersContainer);

        // Add rectangular mask for scroll area
        const maskGfx = this.add.graphics();
        maskGfx.fillStyle(0xffffff, 0.0001);
        maskGfx.fillRect(-containerWidth/2 + 20, -scrollAreaHeight/2, containerWidth - 40, scrollAreaHeight);
        const answersMask = maskGfx.createGeometryMask();
        answersContainer.setMask(answersMask);
        
        // Create answer buttons
        const answers = randomQuestion.options;
        const correctAnswer = randomQuestion.correct;
        let cumulativeY = -scrollAreaHeight/2 + buttonHeight/2;
        const answerButtons = [];
        for (let i = 0; i < answers.length; i++) {
            const btnY = cumulativeY;
            const btnWidth = maxAnswerWidth;
            const answerBtn = this.add.rectangle(0, btnY, btnWidth, buttonHeight, 0x1f3347, 0.95)
                .setStrokeStyle(2, 0x4a90e2)
                .setInteractive({ useHandCursor: true });
            const label = `${String.fromCharCode(65 + i)}. ${answers[i]}`;
            const answerText = this.add.text(0, btnY, label, {
                fontFamily: 'Arial',
                fontSize: `${answerFontSize}px`,
                color: '#ffffff',
                align: 'left',
                wordWrap: { width: btnWidth - 30 }
            }).setOrigin(0.5);
            answersContainer.add(answerBtn);
            answersContainer.add(answerText);
            answerButtons.push({answerBtn, answerText});

            // Hover / press feedback (desktop only for hover)
            answerBtn.on('pointerover', () => { if (!isMobile) answerBtn.setFillStyle(0x2d4b63); });
            answerBtn.on('pointerout', () => { if (!isMobile) answerBtn.setFillStyle(0x1f3347); });
            answerBtn.on('pointerdown', () => {
                answerBtn.setFillStyle(0x356a8f);
                this.handleQuizAnswer(i, correctAnswer, enemy);
            });
            cumulativeY += buttonSpacing;
        }

        // Enable vertical scrolling for long lists (touch drag)
        let dragStartY = null;
        let containerStartY = 0;
        overlay.on('pointerdown', (p) => { dragStartY = p.y; containerStartY = answersContainer.y; });
        overlay.on('pointermove', (p) => {
            if (dragStartY !== null) {
                const delta = p.y - dragStartY;
                answersContainer.y = Phaser.Math.Clamp(containerStartY + delta, answersGroupY - 40, answersGroupY + 40);
            }
        });
        overlay.on('pointerup', () => { dragStartY = null; });
        overlay.on('pointerout', () => { dragStartY = null; });

        // Close button (optional for mobile)
        const closeBtnSize = isMobile ? 34 : 36;
        const closeBtn = this.add.rectangle(containerWidth/2 - closeBtnSize, -containerHeight/2 + closeBtnSize, closeBtnSize, closeBtnSize, 0x741111, 0.85)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(closeBtn.x, closeBtn.y, '✕', { fontFamily:'Arial', fontSize: isMobile ? '18px':'20px', color:'#ffffff' }).setOrigin(0.5);
        this.quizContainer.add(closeBtn);
        this.quizContainer.add(closeText);
        closeBtn.on('pointerdown', () => {
            this.closeQuizPopup();
            this.quizActive = false;
        });

        // Entrance animation
        this.quizContainer.setScale(0.8).setAlpha(0);
        this.tweens.add({
            targets: this.quizContainer,
            scale: 1,
            alpha: 1,
            duration: 280,
            ease: 'Back.Out'
        });
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
        
        // Unified guard to prevent duplicate rewards (e.g., with handleQuizCompletion)
        if (!this.quizRewardApplied) {
            this.quizRewardApplied = true;
            if (isCorrect) {
                // Minimal correct reward path mirrors handleQuizCompletion base reward
                const bonusScore = (this.streak > 0 ? (this.streak) * 50 : 0); // approximate streak bonus if already built
                this.streak++;
                if (this.streak > this.highestStreak) this.highestStreak = this.streak;
                this.updateScore(this.baseScore + bonusScore);
                this.addTime(10);
                this.updateTimerDisplay();
                this.updateStreakDisplay();
                // Sound
                if (this.streak >= 3) {
                    this.sound.play('se_combo', { volume: 0.8 });
                } else {
                    this.sound.play('se_correct', { volume: 0.8 });
                }
            } else {
                // Wrong answer path with streak protection respect
                this.sound.play('se_wrong', { volume: 0.8 });
                this.wrongAnswers++;
                if (this.activePowerUps.streakProtection) {
                    this.activePowerUps.streakProtection = false;
                    this.showPowerUpNotification({ icon: '🛡️', name: 'Streak Protected!' });
                    if (this.streakText) {
                        this.tweens.add({ targets: this.streakText, scale: 1.4, duration: 180, ease: 'Back.Out', yoyo: true });
                        this.streakText.setTint(0x2ecc71);
                        this.time.delayedCall(800, () => { if (this.streakText) this.streakText.clearTint(); });
                    }
                } else {
                    this.streak = 0;
                    // Cancel goblin immunity if active (mirrors main logic)
                    if (this.activePowerUps.goblinImmunityReady || this.activePowerUps.goblinImmunityActive) {
                        this.activePowerUps.goblinImmunityReady = false;
                        this.activePowerUps.goblinImmunityActive = false;
                    }
                }
                this.updateStreakDisplay();
            }
        }
        
        // Destroy enemy after quiz
        setTimeout(() => {
            this.destroyEnemy(enemy);
            this.closeQuizPopup();
        // Guard: avoid double reward application if inline path already processed
        if (this.quizRewardApplied) {
            // Still destroy enemy if provided and not yet removed
            if (data.enemyToDestroy) {
                this.destroyEnemy(data.enemyToDestroy);
            }
            this.quizActive = false;
            return;
        }
        this.quizRewardApplied = true;
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

    activatePowerUp(powerUpId, level = 1) {
        
        switch (powerUpId) {
            case 'streakShield':
                this.activePowerUps.streakShield = { active: true, level: level };
                break;
            case 'goblinWard':
                this.activePowerUps.goblinWard = { active: true, level: level };
                break;
            case 'swiftSteps':
                this.activePowerUps.swiftSteps = { active: true, level: level };
                this.updatePlayerSpeed();
                break;
        }
    }

    applyPowerUpEffect(powerUpId) {
        this.activatePowerUp(powerUpId);
    }

    updatePlayerSpeed() {
        let speedMultiplier = 1.0;
        
        if (this.activePowerUps.swiftSteps && this.activePowerUps.swiftSteps.active) {
            const level = this.activePowerUps.swiftSteps.level;
            
            switch (level) {
                case 1:
                    // Level 1: +5% base speed
                    speedMultiplier = 1.05;
                    break;
                case 2:
                    // Level 2: +15% total base speed (10% additional)
                    speedMultiplier = 1.15;
                    break;
                case 3:
                    // Level 3: Speed scales with streak (up to 25% bonus)
                    const streakBonus = Math.min(this.streak * 0.05, 0.25); // 5% per streak, max 25%
                    speedMultiplier = 1.0 + streakBonus;
                    break;
            }
        }
        
        this.player.speed = this.originalPlayerSpeed * speedMultiplier;
    }

    createGoblinExplosion(x, y) {
        // Create explosion effect
        const explosion = this.add.circle(x, y, this.TILE_SIZE * 0.3, 0xFF4444, 0.8);
        explosion.setDepth(20);
        
        // Animate explosion
        this.tweens.add({
            targets: explosion,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => explosion.destroy()
        });
        
        // Find and remove nearby goblins within explosion radius
        const explosionRadius = this.TILE_SIZE * 2.5;
        const nearbyGoblins = this.goblinThugs.filter(goblin => {
            const distance = Phaser.Math.Distance.Between(x, y, goblin.x, goblin.y);
            return distance <= explosionRadius;
        });
        
        // Remove nearby goblins
        nearbyGoblins.forEach(goblin => {
            this.removeGoblinThug(goblin);
        });
        
        // Show explosion notification if goblins were destroyed
        if (nearbyGoblins.length > 0) {
            this.showExplosionPopup(`EXPLOSION! ${nearbyGoblins.length} Goblins Destroyed!`);
        }
    }

    showScorePopup(text, x, y, color = '#ffffff') {
        const popup = this.add.text(x, y, text, {
            fontSize: '16px',
            fill: color,
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        });
        popup.setOrigin(0.5);
        popup.setDepth(25);
        
        // Animate popup
        this.tweens.add({
            targets: popup,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => popup.destroy()
        });
    }



    showSpeedBoostPopup(text) {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2 - 50;
        
        const popup = this.add.text(centerX, centerY, text, {
            fontSize: '26px',
            fill: '#ffff00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        popup.setOrigin(0.5);
        popup.setDepth(30);
        
        // Animate popup with bounce effect
        this.tweens.add({
            targets: popup,
            y: centerY - 80,
            scale: 1.5,
            alpha: 0,
            duration: 2500,
            ease: 'Bounce.easeOut',
            onComplete: () => popup.destroy()
        });
    }

    showExplosionPopup(text) {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        const popup = this.add.text(centerX, centerY, text, {
            fontSize: '22px',
            fill: '#ff4444',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        popup.setOrigin(0.5);
        popup.setDepth(30);
        
        // Animate popup with explosive effect
        this.tweens.add({
            targets: popup,
            y: centerY - 100,
            scale: 1.4,
            alpha: 0,
            duration: 2200,
            ease: 'Power3.easeOut',
            onComplete: () => popup.destroy()
        });
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

            // Add hazard avoidance scoring: penalize being near thugs or next spawn tiles
            score += this._hazardProximityPenalty(newTileX, newTileY);
            
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
        // Avoid hazard tiles: active goblin thugs or tiles flagged for next spawn
        if (this._isHazardTile(tileX, tileY)) {
            return false;
        }

        // Check if position is occupied by another enemy
        return !this.enemies.some(enemy => 
            enemy !== movingEnemy && enemy.tileX === tileX && enemy.tileY === tileY
        );
    }

    // Helpers: hazard detection and proximity penalty for enemy AI
    _isHazardTile(tileX, tileY) {
        // Active goblin thugs
        if (this.goblinThugs && this.goblinThugs.some(t => t.tileX === tileX && t.tileY === tileY)) return true;
        // Imminent spawn positions (from spawn indicators)
        if (this.nextSpawnPositions && this.nextSpawnPositions.some(p => p.x === tileX && p.y === tileY)) return true;
        return false;
    }

    _hazardProximityPenalty(tileX, tileY) {
        // Direct hazard: strong penalty (though isValidEnemyMove blocks exact hazard tiles)
        let penalty = this._isHazardTile(tileX, tileY) ? -200 : 0;
        const offsets1 = [ [1,0], [-1,0], [0,1], [0,-1] ];
        const offsets2 = [ [2,0], [-2,0], [0,2], [0,-2], [1,1], [1,-1], [-1,1], [-1,-1] ];
        const inBounds = (x,y)=> x>=0 && y>=0 && x<this.MAP_WIDTH && y<this.MAP_HEIGHT;
        const nearHazard = (offs) => offs.some(([dx,dy]) => {
            const x = tileX + dx, y = tileY + dy; return inBounds(x,y) && this._isHazardTile(x,y);
        });
        if (nearHazard(offsets1)) penalty -= 90; // ring 1
        if (nearHazard(offsets2)) penalty -= 45; // ring 2
        return penalty;
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
        
        // Calculate the center of the actual board based on our offsets
        const boardWidth = this.MAP_WIDTH * this.TILE_SIZE;
        const boardHeight = this.MAP_HEIGHT * this.TILE_SIZE;
        const boardCenterX = this.boardOffsetX + boardWidth / 2;
        const boardCenterY = this.boardOffsetY + boardHeight / 2;
        
        // Calculate zoom to ensure the board is visible with padding
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isMobile = screenWidth < 768;
        const isSmallMobile = screenWidth < 480; // Very small screens
        
        // Unified HUD height across all devices (mobile style)
    const hudHeight = 60; // +10px to match taller HUD bar
        const availableHeight = screenHeight - hudHeight;
        
        // Aggressive unified zoom strategy (Option A)
        // 1. Compute fit-based zoom with modest padding
        const paddingFactor = isSmallMobile ? 0.98 : 0.94; // slightly tighter than before
        const zoomX = (screenWidth * paddingFactor) / boardWidth;
        const zoomY = (availableHeight * paddingFactor) / boardHeight;
        let zoom = Math.min(zoomX, zoomY);

        // 2. Apply aggressive multiplier (desktop stronger)
        const aggressiveMultiplier = isMobile ? (isSmallMobile ? 1.15 : 1.18) : 1.32;
        zoom *= aggressiveMultiplier;

        // 3. Clamp within new bounds (initial clamp)
        const minZoom = isMobile ? (isSmallMobile ? 1.35 : 1.25) : 1.45;
        const maxZoom = 2.2; // cap to avoid excessive pixelation
        zoom = Phaser.Math.Clamp(zoom, minZoom, maxZoom);

        // 4. Additional tall portrait reduction (e.g., 1220x2712 devices). Make player see more field.
        const aspect = screenHeight / (screenWidth || 1);
        const TALL_MOBILE_ASPECT = 1.85; // threshold for tall phones
        const TALL_MOBILE_REDUCE = 0.88; // reduce by 12%
        if (isMobile && aspect > TALL_MOBILE_ASPECT) {
            zoom *= TALL_MOBILE_REDUCE;
            // Re-clamp but allow slightly below minZoom (down to 90% of min) so reduction applies
            const softMin = minZoom * 0.9;
            zoom = Phaser.Math.Clamp(zoom, softMin, maxZoom);
        }

        // 5. Universal zoom reduction (user request: "make the lesser zoom for all devices")
        // Apply a modest global reduction so every device sees a bit more of the board.
        // Tweak UNIVERSAL_ZOOM_REDUCE (0.90–0.95 typical range) if you want more/less field of view.
        const UNIVERSAL_ZOOM_REDUCE = 0.92; // current: reduce zoom by 8%
        zoom *= UNIVERSAL_ZOOM_REDUCE;
        // Allow zoom to dip further below the original min so the reduction isn't negated.
        const universalSoftMin = minZoom * 0.82; // permit extra headroom
        zoom = Phaser.Math.Clamp(zoom, universalSoftMin, maxZoom);

        this.cameras.main.setZoom(zoom);
        
        // Set up camera bounds to keep it within the game board area with some padding
        const padding = this.TILE_SIZE; // Add one tile worth of padding
        this.cameras.main.setBounds(
            this.boardOffsetX - padding, 
            this.boardOffsetY - padding, 
            boardWidth + (padding * 2), 
            boardHeight + (padding * 2)
        );
        
        // Set up smooth camera following for the player (single unified behavior)
        if (this.playerSprite) {
            const followSpeed = 0.16; // consistent smooth follow
            this.cameras.main.startFollow(this.playerSprite, true, followSpeed, followSpeed);
            // Remove upward offset so HUD stays fully visible at higher zoom
            this.cameras.main.setFollowOffset(0, 0);
            const deadzoneSize = this.TILE_SIZE * 1.5;
            this.cameras.main.setDeadzone(deadzoneSize, deadzoneSize);
        }
        
        // Store zoom level for other systems to use
        this.currentZoom = zoom;
        this.isMobileDevice = isMobile;
        this.isSmallMobileDevice = isSmallMobile;

        // Reposition HUD elements after zoom change if function exists
        if (typeof this.updateHudPositions === 'function') {
            this.updateHudPositions();
        }
        
    }

    addCourseDisplay() { /* DOM HUD shows course; Phaser text removed */ }

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
        // Skip if quiz is active, game hasn't started, or gameplay is frozen
        if (this.quizActive || !this.gameStarted || this.freezeGameplay) {
            return;
        }
        
        // Add click feedback for both mobile and PC
        this.createClickFeedback(pointer.worldX, pointer.worldY);
        
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
        
        // Only run game systems if the game has started and no quiz is active and not frozen
        if (!this.gameStarted || this.quizActive || this.freezeGameplay) {
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
            this.spawnIndicators.length === 0 && !this.spawnIndicatorsShown) {
            this.showSpawnIndicators();
            this.spawnIndicatorsShown = true;
        }
        
        // Spawn thugs at full interval
        if (this.goblinThugSpawnTimer >= this.goblinThugSpawnInterval) {
            this.spawnGoblinThugs();
            this.goblinThugSpawnTimer = 0;
            this.spawnIndicatorsShown = false; // Reset for next cycle
        }
    }

    handleKeyboardInput() {
        if (this.isMoving) return; // Prevent movement spam
        if (!this.gameStarted || this.quizActive || this.freezeGameplay) return; // Block when not in active play
        
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
        if (!this.gameStarted || this.quizActive || this.freezeGameplay) return;
        
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
        
    // Power-up tiles are no longer used; selection happens via popup cadence
        
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

    // Resolve canonical identifier for current user for Firebase keys
    resolveUserIdentifier(user) {
        const sanitizeKey = (s) => typeof s === 'string' ? s.replace(/[.#$\/\[\]]/g, '_') : s;
        if (!user) return 'unknown';
        const type = user.type || user.userType;
        if (type === 'general') {
            const email = user.email || (user.profile && user.profile.email);
            if (email) return sanitizeKey(String(email).toLowerCase());
            return sanitizeKey(user.uid || 'unknown');
        }
        if (type === 'student') {
            return user.studentId || sanitizeKey(user.uid || 'unknown');
        }
        return user.studentId || sanitizeKey(user.uid || 'unknown');
    }

    showResultScreen(courseCompleted = false) {
        if (this._resultShown) return; // prevent duplicate calls
        this._resultShown = true;
        // Stop timers to prevent background ticking during transition
        if (this._timer) this._timer.stop();
        if (this.timerEvent) { try { this.timerEvent.remove(); } catch (_) {} this.timerEvent = null; }
        if (this.countdownEvent) { try { this.countdownEvent.remove(); } catch (_) {} this.countdownEvent = null; }
        // Ensure streak does not carry over after gameplay ends
        if (typeof this.resetStreak === 'function') this.resetStreak();
        // Ensure power-ups and related cadence are cleared on exit
        if (typeof this.resetPowerUps === 'function') this.resetPowerUps();
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

        // Remove desktop DOM HUD (and reveal Phaser HUD again for other scenes) before switching
        this.removeDesktopHud();
        
        
        // PRIORITY 1: Check for fresh user input from current session (sci_high_user)
        let currentUserData = null;
        try {
            const userDataStr = localStorage.getItem('sci_high_user');
            if (userDataStr) {
                currentUserData = JSON.parse(userDataStr);
            }
        } catch (e) {
            console.error('Error parsing current user data:', e);
        }
        
        // PRIORITY 2: Check for stored student info (older format)
        let storedStudentInfo = null;
        try {
            const studentInfoStr = localStorage.getItem('studentInfo');
            if (studentInfoStr) {
                storedStudentInfo = JSON.parse(studentInfoStr);
            }
        } catch (e) {
            console.error('Error parsing stored student info:', e);
        }
        
        // DETERMINE BEST DATA SOURCE
        let finalStudentData = null;
        
        if (currentUserData && currentUserData.profile) {
            // Use current user data (most recent/fresh)
            finalStudentData = {
                studentName: currentUserData.profile.fullName || currentUserData.profile.displayName || 'Unknown User',
                firstName: currentUserData.profile.firstName || (currentUserData.profile.fullName ? currentUserData.profile.fullName.split(' ')[0] : 'Unknown'),
                lastName: currentUserData.profile.lastName || (currentUserData.profile.fullName ? currentUserData.profile.fullName.split(' ').slice(1).join(' ') : 'User'),
                fullName: currentUserData.profile.fullName || currentUserData.profile.displayName,
                department: currentUserData.profile.department || 'General',
                strandYear: currentUserData.profile.strandYear || 'N/A',
                studentId: currentUserData.studentId || currentUserData.uid || 'unknown'
            };
        } else if (storedStudentInfo) {
            // Fall back to stored student info
            finalStudentData = {
                studentName: storedStudentInfo.fullName || `${storedStudentInfo.firstName} ${storedStudentInfo.lastName}`,
                firstName: storedStudentInfo.firstName,
                lastName: storedStudentInfo.lastName,
                fullName: storedStudentInfo.fullName,
                department: storedStudentInfo.department,
                strandYear: storedStudentInfo.strandYear,
                studentId: 'stored_user'
            };
        } else {
            // No student data found
            finalStudentData = {
                studentName: 'Anonymous Player',
                firstName: 'Anonymous',
                lastName: 'Player',
                fullName: 'Anonymous Player',
                department: 'Unknown',
                strandYear: 'Unknown',
                studentId: 'anonymous_' + Date.now()
            };
        }
        
        
        // Add student info to result data
        resultData.studentName = finalStudentData.studentName;
        resultData.firstName = finalStudentData.firstName;
        resultData.lastName = finalStudentData.lastName;
        resultData.fullName = finalStudentData.fullName;
        resultData.department = finalStudentData.department;
        resultData.strandYear = finalStudentData.strandYear;
        
        
    // Go to ResultScreen (ensure HUD removed first)
    this.removeDomHud();
    this.scene.start('ResultScreen', resultData);
        
        // Also upload the data to Firebase in the background
        this.uploadGameplayDataInBackground(resultData);
    }

    removeDesktopHud() {
        // Remove DOM HUD if present; Phaser HUD is not used
        const domHud = typeof document !== 'undefined' ? document.getElementById('desktop-game-hud') : null;
        if (domHud) domHud.remove();
        this.domHudActive = false;
    }

    async uploadGameplayDataInBackground(resultData) {
        try {
            // Skip server uploads for guest users
            try {
                const userType = localStorage.getItem('sci_high_user_type');
                if (userType && userType.toLowerCase() === 'guest') {
                    // Store locally and return
                    const tempData = {
                        studentId: 'guest',
                        studentName: resultData.studentName || 'Guest Player',
                        courseTopic: resultData.courseTopic,
                        sessionData: {
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
                    this.storeScoreLocally(tempData);
                    return;
                }
            } catch {}
            
            // Get student data from localStorage (prioritize current user data)
            let studentId = 'unknown';
            let currentUser = null;
            
            try {
                const userDataStr = localStorage.getItem('sci_high_user');
                if (userDataStr) {
                    currentUser = JSON.parse(userDataStr);
                    studentId = this.resolveUserIdentifier(currentUser);
                    
                    // If we have current user data and it differs from result data, update result data
                    if (currentUser.profile && currentUser.profile.fullName && 
                        currentUser.profile.fullName !== resultData.studentName) {
                        
                        resultData.studentName = currentUser.profile.fullName;
                        resultData.fullName = currentUser.profile.fullName;
                        if (currentUser.profile.fullName.includes(' ')) {
                            const nameParts = currentUser.profile.fullName.split(' ');
                            resultData.firstName = nameParts[0];
                            resultData.lastName = nameParts.slice(1).join(' ');
                        }
                        resultData.department = currentUser.profile.department || resultData.department;
                        resultData.strandYear = currentUser.profile.strandYear || resultData.strandYear;
                    }
                } else {
                    console.warn('No current user data found in localStorage - sci_high_user key is empty');
                }
            } catch (e) {
                console.error('Could not parse current user data from localStorage:', e);
            }
            
            // Prepare gameplay data for upload
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
                        ((resultData.correctAnswers / (resultData.correctAnswers + resultData.wrongAnswers)) * 100).toFixed(1) : 0,
                    bloomStats: this.sessionBloomStats || null
                }
            };
            
            
            // Check network connectivity before attempting upload
            if (!navigator.onLine) {
                console.error('=== NO INTERNET CONNECTION - STORING DATA LOCALLY ===');
                this.storeScoreLocally(gameplayData);
                return;
            }
            
            
            // Ensure Firebase is initialized
            const firebaseInitialized = await this.ensureFirebaseInitialized();
            
            if (!firebaseInitialized) {
                console.error('=== FIREBASE INITIALIZATION FAILED - STORING DATA LOCALLY ===');
                this.storeScoreLocally(gameplayData);
                return;
            }
            
            
            // Upload to Firebase
            if (this.database) {
                const gameplayRef = this.database.ref('gameplay_data');
                const result = await gameplayRef.push(gameplayData);
                
                // Verify the upload by reading it back
                try {
                    const verifySnapshot = await gameplayRef.child(result.key).once('value');
                    if (verifySnapshot.exists()) {
                    } else {
                        console.error('❌ UPLOAD VERIFICATION FAILED - Data not found in database');
                    }
                } catch (verifyError) {
                    console.error('❌ UPLOAD VERIFICATION ERROR:', verifyError);
                }
                
                // Also update career stats if available
                try {
                    const { default: careerStatsService } = await import('../../services/careerStatsService.js');
                    await careerStatsService.updateCareerStats(
                        gameplayData.studentId, 
                        resultData.fullName || resultData.studentName, // Use fullName if available
                        gameplayData.sessionData,
                        {
                            firstName: resultData.firstName,
                            lastName: resultData.lastName,
                            fullName: resultData.fullName, // Pass fullName specifically
                            department: resultData.department,
                            strandYear: resultData.strandYear
                        }
                    );
                } catch (careerError) {
                    console.error('=== CAREER STATS UPDATE FAILED ===');
                    console.error('Career stats error:', careerError);
                    // Continue even if career stats fail
                }
            } else {
                console.error('=== FIREBASE DATABASE NOT AVAILABLE ===');
                console.error('Database object is null or undefined');
                this.storeScoreLocally(gameplayData);
            }
            
        } catch (error) {
            console.error('=== CRITICAL ERROR IN SCORE UPLOAD PROCESS ===');
            console.error('Error details:', error);
            console.error('Error stack:', error.stack);
            
            // Try to store locally as fallback
            try {
                const fallbackData = {
                    studentId: 'error_fallback',
                    studentName: resultData.studentName || 'Unknown',
                    courseTopic: resultData.courseTopic || 'Unknown',
                    totalScore: resultData.totalScore || 0,
                    correctAnswers: resultData.correctAnswers || 0,
                    wrongAnswers: resultData.wrongAnswers || 0,
                    timestamp: new Date().toISOString(),
                    errorOccurred: true,
                    errorMessage: error.message
                };
                this.storeScoreLocally(fallbackData);
            } catch (fallbackError) {
                console.error('=== EVEN FALLBACK STORAGE FAILED ===');
                console.error('Fallback error:', fallbackError);
            }
        }
    }

    // Store score data locally when Firebase upload fails
    storeScoreLocally(gameplayData) {
        try {
            const localScores = JSON.parse(localStorage.getItem('pendingScores') || '[]');
            localScores.push({
                ...gameplayData,
                storedLocally: true,
                localStorageTimestamp: new Date().toISOString()
            });
            localStorage.setItem('pendingScores', JSON.stringify(localScores));
            
            // Try to upload pending scores on next network connection
            this.schedulePendingUpload();
        } catch (localError) {
            console.error('=== LOCAL STORAGE FAILED ===');
            console.error('Local storage error:', localError);
        }
    }

    // Schedule upload of pending scores when network becomes available
    schedulePendingUpload() {
        if (navigator.onLine) {
            setTimeout(() => this.uploadPendingScores(), 5000); // Try after 5 seconds
        } else {
            // Listen for online event
            const onlineHandler = () => {
                window.removeEventListener('online', onlineHandler);
                setTimeout(() => this.uploadPendingScores(), 2000);
            };
            window.addEventListener('online', onlineHandler);
        }
    }

    // Upload any scores that were stored locally
    async uploadPendingScores() {
        try {
            const pendingScores = JSON.parse(localStorage.getItem('pendingScores') || '[]');
            if (pendingScores.length === 0) return;
            
            
            const firebaseInitialized = await this.ensureFirebaseInitialized();
            if (!firebaseInitialized || !this.database) {
                return;
            }
            
            const gameplayRef = this.database.ref('gameplay_data');
            const uploadedScores = [];
            
            for (const score of pendingScores) {
                try {
                    await gameplayRef.push(score);
                    uploadedScores.push(score);
                } catch (uploadError) {
                    console.error('Failed to upload pending score:', uploadError);
                }
            }
            
            // Remove successfully uploaded scores
            if (uploadedScores.length > 0) {
                const remainingScores = pendingScores.filter(score => 
                    !uploadedScores.some(uploaded => 
                        uploaded.sessionData.timestamp === score.sessionData.timestamp
                    )
                );
                localStorage.setItem('pendingScores', JSON.stringify(remainingScores));
            }
        } catch (error) {
            console.error('Error uploading pending scores:', error);
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
            console.error('Firebase initialization failed:', error);
            this.isFirebaseInitialized = false;
            this.initializationPromise = null; // Reset for retry
            return false;
        }
    }

    async initializeFirebase() {
        try {
            
            // Firebase config
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
                await this.loadFirebaseScripts();
            } else {
            }
            
            // Wait a bit for Firebase to be available
            let retries = 0;
            while (typeof window.firebase === 'undefined' && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Increased wait time
                retries++;
            }
            
            if (typeof window.firebase === 'undefined') {
                throw new Error('Firebase failed to load after multiple attempts - check your internet connection');
            }
            
            // Initialize Firebase app if not already done
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(firebaseConfig);
            } else {
            }
            
            // Test Firebase connection
            this.database = window.firebase.database();
            
            // Try a simple connection test
            await this.database.ref('.info/connected').once('value');
            
            this.isFirebaseInitialized = true;
        } catch (error) {
            console.error('=== FIREBASE INITIALIZATION FAILED ===');
            console.error('Error details:', error);
            console.error('Error stack:', error.stack);
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
            let failed = false;
            
            const timeout = setTimeout(() => {
                if (!failed) {
                    failed = true;
                    console.error('Firebase script loading timeout after 15 seconds');
                    reject(new Error('Firebase script loading timeout'));
                }
            }, 15000); // Increased timeout to 15 seconds
            
            scripts.forEach((src, index) => {
                const script = document.createElement('script');
                script.src = src;
                
                script.onload = () => {
                    loaded++;
                    if (loaded === scripts.length && !failed) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };
                
                script.onerror = (error) => {
                    if (!failed) {
                        failed = true;
                        clearTimeout(timeout);
                        console.error(`Failed to load Firebase script: ${src}`, error);
                        reject(new Error(`Failed to load Firebase script: ${src}`));
                    }
                };
                
                // Add some delay between script loads for mobile reliability
                setTimeout(() => {
                    document.head.appendChild(script);
                }, index * 100);
            });
        });
    }

    // Add this method to check and upload pending scores when the scene starts
    // Clear old/conflicting student data to ensure fresh user input is used
    clearOldStudentData() {
        try {
            // Check if we have current user data
            const currentUserStr = localStorage.getItem('sci_high_user');
            if (currentUserStr) {
                const currentUser = JSON.parse(currentUserStr);
                
                // Check if there's old studentInfo that might conflict
                const oldStudentInfoStr = localStorage.getItem('studentInfo');
                if (oldStudentInfoStr) {
                    const oldStudentInfo = JSON.parse(oldStudentInfoStr);
                    
                    // If the names don't match, clear the old data
                    const currentName = currentUser.profile?.fullName || currentUser.profile?.displayName;
                    const oldName = oldStudentInfo.fullName || `${oldStudentInfo.firstName} ${oldStudentInfo.lastName}`;
                    
                    if (currentName && oldName && currentName !== oldName) {
                        localStorage.removeItem('studentInfo');
                    }
                }
            }
        } catch (error) {
            console.warn('Error clearing old student data:', error);
        }
    }

    checkAndUploadPendingScores() {
        // Try to upload any pending scores when the game starts
        const pendingScores = JSON.parse(localStorage.getItem('pendingScores') || '[]');
        if (pendingScores.length > 0) {
            this.uploadPendingScores();
        }
    }

    // Clean up when scene is shutdown
    shutdown() {
        // Stop and dispose timers/events
        if (this._timer) { try { this._timer.destroy(); } catch (_) {} this._timer = null; }
        if (this.timerEvent) { try { this.timerEvent.remove(); } catch (_) {} this.timerEvent = null; }
        if (this.countdownEvent) { try { this.countdownEvent.remove(); } catch (_) {} this.countdownEvent = null; }
        // Defensive: ensure streak is reset if scene ends abruptly
        if (typeof this.resetStreak === 'function') this.resetStreak();
        // Defensive: also clear any active power-up states
        if (typeof this.resetPowerUps === 'function') this.resetPowerUps();
        if (this.playerGlow) {
            this.playerGlow.destroy();
            this.playerGlow = null;
        }
        
        super.shutdown();
    }
}