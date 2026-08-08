import { createTextures } from "./textures.js";
import Player from "./entities/Player.js";
import { spawnEnemy, hitEnemy, createEnemies, updateEnemies } from "./managers/EnemyManager.js";
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

    // createPlayer(this);
    this.player = new Player(this);

    createUI(this);

    createEnemies(this);


    this.projectiles = this.physics.add.group();

    

    this.particles = this.add.group();

    this.score = 0;

    this.isGameOver = false;

    this.time.addEvent({
      delay: 1500,
      callback: () => spawnEnemy(this),
      loop: true
    });

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
  }

  update() {
    this.player.update();
    updateEnemies(this);

    drawUI(this);
  }
}