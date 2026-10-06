import Weapon from "./Weapon.js";
import Beam from '../entities/Beam.js'
import laserGun from "./definitions/laserGun.js";

export default class LaserGun extends Weapon {
  constructor(owner) {
    super(owner);
    this.loadDefinition(laserGun);
  }
}