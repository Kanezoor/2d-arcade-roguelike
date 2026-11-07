import assert from "node:assert/strict";
import FloorGenerator from "../world/FloorGenerator.js";
import FloorModel from "../world/FloorModel.js";
import { registerRoomTemplate } from "../world/RoomTemplateRegistry.js";

const equalWeights = {
  square: 1,
  rectangle: 1,
  diamond: 1,
  circle: 1,
  octagon: 1,
};

// A configured seed and weight map must produce an identical saved floor.
const first = FloorGenerator.generate({
  id: "weighted-deterministic",
  seed: "weighted-selection-seed",
  roomCount: 15,
  roomTemplateWeights: equalWeights,
});
const second = FloorGenerator.generate({
  id: "weighted-deterministic",
  seed: "weighted-selection-seed",
  roomCount: 15,
  roomTemplateWeights: {
    octagon: 1,
    circle: 1,
    diamond: 1,
    rectangle: 1,
    square: 1,
  },
});
assert.deepEqual(first.toJSON(), second.toJSON());

// Fixed-shape callers remain backwards compatible when no weight map is given.
const fixed = FloorGenerator.generate({
  id: "fixed-shape-compatibility",
  seed: 77,
  roomCount: 12,
  roomShape: "rectangle",
});
assert.ok([...fixed.rooms.values()].every(room => room.templateId === "rectangle"));

// Zero-weight templates are excluded and a single positive weight is deterministic.
const diamondOnly = FloorGenerator.generate({
  id: "diamond-only",
  seed: 991,
  roomCount: 12,
  roomTemplateWeights: { square: 0, rectangle: 0, diamond: 1, circle: 0, octagon: 0 },
});
assert.ok([...diamondOnly.rooms.values()].every(room => room.templateId === "diamond"));
for (const room of diamondOnly.rooms.values()) {
  assert.equal(room.validatePortLayout().valid, true,
    `${room.id}: ${JSON.stringify(room.validatePortLayout().errors)}`);
}

// A mixed weighted pool must use every built-in shape over a sample of floors,
// while every generated port layout remains valid.
const observed = new Set();
const distribution = {};
for (let seed = 1; seed <= 100; seed++) {
  const floor = FloorGenerator.generate({
    id: `mixed-template-floor-${seed}`,
    seed,
    roomCount: 15,
    roomTemplateWeights: {
      rectangle: 5,
      square: 3,
      octagon: 2,
      diamond: 2,
      circle: 1,
    },
  });
  for (const room of floor.rooms.values()) {
    observed.add(room.templateId);
    distribution[room.templateId] = (distribution[room.templateId] ?? 0) + 1;
    const report = room.validatePortLayout();
    assert.equal(report.valid, true,
      `${room.id} (${room.templateId}): ${JSON.stringify(report.errors)}`);
  }

  const restored = FloorModel.fromJSON(floor.toJSON());
  assert.deepEqual(restored.toJSON(), floor.toJSON());
}
assert.deepEqual([...observed].sort(), ["circle", "diamond", "octagon", "rectangle", "square"]);
const expectedCounts = { rectangle: 500, square: 300, octagon: 200, diamond: 200, circle: 100 };
for (const [templateId, expectedCount] of Object.entries(expectedCounts)) {
  const actualCount = distribution[templateId] ?? 0;
  assert.ok(actualCount >= expectedCount * 0.7 && actualCount <= expectedCount * 1.3,
    `${templateId} weighted frequency outside tolerance: ${actualCount} vs ${expectedCount}`);
}

// Custom registered templates participate in the same weighted selection API.
registerRoomTemplate({
  id: "test-chamfered-template",
  shape: "chamfered-rectangle",
  outlineGenerator: ({ width, height }) => {
    const cut = Math.min(width, height) * 0.18;
    return [
      { x: cut, y: 0 },
      { x: width - cut, y: 0 },
      { x: width, y: cut },
      { x: width, y: height - cut },
      { x: width - cut, y: height },
      { x: cut, y: height },
      { x: 0, y: height - cut },
      { x: 0, y: cut },
    ];
  },
});
const customFloor = FloorGenerator.generate({
  id: "custom-template-floor",
  seed: 12,
  roomCount: 10,
  roomTemplateWeights: { "test-chamfered-template": 1 },
});
assert.ok([...customFloor.rooms.values()].every(room => room.templateId === "test-chamfered-template"));
for (const room of customFloor.rooms.values()) {
  assert.equal(room.validatePortLayout().valid, true,
    `${room.id}: ${JSON.stringify(room.validatePortLayout().errors)}`);
}

// Invalid configuration should fail clearly before generation.
assert.throws(
  () => FloorGenerator.generate({ roomTemplateWeights: { missing: 1 } }),
  /Unknown room template/
);
assert.throws(
  () => FloorGenerator.generate({ roomTemplateWeights: { square: -1 } }),
  /non-negative number/
);
assert.throws(
  () => FloorGenerator.generate({ roomTemplateWeights: { square: 0 } }),
  /at least one template with a positive weight/
);
assert.throws(
  () => FloorGenerator.generate({ roomTemplateWeights: [] }),
  /must be an object/
);

console.log("Room template selection tests passed (determinism, weighted mixes, custom templates, and 100 floors).");
