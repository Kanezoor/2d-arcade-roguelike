import assert from "node:assert/strict";
import { getBeamEndPoint } from "../entities/Beam.js";

function obstacle(x, y, width, height, blocksProjectiles = true, active = true) {
  return {
    active,
    environmentalObject: { blocksProjectiles },
    getBounds: () => ({ x, y, width, height }),
  };
}

const wall = obstacle(100, 40, 20, 20);
const result = getBeamEndPoint(0, 50, 0, 300, [wall]);
assert.equal(result.blockingObject, wall);
assert.ok(result.x >= 97 && result.x <= 99, `beam should stop just before wall, got ${result.x}`);
assert.equal(result.y, 50);

const pit = obstacle(40, 40, 20, 20, false);
const behindWall = obstacle(200, 40, 20, 20);
const ignored = obstacle(30, 40, 10, 20, true, false);
const combined = getBeamEndPoint(0, 50, 0, 300, [pit, behindWall, ignored]);
assert.equal(combined.blockingObject, behindWall, "hazards and inactive objects should not block beams");

const miss = getBeamEndPoint(0, 0, 0, 300, [wall]);
assert.equal(miss.blockingObject, null);
assert.equal(miss.x, 300);

const diagonal = getBeamEndPoint(0, 0, Math.PI / 4, 300, [obstacle(95, 95, 20, 20)]);
assert.ok(diagonal.blockingObject, "diagonal beam should be clipped by an intersecting wall");
assert.ok(diagonal.distance < 150);

console.log("Beam/environment blocking tests passed (nearest obstacle, inactive/hazard exclusions, miss and diagonal ray).");
