# SCI-HIGH Tutorial System - Complete Implementation

## Overview
A comprehensive tutorial system has been implemented across all major scenes in SCI-HIGH to guide new players through the educational game features.

## Implemented Tutorials

### 1. Main Hub Tutorial (`mainhub.js`)
**Trigger**: First visit to main hub (`mainhub_tutorial` flag)
**Steps**: 10 tutorial steps
- Welcome to SCI-HIGH
- Points and progress system
- Leaderboard introduction
- School areas overview
- Individual area introductions (Classroom, Computer Lab, Library, Office)
- Navigation tips and encouragement

### 2. Computer Lab Tutorial (`computerlab.js`)
**Trigger**: First visit to computer lab (`computerlab_tutorial` flag)
**Steps**: 8 tutorial steps
- Welcome to Computer Lab
- Programming languages overview
- Course progression system
- Web Design introduction (beginner-friendly)
- Python programming overview
- Advanced languages overview
- Battle system explanation
- Encouragement to start coding

### 3. Classroom Tutorial (`classroom.js`)
**Trigger**: First visit to classroom (`classroom_tutorial` flag)
**Steps**: 6 tutorial steps
- Welcome to Classroom
- Classmates introduction
- Student interaction system
- Quest system explanation (main, side, bonus quests)
- Progress tracking
- Encouragement to meet classmates

### 4. Library Tutorial (`baseLibraryScene.js`)
**Trigger**: First visit to library (`library_tutorial` flag)
**Steps**: 7 tutorial steps
- Welcome to Library
- Library sections overview
- Books collection introduction
- Progress tracking features
- Personal notes system
- Study tips and recommendations
- Encouragement to start reading

### 5. Office Tutorial (`office.js`)
**Trigger**: First visit to office (`office_tutorial` flag)
**Steps**: 7 tutorial steps
- Welcome to Office
- Office sections navigation
- Student profile management
- Performance statistics
- Achievements wall
- Feedback and goals system
- Encouragement to manage profile

## Tutorial System Features

### ✅ **Smart Element Targeting**
- Dynamic targeting of UI elements
- Fault-tolerant targeting (won't break if elements don't exist)
- Highlights specific carousel items, buttons, and UI sections
- Uses pulsating effects and colored borders for emphasis

### ✅ **Progression Tracking**
- Uses `onceOnlyFlags` system to track tutorial completion
- Each scene has its own tutorial flag
- Tutorials show only once per player

### ✅ **Debug Features** (Available in all scenes)
- **Shift+T**: Manually trigger tutorial for testing
- **Shift+R**: Reset tutorial flag to allow replay
- Console logging for tutorial events

### ✅ **Consistent Implementation**
- All scenes use the same `TutorialManager` class
- Consistent tutorial configuration structure
- Proper cleanup in scene shutdown/destroy methods
- Uses existing tutorial system components

## Tutorial Configuration Structure

Each tutorial is defined in `TutorialConfig.js` with the following structure:

```javascript
export const SCENE_TUTORIAL_STEPS = {
    firstTimeScene: [
        {
            title: "Tutorial Step Title",
            text: "Explanation text for the player",
            target: 'elementId', // Optional: UI element to highlight
            highlightStyle: {
                borderColor: 0x00FF7F,
                pulsate: true,
                padding: 15
            },
            textBoxPosition: { x: 400, y: 200 },
            arrow: { // Optional
                position: { x: 300, y: 350 },
                rotation: -45
            },
            buttonText: "Custom Button Text", // Optional
            onShow: (scene) => { /* Custom logic */ }, // Optional
            onComplete: (scene) => { /* Custom logic */ } // Optional
        }
    ]
};
```

## Scene Integration Pattern

Each scene follows this integration pattern:

1. **Import Dependencies**:
   ```javascript
   import { onceOnlyFlags } from '../gameManager';
   import TutorialManager from '../components/TutorialManager.js';
   import { SCENE_TUTORIAL_STEPS } from '../components/TutorialConfig.js';
   ```

2. **Constructor**:
   ```javascript
   constructor() {
       super({ key: 'SceneName' });
       this.tutorialManager = null;
   }
   ```

3. **Tutorial Initialization** (after UI creation):
   ```javascript
   // Initialize tutorial manager
   this.tutorialManager = new TutorialManager(this);

   // Check first-time visit
   if (!onceOnlyFlags.hasSeen('scene_tutorial')) {
       this.time.delayedCall(500, () => {
           this.startSceneTutorial();
       });
   }

   // Debug features
   this.input.keyboard.on('keydown-T', () => {
       if (this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'))) {
           this.startSceneTutorial();
       }
   });
   ```

4. **Tutorial Method**:
   ```javascript
   startSceneTutorial() {
       const tutorialSteps = [...SCENE_TUTORIAL_STEPS.firstTimeScene];
       
       // Set dynamic targets
       tutorialSteps.forEach(step => {
           // Target mapping logic
       });

       this.tutorialManager.init(tutorialSteps, {
           onComplete: () => onceOnlyFlags.setSeen('scene_tutorial'),
           onSkip: () => onceOnlyFlags.setSeen('scene_tutorial')
       });
   }
   ```

5. **Cleanup** (in shutdown/destroy method):
   ```javascript
   if (this.tutorialManager) {
       this.tutorialManager.destroy();
       this.tutorialManager = null;
   }
   ```

## Testing Instructions

### For Each Scene:
1. **First Time Test**: Start fresh game or reset tutorial flags
2. **Manual Testing**: Use **Shift+T** to trigger tutorial
3. **Reset Testing**: Use **Shift+R** to reset tutorial flag
4. **Element Verification**: Check that highlights appear on correct elements

### Comprehensive Test Flow:
1. Start at Main Menu
2. Enter Main Hub → Tutorial should trigger
3. Visit Computer Lab → Tutorial should trigger
4. Visit Classroom → Tutorial should trigger
5. Visit Library → Tutorial should trigger
6. Visit Office → Tutorial should trigger

## Technical Notes

### Element Targeting:
- **Carousel Elements**: Uses `carouselIcons` array with `iconIndex` matching
- **Menu Items**: Targets container elements or specific UI components
- **UI Buttons**: Finds elements by type and position characteristics

### Timing:
- Tutorials start 500ms after scene creation to ensure UI is ready
- Can be manually triggered immediately for testing

### Memory Management:
- All tutorials properly clean up in scene destruction
- Tutorial manager destroys all created elements
- No memory leaks or persistent references

## Future Enhancements

### Potential Additions:
1. **Skip Tutorial Option**: Global setting to disable all tutorials
2. **Tutorial Replay**: Menu option to replay tutorials
3. **Progressive Tutorials**: Multi-part tutorials that advance with player progress
4. **Contextual Help**: On-demand tutorial hints during gameplay
5. **Tutorial Customization**: Different tutorial paths based on player experience

### Accessibility:
- Consider adding audio narration for tutorials
- Keyboard navigation for tutorial steps
- High contrast mode compatibility
- Text size scaling options

## Maintenance

### Adding New Tutorials:
1. Create tutorial steps in `TutorialConfig.js`
2. Import and integrate into target scene
3. Add flag to `onceOnlyFlags` system
4. Test thoroughly with debug features
5. Update this documentation

### Modifying Existing Tutorials:
1. Update tutorial steps in `TutorialConfig.js`
2. Test element targeting still works correctly
3. Verify timing and flow
4. Check cleanup and memory management

This tutorial system provides a comprehensive onboarding experience for new players while maintaining code organization and reusability across the entire SCI-HIGH educational game.
