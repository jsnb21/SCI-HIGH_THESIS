import Phaser from 'phaser';
import VNScene from '/src/scenes/vnScenes.js';
import MainMenu from './scenes/mainmenu';

const config = {
  type: Phaser.AUTO,
  width: 816,
  height: 624,
  parent: 'game',
  scene: [MainMenu, VNScene]
};

export const DEFAULT_TEXT_STYLE = {
    fontSize: '32px',
    fontFamily: 'Jersey15-Regular, Arial, sans-serif', // Must match CSS
    color: '#ffffff',
    stroke: '#000000',        // Solid black outline
    strokeThickness: 10
};

new Phaser.Game(config);