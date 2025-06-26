import Phaser from 'phaser';
import Intro from '/src/scenes/intro.js';
import MainMenu from './scenes/mainmenu';
import OptionsScene from './scenes/options.js';
import MainHub from './scenes/mainhub.js';

// Import StartUp
import StartUp from './scenes/startup.js'

// Add Classroom import
import Classroom from './scenes/classroom.js';

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
import ReadingScene from './scenes/libraryScenes/readingScene.js';

// Dungeon Scene
import DungeonScene from './scenes/comlabscenes/dungeon.js';
import DungeonCleared from './scenes/dungeonCleared.js';

// UI Scenes
import CardRewardScene from './scenes/ui/CardRewardScene.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },  scene: [
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
    /* Quiz Scenes */
    BaseQuizScene,
    WebDesignQuizScene,
    JavaQuizScene,
    PythonQuizScene,
    CplusplusQuizScene,
    CQuizScene,
    CSharpQuizScene,
    /* Library Scenes */
    BaseLibraryScene,
  ],
  dom: {
    createContainer: true
  }
};

export const DEFAULT_TEXT_STYLE = {
    fontSize: '42px',
    fontFamily: 'Caprasimo-Regular',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 10
};

window.addEventListener('resize', () => {
    if (game && game.scale) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        game.scale.resize(width, height);

        const canvas = game.canvas;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }
});

new Phaser.Game(config);