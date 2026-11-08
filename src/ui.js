export function layoutUI(hudScene) {
  if (!hudScene?.scoreText || !hudScene?.weaponNameText) {
    return;
  }

  const width = hudScene.scale.width;
  const height = hudScene.scale.height;
  const panelWidth = 190;
  const panelHeight = 85;
  const rightMargin = 35;
  const bottomMargin = 25;
  const panelX = Math.max(12, width - rightMargin - panelWidth);
  const panelY = Math.max(12, height - bottomMargin - panelHeight);
  const textX = Math.min(width - 12, panelX + panelWidth - 12);

  hudScene.weaponPanelBounds = {
    x: panelX,
    y: panelY,
    width: Math.min(panelWidth, Math.max(0, width - panelX - 8)),
    height: Math.min(panelHeight, Math.max(0, height - panelY - 8)),
  };

  hudScene.weaponNameText.setPosition(textX, panelY + 22);
  hudScene.weaponAmmoText.setPosition(textX, panelY + 50);
  hudScene.weaponReloadText.setPosition(textX, panelY + 72);
  hudScene.scoreText.setPosition(20, 20);
}

export function drawUI(gameScene, hudScene) {
  if (!gameScene || !hudScene?.uiGraphics || !gameScene.player) {
    return;
  }

  const graphics = hudScene.uiGraphics;
  graphics.clear();

  const panel = hudScene.weaponPanelBounds;
  if (panel) {
    graphics.fillStyle(0xffffff, 0.75);
    graphics.fillRect(panel.x, panel.y, panel.width, panel.height);
    graphics.lineStyle(2, 0x555555, 0.8);
    graphics.strokeRect(panel.x, panel.y, panel.width, panel.height);
  }

  const weapon = gameScene.player.activeWeapon;
  if (weapon) {
    hudScene.weaponNameText.setText(weapon.name);
    hudScene.weaponAmmoText.setText(
      weapon.currentAmmo === Infinity
        ? "READY"
        : `${weapon.currentAmmo} / ${weapon.stats.magazineSize}`
    );
    hudScene.weaponReloadText.setText(weapon.isReloading ? "RELOADING..." : "");
  } else {
    hudScene.weaponNameText.setText("No weapon");
    hudScene.weaponAmmoText.setText("");
    hudScene.weaponReloadText.setText("");
  }

  const barX = 20;
  const barY = 55;
  const barWidth = Math.min(200, Math.max(80, hudScene.scale.width - 40));
  const barHeight = 20;
  const hpPercentage = Phaser.Math.Clamp(
    gameScene.player.health / Math.max(1, gameScene.player.maxHealth),
    0,
    1
  );

  graphics.fillStyle(0x323232, 0.5);
  graphics.fillRect(barX, barY, barWidth, barHeight);
  graphics.fillStyle(
    gameScene.time.now - gameScene.player.lastDamageTime < gameScene.player.damageCooldown
      ? 0xffff00
      : 0xff0000,
    1
  );
  graphics.fillRect(barX, barY, barWidth * hpPercentage, barHeight);
  graphics.lineStyle(2, 0xffa500, 1);
  graphics.strokeRect(barX, barY, barWidth, barHeight);

  if (hudScene.scoreText) {
    hudScene.scoreText.setText(`Score: ${gameScene.score ?? 0}`);
  }

  // Enemy health bars belong to world space and must follow the gameplay camera.
  const enemyGraphics = gameScene.enemyHpGraphics;
  if (enemyGraphics) {
    enemyGraphics.clear();
    gameScene.enemies?.getChildren().forEach(enemy => {
      if (!enemy.active || enemy.health >= enemy.maxHealth) return;
      const enemyY = enemy.y - enemy.height / 2 - 8;
      const enemyWidth = enemy.width;
      const percent = Phaser.Math.Clamp(enemy.health / Math.max(1, enemy.maxHealth), 0, 1);
      enemyGraphics.fillStyle(0xff0000, 1);
      enemyGraphics.fillRect(enemy.x - enemyWidth / 2, enemyY, enemyWidth, 4);
      enemyGraphics.fillStyle(0x00ff00, 1);
      enemyGraphics.fillRect(enemy.x - enemyWidth / 2, enemyY, enemyWidth * percent, 4);
    });
  }
}

export function createUI(hudScene) {
  hudScene.scoreText = hudScene.add.text(20, 20, "Score: 0", {
    fontFamily: "sans-serif",
    fontSize: "24px",
    color: "#ffa500",
  }).setScrollFactor(0).setDepth(100);

  hudScene.uiGraphics = hudScene.add.graphics()
    .setScrollFactor(0)
    .setDepth(99);

  hudScene.weaponNameText = hudScene.add.text(0, 0, "", {
    fontFamily: "sans-serif",
    fontSize: "20px",
    color: "#000000",
    align: "right",
  }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);

  hudScene.weaponAmmoText = hudScene.add.text(0, 0, "", {
    fontFamily: "sans-serif",
    fontSize: "18px",
    color: "#000000",
    align: "right",
  }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);

  hudScene.weaponReloadText = hudScene.add.text(0, 0, "", {
    fontFamily: "sans-serif",
    fontSize: "14px",
    color: "#555555",
    align: "right",
  }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);

  layoutUI(hudScene);
}

function getScreenScene(gameScene) {
  return gameScene.hudScene ?? gameScene;
}

function layoutEndScreen(gameScene) {
  const screen = getScreenScene(gameScene);
  const objects = gameScene.endScreenObjects;
  if (!objects) return;

  const width = screen.scale.width;
  const height = screen.scale.height;
  const centerX = width / 2;
  const centerY = height / 2;

  objects.overlay.setPosition(centerX, centerY).setSize(width, height);
  objects.title.setPosition(centerX, centerY - 80);
  objects.score.setPosition(centerX, centerY - 20);
  objects.restart.setPosition(centerX, centerY + 45);
}

export function refreshEndScreenLayout(gameScene) {
  layoutEndScreen(gameScene);
}

function showEndScreen(gameScene, titleText, restartText) {
  if (gameScene.endScreenObjects) return;

  const screen = getScreenScene(gameScene);
  const width = screen.scale.width;
  const height = screen.scale.height;
  const centerX = width / 2;
  const centerY = height / 2;

  const overlay = screen.add.rectangle(centerX, centerY, width, height, 0x000000, 0.7)
    .setScrollFactor(0)
    .setDepth(5000);

  const title = screen.add.text(centerX, centerY - 80, titleText, {
    fontFamily: "sans-serif",
    fontSize: "48px",
    color: "#ffffff",
    align: "center",
  }).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

  const score = screen.add.text(centerX, centerY - 20, `Final Score: ${gameScene.score}`, {
    fontFamily: "sans-serif",
    fontSize: "24px",
    color: "#ffffff",
    align: "center",
  }).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

  const restart = screen.add.text(centerX, centerY + 45, restartText, {
    fontFamily: "sans-serif",
    fontSize: "20px",
    color: "#ffa500",
    align: "center",
  }).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

  gameScene.endScreenObjects = { overlay, title, score, restart };

  screen.tweens.add({
    targets: restart,
    alpha: 0.3,
    duration: 800,
    yoyo: true,
    loop: -1,
  });

  screen.input.once("pointerdown", () => {
    gameScene.scene.restart();
  });
}

export function showGameOverScreen(scene) {
  showEndScreen(scene, "Game Over", "Click anywhere to restart");
}

export function showVictoryScreen(scene) {
  showEndScreen(scene, "Victory", "Click anywhere to play again");
}
