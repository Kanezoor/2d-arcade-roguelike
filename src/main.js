import {GameScene} from "./GameScene.js"

const config = {
  type: Phaser.CANVAS,
  width: 800,
  height: 800,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    }
  },
  scene: GameScene
};

new Phaser.Game(config);