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

    console.log(`Firing weapon: ${this.name}`);

    const angle = Phaser.Math.Angle.Between(
      this.owner.sprite.x,
      this.owner.sprite.y,
      pointer.x,
      pointer.y
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
      'player'
    );

    this.nextFire = this.scene.time.now + this.stats.fireRate;
  }

}