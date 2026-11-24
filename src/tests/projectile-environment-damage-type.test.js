import assert from "node:assert/strict";
import Projectile from "../entities/Projectile.js";
import DamageType from "../combat/DamageType.js";

globalThis.Phaser = { Math: { Clamp: (value, min, max) => Math.max(min, Math.min(max, value)) } };
function makeScene() {
  const group = { add() {} };
  return {
    projectiles: group,
    matter: {
      add: {
        sprite() {
          return {
            setFixedRotation() {},
            setVelocity(x, y) { this.velocity = { x, y }; },
          };
        },
      },
    },
  };
}
const owner = { hasPassive: () => false };
const standard = new Projectile(makeScene(), 10, 20, "bullet", 1, 5, 0, 100, 1000, owner, "player");
assert.equal(standard.damageType, DamageType.KINETIC, "ordinary player projectiles should default to kinetic damage");
assert.equal(standard.sprite.damageType, DamageType.KINETIC);
const custom = new Projectile(makeScene(), 10, 20, "bullet", 1, 5, 0, 100, 1000, owner, "player", 0, 0, 0, 0.85, DamageType.FIRE);
assert.equal(custom.damageType, DamageType.FIRE, "future weapon definitions can override environmental damage type");
console.log("Projectile environmental damage type tests passed (kinetic default and typed override).");
