export default class Weapon {
  constructor(owner) {
    this.owner = owner;
    this.scene = owner.scene;
    this.sprite = owner.sprite;
    this.damage = 10;
    this.fireRate = 300;
    this.nextFire = 0;
    this.modules = [];
  }

  canShoot() {
    return this.owner.scene.time.now >= this.nextFire;
  }

  shoot(pointer) {
    
  }
}