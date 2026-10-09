export function drawUI(scene) {

  scene.uiGraphics.clear();

  
  const weaponPanelWidth = 190;
  const weaponPanelHeight = 85;
  const hudRightMargin = 35;
  const hudBottomMargin = 25;

  const weaponPanelX =
    scene.scale.width -
    hudRightMargin -
    weaponPanelWidth;

  const weaponPanelY =
    scene.scale.height -
    hudBottomMargin -
    weaponPanelHeight;
  
  const weaponTextX =
    weaponPanelX +
    weaponPanelWidth -
    12;

  scene.weaponNameText.setX(weaponTextX);
  scene.weaponAmmoText.setX(weaponTextX);
  scene.weaponReloadText.setX(weaponTextX);
  
  scene.uiGraphics.fillStyle(
    0xffffff,
    0.75
  );

  scene.uiGraphics.fillRect(
    weaponPanelX,
    weaponPanelY,
    weaponPanelWidth,
    weaponPanelHeight
  );

  scene.uiGraphics.lineStyle(
    2,
    0x555555,
    0.8
  );

  scene.uiGraphics.strokeRect(
    weaponPanelX,
    weaponPanelY,
    weaponPanelWidth,
    weaponPanelHeight
  );

  const weapon = scene.player.leftWeapon;

  if (weapon) {
    scene.weaponNameText.setText(
      weapon.name
    );

    if (
      weapon.currentAmmo === Infinity
    ) {
      scene.weaponAmmoText.setText(
        'READY'
      );
    } else {
      scene.weaponAmmoText.setText(
        `${weapon.currentAmmo} / ${weapon.stats.magazineSize}`
      );
    }

    if (weapon.isReloading) {
      scene.weaponReloadText.setText(
        'RELOADING...'
      );
    } else {
      scene.weaponReloadText.setText('');
    }
  }

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

  const hpPercentage = scene.player.health / scene.player.maxHealth;
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

  const weaponPanelWidth = 190;
  const weaponPanelHeight = 85;
  const hudRightMargin = 35;
  const hudBottomMargin = 25;

  const weaponPanelX =
    scene.scale.width -
    hudRightMargin -
    weaponPanelWidth;

  const weaponPanelY =
    scene.scale.height -
    hudBottomMargin -
    weaponPanelHeight;

  const weaponTextX =
    weaponPanelX +
    weaponPanelWidth -
    12;

  scene.weaponNameText = scene.add.text(
    weaponTextX,
    weaponPanelY + 22,
    '',
    {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      fill: '#000000',
      align: 'right'
    }
  ).setOrigin(1, 0.5);

  scene.weaponAmmoText = scene.add.text(
    weaponTextX,
    weaponPanelY + 50,
    '',
    {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      fill: '#000000',
      align: 'right'
    }
  ).setOrigin(1, 0.5);

  scene.weaponReloadText = scene.add.text(
    weaponTextX,
    weaponPanelY + 72,
    '',
    {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fill: '#555555',
      align: 'right'
    }
  ).setOrigin(1, 0.5);
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

export function showVictoryScreen(scene) {
  console.log('showVictory called');

  const overlay = scene.add.rectangle(400, 300, 800, 800, 0x000000, 0.7);

  scene.add.text(400, 220, 'Victory', {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      fill: '#ffffff'   
  }).setOrigin(0.5);

  scene.add.text(400, 280, 'Final Score: ' + scene.score, {
    fontFamily: 'sans-serif',
    fontSize: '24px',
    fill: '#ffffff'
  }).setOrigin(0.5);

  const restartText = scene.add.text(
    400,
    340,
    'Click anywhere to play again',
    {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      fill: '#ffa500'
    }
  ).setOrigin(0.5);

  scene.tweens.add({
    targets: restartText,
    alpha: 0.3,
    duration: 800,
    yoyo: true,
    lopp: -1,
  });

  scene.input.once('pointerdown', () => {
    scene.scene.restart();
  });
}