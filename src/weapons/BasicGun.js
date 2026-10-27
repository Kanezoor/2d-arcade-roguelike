import Weapon from "./Weapon.js"
import basicGun from "./definitions/basicGun.js";

export default class BasicGun extends Weapon {
  constructor(owner) {
    super(owner);
    this.loadDefinition(basicGun);
  }
}