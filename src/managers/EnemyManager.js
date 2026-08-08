import DamageSystem from "../combat/DamageSystem.js";
import { createParticles } from "../particles.js";
import Enemy from "../entities/Enemy.js";
import { takeDamage } from "../entities/Entity.js";

export function createEnemies(scene) {

  scene.enemies = scene.physics.add.group();

}

export function spawnEnemy(scene) {
  if (scene.isGameOver) return;

  let rx, ry;
  let dist = 0;
  const safeRadius = 400;

  do {
    rx = Phaser.Math.Between(50, 750);
    ry = Phaser.Math.Between(50, 750);
    dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, rx, ry);
  } while (dist < safeRadius);

  const isBrute = Math.random() < 0.3;
  const key = isBrute ? 'purpleBrute' : 'blueEnemy';
  // const sprite = scene.enemies.create(rx, ry, key);
  // const enemy = new Enemy(sprite);
  // sprite.enemy = enemy;
  const sprite = scene.enemies.create(rx, ry, key);

  const config = isBrute
    ? {
        health:6,
        speed:80,
        damage:20,
        score:30,
        color:0x800080,
        knockbackResistance:1
    }
    : {
        health:3,
        speed:200,
        damage:10,
        score:10,
        color:0x0000ff,
        knockbackResistance:0.35
    };

  new Enemy(sprite, config);



  // const enemy = scene.enemies.create(rx, ry, key);

  // enemy.health = isBrute ? 6 : 3;
  // enemy.maxHealth = isBrute ? 6 : 3;
  // enemy.speedValue = isBrute ? 80 : 200;
  // enemy.colorValue = isBrute ? 0x800080 : 0x0000ff;
  // enemy.scoreValue = isBrute ? 30 : 10;
  // enemy.damageValue = isBrute ? 20 : 10;
  // enemy.nockbackResistance = isBrute ? 1 : 0.35;

  // enemy.kbX = 0;
  // enemy.kbY = 0;
}

export function updateEnemies(scene) {

  scene.enemies.getChildren().forEach(sprite => {

    const enemy = sprite.enemy;

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

// function takeDamage(context) {
//   this.health -= context.baseDamage;

//   if (this.health <= 0) {
//     this.die();
//   }
// }