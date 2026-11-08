import FireMode from "./FireMode.js";
import Projectile from "../../entities/Projectile.js";

export default class SingleFireMode extends FireMode {
  shoot(pointer, triggerStarted = false) {
    if (!triggerStarted) {
      return;
    }
    
    const weapon = this.weapon;

    if (!weapon.canShoot()) {
      return;
    }

    if (!weapon.consumeAmmo()) {
      return;
    }

    const baseAngle = weapon.getAimAngle(pointer);

    const angle = weapon.getProjectileAngle(
      baseAngle,
    );

    const projectile = weapon.createProjectile({
      damage: weapon.stats.damage,
      speed: weapon.stats.projectileSpeed,
      angle,
      range: weapon.stats.range,
      projectileLifetime: weapon.stats.projectileLifetime,
    });

    weapon.nextFire = this.scene.time.now + weapon.stats.fireRate;
  }
}