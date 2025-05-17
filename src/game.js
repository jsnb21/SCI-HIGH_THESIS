import Phaser from 'phaser';
import Intro from '/src/scenes/intro.js';
import MainMenu from './scenes/mainmenu';
import OptionsScene from './scenes/options.js';
import MainHub from './scenes/mainhub.js';
import ComputerLab from './scenes/computerlab.js';

const config = {
  type: Phaser.AUTO,
  width: 816,
  height: 624,
  parent: 'game',
  scene: [MainMenu, Intro, OptionsScene, MainHub, ComputerLab]
};

export const DEFAULT_TEXT_STYLE = {
    fontSize: '32px',
    fontFamily: 'Jersey15-Regular, Arial, sans-serif', // Must match CSS
    color: '#ffffff',
    stroke: '#000000',        // Solid black outline
    strokeThickness: 10
};

new Phaser.Game(config);