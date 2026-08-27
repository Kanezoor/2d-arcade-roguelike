import DamageSystem from "../combat/DamageSystem.js";
import { createParticles } from "../particles.js";
import Enemy from "../entities/Enemy.js";
import { takeDamage } from "../entities/Entity.js";

export function createEnemies(scene) {

  scene.enemies = scene.physics.add.group();
}

export function spawnEnemy(scene, enemyType = null) {
  if (scene.isGameOver) return;

  const room = scene.roomManager.currentRoomData;

  let rx, ry;
  let dist = 0;
  const safeRadius = 250;

  do {
    rx = Phaser.Math.Between(50, room.width - 50);
    ry = Phaser.Math.Between(50, room.height - 50);
    dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, rx, ry);
  } while (dist < safeRadius);

  // const isBrute = Math.random() < 0.3;
  // const key = isBrute ? 'purpleBrute' : 'blueEnemy';
  const isBrute = enemyType === 'brute';
  const isRanged = enemyType === 'ranged';
  // const key = isBrute ? 'purpleBrute' : 'blueEnemy';
  let key;

  if (isRanged) {
    key = 'rangedEnemy'
  } else if (isBrute) {
    key = 'purpleBrute'
  } else {
    key = 'blueEnemy'
  }

  const sprite = scene.enemies.create(rx, ry, key);
  let config;

  if(isRanged) {
    config = {
      health: 2,
      speed: 200,
      damage: 8,
      score: 25,
      color: 0xffa500,
      knockbackResistance: 0.2,
      preferredDistance: 250,
      state: 'kite',
      burstShots: 3,
      burstDelay: 150,
      burstCooldown: 1500,
      repositionTime: 500,
    };
  } else if (isBrute) {
    config = {
      health:6,
      speed:80,
      damage:20,
      score:30,
      color:0x800080,
      knockbackResistance:1
    }
  } else {
    config = {
      health:3,
      speed:200,
      damage:10,
      score:10,
      color:0x0000ff,
      knockbackResistance:0.35
    }
  }

  return new Enemy(sprite, config, scene);
}

export function updateEnemies(scene) {

  scene.enemies.getChildren().forEach(sprite => {

    const enemy = sprite.enemy;
    if (enemy.state === 'burst') {
      enemy.updateBurst();
      return;
    }

    if (enemy.state === 'reposition') {
      enemy.updateReposition();
      return;
    }

    if (enemy.state === 'kite') {
      const distance = Phaser.Math.Distance.Between(
        sprite.x,
        sprite.y,
        scene.player.sprite.x,
        scene.player.sprite.y
      );

      const angle = Phaser.Math.Angle.Between(
        sprite.x,
        sprite.y,
        scene.player.sprite.x,
        scene.player.sprite.y
      );

      if (distance > enemy.preferredDistance + 30) {
        sprite.body.setVelocity(
          Math.cos(angle) * enemy.speed,
          Math.sin(angle) * enemy.speed,
        );
      } else if (distance < enemy.preferredDistance - 30) {
        sprite.body.setVelocity(
          -Math.cos(angle) * enemy.speed,
          -Math.sin(angle) * enemy.speed,
        );
      } else {
        sprite.body.setVelocity(0, 0);

        if (
          scene.time.now - enemy.lastBurst >= enemy.burstCooldown
        ) {
          enemy.startBurst();
        }
      }
      return;
    }


    const angle = Phaser.Math.Angle.Between(
      sprite.x,
      sprite.y,
      scene.player.sprite.x,
      scene.player.sprite.y
    );

    sprite.body.setVelocity(
      Math.cos(angle) * enemy.speed +
      enemy.kbX,
      Math.sin(angle) * enemy.speed +
      enemy.kbY
    );

    enemy.kbX *= 0.85;
    enemy.kbY *= 0.85;

  });
}

export function hitEnemy(scene, bullet, sprite) {

  bullet.destroy();

  const enemy = sprite.enemy;
  enemy.health -= 1;

  createParticles(
    scene,
    bullet.x,
    bullet.y,
    0xffffff,
    5
  );

  const angle = Phaser.Math.Angle.Between(
    bullet.x,
    bullet.y,
    sprite.x,
    sprite.y
  );

  const knockbackStrength = 250;

  enemy.kbX +=
    Math.cos(angle) *
    knockbackStrength *
    enemy.knockbackResistance;

  enemy.kbY +=
    Math.sin(angle) *
    knockbackStrength *
    enemy.knockbackResistance;

  if (enemy.health <= 0) {

    createParticles(
      scene,
      sprite.x,
      sprite.y,
      enemy.color,
      20
    );

    sprite.destroy();

    scene.score += enemy.score;

    scene.scoreText.setText(
      'Score: ' + scene.score
    );
  }
}