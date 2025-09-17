import Phaser from 'phaser';
import { DEFAULT_TEXT_STYLE } from '../game';
import { updateSoundVolumes, playExclusiveBGM } from '../audioUtils';
import { getAllSaveKeys, loadGame, hasExistingSave, clearCurrentUserSave, syncSaveDataOnLogin } from '../save';
import gameManager, { onceOnlyFlags } from '../gameManager.js';
import LoadingScreen from '../ui/LoadingScreen';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getResponsivePosition,
    createResponsiveTextStyle,
    createResponsiveButton,
    getSafeArea,
    createDebouncedClickHandler
} from '../utils/mobileUtils.js';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
        
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
            console.warn('Firebase initialization failed in MainMenu:', error.message);
            return false;
        }
    }

    async initializeFirebase() {
        try {
            console.log('Starting Firebase initialization for MainMenu...');
            
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
            console.log('Firebase Database initialized successfully for MainMenu');
        } catch (error) {
            console.error('Failed to initialize Firebase for MainMenu:', error);
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
            console.log('🔍 Checking for existing student data in Firebase...');
            
            // Get current user from localStorage
            const userDataStr = localStorage.getItem('sci_high_user');
            if (!userDataStr) {
                console.log('ℹ️ No user data found in localStorage');
                return false;
            }
            
            const currentUser = JSON.parse(userDataStr);
            const studentId = currentUser.studentId || currentUser.uid;
            
            if (!studentId) {
                console.log('ℹ️ No student ID found in user data');
                return false;
            }
            
            console.log('🔍 Searching for student data with ID:', studentId);
            
            // Ensure Firebase is initialized
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                console.log('⚠️ Firebase not initialized, cannot check student data');
                return false;
            }
            
            // Search for any gameplay data for this student
            const gameplayRef = this.database.ref('gameplay_data');
            const snapshot = await gameplayRef.orderByChild('studentId').equalTo(studentId).limitToFirst(1).once('value');
            
            const hasData = snapshot.exists();
            console.log(`${hasData ? '✅' : 'ℹ️'} Student ${studentId} ${hasData ? 'has' : 'does not have'} existing data in Firebase`);
            
            if (hasData) {
                // Also check if student info exists in localStorage
                const studentInfo = localStorage.getItem('studentInfo');
                if (studentInfo) {
                    console.log('✅ Student info also found in localStorage');
                    return true;
                } else {
                    // If Firebase data exists but no localStorage info, extract it from Firebase
                    const firstRecord = Object.values(snapshot.val())[0];
                    if (firstRecord.firstName && firstRecord.lastName) {
                        console.log('📋 Extracting student info from Firebase data');
                        const extractedStudentInfo = {
                            firstName: firstRecord.firstName,
                            lastName: firstRecord.lastName,
                            fullName: firstRecord.fullName || `${firstRecord.firstName} ${firstRecord.lastName}`, // Include fullName
                            department: firstRecord.department || '',
                            strandYear: firstRecord.strandYear || '',
                            timestamp: Date.now()
                        };
                        localStorage.setItem('studentInfo', JSON.stringify(extractedStudentInfo));
                        localStorage.setItem('recentStudentData', JSON.stringify(extractedStudentInfo));
                        console.log('✅ Student info extracted and saved to localStorage');
                    }
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error checking student data in Firebase:', error);
            return false;
        }
    }

    preload() {
        this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
        this.load.audio('se_select', 'assets/audio/se/se_select.wav');
        this.load.audio('se_confirm', 'assets/audio/se/se_confirm.wav');
        this.load.audio('bgm_title', 'assets/audio/bgm/bgm_title.mp3');
        
        // Load the logo image
        this.load.image('game_logo', 'assets/img/mainmenu/SCI-HIGH_LOGO.png');
        
        // Load cloud images - replace with your actual cloud image paths
        this.load.image('clouds', 'assets/img/mainmenu/clouds.png');
    }

    async create() {
        console.log('MainMenu create() called');
        
        // Sync save data with Firebase on scene load
        try {
            await syncSaveDataOnLogin();
            console.log('MainMenu: Save data synced successfully');
        } catch (error) {
            console.warn('MainMenu: Failed to sync save data:', error);
        }
        
        let scaleInfo;
        try {
            scaleInfo = getScaleInfo(this);
            console.log('ScaleInfo:', scaleInfo);
        } catch (error) {
            console.warn('Mobile utils failed, using fallback:', error);
            const { width, height } = this.scale;
            scaleInfo = {
                width,
                height,
                finalScale: Math.min(width / 1920, height / 1080),
                isMobile: width < 768 || height < 600,
                isPortrait: height > width
            };
        }
        
        const { width, height } = scaleInfo;
        let safeArea;
        try {
            safeArea = getSafeArea(scaleInfo);
        } catch (error) {
            console.warn('SafeArea fallback');
            const margin = scaleInfo.isMobile ? 20 * scaleInfo.finalScale : 10 * scaleInfo.finalScale;
            safeArea = {
                left: margin,
                right: width - margin,
                top: margin,
                bottom: height - margin,
                width: width - (margin * 2),
                height: height - (margin * 2)
            };
        }
        
        console.log('Screen size:', width, 'x', height);
        console.log('Is mobile:', scaleInfo.isMobile);
        
        const se_hoverSound = this.sound.add('se_select');
        const se_confirmSound = this.sound.add('se_confirm');

        playExclusiveBGM(this, 'bgm_title', { loop: true });
        updateSoundVolumes(this);

        this.input.once('pointerdown', () => {
            se_hoverSound.play({ volume: 0 });
            se_hoverSound.stop();
        });

        // Set a solid color background
        this.cameras.main.setBackgroundColor('#87ceeb');

        // Create scrolling clouds behind everything
        this.createScrollingClouds();

        // Add the logo image - responsive positioning with better desktop scaling
        let logoPos;
        try {
            logoPos = getResponsivePosition(scaleInfo, 'center', { 
                x: 0, 
                y: scaleInfo.isMobile ? -280 * scaleInfo.finalScale : -310 * scaleInfo.finalScale 
            });
        } catch (error) {
            logoPos = { 
                x: width / 2, 
                y: scaleInfo.isMobile ? height / 2 - 280 * scaleInfo.finalScale : height / 2 - 310 * scaleInfo.finalScale 
            };
        }
        
        const logo = this.add.image(logoPos.x, logoPos.y, 'game_logo');
        
        // Scale the logo appropriately - reduced desktop scale to prevent overlap
        const logoScale = scaleInfo.isMobile ? 
            (scaleInfo.isPortrait ? 1.0 * scaleInfo.finalScale : 0.9 * scaleInfo.finalScale) : 
            0.8 * scaleInfo.finalScale; // Reduced from 1.3 to 0.8 for desktop
        logo.setScale(logoScale);
        
        // Add fade-in animation for the logo
        logo.setAlpha(0);
        this.tweens.add({
            targets: logo,
            alpha: 1,
            duration: 600,
            delay: 200,
            ease: 'Quad.easeOut'
        });
        
        // Optional: Add a subtle floating animation to the logo
        this.tweens.add({
            targets: logo,
            y: logo.y - 10 * scaleInfo.finalScale,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 800
        });

        // Menu button spacing and positioning - different for mobile and desktop
        if (scaleInfo.isMobile) {
            // Mobile: 2x2 grid layout with bigger buttons (moved lower)
            const horizontalSpacing = 400 * scaleInfo.finalScale; // Increased horizontal gap between buttons in same row
            const verticalSpacing = 30 * scaleInfo.finalScale;    // Increased vertical gap between rows
            
            const startY = scaleInfo.isPortrait ? 
                height / 2 + 180 * scaleInfo.finalScale : 
                height / 2 + 140 * scaleInfo.finalScale;
            
            // Calculate button positions for 2x2 grid - buttons will auto-size to fit text
            const centerX = width / 2;
            const leftX = centerX - horizontalSpacing;
            const rightX = centerX + horizontalSpacing;
            const topY = startY;
            const bottomY = startY + 120 * scaleInfo.finalScale + verticalSpacing; // Increased row spacing

            // Menu button data for mobile 2x2 grid
            const menuButtons = [
                // Top row
                { label: 'Start Adventure', x: leftX, y: topY, onClick: async () => {
                    se_confirmSound.play();
                    await this.handleAdventureStart();
                }},
                { label: 'View Progress', x: rightX, y: topY, onClick: () => {
                    se_confirmSound.play();
                    this.showProgressSummary();
                }},
                // Bottom row
                { label: 'Options', x: leftX, y: bottomY, onClick: () => {
                    se_confirmSound.play();
                    LoadingScreen.transitionToScene(this, 'OptionsScene', 800);
                }},
                { label: 'Quit', x: rightX, y: bottomY, onClick: () => {
                    se_confirmSound.play();
                    this.showQuitConfirmation(se_hoverSound, se_confirmSound);
                }},
            ];

            // Create menu buttons with consistent sizes and 2x2 grid positioning
            menuButtons.forEach((btn, i) => {
                createMenuButton(this, btn.x, btn.y, btn.label, btn.onClick, se_hoverSound, i * 80 + 400, scaleInfo, menuButtons);
            });
        } else {
            // Desktop: vertical layout with better spacing to prevent overlap
            const buttonSpacing = 110 * scaleInfo.finalScale; // Increased from 85 to 110 for much better spacing
            const startY = height / 2 + 40 * scaleInfo.finalScale; // Moved up from +120 to +40

            // Menu button data with responsive positioning
            const menuButtons = [
                { label: 'Start Adventure', y: startY, onClick: async () => {
                    se_confirmSound.play();
                    await this.handleAdventureStart();
                }},
                { label: 'View Progress', y: startY + buttonSpacing, onClick: () => {
                    se_confirmSound.play();
                    this.showProgressSummary();
                }},
                { label: 'Options', y: startY + (buttonSpacing * 2), onClick: () => {
                    se_confirmSound.play();
                    LoadingScreen.transitionToScene(this, 'OptionsScene', 'Loading...', 800);
                }},
                { label: 'Quit', y: startY + (buttonSpacing * 3), onClick: () => {
                    se_confirmSound.play();
                    this.showQuitConfirmation(se_hoverSound, se_confirmSound);
                }},
            ];

            // Create menu buttons with consistent sizes and backgrounds and effects
            menuButtons.forEach((btn, i) => {
                createMenuButton(this, width / 2, btn.y, btn.label, btn.onClick, se_hoverSound, i * 80 + 400, scaleInfo, menuButtons);
            });
        }
        
        // Auto-load student progress after creating UI
        this.autoLoadStudentProgress();
    }

    createScrollingClouds() {
        let scaleInfo;
        try {
            scaleInfo = getScaleInfo(this);
        } catch (error) {
            const { width, height } = this.scale;
            scaleInfo = {
                width,
                height,
                finalScale: Math.min(width / 1920, height / 1080),
                isMobile: width < 768 || height < 600
            };
        }
        const { width, height } = scaleInfo;
        
        // Create multiple cloud layers for parallax depth
        this.cloudLayers = [];
        
        // Far background layer (slowest, smallest, most transparent)
        const farBgLayer = this.add.group();
        for (let i = 0; i < 6; i++) {
            const cloud = this.add.image(
                (width / 4) * i - width, 
                height / 2 - 150 + Math.random() * 80, 
                'clouds'
            );
            cloud.setScale(0.3 + Math.random() * 0.2);
            cloud.setAlpha(0.15);
            cloud.setTint(0xe6f2ff);
            farBgLayer.add(cloud);
        }
        this.cloudLayers.push({ group: farBgLayer, speed: 0.2, depth: 1 });
        
        // Mid background layer
        const midBgLayer = this.add.group();
        for (let i = 0; i < 5; i++) {
            const cloud = this.add.image(
                (width / 3) * i - width / 2, 
                height / 2 - 80 + Math.random() * 120, 
                'clouds'
            );
            cloud.setScale(0.5 + Math.random() * 0.3);
            cloud.setAlpha(0.25);
            cloud.setTint(0xf0f8ff);
            midBgLayer.add(cloud);
        }
        this.cloudLayers.push({ group: midBgLayer, speed: 0.4, depth: 2 });
        
        // Middle layer
        const midLayer = this.add.group();
        for (let i = 0; i < 4; i++) {
            const cloud = this.add.image(
                (width / 2.5) * i - width / 3, 
                height / 2 + Math.random() * 160 - 80, 
                'clouds'
            );
            cloud.setScale(0.6 + Math.random() * 0.3);
            cloud.setAlpha(0.35);
            cloud.setTint(0xffffff);
            midLayer.add(cloud);
        }
        this.cloudLayers.push({ group: midLayer, speed: 0.7, depth: 3 });
        
        // Near layer
        const nearLayer = this.add.group();
        for (let i = 0; i < 3; i++) {
            const cloud = this.add.image(
                (width / 2) * i - width / 4, 
                height / 2 + 80 + Math.random() * 140, 
                'clouds'
            );
            cloud.setScale(0.8 + Math.random() * 0.4);
            cloud.setAlpha(0.45);
            cloud.setTint(0xf8fcff);
            nearLayer.add(cloud);
        }
        this.cloudLayers.push({ group: nearLayer, speed: 1.0, depth: 4 });
        
        // Foreground layer (fastest, largest, most visible)
        const fgLayer = this.add.group();
        for (let i = 0; i < 2; i++) {
            const cloud = this.add.image(
                width * i - width / 6, 
                height / 2 + 180 + Math.random() * 100, 
                'clouds'
            );
            cloud.setScale(1.0 + Math.random() * 0.5);
            cloud.setAlpha(0.6);
            cloud.setTint(0xffffff);
            fgLayer.add(cloud);
        }
        this.cloudLayers.push({ group: fgLayer, speed: 1.5, depth: 5 });
        
        // Start the parallax scrolling
        this.startParallaxScrolling();
    }
    
    startParallaxScrolling() {
        const { width } = this.scale;
        const baseSpeed = 30; // Base scrolling speed in pixels per second
        
        this.cloudLayers.forEach(layer => {
            const layerSpeed = baseSpeed * layer.speed;
            
            layer.group.children.entries.forEach((cloud, index) => {
                // Add slight variation to each cloud's speed within the layer
                const cloudSpeed = layerSpeed + (Math.random() - 0.5) * 5;
                
                // Create continuous parallax movement
                const moveCloud = () => {
                    this.tweens.add({
                        targets: cloud,
                        x: '+=' + (width + cloud.displayWidth * 2),
                        duration: ((width + cloud.displayWidth * 2) / cloudSpeed) * 1000,
                        ease: 'Linear',
                        onComplete: () => {
                            // Reset cloud position with some randomization
                            cloud.x = -cloud.displayWidth - Math.random() * 200;
                            cloud.y = cloud.y + (Math.random() - 0.5) * 20; // Slight vertical drift
                            moveCloud(); // Restart the movement
                        }
                    });
                };
                
                // Start movement with staggered timing
                this.time.delayedCall(index * 1000, moveCloud);
            });
        });
    }

    showQuitConfirmation(hoverSound, confirmSound) {
        const { width, height } = this.scale;
        
        // Clear any existing quit confirmation
        if (this.quitConfirmGroup) {
            this.quitConfirmGroup.clear(true, true);
        }
        
        this.quitConfirmGroup = this.add.group();
        
        // Semi-transparent overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        this.quitConfirmGroup.add(overlay);
        
        // Confirmation dialog dimensions
        const dialogWidth = 480;
        const dialogHeight = 220;
        const baseX = width / 2;
        const baseY = height / 2;
        
        // Dialog background
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x222244, 0.96);
        dialogBg.lineStyle(4, 0xffffcc, 1);
        dialogBg.strokeRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
        dialogBg.fillRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
        this.quitConfirmGroup.add(dialogBg);
        
        // Confirmation text
        const confirmText = this.add.text(baseX, baseY - 50, 'Logout Confirmation', {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '28px',
            color: '#F4CE14',
            stroke: '#000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);
        this.quitConfirmGroup.add(confirmText);
        
        // Message text
        const messageText = this.add.text(baseX, baseY - 10, 'Are you sure you want to logout?\nYour progress has been saved automatically.', {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        this.quitConfirmGroup.add(messageText);
        
        // Button dimensions
        const btnWidth = 140;
        const btnHeight = 50;
        const btnSpacing = 80;
        
        // Yes button
        const yesBg = this.add.graphics();
        yesBg.fillStyle(0x662222, 0.9);
        yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
        yesBg.lineStyle(2, 0xff4444, 1);
        yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
        this.quitConfirmGroup.add(yesBg);
        
        const yesBtn = this.add.text(baseX - btnSpacing, baseY + 50, 'Yes, Logout', {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '24px',
            color: '#ff4444',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.quitConfirmGroup.add(yesBtn);
        
        // No button
        const noBg = this.add.graphics();
        noBg.fillStyle(0x224422, 0.9);
        noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
        noBg.lineStyle(2, 0x44ff44, 1);
        noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
        this.quitConfirmGroup.add(noBg);
        
        const noBtn = this.add.text(baseX + btnSpacing, baseY + 50, 'Cancel', {
            ...DEFAULT_TEXT_STYLE,
            fontSize: '24px',
            color: '#44ff44',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.quitConfirmGroup.add(noBtn);
        
        // Yes button events
        yesBtn.on('pointerover', () => {
            yesBtn.setStyle({ color: '#ffffff' });
            yesBg.clear();
            yesBg.fillStyle(0x883333, 1);
            yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
            yesBg.lineStyle(2, 0xff4444, 1);
            yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
            if (!hoverSound.isPlaying) hoverSound.play();
        });
        
        yesBtn.on('pointerout', () => {
            yesBtn.setStyle({ color: '#ff4444' });
            yesBg.clear();
            yesBg.fillStyle(0x662222, 0.9);
            yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
            yesBg.lineStyle(2, 0xff4444, 1);
            yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
        });
        
        // Use debounced click handler for Yes button
        const debouncedYesClick = createDebouncedClickHandler(() => {
            confirmSound.play();
            
            // Clear all user data and logout
            localStorage.removeItem('sci_high_user');
            localStorage.removeItem('sci_high_user_type');
            sessionStorage.removeItem('sci_high_authenticated');
            sessionStorage.removeItem('sci_high_user_type');
            
            // Clear any other game-specific storage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sci_high_') || key.startsWith('sciHigh'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Redirect to login page
            window.location.href = 'index.html';
        }, 300);
        
        yesBtn.on('pointerdown', (pointer) => {
            yesBtn.setScale(0.95);
            debouncedYesClick(pointer);
            
            this.time.delayedCall(100, () => {
                yesBtn.setScale(1);
            });
        });
        
        // No button events
        noBtn.on('pointerover', () => {
            noBtn.setStyle({ color: '#ffffff' });
            noBg.clear();
            noBg.fillStyle(0x338833, 1);
            noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
            noBg.lineStyle(2, 0x44ff44, 1);
            noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
            if (!hoverSound.isPlaying) hoverSound.play();
        });
        
        noBtn.on('pointerout', () => {
            noBtn.setStyle({ color: '#44ff44' });
            noBg.clear();
            noBg.fillStyle(0x224422, 0.9);
            noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
            noBg.lineStyle(2, 0x44ff44, 1);
            noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 50 - btnHeight / 2, btnWidth, btnHeight, 16);
        });
        
        // Use debounced click handler for No button
        const debouncedNoClick = createDebouncedClickHandler(() => {
            confirmSound.play();
            this.quitConfirmGroup.clear(true, true);
        }, 300);
        
        noBtn.on('pointerdown', (pointer) => {
            noBtn.setScale(0.95);
            debouncedNoClick(pointer);
            
            this.time.delayedCall(100, () => {
                noBtn.setScale(1);
            });
        });
        
        // Add fade-in animation for the dialog
        this.quitConfirmGroup.children.entries.forEach((element, index) => {
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: element === overlay ? 0.7 : 1,
                duration: 300,
                delay: index * 50,
                ease: 'Quad.easeOut'
            });
        });
    }

    autoLoadStudentProgress() {
        // Check if user is authenticated as a student
        const userType = sessionStorage.getItem('sci_high_user_type') || localStorage.getItem('sci_high_user_type');
        
        if (userType === 'student') {
            console.log('Auto-loading student progress...');
            
            // Sync save data on login
            syncSaveDataOnLogin()
                .then(() => {
                    console.log('Student progress synced successfully');
                })
                .catch(error => {
                    console.error('Failed to sync student progress:', error);
                });
        }
    }

    showProgressSummary() {
        console.log('Showing progress summary...');
        
        // Get current save data
        const saveData = JSON.parse(localStorage.getItem('sci_high_save_data') || '{}');
        
        if (!saveData || Object.keys(saveData).length === 0) {
            // No progress found
            this.showNoProgressModal();
            return;
        }
        
        // Show progress modal with current stats
        this.showProgressModal(saveData);
    }

    showNoProgressModal() {
        const { width, height } = this.scale;
        
        // Clear any existing modal
        if (this.progressModal) {
            this.progressModal.clear(true, true);
        }
        
        this.progressModal = this.add.group();
        
        // Full-screen dimmed overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
        this.progressModal.add(overlay);
        
        // Modal dialog
        const dialogWidth = 480;
        const dialogHeight = 200;
        const baseX = width / 2;
        const baseY = height / 2;
        
        // Dialog background
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x222244, 0.96);
        dialogBg.lineStyle(4, 0xffffcc, 1);
        dialogBg.strokeRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
        dialogBg.fillRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
        this.progressModal.add(dialogBg);
        
        // Title
        const titleText = this.add.text(baseX, baseY - 40, 'No Progress Found', {
            fontSize: '32px',
            color: '#ffff00',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.progressModal.add(titleText);
        
        // Message
        const messageText = this.add.text(baseX, baseY + 10, 'Start your adventure to begin tracking progress!', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        }).setOrigin(0.5);
        this.progressModal.add(messageText);
        
        // Close button
        const closeBtn = this.add.text(baseX, baseY + 60, 'OK', {
            fontSize: '28px',
            color: '#44ff44',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        closeBtn.on('pointerdown', () => {
            this.progressModal.clear(true, true);
        });
        
        this.progressModal.add(closeBtn);
        
        // Fade in animation
        this.progressModal.children.entries.forEach((element, index) => {
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: element === overlay ? 0.6 : 1,
                duration: 300,
                delay: index * 50,
                ease: 'Quad.easeOut'
            });
        });
    }

    showProgressModal(saveData) {
        const { width, height } = this.scale;
        
        // Clear any existing modal
        if (this.progressModal) {
            this.progressModal.clear(true, true);
        }
        
        this.progressModal = this.add.group();
        
        // Full-screen dimmed overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
        this.progressModal.add(overlay);
        
        // Modal dialog
        const dialogWidth = 600;
        const dialogHeight = 400;
        const baseX = width / 2;
        const baseY = height / 2;
        
        // Dialog background
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x222244, 0.96);
        dialogBg.lineStyle(4, 0xffffcc, 1);
        dialogBg.strokeRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
        dialogBg.fillRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
        this.progressModal.add(dialogBg);
        
        // Title
        const titleText = this.add.text(baseX, baseY - 150, 'Your Progress', {
            fontSize: '32px',
            color: '#ffff00',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.progressModal.add(titleText);
        
        // Progress details
        let yOffset = -100;
        const lineHeight = 35;
        
        // Last played
        if (saveData.lastActivity) {
            const lastPlayed = new Date(saveData.lastActivity).toLocaleDateString();
            const lastPlayedText = this.add.text(baseX, baseY + yOffset, `Last Played: ${lastPlayed}`, {
                fontSize: '20px',
                color: '#ffffff',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            this.progressModal.add(lastPlayedText);
            yOffset += lineHeight;
        }
        
        // Current scene/location
        if (saveData.currentScene) {
            const locationText = this.add.text(baseX, baseY + yOffset, `Current Location: ${saveData.currentScene}`, {
                fontSize: '20px',
                color: '#ffffff',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            this.progressModal.add(locationText);
            yOffset += lineHeight;
        }
        
        // Progress stats
        if (saveData.progress) {
            if (saveData.progress.level) {
                const levelText = this.add.text(baseX, baseY + yOffset, `Level: ${saveData.progress.level}`, {
                    fontSize: '20px',
                    color: '#ffffff',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                this.progressModal.add(levelText);
                yOffset += lineHeight;
            }
            
            if (saveData.progress.completedQuizzes) {
                const quizCount = Object.keys(saveData.progress.completedQuizzes).length;
                const quizText = this.add.text(baseX, baseY + yOffset, `Quizzes Completed: ${quizCount}`, {
                    fontSize: '20px',
                    color: '#ffffff',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
                this.progressModal.add(quizText);
                yOffset += lineHeight;
            }
        }
        
        // Close button
        const closeBtn = this.add.text(baseX, baseY + 120, 'Close', {
            fontSize: '28px',
            color: '#44ff44',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        closeBtn.on('pointerdown', () => {
            this.progressModal.clear(true, true);
        });
        
        this.progressModal.add(closeBtn);
        
        // Fade in animation
        this.progressModal.children.entries.forEach((element, index) => {
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: element === overlay ? 0.6 : 1,
                duration: 300,
                delay: index * 50,
                ease: 'Quad.easeOut'
            });
        });
    }

    async handleAdventureStart() {
        console.log('Starting adventure...');
        
        // Get save data to determine where to start
        const saveData = JSON.parse(localStorage.getItem('sci_high_save_data') || '{}');
        
        // Check if player has meaningful progress in local save
        const hasLocalProgress = this.checkForMeaningfulProgress(saveData);
        
        // Check if player has data in Firebase
        const hasFirebaseData = await this.checkStudentDataInFirebase();
        
        if (hasLocalProgress || hasFirebaseData) {
            // Player has existing progress or Firebase data, continue from main hub
            if (hasFirebaseData && !hasLocalProgress) {
                console.log('Player has Firebase data but no local progress, skipping intro to MainHub');
            } else {
                console.log('Player has local progress, continuing to MainHub');
            }
            
            // Load the save data into gameManager before transitioning
            if (saveData.courseProgress) {
                gameManager.courseProgress = { ...saveData.courseProgress };
            }
            if (saveData.totalPoints) {
                gameManager.setTotalPoints(saveData.totalPoints);
            }
            if (saveData.gameProgress) {
                gameManager.setGameProgress(saveData.gameProgress);
            }
            LoadingScreen.transitionToScene(this, 'MainHub', 'Loading your progress...', 800);
        } else {
            // New player with no local progress and no Firebase data, start with intro
            console.log('Starting new adventure from intro');
            LoadingScreen.transitionToScene(this, 'VNScene', 'Starting your journey...', 800);
        }
    }

    checkForMeaningfulProgress(saveData) {
        if (!saveData) return false;
        
        // Check various indicators of meaningful progress
        const progressIndicators = [
            // Has completed any course
            saveData.courseProgress && Object.values(saveData.courseProgress).some(course => course.completed),
            
            // Has significant progress in any course (>10%)
            saveData.courseProgress && Object.values(saveData.courseProgress).some(course => course.progress > 10),
            
            // Has earned points
            saveData.totalPoints && saveData.totalPoints > 0,
            
            // Has overall game progress beyond the intro
            saveData.gameProgress && saveData.gameProgress > 5,
            
            // Has play time (spent time in the game)
            saveData.playTime && saveData.playTime > 300, // 5 minutes
            
            // Has unlocked additional courses beyond the defaults
            saveData.courseProgress && Object.values(saveData.courseProgress).some(course => 
                course.unlocked && !['Web_Design', 'Python'].includes(course.name)
            ),
            
            // Has topic-specific points
            saveData.topicPoints && Object.values(saveData.topicPoints || {}).some(points => points > 0)
        ];
        
        // Return true if any meaningful progress indicator is found
        const hasProgress = progressIndicators.some(indicator => indicator === true);
        
        console.log('Progress check results:', {
            saveData,
            progressIndicators,
            hasProgress
        });
        
        return hasProgress;
    }

    // ...existing code...
}

// Helper to create a menu button with background and effects
function createMenuButton(scene, x, y, label, onClick, hoverSound, tweenDelay = 0, scaleInfo, allButtons = null) {
    // Simple fallback scaling if scaleInfo is not provided or utils are unavailable
    if (!scaleInfo) {
        try {
            scaleInfo = getScaleInfo(scene);
        } catch (error) {
            console.warn('Mobile utils not available, using fallback scaling');
            const { width, height } = scene.scale;
            scaleInfo = {
                width,
                height,
                finalScale: Math.min(width / 1920, height / 1080),
                isMobile: width < 768 || height < 600,
                isPortrait: height > width
            };
        }
    }
    
    // Get responsive scaling - calculate consistent button size based on longest text
    const baseFontSize = scaleInfo.isMobile ? 32 : 32;  // Reduced desktop font from 42 to 32
    const padding = scaleInfo.isMobile ? 50 : 60;       // Reduced desktop padding from 80 to 60
    
    let maxWidth = 0;
    let maxHeight = 0;
    
    // If we have all buttons, calculate the size based on the longest text
    if (allButtons && allButtons.length > 0) {
        allButtons.forEach(buttonData => {
            const tempText = scene.add.text(0, 0, buttonData.label, {
                ...DEFAULT_TEXT_STYLE,
                fontSize: `${baseFontSize * (scaleInfo.finalScale || 1)}px`
            });
            maxWidth = Math.max(maxWidth, tempText.width);
            maxHeight = Math.max(maxHeight, tempText.height);
            tempText.destroy();
        });
    } else {
        // Fallback: measure current button text only
        const tempText = scene.add.text(0, 0, label, {
            ...DEFAULT_TEXT_STYLE,
            fontSize: `${baseFontSize * (scaleInfo.finalScale || 1)}px`
        });
        maxWidth = tempText.width;
        maxHeight = tempText.height;
        tempText.destroy();
    }
    
    // Calculate consistent button size based on longest text with padding
    const btnWidth = maxWidth + padding * (scaleInfo.finalScale || 1);
    const btnHeight = Math.max(maxHeight + (padding * 0.6) * (scaleInfo.finalScale || 1), 
                              scaleInfo.isMobile ? 70 * (scaleInfo.finalScale || 1) : 60 * (scaleInfo.finalScale || 1)); // Reduced desktop height from 80 to 60
    const corner = scaleInfo.finalScale ? 25 * scaleInfo.finalScale : 25;

    // Button background
    const bg = scene.add.graphics();
    bg.fillStyle(0x222244, 0.92);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
    bg.lineStyle(scaleDimension(3, scaleInfo), 0xffffcc, 1);
    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
    bg.setAlpha(0);

    // Button text with responsive styling - consistent with button sizing
    let textStyle;
    try {
        const fontSize = scaleInfo.isMobile ? 32 : 32;  // Consistent font size for both mobile and desktop
        textStyle = createResponsiveTextStyle(fontSize, scaleInfo, {
            color: '#ffff00',
            stroke: '#000',
            strokeThickness: scaleInfo.finalScale ? 5 * scaleInfo.finalScale : 5,
            shadow: { 
                offsetX: scaleInfo.finalScale ? 3 * scaleInfo.finalScale : 3, 
                offsetY: scaleInfo.finalScale ? 3 * scaleInfo.finalScale : 3, 
                color: '#000', 
                blur: scaleInfo.finalScale ? 5 * scaleInfo.finalScale : 5, 
                fill: true 
            }
        });
    } catch (error) {
        console.warn('Using fallback text style');
        const fontSize = scaleInfo.finalScale ? 
            Math.max(20, (scaleInfo.isMobile ? 32 : 32) * scaleInfo.finalScale) : 
            (scaleInfo.isMobile ? 32 : 32);
        textStyle = {
            ...DEFAULT_TEXT_STYLE,
            fontSize: `${fontSize}px`,
            color: '#ffff00',
            stroke: '#000',
            strokeThickness: 5,
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, fill: true }
        };
    }
    
    const text = scene.add.text(x, y, label, textStyle)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
    text.setAlpha(0);

    // Fade in animation
    scene.tweens.add({ targets: [bg, text], alpha: 1, duration: 400, delay: tweenDelay, ease: 'Quad.easeOut' });

    // Hover/press effects - use scaled stroke width
    const strokeWidth = scaleInfo.finalScale ? 3 * scaleInfo.finalScale : 3;
    
    // Only add hover effects for non-mobile devices
    if (!scaleInfo.isMobile) {
        text.on('pointerover', () => {
            text.setStyle({ color: '#ffffff' });
            bg.clear();
            bg.fillStyle(0x333388, 1);
            bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
            bg.lineStyle(strokeWidth, 0xffffcc, 1);
            bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
            if (!hoverSound.isPlaying) hoverSound.play();
        });
        text.on('pointerout', () => {
            text.setStyle({ color: '#ffff00' });
            bg.clear();
            bg.fillStyle(0x222244, 0.92);
            bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
            bg.lineStyle(strokeWidth, 0xffffcc, 1);
            bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, corner);
        });
    }
    
    // Use debounced click handler to prevent double touches
    const debouncedClick = createDebouncedClickHandler(() => {
        onClick();
    }, 300);
    
    text.on('pointerdown', (pointer) => {
        // Visual feedback
        text.setScale(0.96);
        
        // Execute debounced callback
        debouncedClick(pointer);
        
        // Reset scale after a short delay
        scene.time.delayedCall(100, () => {
            text.setScale(1);
        });
    });
}

function showNoSaveFilesModal(scene) {
    const { width, height } = scene.scale;
    
    // Clear any existing modal
    if (scene.noSaveModal) {
        scene.noSaveModal.clear(true, true);
    }
    
    scene.noSaveModal = scene.add.group();
    
    // Full-screen dimmed overlay
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    scene.noSaveModal.add(overlay);
    
    // Modal dialog dimensions
    const dialogWidth = 480;
    const dialogHeight = 160;
    const baseX = width / 2;
    const baseY = height / 2;
    
    // Dialog background
    const dialogBg = scene.add.graphics();
    dialogBg.fillStyle(0x222244, 0.96);
    dialogBg.lineStyle(4, 0xffffcc, 1);
    dialogBg.strokeRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
    dialogBg.fillRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
    scene.noSaveModal.add(dialogBg);
    
    // Message text
    const messageText = scene.add.text(baseX, baseY, 'No save files found!', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '32px',
        color: '#ff4444',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
    }).setOrigin(0.5);
    scene.noSaveModal.add(messageText);
    
    // Set initial alpha to 0 for fade-in effect
    scene.noSaveModal.children.entries.forEach(element => {
        element.setAlpha(0);
    });
    
    // Fade in animation
    scene.tweens.add({
        targets: overlay,
        alpha: 0.6,
        duration: 300,
        ease: 'Quad.easeOut'
    });
    
    scene.tweens.add({
        targets: [dialogBg, messageText],
        alpha: 1,
        duration: 400,
        delay: 150,
        ease: 'Quad.easeOut'
    });
      // Auto fade out after 1 second
    scene.time.delayedCall(1000, () => {
        scene.tweens.add({
            targets: scene.noSaveModal.children.entries,
            alpha: 0,
            duration: 500,
            ease: 'Quad.easeIn',
            onComplete: () => {
                scene.noSaveModal.clear(true, true);
            }
        });
    });
}

// Start a new game (clear existing save and start fresh)
async function startNewGame(scene) {
    try {
        await clearCurrentUserSave(); // Clear any existing save for this user (async)
    } catch (error) {
        console.error('Error clearing save data:', error);
    }
    
    gameManager.reset();
    onceOnlyFlags.reset();
    window.__SCI_HIGH_SAVE_DATA__ = null;
    LoadingScreen.transitionToSceneWithProgress(scene, 'VNScene', 'Loading...', 1500);
}

// Continue existing game
async function continueGame(scene) {
    try {
        const saveData = await loadGame(); // Load is now async
        if (saveData) {
            window.__SCI_HIGH_SAVE_DATA__ = saveData;
            scene.scene.start('MainHub');
        } else {
            showNoSaveDataModal(scene);
        }
    } catch (error) {
        console.error('Error loading save data:', error);
        showNoSaveDataModal(scene);
    }
}

// Handle New Game button click (async wrapper)
async function handleNewGameClick(scene, hoverSound, confirmSound) {
    try {
        const hasExisting = await hasExistingSave(); // Now async
        if (hasExisting) {
            showNewGameConfirmation(scene, hoverSound, confirmSound);
        } else {
            await startNewGame(scene);
        }
    } catch (error) {
        console.error('Error handling new game click:', error);
        // Fallback to starting new game
        await startNewGame(scene);
    }
}

// Handle Continue button click (async wrapper)  
async function handleContinueClick(scene) {
    try {
        const hasExisting = await hasExistingSave(); // Now async
        if (hasExisting) {
            await continueGame(scene);
        } else {
            showNoSaveDataModal(scene);
        }
    } catch (error) {
        console.error('Error handling continue click:', error);
        showNoSaveDataModal(scene);
    }
}

// Show confirmation when starting new game with existing save data
function showNewGameConfirmation(scene, hoverSound, confirmSound) {
    const { width, height } = scene.scale;
    
    // Clear any existing confirmation
    if (scene.newGameConfirmGroup) {
        scene.newGameConfirmGroup.clear(true, true);
    }
    
    scene.newGameConfirmGroup = scene.add.group();
    
    // Semi-transparent overlay
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    scene.newGameConfirmGroup.add(overlay);
    
    // Confirmation dialog dimensions
    const dialogWidth = 520;
    const dialogHeight = 240;
    const baseX = width / 2;
    const baseY = height / 2;
    
    // Dialog background
    const dialogBg = scene.add.graphics();
    dialogBg.fillStyle(0x222244, 0.96);
    dialogBg.lineStyle(4, 0xffffcc, 1);
    dialogBg.strokeRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
    dialogBg.fillRoundedRect(baseX - dialogWidth / 2, baseY - dialogHeight / 2, dialogWidth, dialogHeight, 24);
    scene.newGameConfirmGroup.add(dialogBg);
    
    // Title text
    const titleText = scene.add.text(baseX, baseY - 60, 'New Game Confirmation', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '28px',
        color: '#F4CE14',
        stroke: '#000',
        strokeThickness: 3,
        align: 'center'
    }).setOrigin(0.5);
    scene.newGameConfirmGroup.add(titleText);
    
    // Warning text
    const warningText = scene.add.text(baseX, baseY - 20, 'You already have saved progress.\nStarting a new game will delete your current save.\nAre you sure you want to continue?', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 2,
        align: 'center'
    }).setOrigin(0.5);
    scene.newGameConfirmGroup.add(warningText);
    
    // Button dimensions
    const btnWidth = 160;
    const btnHeight = 50;
    const btnSpacing = 100;
    
    // Yes button
    const yesBg = scene.add.graphics();
    yesBg.fillStyle(0x662222, 0.9);
    yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
    yesBg.lineStyle(2, 0xff4444, 1);
    yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
    scene.newGameConfirmGroup.add(yesBg);
    
    const yesBtn = scene.add.text(baseX - btnSpacing, baseY + 60, 'Yes, Delete Save', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '20px',
        color: '#ff4444',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    scene.newGameConfirmGroup.add(yesBtn);
    
    // No button
    const noBg = scene.add.graphics();
    noBg.fillStyle(0x224422, 0.9);
    noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
    noBg.lineStyle(2, 0x44ff44, 1);
    noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
    scene.newGameConfirmGroup.add(noBg);
    
    const noBtn = scene.add.text(baseX + btnSpacing, baseY + 60, 'Cancel', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '24px',
        color: '#44ff44',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    scene.newGameConfirmGroup.add(noBtn);
    
    // Button interactions
    yesBtn.on('pointerover', () => {
        yesBtn.setStyle({ color: '#ffffff' });
        yesBg.clear();
        yesBg.fillStyle(0x883333, 1);
        yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
        yesBg.lineStyle(2, 0xff4444, 1);
        yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
        if (!hoverSound.isPlaying) hoverSound.play();
    });
    
    yesBtn.on('pointerout', () => {
        yesBtn.setStyle({ color: '#ff4444' });
        yesBg.clear();
        yesBg.fillStyle(0x662222, 0.9);
        yesBg.fillRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
        yesBg.lineStyle(2, 0xff4444, 1);
        yesBg.strokeRoundedRect(baseX - btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
    });
    
    yesBtn.on('pointerdown', async () => {
        yesBtn.setScale(0.95);
        confirmSound.play();
        scene.newGameConfirmGroup.clear(true, true);
        await startNewGame(scene); // Make it async
        
        scene.time.delayedCall(100, () => {
            yesBtn.setScale(1);
        });
    });
    
    noBtn.on('pointerover', () => {
        noBtn.setStyle({ color: '#ffffff' });
        noBg.clear();
        noBg.fillStyle(0x338833, 1);
        noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
        noBg.lineStyle(2, 0x44ff44, 1);
        noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
        if (!hoverSound.isPlaying) hoverSound.play();
    });
    
    noBtn.on('pointerout', () => {
        noBtn.setStyle({ color: '#44ff44' });
        noBg.clear();
        noBg.fillStyle(0x224422, 0.9);
        noBg.fillRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
        noBg.lineStyle(2, 0x44ff44, 1);
        noBg.strokeRoundedRect(baseX + btnSpacing - btnWidth / 2, baseY + 60 - btnHeight / 2, btnWidth, btnHeight, 16);
    });
    
    noBtn.on('pointerdown', () => {
        noBtn.setScale(0.95);
        confirmSound.play();
        scene.newGameConfirmGroup.clear(true, true);
        
        scene.time.delayedCall(100, () => {
            noBtn.setScale(1);
        });
    });
    
    // Add fade-in animation
    scene.newGameConfirmGroup.children.entries.forEach((element, index) => {
        element.setAlpha(0);
        scene.tweens.add({
            targets: element,
            alpha: element === overlay ? 0.7 : 1,
            duration: 300,
            delay: index * 50,
            ease: 'Quad.easeOut'
        });
    });
}

// Show modal when no save data exists for continue
function showNoSaveDataModal(scene) {
    const { width, height } = scene.scale;
    
    if (scene.noSaveDataModal) scene.noSaveDataModal.clear(true, true);
    scene.noSaveDataModal = scene.add.group();
    
    // Background overlay
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    scene.noSaveDataModal.add(overlay);
    
    // Modal background
    const modalWidth = 400;
    const modalHeight = 160;
    const modalBg = scene.add.graphics();
    modalBg.fillStyle(0x222244, 0.95);
    modalBg.lineStyle(3, 0xffffcc, 1);
    modalBg.strokeRoundedRect(width / 2 - modalWidth / 2, height / 2 - modalHeight / 2, modalWidth, modalHeight, 20);
    modalBg.fillRoundedRect(width / 2 - modalWidth / 2, height / 2 - modalHeight / 2, modalWidth, modalHeight, 20);
    scene.noSaveDataModal.add(modalBg);
    
    // Title text
    const titleText = scene.add.text(width / 2, height / 2 - 30, 'No Save Data Found', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '24px',
        color: '#ff6666',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5);
    scene.noSaveDataModal.add(titleText);
    
    // Message text
    const messageText = scene.add.text(width / 2, height / 2 + 10, 'Please start a new game first.', {
        ...DEFAULT_TEXT_STYLE,
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5);
    scene.noSaveDataModal.add(messageText);
    
    // Fade in animation
    scene.noSaveDataModal.children.entries.forEach((element, index) => {
        element.setAlpha(0);
        scene.tweens.add({
            targets: element,
            alpha: element === overlay ? 0.6 : 1,
            duration: 400,
            delay: index * 100,
            ease: 'Quad.easeOut'
        });
    });
    
    // Auto fade out after 2 seconds
    scene.time.delayedCall(2000, () => {
        scene.tweens.add({
            targets: scene.noSaveDataModal.children.entries,
            alpha: 0,
            duration: 500,
            ease: 'Quad.easeIn',
            onComplete: () => {
                scene.noSaveDataModal.clear(true, true);
            }
        });
    });
}