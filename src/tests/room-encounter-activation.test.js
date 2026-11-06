import assert from "node:assert/strict";
import { updateEnemies } from "../managers/EnemyManager.js";

const velocities = [];
const sprites = [
  { enemy: { behavior: "chase" }, setVelocity: (x, y) => velocities.push([x, y]) },
  { enemy: { behavior: "charger" }, setVelocity: (x, y) => velocities.push([x, y]) },
];

// Dormant encounters must not run any enemy behavior and must keep all enemy
// bodies stationary until RoomManager activates combat at the inner threshold.
updateEnemies({
  roomManager: { isEncounterActive: false },
  enemies: { getChildren: () => sprites },
});
assert.deepEqual(velocities, [[0, 0], [0, 0]]);

// Existing behavior remains available once the encounter is active.
globalThis.Phaser = {
  Math: {
    Angle: {
      Between(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
    },
  },
};
const activeEnemy = {
  x: 0,
  y: 0,
  enemy: {
    behavior: "chase",
    state: "chase",
    speed: 2,
    kbX: 0,
    kbY: 0,
  },
  setVelocity(x, y) { this.velocity = { x, y }; },
};
const activeScene = {
  roomManager: { isEncounterActive: true },
  player: { sprite: { x: 100, y: 100 } },
  time: { now: 0 },
  enemies: {
    getChildren: () => [activeEnemy],
  },
};
updateEnemies(activeScene);
assert.ok(activeEnemy.velocity.x > 0);
assert.ok(activeEnemy.velocity.y > 0);

console.log("Room encounter activation tests passed (dormant and active AI states).");
