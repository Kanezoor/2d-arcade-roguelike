import { createTextures } from "./textures.js";
import { createPlayer, updatePlayer, damagePlayer } from "./player.js";
import { spawnEnemy, hitEnemy, createEnemies, updateEnemies } from "./enemy.js";
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

    createPlayer(this);

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
      this.player,
      this.enemies,
      (player, enemy) => {
        const died = damagePlayer(this, player, enemy);
        if (died) {
          this.physics.pause();
          showGameOverScreen(this);
        }
      
      }
    );
  }

  update() {
    updatePlayer(this);
    updateEnemies(this);

    drawUI(this);
  }
}