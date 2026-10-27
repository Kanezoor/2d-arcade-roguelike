import FireModeFactory from "./firemodes/FireModeFactory.js";
import Projectile from "../entities/Projectile.js";
const PROJECTILE_REFERENCE_SPEED = 5;
const MAX_MODULE_SLOTS = 10;

export default class Weapon {
  constructor(owner) {
    this.owner = owner;
    this.scene = owner.scene;
    this.sprite = owner.sprite;

    this.id = '';
    this.name = '';
    this.description = '';

    this.rarity = 'Common';
    this.stats = {};
    this.nextFire = 0;
    this.moduleSlots = [];

    this.currentAmmo = Infinity;
    this.isReloading = false;
    this.reloadEndTime = 0;
  }

  get modules() {
    return this.moduleSlots.filter(Boolean);
  }

  loadDefinition(definition) {
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
    this.rarity = definition.rarity;
    this.stats = structuredClone(definition.stats);
    this.currentAmmo = this.stats.magazineSize ?? Infinity;
    this.isReloading = false;
    this.reloadEndTime = 0;
    this.reloadMode = definition.reloadMode ?? 'magazine';
    const initialSlotCount = Phaser.Math.Clamp(
      definition.slots ?? 2,
      0,
      MAX_MODULE_SLOTS,
    );
    this.moduleSlots = new Array(initialSlotCount).fill(null);
    this.fireModeId = definition.fireMode;
    this.fireMode = FireModeFactory.create(
      this.fireModeId,
      this,
    );
  }

  canShoot() {
    if (this.isReloading) {
      return false;
    }

    if (this.currentAmmo <= 0) {
      return false;
    }

    return this.owner.scene.time.now >= this.nextFire;
  }

  consumeAmmo(amount = 1) {
    if (this.currentAmmo === Infinity) {
      return true;
    }

    if (this.currentAmmo < amount) {
      return false;
    }

    this.currentAmmo -= amount;

    return true;
  }

  reload() {
    if (this.currentAmmo === Infinity) {
      return;
    }

    if (this.isReloading) {
      return;
    }

    if (this.currentAmmo >= this.stats.magazineSize) {
      return;
    }

    if (this.reloadMode === 'none') {
      return;
    }

    this.stop();

    this.isReloading = true;

    if (this.reloadMode === 'shell') {
      this.reloadEndTime =
        this.scene.time.now +
        this.stats.reloadTime;

      return;
    }

    this.reloadEndTime =
      this.scene.time.now +
      this.stats.reloadTime;
  }

  cancelReload() {
    if (!this.isReloading) {
      return false;
    }

    if (this.reloadMode !== 'shell') {
      return false;
    }

    if (this.currentAmmo <= 0) {
      return false;
    }

    this.isReloading = false;
    this.reloadEndTime = 0;

    return true;
  }

  updateReload() {
    if (!this.isReloading) {
      return;
    }

    if (this.scene.time.now < this.reloadEndTime) {
      return;
    }

    if (this.reloadMode === 'shell') {
      this.currentAmmo++;

      if (
        this.currentAmmo >=
        this.stats.magazineSize
      ) {
        this.currentAmmo =
          this.stats.magazineSize;

        this.isReloading = false;
        this.reloadEndTime = 0;

        return;
      }

      this.reloadEndTime =
        this.scene.time.now +
        this.stats.reloadTime;

      return;
    }

    this.currentAmmo =
      this.stats.magazineSize;

    this.isReloading = false;
    this.reloadEndTime = 0;
  }

  isMagazineEmpty() {
    return (
      this.currentAmmo !== Infinity &&
      this.currentAmmo <= 0
    );
  }

  shoot(pointer, triggerStarted = false) {
    if (
      triggerStarted &&
      this.isReloading
    ) {
      this.cancelReload();
    }

    this.fireMode?.shoot(
      pointer,
      triggerStarted
    );
  }

  update(pointer) {
    this.updateReload();

    if (
      this.isMagazineEmpty() &&
      !this.isReloading
    ) {
      this.reload();
    }

    this.fireMode?.update(pointer);
  }

