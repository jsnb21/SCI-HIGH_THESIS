import Phaser from 'phaser';
import Carousel from '../ui/carouselUI.js';
import VNDialogueBox from '../ui/VNDialogueBox.js';
import { createBackButton } from '../components/buttons/backbutton'; // <-- Add this import
import gameManager from '../gameManager.js';
import { onceOnlyFlags } from '../gameManager.js';
import TutorialManager from '../components/TutorialManager.js';
import { COMPUTER_LAB_TUTORIAL_STEPS } from '../components/TutorialConfig.js';
import LoadingScreen from '../ui/LoadingScreen.js';
import { playExclusiveBGM, updateSoundVolumes } from '../audioUtils.js';

export default class ComputerLab extends Phaser.Scene {
    constructor() {
        super({ key: 'ComputerLab' });
        this.tutorialManager = null;

        // Firebase initialization properties
        this.isFirebaseInitialized = false;
        this.database = null;
        this.initializationPromise = null;

        // Firebase config (match MainHub)
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

    preload() {
    
        // Load background and icon images
        this.load.image('BinaryBG', 'assets/img/bg/BinaryBG.png');
        this.load.image('Web_Design', 'assets/img/comlab/icons/web-design_logo.png');
        this.load.image('Python', 'assets/img/comlab/icons/python_logo.png');
        this.load.image('Java', 'assets/img/comlab/icons/java_logo.png');
        this.load.image('C', 'assets/img/comlab/icons/c_logo.png');
        this.load.image('C++', 'assets/img/comlab/icons/cplus_logo.png');
    this.load.image('C#', 'assets/img/comlab/icons/csharp_logo.png');
    // Placeholder icon for custom quizzes (reuse an existing or add a new asset path if available)
    this.load.image('CustomQuiz', 'assets/img/comlab/icons/CustomQuiz.png');

        // Load sound effects
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_computer-lab', 'assets/audio/bgm/bgm_computer-lab.mp3');

        // Load questions JSON
        this.load.json('questions', 'data/questions.json');

        // Add font loading
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');

        // Load Secretary image for cutscene
        this.load.image('Secretary', 'assets/sprites/npcs/secretary.png');
    }

    async create() {

        // Set up scrolling binary background (same as MainHub)
        const { width, height } = this.scale;
        this.bg = this.add.tileSprite(0, 0, width, height, 'BinaryBG').setOrigin(0, 0);
        this.bg.setAlpha(0.5);
        this.bg.setDepth(-10); // Ensure background renders behind all other elements
        if (this.cameras && this.cameras.main) {
            this.cameras.main.setBackgroundColor('#d6c8f2');
        }

    // Create a back button to return to the MainHub
    const backBtn = createBackButton(this, 'MainHub');
    this.backButtonBg = backBtn.buttonBg;
    this.backButton = backBtn.backButton;

        // Add points display in top-right corner (reuse width from above)
        const scaleFactor = Math.min(width / 816, this.scale.height / 624); // Using BASE_WIDTH and BASE_HEIGHT
        const pointsDisplay = gameManager.createPointsDisplay(this, width - 100 * scaleFactor, 40 * scaleFactor, scaleFactor);
        this.pointsDisplay = pointsDisplay;
        // Align points display vertically with the back button if possible
        if (backBtn && backBtn.buttonBg && this.pointsDisplay && this.pointsDisplay.container) {
            this.pointsDisplay.container.y = backBtn.buttonBg.y;
        }
        // Adjust points display X using logical width so it's further to the right but still inside
        if (this.pointsDisplay && this.pointsDisplay.container) {
            const pillHalfWidth = 50 * scaleFactor; // matches createPointsDisplay width (100 * scaleFactor) / 2
            const rightMargin = 20 * scaleFactor;   // small inset from the right edge
            this.pointsDisplay.container.x = this.scale.width - (pillHalfWidth + rightMargin);
        }

        // Add sound effects
        this.se_hoverSound = this.sound.add('se_select');
        this.se_confirmSound = this.sound.add('se_confirm');

        // Play computer lab background music
        playExclusiveBGM(this, 'bgm_computer-lab', { loop: true });
        updateSoundVolumes(this);        // Define carousel data
        const iconKeys = ['Web_Design', 'Python', 'Java', 'C', 'C++', 'C#', 'CustomQuiz'];
        const iconInfo = [
            { heading: "Web Design", desc: "Learn HTML, CSS & JavaScript", courseKey: "Web_Design" },
            { heading: "Python", desc: "Learn Python", courseKey: "Python" },
            { heading: "Java", desc: "Learn Java", courseKey: "Java" },
            { heading: "C", desc: "Learn about C", courseKey: "C" },
            { heading: "C++", desc: "Learn about C++", courseKey: "C++" },
            { heading: "C#", desc: "Learn about C#", courseKey: "C#" },
            { heading: "Custom Quiz", desc: "Play a professor-made quiz", courseKey: "CustomQuiz" }
        ];

    // Create the carousel with the icon keys and info
    this.createCarousel(iconKeys, iconInfo);

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);

        // Check if this is the first time visiting the computer lab
        if (!onceOnlyFlags.hasSeen('computerlab_tutorial')) {
            // Delay tutorial start to ensure all UI elements are created
            this.time.delayedCall(500, () => {
                this.startComLabTutorial();
            });
        }

        // Debug features
        this.input.keyboard.on('keydown-T', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                this.startComLabTutorial();
            }
        });

        this.input.keyboard.on('keydown-R', () => {
            if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
                onceOnlyFlags.flags['computerlab_tutorial'] = false;
            }
        });

        // (Notification debug code removed after verification)
    }

    // ---------- Firebase helpers (mirrors MainHub) ----------
    async ensureFirebaseInitialized() {
        if (this.isFirebaseInitialized) return true;
        if (!this.initializationPromise) this.initializationPromise = this.initializeFirebase();
        try {
            await this.initializationPromise;
            return this.isFirebaseInitialized;
        } catch (e) {
            console.warn('Firebase initialization failed in ComputerLab:', e?.message || e);
            return false;
        }
    }

    async initializeFirebase() {
        try {
            if (!navigator.onLine) throw new Error('No internet connection detected');
            if (typeof window.firebase === 'undefined') {
                await this.loadFirebaseScripts();
            }
            let retries = 0;
            while (typeof window.firebase === 'undefined' && retries < 10) {
                await new Promise(r => setTimeout(r, 300));
                retries++;
            }
            if (typeof window.firebase === 'undefined') {
                throw new Error('Firebase failed to load after multiple attempts');
            }
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(this.firebaseConfig);
            }
            this.database = window.firebase.database();
            await this.database.ref('.info/connected').once('value');
            this.isFirebaseInitialized = true;
        } catch (err) {
            console.error('Failed to initialize Firebase for ComputerLab:', err);
            this.isFirebaseInitialized = false;
            throw err;
        }
    }

    async loadFirebaseScripts() {
        return new Promise((resolve, reject) => {
            if (typeof window.firebase !== 'undefined') return resolve();
            const scripts = [
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'
            ];
            let loaded = 0;
            const timeout = setTimeout(() => reject(new Error('Firebase script loading timeout')), 10000);
            scripts.forEach(src => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = () => {
                    loaded++;
                    if (loaded === scripts.length) { clearTimeout(timeout); resolve(); }
                };
                s.onerror = () => { clearTimeout(timeout); reject(new Error(`Failed to load Firebase script: ${src}`)); };
                document.head.appendChild(s);
            });
        });
    }

    async checkStudentDataInFirebase() {
        try {
            const raw = localStorage.getItem('sci_high_user');
            if (!raw) return false;
            const currentUser = JSON.parse(raw);
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
            if (!studentId) return false;
            const ok = await this.ensureFirebaseInitialized();
            if (!ok) return false;
            const snap = await this.database.ref('gameplay_data')
                .orderByChild('studentId').equalTo(studentId).limitToFirst(1).once('value');
            return snap.exists();
        } catch (e) {
            console.error('❌ ComputerLab: Error checking student data in Firebase:', e);
            return false;
        }
    }

    createCarousel(iconKeys, iconInfo) {
        // Initialize the carousel
        this.carousel = new Carousel(this, {
            centerY: 400,
            spacing: 400,
            largeScale: 0.25,
            smallScale: 0.1,
            headingStyle: { fontSize: 48 },
            descStyle: { fontSize: 26 },
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

        // Determine locked states based on game progress
        const lockedStates = iconInfo.map(info => {
            if(info.courseKey === 'CustomQuiz') return false; // always unlocked
            return !gameManager.isCourseUnlocked(info.courseKey);
        });

        // Create the carousel with selection callback and locked states
        this.carousel.create(iconKeys, iconInfo, async (selectedItem, index) => {
            // Resolve course display name and topic for routing
            let courseName = '';
            let topic = '';
            if (selectedItem.heading === 'Web Design') { courseName = 'Web Design Course - Roguelike Mode'; topic = 'webdesign'; }
            else if (selectedItem.heading === 'Python') { courseName = 'Python Course - Roguelike Mode'; topic = 'python'; }
            else if (selectedItem.heading === 'Java') { courseName = 'Java Course - Roguelike Mode'; topic = 'java'; }
            else if (selectedItem.heading === 'C') { courseName = 'C Programming Course - Roguelike Mode'; topic = 'c'; }
            else if (selectedItem.heading === 'C++') { courseName = 'C++ Course - Roguelike Mode'; topic = 'cpp'; }
            else if (selectedItem.heading === 'C#') { courseName = 'C# Course - Roguelike Mode'; topic = 'csharp'; }

            if (selectedItem.heading === 'Custom Quiz') {
                // Go to selection scene first so player can choose which custom quiz
                LoadingScreen.transitionToCourse(this, 'CustomQuizSelectScene', 'Custom Quiz Selection', {});
                return;
            }

            // First-time gate: if user has no gameplay data and hasn't seen Computer Lab intro
            const hasData = await this.checkStudentDataInFirebase();
            const shouldShowIntro = !hasData && !onceOnlyFlags.hasSeen('computerlab_intro');

            if (shouldShowIntro) {
                await this.runComputerLabIntro();
                // After cutscene, go to sample gameplay tutorial scene
                LoadingScreen.transitionToCourse(this, 'SampleGameplayScene', 'Sample Gameplay Tutorial', {
                    nextSceneName: 'MainGameplay',
                    nextCourseName: courseName,
                    nextSceneData: { topic }
                }, 1200);
            } else {
                // Proceed to actual gameplay
                LoadingScreen.transitionToCourse(this, 'MainGameplay', courseName, { topic });
            }
        }, lockedStates);
    }
    update() {
        if (this.bg) {
            // Enhanced scrolling background behind carousel (same as MainHub)
            this.bg.tilePositionY -= 0.5; // Slower vertical scroll for more subtle effect
            this.bg.tilePositionX -= 0.2; // Add slight horizontal drift for dynamic feel
        }
        
        // Update points display if it exists
        if (this.pointsDisplay) {
            this.pointsDisplay.update();
        }
    }

    startComLabTutorial() {
        const tutorialSteps = [...COMPUTER_LAB_TUTORIAL_STEPS.firstTimeComLab];
        
        // Set dynamic targets
        tutorialSteps.forEach(step => {
            switch (step.target) {
                case 'carousel':
                    if (this.carousel && this.carousel.bgPanel) {
                        step.target = this.carousel.bgPanel;
                    }
                    break;
                case 'webDesignIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        const webDesignIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 0 && !icon.isLockIcon
                        );
                        if (webDesignIcon) {
                            step.target = webDesignIcon;
                        }
                    }
                    break;
                case 'pythonIcon':
                    if (this.carousel && this.carousel.carouselIcons) {
                        const pythonIcon = this.carousel.carouselIcons.find(icon => 
                            icon.iconIndex === 1 && !icon.isLockIcon
                        );
                        if (pythonIcon) {
                            step.target = pythonIcon;
                        }
                    }
                    break;
            }
        });

        this.tutorialManager.init(tutorialSteps, {
            onComplete: () => {
                onceOnlyFlags.setSeen('computerlab_tutorial');
            },
            onSkip: () => {
                onceOnlyFlags.setSeen('computerlab_tutorial');
            }
        });
    }

    // ---------- Cutscene helpers ----------
    hideUIElementsForCutscene() {
        if (this.pointsDisplay && this.pointsDisplay.container) this.pointsDisplay.container.setVisible(false);
        if (this.carousel) {
            if (this.carousel.fadeTo) this.carousel.fadeTo(0, 250);
            if (this.carousel.setInteractive) this.carousel.setInteractive(false);
            if (this.carousel.setSoundsEnabled) this.carousel.setSoundsEnabled(false);
        }
        if (this.backButtonBg) this.backButtonBg.setVisible(false);
        if (this.backButton) this.backButton.setVisible(false);
    }

    showUIElementsAfterCutscene() {
        if (this.pointsDisplay && this.pointsDisplay.container) this.pointsDisplay.container.setVisible(true);
        if (this.carousel) {
            if (this.carousel.fadeTo) this.carousel.fadeTo(1, 250);
            if (this.carousel.setInteractive) this.carousel.setInteractive(true);
            if (this.carousel.setSoundsEnabled) this.carousel.setSoundsEnabled(true);
        }
        if (this.backButtonBg) this.backButtonBg.setVisible(true);
        if (this.backButton) this.backButton.setVisible(true);
    }

    showSecretary() {
        const { width, height } = this.scale;
        const characterX = width * 0.25;
        const characterY = height * 0.7;
        const characterScale = (width < 768 || height < 600) ? 0.35 : 0.8;

        this.secretaryDisplay = this.add.image(characterX, characterY, 'Secretary');
        this.secretaryDisplay.setOrigin(0.5, 0.5);
        this.secretaryDisplay.setScale(characterScale);
        this.secretaryDisplay.setDepth(5);
        this.secretaryDisplay.setAlpha(0);
        this.tweens.add({ targets: this.secretaryDisplay, alpha: 1, duration: 300, ease: 'Power2' });
    }

    hideSecretary() {
        if (this.secretaryDisplay) {
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

    async runComputerLabIntro() {
        return new Promise((resolve) => {
            this.hideUIElementsForCutscene();
            this.showSecretary();

            const lines = [
                "Welcome to the Computer Lab! Here, you'll practice coding across different courses.",
                "Each course takes you into a fast-paced roguelike challenge built around problem solving.",
                "Move around the board, watch the timer, avoid goblin thugs, and collect helpful power-ups.",
                "Before you start, Lily, Damian, and Finley will walk you through the basics in a quick demo."
            ];

            const box = new VNDialogueBox(this, lines, () => {
                this.hideSecretary();
                onceOnlyFlags.setSeen('computerlab_intro');
                this.time.delayedCall(50, () => {
                    this.showUIElementsAfterCutscene();
                    resolve();
                });
            });
            // Keep a reference so GC doesn't drop it early
            this._vnBox = box;
        });
    }

    shutdown() {
        // Clean up tutorial manager
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
        // Clean up carousel
        if (this.carousel) {
            this.carousel.destroy();
            this.carousel = null;
        }
        
        // Clean up points display
        if (this.pointsDisplay) {
            if (this.pointsDisplay.destroy) {
                this.pointsDisplay.destroy();
            }
            this.pointsDisplay = null;
        }
    }
}