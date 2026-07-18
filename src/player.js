import { showGameOverScreen } from "./ui.js";

export function createPlayer(scene) {
  scene.player = scene.physics.add.sprite(400, 300, "playerSquare");
  scene.player.body.setCollideWorldBounds(true);

  scene.playerHealth = 100;
  scene.playerMaxHealth = 100;

  scene.playerSpeed = 300;

  scene.lastDamageTime = 0;
  scene.damageCooldown = 500;

  scene.fireRate = 100;
  scene.nextFire = 0;

  scene.cursors = scene.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
}

export function updatePlayer(scene) {

  if (scene.isGameOver) return;

  scene.player.body.setVelocity(0);

  if (scene.cursors.left.isDown) {
    scene.player.body.setVelocityX(-scene.playerSpeed);
  } else if (scene.cursors.right.isDown) {
    scene.player.body.setVelocityX(scene.playerSpeed);
  }

  if (scene.cursors.up.isDown) {
    scene.player.body.setVelocityY(-scene.playerSpeed);
  } else if (scene.cursors.down.isDown) {
    scene.player.body.setVelocityY(scene.playerSpeed);
  }

  const pointer = scene.input.activePointer;

  if (pointer.isDown && scene.time.now > scene.nextFire) {

    const angle = Phaser.Math.Angle.Between(
      scene.player.x,
      scene.player.y,
      pointer.x,
      pointer.y
    );

    const bullet = scene.projectiles.create(
      scene.player.x,
      scene.player.y,
      "bullet"
    );

    const bulletSpeed = 600;

    bullet.body.setVelocity(
      Math.cos(angle) * bulletSpeed,
      Math.sin(angle) * bulletSpeed
    );

    scene.nextFire = scene.time.now + scene.fireRate;
  }
}

export function damagePlayer(scene, player, enemy) {

  if (scene.time.now - scene.lastDamageTime < scene.damageCooldown) {
    return;
  }

  scene.lastDamageTime = scene.time.now;

  scene.playerHealth -= enemy.damageValue;

  const angle = Phaser.Math.Angle.Between(
    enemy.x,
    enemy.y,
    player.x,
    player.y
  );

  player.body.setVelocity(
    Math.cos(angle) * 400,
    Math.sin(angle) * 400
  );

  const enemyKnockback = 3000;
    
  enemy.kbX += -Math.cos(angle) * enemyKnockback;
  enemy.kbY += -Math.sin(angle) * enemyKnockback;

  if (scene.playerHealth <= 0) {
    scene.playerHealth = 0;
    scene.isGameOver = true;

    player.setTint(0xff0000);

    scene.physics.pause();
    return true;
    // showGameOverScreen(scene);
  }

  return false;
}

