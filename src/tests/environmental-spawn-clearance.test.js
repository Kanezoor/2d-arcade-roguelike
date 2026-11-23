import assert from "node:assert/strict";
import { isSpawnPositionClear } from "../managers/EnemyManager.js";

const blocking = {
  environmentalObject: { blocksMovement: true },
  getBounds: () => ({ x: 100, y: 100, width: 80, height: 80 }),
};
const pit = {
  environmentalObject: { blocksMovement: false },
  getBounds: () => ({ x: 200, y: 200, width: 100, height: 100 }),
};
const scene = { roomManager: { roomEnvironment: { getGameObjects: () => [blocking, pit] } } };

assert.equal(isSpawnPositionClear(scene, 140, 140, 20), false, "enemy should not spawn inside solid cover");
assert.equal(isSpawnPositionClear(scene, 90, 140, 20), false, "enemy should keep clearance from solid cover");
assert.equal(isSpawnPositionClear(scene, 240, 240, 20), true, "sensor hazards should not be treated as solid spawn blockers");
assert.equal(isSpawnPositionClear(scene, 400, 400, 20), true);
assert.equal(isSpawnPositionClear({ roomManager: {} }, 400, 400), true);

console.log("Environmental spawn clearance tests passed (solid objects block spawns; sensor hazards do not).");