  createProjectile({
    texture = 'bullet',
    damage,
    speed,
    angle,
    range,
    projectileLifetime,
    hitReactionDistance = 0,
    hitPushDuration = 0,
    hitStunDuration = 0,
  }) {
    const projectile = new Projectile(
      this.scene,
      this.owner.sprite.x,
      this.owner.sprite.y,
      texture,
      damage,
      speed,
      angle,
      range,
      projectileLifetime,
      this.owner,
      'player',
      hitReactionDistance,
      hitPushDuration,
      hitStunDuration,
      this.stats.penetrationSpeedRetention,
    );

    this.onProjectileCreated(projectile);


    console.log(
      "Projectile:",
      {
        speed: projectile.currentSpeed,
        retention:
        projectile.penetrationSpeedRetention,
        modules: this.modules
      }
    );

    return projectile;
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

  addModuleSlots(count = 1) {
    if (
      !Number.isInteger(count) ||
      count <= 0 ||
      this.moduleSlots.length + count > MAX_MODULE_SLOTS
    ) {
      return false;
    }

    this.moduleSlots.push(...new Array(count).fill(null));

    return true;
  }

  canAddModule() {
    return this.moduleSlots.some(
      module => module === null
    );
  }
  
  canAddModuleSlots(count = 1) {
    return (
      Number.isInteger(count) &&
      count > 0 &&
      this.moduleSlots.length + count <= MAX_MODULE_SLOTS
    );
  }

  addModuleSlots(count = 1) {
    if (!this.canAddModuleSlots(count)) {
      return false;
    }

    this.moduleSlots.push(
      ...new Array(count).fill(null)
    );

    return true;
  }

  installModule(
    module,
    slotIndex = this.moduleSlots.findIndex(
      existingModule => existingModule === null
    )
  ) {
    if (
      !module ||
      !Number.isInteger(slotIndex) ||
      slotIndex < 0 ||
      slotIndex >= this.moduleSlots.length ||
      this.moduleSlots[slotIndex] !== null ||
      this.modules.includes(module) ||
      module.weapon !== this
    ) {
      return false;
    }

    this.moduleSlots[slotIndex] = module;

    module.install();

    return true;
  }

  onProjectileCreated(projectile) {
    if (!projectile) {
      return;
    }

    this.modules.forEach(module => {
      module.onProjectileCreated?.(projectile);
    });
  }

  addModule(module) {
    return this.installModule(module);
  }

  moveModule(fromIndex, toIndex) {
    if (
      !Number.isInteger(fromIndex) ||
      !Number.isInteger(toIndex) ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.moduleSlots.length ||
      toIndex >= this.moduleSlots.length ||
      fromIndex === toIndex
    ) {
      return false;
    }

    const module = this.moduleSlots[fromIndex];

    if (
      !module ||
      this.moduleSlots[toIndex] !== null
    ) {
      return false;
    }

    this.moduleSlots[fromIndex] = null;
    this.moduleSlots[toIndex] = module;

    return true;
  }

  removeModuleAt(slotIndex) {
    if (
      !Number.isInteger(slotIndex) ||
    slotIndex < 0 ||
      slotIndex >= this.moduleSlots.length
    ) {
      return null;
    }

    const module = this.moduleSlots[slotIndex];

    if (!module) {
      return null;
    }

    this.moduleSlots[slotIndex] = null;

    module.uninstall();

    return module;
  }

  removeModule(module) {
    const slotIndex = this.moduleSlots.indexOf(module);

    if (slotIndex === -1) {
      return false;
    }

    return this.removeModuleAt(slotIndex) !== null;
  }
  

  hasModule(moduleId) {
    return this.modules.some(
      module => module.id === moduleId
    );
  }

  release() {
    this.fireMode?.release?.();
  }

  stop() {
    this.fireMode?.stop();
  }

  destroy() {
    this.fireMode?.destroy?.();
  }
}

