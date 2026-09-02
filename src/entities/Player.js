import { showGameOverScreen } from "../ui.js";
import BasicGun from "../weapons/BasicGun.js"
import WeaponFactory from "../weapons/WeaponFactory.js";

export default class Player {
  constructor(scene) {
    this.scene = scene;

    this.sprite = scene.physics.add.sprite(400, 300, 'playerSquare');

    this.sprite.setCollideWorldBounds(false);

    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.speed = 300;
    this.kbX = 0;
    this.kbY = 0;
    this.fireRate = 300;
    this.nextFire = 10;
    this.lastDamageTime = 0;
    this.damageCooldown = 500;
    this.currency = 0;
    this.level = 0;
    this.experience = 0;

    this.basicWeapon = WeaponFactory.create('basic_gun', this);
    this.shotgun = WeaponFactory.create('shotgun', this);
    this.leftWeapon = this.basicWeapon;
    this.rightWeapon = null;
    this.passiveItems = [];

    this.cursors = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.switchKeys = this.scene.input.keyboard.addKeys('ONE,TWO');

  }

  hasPassive(passiveId) {
    return this.passiveItems.includes(passiveId);
  }

  addPassive(passiveId) {
    if (!this.hasPassive(passiveId)) {
      this.passiveItems.push(passiveId);
    }
  }
  update() {
    if (this.scene.isGameOver) return;

    if (Phaser.Input.Keyboard.JustDown(this.switchKeys.ONE)) {
      this.leftWeapon = this.basicWeapon;
    }

    if (Phaser.Input.Keyboard.JustDown(this.switchKeys.TWO)) {
      this.leftWeapon = this.shotgun;
    }

    this.move();
    this.shoot();
  }

  move() {

    let velocityX = this.kbX;
    let velocityY = this.kbY;

    if (this.cursors.left.isDown) 
      velocityX -= this.speed;
    else if (this.cursors.right.isDown) 
      velocityX += this.speed;

    if (this.cursors.up.isDown) 
      velocityY -= this.speed;
    else if (this.cursors.down.isDown)
      velocityY += this.speed;

    this.sprite.body.setVelocity(velocityX, velocityY);

    this.kbX *= 0.95;
    this.kbY *= 0.95;

    if (Math.abs(this.kbX) < 1) this.kbX = 0;
    if (Math.abs(this.kbY) < 1) this.kbY = 0;
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

  const isCharging = source.enemy?.behavior === 'charger' && source.enemy?.state === 'change';
  const playerKnockback = isCharging ? source.enemy.chargeKnockBack ?? 3000 : 400;

  this.kbX = Math.cos(angle) * playerKnockback;
  this.kbY = Math.sin(angle) * playerKnockback;

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
