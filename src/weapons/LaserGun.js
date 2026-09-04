import Weapon from "./Weapon.js";
import Beam from "../entities/Beam.js";

export default class LaserGun extends Weapon {
  constructor(owner) {
    super(owner);

    this.id = 'laser_gun';
    this.name = 'Laser Gun';
    this.description = 'A continuous laser beam.';
    this.damage = 1;
    this.range = 500;

    this.beam = new Beam(
      this.scene,
      this.owner,
      this.damage,
      this.range,
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