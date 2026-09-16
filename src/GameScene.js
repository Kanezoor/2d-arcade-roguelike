import { createTextures } from "./textures.js";
import Player from "./entities/Player.js";
import { hitEnemy, createEnemies, updateEnemies } from "./managers/EnemyManager.js";
import RoomManager from "./managers/RoomManager.js";
import { createUI, drawUI, showGameOverScreen, showVictoryScreen } from "./ui.js";
import DamageSystem from "./combat/DamageSystem.js";
import DamageContext from "./combat/DamageContext.js";
import DamageType from "./combat/DamageType.js";
import LevelUpManager from "./managers/LevelUpManager.js";

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
    this.levelUpManager = new LevelUpManager(this);
    this.isLevelUpOpen = false;

    createUI(this);

    createEnemies(this);

    this.bosses = this.add.group();
    this.roomManager = new RoomManager(this);
    this.projectiles = this.add.group();
    this.particles = this.add.group();
    this.rewards = this.add.group();

    this.score = 0;

    this.isGameOver = false;

    this.matter.world.on(
      'collisionstart',
      (event) => {
        event.pairs.forEach(pair => {
          this.handleMatterCollision(pair);
        });
      }
    );

  
    this.matter.world.on(
      'collisionactive',
      (event) => {
        event.pairs.forEach(pair => {
          const objectA = pair.bodyA.gameObject;
          const objectB = pair.bodyB.gameObject;

          if (!objectA || !objectB) {
            return;
          }

          if (
            objectA === this.player.sprite &&
            objectB.enemy
          ) {
            this.handleEnemyContact(
              objectB,
              false
            );
          }

          if (
            objectB === this.player.sprite &&
            objectA.enemy
          ) {
            this.handleEnemyContact(
              objectA,
              false
            );
          }
        });
      }
    );

    this.roomManager.start();
  }

  handleMatterCollision(pair) {

    const objectA = pair.bodyA.gameObject;
    const objectB = pair.bodyB.gameObject;

    if (!objectA || !objectB) {
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.enemy
    ) {
      this.handleEnemyContact(objectB);
      return;
    }

    if (
      objectB === this.player.sprite &&
      objectA.enemy
    ) {
      this.handleEnemyContact(objectA);
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.projectile
    ) {
      this.handlePlayerProjectileContact(objectB);
      return;
    }

    if (
      objectB === this.player.sprite &&
      objectA.projectile
    ) {
      this.handlePlayerProjectileContact(objectA);
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.reward
    ) {
      this.handleRewardCollection(objectB);
      return;
    }

    if (
      objectB === this.player.sprite && 
      objectA.reward
    ) {
      this.handleRewardCollection(objectA);
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.isDoor
    ) {
      this.roomManager.enterDoor();
      return;
    }

    if (
      objectB === this.player.sprite &&
      objectA.isDoor
    ) {
      this.roomManager.enterDoor();
      return;
    }

    if (objectA.projectile && objectB.enemy) {
      this.handleProjectileEnemyHit(objectA, objectB);
      return;
    }

    if (objectB.projectile && objectA.enemy) {
      this.handleProjectileEnemyHit(objectB, objectA);
      return;
    }

    if (objectA.projectile && objectB.boss) {
      this.handleProjectileBossHit(objectA, objectB);
      return;
    }

    if (objectB.projectile && objectA.boss) {
      this.handleProjectileBossHit(objectB, objectA);
    }
  }

  handleEnemyContact(enemySprite, applyHitReaction = true) {

    const enemy = enemySprite.enemy;

    if (!enemy) {
      return;
    }

    const isCharging =
      enemy.behavior === 'charger' &&
      enemy.state === 'charge';

    if (
      isCharging &&
      enemy.hasHitPlayerThisCharge
    ) {
      return;
    }

    const hitReactionDistance = isCharging
      ? enemy.chargeHitReactionDistance
      : enemy.hitReactionDistance;

    const hitPushDuration = isCharging
      ? enemy.chargeHitPushDuration
      : enemy.hitPushDuration;

    const hitStunDuration = isCharging
      ? enemy.chargeHitStunDuration
      : enemy.hitStunDuration;

    const context = new DamageContext({
      source: enemySprite,
      target: this.player,
      baseDamage: enemy.damage,
      type: DamageType.PHYSICAL,
      hitX: enemySprite.x,
      hitY: enemySprite.y,
      hitReactionDistance:
        applyHitReaction
          ? hitReactionDistance
          : 0,
      hitPushDuration:
        applyHitReaction
          ? hitPushDuration
          : 0,
      hitStunDuration:
        applyHitReaction
          ? hitStunDuration
          : 0,
    });

    const playerDied =
      DamageSystem.apply(context);

    if (playerDied) {
      this.matter.world.pause();
      showGameOverScreen(this);
      return;
    }

    if (
      applyHitReaction &&
      isCharging
    ) {

      enemy.hasHitPlayerThisCharge = true;

      enemy.sprite.setVelocity(0, 0);

      enemy.state = 'chargeRecovery';
      enemy.chargeTimer = enemy.chargeRecovery;

      enemy.isVulnerable = true;
      enemy.sprite.setTint(0xffff00);
    }
  }

  handleProjectileEnemyHit(bullet, enemySprite) {

    if (bullet.team !== 'player') {
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

  handleProjectileBossHit(bullet, bossSprite) {

    if (bullet.team !== 'player') {
      return;
    }

    if (!bossSprite.active) {
      return;
    }

    const boss = bossSprite.boss;

    if (!boss || boss.isDead) {
      return;
    }

    const hitX = bullet.x;
    const hitY = bullet.y;
    const damage = bullet.damage;

    const context = new DamageContext({
      source: bullet,
      target: boss,
      baseDamage: damage,
      type: DamageType.PHYSICAL,
      hitX,
      hitY,
      knockbackStrength: 0,
    });

    DamageSystem.apply(context);

    this.time.delayedCall(0, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  }
  
  handlePlayerProjectileContact(bullet) {

  if (bullet.team !== 'enemy') {
    return;
  }

  const projectile = bullet.projectile;

    const context = new DamageContext({
      source: bullet,
      target: this.player,
      baseDamage: bullet.damage,
      type: DamageType.PHYSICAL,
      hitX: bullet.x,
      hitY: bullet.y,
      hitReactionDistance:
        projectile?.hitReactionDistance ?? 0,
      hitPushDuration:
        projectile?.hitPushDuration ?? 0,
      hitStunDuration:
        projectile?.hitStunDuration ?? 0,
    });

    bullet.destroy();

    const playerDied =
      DamageSystem.apply(context);

    if (playerDied) {
      this.matter.world.pause();
      showGameOverScreen(this);
    }
  }

  handleRewardCollection(rewardSprite) {

    console.log('Reward collected');

    const reward = rewardSprite.reward;

    if (!reward) {
      return;
    }

    reward.applyTo(this.player);

    console.log(
      'Piercing Core:',
      this.player.hasPassive('piercingCore')
    );

    rewardSprite.destroy();

    console.log(
      'Player health:',
      this.player.health,
      '/',
      this.player.maxHealth
    );
  }

  update() {
    if (this.isLevelUpOpen) {
      return;
    }

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