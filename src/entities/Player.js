import WeaponFactory from "../weapons/WeaponFactory.js";
import HitReaction from "../combat/HitReaction.js";

export default class Player {
  constructor(scene) {
    this.scene = scene;

    this.sprite = scene.physics.add.sprite(400, 300, 'playerSquare');

    this.sprite.setCollideWorldBounds(false);

    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.speed = 300;
    this.knockbackResistance = 0;
    this.hitReaction = new HitReaction(this);
    this.fireRate = 300;
    this.nextFire = 10;
    this.lastDamageTime = 0;
    this.damageCooldown = 500;
    this.currency = 0;
    this.level = 0;
    this.experience = 0;
    this.experienceToNextLevel = 100;

    this.basicWeapon = WeaponFactory.create('basic_gun', this);
    this.shotgun = WeaponFactory.create('shotgun', this);
    this.laserGun = WeaponFactory.create('laser_gun', this);
    this.leftWeapon = this.basicWeapon;
    this.rightWeapon = null;
    this.passiveItems = [];

    this.cursors = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.switchKeys = this.scene.input.keyboard.addKeys('ONE,TWO,THREE');

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
      this.leftWeapon?.stop?.();
      this.leftWeapon = this.basicWeapon;
    }

    if (Phaser.Input.Keyboard.JustDown(this.switchKeys.TWO)) {
      this.leftWeapon?.stop?.();
      this.leftWeapon = this.shotgun;
    }

    if (Phaser.Input.Keyboard.JustDown(this.switchKeys.THREE)) {
      this.leftWeapon.stop?.();
      this.leftWeapon = this.laserGun;
    }

    this.move();
    this.shoot();

    if (this.leftWeapon?.update) {
      this.leftWeapon.update(this.scene.input.activePointer);
    }
  }

  move() {

    const delta = this.scene.game.loop.delta;

    if (this.hitReaction.update(delta)) {
      return;
    }

    let velocityX = 0;
    let velocityY = 0

    if (this.cursors.left.isDown)
      velocityX -= this.speed;
    else if (this.cursors.right.isDown)
      velocityX += this.speed;

    if (this.cursors.up.isDown)
      velocityY -= this.speed;
    else if (this.cursors.down.isDown)
      velocityY += this.speed;

    this.sprite.body.setVelocity(velocityX, velocityY);
  }

  shoot() {
    const pointer = this.scene.input.activePointer;

    if (pointer.isDown && this.leftWeapon) {
      this.leftWeapon.shoot(pointer);
    }
  }

  gainExperience(amount) {
    this.experience += amount;

    console.log(
      'XP gained',
      amount,
      'Total XP:',
      this.experience,
    );

    if (this.experience >= this.experienceToNextLevel) {
      this.experience -= this.experienceToNextLevel;

      this.level++;

      this.experienceToNextLevel = 100 + this.level * 50;

      console.log(
        'LEVEL UP',
        'Level: ',
        this.level,
        'Next level: ',
        this.experienceToNextLevel,
      );

      this.scene.levelUpManager.show();
    }
  }

  takeDamage(context) {
    const sourceX =
      context.hitX ??
      context.source?.x ??
      this.sprite.x;

    const sourceY = 
      context.hitY ??
      context.source?.y ??
      this.sprite.y;

    const angle = Phaser.Math.Angle.Between(
      sourceX,
      sourceY,
      this.sprite.x,
      this.sprite.y,
    );

    const knockbackMultiplier = 
      1 - this.knockbackResistance;
    
      const distance =
        context.hitReactionDistance *
        knockbackMultiplier;

      this.hitReaction.start(
        distance,
        context.hitPushDuration,
        context.hitStunDuration,
        angle,
      );

      if (this.scene.time.now - this.lastDamageTime < this.damageCooldown) {
        return false;
      }

      this.lastDamageTime = this.scene.time.now;

      this.health -= context.baseDamage;

      console.log(
        'Player damage: ',
        context.baseDamage,
      );

      console.log(
        'Player health: ',
        this.health,
      );

      if (this.health <= 0) {

        this.health = 0;
        this.die();

        return true;
      }

      return false;
  }

  increaseKnockbackResistance(amount) {
    this.knockbackResistance = Math.min(
      this.knockbackResistance + amount,
      0.75
    );
  }

  die() {
    this.scene.isGameOver = true;
    this.sprite.setTint(0xff0000);
  }
}
