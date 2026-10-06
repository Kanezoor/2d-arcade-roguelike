import WeaponModule from "./WeaponModule.js";

export default class PenetratorModule extends WeaponModule {
  constructor(weapon) {
    super(weapon);

    this.id = "penetrator";
    this.name = "Penetrator";
    this.description = "+10% penetration speed retention.";

    this.retentionBonus = 0.10;
  }

  install() {
    this.weapon.stats.penetrationSpeedRetention =
      Phaser.Math.Clamp(
        this.weapon.stats.penetrationSpeedRetention +
          this.retentionBonus,
        0,
        1
      );
  }

  uninstall() {
    this.weapon.stats.penetrationSpeedRetention =
      Phaser.Math.Clamp(
        this.weapon.stats.penetrationSpeedRetention -
          this.retentionBonus,
        0,
        1
      );
  }
}