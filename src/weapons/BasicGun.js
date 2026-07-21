import Weapon from "./Weapon.js"

export default class BasicGun extends Weapon {
  constructor(owner) {
    super(owner);
    this.damage = 10;
    this.fireRate = 300;
  }

  shoot(pointer) {
    if (this.scene.time.now < this.owner.nextFire) return;

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      pointer.x,
      pointer.y
    );

    const bullet = this.scene.projectiles.create(
      this.sprite.x,
      this.sprite.y,
      'bullet'
    );

    const bulletSpeed = 600;
    
    bullet.body.setVelocity(
      Math.cos(angle) * bulletSpeed,
      Math.sin(angle) * bulletSpeed,
    );

    this.owner.nextFire = this.scene.time.now + this.fireRate;
  }

}