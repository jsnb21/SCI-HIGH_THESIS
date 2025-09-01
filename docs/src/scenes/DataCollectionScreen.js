import Phaser from 'phaser';
import BaseScene from './BaseScene.js';

export default class DataCollectionScreen extends BaseScene {
    constructor() {
        super('DataCollectionScreen');
        this.studentName = '';
        this.gameplayData = null;
        
        // Firebase config (same as authService)
        this.firebaseConfig = {
            apiKey: "AIzaSyD-Q2woACHgMCTVwd6aX-IUzLovE0ux-28",
            authDomain: "sci-high-website.firebaseapp.com",
            databaseURL: "https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "sci-high-website",
            storageBucket: "sci-high-website.appspot.com",
            messagingSenderId: "451463202515",
            appId: "1:451463202515:web:e7f9c7bf69c04c685ef626"
        };
        
        this.isFirebaseInitialized = false;
        this.database = null;
        this.initializationPromise = null;
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
            console.log('Starting Firebase initialization for DataCollectionScreen...');
            
            // First check if we have internet connectivity
            if (!navigator.onLine) {
                throw new Error('No internet connection detected');
            }
            
            // Check if Firebase is already loaded
            if (typeof window.firebase === 'undefined') {
                console.log('Loading Firebase scripts...');
                await this.loadFirebaseScripts();
            }
            
            // Wait a bit for Firebase to be available (same as leaderboard service)
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
            console.log('Firebase Database initialized successfully for DataCollectionScreen');
        } catch (error) {
            console.error('Failed to initialize Firebase for DataCollectionScreen:', error);
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

    init(data) {
        // Receive data from main gameplay scene
        this.gameplayData = data;
        console.log('DataCollectionScreen initialized with:', data);
    }

    create() {
        super.create();
        
        // Create gradient background
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x000000, 0x000000, 0x1a1a2e, 0x1a1a2e, 1);
        gradient.fillRect(0, 0, this.scale.width, this.scale.height);
        
        // Create main panel
        const panelWidth = 600;
        const panelHeight = 400;
        const panelX = this.scale.width / 2;
        const panelY = this.scale.height / 2;
        
        // Panel shadow
        const shadow = this.add.rectangle(panelX + 5, panelY + 5, panelWidth, panelHeight, 0x000000, 0.5);
        
        // Main panel
        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x16213e);
        panel.setStrokeStyle(3, 0x0f4c75);
        
        // Panel glow effect
        const panelGlow = this.add.rectangle(panelX, panelY, panelWidth + 10, panelHeight + 10, 0x0f4c75, 0.3);
        
        // Title
        const title = this.add.text(panelX, panelY - 120, 'Session Complete!', {
            fontFamily: 'Arial',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#00ff88',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        
        // Instruction text
        const instruction = this.add.text(panelX, panelY - 60, 'Please enter your full name to save your progress:', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1,
            align: 'center'
        }).setOrigin(0.5);
        
        // Create input field background
        const inputBg = this.add.rectangle(panelX, panelY - 10, 400, 50, 0x0a1628);
        inputBg.setStrokeStyle(2, 0x3282b8);
        
        // Create HTML input element
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.placeholder = 'Enter your full name...';
        inputElement.style.position = 'absolute';
        
        // Calculate position relative to the game canvas
        const gameCanvas = document.querySelector('#game canvas') || document.querySelector('canvas');
        const canvasRect = gameCanvas ? gameCanvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const scaleX = canvasRect.width / this.scale.width;
        const scaleY = canvasRect.height / this.scale.height;
        
        inputElement.style.left = `${canvasRect.left + (panelX - 200) * scaleX}px`;
        inputElement.style.top = `${canvasRect.top + (panelY - 35) * scaleY}px`;
        inputElement.style.width = `${396 * scaleX}px`;
        inputElement.style.height = `${46 * scaleY}px`;
        inputElement.style.fontSize = `${18 * Math.min(scaleX, scaleY)}px`;
        inputElement.style.padding = '10px';
        inputElement.style.border = 'none';
        inputElement.style.borderRadius = '5px';
        inputElement.style.backgroundColor = '#0a1628';
        inputElement.style.color = '#ffffff';
        inputElement.style.outline = 'none';
        inputElement.style.zIndex = '1000';
        inputElement.style.fontFamily = 'Arial, sans-serif';
        
        // Disable Phaser keyboard capture when input is focused
        inputElement.addEventListener('focus', () => {
            console.log('Input focused - disabling Phaser keyboard');
            if (this.input && this.input.keyboard) {
                this.input.keyboard.enabled = false;
            }
        });
        
        inputElement.addEventListener('blur', () => {
            console.log('Input blurred - enabling Phaser keyboard');
            if (this.input && this.input.keyboard) {
                this.input.keyboard.enabled = true;
            }
        });
        
        // Handle keyboard events properly
        inputElement.addEventListener('keydown', (event) => {
            // Stop event from propagating to Phaser
            event.stopPropagation();
            
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleSubmit();
            }
            
            // Allow all other keys to work normally
        });
        
