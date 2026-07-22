import basicGun from "./definitions/basicGun.js";

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
    this.description = definition.definition;
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
}