import { showGameOverScreen } from "../ui.js";
import BasicGun from "../weapons/BasicGun.js"
import WeaponFactory from "../weapons/WeaponFactory.js";

export default class Player {
  constructor(scene) {
    this.scene = scene;

    this.sprite = scene.physics.add.sprite(400, 300, 'playerSquare');

    this.sprite.setCollideWorldBounds(true);

    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.speed = 300;
    this.fireRate = 300;
    this.nextFire = 10;
    this.lastDamageTime = 0;
    this.damageCooldown = 500;
    this.currency = 0;
    this.level = 0;
    this.experience = 0;
    this.leftWeapon = WeaponFactory.create('basic_gun', this);
    this.rightWeapon = null;
    this.passiveItems = [];


    this.cursors = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

  }

  update() {
    if (this.scene.isGameOver) return;

    this.move();
    this.shoot();
  }

  move() {
    this.sprite.body.setVelocity(0);

    if (this.cursors.left.isDown) 
      this.sprite.body.setVelocityX(-this.speed);
    else if (this.cursors.right.isDown) 
      this.sprite.body.setVelocityX(this.speed);;

    if (this.cursors.up.isDown) 
      this.sprite.body.setVelocityY(-this.speed);
    else if (this.cursors.down.isDown)
      this.sprite.body.setVelocityY(this.speed);
  }

  shoot() {
    const pointer = this.scene.input.activePointer;

    if (pointer.isDown && this.leftWeapon) {
      this.leftWeapon.shoot(pointer);
    }
  }

  takeDamage(source) {

  if (this.scene.time.now - this.lastDamageTime < this.damageCooldown)
    return false;

  this.lastDamageTime = this.scene.time.now;

  const damage = source.enemy ? source.enemy.damage : source.damage;

  this.health -= damage;
  console.log('Player damage: ', damage);
  console.log("Player health:", this.health);

  const angle = Phaser.Math.Angle.Between(
    source.x,
    source.y,
    this.sprite.x,
    this.sprite.y
  );

  this.sprite.body.setVelocity(
    Math.cos(angle) * 400,
    Math.sin(angle) * 400
  );

  if (source.enemy) {
    const enemy = source.enemy;
    const enemyKnockback = 3000;

    enemy.kbX = -Math.cos(angle) * enemyKnockback;
    enemy.kbY = -Math.sin(angle) * enemyKnockback;
  }
  

  if (this.health <= 0) {

    this.health = 0;

    this.die();

    return true;
  }

  return false;
}

  die() {
    this.scene.isGameOver = true;
    this.sprite.setTint(0xff0000);
  }
}
