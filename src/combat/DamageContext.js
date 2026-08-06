import DamageType  from "./DamageType.js";

export default class DamageContext {
  constructor({
    source,
    target,
    amount,
    type = DamageType.PHYSICAL,
    critical = false,
  }) {
    this.source = source;
    this.target = target;
    this.amount = amount;
    this.type = type;
    this.critical = critical;
  }
}