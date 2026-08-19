import BasicGun from "../weapons/BasicGun.js";
import Shotgun from "./Shotgun.js";

export default class WeaponFactory {
  static create(id, owner) {
    switch(id) {
      case 'basic_gun':
        return new BasicGun(owner);
      case 'shotgun': 
        return new Shotgun(owner);
      default:
        console.warn(`Uknown weapon id: ${id}`);
        return null;
    }
  }
}