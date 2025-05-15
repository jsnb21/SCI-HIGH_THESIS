import Phaser from 'phaser';
import VNScene from '/src/scenes/vnScenes.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  scene: [VNScene]
};

new Phaser.Game(config);