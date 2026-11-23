import assert from "node:assert/strict";

// GameScene and HUDScene extend Phaser.Scene at module evaluation time.
globalThis.Phaser = { Scene: class Scene {} };
const { GameScene } = await import("../GameScene.js");

const scene = Object.create(GameScene.prototype);
scene.isRoomTransitioning = false;
scene.isGameOver = false;
scene.player = {
  sprite: {},
  received: [],
  takeDamage(context) {
    this.received.push(context);
    return false;
  },
};
scene.time = { now: 1000 };
scene.matter = { world: { pause() { throw new Error("world should not pause for non-lethal test damage"); } } };

let projectileDestroyed = false;
const projectile = {
  active: true,
  projectile: {},
  destroy() { projectileDestroyed = true; this.active = false; },
};
const solidCover = { environmentalObject: { blocksProjectiles: true } };
scene.handleMatterCollision({ bodyA: { gameObject: projectile }, bodyB: { gameObject: solidCover } });
assert.equal(projectileDestroyed, true, "projectiles should be consumed by solid cover");

const hazard = {
  x: 240,
  y: 260,
  environmentalObject: {
    hazard: { damage: 8, cooldownMs: 900, affects: ["player"] },
    lastContactAt: new WeakMap(),
  },
};
scene.handleMatterCollision({ bodyA: { gameObject: scene.player.sprite }, bodyB: { gameObject: hazard } });
assert.equal(scene.player.received.length, 1);
assert.equal(scene.player.received[0].target, scene.player);
assert.equal(scene.player.received[0].baseDamage, 8);

scene.time.now = 1400;
scene.handleMatterCollision({ bodyA: { gameObject: scene.player.sprite }, bodyB: { gameObject: hazard } });
assert.equal(scene.player.received.length, 1, "hazard should respect per-target contact cooldown");

scene.time.now = 2000;
scene.handleMatterCollision({ bodyA: { gameObject: scene.player.sprite }, bodyB: { gameObject: hazard } });
assert.equal(scene.player.received.length, 2, "hazard should be able to damage after its cooldown");

const inertSensor = {
  environmentalObject: {
    hazard: { damage: 0, cooldownMs: 0, affects: ["player"] },
    lastContactAt: new WeakMap(),
  },
};
scene.handleMatterCollision({ bodyA: { gameObject: scene.player.sprite }, bodyB: { gameObject: inertSensor } });
assert.equal(scene.player.received.length, 2, "zero-damage sensors should not affect the player");

console.log("Environmental collision routing tests passed (projectile blocking, hazard damage and contact cooldown).");
