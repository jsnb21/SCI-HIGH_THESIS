import Phaser from 'phaser';
import Intro from '/src/scenes/intro.js';
import MainMenu from './scenes/mainmenu';
import OptionsScene from './scenes/options.js';
import MainHub from './scenes/mainhub.js';

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

const config = {
  type: Phaser.AUTO,
  width: 1224,
  height: 936,
  parent: 'game',
  scene: [
    MainMenu, Intro, OptionsScene, MainHub,
    /* Computer Lab */
    ComputerLab, WebDesignScene, PythonScene, JavaScene, CSProgrammingScene, CPlusplusScene, CSharpScene,
  
    /* Quiz Scenes */
    BaseQuizScene, WebDesignQuizScene, JavaQuizScene, PythonQuizScene, CplusplusQuizScene, CQuizScene, CSharpQuizScene],
  dom: {
    createContainer: true // Enable DOM container
  }
};

export const DEFAULT_TEXT_STYLE = {
    fontSize: '52px',
    fontFamily: 'Jersey15-Regular', // Must match CSS
    color: '#ffffff',
    stroke: '#000000',        // Solid black outline
    strokeThickness: 10
};

new Phaser.Game(config);