import WeaponModule from "./WeaponModule.js";

export default class PrecisionModule extends WeaponModule {
  constructor(weapon) {
    super(weapon);

    this.id = "precision";
    this.name = "Precision Module";
    this.description = "+10% accuracy.";
    this.accuracyBonus = 0.10;
  }

  install() {
    this.weapon.stats.accuracy = Phaser.Math.Clamp(
      this.weapon.stats.accuracy + this.accuracyBonus,
      0,
      1
    );
  }

  uninstall() {
    this.weapon.stats.accuracy = Phaser.Math.Clamp(
      this.weapon.stats.accuracy - this.accuracyBonus,
      0,
      1
    );
  }
}