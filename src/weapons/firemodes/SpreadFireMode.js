import FireMode from "./FireMode.js";
import Projectile from "../../entities/Projectile.js";

export default class SpreadFireMode extends FireMode {
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

    const baseAngle = Phaser.Math.Angle.Between(
      this.owner.sprite.x,
      this.owner.sprite.y,
      pointer.x,
      pointer.y,
    );

    const spread = Phaser.Math.DegToRad(
      weapon.stats.spreadAngle,
    );

    const halfCount = (weapon.stats.pelletCount - 1) / 2;

    for(let i = 0; i < weapon.stats.pelletCount; i++) {
      let normalizedPosition =
        halfCount === 0
          ? 0
          : (i - halfCount) / halfCount;

      const jitter = 
        Phaser.Math.FloatBetween(
          -weapon.stats.patternJitter,
          weapon.stats.patternJitter,
        );

      normalizedPosition += jitter;

      normalizedPosition = Phaser.Math.Clamp(
        normalizedPosition,
        -1,
        1,
      );

      const offset = normalizedPosition * spread / 2;

      const angle = weapon.getProjectileAngle(
        baseAngle,
        offset,
      );

      const projectile = weapon.createProjectile({
        damage: weapon.stats.damage,
        speed: weapon.stats.projectileSpeed,
        angle,
        range: weapon.stats.range,
        projectileLifetime: weapon.stats.projectileLifetime,
      });
    }

    weapon.nextFire = this.scene.time.now + weapon.stats.fireRate;
  }
}
