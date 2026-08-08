import { createTextures } from "./textures.js";
import Player from "./entities/Player.js";
import { hitEnemy, createEnemies, updateEnemies } from "./managers/EnemyManager.js";
import RoomManager from "./managers/RoomManager.js";
import { createUI, drawUI, showGameOverScreen } from "./ui.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {

  }

  create() {
    this.cameras.main.setBackgroundColor("#ffffff");

    createTextures(this);

    this.player = new Player(this);

    createUI(this);

    createEnemies(this);
    this.roomManager = new RoomManager(this);
    this.projectiles = this.physics.add.group();
    this.particles = this.add.group();

    this.score = 0;

    this.isGameOver = false;

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (bullet, enemy) => hitEnemy(this, bullet, enemy)
    );

    this.physics.add.overlap(
      this.player.sprite,
      this.enemies,
      (playerSprite, enemy) => {
        if (this.player.takeDamge(enemy)) {
          this.physics.pause();
          showGameOverScreen(this);
        }
      }
    );
    this.roomManager.start();
  }

  update() {
    this.player.update();
    updateEnemies(this);

    this.roomManager.update();

    drawUI(this);
  }
}