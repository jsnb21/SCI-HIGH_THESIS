import Phaser from 'phaser';
import { updateSoundVolumes, playExclusiveBGM } from '../audioUtils'; // <-- updated import
import VNDialogueBox from '../ui/VNDialogueBox';
import LoadingScreen from '../ui/LoadingScreen';

// Visual Novel Scene class extending Phaser.Scene
export default class VNScene extends Phaser.Scene {
  constructor() {
    super('VNScene');
    
    // Add data collection form variables
    this.formElements = {};
    this.isShowingDataCollection = false;
    
    // Firebase config (same as DataCollectionScreen)
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
      console.log('Starting Firebase initialization for VNScene...');
      
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
      console.log('Firebase Database initialized successfully for VNScene');
    } catch (error) {
      console.error('Failed to initialize Firebase for VNScene:', error);
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

  preload() {
    // JSON
    this.load.json('dialogue', 'data/dialogue.json');
    
    // Images
    this.load.image('vnBg', 'assets/img/bg/classroom_day.png');
    this.load.image('SCI-HIGH_SCHOOL', 'assets/img/bg/SCI-HIGH_SCHOOL.png'); // Correct path
    this.load.image('Richard', 'assets/sprites/npcs/principal.png');
    
    // Load character tutor images
    this.load.image('Noah', 'assets/sprites/npcs/Noah.png');
    this.load.image('Lily', 'assets/sprites/npcs/Lily.png');
    this.load.image('Damian', 'assets/sprites/npcs/Damian.png');
    this.load.image('Bella', 'assets/sprites/npcs/Bella.png');
    this.load.image('Finley', 'assets/sprites/npcs/Finley.png');
    
    // Audio
    this.load.audio('se_select', 'assets/audio/se/se_select.wav');
    this.load.audio('bgm_main', 'assets/audio/bgm/bgm_mainhub.mp3');
  }

  create() {
    const { width, height } = this.scale;
    
    // Start with the opening sequence
    this.startOpeningSequence();
  }

  startOpeningSequence() {
    const { width, height } = this.scale;
    
    // Create black background
    const blackBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
    blackBg.setDepth(0);
    
    // Add SCI-HIGH school image (initially invisible)
    const schoolImage = this.add.image(width / 2, height / 2, 'SCI-HIGH_SCHOOL');
    schoolImage.setDisplaySize(width, height);
    schoolImage.setAlpha(0);
    schoolImage.setDepth(1);
    
    // Create additional dark overlay for the school image to make it darker
    const schoolDarkOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
    schoolDarkOverlay.setAlpha(0);
    schoolDarkOverlay.setDepth(1.5);
    
    // Create dim overlay (initially invisible) - increased opacity for darker effect
    const dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    dimOverlay.setAlpha(0);
    dimOverlay.setDepth(2);
    
    // Create text elements (initially invisible)
    const textStyle = {
      fontSize: `${Math.min(width, height) * 0.04}px`,
      color: '#FFFFFF',
      fontFamily: 'Helvetica',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 5
    };
    
    const line1 = this.add.text(width / 2, height * 0.3, 'SCI-HIGH is where I will reach my dreams one step closer...', textStyle);
    line1.setOrigin(0.5).setAlpha(0).setDepth(3);
    
    const line2 = this.add.text(width / 2, height * 0.45, 'To become a smarter and better programmer...', textStyle);
    line2.setOrigin(0.5).setAlpha(0).setDepth(3);
    
    const line3 = this.add.text(width / 2, height * 0.6, 'In this place where I must aim high to soar high!', textStyle);
    line3.setOrigin(0.5).setAlpha(0).setDepth(3);
    
    // Animation sequence using regular tweens and delayed calls - improved pacing
    // 1. Fade in school image with dark overlay (faster)
    this.tweens.add({
      targets: schoolImage,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });
    
    // Fade in the school dark overlay at the same time to make it darker
    this.tweens.add({
      targets: schoolDarkOverlay,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });
    
    // 2. Wait for 2 seconds, then dim the image even more (reduced from 4s to 2.5s)
    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: dimOverlay,
        alpha: 1,
        duration: 800,
        ease: 'Power2'
      });
    });
    
    // 3. Fade in text lines one by one (faster overlapping timing)
    this.time.delayedCall(3500, () => {
      this.tweens.add({
        targets: line1,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
    });
    
    this.time.delayedCall(4800, () => {
      this.tweens.add({
        targets: line2,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
    });
    
    this.time.delayedCall(6100, () => {
      this.tweens.add({
        targets: line3,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
    });
    
    // 4. Fade out everything and start normal intro (much faster - reduced from 13.5s to 8.5s)
    this.time.delayedCall(8500, () => {
      this.tweens.add({
        targets: [schoolImage, schoolDarkOverlay, dimOverlay, line1, line2, line3, blackBg],
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
          // Clean up opening sequence elements
          schoolImage.destroy();
          schoolDarkOverlay.destroy();
          dimOverlay.destroy();
          line1.destroy();
          line2.destroy();
          line3.destroy();
          blackBg.destroy();
          
          // Start normal intro
          this.startNormalIntro();
        }
      });
    });
  }

  startNormalIntro() {
    // Add and scale the background image to fit the screen
    const { width, height } = this.scale;
    const bg = this.add.image(width / 2, height / 2, 'vnBg').setDisplaySize(width, height);
    // Add a dim overlay above the background
    const dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
    this.children.moveAbove(dimOverlay, bg);

    // --- MUSIC LOGIC START ---
    playExclusiveBGM(this, 'bgm_main', { loop: true });
    updateSoundVolumes(this);
    // --- MUSIC LOGIC END ---

    // Retrieve dialogue lines from loaded JSON
    const dialogueData = this.cache.json.get('dialogue');
    const dialogueLines = dialogueData && dialogueData.intro ? dialogueData.intro : [];

    if (!dialogueLines.length) {
      // Show error if dialogue missing
      this.add.text(width / 2, height / 2, 'Dialogue not found.', {
        font: '24px Arial',
        color: '#ff0000'
      }).setOrigin(0.5);
      return;
    }

    // Initialize character display
    this.currentCharacter = null;
    this.characterDisplay = null;

    // Character mapping for dialogue lines (0-indexed)
    this.characterMap = {
      0: 'Richard',  // Principal introduction
      1: 'Richard',  // About SCI-HIGH
      2: 'Richard',  // About tutors
      3: 'Noah',     // Noah introduction
      4: 'Lily',     // Lily introduction
      5: 'Damian',   // Damian introduction
      6: 'Bella',    // Bella introduction
      7: 'Finley',   // Finley introduction
      8: 'Richard',  // About tutors helping with exams
      9: 'Richard',  // Finding them in classroom
      10: 'Richard', // Fill up details line - show data collection after this
      11: 'Richard', // Go to Computer Lab
      12: 'Richard'  // Good luck
    };

    // Add initial principal character
    this.showCharacter('Richard');

    // Use VNDialogueBox for dialogue
    this.vnBox = new VNDialogueBox(this, dialogueLines, () => {
      // This callback is called when all dialogue is finished
      this.proceedToMainHub();
    });
    this.add.existing(this.vnBox);

    // Override the vnBox's nextDialogue method to handle character switching and data collection
    const originalNextDialogue = this.vnBox.nextDialogue.bind(this.vnBox);
    this.vnBox.nextDialogue = () => {
      // Check if we're at the data collection dialogue line (index 10)
      if (this.vnBox.dialogueIndex === 10 && !this.isShowingDataCollection) {
        // Show data collection form instead of proceeding to next dialogue
        this.showDataCollectionForm();
        return;
      }
      
      originalNextDialogue();
      // Update character display based on current dialogue index
      const nextCharacter = this.characterMap[this.vnBox.dialogueIndex];
      if (nextCharacter && nextCharacter !== this.currentCharacter) {
        this.showCharacter(nextCharacter);
      }
    };
  }

  showCharacter(characterKey) {
    // Remove current character if exists
    if (this.characterDisplay) {
      this.characterDisplay.destroy();
    }

    const { width, height } = this.scale;
    
    // Apply special positioning for principal Richard
    let characterY, characterScale;
    if (characterKey === 'Richard') {
      // Position principal so half of his body is covered by the dialogue box
      characterY = height * 0.7; // Lower position so dialogue box covers upper half
      
      // Responsive scaling for mobile devices - increased size for principal
      const isMobile = width < 768 || height < 600;
      characterScale = isMobile ? 0.35 : 0.8; // Larger scale for more presence
    } else {
      // Default positioning for other characters
      characterY = height * 0.45; // Position at 45% of screen height from top
      
      // Responsive scaling for mobile devices
      const isMobile = width < 768 || height < 600;
      characterScale = isMobile ? 0.175 : 0.56; // 50% smaller for mobile devices
    }
    
    // Add new character
    this.characterDisplay = this.add.image(width / 2, characterY, characterKey);
    this.characterDisplay.setOrigin(0.5, 0.5); // Center origin for better positioning
    this.characterDisplay.setScale(characterScale);
    this.characterDisplay.setDepth(5); // Behind dialogue box but above background
    
    this.currentCharacter = characterKey;

    // Add a subtle fade-in effect
    this.characterDisplay.setAlpha(0);
    this.tweens.add({
      targets: this.characterDisplay,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
  }

  showDataCollectionForm() {
    console.log('Showing data collection form...');
    this.isShowingDataCollection = true;
    
    // Hide the dialogue box by hiding its components
    if (this.vnBox) {
      if (this.vnBox.border) this.vnBox.border.setVisible(false);
      if (this.vnBox.textObject) this.vnBox.textObject.setVisible(false);
    }
    
    const { width, height } = this.scale;
    
    // Create overlay to dim the background
    this.dataCollectionOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.dataCollectionOverlay.setDepth(10);
    
    // Create main panel
    const panelWidth = 700;
    const panelHeight = 550;
    const panelX = width / 2;
    const panelY = height / 2;
    
    // Panel shadow
    const shadow = this.add.rectangle(panelX + 5, panelY + 5, panelWidth, panelHeight, 0x000000, 0.5);
    shadow.setDepth(11);
    
    // Main panel
    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x16213e);
    panel.setStrokeStyle(3, 0x0f4c75);
    panel.setDepth(12);
    
    // Panel glow effect
    const panelGlow = this.add.rectangle(panelX, panelY, panelWidth + 10, panelHeight + 10, 0x0f4c75, 0.3);
    panelGlow.setDepth(11);
    
    // Title
    const title = this.add.text(panelX, panelY - 220, 'Student Information', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#00ff88',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5).setDepth(13);
    
    // Instruction text
    const instruction = this.add.text(panelX, panelY - 180, 'Please fill in your details to begin your SCI-HIGH journey:', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5).setDepth(13);
    
    // Store UI elements for cleanup
    this.dataCollectionElements = [this.dataCollectionOverlay, shadow, panel, panelGlow, title, instruction];
    
    // Create form fields
    this.createFormFields(panelX, panelY);
    
    // Try to autofill form with existing user data
    this.attemptAutofill();
    
    // Submit button
    const submitBg = this.add.rectangle(panelX, panelY + 200, 200, 50, 0x0f4c75);
    submitBg.setStrokeStyle(2, 0x3282b8);
    submitBg.setDepth(13);
    
    const submitText = this.add.text(panelX, panelY + 200, 'Continue', {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(13);
    
    // Loading indicator (hidden initially)
    this.loadingText = this.add.text(panelX, panelY + 260, 'Saving data...', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffaa00',
      alpha: 0
    }).setOrigin(0.5).setDepth(13);
    
    this.dataCollectionElements.push(submitBg, submitText, this.loadingText);
    
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
        this.handleDataCollectionSubmit();
      });
    
    // Entrance animations
    this.dataCollectionElements.forEach((element, index) => {
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

  createFormFields(centerX, centerY) {
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
      const label = this.add.text(centerX - 250, centerY + yOffset, field.label, labelStyle);
      label.setDepth(13);
      this.dataCollectionElements.push(label);
      
      // Field background
      const fieldBg = this.add.rectangle(centerX + 50, centerY + yOffset, fieldWidth, fieldHeight, 0x0a1628);
      fieldBg.setStrokeStyle(2, 0x3282b8);
      fieldBg.setDepth(12);
      this.dataCollectionElements.push(fieldBg);

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
        this.handleDataCollectionSubmit();
      }
    });

    element.addEventListener('keypress', (event) => {
      event.stopPropagation();
      
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleDataCollectionSubmit();
      }
    });

    // Add to DOM
    document.body.appendChild(element);
  }

  async attemptAutofill() {
    try {
      console.log('🔍 Attempting to autofill form with existing user data...');
      
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
    }).setOrigin(0.5).setDepth(13);
    
    this.dataCollectionElements.push(hintText);
    
    // Fade out the hint after 3 seconds
    this.tweens.add({
      targets: hintText,
      alpha: 0,
      duration: 3000,
      delay: 2000,
      onComplete: () => hintText.destroy()
    });
  }

  async handleDataCollectionSubmit() {
    console.log('🔄 VNScene: handleDataCollectionSubmit() called');
    
    // Get form data
    const firstName = this.formElements.firstName?.value.trim() || '';
    const lastName = this.formElements.lastName?.value.trim() || '';
    const department = this.formElements.department?.value || '';
    const strandYear = this.formElements.strandYear?.value.trim() || '';
    
    console.log('📝 VNScene: Form values retrieved:', {
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
    
    if (missingFields.length > 0) {
      console.log('❌ VNScene: Validation failed - missing fields:', missingFields);
      // Show error message
      const errorText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 180, 
        `Please fill in: ${missingFields.join(', ')}`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ff4444',
        align: 'center'
      }).setOrigin(0.5).setDepth(14);
      
      this.dataCollectionElements.push(errorText);
      
      this.tweens.add({
        targets: errorText,
        alpha: 0,
        duration: 2000,
        delay: 2000,
        onComplete: () => errorText.destroy()
      });
      return;
    }
    
    console.log('✅ VNScene: Validation passed - proceeding with submission');
    
    // Show loading indicator
    this.loadingText.setAlpha(1);
    
    try {
      // Save student data to localStorage for future use
      const studentDataForStorage = {
        firstName: firstName,
        lastName: lastName,
        department: department,
        strandYear: strandYear,
        timestamp: Date.now()
      };
      localStorage.setItem('studentInfo', JSON.stringify(studentDataForStorage));
      localStorage.setItem('recentStudentData', JSON.stringify(studentDataForStorage));
      console.log('💾 Student data saved to localStorage');
      
      // Hide data collection form
      this.hideDataCollectionForm();
      
      // Continue with the remaining dialogue
      this.continueDialogue();
      
    } catch (error) {
      console.error('Error saving student data:', error);
      
      // Show error and continue anyway
      this.loadingText.setText('Save failed - continuing...');
      this.loadingText.setColor('#ff4444');
      
      this.time.delayedCall(2000, () => {
        this.hideDataCollectionForm();
        this.continueDialogue();
      });
    }
  }

  hideDataCollectionForm() {
    // Clean up form elements
    if (this.formElements) {
      Object.values(this.formElements).forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      this.formElements = {};
    }
    
    // Clean up UI elements
    if (this.dataCollectionElements) {
      this.dataCollectionElements.forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.dataCollectionElements = [];
    }
    
    // Re-enable Phaser keyboard
    if (this.input && this.input.keyboard) {
      this.input.keyboard.enabled = true;
    }
    
    this.isShowingDataCollection = false;
  }

  continueDialogue() {
    // Show the dialogue box again by showing its components
    if (this.vnBox) {
      if (this.vnBox.border) this.vnBox.border.setVisible(true);
      if (this.vnBox.textObject) this.vnBox.textObject.setVisible(true);
      
      // Manually advance to the next dialogue line (Computer Lab)
      this.vnBox.dialogueIndex = 11; // Set to Computer Lab line
      this.vnBox.text = this.vnBox.dialogueLines[this.vnBox.dialogueIndex];
      
      // Play select sound and type the text
      if (this.vnBox.selectSound) this.vnBox.selectSound.play();
      this.vnBox.typeText(this.vnBox.text);
      
      // Update character display
      const nextCharacter = this.characterMap[this.vnBox.dialogueIndex];
      if (nextCharacter && nextCharacter !== this.currentCharacter) {
        this.showCharacter(nextCharacter);
      }
    }
  }

  proceedToMainHub() {
    // Clean up any remaining form elements
    this.hideDataCollectionForm();
    
    // Proceed to main hub
    LoadingScreen.transitionToMainHub(this, 'Preparing SCI-HIGH Academy...', 2500);
  }

  shutdown() {
    // Clean up form elements on scene shutdown
    this.hideDataCollectionForm();
    super.shutdown();
  }
}