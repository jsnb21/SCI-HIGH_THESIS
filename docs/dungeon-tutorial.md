# Dungeon Tutorial System for Web Design Mode

## Overview

The dungeon tutorial system provides contextual guidance specifically for the dungeon mode when the course topic is web design. This tutorial introduces players to the unique mechanics of navigating the grid-based dungeon environment while facing web development challenges.

## Tutorial Configurations

### 1. First Time Dungeon Tutorial
**Trigger:** `firstTimeDungeon`
- **When:** First time entering dungeon mode for web design course
- **Storage Key:** `sci-high-dungeon-tutorial-seen`

#### Tutorial Steps:

1. **Welcome to Web Design Dungeon**
   - Introduces the coding labyrinth concept
   - Explains the goal of facing web development challenges

2. **Your Character**
   - Highlights the player sprite
   - Explains movement controls (arrow keys or clicking)
   - Mentions health persistence between battles

3. **Health Display**
   - Shows the health indicator
   - Explains importance of health management
   - Warns about consequences of losing all health

4. **Dungeon Menu**
   - Highlights the menu button
   - Explains pause, stats, and exit functionality
   - Mentions progress saving

5. **Quiz Boxes - Your Enemies**
   - Highlights quiz box enemies
   - Explains that they contain web development challenges
   - Shows how stepping on them triggers battles

6. **Movement Areas**
   - Highlights adjacent movement cells (yellow)
   - Explains movement restrictions (adjacent cells only)
   - Shows turn-based movement system

7. **Visited Path**
   - Highlights visited cells (green)
   - Explains safe return to explored areas
   - Contrasts with unexplored territories

8. **Progressive Difficulty**
   - Explains increasing challenge as players progress
   - Mentions better rewards for harder enemies
   - Prepares players for complex web dev questions

9. **Ready for Adventure**
   - Final encouragement message
   - Reinforces movement controls and exploration

### 2. First Quiz Box Tutorial
**Trigger:** `firstQuizBox`
- **When:** Player first approaches a quiz box
- **Local Flag:** `firstQuizBoxShown`

#### Tutorial Steps:

1. **First Web Challenge**
   - Explains quiz battle initiation
   - Connects quiz boxes to web development questions

2. **Battle Strategy**
   - Advises on correct vs incorrect answers
   - Emphasizes web development knowledge as weapon

### 3. Boss Encounter Tutorial
**Trigger:** `bossEncounter`
- **When:** Player reaches boss level (`isBossLevel = true`)
- **Local Flag:** `bossEncounterShown`

#### Tutorial Steps:

1. **Boss Challenge Detected**
   - Announces boss level status
   - Explains enhanced difficulty

2. **Boss Battle Tips**
   - Advises on boss mechanics (more health, harder questions)
   - Suggests careful consideration of advanced concepts

## Technical Implementation

### Element Selectors

The dungeon tutorial uses specialized element selectors (`DUNGEON_ELEMENT_SELECTORS`) to target dungeon-specific UI elements:

- `player`: Returns `scene.playerSprite`
- `healthDisplay`: Returns `scene.dungeonHUD?.healthHearts`
- `menuButton`: Returns `scene.dungeonMenu?.menuButton`
- `quizBox`: Returns first quiz box sprite
- `adjacentCells`: Creates mock element for movement areas
- `visitedCells`: Creates mock element for visited areas

### Tutorial Triggers

The system uses `DUNGEON_TUTORIAL_TRIGGERS` with specific conditions:

```javascript
firstTimeDungeon: (scene) => {
    const hasSeenDungeonTutorial = localStorage.getItem('sci-high-dungeon-tutorial-seen');
    const isWebDesign = scene.courseTopic === 'webdesign';
    return !hasSeenDungeonTutorial && isWebDesign;
}
```

### Integration Points

1. **Scene Creation:** Tutorial manager initialized after all setup
2. **Movement System:** Tutorial checks integrated into `movePlayer()` method
3. **Boss Transitions:** Tutorial triggered when `isBossLevel` becomes true
4. **Cleanup:** Tutorial manager properly cleaned up in `shutdown()`

## Debug Features

### Debug Keys
- **Shift+T:** Manually trigger first-time tutorial
- **Shift+R:** Reset all tutorial flags and localStorage

### Debug Methods
- `triggerManualTutorial()`: Force show first-time tutorial
- `resetTutorialFlags()`: Clear all tutorial progress
- Visual notification system for debug actions

## Course-Specific Features

The dungeon tutorial is specifically designed for web design courses:

- **Topic Validation:** Only shows for `courseTopic === 'webdesign'`
- **Web Development Context:** All tutorial text references HTML, CSS, JavaScript
- **Coding Terminology:** Uses web development vocabulary throughout
- **Challenge Framing:** Presents quiz boxes as "coding challenges" and "web bugs"

## User Experience Flow

1. **First Entry:** Player enters web design dungeon → First-time tutorial shows
2. **Exploration:** Player moves around → Movement tutorial reinforced
3. **First Enemy:** Player approaches quiz box → First quiz box tutorial
4. **Boss Level:** Player reaches boss → Boss encounter tutorial
5. **Completion:** All tutorials completed, player can explore freely

## Tutorial Persistence

- **Cross-Session:** Uses localStorage for first-time tutorial
- **Session-Based:** Uses scene flags for encounter-specific tutorials
- **Reset Capability:** Debug keys allow complete reset for testing
- **Course-Specific:** Each course topic maintains separate tutorial state

## Accessibility Features

- **Visual Highlighting:** Pulsating borders and distinct colors
- **Clear Positioning:** Tutorial boxes positioned to avoid covering important UI
- **Progressive Disclosure:** Complex concepts broken into digestible steps
- **Non-Blocking:** Tutorials don't prevent core gameplay after dismissal

## Future Enhancements

Potential improvements for the dungeon tutorial system:

1. **Adaptive Difficulty:** Tutorial complexity based on player experience
2. **Mini-Tutorials:** Just-in-time help for specific mechanics
3. **Visual Aids:** Animated arrows or movement demonstrations
4. **Audio Integration:** Voice narration for key tutorial steps
5. **Interactive Elements:** Require player to perform actions to proceed

## Testing Guidelines

To test the dungeon tutorial system:

1. **Fresh Start:** Clear localStorage and enter web design dungeon
2. **Debug Testing:** Use Shift+R to reset, Shift+T to trigger
3. **Course Validation:** Ensure tutorial only shows for web design course
4. **Element Targeting:** Verify all highlights target correct UI elements
5. **Flow Testing:** Complete full tutorial sequence naturally
6. **Persistence Testing:** Verify tutorial doesn't repeat after completion

The dungeon tutorial system enhances the web design learning experience by providing context-aware guidance for the unique dungeon exploration mechanics while maintaining focus on web development education.
