import { createTextures } from "./textures.js";
import Player from "./entities/Player.js";
import { hitEnemy, createEnemies, updateEnemies } from "./managers/EnemyManager.js";
import Boss from "./entities/Boss.js";
import RoomManager from "./managers/RoomManager.js";
import { createUI, drawUI, showGameOverScreen, showVictoryScreen } from "./ui.js";
import Beam from "./entities/Beam.js";

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

    this.testBeam = new Beam(
      this,
      this.player,
      1,
      500
    );

    this.testBeam.start();

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (bullet, enemySprite) => {
        if(bullet.team !== 'player') {
          return;
        }

        const projectile = bullet.projectile;

        if (!projectile) {
          return;
        }

        if (!projectile.registerHit(enemySprite)) {
          return;
        }

        hitEnemy(this, bullet, enemySprite);

        if (projectile.remainingHits <= 0) {
          bullet.destroy();
        }
      }
    );

    this.physics.add.overlap(
      this.player.sprite,
      this.enemies,
      (playerSprite, enemySprite) => {

        const enemy = enemySprite.enemy;

        if (
          enemy.behavior === 'charger' &&
          enemy.state === 'charge'
        ) {

          if (enemy.hasHitPlayerThisCharge) {
            return;
          }

          enemy.hasHitPlayerThisCharge = true;

          if (this.player.takeDamage(enemySprite)) {
            this.physics.pause();
            showGameOverScreen(this);
            return;
          }

          enemy.sprite.body.setVelocity(0, 0);

          enemy.state = 'chargeRecovery';
          enemy.chargeTimer = enemy.chargeRecovery;

          return;
        }

        if (this.player.takeDamage(enemySprite)) {
          this.physics.pause();
          showGameOverScreen(this);
        }
      }
    );

    this.physics.add.overlap(
      this.projectiles,
      this.bosses,
      (bullet, bossSprite) => {

        if (bullet.team !== 'player') {
          return;
        }

        bullet.destroy();

        const boss = bossSprite.boss;
        boss.takeDamage(bullet.damage);
      }
    );

    this.physics.add.overlap(
      this.player.sprite,
      this.projectiles,
      (playerSprite, bullet) => {

        if (bullet.team !== 'enemy') {
          return;
        }

        bullet.destroy();

        if (this.player.takeDamage(bullet)) {
          this.physics.pause();
          showGameOverScreen(this);
        }
      }
    );

    this.physics.add.overlap(
      this.player.sprite,
      this.rewards,
      (playerSprite, rewardSprite) => {
        console.log('Reward collected');

        const reward = rewardSprite.reward;
        reward.applyTo(this.player);
        console.log('Piercing Core: ', this.player.hasPassive('piercingCore'));
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

    this.projectiles.getChildren().forEach(bullet => {
      if (bullet.projectile) {
        bullet.projectile.update();
      }
    });

  }
}