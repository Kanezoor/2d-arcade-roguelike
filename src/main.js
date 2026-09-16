import {GameScene} from "./GameScene.js"

const config = {
  type: Phaser.CANVAS,
  width: 800,
  height: 800,
  physics: {
    default: 'matter',
    matter: {
      gravity: {
        y: 0
      },
      debug: {
        showBody: true,
        showStaticBody: true,
      }
    }
  },
  scene: GameScene
};

new Phaser.Game(config);