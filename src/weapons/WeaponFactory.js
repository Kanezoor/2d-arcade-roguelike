import BasicGun from "../weapons/BasicGun.js";
import Shotgun from "./Shotgun.js";
import LaserGun from "./LaserGun.js";

export default class WeaponFactory {
  static create(id, owner) {
    switch(id) {
      case 'basic_gun':
        return new BasicGun(owner);
      case 'shotgun': 
        return new Shotgun(owner);
      case 'laser_gun':
        return new LaserGun(owner);
      default:
        console.warn(`Uknown weapon id: ${id}`);
        return null;
    }
  }
}