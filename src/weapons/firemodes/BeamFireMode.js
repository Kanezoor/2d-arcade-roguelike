import FireMode from "./FireMode.js";
import Beam from "../../entities/Beam.js";

export default class BeamFireMode extends FireMode {
  constructor(weapon) {
    super(weapon) 
    
    this.beam = new Beam(
      this.scene,
      this.owner,
      weapon.stats.damage,
      weapon.stats.range,
    );
  }

  shoot() {
    if (!this.beam.active) {
      this.beam.start();
    }
  }

  update(pointer) {
    if (!this.beam.active) {
      return;
    }

    this.beam.update(pointer);
  }

  stop() {
    this.beam.stop();
  }

  destroy() {
    this.beam.destroy();
  }
}