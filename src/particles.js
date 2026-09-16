export function createParticles(scene, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const p = scene.add.rectangle(x, y, 4, 4, color);

    const targetX = x + Phaser.Math.FloatBetween(-75, 75);
    const targetY = y + Phaser.Math.FloatBetween(-75, 75);

    scene.tweens.add({
      targets: p,
      x: targetX,
      y: targetY,
      alpha: 0,
      duration: 500,
      onComplete: () => p.destroy(),
    });

    scene.tweens.add({
      targets: p,
      alpha: 0,
      duration: 500,
      onComplete: () => p.destroy()
    });
  }
}