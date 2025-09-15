import Phaser from 'phaser';
import VNDialogueBox from '../ui/VNDialogueBox';
import Carousel from '../ui/carouselUI.js';
import { playExclusiveBGM, updateAllSoundVolumes, addSE } from '../audioUtils';
import { onceOnlyFlags } from '../gameManager';
import gameManager from '../gameManager.js';
import { createBackButton } from '../components/buttons/backbutton.js';
import TutorialManager from '../components/TutorialManager.js';
import { MAIN_HUB_TUTORIAL_STEPS } from '../components/TutorialConfig.js';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getResponsivePosition,
    createResponsiveTextStyle,
    getSafeArea
} from '../utils/mobileUtils.js';

// Legacy constants for backward compatibility
const BASE_WIDTH = 816;
const BASE_HEIGHT = 624;

export default class MainHub extends Phaser.Scene {
    constructor() {
        super({ key: 'MainHub' });
        this.uiElements = [];
        this.tutorialManager = null;
        this.isResizing = false; // Prevent infinite resize loops
        
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
            console.warn('Firebase initialization failed in MainHub:', error.message);
            return false;
        }
    }

    async initializeFirebase() {
        try {
            console.log('Starting Firebase initialization for MainHub...');
            
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
            console.log('Firebase Database initialized successfully for MainHub');
        } catch (error) {
            console.error('Failed to initialize Firebase for MainHub:', error);
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

    async checkStudentDataInFirebase() {
        try {
            console.log('🔍 MainHub: Checking for existing student data in Firebase...');
            
            // Get current user from localStorage
            const userDataStr = localStorage.getItem('sci_high_user');
            if (!userDataStr) {
                console.log('ℹ️ MainHub: No user data found in localStorage');
                return false;
            }
            
            const currentUser = JSON.parse(userDataStr);
            const studentId = currentUser.studentId || currentUser.uid;
            
            if (!studentId) {
                console.log('ℹ️ MainHub: No student ID found in user data');
                return false;
            }
            
            console.log('🔍 MainHub: Searching for student data with ID:', studentId);
            
            // Ensure Firebase is initialized
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                console.log('⚠️ MainHub: Firebase not initialized, cannot check student data');
                return false;
            }
            
            // Search for any gameplay data for this student
            const gameplayRef = this.database.ref('gameplay_data');
            const snapshot = await gameplayRef.orderByChild('studentId').equalTo(studentId).limitToFirst(1).once('value');
            
            const hasData = snapshot.exists();
            console.log(`${hasData ? '✅' : 'ℹ️'} MainHub: Student ${studentId} ${hasData ? 'has' : 'does not have'} existing data in Firebase`);
            
            return hasData;
            
        } catch (error) {
            console.error('❌ MainHub: Error checking student data in Firebase:', error);
            return false;
        }
    }

    preload() {
        this.load.image('MainHubBG', 'assets/img/mainhub/MainHubBG.png');
        this.load.image('icon1', 'assets/img/mainhub/PLAY_BUTTON.png');
        this.load.image('icon2', 'assets/img/mainhub/LIBRARY_ICON.png');
        this.load.image('icon3', 'assets/img/mainhub/PUZZLE.png');
        // this.load.image('icon5', 'assets/img/mainhub/canteenIcon.png');

        // Load Secretary image for dialogue
        this.load.image('Secretary', 'assets/sprites/npcs/secretary.png');

        this.load.audio('se_select', 'assets/sounds/se_select.wav');
        this.load.audio('se_confirm', 'assets/sounds/se_confirm.wav');
        this.load.audio('bgm_mainhub', 'assets/audio/bgm/bgm_mainhub.mp3');
        
        // Add font loading
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
    }    create() {
        // Stop or cleanup any other scenes that might be running
        const sceneManager = this.scene.manager;
        
        // Stop DungeonScene if it exists and is active/paused
        if (sceneManager.isActive('DungeonScene') || sceneManager.isPaused('DungeonScene')) {
            sceneManager.stop('DungeonScene');
        }
        
        // Stop any quiz scenes that might still be running
        const quizScenes = ['PythonQuizScene', 'JavaQuizScene', 'CQuizScene', 'CSharpQuizScene', 'CplusplusQuizScene', 'WebDesignQuizScene'];
        quizScenes.forEach(sceneName => {
            if (sceneManager.isActive(sceneName) || sceneManager.isPaused(sceneName)) {
                sceneManager.stop(sceneName);
            }
        });
        
        // Set up cameras first
        this.cameras.main.setBackgroundColor('#87ceeb');
        
        // Then initialize UI with delay to ensure everything is ready (now async)
        this.time.delayedCall(10, async () => await this.createUI());
        
        // Clean up any existing resize listener before adding a new one
        this.scale.off('resize', this.onResize, this);
        this.scale.on('resize', this.onResize, this);
    }

    async createUI() {
        if (this.uiElements.length) {
            this.uiElements.forEach(el => el.destroy());
            this.uiElements = [];
        }
        if (this.carousel) {
            this.carousel.destroy();
            this.carousel = null;
        }
        if (this.vnBox) {
            this.vnBox.destroy();
            this.vnBox = null;
        }
        // Clean up points display properly
        if (this.pointsDisplay) {
            if (this.pointsDisplay.destroy) {
                this.pointsDisplay.destroy();
            }
            this.pointsDisplay = null;
        }

        const { width, height } = this.scale;
        this.scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        const scaleFont = (size) => Math.round(size * this.scaleFactor);

        playExclusiveBGM(this, 'bgm_mainhub', { loop: true });
        
        // Ensure volume settings are applied to all sounds
        updateAllSoundVolumes(this);

        this.bg = this.add.tileSprite(0, 0, width, height, 'MainHubBG').setOrigin(0, 0);
        this.bg.setAlpha(0.5);
        if (this.cameras && this.cameras.main) {
            this.cameras.main.setBackgroundColor('#87ceeb');
        }
        this.uiElements.push(this.bg);

        // Add points display in top-right corner
        const pointsDisplay = gameManager.createPointsDisplay(this, width - 100 * this.scaleFactor, 40 * this.scaleFactor, this.scaleFactor);
        this.pointsDisplay = pointsDisplay;
        this.uiElements.push(pointsDisplay.container);

        this.se_hoverSound = addSE(this, 'se_select');
        this.se_confirmSound = addSE(this, 'se_confirm');

        // Create back button using the reusable component before cutscene logic
        const backButtonComponents = createBackButton(this, 'MainMenu');
        this.backButtonBg = backButtonComponents.buttonBg;
        this.backButton = backButtonComponents.backButton;
        this.uiElements.push(backButtonComponents.buttonBg, backButtonComponents.backButton);

        const iconKeys = ['icon1', 'icon2', 'icon3'];
        const iconInfo = [
            { heading: "Classroom", desc: "Meet your classmates!" },
            { heading: "Library", desc: "Read and research." },
            { heading: "Computer Lab", desc: "Take on different courses!" }
            // { heading: "Cafeteria", desc: "Take a break and eat." }
        ];

        // Check if student has data in Firebase to decide whether to show intro
        const hasFirebaseData = await this.checkStudentDataInFirebase();
        
        // Skip intro if student has Firebase data OR if they've already seen it
        const shouldSkipIntro = hasFirebaseData || onceOnlyFlags.hasSeen('mainhub_intro');
        
        if (!shouldSkipIntro) {
            console.log('🎬 MainHub: Showing intro cutscene for new student');
            // Hide UI elements during cutscene
            this.hideUIElementsForCutscene();
            
            // Show Secretary character image
            this.showSecretary();
            
            this.vnBox = new VNDialogueBox(this, [
                "Welcome! You must be the new student.",
                "I am the Principal's Secretary. I am happy to guide you on your first day.",
                "I'd recommend starting with the classroom to meet your classmates first.",
                "Building connections with your peers is just as important as learning!",
                "After that, feel free to explore the library for research and the computer lab for hands-on coding practice."
            ], () => {
                // Hide Secretary when dialogue ends
                this.hideSecretary();
                onceOnlyFlags.setSeen('mainhub_intro');
                // Show UI elements after cutscene
                this.showUIElementsAfterCutscene();
                this.createCarousel(iconKeys, iconInfo);
                
                // Start tutorial after carousel is created (if first time visiting hub)
                if (!onceOnlyFlags.hasSeen('mainhub_tutorial')) {
                    this.time.delayedCall(300, () => {
                        this.startHubTutorial();
                    });
                }
            });
            this.uiElements.push(this.vnBox);
        } else {
            if (hasFirebaseData) {
                console.log('✅ MainHub: Skipping intro - student has existing Firebase data');
                // Auto-mark intro as seen for returning students
                onceOnlyFlags.setSeen('mainhub_intro');
            } else {
                console.log('✅ MainHub: Skipping intro - already seen before');
            }
            
            this.createCarousel(iconKeys, iconInfo);
            
            // Skip tutorial as well for returning students with Firebase data
            if (hasFirebaseData) {
                onceOnlyFlags.setSeen('mainhub_tutorial');
                console.log('✅ MainHub: Skipping tutorial - returning student');
            } else if (!onceOnlyFlags.hasSeen('mainhub_tutorial')) {
                // Start tutorial after carousel is created (if first time visiting hub)
                this.time.delayedCall(300, () => {
                    this.startHubTutorial();
                });
            }
        }

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);

        // Debug feature: Add a key to manually trigger the tutorial (T key)
        this.input.keyboard.on('keydown-T', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                // Shift+T to trigger tutorial manually for testing
                this.startHubTutorial();
            }
        });

        // Debug feature: Reset tutorial flag with Shift+R for testing
        this.input.keyboard.on('keydown-R', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                onceOnlyFlags.flags['mainhub_tutorial'] = false;
                console.log('Main hub tutorial flag reset - tutorial will show on next visit');
            }
        });
    }

    startHubTutorial() {
        // Prepare tutorial steps with dynamic targets
        const tutorialSteps = [...MAIN_HUB_TUTORIAL_STEPS.firstTimeHub];
        
        // Set dynamic targets for tutorial steps
        tutorialSteps.forEach(step => {
            switch (step.target) {
                case 'pointsDisplay':
                    if (this.pointsDisplay && this.pointsDisplay.container) {
                        step.target = this.pointsDisplay.container;
                    }
                    break;
                case 'classroomIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        // Find the classroom icon (index 0) in carouselIcons
                        const classroomIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 0 && !icon.isLockIcon
                        );
                        if (classroomIcon) {
                            step.target = classroomIcon;
                        }
                    }
                    break;
                case 'libraryIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        // Find the library icon (index 1) in carouselIcons
                        const libraryIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 1 && !icon.isLockIcon
                        );
                        if (libraryIcon) {
                            step.target = libraryIcon;
                        }
                    }
                    break;
                case 'comlabIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        // Find the computer lab icon (index 2) in carouselIcons
                        const comlabIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 2 && !icon.isLockIcon
                        );
                        if (comlabIcon) {
                            step.target = comlabIcon;
                        }
                    }
                    break;
            }
        });

        // Start the tutorial
        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('mainhub_tutorial');
                console.log('Main hub tutorial completed!');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('mainhub_tutorial');
                console.log('Main hub tutorial skipped!');
            }
        });
    }

    createCarousel(iconKeys, iconInfo) {
        const { width, height } = this.scale;
        const scale = Math.min(width / 816, height / 624); // Calculate scale factor
        
        this.carousel = new Carousel(this, {
            iconCenterY: 200, // Moved up from 220 to 200 to give more room for text
            largeScale: 0.3,  
            smallScale: 0.15,
            iconToTitleGap: 140, // Increased gap between icon and title
            iconToDescGap: 80,   // Increased gap between title and description
            headingStyle: {
                fontSize: Math.max(32, 56 * scale) // Responsive font size with minimum
            },
            descStyle: {
                fontSize: Math.max(24, 36 * scale) // Responsive font size with minimum
            },
            sounds: {
                hover: 'se_hoverSound',
                confirm: 'se_confirmSound'
            }
        });

        // Add shutdown and destroy event listeners to clean up the carousel
        this.events.on('shutdown', () => {
            if (this.carousel) this.carousel.destroy();
        });
        this.events.on('destroy', () => {
            if (this.carousel) this.carousel.destroy();
        });

        this.carousel.create(iconKeys, iconInfo, (selectedItem, index) => {
            console.log('Selected:', selectedItem.heading);

            switch (selectedItem.heading) {
                case "Computer Lab":
                    this.scene.start('ComputerLab');
                    break;
                case "Classroom":
                    this.scene.start('Classroom');
                    break;
                case "Library":
                    this.scene.start('BaseLibraryScene', {
                        previousScene: 'MainHub',
                        playerData: this.playerData,
                        gameProgress: this.gameProgress
                    });
                    break;
                case "Cafeteria":
                    this.scene.start('Cafeteria');
                    break;
            }
        });
    }

    onResize() {
        // Prevent infinite loop by checking if we're already handling a resize
        if (this.isResizing) return;
        this.isResizing = true;
        
        // Just recreate the entire UI to avoid geometry issues (now async)
        this.time.delayedCall(50, async () => {
            await this.createUI();
            this.isResizing = false;
        });
    }

    update() {
        if (this.bg) {
            this.bg.tilePositionY -= 1;
        }
        // Update points display if it exists and is still valid
        if (this.pointsDisplay && this.pointsDisplay.update) {
            try {
                this.pointsDisplay.update();
            } catch (error) {
                console.warn('Points display update failed, clearing reference:', error);
                this.pointsDisplay = null;
            }
        }
    }

    showSecretary() {
        const { width, height } = this.scale;
        
        // Position character so half of her body is covered by the dialogue box
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
        
        this.uiElements.push(this.secretaryDisplay);
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
        // Hide points display
        if (this.pointsDisplay && this.pointsDisplay.container) {
            this.pointsDisplay.container.setVisible(false);
        }
        
        // Hide back button
        if (this.backButtonBg) {
            this.backButtonBg.setVisible(false);
        }
        if (this.backButton) {
            this.backButton.setVisible(false);
        }
    }

    showUIElementsAfterCutscene() {
        // Show points display
        if (this.pointsDisplay && this.pointsDisplay.container) {
            this.pointsDisplay.container.setVisible(true);
        }
        
        // Show back button
        if (this.backButtonBg) {
            this.backButtonBg.setVisible(true);
        }
        if (this.backButton) {
            this.backButton.setVisible(true);
        }
    }

    shutdown() {
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
        // Clean up scale resize listener
        this.scale.off('resize', this.onResize, this);
        
        // Clean up all UI elements and references when scene shuts down
        if (this.pointsDisplay) {
            if (this.pointsDisplay.destroy) {
                this.pointsDisplay.destroy();
            }
            this.pointsDisplay = null;
        }
        
        if (this.uiElements.length) {
            this.uiElements.forEach(el => {
                if (el && el.destroy) {
                    el.destroy();
                }
            });
            this.uiElements = [];
        }
        
        if (this.carousel) {
            this.carousel.destroy();
            this.carousel = null;
        }
        
        if (this.vnBox) {
            this.vnBox.destroy();
            this.vnBox = null;
        }
    }
}
