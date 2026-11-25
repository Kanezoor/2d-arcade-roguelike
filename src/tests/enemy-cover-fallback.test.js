import assert from "node:assert/strict";
import { updateEnemies } from "../managers/EnemyManager.js";
import Enemy from "../entities/Enemy.js";

const previousPhaser = globalThis.Phaser;
globalThis.Phaser = {
  Math: {
    Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) },
    Angle: { Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1) },
  },
};

const sprite = {
  x: 700,
  y: 400,
  active: true,
  velocity: { x: 0, y: 0 },
  setVelocity(x, y) { this.velocity = { x, y }; return this; },
};
const enemy = {
  usesCover: true,
  isDead: false,
  sprite,
  speed: 3,
  preferredDistance: 250,
  state: "kite",
  behavior: "ranged",
  lastBurst: 0,
  burstCooldown: 1500,
  coverAIState: "searching",
  coverPlan: null,
  coverAIConfig: {
    enemyRadius: 18, clearance: 16, peekClearance: 22, arrivalDistance: 14,
    hideDurationMs: 650, searchRetryMs: 1100, burstShots: 2, burstDelayMs: 180,
  },
};
sprite.enemy = enemy;
const scene = {
  player: { sprite: { x: 200, y: 400 } },
  roomManager: {
    isEncounterActive: true,
    roomEnvironment: { findCoverPosition: () => null },
  },
  enemies: { getChildren: () => [sprite] },
  time: { now: 100 },
  game: { loop: { delta: 16 } },
};
updateEnemies(scene);
assert.ok(sprite.velocity.x < 0, "ranged enemy should return to its existing kite movement when no cover is available");
assert.equal(enemy.coverAIState, "fallback");

const blockedEnemy = {
  sprite: { x: 500, y: 400 },
  damage: 8,
  scene: {
    player: { sprite: { x: 200, y: 400 } },
    roomManager: { roomEnvironment: { hasLineOfSight: () => false } },
  },
};
assert.equal(Enemy.prototype.fireBurstShot.call(blockedEnemy), false, "enemy burst fire must not pass through solid cover");

globalThis.Phaser = previousPhaser;
console.log("Enemy cover fallback tests passed (legacy kite behavior without cover and blocked enemy line of fire).");
