import Weapon from "./Weapon.js"
import basicGun from "./definitions/basicGun.js";

export default class BasicGun extends Weapon {
  constructor(owner) {
    super(owner);
    this.loadDefinition(basicGun);
  }

  shoot(pointer) {
    if (!this.canShoot()) return;

    const angle = Phaser.Math.Angle.Between(
      this.owner.sprite.x,
      this.owner.sprite.y,
      pointer.x,
      pointer.y
    );

    const bullet = this.scene.projectiles.create(
      this.owner.sprite.x,
      this.owner.sprite.y,
      'bullet'
    );

    bullet.damage = this.stats.damage;

    bullet.body.setVelocity(
      Math.cos(angle) * this.stats.projectileSpeed,
      Math.sin(angle) * this.stats.projectileSpeed,
    );

    this.nextFire = this.scene.time.now + this.stats.fireRate;
  }

}