import Phaser from 'phaser';
// Removed char1, char2, char3, char4, char5 import as we use chibi versions loaded in preload()
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
// Removed showStyledConfirm import as character detail modal has been retired

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
            
            // First check if we have internet connectivity
            if (!navigator.onLine) {
                throw new Error('No internet connection detected');
            }
            
            // Check if Firebase is already loaded
            if (typeof window.firebase === 'undefined') {
                await this.loadFirebaseScripts();
            }
            
            // Wait a bit for Firebase to be available
            let retries = 0;
            while (typeof window.firebase === 'undefined' && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 300));
                retries++;
            }
            
            if (typeof window.firebase === 'undefined') {
                throw new Error('Firebase failed to load after multiple attempts - check your internet connection');
            }
            
            // Initialize Firebase app if not already done
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(this.firebaseConfig);
            }
            
            // Test Firebase connection
            this.database = window.firebase.database();
            
            // Try a simple connection test
            await this.database.ref('.info/connected').once('value');
            
            this.isFirebaseInitialized = true;
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
        } catch (error) {
            console.error('Error loading Firebase scripts:', error);
            throw error;
        }
    }

    async checkStudentDataInFirebase() {
        try {
            
            // Get current user from localStorage
            const userDataStr = localStorage.getItem('sci_high_user');
            if (!userDataStr) {
                return false;
            }
            
            const currentUser = JSON.parse(userDataStr);
            // Resolve identifier consistent with uploads (email for general users)
            const sanitizeKey = (s) => typeof s === 'string' ? s.replace(/[.#$\/\[\]]/g, '_') : s;
            let studentId;
            if (currentUser && (currentUser.type === 'general' || currentUser.userType === 'general')) {
                const email = currentUser.email || (currentUser.profile && currentUser.profile.email);
                studentId = email ? sanitizeKey(String(email).toLowerCase()) : sanitizeKey(currentUser.uid);
            } else if (currentUser && (currentUser.type === 'student' || currentUser.userType === 'student')) {
                studentId = currentUser.studentId || sanitizeKey(currentUser.uid);
            } else {
                studentId = currentUser.studentId || sanitizeKey(currentUser.uid);
            }
            
            if (!studentId) {
                return false;
            }
            
            
            // Ensure Firebase is initialized
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                return false;
            }
            
            // Search for any gameplay data for this student
            const gameplayRef = this.database.ref('gameplay_data');
            const snapshot = await gameplayRef.orderByChild('studentId').equalTo(studentId).limitToFirst(1).once('value');
            
            const hasData = snapshot.exists();
            
            return hasData;
            
        } catch (error) {
            console.error('❌ Classroom: Error checking student data in Firebase:', error);
            return false;
        }
    }

    preload() {
        // Load scrolling binary background (same as MainHub)
        this.load.image('BinaryBG', 'assets/img/bg/BinaryBG.png');
        
        // Load Principal Richard image for intro dialogue
        this.load.image('Secretary', 'assets/sprites/npcs/secretary.png');
        
        // Load character images from public/assets/sprites/npcs with chibi versions
        this.load.image('Lily', 'assets/sprites/npcs/chibiLily.png');
        this.load.image('Damian', 'assets/sprites/npcs/chibiDamian.png');
        this.load.image('Finley', 'assets/sprites/npcs/chibiFinley.png');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_classroom', 'assets/audio/bgm/bgm_classroom.mp3');
        
        // Add error handling for missing images
        this.load.on('loaderror', (file) => {
            console.error('Failed to load file:', file.src);
        });
        
        this.load.on('filecomplete', (key, type, data) => {
            if (type === 'image') {
            }
        });
    }

    create() {
        // Use direct scale access like MainHub for proper background sizing
        const { width, height } = this.scale;

    // Character detail modal retired; no modal state needed

        // Add scrolling binary background (same as MainHub)
        this.bg = this.add.tileSprite(0, 0, width, height, 'BinaryBG').setOrigin(0, 0);
        this.bg.setAlpha(0.5);
        this.bg.setDepth(-10); // Ensure background renders behind all other elements
        if (this.cameras && this.cameras.main) {
            this.cameras.main.setBackgroundColor('#b2e2b1');
        }

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

        // Carousel data using MainHub-style structure
        const charKeys = ['Lily', 'Damian', 'Finley'];
        const charInfo = [
            { heading: "Lily", desc: "She can teach you more about SCI-HIGH." },
            { heading: "Damian", desc: "He knows a lot about the main website." },
            { heading: "Finley", desc: "He'll guide you on how the Computer Lab works." }
        ];
        
        // Character detail modal removed; extended progress data no longer needed here

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



        // Check if student has data in Firebase to decide whether to show intro
        const hasFirebaseData = await this.checkStudentDataInFirebase();
        
        // Skip intro if student has Firebase data OR if they've already seen it
        const shouldSkipIntro = hasFirebaseData || onceOnlyFlags.hasSeen('classroom_intro');
        
        if (!shouldSkipIntro) {
            // Hide UI elements during cutscene
            this.hideUIElementsForCutscene();
            
            // Show Secretary character image
            this.showSecretary();
            
            this.vnBox = new VNDialogueBox(this, [
                "Welcome to the classroom! I see you followed my advice.",
                "These are your classmates, they are all profecient in different programming languages.",
                "Each of them can teach you the basics of their specialty before you tackle the challenges in the Computer Lab.",
                "Lily knows Web Design, Damian is great with Java, and Finley is our C++ prodigy.",
                "Make sure to talk to them and learn from their experience. They'll help you prepare for the coding challenges ahead!"
            ], () => {
                // Hide Secretary when dialogue ends
                this.hideSecretary();
                onceOnlyFlags.setSeen('classroom_intro');
                // Show UI elements after cutscene
                this.showUIElementsAfterCutscene();
                this.createCarousel(charKeys, charInfo);
                
                // Start tutorial after carousel is created (if first time visiting classroom)
                if (!onceOnlyFlags.hasSeen('classroom_tutorial')) {
                    this.time.delayedCall(300, () => {
                        this.startClassroomTutorial();
                    });
                }
            });
        } else {
            if (hasFirebaseData) {
                // Auto-mark intro as seen for returning students
                onceOnlyFlags.setSeen('classroom_intro');
            }
            
            this.createCarousel(charKeys, charInfo);
            
            // Skip tutorial as well for returning students with Firebase data
            if (hasFirebaseData) {
                onceOnlyFlags.setSeen('classroom_tutorial');
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
            }
        });
    }

    createCarousel(charKeys, charInfo) {
        const { width, height } = this.scale;
        const scale = Math.min(width / 816, height / 624); // Calculate scale factor like MainHub
        
        this.carousel = new Carousel(this, {
            iconCenterY: 200,
            largeScale: 0.3,
            smallScale: 0.15,
            iconToTitleGap: 120,
            iconToDescGap: 60,
            headingStyle: {
                fontSize: 48
            },
            descStyle: {
                fontSize: 26
            },
            sounds: {
                hover: 'se_select',
                confirm: 'se_confirm'
            }
        });

        // Add shutdown and destroy event listeners to clean up the carousel (MainHub style)
        this.events.on('shutdown', () => {
            if (this.carousel) this.carousel.destroy();
        });
        this.events.on('destroy', () => {
            if (this.carousel) this.carousel.destroy();
        });

        this.carousel.create(charKeys, charInfo, (_selectedItem, index) => {
            // Direct navigation: immediately enter story scene
            const key = charKeys[index];
            const directStoryMap = {
                'Lily': 'LilyStory',
                'Damian': 'DamianStory',
                'Finley': 'FinleyStory'
            };
            const storySceneKey = directStoryMap[key];
            if (storySceneKey) {
                if (this.se_confirmSound) this.se_confirmSound.play();
                if (!this.scene.get(storySceneKey)) {
                    console.warn(`[Classroom] Story scene '${storySceneKey}' not registered.`);
                } else {
                    this.scene.start(storySceneKey);
                }
            } else {
                console.warn('[Classroom] No mapped story scene for character:', key);
            }
        });
    }

    destroyCarousel() {
        // Clean up carousel (MainHub style)
        if (this.carousel) {
            this.carousel.destroy();
            this.carousel = null;
        }
        
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
    // Modal state removed (character detail modal retired)
        
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

    // showCharacterBox removed (direct navigation implemented)

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

        // Use the configured first-time classroom steps and resolve dynamic targets
        const tutorialSteps = [...(CLASSROOM_TUTORIAL_STEPS.firstTimeClassroom || [])].map(step => ({ ...step }));

        // Map any string targets to actual scene elements (e.g., carousel)
        tutorialSteps.forEach(step => {
            switch (step.target) {
                case 'carousel':
                    // Prefer bgPanel (used by Carousel), fallback to container if available
                    if (this.carousel && (this.carousel.bgPanel || this.carousel.container)) {
                        step.target = this.carousel.bgPanel || this.carousel.container;
                    }
                    break;
                default:
                    // No-op for steps without targets or with already-resolved objects
                    break;
            }
        });

        // Start the tutorial
        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('classroom_tutorial');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('classroom_tutorial');
            }
        });
    }

    update() {
        if (this.bg) {
            // Enhanced scrolling background behind carousel (same as MainHub)
            this.bg.tilePositionY -= 0.5; // Slower vertical scroll for more subtle effect
            this.bg.tilePositionX -= 0.2; // Add slight horizontal drift for dynamic feel
        }
    }
}