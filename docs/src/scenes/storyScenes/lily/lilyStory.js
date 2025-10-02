import Phaser from 'phaser';
import VNDialogueBox from '../../../ui/VNDialogueBox.js';
import { createBackButton } from '../../../components/buttons/backbutton.js';

export default class LilyStory extends Phaser.Scene {
    constructor() {
        super('LilyStory');
        this.dialogueBox = null;
    }

    preload() {
        // Load Lily full-body portrait (reuse existing if already loaded gracefully)
        if (!this.textures.exists('LilyPortrait')) {
            this.load.image('LilyPortrait', 'assets/sprites/npcs/Lily.png');
        }
    }

    create() {
        const { width, height } = this.scale;
        
        // Set background color
        this.cameras.main.setBackgroundColor('#f0c0d0'); // Light pink background for Lily
        
        // Add Lily portrait centered & slightly lower so dialogue box covers ~half the body
        const hasPortrait = this.textures.exists('LilyPortrait');
        if (hasPortrait) {
            // Positioning: center X, Y a bit above vertical center so box covers lower half
            const baseY = height * 0.62; // Slightly lower than center for visual framing
            this.lilyPortrait = this.add.image(width * 0.5, baseY, 'LilyPortrait');
            this.lilyPortrait.setOrigin(0.5, 0.5);
            // Scale responsively (assumes source ~ 512-1024 height). Adjust heuristically.
            const targetHeightRatio = 0.75; // occupy 75% of screen height (beneath upper padding)
            const desiredHeight = height * targetHeightRatio;
            const naturalHeight = this.lilyPortrait.height;
            const scale = desiredHeight / naturalHeight;
            this.lilyPortrait.setScale(Math.min(scale, 1)); // don't upscale beyond 1 for quality
            this.lilyPortrait.setDepth(5); // Behind dialogue box (box uses depth 10+)

            // Gentle fade-in
            this.lilyPortrait.setAlpha(0);
            this.tweens.add({
                targets: this.lilyPortrait,
                alpha: 1,
                duration: 400,
                ease: 'Power2'
            });
        }
        
        // Create back button
        this.backButton = createBackButton(this, () => {
            if (this.dialogueBox) {
                this.dialogueBox.destroy();
                this.dialogueBox = null;
            }
            this.scene.start('Classroom');
        });
        
        // Start the cutscene
        this.startLilyCutscene();
    }

    startLilyCutscene() {
        // Create dialogue with choices
        const initialDialogue = ["How are you?"];
        
        this.dialogueBox = new VNDialogueBox(
            this,
            initialDialogue,
            () => {
                // After Lily says "How are you?", show choices
                this.showPlayerChoices();
            }
        );
    }

    showPlayerChoices() {
        const choices = [
            "Just want to see how you're doing",
            "I want to know more about SCI-HIGH", 
            "Nothing. Just Checking on you."
        ];
        
        this.dialogueBox = new VNDialogueBox(
            this,
            ["How are you?"], // Keep Lily's message visible
            null,
            {
                showChoices: true,
                choices: choices,
                onChoiceSelected: (choiceIndex, choiceText) => {
                    this.handlePlayerChoice(choiceIndex, choiceText);
                }
            }
        );
    }

    handlePlayerChoice(choiceIndex, choiceText) {
        // Clean up the choice dialogue box first
        if (this.dialogueBox) {
            this.dialogueBox.destroy();
            this.dialogueBox = null;
        }
        
        let lilyResponse = "";
        
        switch (choiceIndex) {
            case 0: // Just want to see how you're doing
                lilyResponse = "That's so sweet of you! I'm doing great, thank you for asking.";
                break;
            case 1: // I want to know more about SCI-HIGH
                lilyResponse = "SCI-HIGH is an amazing place! There's so much to discover here. I'd love to show you around sometime.";
                break;
            case 2: // Nothing. Just Checking on you.
                lilyResponse = "Aww, that's really thoughtful of you. I appreciate you checking up on me!";
                break;
            default:
                lilyResponse = "Thanks for talking with me!";
        }

        // Show Lily's response
        this.dialogueBox = new VNDialogueBox(
            this,
            [lilyResponse],
            () => {
                // After response, return to classroom or continue story
                this.scene.start('Classroom');
            }
        );
    }
}
