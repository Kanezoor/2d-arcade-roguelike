import assert from "node:assert/strict";
import {
  getEnvironmentalObjectSupportRadius,
  pointOverlapsEnvironmentalObject,
  segmentIntersectsEnvironmentalObject,
} from "../world/CoverGeometry.js";

const circle = {
  placement: { x: 100, y: 100, width: 40, height: 40, rotation: 0 },
  definition: { collision: { shape: "circle" } },
};
assert.equal(segmentIntersectsEnvironmentalObject({ x: 0, y: 100 }, { x: 200, y: 100 }, circle), true);
assert.equal(segmentIntersectsEnvironmentalObject({ x: 0, y: 40 }, { x: 200, y: 40 }, circle), false);
assert.equal(pointOverlapsEnvironmentalObject({ x: 119, y: 100 }, 0, circle), true);
assert.equal(pointOverlapsEnvironmentalObject({ x: 130, y: 100 }, 0, circle), false);
assert.equal(getEnvironmentalObjectSupportRadius(circle, 1, 0), 20);

const rotatedWall = {
  placement: { x: 200, y: 200, width: 100, height: 20, rotation: Math.PI / 2 },
  definition: { collision: { shape: "rectangle" } },
};
assert.equal(segmentIntersectsEnvironmentalObject({ x: 200, y: 100 }, { x: 200, y: 300 }, rotatedWall), true);
assert.equal(segmentIntersectsEnvironmentalObject({ x: 140, y: 260 }, { x: 260, y: 260 }, rotatedWall), false);
assert.equal(pointOverlapsEnvironmentalObject({ x: 200, y: 245 }, 0, rotatedWall), true);
assert.ok(Math.abs(getEnvironmentalObjectSupportRadius(rotatedWall, 0, 1) - 50) < 1e-6);

console.log("Cover geometry tests passed (circle and rotated-wall ray tests, point clearance and support projection).");
