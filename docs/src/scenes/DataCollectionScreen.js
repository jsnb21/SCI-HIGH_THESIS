import Phaser from 'phaser';
import BaseScene from './BaseScene.js';
import { playExclusiveBGM, updateSoundVolumes } from '../audioUtils.js';
import { getScaleInfo, scaleFontSize, scaleDimension, getResponsivePosition } from '../utils/mobileUtils.js';

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
    
    preload() {
        // Load BGM for data collection screen
        this.load.audio('bgm_results', 'assets/audio/bgm/bgm_results.mp3');
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
        
        // Get scale information using mobile utilities
        const scaleInfo = getScaleInfo(this);
        this.scaleInfo = scaleInfo;
        
        // Play results music for data collection
        playExclusiveBGM(this, 'bgm_results', { loop: true });
        updateSoundVolumes(this);
        
        // Create gradient background
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x000000, 0x000000, 0x1a1a2e, 0x1a1a2e, 1);
        gradient.fillRect(0, 0, this.scale.width, this.scale.height);
        
        // Create responsive main panel using mobile utilities
        const basePanelWidth = 700;
        const basePanelHeight = 550;
        
        const panelWidth = Math.min(
            scaleDimension(basePanelWidth, scaleInfo),
            scaleInfo.width - 40
        );
        const panelHeight = Math.min(
            scaleDimension(basePanelHeight, scaleInfo),
            scaleInfo.height - 80
        );
        
        const centerPos = getResponsivePosition(scaleInfo, 'center');
        
        // Panel shadow
        const shadow = this.add.rectangle(centerPos.x + 5, centerPos.y + 5, panelWidth, panelHeight, 0x000000, 0.5);
        
        // Main panel
        const panel = this.add.rectangle(centerPos.x, centerPos.y, panelWidth, panelHeight, 0x16213e);
        panel.setStrokeStyle(3, 0x0f4c75);
        
        // Panel glow effect
        const panelGlow = this.add.rectangle(centerPos.x, centerPos.y, panelWidth + 10, panelHeight + 10, 0x0f4c75, 0.3);
        
        // Responsive title
        const titleFontSize = scaleFontSize(32, scaleInfo);
        const title = this.add.text(centerPos.x, centerPos.y - (panelHeight/2 - 40), 'Session Complete!', {
            fontFamily: 'Arial',
            fontSize: `${titleFontSize}px`,
            fontWeight: 'bold',
            color: '#00ff88',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        
        // Responsive instruction text
        const instructionFontSize = scaleFontSize(20, scaleInfo);
        const instruction = this.add.text(centerPos.x, centerPos.y - (panelHeight/2 - 80), 'Please enter your information to save your progress:', {
            fontFamily: 'Arial',
            fontSize: `${instructionFontSize}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1,
            align: 'center',
            wordWrap: { width: panelWidth - 60 }
        }).setOrigin(0.5);
        
        // Create form fields with responsive sizing
        this.createFormFields(centerPos.x, centerPos.y, scaleInfo, panelWidth, panelHeight);
        
        // Try to autofill form with existing user data
        this.attemptAutofill();
        
        // Responsive submit button
        const submitWidth = scaleDimension(200, scaleInfo);
        const submitHeight = scaleDimension(50, scaleInfo);
        const submitBg = this.add.rectangle(centerPos.x, centerPos.y + (panelHeight/2 - 70), submitWidth, submitHeight, 0x0f4c75);
        submitBg.setStrokeStyle(2, 0x3282b8);
        
        const submitFontSize = scaleFontSize(18, scaleInfo);
        const submitText = this.add.text(centerPos.x, centerPos.y + (panelHeight/2 - 70), 'Submit & Continue', {
            fontFamily: 'Arial',
            fontSize: `${submitFontSize}px`,
            fontWeight: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Loading indicator (hidden initially)
        const loadingFontSize = scaleFontSize(16, scaleInfo);
        this.loadingText = this.add.text(centerPos.x, centerPos.y + (panelHeight/2 - 30), 'Saving data...', {
            fontFamily: 'Arial',
            fontSize: `${loadingFontSize}px`,
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
        const animatedElements = [panelGlow, panel, title, instruction, submitBg, submitText];
        
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

    createFormFields(centerX, centerY, scaleInfo, panelWidth, panelHeight) {
        // Calculate position relative to the game canvas
        const gameCanvas = document.querySelector('#game canvas') || document.querySelector('canvas');
        const canvasRect = gameCanvas ? gameCanvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const scaleX = canvasRect.width / this.scale.width;
        const scaleY = canvasRect.height / this.scale.height;

        // Responsive field dimensions using mobile utilities
        const baseFieldWidth = 300;
        const fieldWidth = Math.min(
            scaleDimension(baseFieldWidth, scaleInfo),
            panelWidth - 120
        );
        const fieldHeight = scaleDimension(40, scaleInfo);
        
        const labelStyle = {
            fontFamily: 'Arial',
            fontSize: `${scaleFontSize(16, scaleInfo)}px`,
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
        
        // Responsive spacing between fields
        const fieldSpacing = scaleDimension(80, scaleInfo);
        const startY = -140;
        
        fields.forEach((field, index) => {
            const yOffset = startY + (index * fieldSpacing);
            
            // Responsive label positioning
            const labelX = scaleInfo.isMobile ? centerX - (panelWidth/2 - 30) : centerX - scaleDimension(250, scaleInfo);
            const fieldX = scaleInfo.isMobile ? centerX : centerX + scaleDimension(50, scaleInfo);
            
            // Label
            this.add.text(labelX, centerY + yOffset, field.label, labelStyle);
            
            // Field background
            const fieldBg = this.add.rectangle(fieldX, centerY + yOffset, fieldWidth, fieldHeight, 0x0a1628);
            fieldBg.setStrokeStyle(2, 0x3282b8);

            if (field.type === 'input') {
                // Create text input
                const inputElement = document.createElement('input');
                inputElement.type = 'text';
                inputElement.placeholder = field.placeholder;
                this.setupInputElement(inputElement, fieldX, centerY + yOffset, fieldWidth, fieldHeight, canvasRect, scaleX, scaleY, scaleInfo);
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

                this.setupInputElement(selectElement, fieldX, centerY + yOffset, fieldWidth, fieldHeight, canvasRect, scaleX, scaleY, scaleInfo);
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

    setupInputElement(element, x, y, width, height, canvasRect, scaleX, scaleY, scaleInfo) {
        element.style.position = 'absolute';
        element.style.left = `${canvasRect.left + (x - width/2) * scaleX}px`;
        element.style.top = `${canvasRect.top + (y - height/2) * scaleY}px`;
        element.style.width = `${(width - 10) * scaleX}px`;
        element.style.height = `${(height - 6) * scaleY}px`;
        element.style.fontSize = `${scaleFontSize(16, scaleInfo) * Math.min(scaleX, scaleY)}px`;
        element.style.padding = scaleInfo.isMobile ? '6px' : '8px';
        element.style.border = 'none';
        element.style.borderRadius = '5px';
        element.style.backgroundColor = '#0a1628';
        element.style.color = '#ffffff';
        element.style.outline = 'none';
        element.style.zIndex = '1000';
        element.style.fontFamily = 'Arial, sans-serif';

        // Mobile-specific optimizations
        if (scaleInfo.isMobile) {
            // Prevent zoom on focus for iOS - ensure minimum 16px font size
            const minFontSize = Math.max(16, scaleFontSize(14, scaleInfo) * Math.min(scaleX, scaleY));
            element.style.fontSize = minFontSize + 'px';
            
            // Better mobile input handling
            element.setAttribute('autocomplete', 'off');
            element.setAttribute('autocorrect', 'off');
            element.setAttribute('autocapitalize', 'words');
            element.setAttribute('spellcheck', 'false');
            
            // Add mobile-specific viewport meta tag to prevent zooming
            element.setAttribute('inputmode', element.type === 'text' ? 'text' : 'none');
            
            // Ensure input is visible when virtual keyboard appears
            element.addEventListener('focus', () => {
                this.handleMobileFocus(element);
            });
            
            element.addEventListener('blur', () => {
                this.handleMobileBlur();
            });
        }

        // Disable Phaser keyboard capture when focused
        element.addEventListener('focus', () => {
            if (this.input && this.input.keyboard) {
                this.input.keyboard.enabled = false;
            }
        });

        element.addEventListener('blur', () => {
            if (this.input && this.input.keyboard) {
                this.input.keyboard.enabled = true;
            }
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

    handleMobileFocus(element) {
        // Check if game is in fullscreen and exit fullscreen to allow keyboard input
        if (document.fullscreenElement && this.scaleInfo.isMobile) {
            console.log('Exiting fullscreen to allow mobile keyboard input');
            document.exitFullscreen().catch(err => {
                console.warn('Could not exit fullscreen:', err);
            });
        }
        
        // Store original viewport settings
        if (!this.originalViewport) {
            const viewport = document.querySelector('meta[name="viewport"]');
            this.originalViewport = viewport ? viewport.getAttribute('content') : '';
        }

        // Temporarily adjust viewport to prevent scaling issues
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        // Prevent zoom on iOS while allowing user interaction
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

        // Scroll element into view with padding for virtual keyboard
        setTimeout(() => {
            const elementRect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const keyboardHeight = viewportHeight * 0.4; // Estimate keyboard height
            
            if (elementRect.bottom > viewportHeight - keyboardHeight) {
                const scrollAmount = elementRect.bottom - (viewportHeight - keyboardHeight) + 20;
                window.scrollBy(0, scrollAmount);
                
                // Also try to bring element into view using scrollIntoView
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }
        }, 300); // Delay to allow keyboard to appear

        // Add visual indicator that input is focused
        element.style.borderColor = '#00ff88';
        element.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
    }

    handleMobileBlur() {
        // Restore original viewport settings
        if (this.originalViewport !== undefined) {
            let viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                if (this.originalViewport) {
                    viewport.setAttribute('content', this.originalViewport);
                } else {
                    viewport.remove();
                }
            }
        }

        // Scroll back to original position
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 300);

        // Remove focus visual indicators from all form elements
        Object.values(this.formElements || {}).forEach(formElement => {
            formElement.style.borderColor = '';
            formElement.style.boxShadow = '';
        });
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
        
        console.log('📝 DataCollectionScreen: Form values retrieved:', {
            firstName,
            lastName,
            department,
            strandYear
        });
        
        // Validation
        const missingFields = [];
        if (!firstName) missingFields.push('First Name');
        if (!lastName) missingFields.push('Last Name');
        if (!department) missingFields.push('Department');
        if (!strandYear) missingFields.push('Strand/Year');
        
        console.log('✅ DataCollectionScreen: Validation check:', { missingFields });
        
        if (missingFields.length > 0) {
            console.log('❌ DataCollectionScreen: Validation failed - missing fields:', missingFields);
            // Show error message
            const errorText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 180, 
                `Please fill in: ${missingFields.join(', ')}`, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ff4444',
                align: 'center'
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: errorText,
                alpha: 0,
                duration: 2000,
                delay: 2000,
                onComplete: () => errorText.destroy()
            });
            return;
        }
        
        console.log('✅ DataCollectionScreen: Validation passed - proceeding with submission');
        
        // Show loading indicator
        this.loadingText.setAlpha(1);
        console.log('🔄 DataCollectionScreen: Loading indicator shown');
        
        try {
            // Get student data from localStorage (same way authService stores it)
            let studentId = 'unknown';
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
        if (this.formElements) {
            Object.values(this.formElements).forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        }
        
        // Re-enable Phaser keyboard
        if (this.input && this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }
    }
    
    shutdown() {
        // Clean up form elements on scene shutdown and restore Phaser keyboard
        this.cleanupFormElements();
        super.shutdown();
    }
}
