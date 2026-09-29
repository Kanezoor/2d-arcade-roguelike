import Weapon from "./Weapon.js";
import shotgun from "./definitions/shotgun.js";
import Projectile from "../entities/Projectile.js";

export default class Shotgun extends Weapon {
  constructor(owner) {
    super(owner);
    this.loadDefinition(shotgun);
  }

  shoot(pointer) {
    if (!this.canShoot()) {
      return;
    }

    const baseAngle = Phaser.Math.Angle.Between(
      this.owner.sprite.x,
      this.owner.sprite.y,
      pointer.x,
      pointer.y,
    );

    const spread = Phaser.Math.DegToRad(
      this.stats.spreadAngle
    );

    const halfCount = (this.stats.pelletCount - 1) / 2;

    for (let i = 0; i < this.stats.pelletCount; i++) {
      let normalizedPosition = halfCount === 0
        ? 0
        : (i - halfCount) / halfCount;

      const jitter = Phaser.Math.FloatBetween(
        -this.stats.patternJitter,
        this.stats.patternJitter
      );

      normalizedPosition += jitter;

      normalizedPosition = Phaser.Math.Clamp(
        normalizedPosition,
        -1,
        1,
      );

      const offset = normalizedPosition * spread / 2;

      const angle = this.getProjectileAngle(
        baseAngle,
        offset,
      );
      

      new Projectile(
        this.scene,
        this.owner.sprite.x,
        this.owner.sprite.y,
        'bullet',
        this.stats.damage,
        this.stats.projectileSpeed,
        angle,
        this.owner,
        'player',
        0,
        0,
        0,
        this.stats.penetrationSpeedRetention,
      );
    }

    this.nextFire = this.scene.time.now + this.stats.fireRate;
  }
}