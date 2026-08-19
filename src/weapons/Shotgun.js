import Projectile from "../entities/Projectile.js";

export default class Shotgun {
  constructor(owner) {
    this.owner = owner;
    this.scene = owner.scene;
    this.sprite = owner.sprite;

    this.id = 'shotgun';
    this.name = 'Shotgun';
    this.description = 'Fires five projectiles in a spread';
    this.rarity = 'Common';

    this.nextFire = 0;
    this.fireRate = 1500;
    this.damage = 1;
    this.projectileSpeed = 900;
  }

  canShoot() {
    return this.scene.time.now >= this.nextFire;
  }

  shoot(pointer) {
    if (!this.canShoot()) return;

    console.log(`Firing weapon: ${this.name}`);

    const baseAngle = Phaser.Math.Angle.Between(
      this.owner.sprite.x,
      this.owner.sprite.y,
      pointer.x,
      pointer.y
    );

    const spread = Phaser.Math.DegToRad(10);

    const angles = [
      baseAngle - spread,
      baseAngle - spread / 2,
      baseAngle,
      baseAngle + spread / 2,
      baseAngle + spread
    ];

    angles.forEach(angle => {
      new Projectile(
        this.scene,
        this.owner.sprite.x,
        this.owner.sprite.y,
        'bullet',
        this.damage,
        this.projectileSpeed,
        angle,
        this.owner
      );
    });

    this.nextFire = this.scene.time.now + this.fireRate;
  }
}