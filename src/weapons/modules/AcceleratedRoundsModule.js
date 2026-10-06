import WeaponModule from "./WeaponModule.js";

export default class AcceleratedRoundsModule extends WeaponModule {
  constructor(weapon) {
    super(weapon);

    this.id = "acceleratedRounds";
    this.name = "Accelerated Rounds";
    this.description = "+20% projectile speed.";
    this.speedMultiplier = 5;
  }

  onProjectileCreated(projectile) {
    projectile.currentSpeed *= this.speedMultiplier;

    projectile.sprite.setVelocity(
      Math.cos(projectile.travelAngle) *
        projectile.currentSpeed,

      Math.sin(projectile.travelAngle) *
        projectile.currentSpeed
    );
  }
}