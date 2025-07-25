# Tutorial System Documentation

## Overview

The SCI-HIGH education4. **Python Concepts Tutorial**: Shown when demonstrating mastery:
   - Concept understanding recognition
   - Programming foundation building
   - Skill progression acknowledgment

5. **Timer Tutorial**: Triggered when timer is running low (≤25 seconds):
   - Time pressure awareness
   - Efficient coding mindset
   - Quick decision-making emphasis
   - Focus on most likely answers

6. **Python Victory Tutorial**: Programming-specific celebration:
   - Logical thinking recognition
   - Coding skill growth acknowledgment
   - Programming confidence buildingow includes a comprehensive tutorial system that guides players through quiz battles with interactive highlighting, text boxes, and contextual instructions.

## Features

### 🎯 Interactive Highlighting
- **Smart Element Detection**: Automatically highlights relevant UI elements
- **Customizable Styles**: Border colors, thickness, padding, and pulsating effects
- **Overlay System**: Dims background while keeping highlighted elements visible

### 📖 Contextual Text Boxes
- **Dynamic Positioning**: Automatically positions text boxes to avoid UI conflicts
- **Rich Content**: Supports titles, main text, and custom styling
- **Responsive Design**: Adapts to different screen sizes

### 🎮 Tutorial Types

#### 1. First Time Tutorial (`firstTime`)
Comprehensive introduction covering:
- Player health system
- Enemy health and combat
- Timer mechanics
- Combo system
- Question area
- Answer options
- Basic battle strategy

#### 2. Combo Tutorial (`combo`)
Triggered when player reaches 3x combo:
- Explains combo building mechanics
- Shows damage and score multipliers
- Encourages streak maintenance

#### 3. Low Health Warning (`lowHealth`)
Activated when player health drops below 30%:
- Critical health warning
- Emphasizes careful answering
- Visual urgency indicators

#### 4. Power-Up Tutorial (`powerUps`)
Shown when power-ups become available:
- Double Score mechanics
- Second Chance system
- Strategic usage tips

#### 5. Victory Tutorial (`victory`)
Celebrates first battle win:
- Victory celebration
- Reinforces learning success

### Subject-Specific Tutorials

#### Python Programming Tutorials
Enhanced tutorials for Python quiz scenes with programming-focused content:

1. **Python First Time Tutorial**: Programming-specific introduction covering:
   - Coding stamina (health) system
   - Python challenge enemies
   - Coding timer pressure
   - Python mastery combo system
   - Code challenge questions
   - Syntax-aware answer selection

2. **Syntax Error Tutorial**: Triggered after multiple wrong answers:
   - Python syntax reminders
   - Indentation importance
   - Variable naming conventions
   - Code structure guidelines

3. **Python Concepts Tutorial**: Shown when demonstrating mastery:
   - Concept understanding recognition
   - Programming foundation building
   - Skill progression acknowledgment

4. **Python Victory Tutorial**: Programming-specific celebration:
   - Logical thinking recognition
   - Coding skill growth acknowledgment
   - Programming confidence building

## Implementation

### Core Components

#### TutorialManager.js
```javascript
const tutorialManager = new TutorialManager(scene);
tutorialManager.init(steps, callbacks);
```

#### TutorialConfig.js
Contains:
- Tutorial step definitions
- Trigger conditions
- Element selectors

### Integration in BaseQuizScene

```javascript
// Initialize in constructor
this.tutorialManager = new TutorialManager(this);
this.tutorialFlags = { /* tutorial state */ };

// Check triggers at key moments
this.checkAndShowTutorial();

// Manual tutorial triggering
this.forceTutorial('firstTime');
```

### Automatic Triggers

1. **Game Start**: First-time tutorial for new players
2. **Correct Answers**: Combo tutorial on streak building
3. **Damage Taken**: Low health warning when critical
4. **Victory**: Success celebration and encouragement

## Testing and Development

### Tutorial Test Scene
Access via Main Menu → "Tutorial Test"
- Visual preview of all tutorial types
- Mock game elements for testing
- Safe environment for tutorial development

### Debug Controls (Development Mode)
- **Ctrl+T**: Show first-time tutorial
- **Ctrl+C**: Show combo tutorial  
- **Ctrl+H**: Show low health tutorial
- **Ctrl+R**: Reset tutorial flags

