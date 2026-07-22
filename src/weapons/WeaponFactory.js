import BasicGun from "../weapons/BasicGun.js";

export default class WeaponFactory {
  static create(id, owner) {
    switch(id) {
      case 'basic_gun':
        return new BasicGun(owner);
      default:
        console.warn(`Uknown weapon id: ${id}`);
        return null;
    }
  }
}