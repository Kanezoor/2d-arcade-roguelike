import DamageType  from "./DamageType.js";

export default class DamageContext {
  constructor({
    source,
    target,
    baseDamage,
    type = DamageType.PHYSICAL,
    critical = false,
  }) {
    this.source = source;
    this.target = target;
    this.baseDamage = baseDamage;
    this.type = type;
    this.critical = critical;
  }
}