#### Python-Specific Debug Controls
- **Ctrl+S**: Show Python syntax error tutorial
- **Ctrl+P**: Show Python concepts tutorial

### Local Storage Integration
- Tracks tutorial completion status
- Prevents repetitive first-time tutorials
- Persists across game sessions

## Customization

### Adding New Tutorial Types

1. **Define Steps** in `TutorialConfig.js`:
```javascript
newTutorial: [
    {
        title: "New Feature",
        text: "This explains the new feature...",
        target: null, // Will be set dynamically
        highlightStyle: { borderColor: 0x00FF00 }
    }
]
```

2. **Add Trigger Logic**:
```javascript
newTutorial: (scene) => {
    return /* condition for showing tutorial */;
}
```

3. **Integrate in Scene**:
```javascript
if (TUTORIAL_TRIGGERS.newTutorial(this)) {
    this.showTutorial('newTutorial');
}
```

### Styling Options

#### Highlight Styles
```javascript
highlightStyle: {
    borderColor: 0xFFFF00,     // Border color
    borderWidth: 3,            // Border thickness
    borderAlpha: 1,            // Border opacity
    padding: 10,               // Highlight padding
    cornerRadius: 5,           // Rounded corners
    pulsate: true              // Pulsating effect
}
```

#### Text Box Styles
```javascript
textBoxStyle: {
    width: 400,                // Box width
    height: 150,               // Box height
    backgroundColor: 0x1a1a2e, // Background color
    borderColor: 0x16213e,     // Border color
    borderWidth: 3,            // Border thickness
    cornerRadius: 10,          // Rounded corners
    padding: 20                // Internal padding
}
```

## Best Practices

### Tutorial Design
1. **Keep it Concise**: Short, focused explanations
2. **Progressive Disclosure**: Introduce concepts gradually
3. **Context-Sensitive**: Show tutorials when relevant
4. **Skippable**: Always allow tutorial skipping
5. **Visual Feedback**: Use highlights and animations

### Performance Considerations
1. **Lazy Loading**: Only create tutorial elements when needed
2. **Proper Cleanup**: Destroy tutorial elements after use
3. **Event Management**: Remove event listeners properly
4. **Memory Management**: Avoid tutorial memory leaks

### Accessibility
1. **Clear Visuals**: High contrast highlighting
2. **Readable Text**: Appropriate font sizes and colors
3. **Keyboard Support**: Navigation without mouse
4. **Screen Reader Friendly**: Meaningful text content

## Troubleshooting

### Common Issues

#### Tutorial Not Showing
- Check trigger conditions in `TUTORIAL_TRIGGERS`
- Verify tutorial flags are not already set
- Ensure scene elements exist before tutorial

#### Highlight Not Working
- Verify target element exists and has bounds
- Check element depth/visibility
- Ensure proper element selector

#### Text Box Positioning
- Adjust `textBoxPosition` in tutorial step
- Consider screen size and UI layout
- Test on different resolutions

### Debug Tools
- Use browser console for tutorial logs
- Check localStorage for tutorial flags
- Use Tutorial Test Scene for isolated testing

## Future Enhancements

### Planned Features
1. **Animated Arrows**: Pointing to specific elements
2. **Interactive Steps**: Require user interaction to continue
3. **Branching Tutorials**: Different paths based on user actions
4. **Achievement Integration**: Rewards for tutorial completion
5. **Adaptive Timing**: Smart tutorial scheduling based on performance

### Integration Opportunities
1. **Analytics**: Track tutorial effectiveness
2. **A/B Testing**: Compare different tutorial approaches
3. **Personalization**: Customize tutorials based on learning style
4. **Multi-language**: Localization support

## Contributing

When adding new tutorials:
1. Follow existing naming conventions
2. Test thoroughly across different scenarios
3. Update documentation
4. Consider accessibility requirements
5. Maintain consistent visual style

## File Structure

```
src/
├── components/
│   ├── TutorialManager.js      # Core tutorial system
│   └── TutorialConfig.js       # Tutorial definitions
├── scenes/
│   ├── TutorialTestScene.js    # Testing environment
│   └── quizscenes/
│       └── BaseQuizScene.js    # Tutorial integration
```

This tutorial system enhances the educational experience by providing contextual guidance while maintaining game flow and engagement.
