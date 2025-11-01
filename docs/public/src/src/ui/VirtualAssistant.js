import Phaser from 'phaser';
import { 
    getScaleInfo, 
    scaleFontSize, 
    scaleDimension, 
    getResponsivePosition,
    createResponsiveTextStyle,
    getSafeArea 
} from '../utils/mobileUtils.js';

export default class VirtualAssistant {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.isMinimized = true;
        this.currentTopic = 'welcome';
        this.elements = [];
        
        // Scale info
        this.scaleInfo = getScaleInfo(scene);
        this.safeArea = getSafeArea(this.scaleInfo);
        
        // Assistant personality and responses
        this.responses = {
            welcome: {
                title: "Hello! I'm your SCI-HIGH Assistant! 🤖",
                text: "I'm here to help you navigate the game and answer any questions you might have. What would you like to know about?",
                options: [
                    { label: "Game Basics", action: () => this.showTopic('basics') },
                    { label: "Story Mode", action: () => this.showTopic('story') },
                    { label: "Learning Hub", action: () => this.showTopic('learning') },
                    { label: "Tips & Tricks", action: () => this.showTopic('tips') }
                ]
            },
            basics: {
                title: "Game Basics 📚",
                text: "SCI-HIGH is an educational RPG where you learn programming while having fun! You can:\n\n• Start with Story Mode to learn through narrative\n• Visit the Computer Lab for hands-on coding\n• Check the Library for reference materials\n• Track your progress in the Office",
                options: [
                    { label: "How to Start", action: () => this.showTopic('howtostart') },
                    { label: "Character Selection", action: () => this.showTopic('characters') },
                    { label: "Back to Main", action: () => this.showTopic('welcome') }
                ]
            },
            story: {
                title: "Story Mode Adventures 📖",
                text: "Choose your programming journey with our characters:\n\n🌟 Noah - Web Development (HTML, CSS, JavaScript)\n🐍 Lily - Python Programming\n☕ Damian - Java Development\n\nEach character has unique stories and challenges!",
                options: [
                    { label: "Character Details", action: () => this.showTopic('characters') },
                    { label: "Progress Tracking", action: () => this.showTopic('progress') },
                    { label: "Back to Main", action: () => this.showTopic('welcome') }
                ]
            },
            learning: {
                title: "Learning Hub 🎓",
                text: "The Computer Lab is your coding playground:\n\n💻 Interactive coding challenges\n🧩 Step-by-step tutorials\n🏆 Skill assessments and quizzes\n📊 Real-time feedback\n\nPractice makes perfect!",
                options: [
                    { label: "Available Languages", action: () => this.showTopic('languages') },
                    { label: "Difficulty Levels", action: () => this.showTopic('difficulty') },
                    { label: "Back to Main", action: () => this.showTopic('welcome') }
                ]
            },
            tips: {
                title: "Pro Tips & Tricks 💡",
                text: "• Save your progress regularly in the Office\n• Complete story chapters to unlock new areas\n• Try different programming languages\n• Use the Library for quick references\n• Check your stats to track improvement\n• Don't be afraid to experiment!",
                options: [
                    { label: "Keyboard Shortcuts", action: () => this.showTopic('shortcuts') },
                    { label: "Troubleshooting", action: () => this.showTopic('troubleshoot') },
                    { label: "Back to Main", action: () => this.showTopic('welcome') }
                ]
            },
            characters: {
                title: "Meet Your Guides 👥",
                text: "🌟 Noah - The Web Wizard\nSpecialty: HTML, CSS, JavaScript\nPersonality: Creative and visual\n\n🐍 Lily - The Python Princess\nSpecialty: Python programming\nPersonality: Logical and systematic\n\n☕ Damian - The Java Genius\nSpecialty: Java development\nPersonality: Structured and thorough",
                options: [
                    { label: "Which Should I Choose?", action: () => this.showTopic('choosing') },
                    { label: "Back to Story", action: () => this.showTopic('story') }
                ]
            },
            languages: {
                title: "Programming Languages 💻",
                text: "Learn these exciting languages:\n\n🌐 Web Development - HTML, CSS, JavaScript\n🐍 Python - Great for beginners\n☕ Java - Object-oriented programming\n⚡ C - System programming\n🔷 C++ - Advanced programming\n# C# - Modern development",
                options: [
                    { label: "Beginner Recommendations", action: () => this.showTopic('beginner') },
                    { label: "Back to Learning", action: () => this.showTopic('learning') }
                ]
            },
            howtostart: {
                title: "Getting Started 🚀",
                text: "1. Click 'New Game' to begin your adventure\n2. Choose a character that interests you\n3. Follow the tutorial to learn the basics\n4. Explore different areas at your own pace\n5. Save your progress regularly\n\nReady to start coding?",
                options: [
                    { label: "Start New Game", action: () => this.startNewGame() },
                    { label: "Back to Basics", action: () => this.showTopic('basics') }
                ]
            }
        };
        
