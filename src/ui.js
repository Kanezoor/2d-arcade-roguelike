export function drawUI(scene) {

  scene.uiGraphics.clear();

  const barX = 20;
  const barY = 55;
  const barWidth = 200;
  const barHeigth = 20;

  scene.uiGraphics.fillStyle(0x323232, 0.5);
  scene.uiGraphics.fillRect(barX, barY, barWidth, barHeigth);

  if (scene.time.now - scene.lastDamageTime < scene.damageCooldown) {
    scene.uiGraphics.fillStyle(0xffff00, 1);
  } else {
    scene.uiGraphics.fillStyle(0xff0000, 1);;
  }

  const hpPercentage = scene.playerHealth / scene.playerMaxHealth;
  scene.uiGraphics.fillRect(barX, barY, barWidth * hpPercentage, barHeigth);

  scene.uiGraphics.lineStyle(2, 0xffa500, 1);
  scene.uiGraphics.strokeRect(barX, barY, barWidth, barHeigth);

  scene.enemies.getChildren().forEach(currEnemy => {
    if (currEnemy.health < currEnemy.maxHealth) {
      const enemyHpY = currEnemy.y - (currEnemy.height / 2) - 8;
      const hpBarWidth = currEnemy.width;
      const hpBarHeight = 4;

      scene.uiGraphics.fillStyle(0xff0000, 1);
      scene.uiGraphics.fillRect(currEnemy.x - currEnemy.width / 2, enemyHpY, hpBarWidth, hpBarHeight);

      scene.uiGraphics.fillStyle(0x00ff00, 1);
      const percent = currEnemy.health / currEnemy.maxHealth;
      scene.uiGraphics.fillRect(currEnemy.x - currEnemy.width / 2, enemyHpY, hpBarWidth * percent, hpBarHeight);
    }
  });
}

export function createUI(scene) {

  scene.scoreText = scene.add.text(
    20,
    20,
    "Score: 0",
    {
      fontFamily: "sans-serif",
      fontSize: "24px",
      fill: "#ffa500"
    }
  );

  scene.uiGraphics = scene.add.graphics();

}

export function showGameOverScreen(scene) {
  console.log("showGameOver called");
  const overlay = scene.add.rectangle(400, 300, 800, 800, 0x000000, 0.7);

  scene.add.text(400, 220, 'Game Over', {
    fontFamily: 'sans-serif',
    fontSize: '48px',
    fill: '#ffffff'
  }).setOrigin(0.5);

  scene.add.text(400, 280, 'Final Score: ' + scene.score, {
    fontFamily: 'sans-serif',
    fontSize: '24px',
    fill: '#ffffff'
  }).setOrigin(0.5);

  const restartText = scene.add.text(400, 340, 'Click anywhere to restart', {
    fontFamily: 'sans-serif',
    fontSize: '20px',
    fill: '#ffa500',
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: restartText,
    alpha: 0.3,
    duration: 800,
    yoyo: true,
    loop: -1,
  });

  scene.input.once('pointerdown', () => {
    scene.scene.restart();
  });
}