import PrecisionModule from "./PrecisionModule.js";
import AcceleratedRoundsModule from "./AcceleratedRoundsModule.js";
import HeavyRoundsModule from "./HeavyRoundsModule.js";
import PenetratorModule from "./PenetratorModule.js";

export default class WeaponModuleFactory {

  static create(id, weapon) {
    switch (id) {
      case "precision":
        return new PrecisionModule(weapon);
      case "acceleratedRounds":
        return new AcceleratedRoundsModule(weapon);
      case "heavyRounds":
        return new HeavyRoundsModule(weapon);
      case "penetrator":
        return new PenetratorModule(weapon);
      default:
        console.warn(
          `Unknown weapon module: ${id}`
        );

        return null;
    }
  }
}