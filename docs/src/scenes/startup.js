import Phaser from 'phaser';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getResponsivePosition,
    createResponsiveTextStyle,
    getSafeArea
} from '../utils/mobileUtils.js';
import { FullscreenUtils } from '../utils/fullscreenUtils.js';

const SCREEN_CONFIG = {
    BASE_WIDTH: window.innerWidth,   // Using dynamic window width instead of fixed 816
    BASE_HEIGHT: window.innerHeight, // Using dynamic window height instead of fixed 624
    LOGO_MAX_WIDTH: 600              // Keeping the increased logo size
};

export default class StartupScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartupScene' });
        this.uiElements = [];
        this.logoElements = [];
        this.isTransitioning = false; // prevent redraw/races during FS transition
        this._logoStarted = false; // guard to avoid double-start
    }

    preload() {
        this.load.image('logo', 'assets/img/Website/buko_productions-logo.png');
    }    create() {
        // Set up event listeners using fullscreen utility (kept for resize/orientation behaviors)
        this.fullscreenManager = FullscreenUtils.setupScene(this);

        // Set up keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Remove any residual DOM fullscreen prompt overlay if present
        try {
            if (window.__cleanupFullscreenPrompt) {
                window.__cleanupFullscreenPrompt();
            } else {
                const el = document.getElementById('fullscreen-prompt-overlay');
                if (el) el.style.display = 'none';
            }
        } catch {}

        // If user previously acknowledged privacy (and disclaimer), skip directly to logo sequence
        const acknowledged = this.getPrivacyAcknowledged();
        if (acknowledged) {
            this.time.delayedCall(60, () => this.playLogoSequence());
        } else {
            // New order: privacy first -> AI disclaimer -> logo
            this.time.delayedCall(80, () => this.showDataPrivacyNotice());
        }
    }

    // localStorage helpers
    getPrivacyAcknowledged() {
        try {
            return window.localStorage.getItem('scigame_privacy_ack') === '1';
        } catch { return false; }
    }
    setPrivacyAcknowledged() {
        try { window.localStorage.setItem('scigame_privacy_ack','1'); } catch {}
    }

    // Display a brief AI assets disclaimer due to time/resource constraints, then proceed
    showAIDisclaimerThenLogo() {
        const { width, height } = this.scale;
        const isSmall = width < 480;
        const isMobile = width < 768;

        // Full black background (match screenshot)
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1)
            .setOrigin(0.5)
            .setAlpha(0);

        // Header style (big red, centered)
        const headerFontSize = isSmall ? 48 : (isMobile ? 56 : 72);
        const header = this.add.text(width / 2, height * 0.23, 'DISCLAIMER', {
            fontFamily: 'Arial Black, Arial',
            fontSize: headerFontSize + 'px',
            fontStyle: 'bold',
            color: '#ff0000',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true
            }
        }).setOrigin(0.5).setAlpha(0);

        // Body paragraph (exact wording from screenshot)
    const bodyMaxWidth = Math.min(width * 0.82, 1100);
    // Increase previous base sizes (~14 / 16 / 20) by 30%
    const baseBodyFontSize = isSmall ? 14 : (isMobile ? 16 : 20);
    const bodyFontSize = Math.round(baseBodyFontSize * 1.3);
        const bodyText = this.add.text(width / 2, height * 0.52,
            "This game contains assets generated with the assistance of artificial intelligence (AI). Due to limited time and resources, AI tools were used to create certain visual and audio elements that support the overall development process. This allowed the team to focus more on gameplay, design, and delivering the best experience possible within our constraints.",
            {
                fontFamily: 'Arial',
                fontSize: bodyFontSize + 'px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: bodyMaxWidth },
                lineSpacing: 6,
                stroke: '#000000',
                strokeThickness: 3,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 3,
                    fill: true
                }
            }
        ).setOrigin(0.5).setAlpha(0);

        // Animate fade in similar to screenshot pacing
        this.tweens.add({ targets: bg, alpha: 1, duration: 350, ease: 'Power2' });
        this.tweens.add({ targets: header, alpha: 1, duration: 550, ease: 'Power2', delay: 120 });
        this.tweens.add({ targets: bodyText, alpha: 1, duration: 600, ease: 'Power2', delay: 300 });

        this._disclaimerElems = [bg, header, bodyText];

        const proceed = () => {
            if (this._disclaimerDone) return;
            this._disclaimerDone = true;
            this.tweens.add({
                targets: [bodyText, header, bg],
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    this._disclaimerElems?.forEach(el => el.destroy());
                    this._disclaimerElems = null;
                    // After AI disclaimer now go directly to logo sequence
                    this.playLogoSequence();
                }
            });
            this.input.off('pointerdown', proceed, this);
            if (this.enterKey) this.enterKey.off('down', proceed, this);
        };

        // Allow skip or auto-continue (slightly longer to read)
        this.time.delayedCall(4000, proceed);
        this.input.once('pointerdown', proceed, this);
        if (this.enterKey) this.enterKey.once('down', proceed, this);
    }

    // Data Privacy Notice (must acknowledge to proceed)
    showDataPrivacyNotice() {
        const { width, height } = this.scale;
        const isMobile = width < 768;
        const isSmall = width < 480;

        // Dim background overlay
        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.55)
            .setOrigin(0.5).setAlpha(0);

        // Modal dimensions
    // Slightly larger for small screens to maximize readable area
    const panelWidth = Math.min(width * 0.92, 800);
    const panelHeight = Math.min(height * 0.82, 560);
        const panelX = width / 2;
        const panelY = height / 2;

        // Panel base (dark navy gradient simulated with two rects)
        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0f1524, 0.95)
            .setStrokeStyle(3, 0xffdd33, 1)
            .setOrigin(0.5)
            .setAlpha(0);

        // Header bar
        const headerHeight = 68;
        const headerBar = this.add.rectangle(panelX, panelY - panelHeight/2 + headerHeight/2, panelWidth, headerHeight, 0x121d31, 1)
            .setOrigin(0.5)
            .setAlpha(0);

        // Warning icon circle
        const iconRadius = 22;
        const iconX = panelX - panelWidth/2 + 28 + iconRadius;
        const iconY = headerBar.y;
        const iconCircle = this.add.circle(iconX, iconY, iconRadius, 0xffcc18, 1).setAlpha(0);
        const iconText = this.add.text(iconX, iconY, '⚠', { fontFamily:'Arial', fontSize: (isMobile? 28:30) + 'px', color:'#222222'}).setOrigin(0.5).setAlpha(0);

        // Title text
        const titleFontSize = isMobile ? 26 : 28;
        const titleText = this.add.text(iconX + iconRadius + 18, iconY, 'Data Privacy Notice', {
            fontFamily: 'Arial Black, Arial',
            fontSize: titleFontSize + 'px',
            color: '#ffffff'
        }).setOrigin(0,0.5).setAlpha(0);

        // (Removed close X button per request)

        // Body content
        const bodyPaddingX = 40;
        const bodyPaddingTop = 24;
        const bodyAreaWidth = panelWidth - bodyPaddingX*2;
        const baseBodyFont = isSmall?14:(isMobile?15:16);
        const bodyFontSize = baseBodyFont + 2; // Slightly larger
        const bodyStartY = headerBar.y + headerHeight/2 + bodyPaddingTop;
        const bodyText = this.add.text(panelX, bodyStartY, 
            'In compliance with the Data Privacy Act of 2012, this game collects only the information you provide during login or signup, along with essential gameplay data such as scores, number of sessions, and course progression.\n\nWe value your privacy and are committed to protecting your personal information. All collected data is securely stored and used solely for research, academic development, and improving the gameplay and learning experience. Your data will never be shared with third parties without your consent and will always be treated with the highest level of confidentiality.',
            {
                fontFamily: 'Arial',
                fontSize: bodyFontSize + 'px',
                color: '#dbe3f2',
                align: 'left',
                wordWrap: { width: bodyAreaWidth },
                lineSpacing: 8
            }
        ).setOrigin(0.5,0).setAlpha(0);

        // Scroll mask (if content taller than available area)
        const availableBodyHeight = panelHeight - headerHeight - 140; // reserve space for button + checkbox
        const needsScroll = bodyText.height > availableBodyHeight;
        let bodyMaskShape = null;
        if (needsScroll) {
            bodyMaskShape = this.add.rectangle(panelX, bodyStartY + availableBodyHeight/2, bodyAreaWidth, availableBodyHeight, 0xffffff, 0)
                .setOrigin(0.5);
            bodyText.setY(bodyStartY); // ensure starting position
            bodyText.setMask(bodyMaskShape.createBitmapMask());
            // Enable wheel scroll
            this.input.on('wheel', (pointer, over, dx, dy) => {
                if (this._privacyDone) return;
                const delta = dy * 0.5; // slower scroll
                bodyText.y = Phaser.Math.Clamp(bodyText.y - delta, bodyStartY - (bodyText.height - availableBodyHeight), bodyStartY);
            });
            // Drag scroll (touch / pointer)
            let dragStartY = 0;
            let contentStartY = 0;
            bodyText.setInteractive();
            bodyText.on('pointerdown', (p) => { dragStartY = p.position.y; contentStartY = bodyText.y; });
            bodyText.on('pointermove', (p) => {
                if (!p.isDown) return;
                const diff = p.position.y - dragStartY;
                bodyText.y = Phaser.Math.Clamp(contentStartY + diff, bodyStartY - (bodyText.height - availableBodyHeight), bodyStartY);
            });
        }

        // Buttons row
    const buttonsY = panelY + panelHeight/2 - (isMobile? 88:78);
    const primaryColor = 0xffdd33;
    const btnW = 260;
    const btnH = isMobile? 60:56;
    const yesX = panelX; // Centered single button

        const makeButton = (x,y,w,h,color,label,isPrimary=false) => {
            const rect = this.add.rectangle(x,y,w,h,color,1).setOrigin(0.5).setAlpha(0).setInteractive({useHandCursor:true});
            rect.setStrokeStyle(2, isPrimary? 0xffe572 : 0x596276, 1);
            const txt = this.add.text(x,y,label,{
                fontFamily:'Arial',
                fontSize:(isMobile?22:20)+'px',
                fontStyle:'bold',
                color: isPrimary? '#1a1f29':'#ffffff'
            }).setOrigin(0.5).setAlpha(0);
            rect.on('pointerover',()=> rect.setFillStyle(isPrimary?0xffe04a:0x4a566b));
            rect.on('pointerout',()=> rect.setFillStyle(color));
            return {rect, txt};
        };

        const yesBtn = makeButton(yesX, buttonsY, btnW, btnH, primaryColor, 'Yes, I Understand', true);

        // Checkbox: Don't show again
        const checkboxY = buttonsY - (isMobile ? 70 : 64);
        const boxSize = 28;
        const cbX = panelX - btnW/2 + 4; // align left under text start
        const cbRect = this.add.rectangle(cbX, checkboxY, boxSize, boxSize, 0x1d2a3b, 1).setStrokeStyle(2, 0xffdd33, 1).setOrigin(0.5).setAlpha(0).setInteractive({useHandCursor:true});
        const cbMark = this.add.text(cbX, checkboxY, '', {fontFamily:'Arial Black', fontSize: (boxSize-6)+'px', color:'#ffdd33'}).setOrigin(0.5).setAlpha(0);
        const cbLabel = this.add.text(cbX + boxSize/2 + 12, checkboxY, "Don't show again", {fontFamily:'Arial', fontSize:(isMobile?18:17)+'px', color:'#dbe3f2'}).setOrigin(0,0.5).setAlpha(0).setInteractive();
        let cbChecked = false;
        const toggleCb = () => {
            cbChecked = !cbChecked;
            cbMark.setText(cbChecked ? '✓' : '');
            // sound feedback
            try { this.sound.play('se_select',{volume:0.6}); } catch {}
        };
        cbRect.on('pointerdown', toggleCb);
        cbLabel.on('pointerdown', toggleCb);

    const elements = [overlay, panel, headerBar, iconCircle, iconText, titleText, bodyText, yesBtn.rect, yesBtn.txt, cbRect, cbMark, cbLabel];
    if (bodyMaskShape) elements.push(bodyMaskShape);
        this._privacyElems = elements;

        const proceed = () => {
            if (this._privacyDone) return;
            this._privacyDone = true;
            this.tweens.add({
                targets: elements,
                alpha: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    // Persist acknowledgment if checked
                    if (cbChecked) this.setPrivacyAcknowledged();
                    elements.forEach(e=>{ if (e && e.destroy) e.destroy(); });
                    // After privacy, now show AI disclaimer (reordered)
                    this.showAIDisclaimerThenLogo();
                }
            });
            if (this.enterKey) this.enterKey.off('down', onEnter, this);
        };

        const onEnter = () => proceed();
        if (this.enterKey) this.enterKey.once('down', onEnter, this);
        yesBtn.rect.on('pointerdown', () => {
            try { this.sound.play('se_select',{volume:0.7}); } catch {}
            this.tweens.add({ targets:[yesBtn.rect, yesBtn.txt], scaleX:0.94, scaleY:0.94, duration:110, yoyo:true, ease:'Power2', onComplete:proceed });
        });

        // Intro animation
        this.tweens.add({ targets: overlay, alpha:0.6, duration:260, ease:'Power2' });
        this.tweens.add({ targets: panel, alpha:1, duration:320, ease:'Back.Out' });
        this.tweens.add({ targets: [headerBar, iconCircle, iconText, titleText], alpha:1, duration:380, ease:'Power2', delay:140 });
        this.tweens.add({ targets: bodyText, alpha:1, duration:420, ease:'Power2', delay:260 });
        this.tweens.add({ targets: [cbRect, cbMark, cbLabel], alpha:1, duration:420, ease:'Power2', delay:360 });
        this.tweens.add({ targets: [yesBtn.rect, yesBtn.txt], alpha:1, duration:420, ease:'Power2', delay:460 });
    }

    showFullscreenPrompt() {
        // Clear any existing elements
        this.clearUI();
        
    const scaleInfo = getScaleInfo(this);
    const isMobile = !!scaleInfo.isMobile;
    const isLandscape = !!scaleInfo.isLandscape;
        // Prefer displayed size (CSS pixels) to match what user actually sees; fallback to logical size
        const displayW = this.scale.displaySize ? this.scale.displaySize.width : this.scale.width;
        const displayH = this.scale.displaySize ? this.scale.displaySize.height : this.scale.height;
        const logicalWidth = this.scale.width;
        const logicalHeight = this.scale.height;
        // We'll base layout on display size for visual centering; Phaser will scale logical -> display.
        const layoutWidth = displayW;
        const layoutHeight = displayH;
        const safeArea = { width: layoutWidth * 0.92, height: layoutHeight * 0.92 };

        // iOS Safari fullscreen limitations detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const fullscreenSupported = !isIOS; // Simplified heuristic; iOS often blocks programmatic fullscreen

        // Create animated background with gradient effect
        const background = this.add.rectangle(logicalWidth / 2, logicalHeight / 2, logicalWidth, logicalHeight, 0x0f0f0f)
            .setOrigin(0.5)
            .setAlpha(0);
            
        // Create dialog with mobile-responsive design (scale by logical canvas, not raw px)
        // Mobile landscape: larger panel for readability; portrait: moderately larger
        let dialogWidth;
        let dialogHeight;
        if (isMobile) {
            if (isLandscape) {
                dialogWidth = Math.min(logicalWidth * 0.70, Math.max(600, logicalWidth * 0.6));
                dialogHeight = Math.max(240, logicalHeight * 0.32);
            } else {
                dialogWidth = Math.min(logicalWidth * 0.78, Math.max(420, logicalWidth * 0.55));
                dialogHeight = Math.max(220, logicalHeight * 0.34);
            }
        } else {
            dialogWidth = Math.min(logicalWidth * 0.50, 720);
            dialogHeight = Math.max(280, logicalHeight * 0.30);
        }
        
        // Dialog with rounded corners and light shadow
        const dialog = this.add.rectangle(logicalWidth / 2, logicalHeight / 2, dialogWidth, dialogHeight, 0x1a1a1a, 1)
            .setOrigin(0.5)
            .setStrokeStyle(isMobile ? 2 : 2, 0x4a4a4a, 0.9)
            .setAlpha(0);
        // Draw rounded border and shadow via a graphics overlay for nicer look
        const dialogBorder = this.add.graphics();
        dialogBorder.lineStyle(2, 0x4a4a4a, 0.9);
        dialogBorder.fillStyle(0x1a1a1a, 1);
        dialogBorder.fillRoundedRect((logicalWidth - dialogWidth)/2, (logicalHeight - dialogHeight)/2, dialogWidth, dialogHeight, 12);
        dialogBorder.strokeRoundedRect((logicalWidth - dialogWidth)/2, (logicalHeight - dialogHeight)/2, dialogWidth, dialogHeight, 12);
        dialogBorder.setAlpha(0);

        // Add glow effect to dialog
        const glowOffset = isMobile ? 14 : 16;
        const dialogGlow = this.add.rectangle(logicalWidth / 2, logicalHeight / 2, dialogWidth + glowOffset, dialogHeight + glowOffset, 0x000000, 0.25)
            .setOrigin(0.5)
            .setAlpha(0);


        // Main title with responsive text
        const titleStyle = {
            fontFamily: 'Arial Black, Arial',
            fontSize: isMobile ? (isLandscape ? '28px' : '26px') : '34px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            stroke: 'transparent',
            strokeThickness: 0
        };
        const titleOffset = isMobile ? (isLandscape ? 48 : 42) : 52;
    const titleText = this.add.text(logicalWidth / 2, logicalHeight / 2 - titleOffset, fullscreenSupported ? 'Go Fullscreen?' : 'Optimize Display?', titleStyle).setOrigin(0.5).setAlpha(0);
        
        // Subtitle with helpful note
        const subtitleStyle = {
            fontFamily: 'Arial',
            fontSize: isMobile ? (isLandscape ? '15px' : '14px') : '16px',
            color: '#cccccc',
            align: 'center',
            stroke: 'transparent',
            strokeThickness: 0
        };
        const subtitleOffset = isMobile ? 12 : 10;
    const subtitleText = this.add.text(logicalWidth / 2, logicalHeight / 2 - subtitleOffset, fullscreenSupported ? 'This can be toggled in the options later.' : 'Fullscreen limited on iOS; we will scale to fit.', subtitleStyle).setOrigin(0.5).setAlpha(0);

        // Remove benefits text - no longer needed
        const benefitsText = null;
        // Enhanced button styles
        const createStyledButton = (x, y, text, isPrimary = false) => {
            const buttonColor = isPrimary ? 0x3B82F6 : 0x374151;
            const textColor = isPrimary ? '#ffffff' : '#e5e7eb';
            const buttonWidth = isMobile ? (isLandscape ? 188 : 176) : 152;
            const buttonHeight = isMobile ? (isLandscape ? 64 : 60) : 58;
            
            // Button background
            const buttonBg = this.add.rectangle(x, y, buttonWidth, buttonHeight, buttonColor, 1)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, isPrimary ? 0x60A5FA : 0x555555, 0.8)
                .setAlpha(0);
            
            // Button text
            const buttonText = this.add.text(x, y, text, {
                fontFamily: 'Arial',
                fontSize: isMobile ? (isLandscape ? '22px' : '21px') : '18px',
                color: textColor,
                fontStyle: 'bold'
            }).setOrigin(0.5).setAlpha(0);

            // Hover effects
            buttonBg.on('pointerover', () => {
                this.tweens.add({
                    targets: buttonBg,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    ease: 'Power2'
                });
                buttonBg.setFillStyle(isPrimary ? 0x2563EB : 0x4B5563);
            });

            buttonBg.on('pointerout', () => {
                this.tweens.add({
                    targets: buttonBg,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Power2'
                });
                buttonBg.setFillStyle(buttonColor);
            });

            return { bg: buttonBg, text: buttonText };
        };

    // Create buttons with mobile-responsive spacing
    const buttonSpacing = isMobile ? (isLandscape ? 280 : 230) : 224; // widen spacing for larger buttons
    const buttonY = logicalHeight / 2 + (isMobile ? (isLandscape ? 78 : 72) : 72);
    const yesButton = createStyledButton(logicalWidth / 2 - buttonSpacing / 2, buttonY, fullscreenSupported ? 'YES' : 'OK', true);
    const noButton = fullscreenSupported ? createStyledButton(logicalWidth / 2 + buttonSpacing / 2, buttonY, 'SKIP', false) : null;

        // Add click animations and functionality
        const addButtonClick = (button, callback) => {
            button.bg.on('pointerdown', () => {
                // Click animation
                this.tweens.add({
                    targets: [button.bg, button.text],
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 100,
                    yoyo: true,
                    onComplete: callback
                });
            });
        };

        addButtonClick(yesButton, () => {
            if (this.isTransitioning) return; // debounce taps
            this.isTransitioning = true;
            // Hide global overlay if present
            try {
                if (window.__cleanupFullscreenPrompt) {
                    window.__cleanupFullscreenPrompt();
                } else {
                    const el = document.getElementById('fullscreen-prompt-overlay');
                    if (el) el.style.display = 'none';
                }
            } catch {}
            if (fullscreenSupported) {
                this.fullscreenManager.enterFullscreen(() => {
                    this.time.delayedCall(200, () => this.playLogoSequence());
                });
                // Fallback: if for any reason we didn't start, proceed anyway
                this.time.delayedCall(900, () => {
                    if (!this._logoStarted) {
                        this.playLogoSequence();
                    }
                });
            } else {
                // On iOS just proceed
                this.time.delayedCall(150, () => this.playLogoSequence());
            }
        });

        if (noButton) {
            addButtonClick(noButton, () => {
                if (this.isTransitioning) return;
                this.isTransitioning = true;
                try {
                    if (window.__cleanupFullscreenPrompt) {
                        window.__cleanupFullscreenPrompt();
                    } else {
                        const el = document.getElementById('fullscreen-prompt-overlay');
                        if (el) el.style.display = 'none';
                    }
                } catch {}
                this.playLogoSequence();
            });
        }
        // Store all elements for cleanup
        this.uiElements = [
            background, dialogGlow, dialogBorder, dialog, titleText, subtitleText,
            yesButton.bg, yesButton.text
        ];
        if (noButton) {
            this.uiElements.push(noButton.bg, noButton.text);
        }

        // Add keyboard controls
        this.setupKeyboardControls(yesButton, noButton);

        // Add subtle floating particles
        this.createFloatingParticles();        // Animate entrance
        this.animatePromptEntrance(background, dialogGlow, dialog, titleText, subtitleText, yesButton, noButton);
    }

    setupKeyboardControls(yesButton, noButton) {
        // Keyboard event listeners (hint text removed)
        this.enterKey.on('down', () => {
            yesButton.bg.emit('pointerdown');
        });

        this.escapeKey.on('down', () => {
            if (noButton) noButton.bg.emit('pointerdown');
        });
    }

    createFloatingParticles() {
        const { width, height } = this.scale;
        const particles = [];

        for (let i = 0; i < 15; i++) {            const particle = this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.Between(1, 3),
                0x666666,
                0.1
            );

            particles.push(particle);
            this.uiElements.push(particle);

            // Floating animation
            this.tweens.add({
                targets: particle,
                y: particle.y - Phaser.Math.Between(50, 150),
                alpha: 0.3,
                duration: Phaser.Math.Between(3000, 6000),
                ease: 'Power1',
                repeat: -1,
                yoyo: true,
                delay: Phaser.Math.Between(0, 2000)
            });

            this.tweens.add({
                targets: particle,
                x: particle.x + Phaser.Math.Between(-30, 30),
                duration: Phaser.Math.Between(4000, 8000),
                ease: 'Sine.easeInOut',
                repeat: -1,
                yoyo: true,
                delay: Phaser.Math.Between(0, 1000)
            });
        }
    }    animatePromptEntrance(background, dialogGlow, dialog, titleText, subtitleText, yesButton, noButton) {
        // Sequence of animations for smooth entrance
        this.tweens.add({
            targets: background,
            alpha: 0.9,
            duration: 400,
            ease: 'Power2'
        });

        this.time.delayedCall(200, () => {
            // Dialog appears with scale and glow
            this.tweens.add({
                targets: [dialogGlow, dialog],
                alpha: 1,
                duration: 600,
                ease: 'Back.easeOut'
            });

            // Text appears sequentially
            this.time.delayedCall(300, () => {
                this.tweens.add({
                    targets: titleText,
                    alpha: 1,
                    y: titleText.y - 10,
                    duration: 400,
                    ease: 'Power2'
                });

                this.time.delayedCall(150, () => {
                    this.tweens.add({
                        targets: subtitleText,
                        alpha: 1,
                        duration: 400,
                        ease: 'Power2'
                    });

                    this.time.delayedCall(200, () => {
                        // Buttons appear with bounce (handle optional noButton safely)
                        const btnTargets = [yesButton.bg, yesButton.text];
                        if (noButton) {
                            btnTargets.push(noButton.bg, noButton.text);
                        }
                        this.tweens.add({
                            targets: btnTargets,
                            alpha: 1,
                            y: `-=20`,
                            duration: 500,
                            ease: 'Back.easeOut'
                        });
                    });
                });
            });
        });
    }

    playLogoSequence() {
        if (this._logoStarted) return;
        this._logoStarted = true;
        // Clear existing UI
        this.clearUI();
        // If disclaimer elements linger for any reason, clean them
        if (this._disclaimerElems) {
            this._disclaimerElems.forEach(el => el?.destroy());
            this._disclaimerElems = null;
        }
        
        const { width, height } = this.scale;
        
        // Add white background that will fade in with the logo
        const whiteBackground = this.add.rectangle(width / 2, height / 2, width, height, 0xFFFFFF)
            .setOrigin(0.5)
            .setAlpha(0);
    
        // Calculate logo scaling
        const logoTexture = this.textures.get('logo');
        let logoScale = 1;
        
        if (logoTexture && logoTexture.getSourceImage()) {
            const imgWidth = logoTexture.getSourceImage().width;
            if (imgWidth > SCREEN_CONFIG.LOGO_MAX_WIDTH) {
                logoScale = SCREEN_CONFIG.LOGO_MAX_WIDTH / imgWidth;
            }
        }
        
        // Create logo
        const logo = this.add.image(width / 2, height / 2, 'logo')
            .setOrigin(0.5)
            .setScale(logoScale)
            .setAlpha(0);
        
        // Create "Presents..." text
        const presentsText = this.add.text(
            width / 2,
            height / 2, 
            'Presents...', 
            {
                fontFamily: 'Arial',
                fontSize: '48px',
                color: '#000000' // Changed to black for better visibility on white
            }
        ).setOrigin(0.5).setAlpha(0);
    
        // Store for cleanup - include the white background
        this.logoElements = [whiteBackground, logo, presentsText];
        
        // Run animation sequence
        this.animateLogoSequence(whiteBackground, logo, presentsText);
    }
    
    animateLogoSequence(whiteBackground, logo, presentsText) {
        // Fade in white background and logo together
        this.tweens.add({
            targets: [whiteBackground, logo],
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // Hold logo on screen
                this.time.delayedCall(2000, () => {
                    // Fade out logo
                    this.tweens.add({
                        targets: logo,
                        alpha: 0,
                        duration: 1000,
                        ease: 'Power2',
                        onComplete: () => {
                            // Fade in "Presents..." text
                            this.tweens.add({
                                targets: presentsText,
                                alpha: 1,
                                duration: 800,
                                ease: 'Power2',
                                onComplete: () => {
                                    // Hold text on screen
                                    this.time.delayedCall(1200, () => {
                                        // Fade out text and background
                                        this.tweens.add({
                                            targets: [presentsText, whiteBackground],
                                            alpha: 0,
                                            duration: 600,
                                            onComplete: () => {
                                                // Transition to main menu
                                                this.cameras.main.fadeOut(600, 24, 26, 27);
                                                this.cameras.main.once('camerafadeoutcomplete', () => {
                                                    this.scene.start('MainMenu');
                                                });
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });
                });
            }
        });
    }
      clearUI() {
        // Clear UI elements
        this.uiElements.forEach(el => el?.destroy());
        this.uiElements = [];
        
        // Clear logo elements
        this.logoElements.forEach(el => el?.destroy());
        this.logoElements = [];
    }

    createUI() {
        // Custom UI redraw method for fullscreen utility
        // Only redraw if we're showing the fullscreen prompt and not transitioning
        if (!this.isTransitioning && this.uiElements.length > 0) {
            this.showFullscreenPrompt();
        }
        // Don't redraw during logo sequence to avoid interrupting animations
    }

    shouldRedrawUIOnFullscreenChange() {
        // Only redraw UI if we're showing the fullscreen prompt
        // Don't redraw during logo animations or transition to avoid interrupting them
        return !this.isTransitioning && this.uiElements.length > 0;
    }    shutdown() {
        // Clean up keyboard listeners
        if (this.enterKey) {
            this.enterKey.removeAllListeners();
        }
        if (this.escapeKey) {
            this.escapeKey.removeAllListeners();
        }
        // Remove fullscreen listener
        if (this.scale) {
            this.scale.off && this.scale.off('enterfullscreen', this.onEnterFs, this);
        }
        
        // Cleanup using fullscreen utility
        FullscreenUtils.cleanupScene(this);
    }
}
