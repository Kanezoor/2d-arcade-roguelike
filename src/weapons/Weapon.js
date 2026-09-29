const PROJECTILE_REFERENCE_SPEED = 5;

export default class Weapon {
  constructor(owner) {
    this.owner = owner;
    this.scene = owner.scene;
    this.sprite = owner.sprite;

    // identity
    this.id = '';
    this.name = '';
    this.description = '';

    this.rarity = 'Common';
    this.stats = {};
    this.nextFire = 0;
    this.modules = [];
  }

  loadDefinition(definition) {
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
    this.rarity = definition.rarity;
    this.stats = structuredClone(definition.stats);
    this.moduleSlots = new Array(definition.slots).fill(null);
    this.fireMode = definition.fireMode;
  }

  canShoot() {
    return this.owner.scene.time.now >= this.nextFire;
  }

  shoot(pointer) {
    
  }

  getProjectileAngle(baseAngle, additionalOffset = 0) {
    const accuracy = Phaser.Math.Clamp(
      this.stats.accuracy ?? 1,
      0,
      1
    );

    const maxDeviation = this.stats.accuracySpread ?? 0;

    const deviation = Phaser.Math.FloatBetween(-1, 1) * maxDeviation * (1 - accuracy);

    return (
      baseAngle + additionalOffset + Phaser.Math.DegToRad(deviation)
    );
  }

  getProjectileImpactMultiplier(speed) {
    const speedRatio = speed / PROJECTILE_REFERENCE_SPEED;

    return Phaser.Math.Clamp(
      Math.sqrt(speedRatio),
      0.75,
      1.5,
    );
  }

  stop() {

  }
}

