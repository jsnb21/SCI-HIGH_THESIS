import Phaser from 'phaser';
import gameManager from '../../gameManager.js';

export default class CardRewardScene extends Phaser.Scene {
    constructor() {
        super('CardRewardScene');
        this.cards = [];
        this.selectedCard = null;
        this.cardData = [];
        this.isSelecting = false;
    }

    init(data) {
        this.returnScene = data.returnScene || 'DungeonScene';
        this.playerLevel = data.playerLevel || 1;
        this.isBossReward = data.isBossReward || false;
    }    preload() {
        // Load card-related assets
        this.load.image('cardBack', 'assets/img/ui/card_back.png');
        this.load.image('cardFrame', 'assets/img/ui/card_frame.png');
        
        // Load sound effects
        this.load.audio('cardHover', 'assets/audio/se/se_select.wav');
        this.load.audio('cardSelect', 'assets/audio/se/se_confirm.wav');
        
        // Create simple colored rectangles if images don't exist - updated size
        if (!this.textures.exists('cardBack')) {
            const graphics = this.add.graphics();
            graphics.fillStyle(0x2d3748);
            graphics.fillRoundedRect(0, 0, 144, 192, 12);
            graphics.generateTexture('cardBack', 144, 192);
            graphics.destroy(); // Clean up the graphics object
        }
        
        if (!this.textures.exists('cardFrame')) {
            const graphics = this.add.graphics();
            graphics.lineStyle(3, 0xffd700);
            graphics.strokeRoundedRect(0, 0, 144, 192, 12);
            graphics.generateTexture('cardFrame', 144, 192);
            graphics.destroy(); // Clean up the graphics object
        }
    }create() {
        // Reset selection state for new card selection
        this.isSelecting = false;
        this.selectedCard = null;
        this.cards = [];
        
        // Create dark overlay background
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8)
            .setOrigin(0, 0)
            .setDepth(0);