        // Also handle keypress for additional compatibility
        inputElement.addEventListener('keypress', (event) => {
            event.stopPropagation();
            
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleSubmit();
            }
        });
        
        // Add input to DOM
        document.body.appendChild(inputElement);
        
        // Small delay before focusing to ensure proper setup
        this.time.delayedCall(100, () => {
            inputElement.focus();
        });
        
        // Store reference for cleanup
        this.inputElement = inputElement;
        
        // Submit button
        const submitBg = this.add.rectangle(panelX, panelY + 80, 200, 50, 0x0f4c75);
        submitBg.setStrokeStyle(2, 0x3282b8);
        
        const submitText = this.add.text(panelX, panelY + 80, 'Submit & Continue', {
            fontFamily: 'Arial',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Loading indicator (hidden initially)
        this.loadingText = this.add.text(panelX, panelY + 140, 'Saving data...', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffaa00',
            alpha: 0
        }).setOrigin(0.5);
        
        // Submit button interaction
        submitBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                submitBg.setFillStyle(0x3282b8);
                submitText.setScale(1.05);
            })
            .on('pointerout', () => {
                submitBg.setFillStyle(0x0f4c75);
                submitText.setScale(1);
            })
            .on('pointerdown', () => {
                this.handleSubmit();
            });
        
        // Entrance animations
        const animatedElements = [panelGlow, panel, title, instruction, inputBg, submitBg, submitText];
        
        animatedElements.forEach((element, index) => {
            element.setAlpha(0);
            this.tweens.add({
                targets: element,
                alpha: 1,
                duration: 400,
                delay: index * 50,
                ease: 'Power2.out'
            });
        });
    }
    
    async handleSubmit() {
        const fullName = this.inputElement.value.trim();
        
        if (!fullName) {
            // Show error message
            const errorText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 140, 'Please enter your full name', {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ff4444'
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: errorText,
                alpha: 0,
                duration: 2000,
                delay: 1000,
                onComplete: () => errorText.destroy()
            });
            return;
        }
        
        // Show loading indicator
        this.loadingText.setAlpha(1);
        
        try {
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
            
            // Prepare gameplay data for upload
            const gameplayData = {
                studentId: studentId,
                studentName: fullName,
                courseTopic: this.gameplayData.courseTopic,
                sessionData: {
                    correctAnswers: this.gameplayData.correctAnswers,
                    wrongAnswers: this.gameplayData.wrongAnswers,
                    highestStreak: this.gameplayData.highestStreak,
                    totalScore: this.gameplayData.totalScore,
                    intensity3CorrectAnswers: this.gameplayData.intensity3CorrectAnswers || 0,
                    courseCompleted: this.gameplayData.courseCompleted,
                    sessionDuration: Date.now() - (this.gameplayData.startTime || Date.now()),
                    timestamp: new Date().toISOString(),
                    accuracyPercentage: this.gameplayData.correctAnswers + this.gameplayData.wrongAnswers > 0 ? 
                        ((this.gameplayData.correctAnswers / (this.gameplayData.correctAnswers + this.gameplayData.wrongAnswers)) * 100).toFixed(1) : 0
                }
            };
            
            console.log('Uploading gameplay data:', gameplayData);
            
            // Upload to Firebase using our own database connection
            await this.uploadToFirebase(gameplayData);
            
            // Success - proceed to results
            this.proceedToResults();
            
        } catch (error) {
            console.error('Error uploading data:', error);
            
            // Show error and continue anyway
            this.loadingText.setText('Upload failed - continuing...');
            this.loadingText.setColor('#ff4444');
            
            this.time.delayedCall(2000, () => {
                this.proceedToResults();
            });
        }
    }
    
    async uploadToFirebase(gameplayData) {
        try {
            // Ensure Firebase is initialized
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                throw new Error('Firebase not initialized');
            }
            
            // Use our database connection to upload data
            if (!this.database) {
                throw new Error('Firebase database not available');
            }
            
            // Push data to gameplay_data collection (now properly configured in Firebase rules)
            const gameplayRef = this.database.ref('gameplay_data');
            const result = await gameplayRef.push(gameplayData);
            
            console.log('Gameplay data uploaded successfully to Firebase:', result.key);
            
        } catch (error) {
            console.error('Firebase upload error:', error);
            throw error;
        }
    }
    
    proceedToResults() {
        // Clean up input element and restore Phaser keyboard
        if (this.inputElement && this.inputElement.parentNode) {
            this.inputElement.parentNode.removeChild(this.inputElement);
        }
        
        // Re-enable Phaser keyboard
        if (this.input && this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }
        
        // Proceed to ResultScreen with original data
        this.scene.start('ResultScreen', this.gameplayData);
    }
    
    shutdown() {
        // Clean up input element on scene shutdown and restore Phaser keyboard
        if (this.inputElement && this.inputElement.parentNode) {
            this.inputElement.parentNode.removeChild(this.inputElement);
        }
        
        // Re-enable Phaser keyboard
        if (this.input && this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }
        
        super.shutdown();
    }
}
