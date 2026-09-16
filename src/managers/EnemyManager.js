import Enemy from "../entities/Enemy.js";
import DamageSystem from "../combat/DamageSystem.js";
import DamageContext from "../combat/DamageContext.js";
import DamageType from "../combat/DamageType.js";


export function createEnemies(scene) {

  scene.enemies = scene.add.group();
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
    dist = Phaser.Math.Distance.Between(scene.player.sprite.x, scene.player.sprite.y, rx, ry);
  } while (dist < safeRadius);

  const isBrute = enemyType === 'brute';
  const isRanged = enemyType === 'ranged';
  const isCharger = enemyType === 'charger';

  let key;

  if (isRanged) {
    key = 'rangedEnemy'
  } else if (isCharger) {
    key = 'chargerEnemy'
  } else if (isBrute) {
    key = 'purpleBrute'
  } else {
    key = 'blueEnemy'
  }

  const sprite = scene.matter.add.sprite(
    rx, 
    ry, 
    key,
    undefined,
    {
      ignoreGravity: true,
      frictionAir: 0,
      density: 0.01,
    }
  );

  sprite.setFixedRotation();
  scene.enemies.add(sprite);

  let config;

  if(isRanged) {
    config = {
      health: 2,
      speed: 4,
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
      xp: 30,
      hitReactionDistance: 10,
      hitPushDuration: 50,
      hitStunDuration: 80,
    };
  } else if (isCharger) {
    config = {
      health: 15,
      speed: 2.5,
      damage: 10,
      score: 30,
      color: 0xff8800,
      behavior: 'charger',
      chargeTriggerDistance: 300,
      chargeTelegraphTime: 600,
      chargeCooldown: 1800,
      chargeSpeed: 7,
      chargeDuration: 500,
      chargeRecovery: 600,
      chargeKnockback: 3000,
      xp: 40,
      hitReactionDistance: 25,
      hitPushDuration: 80,
      hitStunDuration: 120,
      chargeHitReactionDistance: 30,
      chargeHitPushDuration: 120,
      chargeHitStunDuration: 300,
    }
  }
  else if (isBrute) {
    config = {
      health:6,
      speed:1.5,
      damage:20,
      score:30,
      color:0x800080,
      knockbackResistance:1,
      xp: 35,
      hitReactionDistance: 35,
      hitStunDuration: 160,
    }
  } else {
    config = {
      health:3,
      speed:4,
      damage:10,
      score:10,
      color:0x0000ff,
      knockbackResistance:0.35,
      xp: 20,
      hitReactionDistance: 20,
      hitStunDuration: 120,
    }
  }

  return new Enemy(sprite, config, scene);
}

export function updateEnemies(scene) {

  scene.enemies.getChildren().forEach(sprite => {

    const enemy = sprite.enemy;

    if (enemy.behavior === 'charger') {
      enemy.updateCharger();
      return;
    }
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
        sprite.setVelocity(
          Math.cos(angle) * enemy.speed,
          Math.sin(angle) * enemy.speed,
        );
      } else if (distance < enemy.preferredDistance - 30) {
        sprite.setVelocity(
          -Math.cos(angle) * enemy.speed,
          -Math.sin(angle) * enemy.speed,
        );
      } else {
        sprite.setVelocity(0, 0);

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

    sprite.setVelocity(
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

  const enemy = sprite.enemy;

  const context = new DamageContext({
    source: bullet,
    target: enemy,
    baseDamage: bullet.damage,
    type: DamageType.PHYSICAL,
    hitX: bullet.x,
    hitY: bullet.y,
    knockBackStrength: 2.5,
  });

  DamageSystem.apply(context);
}