        // Create title
        const title = this.isBossReward ? 'Boss Defeated! Choose Your Legendary Reward!' : 'Enemy Defeated! Choose Your Reward!';
        this.add.text(this.scale.width / 2, 80, title, {
            fontSize: '24px',
            fill: this.isBossReward ? '#ff6b6b' : '#ffd700',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(10);

        // Generate card options
        this.generateCardOptions();

        // Create cards
        this.createCards();

        // Add instructions
        this.add.text(this.scale.width / 2, this.scale.height - 60, 'Click on a card to select it', {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Caprasimo-Regular',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5).setDepth(10);

        // Add keyboard input
        this.input.keyboard.on('keydown-ESC', this.skipReward, this);
        
        console.log('CardRewardScene created - ready for selection');
    }    generateCardOptions() {
        const cardTypes = ['quiz', 'heal'];
        const numCards = this.isBossReward ? 4 : 3;
        
        this.cardData = [];
        
        for (let i = 0; i < numCards; i++) {
            // 80% chance for quiz cards, 20% chance for heal cards
            const type = Math.random() < 0.8 ? 'quiz' : 'heal';
            const card = this.generateCard(type);
            this.cardData.push(card);
        }
    }    generateCard(type) {
        const cards = {
            quiz: [
                {
                    name: 'Score Multiplier',
                    description: '+20% Quiz Score Bonus',
                    effect: 'score_multiplier',
                    value: 0.2,
                    rarity: 'common',
                    color: 0xffd700
                },
                {
                    name: 'Combo Master',
                    description: '+2 Combo Per Correct Answer',
                    effect: 'combo_boost',
                    value: 2,
                    rarity: 'common',
                    color: 0xff6b6b
                },
                {
                    name: 'Time Extension',
                    description: '+10 Seconds Quiz Time',
                    effect: 'time_bonus',
                    value: 10,
                    rarity: 'common',
                    color: 0x4ecdc4
                },
                {
                    name: 'Perfect Streak',
                    description: '+50% Score for 3+ Correct',
                    effect: 'streak_bonus',
                    value: 0.5,
                    rarity: 'uncommon',
                    color: 0x9b59b6
                },
                {
                    name: 'Knowledge Surge',
                    description: '+40% Quiz Score Bonus',
                    effect: 'score_multiplier',
                    value: 0.4,
                    rarity: 'uncommon',
                    color: 0xffd700
                },
                {
                    name: 'Speed Learner',
                    description: '+30% Score for Fast Answers',
                    effect: 'speed_bonus',
                    value: 0.3,
                    rarity: 'uncommon',
                    color: 0x74b9ff
                },
                {
                    name: 'Quiz Shield',
                    description: 'Wrong answers deal 50% less damage',
                    effect: 'damage_reduction',
                    value: 0.5,
                    rarity: 'common',
                    color: 0x45b7d1
                },
                {
                    name: 'Second Chance',
                    description: '25% chance wrong answers don\'t count',
                    effect: 'second_chance',
                    value: 0.25,
                    rarity: 'uncommon',
                    color: 0x9b59b6
                },
                {
                    name: 'Scholar\'s Focus',
                    description: '+20 Seconds & +25% Score',
                    effect: 'scholar_focus',
                    value: 20,
                    bonus: 0.25,
                    rarity: 'rare',
                    color: 0xa29bfe
                },
                {
                    name: 'Genius Mode',
                    description: '+100% Score for Perfect Quiz',
                    effect: 'perfect_bonus',
                    value: 1.0,
                    rarity: 'rare',
                    color: 0xff9f43
                },
                {
                    name: 'Quiz Master',
                    description: 'See one wrong answer eliminated',
                    effect: 'answer_hint',
                    value: 1,
                    rarity: 'legendary',
                    color: 0xff9f43
                },
                {
                    name: 'Double Points',
                    description: 'Next quiz gives double score',
                    effect: 'double_score',
                    value: 1,
                    rarity: 'rare',
                    color: 0xa29bfe
                }
            ],
            heal: [
                {
                    name: 'Minor Heal',
                    description: 'Restore +1 HP',
                    effect: 'heal',
                    value: 1,
                    rarity: 'uncommon',
                    color: 0x5cb85c
                },
                {
                    name: 'Full Recovery',
                    description: 'Restore to full HP',
                    effect: 'full_heal',
                    value: 100,
                    rarity: 'legendary',
                    color: 0x5cb85c
                }
            ]
        };

        const typeCards = cards[type] || cards.buff;
        let selectedCard = Phaser.Utils.Array.GetRandom(typeCards);
        
        // Enhance rarity for boss rewards
        if (this.isBossReward) {
            const rarityRoll = Math.random();
            if (rarityRoll < 0.3) {
                selectedCard.rarity = 'legendary';
                selectedCard.value = Math.floor(selectedCard.value * 1.5);
            } else if (rarityRoll < 0.6) {
                selectedCard.rarity = 'rare';
                selectedCard.value = Math.floor(selectedCard.value * 1.2);
            }
        }

        return { ...selectedCard };
    }createCards() {
        const cardWidth = 144;  // Increased from 120 by 20%
        const cardHeight = 192; // Increased from 160 by 20%
        const spacing = 20;
        const totalWidth = (cardWidth * this.cardData.length) + (spacing * (this.cardData.length - 1));
        const startX = (this.scale.width - totalWidth) / 2 + cardWidth / 2;
        const cardY = this.scale.height / 2;

        console.log(`Creating ${this.cardData.length} cards:`);
        console.log(`Screen size: ${this.scale.width} x ${this.scale.height}`);
        console.log(`Card dimensions: ${cardWidth} x ${cardHeight}`);
        console.log(`Total width needed: ${totalWidth}`);
        console.log(`Start X: ${startX}, Card Y: ${cardY}`);

        this.cards = [];

        this.cardData.forEach((cardData, index) => {
            const cardX = startX + (cardWidth + spacing) * index;
            console.log(`Card ${index} position: (${cardX}, ${cardY})`);
            
            // Ensure card positions are valid
            if (cardX < cardWidth / 2 || cardX > this.scale.width - cardWidth / 2) {
                console.warn(`Card ${index} X position ${cardX} is out of bounds!`);
            }
            
            const card = this.createCard(cardX, cardY, cardData, index);
            this.cards.push(card);
        });
    }createCard(x, y, cardData, index) {
        const container = this.add.container(x, y);
        container.setDepth(5);

        // Card background - increased size by 20%
        const bg = this.add.rectangle(0, 0, 144, 192, 0x2d3748)
            .setStrokeStyle(2, cardData.color);
        container.add(bg);

        // Rarity border - increased size by 20%
        const rarityColors = {
            common: 0x95a5a6,
            uncommon: 0x2ecc71,
            rare: 0x3498db,
            legendary: 0xf39c12
        };
        
        const rarityBorder = this.add.rectangle(0, 0, 140, 188, 0x000000, 0)
            .setStrokeStyle(3, rarityColors[cardData.rarity] || 0x95a5a6);
        container.add(rarityBorder);

        // Add subtle glow for legendary cards - increased size by 20%
        if (cardData.rarity === 'legendary') {
            const glow = this.add.rectangle(0, 0, 148, 196, 0xffd700, 0.3);
            container.add(glow);
            glow.setDepth(-1);
            
            // Animate the glow
            this.tweens.add({
                targets: glow,
                alpha: 0.1,
                duration: 1000,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }

        // Card name - adjusted position for larger card
        const nameText = this.add.text(0, -78, cardData.name, {
            fontSize: '13px', // Slightly increased font size
            fill: '#ffffff',
            fontFamily: 'Caprasimo-Regular',
            align: 'center',
            wordWrap: { width: 130 } // Increased wrap width
        }).setOrigin(0.5);
        container.add(nameText);

        // Card icon/symbol based on effect - adjusted position
        const iconSymbol = this.getCardIcon(cardData.effect);
        const icon = this.add.text(0, -30, iconSymbol, {
            fontSize: '34px', // Increased icon size
            fill: cardData.color,
            fontFamily: 'Caprasimo-Regular'
        }).setOrigin(0.5);
        container.add(icon);

        // Card description - adjusted position
        const descText = this.add.text(0, 18, cardData.description, {
            fontSize: '11px', // Slightly increased font size
            fill: '#cccccc',
            fontFamily: 'Caprasimo-Regular',
            align: 'center',
            wordWrap: { width: 125 } // Increased wrap width
        }).setOrigin(0.5);
        container.add(descText);

        // Rarity text - adjusted position
        const rarityText = this.add.text(0, 66, cardData.rarity.toUpperCase(), {
            fontSize: '10px', // Slightly increased font size
            fill: rarityColors[cardData.rarity] || 0x95a5a6,
            fontFamily: 'Caprasimo-Regular',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(rarityText);

        // Add value indicator for certain effects - adjusted position
        if (['heal', 'damage_boost', 'permanent_damage', 'damage_reduction'].includes(cardData.effect)) {
            const valueText = this.add.text(0, 42, `+${cardData.value}`, {
                fontSize: '14px', // Increased font size
                fill: '#ffd700',
                fontFamily: 'Caprasimo-Regular',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(valueText);
        }

        // Make entire container interactive - updated size
        container.setSize(144, 192);
        container.setInteractive({ cursor: 'pointer' });
        container.on('pointerover', () => this.onCardHover(container, true));
        container.on('pointerout', () => this.onCardHover(container, false));
        container.on('pointerdown', () => this.selectCard(index));

        // Store card data reference
        container.cardData = cardData;
        container.cardIndex = index;

        console.log(`Created card ${index}: ${cardData.name} at position (${x}, ${y})`);

        // Add entrance animation
        container.setAlpha(0);
        container.setScale(0.5);
        this.tweens.add({
            targets: container,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            delay: index * 100,
            ease: 'Back.easeOut'
        });

        return container;
    }    getCardIcon(effect) {
        const icons = {
            score_multiplier: '📊',
            combo_boost: '�',
            time_bonus: '⏰',
            streak_bonus: '⚡',
            speed_bonus: '�',
            damage_reduction: '�️',
            second_chance: '�',
            scholar_focus: '🧠',
            perfect_bonus: '⭐',
            answer_hint: '�',
            double_score: '�',
            heal: '❤️',
            full_heal: '�'
        };
        return icons[effect] || '⭐';
    }onCardHover(container, isHovering) {
        if (this.isSelecting) return;

        console.log(`Card hover: ${isHovering ? 'enter' : 'exit'} - Card ${container.cardIndex}`);

        if (isHovering) {
            // Play hover sound
            if (this.sound.get('cardHover')) {
                this.sound.play('cardHover', { volume: 0.3 });
            }
        }

        const scale = isHovering ? 1.1 : 1;
        const y = isHovering ? container.y - 10 : this.scale.height / 2;
        
        this.tweens.add({
            targets: container,
            scaleX: scale,
            scaleY: scale,
            y: y,
            duration: 200,
            ease: 'Back.easeOut'
        });
    }    selectCard(index) {
        console.log(`selectCard called with index ${index}, isSelecting: ${this.isSelecting}`);
        
        if (this.isSelecting) {
            console.log('Selection blocked - already selecting');
            return;
        }
        
        console.log(`Selecting card ${index}: ${this.cardData[index].name}`);
        
        this.isSelecting = true;
        this.selectedCard = this.cardData[index];

        // Play selection sound
        if (this.sound.get('cardSelect')) {
            this.sound.play('cardSelect', { volume: 0.5 });
        }

        // Show selection feedback text
        const selectedContainer = this.cards[index];
        const feedbackText = this.add.text(
            this.scale.width / 2, 
            this.scale.height - 120, 
            `Selected: ${this.selectedCard.name}!`, 
            {
                fontSize: '18px',
                fill: '#ffd700',
                fontFamily: 'Caprasimo-Regular',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(15);

        // Animate feedback text
        feedbackText.setAlpha(0);
        this.tweens.add({
            targets: feedbackText,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });

        // Animate selected card
        this.tweens.add({
            targets: selectedContainer,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Fade out other cards
        this.cards.forEach((card, i) => {
            if (i !== index) {
                this.tweens.add({
                    targets: card,
                    alpha: 0.3,
                    scaleX: 0.8,
                    scaleY: 0.8,
                    duration: 300
                });
            }
        });

        // Apply card effect and return to dungeon after delay
        this.time.delayedCall(1500, () => {
            this.applyCardEffect(this.selectedCard);
            this.returnToDungeon();
        });
    }    applyCardEffect(card) {
        switch (card.effect) {
            case 'heal':
                gameManager.healPlayer(card.value);
                break;
            case 'full_heal':
                gameManager.setPlayerHP(gameManager.getMaxPlayerHP());
                break;
            case 'score_multiplier':
                gameManager.addPlayerBuff('score_multiplier', card.value);
                break;
            case 'combo_boost':
                gameManager.addPlayerBuff('combo_boost', card.value);
                break;
            case 'time_bonus':
                gameManager.addPlayerBuff('time_bonus', card.value);
                break;
            case 'streak_bonus':
                gameManager.addPlayerBuff('streak_bonus', card.value);
                break;
            case 'speed_bonus':
                gameManager.addPlayerBuff('speed_bonus', card.value);
                break;
            case 'damage_reduction':
                gameManager.addPlayerBuff('damage_reduction', card.value);
                break;
            case 'second_chance':
                gameManager.addPlayerBuff('second_chance', card.value);
                break;
            case 'scholar_focus':
                gameManager.addPlayerBuff('time_bonus', card.value);
                gameManager.addPlayerBuff('score_multiplier', card.bonus);
                break;
            case 'perfect_bonus':
                gameManager.addPlayerBuff('perfect_bonus', card.value);
                break;
            case 'answer_hint':
                gameManager.addPlayerBuff('answer_hint', card.value);
                break;
            case 'double_score':
                gameManager.addPlayerBuff('double_score', card.value);
                break;
        }
        
        console.log(`Applied card effect: ${card.name} - ${card.description}`);
    }

    skipReward() {
        if (this.isSelecting) return;
        this.returnToDungeon();
    }

    returnToDungeon() {
        // Set flag for dungeon scene to know reward was processed
        const dungeonScene = this.scene.get(this.returnScene);
        if (dungeonScene) {
            dungeonScene.cardRewardProcessed = true;
        }
        
        this.scene.stop();
        this.scene.resume(this.returnScene);
    }    
    // Clean up when scene shuts down
    shutdown() {
        // Reset state for next time
        this.isSelecting = false;
        this.selectedCard = null;
        this.cards = [];
        this.cardData = [];
        
        // Remove any event listeners
        this.input.keyboard.off('keydown-ESC', this.skipReward, this);
        
        console.log('CardRewardScene shutdown - state reset');
    }
}
