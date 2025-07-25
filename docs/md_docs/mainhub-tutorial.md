# Main Hub Tutorial Testing Guide

## Overview
A comprehensive tutorial system has been implemented for the main hub scene that guides first-time players through the different areas and features of SCI-HIGH.

## Features Added

### 1. Tutorial Configuration
- Added `MAIN_HUB_TUTORIAL_STEPS` in `src/components/TutorialConfig.js`
- 10-step tutorial covering all major hub features:
  1. Welcome message
  2. Points display explanation
  3. Leaderboard introduction
  4. School areas overview
  5. Classroom guidance
  6. Computer Lab introduction
  7. Library overview
  8. Office explanation
  9. Navigation tips
  10. Final encouragement

### 2. Tutorial Integration
- Integrated into `src/scenes/mainhub.js`
- Uses existing `TutorialManager` system
- Automatically triggers on first visit to hub
- Uses `onceOnlyFlags` to track if tutorial has been seen

### 3. Smart Element Targeting
- Dynamically targets UI elements:
  - Points display
  - Leaderboard button
  - Carousel area
  - Individual area icons (Classroom, Computer Lab, Library, Office)
- Handles cases where elements might not be loaded yet

### 4. Debug Features
- **Shift+T**: Manually trigger tutorial (for testing)
- **Shift+R**: Reset tutorial flag (allows tutorial to show again)

## How It Works

1. **First Visit Detection**: Uses `onceOnlyFlags.hasSeen('mainhub_tutorial')` to check if tutorial should show
2. **Timing**: Tutorial starts after carousel is created (300ms delay to ensure all elements are ready)
3. **Element Targeting**: Dynamically finds and highlights specific UI elements
4. **Completion Tracking**: Sets tutorial flag when completed or skipped

## Testing Instructions

### First Time Test
1. Start the game fresh or reset tutorial flag
2. Navigate to the main hub
3. Tutorial should automatically start after any intro dialogue

### Manual Testing
1. In main hub, press **Shift+T** to trigger tutorial manually
2. Press **Shift+R** to reset the tutorial flag for repeated testing

### Element Verification
- Tutorial should properly highlight:
  - Points display (top-right)
  - Leaderboard button (below points)
  - Carousel area (center)
  - Individual icons as they are introduced

## Tutorial Flow

1. **Welcome**: General introduction to the hub
2. **Progress Tracking**: Explains points and progress system
3. **Leaderboards**: Introduces competitive element
4. **Area Overview**: Explains the carousel navigation
5. **Classroom**: Recommends starting point for new players
6. **Computer Lab**: Introduces main quiz challenges
7. **Library**: Explains study resources
8. **Office**: Covers achievements and settings
9. **Navigation**: General tips for moving around
10. **Encouragement**: Final motivation to start exploring

## Integration Points

- Uses existing `TutorialManager` class
- Integrates with `onceOnlyFlags` system
- Works with existing VN dialogue system
- Compatible with carousel UI component
- Properly cleans up on scene shutdown

## Notes for Developers

- Tutorial elements are properly destroyed in the `shutdown()` method
- Debug keys are only active in development
- Tutorial can be skipped by players
- All text is customizable in `TutorialConfig.js`
- Element targeting is fault-tolerant (won't break if elements don't exist)
