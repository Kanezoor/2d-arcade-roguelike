import WeaponModule from "./WeaponModule.js";

export default class HeavyRoundsModule extends WeaponModule {
  constructor(weapon) {
    super(weapon);

    this.id = "heavyRounds";
    this.name = "Heavy Rounds";
    this.description = "+25% base damage, -20% projectile speed.";

    this.damageMultiplier = 1.25;
    this.speedMultiplier = 0.80;
  }

  onProjectileCreated(projectile) {
    projectile.baseDamage *= this.damageMultiplier;

    projectile.currentSpeed *= this.speedMultiplier;

    projectile.sprite.setVelocity(
      Math.cos(projectile.travelAngle) *
        projectile.currentSpeed,

      Math.sin(projectile.travelAngle) *
        projectile.currentSpeed
    );
  }
}