        this.createAssistant();
    }
    
    createAssistant() {
        // Create floating assistant button (minimized state)
        this.createAssistantButton();
        
        // Create main assistant panel (initially hidden)
        this.createAssistantPanel();
        
        // Show minimized state initially
        this.showMinimized();
    }
    
    createAssistantButton() {
        const buttonSize = this.scaleInfo.isMobile ? 60 : 80;
        const buttonPos = {
            x: this.safeArea.right - buttonSize/2 - 20,
            y: this.safeArea.bottom - buttonSize/2 - 20
        };
        
        // Create button background
        this.assistantButton = this.scene.add.graphics();
        this.assistantButton.fillStyle(0x4A90E2, 0.9);
        this.assistantButton.lineStyle(3, 0xFFFFFF, 1);
        this.assistantButton.fillCircle(0, 0, buttonSize/2);
        this.assistantButton.strokeCircle(0, 0, buttonSize/2);
        this.assistantButton.setPosition(buttonPos.x, buttonPos.y);
        this.assistantButton.setDepth(1000);
        
        // Add bot icon/text
        this.assistantIcon = this.scene.add.text(buttonPos.x, buttonPos.y, '🤖', {
            fontSize: this.scaleInfo.isMobile ? '30px' : '40px',
            align: 'center'
        });
        this.assistantIcon.setOrigin(0.5);
        this.assistantIcon.setDepth(1001);
        
        // Add pulsing animation
        this.scene.tweens.add({
            targets: [this.assistantButton, this.assistantIcon],
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Make interactive
        const hitArea = new Phaser.Geom.Circle(0, 0, buttonSize/2);
        this.assistantButton.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        this.assistantButton.on('pointerdown', () => {
            this.toggleAssistant();
            this.playSound('se_confirm');
        });
        
        // Hover effects
        this.assistantButton.on('pointerover', () => {
            this.assistantButton.setTint(0xcccccc);
            this.playSound('se_select');
        });
        this.assistantButton.on('pointerout', () => {
            this.assistantButton.clearTint();
        });
        
        this.elements.push(this.assistantButton, this.assistantIcon);
    }
    
    createAssistantPanel() {
        const panelWidth = this.scaleInfo.isMobile ? 
            this.scaleInfo.width * 0.9 : 
            Math.min(500, this.scaleInfo.width * 0.4);
        const panelHeight = this.scaleInfo.isMobile ? 
            this.scaleInfo.height * 0.7 : 
            Math.min(600, this.scaleInfo.height * 0.6);
        
        const panelX = this.scaleInfo.isMobile ? 
            this.scaleInfo.width/2 : 
            this.safeArea.right - panelWidth - 20;
        const panelY = this.scaleInfo.isMobile ? 
            this.scaleInfo.height/2 : 
            this.safeArea.bottom - panelHeight - 100;
        
        // Create panel background
        this.panel = this.scene.add.graphics();
        this.panel.fillStyle(0x2C3E50, 0.95);
        this.panel.lineStyle(3, 0x3498DB, 1);
        this.panel.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 15);
        this.panel.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 15);
        this.panel.setPosition(panelX, panelY);
        this.panel.setDepth(999);
        
        // Create header
        this.headerBg = this.scene.add.graphics();
        this.headerBg.fillStyle(0x3498DB, 1);
        this.headerBg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, 60, {tl: 15, tr: 15, bl: 0, br: 0});
        this.headerBg.setPosition(panelX, panelY);
        this.headerBg.setDepth(1000);
        
        // Header title
        this.headerTitle = this.scene.add.text(panelX, panelY - panelHeight/2 + 30, 'SCI-HIGH Assistant', {
            fontSize: this.scaleInfo.isMobile ? '18px' : '20px',
            fontFamily: 'Caprasimo-Regular',
            color: '#FFFFFF',
            align: 'center'
        });
        this.headerTitle.setOrigin(0.5);
        this.headerTitle.setDepth(1001);
        
        // Close button
        this.closeButton = this.scene.add.text(panelX + panelWidth/2 - 30, panelY - panelHeight/2 + 30, '×', {
            fontSize: this.scaleInfo.isMobile ? '24px' : '28px',
            color: '#FFFFFF'
        });
        this.closeButton.setOrigin(0.5);
        this.closeButton.setDepth(1001);
        this.closeButton.setInteractive();
        this.closeButton.on('pointerdown', () => {
            this.hideAssistant();
            this.playSound('se_confirm');
        });
        this.closeButton.on('pointerover', () => {
            this.closeButton.setTint(0xff6b6b);
            this.playSound('se_select');
        });
        this.closeButton.on('pointerout', () => {
            this.closeButton.clearTint();
        });
        
        // Content area setup
        this.contentArea = {
            x: panelX,
            y: panelY - 10,
            width: panelWidth - 40,
            height: panelHeight - 120
        };
        
        this.elements.push(this.panel, this.headerBg, this.headerTitle, this.closeButton);
        
        // Initially hide panel
        this.hidePanelElements();
    }
    
    showTopic(topic) {
        this.currentTopic = topic;
        this.clearContent();
        
        const response = this.responses[topic] || this.responses.welcome;
        
        // Create title
        this.contentTitle = this.scene.add.text(
            this.contentArea.x, 
            this.contentArea.y - this.contentArea.height/2 + 30,
            response.title,
            {
                fontSize: this.scaleInfo.isMobile ? '16px' : '18px',
                fontFamily: 'Caprasimo-Regular',
                color: '#3498DB',
                align: 'center',
                wordWrap: { width: this.contentArea.width }
            }
        );
        this.contentTitle.setOrigin(0.5, 0);
        this.contentTitle.setDepth(1001);
        
        // Create main text
        this.contentText = this.scene.add.text(
            this.contentArea.x,
            this.contentArea.y - this.contentArea.height/2 + 80,
            response.text,
            {
                fontSize: this.scaleInfo.isMobile ? '13px' : '14px',
                color: '#FFFFFF',
                align: 'left',
                wordWrap: { width: this.contentArea.width },
                lineSpacing: 5
            }
        );
        this.contentText.setOrigin(0.5, 0);
        this.contentText.setDepth(1001);
        
        // Create option buttons
        this.createOptionButtons(response.options);
        
        this.elements.push(this.contentTitle, this.contentText);
    }
    
    createOptionButtons(options) {
        if (!options) return;
        
        const buttonHeight = 35;
        const buttonSpacing = 10;
        const startY = this.contentArea.y + this.contentArea.height/2 - (options.length * (buttonHeight + buttonSpacing));
        
        options.forEach((option, index) => {
            const buttonY = startY + (index * (buttonHeight + buttonSpacing));
            
            // Button background
            const button = this.scene.add.graphics();
            button.fillStyle(0x3498DB, 0.8);
            button.lineStyle(2, 0x5DADE2, 1);
            button.fillRoundedRect(-this.contentArea.width/2 + 20, -buttonHeight/2, this.contentArea.width - 40, buttonHeight, 8);
            button.strokeRoundedRect(-this.contentArea.width/2 + 20, -buttonHeight/2, this.contentArea.width - 40, buttonHeight, 8);
            button.setPosition(this.contentArea.x, buttonY);
            button.setDepth(1001);
            
            // Button text
            const buttonText = this.scene.add.text(this.contentArea.x, buttonY, option.label, {
                fontSize: this.scaleInfo.isMobile ? '12px' : '13px',
                color: '#FFFFFF',
                align: 'center'
            });
            buttonText.setOrigin(0.5);
            buttonText.setDepth(1002);
            
            // Make interactive
            const hitArea = new Phaser.Geom.Rectangle(-this.contentArea.width/2 + 20, -buttonHeight/2, this.contentArea.width - 40, buttonHeight);
            button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            button.on('pointerdown', () => {
                option.action();
                this.playSound('se_confirm');
            });
            button.on('pointerover', () => {
                button.clear();
                button.fillStyle(0x5DADE2, 0.9);
                button.lineStyle(2, 0x85C1E9, 1);
                button.fillRoundedRect(-this.contentArea.width/2 + 20, -buttonHeight/2, this.contentArea.width - 40, buttonHeight, 8);
                button.strokeRoundedRect(-this.contentArea.width/2 + 20, -buttonHeight/2, this.contentArea.width - 40, buttonHeight, 8);
                this.playSound('se_select');
            });
            button.on('pointerout', () => {
                button.clear();
                button.fillStyle(0x3498DB, 0.8);
                button.lineStyle(2, 0x5DADE2, 1);
                button.fillRoundedRect(-this.contentArea.width/2 + 20, -buttonHeight/2, this.contentArea.width - 40, buttonHeight, 8);
                button.strokeRoundedRect(-this.contentArea.width/2 + 20, -buttonHeight/2, this.contentArea.width - 40, buttonHeight, 8);
            });
            
            this.elements.push(button, buttonText);
        });
    }
    
    clearContent() {
        // Remove content elements (keep panel structure)
        const keepElements = [this.assistantButton, this.assistantIcon, this.panel, this.headerBg, this.headerTitle, this.closeButton];
        this.elements = this.elements.filter(element => {
            if (!keepElements.includes(element)) {
                if (element && element.destroy) {
                    element.destroy();
                }
                return false;
            }
            return true;
        });
    }
    
    toggleAssistant() {
        if (this.isMinimized) {
            this.showAssistant();
        } else {
            this.hideAssistant();
        }
    }
    
    showAssistant() {
        this.isMinimized = false;
        this.isOpen = true;
        this.showPanelElements();
        this.showTopic(this.currentTopic);
        
        // Animate panel in
        this.panel.setAlpha(0);
        this.headerBg.setAlpha(0);
        this.headerTitle.setAlpha(0);
        this.closeButton.setAlpha(0);
        
        this.scene.tweens.add({
            targets: [this.panel, this.headerBg, this.headerTitle, this.closeButton],
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }
    
    hideAssistant() {
        this.isMinimized = true;
        this.isOpen = false;
        this.clearContent();
        this.hidePanelElements();
    }
    
    showMinimized() {
        this.isMinimized = true;
        this.isOpen = false;
        this.hidePanelElements();
    }
    
    showPanelElements() {
        [this.panel, this.headerBg, this.headerTitle, this.closeButton].forEach(element => {
            if (element) element.setVisible(true);
        });
    }
    
    hidePanelElements() {
        [this.panel, this.headerBg, this.headerTitle, this.closeButton].forEach(element => {
            if (element) element.setVisible(false);
        });
        this.clearContent();
    }
    
    startNewGame() {
        this.hideAssistant();
        // Trigger new game start
        if (this.scene.scene.key === 'MainMenu') {
            // Find new game functionality in main menu
            this.scene.events.emit('startNewGame');
        }
    }
    
    playSound(soundKey) {
        try {
            if (this.scene.sound && this.scene.sound.get(soundKey)) {
                this.scene.sound.get(soundKey).play();
            }
        } catch (error) {
            console.warn('Could not play sound:', soundKey);
        }
    }
    
    destroy() {
        this.elements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.elements = [];
    }
}
