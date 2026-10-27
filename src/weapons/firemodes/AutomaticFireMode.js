import FireMode from "./FireMode.js";

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

    weapon.createProjectile({
      damage: weapon.stats.damage,
      speed: weapon.stats.projectileSpeed,
      angle,
      range: weapon.stats.range,
      projectileLifetime: weapon.stats.projectileLifetime,
    });

    weapon.nextFire = 
      this.scene.time.now + weapon.stats.fireRate;
  }
}