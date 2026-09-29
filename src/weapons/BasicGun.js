import Weapon from "./Weapon.js"
import basicGun from "./definitions/basicGun.js";
import Projectile from "../entities/Projectile.js";

export default class BasicGun extends Weapon {
  constructor(owner) {
    super(owner);
    this.loadDefinition(basicGun);
  }

  shoot(pointer) {
    if (!this.canShoot()) return;

    const baseAngle = Phaser.Math.Angle.Between(
      this.owner.sprite.x,
      this.owner.sprite.y,
      pointer.x,
      pointer.y
    );

    const angle = this.getProjectileAngle(baseAngle);

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

    this.nextFire = this.scene.time.now + this.stats.fireRate;
  }

}