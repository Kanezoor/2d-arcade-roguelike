import Weapon from "./Weapon.js";
import shotgun from "./definitions/shotgun.js";
import Projectile from "../entities/Projectile.js";
import WeaponModuleFactory from "./modules/WeaponModuleFactory.js";



export default class Shotgun extends Weapon {
  constructor(owner) {
    super(owner);
    this.loadDefinition(shotgun);

    
  }
}