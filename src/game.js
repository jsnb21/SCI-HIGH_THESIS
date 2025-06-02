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
import CprogScene from '/src/scenes/comlabscenes/C.js';
import CPlusplusScene from '/src/scenes/comlabscenes/C++.js';
import CSharpScene from '/src/scenes/comlabscenes/C#.js';


const config = {
  type: Phaser.AUTO,
  width: 1224,
  height: 936,
  parent: 'game',
  scene: [/*MainMenu, Intro, OptionsScene, MainHub, */ComputerLab, WebDesignScene, PythonScene, JavaScene, CprogScene, CPlusplusScene, CSharpScene],
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