import Weapon from "./Weapon.js";
import Beam from '../entities/Beam.js'
import laserGun from "./definitions/laserGun.js";

export default class LaserGun extends Weapon {
  constructor(owner) {
    super(owner);
    this.loadDefinition(laserGun);

    this.beam = new Beam(
      this.scene,
      this.owner,
      this.stats.damage,
      this.stats.range,
    );
  }

  shoot(pointer) {
    if (!this.beam.active) {
      this.beam.start();
    }
  }

  update(pointer) {
    if (pointer.isDown) {
      this.shoot(pointer);
      this.beam.update(pointer);
    } else {
      this.beam.stop();
    }
  }

  destroy() {
    this.beam.destroy();
  }

  stop() {
    this.beam.stop();
  }
}