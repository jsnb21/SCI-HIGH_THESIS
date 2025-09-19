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
        // Inject custom quiz questions if provided (for topic 'custom')
        this.customQuiz = data?.customQuiz || null; // { ownerId, quizId, meta, questions }
        
        // Initialize/reset timer system - ONLY if not resuming from quiz
        if (!data?.gameState) {
            this.gameTimer = 60; // Reset to 1 minute for new session
            this.countdownTimer = 3; // Reset countdown
            this.gameStarted = false; // Reset game started flag
            this.score = 0; // Reset score
            this.quizActive = false; // Reset quiz state
            this.currentQuiz = null;
            this.isMoving = false; // Reset movement state
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
            const hudHeight = 50; // unified HUD height
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
        
        // Load background tile; if it fails we'll fallback to generated default in createBackground
        try {
            this.load.image('grassTile', 'assets/img/bg/grass.png');
        } catch (e) {
            console.warn('Could not queue grassTile image, will use procedural rectangles.', e);
        }
        
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

        // Add course topic display
        this.addCourseDisplay();
        
        // Add mobile control hint
        this.addMobileControlHint();

        // Desktop-only HUD overlay (new approach: DOM HUD; keep Phaser texts hidden not destroyed to avoid null refs)
        if (this.scale.width >= 768) {
            if (this.scoreText) this.scoreText.setVisible(false);
            if (this.streakText) this.streakText.setVisible(false);
            if (this.timerText) this.timerText.setVisible(false);
            if (this.courseDisplay) this.courseDisplay.setVisible(false);
            this.time.delayedCall(0, () => {
                this.ensureDomHud();
                this.syncDomHud();
                requestAnimationFrame(() => this.syncDomHud());
            });
            this.time.delayedCall(150, () => this.syncDomHud());
        }
        
        // Add resize listener to keep board centered
        this.scale.on('resize', this.onResize, this);
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

        // Desktop: ensure DOM HUD; Mobile: show Phaser HUD
        if (this.scale.width >= 768) {
            if (this.scoreText) this.scoreText.setVisible(false);
            if (this.streakText) this.streakText.setVisible(false);
            if (this.timerText) this.timerText.setVisible(false);
            if (this.courseDisplay) this.courseDisplay.setVisible(false);
            this.ensureDomHud();
            this.syncDomHud();
        } else {
            if (this.scoreText) this.scoreText.setVisible(true);
            if (this.streakText) this.streakText.setVisible(true);
            if (this.timerText) this.timerText.setVisible(true);
            if (this.courseDisplay) this.courseDisplay.setVisible(true);
        }
        // Update HUD positions for responsive design (mobile or after recreation)
        this.updateHudPositions();
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
        // If DOM HUD active we may still keep Phaser texts hidden; skip heavy reposition if texts missing
        const texts = [this.scoreText, this.streakText, this.timerText, this.courseDisplay];
        const anyDestroyed = texts.some(t => t && (t._destroyed || t.active === false));
        if (anyDestroyed) {
            if (!this._hudWarned) {
                console.warn('HUD texts were destroyed before reposition. Skipping updateHudPositions this frame.');
                this._hudWarned = true;
            }
            return;
        }
        // Desktop now uses a camera-anchored HUD (independent overlay)
        const cam = this.cameras.main;
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const isVerySmall = screenWidth < 480;
        const isDesktop = screenWidth >= 768; // treat tablets as mobile style

        // Base margins (screen-space intent)
        const marginX = Math.min(20, screenWidth * 0.035);
        const topMargin = 6;

        // Font sizes remain responsive to raw screen width
        const scoreFontSize = Math.max(20, screenWidth * 0.03);
        const streakFontSize = Math.max(16, screenWidth * 0.025);
        const timerFontSize = Math.max(26, screenWidth * 0.04);
        const courseFontSize = Math.max(18, screenWidth * 0.028);

        // For desktop we anchor using camera worldView (so zoom has no shrinking effect)
        let originX = 0;
        let originY = 0;
        if (isDesktop) {
            originX = cam.worldView.x;
            originY = cam.worldView.y; // top edge of visible world after zoom
        }
        // For mobile we keep the prior absolute approach
        const scoreX = isDesktop ? originX + marginX : marginX;
        const scoreY = isDesktop ? originY + topMargin : topMargin;
        const streakY = scoreY + (isVerySmall ? 25 : 30);
        const timerY = scoreY; // top aligned
        const courseY = scoreY;
        const centerX = isDesktop ? originX + (cam.worldView.width / 2) : screenWidth / 2;
        const courseX = isDesktop ? originX + cam.worldView.width - marginX : screenWidth - marginX;
        
        // Update score text position and font size
        try {
            if (this.scoreText) {
                this.scoreText.setPosition(scoreX, scoreY);
                this.scoreText.setFontSize(`${scoreFontSize}px`);
                this.scoreText.setStroke('#000000', 4);
                this.scoreText.setShadow(2, 2, '#000000', 2, true, false);
            }
        } catch (e) { /* swallow to avoid crashing draw cycle */ }
        
        // Update streak text position and font size
        try {
            if (this.streakText) {
                this.streakText.setPosition(scoreX, streakY);
                this.streakText.setFontSize(`${streakFontSize}px`);
                this.streakText.setStroke('#000000', 3);
                this.streakText.setShadow(2, 2, '#000000', 2, true, false);
            }
        } catch (e) {}
        
        // Update timer position and font size - centered at top
        try {
            if (this.timerText) {
                this.timerText.setPosition(centerX, timerY);
                this.timerText.setFontSize(`${timerFontSize}px`);
                this.timerText.setStroke('#000080', 4);
                this.timerText.setShadow(2, 2, '#000040', 3, true, false);
            }
        } catch (e) {}
        
        // Update course display for mobile - top positioning only on mobile
        try {
            if (this.courseDisplay) {
                this.courseDisplay.setPosition(courseX, courseY);
                this.courseDisplay.setFontSize(`${courseFontSize}px`);
                this.courseDisplay.setOrigin(1, 0);
                this.courseDisplay.setStroke('#000080', 3);
                this.courseDisplay.setShadow(2, 2, '#000040', 2, true, false);
            }
        } catch (e) {}

        // Safety clamp: ensure none of the texts drift outside (rare but defensive)
        // Clamp only for mobile where absolute screen bounds apply
        if (!isDesktop) {
            const clampMargin = 2;
            const maxX = screenWidth - clampMargin;
            const maxY = screenHeight - clampMargin;
            [this.scoreText, this.streakText, this.timerText, this.courseDisplay].forEach(txt => {
                if (txt) {
                    if (txt.x < clampMargin) txt.x = clampMargin;
                    if (txt.y < clampMargin) txt.y = clampMargin;
                    if (txt.x > maxX) txt.x = maxX;
                    if (txt.y > maxY) txt.y = maxY;
                }
            });
        }
    }

    createDesktopHUD() { /* deprecated: replaced by DOM HUD */ }

    ensureDomHud() {
        // Create a DOM-based HUD overlay for desktop to bypass any Phaser zoom/visibility issues
        if (this.scale.width < 768) return; // Only desktop
        if (document.getElementById('desktop-game-hud')) return; // Already exists

        const wrapper = document.createElement('div');
        wrapper.id = 'desktop-game-hud';
        Object.assign(wrapper.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '54px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '6px 20px 4px 20px',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
            zIndex: '9999',
            pointerEvents: 'none',
            background: 'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.15))'
        });

        // Left stack (score + streak)
        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.flexDirection = 'column';
        left.style.gap = '4px';

        this.domScoreEl = document.createElement('div');
        this.domScoreEl.style.cssText = 'font-weight:bold;font-size:22px;color:#fff;text-shadow:2px 2px 3px #000';
        this.domScoreEl.textContent = `Score: ${this.score || 0}`;

        this.domStreakEl = document.createElement('div');
        this.domStreakEl.style.cssText = 'font-weight:bold;font-size:18px;color:#ff0;text-shadow:2px 2px 3px #000';
        this.domStreakEl.textContent = `Streak: ${this.streak || 0}`;

        left.appendChild(this.domScoreEl);
        left.appendChild(this.domStreakEl);

        // Center (timer)
        const center = document.createElement('div');
        center.style.cssText = 'position:absolute;left:50%;top:6px;transform:translateX(-50%);font-weight:bold;font-size:30px;color:#fff;text-shadow:2px 2px 4px #000';
        this.domTimerEl = document.createElement('div');
        this.domTimerEl.textContent = this.timerText ? this.timerText.text : '1:00';
        center.appendChild(this.domTimerEl);

        // Right (course)
        const right = document.createElement('div');
        right.style.cssText = 'font-weight:bold;font-size:20px;color:#0ff;text-shadow:2px 2px 3px #000;';
        this.domCourseEl = document.createElement('div');
        this.domCourseEl.textContent = this.getFormattedCourseName(this.courseTopic);
        right.appendChild(this.domCourseEl);

        wrapper.appendChild(left);
        wrapper.appendChild(center);
        wrapper.appendChild(right);

        const parent = this.game.canvas.parentNode || document.body;
        parent.style.position = parent.style.position || 'relative';
        parent.appendChild(wrapper);
        this.domHudActive = true;

        // Hide Phaser HUD (texts already hidden) and mark active
        if (this.desktopHudContainer) this.desktopHudContainer.setVisible(false);
        this.domHudActive = true;
        // Immediate syncs to guarantee visibility
        this.syncDomHud();
        setTimeout(() => this.syncDomHud(), 0);
        requestAnimationFrame(() => this.syncDomHud());
    }

    syncDomHud() {
        if (!this.domHudActive) return;
        if (this.domScoreEl) this.domScoreEl.textContent = `Score: ${this.score || 0}`;
        if (this.domStreakEl) this.domStreakEl.textContent = `Streak: ${this.streak || 0}`;
        if (this.domTimerEl) this.domTimerEl.textContent = this.getCurrentTimeString ? this.getCurrentTimeString() : (this.timerText ? this.timerText.text : '1:00');
        if (this.domCourseEl) this.domCourseEl.textContent = this.getFormattedCourseName(this.courseTopic);
    }

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
        const hudHeight = 50;
        
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
        
    }

    spawnSinglePowerUp() {
        // Don't spawn if we already have maximum power-ups
        if (this.powerUps.length >= this.maxPowerUps) {
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
        } else {
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
        if (this.scoreText && !this.domHudActive) this.scoreText.setText(`Score: ${this.score}`);
        this.syncDomHud();
        
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
        
    if (this.timerText && !this.domHudActive) this.timerText.setText(timeString);
    // Always sync DOM HUD (it computes from gameTimer directly)
    this.syncDomHud();
        
        // Change color when time is running out
        if (!this.domHudActive && this.timerText) {
            if (this.gameTimer <= 10) {
                this.timerText.setColor('#ff0000');
                this.tweens.add({
                    targets: this.timerText,
                    x: this.timerText.x + Phaser.Math.Between(-5, 5),
                    y: this.timerText.y + Phaser.Math.Between(-3, 3),
                    duration: 50,
                    ease: 'Power2',
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => { this.timerText.setPosition(this.scale.width / 2, 30); }
                });
            } else if (this.gameTimer <= 30) {
                this.timerText.setColor('#ffff00');
            }
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
        this.syncDomHud();
        
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
        // Add time but cap at 60 seconds (1 minute)
           const before = this.gameTimer;
           this.gameTimer = Math.min(this.gameTimer + seconds, 60);
           const gained = this.gameTimer - before;
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
        for (let i = 0; i < thugCount; i++) {
            const position = this.generateSpawnPosition();
            if (position) {
                this.nextSpawnPositions.push(position);
                this.createSpawnIndicator(position.x, position.y);
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
        
        // Reduce game timer and animate delta
        const before = this.gameTimer;
        this.gameTimer = Math.max(0, this.gameTimer - this.goblinThugTimePenalty);
        const lost = before - this.gameTimer;
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
            
            // Check for streak protection power-up
            if (this.activePowerUps.streakProtection) {
                // Use streak protection to save the streak
                this.activePowerUps.streakProtection = false; // One-time use
                this.showPowerUpNotification({
                    icon: '🛡️',
                    name: 'Streak Protected!'
                });
            } else {
                // Reset streak on wrong answer
                this.streak = 0;
                
                // Reset goblin immunity on wrong answer
                if (this.activePowerUps.goblinImmunityReady || this.activePowerUps.goblinImmunityActive) {
                    this.activePowerUps.goblinImmunityReady = false;
                    this.activePowerUps.goblinImmunityActive = false;
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
            
        } else if (this.correctAnswers >= this.intensityThreshold && this.intensity === 1) {
            this.intensity = 2;
            
            // Play intensity increase sound
            this.sound.play('se_combo', { volume: 0.7 });
            
            // Show INTENSITY increase notification
            this.showIntensityNotification();
            
            // Spawn power-up on intensity increase
            this.spawnSinglePowerUp();
            
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

        // If DOM HUD is active (desktop), create a floating DOM element instead of Phaser text (since timerText is hidden)
        if (this.domHudActive && this.domTimerEl) {
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

        // Dynamic dimensions with safe padding
        const maxPopupWidth = 640;
        const horizontalPadding = isMobile ? 24 : 40;
        const verticalPadding = isMobile ? 24 : 40;
        const containerWidth = Math.min(maxPopupWidth, this.scale.width - horizontalPadding);
        const maxHeightAvailable = this.scale.height - (isMobile ? 80 : 120);
        const baseHeight = isMobile ? 480 : 420;
        const containerHeight = Math.min(baseHeight, maxHeightAvailable);

        // Font sizes scale with width
        const questionFontSize = isSmallMobile ? '16px' : (isMobile ? '18px' : '20px');
        const answerFontSize = isSmallMobile ? '13px' : (isMobile ? '15px' : '16px');
        const titleFontSize = isSmallMobile ? '18px' : (isMobile ? '22px' : '26px');
        const buttonHeight = isSmallMobile ? 42 : (isMobile ? 48 : 54);
        const buttonSpacing = isSmallMobile ? 46 : (isMobile ? 54 : 62);
        const wordWrapWidth = containerWidth - (isMobile ? 50 : 80);
        const maxAnswerWidth = containerWidth - (isMobile ? 70 : 120);
        const scrollAreaHeight = containerHeight - (isMobile ? 170 : 180); // space for title + question + margins
        
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
            fontSize: titleFontSize,
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
            fontSize: questionFontSize,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: wordWrapWidth }
        }).setOrigin(0.5, 0.5);
        this.quizContainer.add(questionText);

        // Scroll container for answer buttons (simulate by grouping and clipping via mask)
        const answersGroupY = questionY + (isMobile ? 60 : 70);
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
                fontSize: answerFontSize,
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
            
        } else {
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

    activatePowerUp(powerUpId) {
        
        switch (powerUpId) {
            case 'streakProtection':
                this.activePowerUps.streakProtection = true;
                break;
            case 'goblinImmunity':
                this.activePowerUps.goblinImmunityReady = true;
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
        const hudHeight = 50;
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

        // 3. Clamp within new bounds
        const minZoom = isMobile ? (isSmallMobile ? 1.35 : 1.25) : 1.45;
        const maxZoom = 2.2; // cap to avoid excessive pixelation
        zoom = Phaser.Math.Clamp(zoom, minZoom, maxZoom);

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
        
        
        // Go to ResultScreen
        this.scene.start('ResultScreen', resultData);
        
        // Also upload the data to Firebase in the background
        this.uploadGameplayDataInBackground(resultData);
    }

    removeDesktopHud() {
        // Remove DOM HUD if present
        const domHud = typeof document !== 'undefined' ? document.getElementById('desktop-game-hud') : null;
        if (domHud) {
            domHud.remove();
        }
        this.domHudActive = false;
        // Re-show Phaser HUD texts (in case we return to gameplay later without full reload)
        if (this.scoreText) this.scoreText.setVisible(true);
        if (this.streakText) this.streakText.setVisible(true);
        if (this.timerText) this.timerText.setVisible(true);
        if (this.courseDisplay) this.courseDisplay.setVisible(true);
    }

    async uploadGameplayDataInBackground(resultData) {
        try {
            
            // Get student data from localStorage (prioritize current user data)
            let studentId = 'unknown';
            let currentUser = null;
            
            try {
                const userDataStr = localStorage.getItem('sci_high_user');
                if (userDataStr) {
                    currentUser = JSON.parse(userDataStr);
                    studentId = currentUser.studentId || currentUser.uid || 'unknown';
                    
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
                        ((resultData.correctAnswers / (resultData.correctAnswers + resultData.wrongAnswers)) * 100).toFixed(1) : 0
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
        if (this.playerGlow) {
            this.playerGlow.destroy();
            this.playerGlow = null;
        }
        
        super.shutdown();
    }
}