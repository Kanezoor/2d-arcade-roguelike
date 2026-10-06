import SingleFireMode from "./SingleFireMode.js";
import SpreadFireMode from "./SpreadFireMode.js";
import BeamFireMode from "./BeamFireMode.js";
import AutomaticFireMode from "./AutomaticFireMode.js";
import BurstFireMode from "./BurstFireMode.js";

export default class FireModeFactory {
  static create(id, weapon) {
    switch(id) {
      case 'single':
        return new SingleFireMode(weapon);
      case 'spread':
        return new SpreadFireMode(weapon);
      case 'beam':
        return new BeamFireMode(weapon);
      case 'automatic':
        return new AutomaticFireMode(weapon);
      case 'burst':
        return new BurstFireMode(weapon);
      default: 
        console.warn(
          `Unkown fire mode ${id}`,
        );
        return null;
    }
  }
}