export default class WeaponModule {
  constructor(weapon) {
    this.weapon = weapon;
    this.player = weapon.owner;
    this.id = null;
  }

  install() {
  }

  uninstall() {
  }

  onProjectileCreated(projectile) {
  }

  modifyStats() {
  }
}