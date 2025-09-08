import Phaser from 'phaser';
import { char1, char2, char3, char4, char5 } from '../gameManager';
import { createBackButton } from '../components/buttons/backbutton';
import Carousel from '../ui/carouselUI';
import VNDialogueBox from '../ui/VNDialogueBox';
import { onceOnlyFlags } from '../gameManager';
import TutorialManager from '../components/TutorialManager.js';
import { CLASSROOM_TUTORIAL_STEPS } from '../components/TutorialConfig.js';
import { playExclusiveBGM, updateSoundVolumes } from '../audioUtils';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getSafeArea
} from '../utils/mobileUtils.js';

export default class Classroom extends Phaser.Scene {
    constructor() {
        super('Classroom');
        this.tutorialManager = null;
        
        // Firebase initialization properties
        this.isFirebaseInitialized = false;
        this.database = null;
        this.initializationPromise = null;
        
        // Firebase config
        this.firebaseConfig = {
            apiKey: "AIzaSyD-Q2woACHgMCTVwd6aX-IUzLovE0ux-28",
            authDomain: "sci-high-website.firebaseapp.com",
            databaseURL: "https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "sci-high-website",
            storageBucket: "sci-high-website.appspot.com",
            messagingSenderId: "451463202515",
            appId: "1:451463202515:web:e7f9c7bf69c04c685ef626"
        };
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
            console.warn('Firebase initialization failed in Classroom:', error.message);
            return false;
        }
    }

    async initializeFirebase() {
        try {
            console.log('Starting Firebase initialization for Classroom...');
            
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
                window.firebase.initializeApp(this.firebaseConfig);
            }
            
            // Test Firebase connection
            this.database = window.firebase.database();
            
            // Try a simple connection test
            await this.database.ref('.info/connected').once('value');
            
            this.isFirebaseInitialized = true;
            console.log('Firebase Database initialized successfully for Classroom');
        } catch (error) {
            console.error('Failed to initialize Firebase for Classroom:', error);
            this.isFirebaseInitialized = false;
            throw error;
        }
    }

    async loadFirebaseScripts() {
        const scripts = [
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
        ];

        try {
            for (const src of scripts) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = resolve;
                    script.onerror = () => reject(new Error(`Failed to load ${src}`));
                    document.head.appendChild(script);
                });
            }
            console.log('Firebase scripts loaded successfully');
        } catch (error) {
            console.error('Error loading Firebase scripts:', error);
            throw error;
        }
    }

    async checkStudentDataInFirebase() {
        try {
            console.log('🔍 Classroom: Checking for existing student data in Firebase...');
            
            // Get current user from localStorage
            const userDataStr = localStorage.getItem('sci_high_user');
            if (!userDataStr) {
                console.log('ℹ️ Classroom: No user data found in localStorage');
                return false;
            }
            
            const currentUser = JSON.parse(userDataStr);
            const studentId = currentUser.studentId || currentUser.uid;
            
            if (!studentId) {
                console.log('ℹ️ Classroom: No student ID found in user data');
                return false;
            }
            
            console.log('🔍 Classroom: Searching for student data with ID:', studentId);
            
            // Ensure Firebase is initialized
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                console.log('⚠️ Classroom: Firebase not initialized, cannot check student data');
                return false;
            }
            
            // Search for any gameplay data for this student
            const gameplayRef = this.database.ref('gameplay_data');
            const snapshot = await gameplayRef.orderByChild('studentId').equalTo(studentId).limitToFirst(1).once('value');
            
            const hasData = snapshot.exists();
            console.log(`${hasData ? '✅' : 'ℹ️'} Classroom: Student ${studentId} ${hasData ? 'has' : 'does not have'} existing data in Firebase`);
            
            return hasData;
            
        } catch (error) {
            console.error('❌ Classroom: Error checking student data in Firebase:', error);
            return false;
        }
    }

    preload() {
        // Load classroom background
        this.load.image('classroomBG', 'assets/img/bg/classroom_day.png');
        
        // Load Principal Richard image for intro dialogue
        this.load.image('Secretary', 'assets/sprites/npcs/secretary.png');
        
        // Load character images from public/assets/sprites/npcs with their respective names
        this.load.image('Noah', 'assets/sprites/npcs/Noah.png');
        this.load.image('Lily', 'assets/sprites/npcs/Lily.png');
        this.load.image('Damian', 'assets/sprites/npcs/Damian.png');
        this.load.image('Bella', 'assets/sprites/npcs/Bella.png');
        this.load.image('Finley', 'assets/sprites/npcs/Finley.png');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_classroom', 'assets/audio/bgm/bgm_classroom.mp3');
        
        // Add error handling for missing images
        this.load.on('loaderror', (file) => {
            console.error('Failed to load file:', file.src);
        });
        
        this.load.on('filecomplete', (key, type, data) => {
            if (type === 'image') {
                console.log('Successfully loaded image:', key);
            }
        });
    }

    create() {
        // Get mobile scaling info
        const scaleInfo = getScaleInfo(this);
        const { width, height } = scaleInfo;
        const safeArea = getSafeArea(scaleInfo);

        // Initialize modal state
        this.characterBoxOpen = false;

        // Add classroom background with better styling
        this.bg = this.add.tileSprite(0, 0, width, height, 'classroomBG').setOrigin(0, 0);
        this.bg.setAlpha(0.5); // Match main hub background alpha
        
        // Set background color to match main hub styling
        this.cameras.main.setBackgroundColor('#B2E2B1');

        // Sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Play classroom background music
        playExclusiveBGM(this, 'bgm_classroom', { loop: true });
        updateSoundVolumes(this);

        // Create back button using the reusable component
        const backButtonComponents = createBackButton(this, 'MainHub');
        this.backButtonBg = backButtonComponents.buttonBg;
        this.backButton = backButtonComponents.backButton;

        // Then initialize classroom UI with delay to ensure everything is ready
        this.time.delayedCall(100, () => {
            this.createClassroomUI();
        });
    }

    async createClassroomUI() {
        // Get mobile scaling info
        const scaleInfo = getScaleInfo(this);

        // Carousel data using images from assets/img/sprites/npcs with their respective names
        const charKeys = ['Noah', 'Lily', 'Damian', 'Bella', 'Finley'];
        const charInfo = [
            { 
                name: "Noah", 
                desc: "A diligent student who loves coding a bit too much.",
                progress: char1.quest1 / 100,
                side: char1.quest2 / 100,
                bonus: char1.quest3 / 100,
                questDescs: [
                    char1.quest1Desc,
                    char1.quest2Desc,
                    char1.quest3Desc
                ]
            },
            { 
                name: "Lily", 
                desc: "A popular idol, she's talented at singing, dancing, and even web design.",
                progress: char2.quest1 / 100,
                side: char2.quest2 / 100,
                bonus: char2.quest3 / 100,
                questDescs: [
                    char2.quest1Desc,
                    char2.quest2Desc,
                    char2.quest3Desc
                ]
            },
            { 
                name: "Damian", 
                desc: "A creative thinker and artist.",
                progress: char3.quest1 / 100,
                side: char3.quest2 / 100,
                bonus: char3.quest3 / 100,
                questDescs: [
                    char3.quest1Desc,
                    char3.quest2Desc,
                    char3.quest3Desc
                ]
            },
            { 
                name: "Bella", 
                desc: "She's shy and timid, yet she's one of the top performers.",
                progress: char4.quest1 / 100,
                side: char4.quest2 / 100,
                bonus: char4.quest3 / 100,
                questDescs: [
                    char4.quest1Desc,
                    char4.quest2Desc,
                    char4.quest3Desc
                ]
            },
            { 
                name: "Finley", 
                desc: "He can appear cold, but he's a kind man.",
                progress: char5.quest1 / 100,
                side: char5.quest2 / 100,
                bonus: char5.quest3 / 100,
                questDescs: [
                    char5.quest1Desc,
                    char5.quest2Desc,
                    char5.quest3Desc
                ]
            }
        ];

        // Ensure all character images are loaded before creating carousel
        const allImagesLoaded = charKeys.every(key => this.textures.exists(key));
        
        if (!allImagesLoaded) {
            console.warn('Some character images not loaded, creating placeholder carousel');
            // Create placeholder colored rectangles for missing images
            charKeys.forEach(key => {
                if (!this.textures.exists(key)) {
                    console.warn(`Creating placeholder for missing image: ${key}`);
                    // Create a simple colored rectangle as placeholder
                    const graphics = this.add.graphics();
                    graphics.fillStyle(0x4CAF50, 1);
                    graphics.fillRoundedRect(0, 0, 100, 100, 10);
                    graphics.generateTexture(key, 100, 100);
                    graphics.destroy();
                }
            });
        }

        // Create the carousel with main hub styling - centered horizontally
        const carouselConfig = {
            iconSpacing: scaleInfo.isMobile ? 
                (scaleInfo.isPortrait ? scaleDimension(180, scaleInfo) : scaleDimension(240, scaleInfo)) : 
                scaleDimension(280, scaleInfo),
            smallScale: scaleInfo.isMobile ? 0.12 : 0.15, // Match main hub
            largeScale: scaleInfo.isMobile ? 0.20 : 0.3,  // Match main hub
            iconYOffset: scaleInfo.isMobile ? 
                scaleDimension(-60, scaleInfo) : 
                scaleDimension(-40, scaleInfo),
            iconToTitleGap: scaleDimension(100, scaleInfo),
            iconToDescGap: scaleDimension(50, scaleInfo),
            headingStyle: { 
                fontSize: scaleFontSize(56, scaleInfo),
                fontStyle: 'bold'
            },
            descStyle: { 
                fontSize: scaleFontSize(28, scaleInfo)
            },
            sounds: {
                hover: 'se_select',
                confirm: 'se_confirm'
            }
        };

        // Check if student has data in Firebase to decide whether to show intro
        const hasFirebaseData = await this.checkStudentDataInFirebase();
        
        // Skip intro if student has Firebase data OR if they've already seen it
        const shouldSkipIntro = hasFirebaseData || onceOnlyFlags.hasSeen('classroom_intro');
        
        if (!shouldSkipIntro) {
            console.log('🎬 Classroom: Showing intro cutscene for new student');
            // Hide UI elements during cutscene
            this.hideUIElementsForCutscene();
            
            // Show Secretary character image
            this.showSecretary();
            
            this.vnBox = new VNDialogueBox(this, [
                "Welcome to the classroom! I see you followed my advice.",
                "These are your classmates, they are all profecient in different programming languages.",
                "Each of them can teach you the basics of their specialty before you tackle the challenges in the Computer Lab.",
                "Noah specializes in Python, Lily knows Web Design, Damian is great with Java, Bella handles C programming, and Finley is our C++ prodigy.",
                "Make sure to talk to them and learn from their experience. They'll help you prepare for the coding challenges ahead!"
            ], () => {
                // Hide Secretary when dialogue ends
                this.hideSecretary();
                onceOnlyFlags.setSeen('classroom_intro');
                // Show UI elements after cutscene
                this.showUIElementsAfterCutscene();
                this.createClassroomCarousel(charKeys, charInfo, carouselConfig);
                
                // Start tutorial after carousel is created (if first time visiting classroom)
                if (!onceOnlyFlags.hasSeen('classroom_tutorial')) {
                    this.time.delayedCall(300, () => {
                        this.startClassroomTutorial();
                    });
                }
            });
        } else {
            if (hasFirebaseData) {
                console.log('✅ Classroom: Skipping intro - student has existing Firebase data');
                // Auto-mark intro as seen for returning students
                onceOnlyFlags.setSeen('classroom_intro');
            } else {
                console.log('✅ Classroom: Skipping intro - already seen before');
            }
            
            this.createClassroomCarousel(charKeys, charInfo, carouselConfig);
            
            // Skip tutorial as well for returning students with Firebase data
            if (hasFirebaseData) {
                onceOnlyFlags.setSeen('classroom_tutorial');
                console.log('✅ Classroom: Skipping tutorial - returning student');
            } else if (!onceOnlyFlags.hasSeen('classroom_tutorial')) {
                // Start tutorial after carousel is created (if first time visiting classroom)
                this.time.delayedCall(300, () => {
                    this.startClassroomTutorial();
                });
            }
        }

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);

        // Debug feature: Add a key to manually trigger the tutorial (T key)
        this.input.keyboard.on('keydown-T', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                // Shift+T to trigger tutorial manually for testing
                this.startClassroomTutorial();
            }
        });

        // Debug feature: Reset tutorial flag with Shift+R for testing
        this.input.keyboard.on('keydown-R', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                onceOnlyFlags.flags['classroom_tutorial'] = false;
                console.log('Classroom tutorial flag reset - tutorial will show on next visit');
            }
        });
    }

    createClassroomCarousel(charKeys, charInfo, carouselConfig) {
        this.characterCarousel = new Carousel(this, carouselConfig).create(
            charKeys,
            charInfo.map(c => ({
                heading: c.name,
                desc: c.desc
            })),
            (selected, index) => {
                // Show character box or handle selection
                this.showCharacterBox(charInfo[index], charKeys[index]);
            }
        );
        
        // Debug: Check if images are loaded
        charKeys.forEach(key => {
            if (!this.textures.exists(key)) {
                console.error(`Image not loaded: ${key}`);
            } else {
                console.log(`Image loaded successfully: ${key}`);
            }
        });

        // Back button
        // (Already created in create method)

        // Add shutdown and destroy event listeners to clean up the carousel
        this.events.on('shutdown', () => {
            this.destroyCarousel();
        });
        this.events.on('destroy', () => {
            this.destroyCarousel();
        });
    }

    destroyCarousel() {
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
        // Clean up modal state
        this.characterBoxOpen = false;
        
        // Clean up carousel properly using the carousel's destroy method
        if (this.characterCarousel) {
            this.characterCarousel.destroy();
            this.characterCarousel = null;
        }
        
        // Legacy cleanup for any remaining elements
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween = null;
        }
        if (this.carouselIcons) {
            this.carouselIcons.forEach(icon => {
                if (icon && icon.destroy) icon.destroy();
            });
            this.carouselIcons = [];
        }
        if (this.carouselName) {
            this.carouselName.destroy();
            this.carouselName = null;
        }
        if (this.carouselDesc) {
            this.carouselDesc.destroy();
            this.carouselDesc = null;
        }
    }

    showCharacterBox(charData, charKey) {
        // Prevent opening multiple modals
        if (this.characterBoxOpen) {
            return;
        }
        
        const { width, height } = this.scale;

        // Disable carousel controls
        this.characterBoxOpen = true;

        // --- Layout constants ---
        const boxWidth = 600;
        const boxHeight = 540;
        const BOX_PADDING_TOP = 70; // Increased from 36 to 70
        const SPACING = 32;
        const BAR_WIDTH = 400;
        const BAR_HEIGHT = 28;

        // Group for easy cleanup
        const boxObjects = [];

        // Dim background
        const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
            .setDepth(10);
        boxObjects.push(dim);

        // Main box
        const box = this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0xffffff, 1)
            .setStrokeStyle(4, 0x1e90ff)
            .setDepth(11);
        boxObjects.push(box);

        // Start Y at top of box, add padding
        let y = height / 2 - boxHeight / 2 + BOX_PADDING_TOP;

        // Character image removed (no icon in messageBox)
        // y += 76; // Adjusted for new scale and margin (skip this since no image)

        // Name
        boxObjects.push(
            this.add.text(width / 2, y, charData.name, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '32px',
                color: '#1e90ff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(12)
        );

        y += 44;

        // Description
        boxObjects.push(
            this.add.text(width / 2, y, charData.desc, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '18px',
                color: '#444466',
                wordWrap: { width: boxWidth - 60 },
                align: 'center'
            }).setOrigin(0.5).setDepth(12)
        );

        y += 54;

        // "Quests" label
        boxObjects.push(
            this.add.text(width / 2, y, "Quests", {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '24px',
                color: '#1e90ff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(12)
        );

        y += SPACING + 4;

        // --- Progress Bars and Descriptions ---
        const questColors = [0x1e90ff, 0x4caf50, 0xff9800];
        const questLabels = ['Quest 1', 'Quest 2', 'Quest 3'];
        const questPercents = [charData.progress, charData.side, charData.bonus];

        for (let i = 0; i < 3; i++) {
            // Label
            boxObjects.push(
                this.add.text(width / 2, y, `${questLabels[i]}: ${(questPercents[i] * 100).toFixed(0)}%`, {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '16px',
                    color: '#222244',
                    stroke: '#ffffff',
                    strokeThickness: 2
                }).setOrigin(0.5).setDepth(12)
            );
            y += 28;

            // Progress bar background
            boxObjects.push(
                this.add.rectangle(width / 2, y, BAR_WIDTH, BAR_HEIGHT, 0xcccccc)
                    .setDepth(12)
            );
            // Progress bar fill
            boxObjects.push(
                this.add.rectangle(
                    width / 2 - BAR_WIDTH / 2 + (questPercents[i] * BAR_WIDTH) / 2,
                    y,
                    questPercents[i] * BAR_WIDTH,
                    BAR_HEIGHT,
                    questColors[i]
                ).setDepth(12)
            );

            // Description
            y += BAR_HEIGHT;
            boxObjects.push(
                this.add.text(width / 2, y, charData.questDescs[i], {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '14px',
                    color: '#444466',
                    wordWrap: { width: boxWidth - 60 }
                }).setOrigin(0.5).setDepth(12)
            );
            y += SPACING;
        }

        // Story Mode and Progress buttons for characters with story content
        if (charData.name === "Noah" || charData.name === "Lily" || charData.name === "Damian") {
            let storyColor = 0x4caf50; // Default green for Noah
            let progressColor = 0x2196f3; // Default blue
            let chapterSelectScene = 'NoahChapterSelect';
            let progressTrackerScene = 'NoahProgressTracker';
            
            // Set colors and scenes based on character
            if (charData.name === "Lily") {
                storyColor = 0xff6b9d; // Pink for Lily
                chapterSelectScene = 'LilyChapterSelect';
                progressTrackerScene = 'LilyProgressTracker';
            } else if (charData.name === "Damian") {
                storyColor = 0xf57c00; // Orange for Damian
                chapterSelectScene = 'DamianChapterSelect';
                progressTrackerScene = 'DamianProgressTracker';
            }
            
            const storyBtn = this.add.rectangle(
                width / 2 - 110,
                height / 2 + boxHeight / 2 - 50,
                180,
                40,
                storyColor
            ).setDepth(12).setInteractive({ useHandCursor: true });
            boxObjects.push(storyBtn);

            const storyBtnText = this.add.text(
                width / 2 - 110,
                height / 2 + boxHeight / 2 - 50,
                'Story Mode',
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '14px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5).setDepth(13);
            boxObjects.push(storyBtnText);

            storyBtn.on('pointerdown', () => {
                this.se_confirmSound.play();
                boxObjects.forEach(obj => obj.destroy());
                this.characterBoxOpen = false;
                // Launch character's chapter selection
                this.scene.start(chapterSelectScene);
            });

            // Progress button
            const progressBtn = this.add.rectangle(
                width / 2 + 110,
                height / 2 + boxHeight / 2 - 50,
                180,
                40,
                progressColor
            ).setDepth(12).setInteractive({ useHandCursor: true });
            boxObjects.push(progressBtn);

            const progressBtnText = this.add.text(
                width / 2 + 110,
                height / 2 + boxHeight / 2 - 50,
                'Progress',
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '14px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5).setDepth(13);
            boxObjects.push(progressBtnText);

            progressBtn.on('pointerdown', () => {
                this.se_confirmSound.play();
                boxObjects.forEach(obj => obj.destroy());
                this.characterBoxOpen = false;
                // Launch character's progress tracker
                this.scene.start(progressTrackerScene);
            });

            // Hover effects
            const storyHoverColor = charData.name === "Lily" ? 0xff85b3 : (charData.name === "Damian" ? 0xff9800 : 0x66bb6a);
            storyBtn.on('pointerover', () => {
                storyBtn.setFillStyle(storyHoverColor);
                this.se_hoverSound.play();
            });
            storyBtn.on('pointerout', () => storyBtn.setFillStyle(storyColor));

            progressBtn.on('pointerover', () => {
                progressBtn.setFillStyle(0x42a5f5);
                this.se_hoverSound.play();
            });
            progressBtn.on('pointerout', () => progressBtn.setFillStyle(progressColor));
        } else if (charData.name === "Bella" || charData.name === "Finley") {
            // Locked story mode buttons for characters without story content yet
            const lockedColor = 0x666666; // Gray color for locked buttons
            const lockIconColor = 0xdddddd;
            
            // Locked Story Mode button
            const lockedStoryBtn = this.add.rectangle(
                width / 2 - 110,
                height / 2 + boxHeight / 2 - 50,
                180,
                40,
                lockedColor
            ).setDepth(12).setInteractive({ useHandCursor: true });
            boxObjects.push(lockedStoryBtn);

            // Add lock icon
            const lockIcon = this.add.text(
                width / 2 - 140,
                height / 2 + boxHeight / 2 - 50,
                '🔒',
                {
                    fontSize: '16px',
                    color: '#ffffff'
                }
            ).setOrigin(0.5).setDepth(13);
            boxObjects.push(lockIcon);

            const lockedStoryBtnText = this.add.text(
                width / 2 - 95,
                height / 2 + boxHeight / 2 - 50,
                'Story Mode',
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '14px',
                    color: lockIconColor,
                    stroke: '#000000',
                    strokeThickness: 1
                }
            ).setOrigin(0.5).setDepth(13);
            boxObjects.push(lockedStoryBtnText);

            // Locked Progress button
            const lockedProgressBtn = this.add.rectangle(
                width / 2 + 110,
                height / 2 + boxHeight / 2 - 50,
                180,
                40,
                lockedColor
            ).setDepth(12).setInteractive({ useHandCursor: true });
            boxObjects.push(lockedProgressBtn);

            // Add lock icon for progress
            const progressLockIcon = this.add.text(
                width / 2 + 80,
                height / 2 + boxHeight / 2 - 50,
                '🔒',
                {
                    fontSize: '16px',
                    color: '#ffffff'
                }
            ).setOrigin(0.5).setDepth(13);
            boxObjects.push(progressLockIcon);

            const lockedProgressBtnText = this.add.text(
                width / 2 + 125,
                height / 2 + boxHeight / 2 - 50,
                'Progress',
                {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '14px',
                    color: lockIconColor,
                    stroke: '#000000',
                    strokeThickness: 1
                }
            ).setOrigin(0.5).setDepth(13);
            boxObjects.push(lockedProgressBtnText);

            // Show "Coming Soon" message when clicked
            const showComingSoonMessage = () => {
                // Create temporary overlay
                const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(20);
                
                const messageBox = this.add.rectangle(width / 2, height / 2, 400, 200, 0x2c3e50).setDepth(21);
                messageBox.setStrokeStyle(3, 0x3498db);
                
                const comingSoonText = this.add.text(width / 2, height / 2 - 20, 'Coming Soon!', {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '24px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0.5).setDepth(22);
                
                const subText = this.add.text(width / 2, height / 2 + 20, `${charData.name}'s story is under development`, {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '16px',
                    color: '#bdc3c7',
                    stroke: '#000000',
                    strokeThickness: 1
                }).setOrigin(0.5).setDepth(22);
                
                const okButton = this.add.rectangle(width / 2, height / 2 + 60, 100, 35, 0x3498db).setDepth(22);
                okButton.setInteractive({ useHandCursor: true });
                
                const okText = this.add.text(width / 2, height / 2 + 60, 'OK', {
                    fontFamily: 'Caprasimo-Regular',
                    fontSize: '16px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 1
                }).setOrigin(0.5).setDepth(23);
                
                // Animate message appearance
                [overlay, messageBox, comingSoonText, subText, okButton, okText].forEach((element, index) => {
                    element.setAlpha(0);
                    this.tweens.add({
                        targets: element,
                        alpha: 1,
                        duration: 300,
                        delay: index * 50,
                        ease: 'Power2.out'
                    });
                });
                
                messageBox.setScale(0.5);
                this.tweens.add({
                    targets: messageBox,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 400,
                    ease: 'Back.out'
                });
                
                // Close message on OK button click
                okButton.on('pointerdown', () => {
                    [overlay, messageBox, comingSoonText, subText, okButton, okText].forEach(element => {
                        this.tweens.add({
                            targets: element,
                            alpha: 0,
                            duration: 200,
                            onComplete: () => element.destroy()
                        });
                    });
                });
                
                // Button hover effect
                okButton.on('pointerover', () => okButton.setFillStyle(0x2980b9));
                okButton.on('pointerout', () => okButton.setFillStyle(0x3498db));
            };

            // Add click handlers for locked buttons
            lockedStoryBtn.on('pointerdown', showComingSoonMessage);
            lockedProgressBtn.on('pointerdown', showComingSoonMessage);

            // Subtle hover effects for locked buttons
            lockedStoryBtn.on('pointerover', () => {
                lockedStoryBtn.setFillStyle(0x777777);
                this.tweens.add({
                    targets: [lockIcon, lockedStoryBtnText],
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 200,
                    ease: 'Power2.out'
                });
            });
            
            lockedStoryBtn.on('pointerout', () => {
                lockedStoryBtn.setFillStyle(lockedColor);
                this.tweens.add({
                    targets: [lockIcon, lockedStoryBtnText],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Power2.out'
                });
            });

            lockedProgressBtn.on('pointerover', () => {
                lockedProgressBtn.setFillStyle(0x777777);
                this.tweens.add({
                    targets: [progressLockIcon, lockedProgressBtnText],
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 200,
                    ease: 'Power2.out'
                });
            });
            
            lockedProgressBtn.on('pointerout', () => {
                lockedProgressBtn.setFillStyle(lockedColor);
                this.tweens.add({
                    targets: [progressLockIcon, lockedProgressBtnText],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Power2.out'
                });
            });
        }

        // Close button (top right of box)
        const closeBtn = this.add.text(
            width / 2 + boxWidth / 2 - 30,
            height / 2 - boxHeight / 2 + 30,
            '✕',
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '24px',
                color: '#1e90ff',
                backgroundColor: '#fff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(13).setInteractive({ useHandCursor: true });
        boxObjects.push(closeBtn);

        closeBtn.on('pointerdown', () => {
            this.se_confirmSound.play();
            boxObjects.forEach(obj => obj.destroy());
            // Re-enable carousel controls
            this.characterBoxOpen = false;
        });
    }

    showSecretary() {
        const scaleInfo = getScaleInfo(this);
        const { width, height } = scaleInfo;
        
        // Position character so half of his body is covered by the dialogue box
        const characterX = width * 0.25; // 25% from left edge
        const characterY = height * 0.7; // Lower position so dialogue box covers upper half
        
        // Responsive scaling for mobile devices - increased size
        const isMobile = width < 768 || height < 600;
        const characterScale = isMobile ? 0.35 : 0.8; // Larger scale for more presence
        
        // Add Secretary character image
        this.secretaryDisplay = this.add.image(characterX, characterY, 'Secretary');
        this.secretaryDisplay.setOrigin(0.5, 0.5);
        this.secretaryDisplay.setScale(characterScale);
        this.secretaryDisplay.setDepth(5); // Behind dialogue box but above background
        
        // Add a subtle fade-in effect
        this.secretaryDisplay.setAlpha(0);
        this.tweens.add({
            targets: this.secretaryDisplay,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    hideSecretary() {
        if (this.secretaryDisplay) {
            // Fade out and destroy
            this.tweens.add({
                targets: this.secretaryDisplay,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    if (this.secretaryDisplay) {
                        this.secretaryDisplay.destroy();
                        this.secretaryDisplay = null;
                    }
                }
            });
        }
    }

    hideUIElementsForCutscene() {
        // Hide back button
        if (this.backButtonBg) {
            this.backButtonBg.setVisible(false);
        }
        if (this.backButton) {
            this.backButton.setVisible(false);
        }
    }

    showUIElementsAfterCutscene() {
        // Show back button
        if (this.backButtonBg) {
            this.backButtonBg.setVisible(true);
        }
        if (this.backButton) {
            this.backButton.setVisible(true);
        }
    }

    startClassroomTutorial() {
        if (!this.tutorialManager) {
            console.warn('Tutorial manager not initialized');
            return;
        }

        const tutorialSteps = CLASSROOM_TUTORIAL_STEPS.map(step => ({ ...step }));

        // Start the tutorial
        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('classroom_tutorial');
                console.log('Classroom tutorial completed!');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('classroom_tutorial');
                console.log('Classroom tutorial skipped!');
            }
        });
    }
}