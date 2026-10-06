export default class FireMode {
  constructor(weapon) {
    this.weapon = weapon;
    this.scene = weapon.scene;
    this.owner = weapon.owner;
  }

  shoot(pointer, triggerStarted = false) {

  }

  update(pointer) {

  }

  release() {
    this.stop();
  }

  stop() {

  }
}