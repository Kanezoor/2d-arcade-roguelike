import { createTextures } from "./textures.js";
import Player from "./entities/Player.js";
import { hitEnemy, createEnemies, updateEnemies } from "./managers/EnemyManager.js";
import Boss from "./entities/Boss.js";
import RoomManager from "./managers/RoomManager.js";
import { createUI, drawUI, showGameOverScreen, showVictoryScreen } from "./ui.js";

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
    this.bosses = this.physics.add.group();
    this.roomManager = new RoomManager(this);
    this.projectiles = this.physics.add.group();
    this.particles = this.add.group();
    this.rewards = this.add.group();

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
        if (this.player.takeDamage(enemy)) {
          this.physics.pause();
          showGameOverScreen(this);
        }
      }
    );

    this.physics.add.overlap(
      this.projectiles,
      this.bosses,
      (bullet, bossSprite) => {
        if (bullet.isBossProjectile) return;

        bullet.destroy();
        const boss = bossSprite.boss;

        boss.takeDamage(bullet.damage);
      }
    );

    this.physics.add.overlap(
      this.player.sprite,
      this.projectiles,
      (playerSprite, bullet) => {
        if (!bullet.isBossProjectile) return;
        console.log("BOSS BULLET HIT PLAYER");
        bullet.destroy();
        this.player.takeDamage(bullet);
      }
    );

    this.physics.add.overlap(
      this.player.sprite,
      this.rewards,
      (playerSprite, rewardSprite) => {
        console.log('Reward collected');

        const reward = rewardSprite.reward;
        reward.applyTo(this.player);
        rewardSprite.destroy();

        console.log(
          'Player health: ',
          this.player.health,
          '/',
          this.player.maxHealth
        );
      }
    );

    this.roomManager.start();
  }

  update() {
    this.player.update();
    updateEnemies(this);

    this.roomManager.update();
    if (this.roomManager.boss) {
      this.roomManager.boss.update(this.game.loop.delta);
    }

    drawUI(this);

    if (this.roomManager && this.roomManager.isRunComplete && !this.isVictory) {
      this.isVictory = true;
      console.log('GAME COMPLETE!');
      showVictoryScreen(this); 
    }
  }
}