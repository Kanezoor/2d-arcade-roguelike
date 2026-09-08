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
    hitReactionDistance = 0,
    hitPushDuration = 0,
    hitStunDuration = 0,
  }) {
    this.source = source;
    this.target = target;
    this.baseDamage = baseDamage;
    this.type = type;
    this.critical = critical;
    this.hitX = hitX;
    this.hitY = hitY;
    this.knockbackStrength = knockBackStrength;
    this.hitReactionDistance = hitReactionDistance;
    this.hitStunDuration = hitStunDuration;
    this.hitPushDuration = hitPushDuration;
  }
}