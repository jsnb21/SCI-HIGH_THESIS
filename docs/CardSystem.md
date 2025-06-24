# Card Reward System

## Overview
The Card Reward System is implemented in `src/scenes/ui/CardRewardScene.js` and integrates with the dungeon system to provide players with meaningful choices after defeating enemies.

## How It Works

### Integration with Dungeon Scene
- After every enemy defeat in the dungeon, the card reward scene is automatically launched
- Boss defeats show legendary cards with enhanced effects
- Regular enemy defeats show 3 cards, boss defeats show 4 cards

### Card Types

#### Buff Cards
- **Strength Boost**: +5 Player Damage
- **Critical Strike**: +10% Critical Chance  
- **Armor Plating**: Reduce incoming damage by 2

#### Heal Cards
- **Health Potion**: Restore 25 HP
- **Greater Heal**: Restore 50 HP
- **Full Recovery**: Restore to full HP

#### Damage Cards
- **Power Surge**: +3 Permanent Damage
- **Berserker Rage**: +8 Damage, -5 HP (high risk/reward)

#### Special Cards
- **Lucky Charm**: Better rewards from next enemy
- **Time Warp**: Extra turn in next battle
- **Phoenix Feather**: Revive once if defeated
- **Shield Generator**: Gain 3 armor for next 3 battles
- **Mana Crystal**: Increase max HP by 25

### Rarity System
- **Common** (Gray): Basic effects
- **Uncommon** (Green): Moderate effects
- **Rare** (Blue): Strong effects
- **Legendary** (Gold): Powerful effects, enhanced on boss rewards

### Game Manager Integration
The card system integrates with the buff system in `gameManager.js`:

```javascript
// Example buff applications
gameManager.addPlayerBuff('damage', 5);
gameManager.addPlayerBuff('armor', 2);
gameManager.healPlayer(25);
gameManager.increasePermanentDamage(3);
```

## Testing

### Debug Methods
The dungeon scene includes debug methods for testing:

```javascript
// Test regular card reward
dungeonScene.debugTestCardSystem();

// Test boss card reward  
dungeonScene.debugTestBossCardSystem();
```

### Console Access
You can access the game manager from the browser console:
```javascript
// Check current buffs
window.gameManager.getAllPlayerBuffs();

// Check player stats
window.gameManager.getPlayerHP();
window.gameManager.getMaxPlayerHP();
```

## Visual Features
- Animated card entrance with staggered timing
- Hover effects with sound
- Rarity-based visual styling
- Legendary cards have animated glow effects
- Selection feedback with confirmation text

## Audio Integration
- Hover sound effects (`se_select.wav`)
- Selection confirmation (`se_confirm.wav`)
- Graceful fallback if audio files are missing

## Files Modified
1. `src/scenes/ui/CardRewardScene.js` - Main card system implementation
2. `src/scenes/comlabscenes/dungeon.js` - Integration with enemy defeat system
3. `src/gameManager.js` - Buff system and card effect handling
4. `src/game.js` - Scene registration

## Future Enhancements
- Save/load card effects between sessions
- More complex card combinations
- Deck building mechanics
- Card collection system
- Achievement integration for card collection
