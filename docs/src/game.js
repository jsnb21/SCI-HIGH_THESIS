import Phaser from 'phaser';
import Intro from '/src/scenes/intro.js';
import MainMenu from './scenes/mainmenu';
import OptionsScene from './scenes/options.js';
import MainHub from './scenes/mainhub.js';

// Import StartUp
import StartUp from './scenes/startup.js'

// Add Classroom import
import Classroom from './scenes/classroom.js';

// Story Scenes
import NoahStoryMode from './scenes/storyScenes/noah/NoahStoryMode.js';
import NoahChapterSelect from './scenes/storyScenes/noah/NoahChapterSelect.js';
import NoahStoryQuiz from './scenes/storyScenes/noah/NoahStoryQuiz.js';
import NoahProgressTracker from './scenes/storyScenes/noah/NoahProgressTracker.js';

// Lily's Python Story Scenes
import LilyStoryMode from './scenes/storyScenes/lily/LilyStoryMode.js';
import LilyChapterSelect from './scenes/storyScenes/lily/LilyChapterSelect.js';
import LilyStoryQuiz from './scenes/storyScenes/lily/LilyStoryQuiz.js';
import LilyProgressTracker from './scenes/storyScenes/lily/LilyProgressTracker.js';

// Damian's Java Story Scenes
import DamianStoryMode from './scenes/storyScenes/damian/DamianStoryMode.js';
import DamianChapterSelect from './scenes/storyScenes/damian/DamianChapterSelect.js';
import DamianStoryQuiz from './scenes/storyScenes/damian/DamianStoryQuiz.js';
import DamianProgressTracker from './scenes/storyScenes/damian/DamianProgressTracker.js';

// Office 
import Office from './scenes/office.js';

// Computer Lab
import ComputerLab from './scenes/computerlab.js';
import WebDesignScene from '/src/scenes/comlabscenes/webDesign.js';
import PythonScene from '/src/scenes/comlabscenes/python.js';
import JavaScene from '/src/scenes/comlabscenes/java.js';
import CSProgrammingScene from '/src/scenes/comlabscenes/CProg.js';
import CPlusplusScene from '/src/scenes/comlabscenes/Cplusplus.js';
import CSharpScene from '/src/scenes/comlabscenes/CSharp.js';

// Roguelike Scenes
import MainGameplay from '/src/scenes/roguelikeBase/main_gameplay.js';
import QuizScene from '/src/scenes/roguelikeBase/QuizScene.js';
import PowerUpScene from '/src/scenes/roguelikeBase/PowerUpScene.js';
import ResultScreen from './scenes/roguelikeBase/ResultScreen.js';

// Quiz Scenes
import BaseQuizScene from '/src/scenes/quizscenes/BaseQuizScene.js';
import WebDesignQuizScene from '/src/scenes/quizscenes/WebDesignQuizScene.js';
import JavaQuizScene from '/src/scenes/quizscenes/JavaQuizScene.js';
import PythonQuizScene from './scenes/quizscenes/PythonQuizScene.js';
import CQuizScene from './scenes/quizscenes/CQuizScene.js';
import CSharpQuizScene from './scenes/quizscenes/CSharpQuizScene.js';
import CplusplusQuizScene from './scenes/quizscenes/CplusplusQuizScene.js';

//Library Scenes
import BaseLibraryScene from './scenes/libraryScenes/baseLibraryScene.js';

// Dungeon Scene
import DungeonScene from './scenes/comlabscenes/dungeon.js';
import DungeonCleared from './scenes/dungeonCleared.js';

// UI Scenes
import CardRewardScene from './scenes/ui/CardRewardScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game',
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Mobile-optimized scaling
    width: 1920,
    height: 1080,
    min: {
      width: 320,
      height: 240
    },
    max: {
      width: 1920,
      height: 1080
    },
    // Mobile-specific scaling options
    zoom: 1,
    expandParent: false,
    autoRound: true
  },
  scene: [
    StartUp, // Added StartUp as the first scene
    MainMenu,
    /* Main Scenes */
    DungeonScene,
    DungeonCleared,
    /* UI Scenes */
    CardRewardScene,
    Intro,
    OptionsScene,
    MainHub,
    /* Classroom */
    Classroom,
    /* Story Scenes */
    NoahStoryMode,
    NoahChapterSelect,
    NoahStoryQuiz,
    NoahProgressTracker,
    /* Lily's Python Story Scenes */
    LilyStoryMode,
    LilyChapterSelect,
    LilyStoryQuiz,
    LilyProgressTracker,
    /* Damian's Java Story Scenes */
    DamianStoryMode,
    DamianChapterSelect,
    DamianStoryQuiz,
    DamianProgressTracker,
    /* Office */
    Office,
    /* Computer Lab Scenes */
    ComputerLab,
    WebDesignScene,
    PythonScene,
    JavaScene,
    CSProgrammingScene,
    CPlusplusScene,
    CSharpScene,
    /* Roguelike Scenes */
    MainGameplay,
    QuizScene,
    PowerUpScene,
    ResultScreen,
    /* Quiz Scenes */
    BaseQuizScene,
    WebDesignQuizScene,
    JavaQuizScene,
    PythonQuizScene,
    CplusplusQuizScene,
    CQuizScene,
    CSharpQuizScene,
    /* Library Scenes */
    BaseLibraryScene
  ],
  dom: {
    createContainer: true
  },
  input: {
    activePointers: 1, // Reduce to single touch to prevent double events
    touch: {
      capture: true, // Capture touch events to prevent double firing
      target: null   // Let Phaser handle the target
    },
    mouse: {
      capture: true  // Also capture mouse events for consistency
    },
    preventDefaultMove: false // Allow default touch behaviors like scrolling
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

export const DEFAULT_TEXT_STYLE = {
    fontSize: '32px', // Increased base size for better mobile readability
    fontFamily: 'Caprasimo-Regular',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 6 // Increased for better visibility on mobile
};

// Add error handling and debugging
console.log('Script loaded, checking environment...');

// Check if we're in a problematic environment
if (typeof window.SES !== 'undefined') {
    console.warn('SES detected - this may cause conflicts');
}

window.addEventListener('resize', () => {
    if (window.game && window.game.scale) {
        window.game.scale.refresh();
    }
});

// Handle orientation changes specifically for mobile
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (window.game && window.game.scale) {
            window.game.scale.refresh();
        }
    }, 100); // Small delay to ensure viewport has updated
});

// Add error handling for game initialization
let game;
try {
    console.log('Creating Phaser Game instance...');
    game = new Phaser.Game(config);
    console.log('Phaser Game created successfully:', game);
    
    // Make game globally accessible for debugging
    window.game = game;
} catch (error) {
    console.error('Failed to create Phaser Game:', error);
    console.error('Error stack:', error.stack);
    
    // Display error message on page
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff0000;
        color: white;
        padding: 20px;
        border-radius: 5px;
        font-family: Arial;
        z-index: 10000;
        max-width: 500px;
    `;
    errorDiv.innerHTML = `
        <h3>Game Failed to Load</h3>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Please try:</p>
        <ul>
            <li>Opening in incognito/private mode</li>
            <li>Disabling browser extensions</li>
            <li>Using a different browser</li>
            <li>Check the browser console for more details</li>
        </ul>
    `;
    document.body.appendChild(errorDiv);
}