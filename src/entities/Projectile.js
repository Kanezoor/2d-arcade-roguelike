export default class Projectile {
  constructor(scene, x, y, texture, damage, speed, angle, owner) {
    this.scene = scene;
    this.owner = owner;
    this.sprite = scene.projectiles.create(
      x, y, texture
    );

    this.damage = damage;
    this.speed = speed;
    this.isMagnetic = owner.hasMagneticCore === true;

    this.sprite.damage = this.damage;
    this.sprite.isMagnetic = this.isMagnetic;

    this.sprite.body.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );

    this.sprite.projectile = this;
  }

  update() {
    if (!this.isMagnetic || !this.sprite.active) {
      return;
    }

    let closestTarget = null;
    let closestDistance = 100;

    const targets = [
      ...this.scene.enemies.getChildren(),
      ...this.scene.bosses.getChildren()
    ];

    const currentAngle = Math.atan2(
      this.sprite.body.velocity.y,
      this.sprite.body.velocity.x
    );

    for (const target of targets) {
      if (!target.active) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        target.x,
        target.y
      );

      if (distance >= closestDistance) {
        continue;
      }

      const targetAngle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        target.x,
        target.y
      );

      const angleDifference = Math.abs(
        Phaser.Math.Angle.Wrap(targetAngle - currentAngle)
      );

      if (angleDifference > Phaser.Math.DegToRad(80)) {
        continue;
      }

      closestDistance = distance;
      closestTarget = target;
    }

    if (!closestTarget) return;

    const targetAngle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      closestTarget.x,
      closestTarget.y
    );

    const newAngle = Phaser.Math.Angle.RotateTo(
      currentAngle,
      targetAngle,
      0.015
    );

    const speed = this.sprite.body.velocity.length();

    this.sprite.body.setVelocity(
      Math.cos(newAngle) * speed,
      Math.sin(newAngle) * speed,
    );
  }
}