import { playExclusiveBGM } from '../../audioUtils.js';
import LoadingScreen from '../../ui/LoadingScreen.js';
import VNDialogueBox from '../../ui/VNDialogueBox.js';

export default class SampleGameplayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SampleGameplayScene' });
        this.nextSceneName = 'MainGameplay';
        this.nextCourseName = 'Roguelike Course';
        this.nextSceneData = {};
    }

    preload() {
        // Characters for tutorial (use existing NPC portraits)
        this.load.image('Lily', 'assets/sprites/npcs/Lily.png');
        this.load.image('Damian', 'assets/sprites/npcs/Damian.png');
        this.load.image('Finley', 'assets/sprites/npcs/Finley.png');
    }

    init(data) {
        this.nextSceneName = data?.nextSceneName || 'MainGameplay';
        this.nextCourseName = data?.nextCourseName || 'Roguelike Course';
        this.nextSceneData = data?.nextSceneData || {};
    }

    create() {
        const { width, height } = this.scale;
    // Use an existing calm BGM
    playExclusiveBGM(this, 'bgm_mainhub');

        // Light backdrop
    const panel = this.add.rectangle(width/2, height/2, Math.min(width*0.9, 980), Math.min(height*0.9, 620), 0x0d1b2a, 0.8);
        panel.setStrokeStyle(2, 0xffffff, 0.4);

        // Character portraits
        const baseY = height * 0.68;
        const scale = (width < 768 || height < 600) ? 0.35 : 0.7;
        this.lily = this.add.image(width*0.25, baseY, 'Lily').setScale(scale).setDepth(2).setAlpha(0);
        this.damian = this.add.image(width*0.5, baseY, 'Damian').setScale(scale).setDepth(2).setAlpha(0);
        this.finley = this.add.image(width*0.75, baseY, 'Finley').setScale(scale).setDepth(2).setAlpha(0);
        this.tweens.add({ targets: [this.lily, this.damian, this.finley], alpha: 1, duration: 300, ease: 'Power2' });

        const lines = [
            { speaker: 'Lily', text: "Hii there! Welcome to the Cyberspace! ✨ Here, you’ll be playing as a goblin in a big game of tag! 🏃‍♂️💨" },
            { speaker: 'Lily', text: "When you chase another goblin, a question will pop up! Answer it correctly, and boom! — they’re out of the game! 💥" },
            { speaker: 'Finley', text: "Just be careful. The red goblins are thugs. If you bump into them, your time will drop. So watch where you’re running." },
            { speaker: 'Damian', text: "Every 5 correct answers will increase the intensity level and give you a chance to pick a power-up. Choose wisely — the higher you climb, the tougher it gets." },
            { speaker: 'Lily', text: "Oooh, like leveling up in a video game! Wait... this is a video game! 🤯" },
            { speaker: 'Finley', text: "Technically, it’s a simulation." },
            { speaker: 'Lily', text: "Simulation… video game… same thing!" },
            { speaker: 'Damian', text: "Actually, there’s a difference—" },
            { speaker: 'Finley', text: "Don’t start." },
            { speaker: 'Damian', text: "…Fine." }
        ];

        // Minimal hint banner
        const hintText = this.add.text(width/2, height*0.18, '⏱️ Timer  •  👹 Thugs  •  ⭐ Power-ups', {
            fontFamily: 'Caprasimo-Regular, Arial',
            fontSize: width < 768 ? '18px' : '24px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setAlpha(0.9);

        // Simple VN sequence with portrait emphasis
        this.vn = new VNDialogueBox(this, lines, () => {
            // After dialogue, transition to the actual gameplay requested
            LoadingScreen.transitionToCourse(this, this.nextSceneName, this.nextCourseName, this.nextSceneData);
        }, {
            portraits: {
                'Lily': this.lily,
                'Damian': this.damian,
                'Finley': this.finley
            },
            portraitEmphasis: {
                activeScale: 1.08,
                inactiveScale: 0.92,
                activeAlpha: 1.0,
                inactiveAlpha: 0.55,
                duration: 280,
                ease: 'Sine.easeInOut'
            }
        });
    }
}
