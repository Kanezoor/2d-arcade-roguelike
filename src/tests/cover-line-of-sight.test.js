import assert from "node:assert/strict";
import RoomEnvironmentRuntime from "../world/RoomEnvironmentRuntime.js";
import { createDefaultEnvironmentalObjectRegistry } from "../world/EnvironmentalObjectRegistry.js";

class FakeObject {
  constructor(x, y, width, height) { Object.assign(this, { x, y, width, height, active: true }); }
  setStrokeStyle() { return this; }
  setDepth() { return this; }
  setRotation(value) { this.rotation = value; return this; }
  destroy() { this.active = false; }
}
const scene = {
  add: { rectangle: (x, y, w, h) => new FakeObject(x, y, w, h), ellipse: (x, y, w, h) => new FakeObject(x, y, w, h) },
  matter: { add: { gameObject: object => { object.body = { isSensor: false }; return object; } } },
};
const room = {
  id: "cover-los-room", shape: "rectangle", width: 800, height: 800,
  roomLayout: { placements: [
    { id: "wall", definitionId: "stone_wall_segment", x: 400, y: 400, width: 140, height: 28, rotation: Math.PI / 4 },
    { id: "pit", definitionId: "pit", x: 250, y: 250, width: 100, height: 100, rotation: 0 },
  ] },
};
const runtime = new RoomEnvironmentRuntime(scene, room, { registry: createDefaultEnvironmentalObjectRegistry() });
assert.equal(runtime.hasLineOfSight({ x: 300, y: 300 }, { x: 500, y: 500 }), false, "rotated solid wall should block line of sight");
assert.equal(runtime.hasLineOfSight({ x: 300, y: 200 }, { x: 500, y: 200 }), true, "clear path should remain visible");
assert.equal(runtime.hasLineOfSight({ x: 200, y: 250 }, { x: 300, y: 250 }), true, "non-blocking pit sensor should not block sight");
assert.equal(runtime.isPositionClear(400, 400, 10), false, "solid wall should block a candidate position");
assert.equal(runtime.isPositionClear(250, 250, 10), true, "non-blocking pit should not block enemy positioning");
runtime.destroy();
console.log("Cover line-of-sight tests passed (rotated walls block, open paths and floor sensors do not).");
