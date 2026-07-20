import { createParticles } from "./particles.js";

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

  const enemy = scene.enemies.create(rx, ry, key);

  enemy.health = isBrute ? 6 : 3;
  enemy.maxHealth = isBrute ? 6 : 3;
  enemy.speedValue = isBrute ? 80 : 200;
  enemy.colorValue = isBrute ? 0x800080 : 0x0000ff;
  enemy.scoreValue = isBrute ? 30 : 10;
  enemy.damageValue = isBrute ? 20 : 10;
  enemy.nockbackResistance = isBrute ? 1 : 0.35;

  enemy.kbX = 0;
  enemy.kbY = 0;
}

export function updateEnemies(scene) {

  scene.enemies.getChildren().forEach(enemy => {

    const angle = Phaser.Math.Angle.Between(
      enemy.x,
      enemy.y,
      scene.player.sprite.x,
      scene.player.sprite.y
    );

    enemy.body.setVelocity(
      Math.cos(angle) * enemy.speedValue + enemy.kbX,
      Math.sin(angle) * enemy.speedValue + enemy.kbY
    );

    enemy.kbX *= 0.85;
    enemy.kbY *= 0.85;

  });
}

export function hitEnemy(scene, bullet, enemy) {
  bullet.destroy();
  enemy.health -= 1;

  createParticles(scene, bullet.x, bullet.y, 0xffffff, 5);

  const angle = Phaser.Math.Angle.Between(
    bullet.x,
    bullet.y,
    enemy.x,
    enemy.y
  );

  const knockbackStrength = 250;

  enemy.kbX += Math.cos(angle) * knockbackStrength * enemy.nockbackResistance;
  enemy.kbY += Math.sin(angle) * knockbackStrength * enemy.nockbackResistance;

  if (enemy.health <= 0) {
    createParticles(scene, enemy.x, enemy.y, enemy.colorValue, 20);
    enemy.destroy();

    scene.score += enemy.scoreValue;
    scene.scoreText.setText('Score: ' + scene.score);
  }
}