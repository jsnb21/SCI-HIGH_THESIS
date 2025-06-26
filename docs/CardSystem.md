# Card System Documentation

## Overview
The card system provides quiz-focused buffs and limited healing options after each enemy defeat in the dungeon. Cards are designed to enhance quiz performance rather than combat stats.

## Card Categories

### Quiz Buffs (80% spawn rate)
These cards enhance quiz performance through various mechanics:

#### Common Cards
- **Score Multiplier**: +20% Quiz Score Bonus (📊)
- **Combo Master**: +2 Combo Per Correct Answer (🔥)
- **Time Extension**: +10 Seconds Quiz Time (⏰)
- **Quiz Shield**: Wrong answers deal 50% less damage (🛡️)

#### Uncommon Cards
- **Perfect Streak**: +50% Score for 3+ Correct Answers (⚡)
- **Knowledge Surge**: +40% Quiz Score Bonus (📊)
- **Speed Learner**: +30% Score for Fast Answers (💨)
- **Second Chance**: 25% chance wrong answers don't count (🔄)

#### Rare Cards
- **Scholar's Focus**: +20 Seconds & +25% Score (🧠)
- **Genius Mode**: +100% Score for Perfect Quiz (⭐)
- **Double Points**: Next quiz gives double score (💰)

#### Legendary Cards
- **Quiz Master**: See one wrong answer eliminated (💡)

### Healing Cards (20% spawn rate)
Limited healing options to maintain challenge:

#### Uncommon Cards
- **Minor Heal**: Restore +1 HP (❤️)

#### Legendary Cards
- **Full Recovery**: Restore to full HP (💖)

## Implementation Details

### GameManager Methods
The system integrates with GameManager through specialized methods:

- `applyScoreMultiplier(baseScore)`: Applies score multiplier buffs
- `applyComboBoost(baseCombo)`: Enhances combo points
- `getTimeBonus()`: Returns additional time for quizzes
- `applyStreakBonus(baseScore, streak)`: Bonus for correct streaks
- `applySpeedBonus(baseScore, time, limit)`: Bonus for fast answers
- `checkSecondChance()`: Checks if wrong answer is negated
- `useAnswerHint()`: Eliminates one wrong answer
- `calculateQuizScore(baseScore, options)`: Comprehensive score calculation

### Technical Implementation
- Cards are generated with 80% quiz / 20% heal probability
- Visual design includes rarity-based coloring and proper scaling
- Interactive hover effects and selection feedback
- Proper state management and cleanup
- Integration with dungeon scene flow

### Rarity System
- **Common**: Basic buffs, standard appearance
- **Uncommon**: Enhanced effects, slightly more prominent
- **Rare**: Powerful effects, distinctive styling
- **Legendary**: Game-changing effects, premium appearance

## Usage
The card system automatically triggers after each enemy defeat in the dungeon. Players choose one card from 3 options (4 for boss rewards). Effects are immediately applied and persist throughout the dungeon run.

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
