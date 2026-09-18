import Projectile from "./Projectile.js";
import { createParticles } from "../particles.js";


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
    this.xp = config.xp ?? 0;
    this.color = config.color;
    this.knockbackResistance = config.knockbackResistance;
    this.hitReactionDistance = config.hitReactionDistance ?? 0;
    this.chargeHitPushDuration = config.chargeHitPushDuration ?? 0;
    this.chargeHitReactionDistance = config.chargeHitReactionDistance ?? 0;
    this.chargeHitStunDuration = config.chargeHitStunDuration ?? 0;
    this.kbX = 0;
    this.kbY = 0;
    this.maxKnockbackSpeed = 6;

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
    this.chargeSpeed = config.chargeSpeed ?? 6;
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

    this.sprite.setVelocity(0, 0);
  }

  fireBurstShot() {
    const player = this.scene.player.sprite;

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      player.x,
      player.y
    );

    const speed = 6;

    new Projectile(
      this.scene,
      this.sprite.x,
      this.sprite.y,
      'bullet',
      this.damage,
      speed,
      angle,
      this,
      'enemy',
      3,
      50,
      0,
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

    this.sprite.setVelocity(
      Math.cos(angle + Math.PI / 2) * this.speed * direction,
      Math.sin(angle + Math.PI / 2) * this.speed * direction,
    );

    if (this.stateTimer <= 0) {
      this.sprite.setVelocity(0, 0);
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
    this.sprite.setVelocity(0, 0)
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

      this.sprite.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );

      return;
    }

    if (this.state === 'telegraph') {

      this.sprite.setVelocity(0, 0);

      this.chargeTimer -= delta;

      if (this.chargeTimer <= 0) {
        this.startCharge();
      }

      return;
    }

    if (this.state === 'charge') {

      this.chargeTimer -= delta;

      if (this.chargeTimer <= 0) {

        this.sprite.setVelocity(0, 0);

        this.state = 'chargeRecovery';
        this.chargeTimer = this.chargeRecovery;
        this.isVulnerable = true;
        this.sprite.setTint(0xffff00);

      }

      return;
    }

    if (this.state === 'chargeRecovery') {

      this.sprite.setVelocity(0, 0);

      this.chargeTimer -= delta;

      if (this.chargeTimer <= 0) {

        this.lastCharge = this.scene.time.now;
        this.state = 'chase';
        this.isVulnerable = false;
        this.sprite.clearTint();
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

    this.sprite.setVelocity(
      Math.cos(this.chargeAngle) * this.chargeSpeed,
      Math.sin(this.chargeAngle) * this.chargeSpeed
    );

  }

  takeDamage(context) {
    this.health -= context.baseDamage;

    createParticles(
      this.scene,
      context.hitX ?? this.sprite.x,
      context.hitY ?? this.sprite.y,
      0xffffff,
      5
    );

    if (context.knockbackStrength > 0) {
      const angle = Phaser.Math.Angle.Between(
        context.hitX ?? this.sprite.x,
        context.hitY ?? this.sprite.y,
        this.sprite.x,
        this.sprite.y
      );

      this.kbX += 
        Math.cos(angle) *
        context.knockbackStrength *
        this.knockbackResistance;

      this.kbY += 
        Math.sin(angle) *
        context.knockbackStrength *
        this.knockbackResistance;

      const knockbackSpeed = Math.hypot(this.kbX, this.kbY);

      if (knockbackSpeed > this.maxKnockbackSpeed) {
        const scale = this.maxKnockbackSpeed / knockbackSpeed;

        this.kbX *= scale;
        this.kbY *= scale;
      }
    }

    if (this.health <= 0) {
      this.health = 0;

      createParticles(
        this.scene,
        this.sprite.x,
        this.sprite.y,
        this.color,
        20
      );

      this.scene.player.gainExperience(this.xp);
      this.sprite.destroy();

      this.scene.score += this.score;

      this.scene.scoreText.setText('Score: ' + this.scene.score);
    }
  }

}