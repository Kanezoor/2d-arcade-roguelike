import Projectile from "./Projectile.js";

export default class Enemy {

  constructor(sprite, config, scene) {

    this.sprite = sprite;
    sprite.enemy = this;
    this.scene = scene;

    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.damage = config.damage;
    this.score = config.score;
    this.color = config.color;
    this.knockbackResistance = config.knockbackResistance;
    this.kbX = 0;
    this.kbY = 0;

    this.preferredDistance = config.preferredDistance ?? 250;
    this.state = config.state ?? 'chase';

    this.burstShots = config.burstShots ?? 0;
    this.burstDelay = config.burstDelay ?? 0;
    this.burstCooldown = config.burstCooldown ?? 0;
    this.repositionTime = config.repositionTime ?? 0;

    this.stateTimer = 0;
    this.burstShotsRemaining = 0;
    this.burstTimer = 0;
    this.lastBurst = 0;
    
    this.behavior = config.behavior ?? 'chase';
    this.chargeTriggerDistance = config.chargeTriggerDistance ?? 300;
    this.chargeTelegraphTime = config.chargeTelegraphTime ?? 600;
    this.chargeCooldown = config.chargeCooldown ?? 1800;
    this.chargeSpeed = config.chargeSpeed ?? 600;
    this.chargeDuration = config.chargeDuration ?? 500;
    this.chargeRecovery = config.chargeRecovery ?? 600;
    this.chargeAngle = 0;
    this.chargeTimer = 0;
    this.lastCharge = 0;
    this.hasHitPlayerThisCharge = false;
    this.isVulnerable = false;
  }

  startBurst() {
    if (this.state !== 'kite') {
      return;
    } 

    this.state = 'burst';

    this.burstShotsRemaining = this.burstShots;
    this.burstTimer = 0;

    this.sprite.body.setVelocity(0, 0);
  }

  fireBurstShot() {
    const player = this.scene.player.sprite;

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      player.x,
      player.y
    );

    const speed = 666;

    new Projectile(
      this.scene,
      this.sprite.x,
      this.sprite.y,
      'bullet',
      this.damage,
      speed,
      angle,
      this,
      'enemy'
    );

  }

  updateBurst() {
    const delta = this.scene.game.loop.delta;

    this.burstTimer -= delta;

    if (this.burstTimer > 0) {
      return;
    }
    this.fireBurstShot();
    this.burstShotsRemaining--;
    if (this.burstShotsRemaining > 0) {
      this.burstTimer = this.burstDelay;
    } else {
      this.lastBurst = this.scene.time.now;
      this.state = 'reposition';
      this.stateTimer = this.repositionTime;
    }
  }

  updateReposition() {
    const delta = this.scene.game.loop.delta;
    this.stateTimer -= delta;
    const player = this.scene.player.sprite;

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      player.x,
      player.y
    );

    const direction = this.sprite.x < player.x ? 1 : -1;

    this.sprite.body.setVelocity(
      Math.cos(angle + Math.PI / 2) * this.speed * direction,
      Math.sin(angle + Math.PI / 2) * this.speed * direction,
    );

    if (this.stateTimer <= 0) {
      this.sprite.body.setVelocity(0, 0);
      this.state = 'kite';
    }
  }

  startChargeTelegraph() {
    if (this.behavior !== 'charger') {
      return;
    }

    this.isVulnerable = false;
    this.sprite.clearTint();

    this.state = 'telegraph';
    this.chargeTimer = this.chargeTelegraphTime;
    this.sprite.body.setVelocity(0, 0)
    console.log('Charger TELEGRAPH');
  }

  updateCharger() {
    const delta = this.scene.game.loop.delta;
    const player = this.scene.player.sprite;

    if (this.state === 'chase') {

      const distance = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        player.x,
        player.y
      );

      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        player.x,
        player.y
      );

      if (
        distance <= this.chargeTriggerDistance &&
        this.scene.time.now - this.lastCharge >= this.chargeCooldown
      ) {
        this.startChargeTelegraph();
        return;
      }

      this.sprite.body.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );

      return;
    }

    if (this.state === 'telegraph') {

      this.sprite.body.setVelocity(0, 0);

      this.chargeTimer -= delta;

      if (this.chargeTimer <= 0) {
        console.log('Charger Ready');
        this.startCharge();
      }

      return;
    }

    if (this.state === 'charge') {

      this.chargeTimer -= delta;

      if (this.chargeTimer <= 0) {

        this.sprite.body.setVelocity(0, 0);

        this.state = 'chargeRecovery';
        this.chargeTimer = this.chargeRecovery;
        this.isVulnerable = true;
        this.sprite.setTint(0xffff00);

        console.log('CHARGER RECOVERY - VULNERABLE');
      }

      return;
    }

    if (this.state === 'chargeRecovery') {

      this.sprite.body.setVelocity(0, 0);

      this.chargeTimer -= delta;

      if (this.chargeTimer <= 0) {

        this.lastCharge = this.scene.time.now;
        this.state = 'chase';
        this.isVulnerable = false;
        this.sprite.clearTint();
        console.log('CHARGER BACK TO CHASE');
      }

      return;
    }
  }

  startCharge() {

    const player = this.scene.player.sprite;
    this.isVulnerable = false;

    this.chargeAngle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      player.x,
      player.y,
    );

    this.state = 'charge';
    this.chargeTimer = this.chargeDuration;
    this.hasHitPlayerThisCharge = false;

    this.sprite.body.setVelocity(
      Math.cos(this.chargeAngle) * this.chargeSpeed,
      Math.sin(this.chargeAngle) * this.chargeSpeed
    );

    console.log('CHARGER CHARGE');
  }

}