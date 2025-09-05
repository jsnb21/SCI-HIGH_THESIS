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

    disableGlobalKeyboardCapture() {
        // Ensure Phaser doesn't capture keyboard events
        if (this.game && this.game.input && this.game.input.keyboard) {
            this.game.input.keyboard.enabled = false;
        }
        
        // Create a more targeted approach to block game keys
        this.keydownHandler = (event) => {
            // Only block WASD and arrow keys that are commonly used in games
            const gameKeys = ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            
            // Don't block if the user is typing in a form input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
                return true; // Allow normal input
            }
            
            // Block game keys from reaching Phaser
            if (gameKeys.includes(event.key)) {
                event.stopImmediatePropagation();
                event.preventDefault();
                return false;
            }
        };
        
        document.addEventListener('keydown', this.keydownHandler, true);
        console.log('Targeted keyboard capture disabled for game keys');
    }

    restoreGlobalKeyboardCapture() {
        // Re-enable Phaser keyboard
        if (this.input && this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }
        
        if (this.game && this.game.input && this.game.input.keyboard) {
            this.game.input.keyboard.enabled = true;
        }
        
        // Remove our custom handler
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler, true);
            this.keydownHandler = null;
        }
        
        console.log('Global keyboard capture restored');
    }

    init(data) {
        // Receive data from main gameplay scene
        this.gameplayData = data;
        console.log('DataCollectionScreen initialized with:', data);
    }

    create() {
        super.create();

        // Stop the roguelike scene if it's running
        const roguelikeScene = this.scene.get('roguelike');
        if (roguelikeScene && roguelikeScene.scene.isActive()) {
            this.roguelikeScene = roguelikeScene;
            this.roguelikeScene.scene.stop();
            console.log('Roguelike scene stopped');
        }
        
        // Stop any other active game scenes to prevent input conflicts
        const sceneManager = this.scene.manager;
        const scenesToStop = ['DungeonScene', 'ComputerLab', 'Classroom', 'BaseLibraryScene'];
        scenesToStop.forEach(sceneName => {
            if (sceneManager.isActive(sceneName) || sceneManager.isPaused(sceneName)) {
                sceneManager.stop(sceneName);
                console.log(`${sceneName} stopped`);
            }
        });
        
        // Disable Phaser keyboard input to allow DOM form inputs to work
        if (this.input && this.input.keyboard) {
            this.input.keyboard.enabled = false;
            console.log('Phaser keyboard input disabled for form');
        }
        
        // Also disable any global keyboard capturing
        this.disableGlobalKeyboardCapture();
        
        // Use VNDialogue scaling system for consistency
        const BASE_WIDTH = 816;
        const BASE_HEIGHT = 624;
        const { width, height } = this.scale;
        const scaleX = width / BASE_WIDTH;
        const scaleY = height / BASE_HEIGHT;
        const scale = Math.min(scaleX, scaleY);
        
        // Create animated background overlay
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2, 
            this.cameras.main.height / 2, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            0x000000, 
            0.8
        ).setOrigin(0.5).setDepth(1999);

        // Add fade-in animation to overlay
        overlay.setAlpha(0);
        this.tweens.add({
            targets: overlay,
            alpha: 0.8,
            duration: 300,
            ease: 'Power2'
        });

        // Enhanced dialog background with gradient effect and glow
        const dialogWidth = 350 * scale;
        const dialogHeight = 450 * scale;
        const borderRadius = 20 * scale;
        const borderThickness = 4 * scale;
        
        const dialogBg = this.add.graphics();
        
        // Create gradient background effect
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1, 1, 1, 1);
        gradient.fillRoundedRect(
            this.cameras.main.width / 2 - dialogWidth / 2,
            this.cameras.main.height / 2 - dialogHeight / 2,
            dialogWidth,
            dialogHeight,
            borderRadius
        );
        gradient.setDepth(2000);
        
        // Outer glow effect
        const outerGlow = this.add.graphics();
        outerGlow.lineStyle(borderThickness * 3, 0xF4CE14, 0.3);
        outerGlow.strokeRoundedRect(
            this.cameras.main.width / 2 - dialogWidth / 2 - borderThickness,
            this.cameras.main.height / 2 - dialogHeight / 2 - borderThickness,
            dialogWidth + borderThickness * 2,
            dialogHeight + borderThickness * 2,
            borderRadius + borderThickness
        );
        outerGlow.setDepth(1999);
        
        // Main border with golden theme
        dialogBg.lineStyle(borderThickness, 0xF4CE14, 1);
        dialogBg.strokeRoundedRect(
            this.cameras.main.width / 2 - dialogWidth / 2,
            this.cameras.main.height / 2 - dialogHeight / 2,
            dialogWidth,
            dialogHeight,
            borderRadius
        );
        dialogBg.setDepth(2001);

        // Add scale-in animation for dialog
        gradient.setScale(0);
        outerGlow.setScale(0);
        dialogBg.setScale(0);
        this.tweens.add({
            targets: [gradient, outerGlow, dialogBg],
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Back.easeOut',
            delay: 100
        });

        // Enhanced title with animated effects
        const title = this.add.text(
            this.cameras.main.width / 2, 
            this.cameras.main.height / 2 - 200 * scale,
            '🎓 Session Complete!', 
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(28 * scale)}px`,
                color: '#F4CE14',
                stroke: '#000',
                strokeThickness: 3,
                shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
            }
        ).setOrigin(0.5).setDepth(2002);

        // Add pulse animation to title
        this.tweens.add({
            targets: title,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Enhanced instruction text
        const instruction = this.add.text(
            this.cameras.main.width / 2, 
            this.cameras.main.height / 2 - 150 * scale,
            'Please enter your information\nto save your progress:', 
            {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(14 * scale)}px`,
                color: '#ffffff',
                stroke: '#000',
                strokeThickness: 2,
                shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 3, fill: true },
                align: 'center',
                wordWrap: { width: 320 * scale }
            }
        ).setOrigin(0.5).setDepth(2002);

        // Animate elements appearing with stagger
        [title, instruction].forEach((element, index) => {
            element.setAlpha(0);
            element.setY(element.y - 20);
            this.tweens.add({
                targets: element,
                alpha: 1,
                y: element.y + 20,
                duration: 300,
                ease: 'Power2',
                delay: 200 + (index * 100)
            });
        });
        
        // Create form fields with enhanced styling
        this.createEnhancedFormFields(scale);
        
        // Try to autofill form with existing user data
        this.attemptAutofill();
        
        // Enhanced submit button
        this.createEnhancedSubmitButton(scale);
        
        // Loading indicator (hidden initially)
        this.loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 280 * scale, 'Saving data...', {
            fontFamily: 'Caprasimo-Regular',
            fontSize: `${Math.round(16 * scale)}px`,
            color: '#ffaa00',
            alpha: 0
        }).setOrigin(0.5).setDepth(2002);
    }

    createEnhancedFormFields(scale) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Form layout constants - Made more compact
        const formStartY = centerY - 120 * scale;
        const fieldHeight = 58 * scale;
        const labelOffset = 25 * scale;
        
        // Form fields data
        const fields = [
            { label: 'First Name *', key: 'firstName', placeholder: 'Enter your first name' },
            { label: 'Last Name *', key: 'lastName', placeholder: 'Enter your last name' },
            { label: 'Student ID (optional)', key: 'studentId', placeholder: 'Enter your student ID' },
            { label: 'Department *', key: 'department', type: 'select' }
        ];

        this.formElements = {};
        this.domLabels = [];
        
        fields.forEach((field, index) => {
            const fieldY = formStartY + (index * fieldHeight);
            
            // Create DOM label
            const labelEl = document.createElement('div');
            labelEl.textContent = field.label;
            labelEl.style.cssText = `
                position: absolute;
                left: ${centerX - 120 * scale}px;
                top: ${fieldY - labelOffset}px;
                width: ${240 * scale}px;
                z-index: 2003;
                color: ${field.label.includes('*') ? '#F4CE14' : '#ffffff'};
                font-family: 'Caprasimo-Regular', monospace;
                font-size: ${12 * scale}px;
                text-shadow: 0 2px 0 #000;
                pointer-events: none;
            `;
            document.body.appendChild(labelEl);
            this.domLabels.push(labelEl);
            
            // Create input or select
            let inputEl;
            if (field.type === 'select') {
                inputEl = document.createElement('select');
                
                // Add department options
                const departmentGroups = [
                    { label: '-- Select Department --', value: '', disabled: true },
                    { label: 'Senior High School Department', value: 'Senior High School Department' },
                    { label: 'College Department', value: 'College Department' }
                ];
                
                departmentGroups.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.value;
                    option.textContent = dept.label;
                    option.disabled = dept.disabled || false;
                    option.style.cssText = `
                        background-color: #1a1a2e;
                        color: #ffffff;
                        padding: 8px;
                    `;
                    inputEl.appendChild(option);
                });
            } else {
                inputEl = document.createElement('input');
                inputEl.type = 'text';
                inputEl.placeholder = field.placeholder;
            }
            
            inputEl.style.cssText = `
                position: absolute;
                left: ${centerX - 120 * scale}px;
                top: ${fieldY}px;
                width: ${240 * scale}px;
                height: ${35 * scale}px;
                z-index: 2002;
                padding: ${10 * scale}px ${14 * scale}px;
                border: ${2 * scale}px solid #379777;
                border-radius: ${10 * scale}px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #ffffff;
                font-family: 'Caprasimo-Regular', monospace;
                font-size: ${14 * scale}px;
                box-shadow: 
                    0 ${3 * scale}px ${6 * scale}px rgba(0,0,0,0.3),
                    inset 0 ${1 * scale}px ${2 * scale}px rgba(255,255,255,0.1);
                box-sizing: border-box;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                outline: none;
            `;
            
            // Add focus effects
            inputEl.addEventListener('focus', () => {
                inputEl.style.borderColor = '#F4CE14';
                inputEl.style.boxShadow = `
                    0 0 ${12 * scale}px rgba(244, 206, 20, 0.4),
                    0 ${3 * scale}px ${8 * scale}px rgba(0,0,0,0.4),
                    inset 0 ${1 * scale}px ${2 * scale}px rgba(255,255,255,0.2)
                `;
                inputEl.style.transform = `scale(1.01)`;
                console.log('Input focused, ensuring keyboard is available');
            });
            
            inputEl.addEventListener('blur', () => {
                inputEl.style.borderColor = '#379777';
                inputEl.style.boxShadow = `
                    0 ${4 * scale}px ${8 * scale}px rgba(0,0,0,0.3),
                    inset 0 ${1 * scale}px ${2 * scale}px rgba(255,255,255,0.1)
                `;
                inputEl.style.transform = `scale(1)`;
            });
            
            // Add keyboard event handling
            inputEl.addEventListener('keydown', (event) => {
                // Allow all keyboard input for forms
                event.stopPropagation();
                
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.handleSubmit();
                }
            });
            
            inputEl.addEventListener('keypress', (event) => {
                event.stopPropagation();
            });
            
            // Ensure input works by preventing event bubbling
            inputEl.addEventListener('input', (event) => {
                event.stopPropagation();
            });
            
            document.body.appendChild(inputEl);
            this.formElements[field.key] = inputEl;
        });
        
        // Fade-in animation for DOM labels
        this.domLabels.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 300ms ease';
            setTimeout(() => { el.style.opacity = '1'; }, 300 + (index * 100));
        });
        
        // Focus the first input after a delay to ensure everything is ready
        setTimeout(() => {
            if (this.formElements.firstName) {
                this.formElements.firstName.focus();
                console.log('First input focused');
            }
        }, 500);
    }

    createEnhancedSubmitButton(scale) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Enhanced button creation
        const createButton = (x, y, width, height, text, buttonType, callback) => {
            const cornerRadius = 20 * scale;
            const borderWidth = 3 * scale;
            
            // Color scheme for submit button
            const colors = {
                bg: [0x379777, 0x2d7a5f],
                bgHover: [0x4fb085, 0x379777],
                border: 0x5fd4a5,
                text: '#ffffff',
                textHover: '#F4CE14',
                icon: '📝'
            };
            
            // Button container
            const buttonContainer = this.add.container(x, y).setDepth(2001);
            
            // Button background
            const btnBg = this.add.graphics();
            const drawButton = (bgColors, isHover = false) => {
                btnBg.clear();
                btnBg.fillGradientStyle(bgColors[0], bgColors[0], bgColors[1], bgColors[1], 1, 1, 1, 1);
                btnBg.fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
                btnBg.lineStyle(borderWidth, colors.border, isHover ? 1 : 0.8);
                btnBg.strokeRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
                
                if (isHover) {
                    btnBg.lineStyle(1, 0xffffff, 0.3);
                    btnBg.strokeRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, cornerRadius - 3);
                }
            };
            
            drawButton(colors.bg);
            buttonContainer.add(btnBg);

            // Button text
            const btnText = this.add.text(0, 0, `${colors.icon} ${text}`, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(18 * scale)}px`,
                color: colors.text,
                stroke: '#000',
                strokeThickness: 3,
                shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
            }).setOrigin(0.5);
            
            buttonContainer.add(btnText);
            buttonContainer.setInteractive(
                new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
                Phaser.Geom.Rectangle.Contains
            );
            buttonContainer.input.useHandCursor = true;

            // Hover effects
            buttonContainer.on('pointerover', () => {
                drawButton(colors.bgHover, true);
                btnText.setStyle({ color: colors.textHover });
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    ease: 'Power2'
                });
            });
            
            buttonContainer.on('pointerout', () => {
                drawButton(colors.bg);
                btnText.setStyle({ color: colors.text });
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Power2'
                });
            });
            
            buttonContainer.on('pointerdown', () => {
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 100,
                    ease: 'Power2'
                });
            });
            
            buttonContainer.on('pointerup', () => {
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100,
                    ease: 'Power2',
                    onComplete: () => callback()
                });
            });

            return buttonContainer;
        };

        // Create submit button
        this.submitButton = createButton(
            centerX,
            centerY + 180 * scale,
            200 * scale,
            45 * scale,
            'Submit & Continue',
            'confirm',
            () => this.handleSubmit()
        );
        
        // Slide-in animation for button
        this.submitButton.setScale(0);
        this.submitButton.setAlpha(0);
        this.tweens.add({
            targets: this.submitButton,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.easeOut',
            delay: 500
        });
    }

    createFormFields(centerX, centerY) {
        // Legacy method - keeping for compatibility but using enhanced version
        this.createEnhancedFormFields(1);
        // Calculate position relative to the game canvas
        const gameCanvas = document.querySelector('#game canvas') || document.querySelector('canvas');
        const canvasRect = gameCanvas ? gameCanvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const scaleX = canvasRect.width / this.scale.width;
        const scaleY = canvasRect.height / this.scale.height;

        const fieldWidth = 300;
        const fieldHeight = 40;
        const labelStyle = {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            fontWeight: 'bold'
        };

        // Form fields data
        const fields = [
            { label: 'First Name:', key: 'firstName', type: 'input', placeholder: 'Enter first name...' },
            { label: 'Last Name:', key: 'lastName', type: 'input', placeholder: 'Enter last name...' },
            { label: 'Department:', key: 'department', type: 'select', options: ['Senior High School Department', 'College Department'] },
            { label: 'Strand/Year:', key: 'strandYear', type: 'input', placeholder: 'Enter strand or year level...' }
        ];

        this.formElements = {};
        
        fields.forEach((field, index) => {
            const yOffset = -120 + (index * 80);
            
            // Label
            this.add.text(centerX - 250, centerY + yOffset, field.label, labelStyle);
            
            // Field background
            const fieldBg = this.add.rectangle(centerX + 50, centerY + yOffset, fieldWidth, fieldHeight, 0x0a1628);
            fieldBg.setStrokeStyle(2, 0x3282b8);

            if (field.type === 'input') {
                // Create text input
                const inputElement = document.createElement('input');
                inputElement.type = 'text';
                inputElement.placeholder = field.placeholder;
                this.setupInputElement(inputElement, centerX + 50, centerY + yOffset, fieldWidth, fieldHeight, canvasRect, scaleX, scaleY);
                this.formElements[field.key] = inputElement;
                
            } else if (field.type === 'select') {
                // Create dropdown
                const selectElement = document.createElement('select');
                selectElement.style.position = 'absolute';
                selectElement.style.backgroundColor = '#0a1628';
                selectElement.style.color = '#ffffff';
                selectElement.style.border = 'none';
                selectElement.style.borderRadius = '5px';
                selectElement.style.fontFamily = 'Arial, sans-serif';
                selectElement.style.outline = 'none';
                selectElement.style.zIndex = '1000';
                selectElement.style.cursor = 'pointer';

                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select department...';
                defaultOption.disabled = true;
                defaultOption.selected = true;
                selectElement.appendChild(defaultOption);

                // Add options
                field.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    optionElement.style.backgroundColor = '#0a1628';
                    optionElement.style.color = '#ffffff';
                    selectElement.appendChild(optionElement);
                });

                this.setupInputElement(selectElement, centerX + 50, centerY + yOffset, fieldWidth, fieldHeight, canvasRect, scaleX, scaleY);
                this.formElements[field.key] = selectElement;
            }
        });

        // Focus first input after a delay
        this.time.delayedCall(100, () => {
            if (this.formElements.firstName) {
                this.formElements.firstName.focus();
            }
        });
    }

    setupInputElement(element, x, y, width, height, canvasRect, scaleX, scaleY) {
        element.style.position = 'absolute';
        element.style.left = `${canvasRect.left + (x - width/2) * scaleX}px`;
        element.style.top = `${canvasRect.top + (y - height/2) * scaleY}px`;
        element.style.width = `${(width - 10) * scaleX}px`;
        element.style.height = `${(height - 6) * scaleY}px`;
        element.style.fontSize = `${16 * Math.min(scaleX, scaleY)}px`;
        element.style.padding = '8px';
        element.style.border = 'none';
        element.style.borderRadius = '5px';
        element.style.backgroundColor = '#0a1628';
        element.style.color = '#ffffff';
        element.style.outline = 'none';
        element.style.zIndex = '1000';
        element.style.fontFamily = 'Arial, sans-serif';

        // Disable Phaser keyboard capture when focused (already disabled globally)
        element.addEventListener('focus', () => {
            if (this.input && this.input.keyboard) {
                this.input.keyboard.enabled = false;
            }
        });

        element.addEventListener('blur', () => {
            // Keep keyboard disabled since we're in form mode
            // It will be re-enabled when the scene is cleaned up
        });

        // Handle keyboard events
        element.addEventListener('keydown', (event) => {
            event.stopPropagation();
            
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleSubmit();
            }
        });

        element.addEventListener('keypress', (event) => {
            event.stopPropagation();
            
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleSubmit();
            }
        });

        // Add to DOM
        document.body.appendChild(element);
    }
    
    async attemptAutofill() {
        try {
            console.log('🔍 Attempting to autofill form with existing user data...');
            
            // First ensure Firebase is initialized
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                console.log('⚠️ Firebase not initialized, skipping autofill');
                return;
            }
            
            // Check localStorage for recently used student data
            const recentStudentData = localStorage.getItem('recentStudentData');
            if (recentStudentData) {
                try {
                    const parsedData = JSON.parse(recentStudentData);
                    console.log('📋 Found recent student data in localStorage:', parsedData);
                    
                    // Check if data is recent (within last 24 hours)
                    const dataAge = Date.now() - (parsedData.timestamp || 0);
                    const twentyFourHours = 24 * 60 * 60 * 1000;
                    
                    if (dataAge < twentyFourHours) {
                        this.autofillForm(parsedData);
                        console.log('✅ Form autofilled with recent localStorage data');
                        return;
                    } else {
                        console.log('📅 localStorage data is too old, removing...');
                        localStorage.removeItem('recentStudentData');
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse localStorage data:', parseError);
                    localStorage.removeItem('recentStudentData');
                }
            }
            
            // If no recent localStorage data, try to find user in Firebase by partial name match
            // This is useful if user has played before but on different device/browser
            console.log('🔍 No recent localStorage data found, checking for form interaction...');
            
            // Set up real-time name matching when user starts typing
            this.setupNameMatching();
            
        } catch (error) {
            console.error('❌ Error during autofill attempt:', error);
        }
    }
    
    autofillForm(studentData) {
        if (this.formElements.firstName && studentData.firstName) {
            this.formElements.firstName.value = studentData.firstName;
        }
        if (this.formElements.lastName && studentData.lastName) {
            this.formElements.lastName.value = studentData.lastName;
        }
        if (this.formElements.department && studentData.department) {
            this.formElements.department.value = studentData.department;
        }
        if (this.formElements.strandYear && studentData.strandYear) {
            this.formElements.strandYear.value = studentData.strandYear;
        }
        
        // Show a hint that data was autofilled
        const hintText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 250, 
            '✨ Form autofilled with your previous information', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#00ff88',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // Fade out the hint after 3 seconds
        this.tweens.add({
            targets: hintText,
            alpha: 0,
            duration: 3000,
            delay: 2000,
            onComplete: () => hintText.destroy()
        });
    }
    
    setupNameMatching() {
        // Add event listeners to firstName and lastName fields for real-time matching
        if (this.formElements.firstName) {
            this.formElements.firstName.addEventListener('input', () => {
                this.debounceNameSearch();
            });
        }
        if (this.formElements.lastName) {
            this.formElements.lastName.addEventListener('input', () => {
                this.debounceNameSearch();
            });
        }
    }
    
    debounceNameSearch() {
        // Clear existing timeout
        if (this.nameSearchTimeout) {
            clearTimeout(this.nameSearchTimeout);
        }
        
        // Set new timeout to search after user stops typing for 1 second
        this.nameSearchTimeout = setTimeout(() => {
            this.searchForExistingStudent();
        }, 1000);
    }
    
    async searchForExistingStudent() {
        try {
            const firstName = this.formElements.firstName?.value.trim().toLowerCase();
            const lastName = this.formElements.lastName?.value.trim().toLowerCase();
            
            // Only search if both names have at least 2 characters
            if (!firstName || !lastName || firstName.length < 2 || lastName.length < 2) {
                return;
            }
            
            console.log(`🔍 Searching for existing student: ${firstName} ${lastName}`);
            
            // Search Firebase for matching student
            const gameplayRef = this.database.ref('gameplay_data');
            const snapshot = await gameplayRef.orderByChild('firstName').once('value');
            
            let matchFound = false;
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                if (data.firstName && data.lastName && data.firstName.toLowerCase() === firstName && data.lastName.toLowerCase() === lastName) {
                    console.log('✅ Found matching student in Firebase:', data);
                    
                    // Autofill the remaining fields
                    if (this.formElements.department && data.department && !this.formElements.department.value) {
                        this.formElements.department.value = data.department;
                    }
                    if (this.formElements.strandYear && data.strandYear && !this.formElements.strandYear.value) {
                        this.formElements.strandYear.value = data.strandYear;
                    }
                    
                    // Show success message
                    if (!this.matchHintShown) {
                        const matchText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 250, 
                            '✅ Found your previous information!', {
                            fontFamily: 'Arial',
                            fontSize: '14px',
                            color: '#00ff88',
                            stroke: '#000000',
                            strokeThickness: 1
                        }).setOrigin(0.5);
                        
                        this.tweens.add({
                            targets: matchText,
                            alpha: 0,
                            duration: 3000,
                            delay: 2000,
                            onComplete: () => matchText.destroy()
                        });
                        
                        this.matchHintShown = true;
                    }
                    
                    matchFound = true;
                    return true; // Stop iteration
                }
            });
            
            if (!matchFound) {
                console.log('ℹ️ No matching student found in Firebase');
            }
            
        } catch (error) {
            console.error('❌ Error searching for existing student:', error);
        }
    }
    
    async handleSubmit() {
        console.log('🔄 DataCollectionScreen: handleSubmit() called');
        console.log('📋 DataCollectionScreen: Form elements available:', Object.keys(this.formElements));
        
        // Get form data
        const firstName = this.formElements.firstName?.value.trim() || '';
        const lastName = this.formElements.lastName?.value.trim() || '';
        const department = this.formElements.department?.value || '';
        const strandYear = this.formElements.strandYear?.value.trim() || '';
        let studentId = this.formElements.studentId?.value.trim() || '';
        
        console.log('📝 DataCollectionScreen: Form values retrieved:', {
            firstName,
            lastName,
            department,
            strandYear,
            studentId
        });
        
        // Validation
        const missingFields = [];
        if (!firstName) missingFields.push('First Name');
        if (!lastName) missingFields.push('Last Name');
        if (!department) missingFields.push('Department');
        
        console.log('✅ DataCollectionScreen: Validation check:', { missingFields });
        
        if (missingFields.length > 0) {
            console.log('❌ DataCollectionScreen: Validation failed - missing fields:', missingFields);
            
            // Enhanced error display
            const errorText = this.add.text(
                this.cameras.main.width / 2, 
                this.cameras.main.height / 2 + 180, 
                `⚠️ Please fill in: ${missingFields.join(', ')}`, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: '16px',
                color: '#ff4444',
                stroke: '#000',
                strokeThickness: 2,
                align: 'center'
            }).setOrigin(0.5).setDepth(2003);
            
            // Shake animation for error
            this.tweens.add({
                targets: errorText,
                x: errorText.x - 5,
                duration: 50,
                yoyo: true,
                repeat: 5
            });
            
            // Auto-hide error after 3 seconds
            this.tweens.add({
                targets: errorText,
                alpha: 0,
                duration: 300,
                delay: 3000,
                onComplete: () => errorText.destroy()
            });
            return;
        }
        
        console.log('✅ DataCollectionScreen: Validation passed - proceeding with submission');
        
        // Show loading indicator with animation
        this.loadingText.setAlpha(1);
        this.tweens.add({
            targets: this.loadingText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        console.log('🔄 DataCollectionScreen: Loading indicator shown');
        
        try {
            // Store user info in localStorage for future use
            const userInfo = {
                firstName,
                lastName,
                department,
                studentId,
                timestamp: Date.now()
            };
            localStorage.setItem('sci_high_player_info', JSON.stringify(userInfo));
            
            // Get current user data
            let currentStudentId = studentId || 'unknown';
            let currentUser = null;
            
            console.log('🔄 DataCollectionScreen: Attempting to get student ID from localStorage...');
            
            try {
                const userDataStr = localStorage.getItem('sci_high_user');
                console.log('📄 DataCollectionScreen: Raw localStorage data:', userDataStr);
                
                if (userDataStr) {
                    currentUser = JSON.parse(userDataStr);
                    studentId = currentUser.studentId || currentUser.uid || 'unknown';
                    console.log('👤 DataCollectionScreen: Parsed user data:', currentUser);
                    console.log('🆔 DataCollectionScreen: Student ID resolved to:', studentId);
                }
            } catch (e) {
                console.warn('⚠️ DataCollectionScreen: Could not parse user data from localStorage:', e);
            }
            
            // Combine first and last name
            const fullName = `${firstName} ${lastName}`;
            console.log('👤 DataCollectionScreen: Full name constructed:', fullName);
            
            // Prepare gameplay data for upload
            const gameplayData = {
                studentId: studentId,
                studentName: fullName,
                firstName: firstName,
                lastName: lastName,
                department: department,
                strandYear: strandYear,
                courseTopic: this.gameplayData.courseTopic,
                sessionData: {
                    courseTopic: this.gameplayData.courseTopic, // Add courseTopic to sessionData for career stats
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
            
            console.log('📊 DataCollectionScreen: Gameplay data prepared:', gameplayData);
            console.log('📊 DataCollectionScreen: Session data details:', gameplayData.sessionData);
            
            // Upload detailed session data to Firebase
            console.log('🔄 DataCollectionScreen: Starting Firebase upload...');
            await this.uploadToFirebase(gameplayData);
            console.log('✅ DataCollectionScreen: Firebase upload completed successfully');
            
            // Update career stats (import the service dynamically)
            try {
                console.log('🔄 DataCollectionScreen: Attempting to import career stats service...');
                console.log('📂 DataCollectionScreen: Import path will be: ../services/careerStatsService.js');
                
                const { default: careerStatsService } = await import('../services/careerStatsService.js');
                console.log('✅ DataCollectionScreen: Career stats service imported successfully');
                console.log('🔧 DataCollectionScreen: Service methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(careerStatsService)));
                
                console.log('🔄 DataCollectionScreen: Calling updateCareerStats with:', {
                    studentId: gameplayData.studentId,
                    fullName: fullName,
                    sessionData: gameplayData.sessionData,
                    additionalData: {
                        firstName: firstName,
                        lastName: lastName,
                        department: department,
                        strandYear: strandYear
                    }
                });
                
                const careerResult = await careerStatsService.updateCareerStats(
                    gameplayData.studentId, 
                    fullName, // Use full name for career stats
                    gameplayData.sessionData,
                    {
                        firstName: firstName,
                        lastName: lastName,
                        department: department,
                        strandYear: strandYear
                    }
                );
                console.log('✅ DataCollectionScreen: Career stats updated successfully!');
                console.log('📊 DataCollectionScreen: Career stats result:', careerResult);
            } catch (careerError) {
                console.error('❌ DataCollectionScreen: Failed to update career stats:', careerError);
                console.error('❌ DataCollectionScreen: Career error type:', careerError.constructor.name);
                console.error('❌ DataCollectionScreen: Career error message:', careerError.message);
                console.error('❌ DataCollectionScreen: Career error stack:', careerError.stack);
                console.warn('⚠️ DataCollectionScreen: Session data was saved, but career stats update failed:', careerError.message);
                // Don't fail the whole process if career stats update fails
            }
            
            // Save student data to localStorage for future autofill
            const studentDataForStorage = {
                firstName: firstName,
                lastName: lastName,
                department: department,
                strandYear: strandYear,
                timestamp: Date.now()
            };
            localStorage.setItem('recentStudentData', JSON.stringify(studentDataForStorage));
            console.log('💾 Student data saved to localStorage for future autofill');
            
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
        // Clean up all form elements and restore Phaser keyboard
        this.cleanupFormElements();
        
        // Proceed to ResultScreen with original data
        this.scene.start('ResultScreen', this.gameplayData);
    }
    
    cleanupFormElements() {
        // Clean up DOM form elements
        if (this.formElements) {
            Object.values(this.formElements).forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            this.formElements = null;
        }
        
        // Clean up DOM labels
        if (this.domLabels) {
            this.domLabels.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
            this.domLabels = null;
        }
        
        // Restore global keyboard capture
        this.restoreGlobalKeyboardCapture();
        
        console.log('Form cleanup completed with keyboard restoration');
    }
    
    shutdown() {
        // Clean up form elements on scene shutdown and restore Phaser keyboard
        this.cleanupFormElements();
        super.shutdown();
    }
}
