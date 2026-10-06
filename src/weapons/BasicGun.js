import Weapon from "./Weapon.js"
import basicGun from "./definitions/basicGun.js";
import WeaponModuleFactory from "./modules/WeaponModuleFactory.js";

export default class BasicGun extends Weapon {
  constructor(owner) {
    super(owner);
    this.loadDefinition(basicGun);

    const penetrator =
      WeaponModuleFactory.create(
        "penetrator",
        this
      );

    this.installModule(penetrator);

  }
}