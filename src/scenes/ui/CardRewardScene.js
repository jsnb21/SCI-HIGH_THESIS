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
        
        // Create simple colored rectangles if images don't exist
        if (!this.textures.exists('cardBack')) {
            this.add.graphics()
                .fillStyle(0x2d3748)
                .fillRoundedRect(0, 0, 120, 160, 10)
                .generateTexture('cardBack', 120, 160);
        }
        
        if (!this.textures.exists('cardFrame')) {
            this.add.graphics()
                .lineStyle(3, 0xffd700)
                .strokeRoundedRect(0, 0, 120, 160, 10)
                .generateTexture('cardFrame', 120, 160);
        }
    }    create() {
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
    }

    generateCardOptions() {
        const cardTypes = ['buff', 'heal', 'damage', 'special'];
        const numCards = this.isBossReward ? 4 : 3;
        
        this.cardData = [];
        
        for (let i = 0; i < numCards; i++) {
            const type = Phaser.Utils.Array.GetRandom(cardTypes);
            const card = this.generateCard(type);
            this.cardData.push(card);
        }
    }

    generateCard(type) {
        const cards = {
            buff: [
                {
                    name: 'Strength Boost',
                    description: '+5 Player Damage',
                    effect: 'damage_boost',
                    value: 5,
                    rarity: 'common',
                    color: 0xff6b6b
                },
                {
                    name: 'Critical Strike',
                    description: '+10% Critical Chance',
                    effect: 'critical_chance',
                    value: 10,
                    rarity: 'uncommon',
                    color: 0x4ecdc4
                },
                {
                    name: 'Armor Plating',
                    description: 'Reduce incoming damage by 2',
                    effect: 'damage_reduction',
                    value: 2,
                    rarity: 'common',
                    color: 0x45b7d1
                }
            ],
            heal: [
                {
                    name: 'Health Potion',
                    description: 'Restore 25 HP',
                    effect: 'heal',
                    value: 25,
                    rarity: 'common',
                    color: 0x5cb85c
                },
                {
                    name: 'Greater Heal',
                    description: 'Restore 50 HP',
                    effect: 'heal',
                    value: 50,
                    rarity: 'uncommon',
                    color: 0x5cb85c
                },
                {
                    name: 'Full Recovery',
                    description: 'Restore to full HP',
                    effect: 'full_heal',
                    value: 100,
                    rarity: 'rare',
                    color: 0x5cb85c
                }
            ],
            damage: [
                {
                    name: 'Power Surge',
                    description: '+3 Permanent Damage',
                    effect: 'permanent_damage',
                    value: 3,
                    rarity: 'uncommon',
                    color: 0xf39c12
                },
                {
                    name: 'Berserker Rage',
                    description: '+8 Damage, -5 HP',
                    effect: 'berserker',
                    value: 8,
                    penalty: 5,
                    rarity: 'rare',
                    color: 0xe74c3c
                }
            ],            special: [
                {
                    name: 'Lucky Charm',
                    description: 'Better rewards from next enemy',
                    effect: 'lucky',
                    value: 1,
                    rarity: 'uncommon',
                    color: 0x9b59b6
                },
                {
                    name: 'Time Warp',
                    description: 'Extra turn in next battle',
                    effect: 'extra_turn',
                    value: 1,
                    rarity: 'rare',
                    color: 0x3498db
                },
                {
                    name: 'Phoenix Feather',
                    description: 'Revive once if defeated',
                    effect: 'revive',
                    value: 1,
                    rarity: 'legendary',
                    color: 0xff9f43
                },
                {
                    name: 'Shield Generator',
                    description: 'Gain 3 armor for next 3 battles',
                    effect: 'temp_armor',
                    value: 3,
                    duration: 3,
                    rarity: 'rare',
                    color: 0x74b9ff
                },
                {
                    name: 'Mana Crystal',
                    description: 'Increase max HP by 25',
                    effect: 'max_hp_boost',
                    value: 25,
                    rarity: 'rare',
                    color: 0xa29bfe
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
    }

    createCards() {
        const cardWidth = 120;
        const cardHeight = 160;
        const spacing = 20;
        const totalWidth = (cardWidth * this.cardData.length) + (spacing * (this.cardData.length - 1));
        const startX = (this.scale.width - totalWidth) / 2 + cardWidth / 2;
        const cardY = this.scale.height / 2;

        this.cards = [];

        this.cardData.forEach((cardData, index) => {
            const cardX = startX + (cardWidth + spacing) * index;
            const card = this.createCard(cardX, cardY, cardData, index);
            this.cards.push(card);
        });
    }    createCard(x, y, cardData, index) {
        const container = this.add.container(x, y);
        container.setDepth(5);

        // Card background
        const bg = this.add.rectangle(0, 0, 120, 160, 0x2d3748)
            .setStrokeStyle(2, cardData.color);
        container.add(bg);

        // Rarity border
        const rarityColors = {
            common: 0x95a5a6,
            uncommon: 0x2ecc71,
            rare: 0x3498db,
            legendary: 0xf39c12
        };
        
        const rarityBorder = this.add.rectangle(0, 0, 116, 156, 0x000000, 0)
            .setStrokeStyle(3, rarityColors[cardData.rarity] || 0x95a5a6);
        container.add(rarityBorder);

        // Add subtle glow for legendary cards
        if (cardData.rarity === 'legendary') {
            const glow = this.add.rectangle(0, 0, 124, 164, 0xffd700, 0.3);
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

        // Card name
        const nameText = this.add.text(0, -65, cardData.name, {
            fontSize: '11px',
            fill: '#ffffff',
            fontFamily: 'Caprasimo-Regular',
            align: 'center',
            wordWrap: { width: 110 }
        }).setOrigin(0.5);
        container.add(nameText);

        // Card icon/symbol based on effect
        const iconSymbol = this.getCardIcon(cardData.effect);
        const icon = this.add.text(0, -25, iconSymbol, {
            fontSize: '28px',
            fill: cardData.color,
            fontFamily: 'Caprasimo-Regular'
        }).setOrigin(0.5);
        container.add(icon);

        // Card description
        const descText = this.add.text(0, 15, cardData.description, {
            fontSize: '9px',
            fill: '#cccccc',
            fontFamily: 'Caprasimo-Regular',
            align: 'center',
            wordWrap: { width: 105 }
        }).setOrigin(0.5);
        container.add(descText);

        // Rarity text
        const rarityText = this.add.text(0, 55, cardData.rarity.toUpperCase(), {
            fontSize: '8px',
            fill: rarityColors[cardData.rarity] || 0x95a5a6,
            fontFamily: 'Caprasimo-Regular',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(rarityText);

        // Add value indicator for certain effects
        if (['heal', 'damage_boost', 'permanent_damage', 'damage_reduction'].includes(cardData.effect)) {
            const valueText = this.add.text(0, 35, `+${cardData.value}`, {
                fontSize: '12px',
                fill: '#ffd700',
                fontFamily: 'Caprasimo-Regular',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(valueText);
        }        // Make entire container interactive instead of just background
        container.setSize(120, 160);
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
            damage_boost: '⚔️',
            critical_chance: '💥',
            damage_reduction: '🛡️',
            heal: '❤️',
            full_heal: '💖',
            permanent_damage: '🔥',
            berserker: '😈',
            lucky: '🍀',
            extra_turn: '⏰',
            revive: '🐦',
            temp_armor: '🔰',
            max_hp_boost: '💎'
        };
        return icons[effect] || '⭐';
    }    onCardHover(container, isHovering) {
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
    }applyCardEffect(card) {
        switch (card.effect) {
            case 'heal':
                gameManager.healPlayer(card.value);
                break;
            case 'full_heal':
                gameManager.setPlayerHP(gameManager.getMaxPlayerHP());
                break;
            case 'damage_boost':
                gameManager.addPlayerBuff('damage', card.value);
                break;
            case 'permanent_damage':
                gameManager.increasePermanentDamage(card.value);
                break;
            case 'damage_reduction':
                gameManager.addPlayerBuff('armor', card.value);
                break;
            case 'critical_chance':
                gameManager.addPlayerBuff('critical', card.value);
                break;
            case 'berserker':
                gameManager.addPlayerBuff('damage', card.value);
                gameManager.damagePlayer(card.penalty);
                break;
            case 'lucky':
                gameManager.addPlayerBuff('lucky', card.value);
                break;
            case 'extra_turn':
                gameManager.addPlayerBuff('extra_turn', card.value);
                break;
            case 'revive':
                gameManager.addPlayerBuff('revive', card.value);
                break;
            case 'temp_armor':
                gameManager.addPlayerBuff('temp_armor', card.value);
                gameManager.addPlayerBuff('temp_armor_duration', card.duration);
                break;
            case 'max_hp_boost':
                const currentMaxHP = gameManager.getMaxPlayerHP();
                gameManager.setMaxPlayerHP(currentMaxHP + card.value);
                gameManager.healPlayer(card.value); // Also heal for the amount
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
