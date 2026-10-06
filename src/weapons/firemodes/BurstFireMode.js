import FireMode from "./FireMode.js";
import Projectile from "../../entities/Projectile.js";

export default class BurstFireMode extends FireMode {
  constructor(weapon) {
    super(weapon);

    this.burstActive = false;
    this.burstTimer = null;
    this.nextBurstTime = 0;
    this.pointer = null;
    this.shotsRemaining = 0;
  }

  shoot(pointer, triggerStarted = false) {
    if (!triggerStarted) {
      return;
    }

    const now = this.scene.time.now;

    if (this.burstActive) {
      return;
    }

    if (now < this.nextBurstTime) {
      return;
    }

    this.pointer = pointer;
    this.burstActive = true;

    const burstCount = this.weapon.stats.burstCount;

    if (!burstCount || burstCount <= 0) {
      return;
    }

    this.fireShot();

    this.shotsRemaining = burstCount - 1;

    this.scheduleNextShot();
  }

  scheduleNextShot() {
    if (!this.burstActive) {
      return;
    }

    if (this.shotsRemaining <= 0) {
      this.finishBurst();
      return;
    }

    this.burstTimer = this.scene.time.delayedCall(
      this.weapon.stats.burstInterval,
      () => {
        this.burstTimer = null;

        if (!this.burstActive) {
          return;
        }

        this.fireShot();

        this.shotsRemaining--;

        this.scheduleNextShot();
      }
    );
  }

  fireShot() {
    if (!this.pointer) {
      return;
    }

    const weapon = this.weapon;

    if (!weapon.consumeAmmo()) {
      this.stop();
      return false;
    }

    const baseAngle = Phaser.Math.Angle.Between(
      this.owner.sprite.x,
      this.owner.sprite.y,
      this.pointer.x,
      this.pointer.y,
    );

    const angle = weapon.getProjectileAngle(baseAngle);

    const projectile = this.weapon.createProjectile({
      damage: this.weapon.stats.damage,
      speed: this.weapon.stats.projectileSpeed,
      angle,
      range: weapon.stats.range,
      projectileLifetime: weapon.stats.projectileLifetime,
    });

    return true;
  }

  finishBurst() {
    this.burstActive = false;
    this.shotsRemaining = 0;
    this.pointer = null;

    this.nextBurstTime = this.scene.time.now + this.weapon.stats.burstCooldown;
  }

  release() {

  }

  stop() {
    this.burstActive = false;
    this.shotsRemaining = 0;
    this.pointer = null;

    if (this.burstTimer) {
      this.burstTimer.remove();
      this.burstTimer = null;
    }

    this.nextBurstTime = 0;
  }

  destroy() {
    this.stop();
  }
}