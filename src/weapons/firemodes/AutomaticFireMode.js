import FireMode from "./FireMode.js";
import Projectile from "../../entities/Projectile.js";

export default class AutomaticFireMode extends FireMode {
  shoot(pointer) {
    const weapon = this.weapon;

    if (!weapon.canShoot()) {
      return;
    }

    if (!weapon.consumeAmmo()) {
      return;
    }

    const baseAngle = Phaser.Math.Angle.Between(
      this.owner.sprite.x,
      this.owner.sprite.y,
      pointer.x,
      pointer.y,
    );

    const angle = weapon.getProjectileAngle(
      baseAngle,
    );

    new Projectile(
      this.scene,
      this.owner.sprite.x,
      this.owner.sprite.y,
      'bullet',
      weapon.stats.damage,
      weapon.stats.projectileSpeed,
      angle,
      this.owner,
      'player',
      0,
      0,
      0,
      weapon.stats.penetrationSpeedRetention,
    );

    weapon.nextFire = 
      this.scene.time.now + weapon.stats.fireRate;
  }
}