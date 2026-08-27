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

    const bullet = this.scene.projectiles.create(
      this.sprite.x,
      this.sprite.y,
      'bullet'
    );

    const speed = 666;

    bullet.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
    );

    bullet.damage = this.damage;
    bullet.isEnemyProjectile = true;
  }

  updateBurst() {
    const delta = this.scene.game.loop.delta;
    console.log(
      "BURST",
      "remaining:", this.burstShotsRemaining,
      "timer:", this.burstTimer
    );

    this.burstTimer -= delta;

    if (this.burstTimer > 0) {
      return;
    }
    console.log("FIRING BURST SHOT");
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

}