import DamageType  from "./DamageType.js";

export default class DamageContext {
  constructor({
    source,
    target,
    baseDamage,
    type = DamageType.PHYSICAL,
    critical = false,
    hitX = null,
    hitY = null,
    knockBackStrength = 0,
  }) {
    this.source = source;
    this.target = target;
    this.baseDamage = baseDamage;
    this.type = type;
    this.critical = critical;
    this.hitX = hitX;
    this.hitY = hitY;
    this.knockbackStrength = knockBackStrength;
  }
}