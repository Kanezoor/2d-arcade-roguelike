import Projectile from "./Projectile.js";

export default class Boss {

  constructor(sprite, scene) {

    this.scene = scene;
    this.sprite = sprite;
  
    sprite.boss = this;

    this.maxHealth = 100;
    this.health = this.maxHealth;

    this.phase = 1;

    this.isDead = false;

    this.sprite.setImmovable(true);

    this.attackState = 'idle';
    this.attackTimer = 0;

    this.burstShotsRemaining = 0;
    this.burstTimer = 0;
    
  }

  update(delta) {
    if (this.isDead) return;

    if (this.burstShotsRemaining > 0) {
      this.burstTimer -= delta;
      if (this.burstTimer <= 0) {
        this.fireBurstShot();

        this.burstShotsRemaining--;

        if (this.burstShotsRemaining > 0) {
          this.burstTimer = 300;
        } else {
          this.attackTimer = 0;
          this.attackState = 'cooldown';
        }
      }

      return;
    }


    this.attackTimer += delta;

    if (this.attackState === 'idle') {
      if (this.attackTimer >= 500) {
        this.attackTimer = 0;
        this.attackState = 'cone';
        this.fireCone();
      }

      return;
    }

    if (this.attackState === 'cone') {
      if (this.attackTimer >= 1500) {
        this.attackTimer = 0;
        
        if(this.phase === 2) {
          this.attackState = 'burst';
          this.fireBurst();
        } else {
          this.attackState = 'cooldown';
        }
      }

      return;
    }

    if (this.attackState === 'cooldown') {
      if (this.attackTimer >= 2000) {
        this.attackTimer = 0;
        this.attackState = 'idle';
      }

      return;
    }
  }

  takeDamage(amount) {

    if (this.isDead) return;

    this.health -= amount;

    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return;
    }

    if (this.health <= this.maxHealth / 2) {
      this.phase = 2;
    }
  }

  fireCone() {
    const player = this.scene.player.sprite;
    const baseAngle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, player.x, player.y);

    const spread = Phaser.Math.DegToRad(30);

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
        this.sprite.x,
        this.sprite.y,
        'bullet',
        1,
        250,
        angle,
        this,
        'enemy'
      );
    });


  }

  fireBurst() {
    this.burstShotsRemaining = 5;
    this.fireBurstShot();
    this.burstShotsRemaining--;
    this.burstTimer = 300;
  }

  fireBurstShot() {
    const player = this.scene.player.sprite;

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      player.x,
      player.y
    );

    new Projectile(
      this.scene,
      this.sprite.x,
      this.sprite.y,
      'bullet',
      1,
      500,
      angle,
      this,
      'enemy'
    );
  }

  die() {

    this.isDead = true;

    this.sprite.destroy();

    console.log("Boss defeated!");

    this.scene.roomManager.bossDefeated();

  }

}