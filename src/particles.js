export function createParticles(scene, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const p = scene.add.rectangle(x, y, 4, 4, color);
    scene.physics.add.existing(p);

    p.body.setVelocity(
      Phaser.Math.FloatBetween(-150,150),
      Phaser.Math.FloatBetween(-150,150)
    );

    scene.tweens.add({
      targets: p,
      alpha: 0,
      duration: 500,
      onComplete: () => p.destroy()
    });

  }
}