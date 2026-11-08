import assert from "node:assert/strict";
import FloorGenerator from "../world/FloorGenerator.js";
import FloorModel from "../world/FloorModel.js";
import RoomDefinition from "../world/RoomDefinition.js";

const footprintWeights = {
  "1x1": 8,
  "2x1": 2,
  "1x2": 2,
  "2x2": 1,
};
const sizeWeights = { small: 1, medium: 5, large: 2 };

const first = FloorGenerator.generate({
  id: "footprint-determinism",
  seed: "multi-cell-seed",
  roomFootprintWeights: footprintWeights,
  roomSizeWeights: sizeWeights,
});
const second = FloorGenerator.generate({
  id: "footprint-determinism",
  seed: "multi-cell-seed",
  roomFootprintWeights: footprintWeights,
  roomSizeWeights: sizeWeights,
});
assert.deepEqual(first.toJSON(), second.toJSON());

let sawMultiCell = false;
const footprintCounts = new Map();
const sizeTierCounts = new Map();
for (let seed = 1; seed <= 100; seed++) {
  const floor = FloorGenerator.generate({
    id: `footprint-floor-${seed}`,
    seed,
    roomFootprintWeights: footprintWeights,
    roomSizeWeights: sizeWeights,
  });

  const occupied = new Map();
  for (const room of floor.rooms.values()) {
    const { x, y } = room.gridPosition;
    const { width, height } = room.footprint;
    assert.ok(x + width <= floor.gridWidth, `${room.id} exceeds grid width`);
    assert.ok(y + height <= floor.gridHeight, `${room.id} exceeds grid height`);
    assert.equal(room.width, 800 * width * room.sizeScale);
    assert.equal(room.height, 800 * height * room.sizeScale);

    const footprintKey = `${width}x${height}`;
    footprintCounts.set(footprintKey, (footprintCounts.get(footprintKey) ?? 0) + 1);
    sizeTierCounts.set(room.sizeTier, (sizeTierCounts.get(room.sizeTier) ?? 0) + 1);
    if (width > 1 || height > 1) sawMultiCell = true;

    for (let cy = y; cy < y + height; cy++) {
      for (let cx = x; cx < x + width; cx++) {
        const key = `${cx},${cy}`;
        assert.ok(!occupied.has(key), `Room footprints overlap at ${key}`);
        occupied.set(key, room.id);
      }
    }

    // Entrance width and geometry must remain valid at every generated size.
    room.assertValidPortLayout();
    const shouldFollow = width > 1 || height > 1 || room.sizeTier === "large";
    assert.equal(room.cameraMode, shouldFollow ? "follow" : "fixed");
  }

  // The existing graph remains connected and all direct graph edges retain
  // their original anchor-cell adjacency, even when footprints are larger.
  for (const connection of floor.connections) {
    const a = floor.getRoomDefinition(connection.roomAId);
    const b = floor.getRoomDefinition(connection.roomBId);
    const dx = b.gridPosition.x - a.gridPosition.x;
    const dy = b.gridPosition.y - a.gridPosition.y;
    const expected = dx === 1 && dy === 0 ? "east"
      : dx === -1 && dy === 0 ? "west"
      : dx === 0 && dy === 1 ? "south"
      : dx === 0 && dy === -1 ? "north" : null;
    assert.equal(connection.directionFromA, expected);
  }
}
assert.ok(sawMultiCell, "Expected at least one generated multi-cell room across 100 seeds.");
for (const tier of ["small", "medium", "large"]) {
  assert.ok(sizeTierCounts.get(tier) > 0, `Expected at least one ${tier} room.`);
}
assert.ok(footprintCounts.get("1x1") > 0);

// Omitting size/footprint weights preserves the previous fixed-size behaviour.
const legacy = FloorGenerator.generate({ id: "legacy-fixed-size", seed: 12345 });
for (const room of legacy.rooms.values()) {
  assert.deepEqual(room.footprint, { width: 1, height: 1 });
  assert.equal(room.sizeTier, "medium");
  assert.equal(room.sizeScale, 1);
  assert.equal(room.width, 800);
  assert.equal(room.height, 800);
  assert.equal(room.cameraMode, "fixed");
}

// Footprint metadata and camera mode survive floor serialization.
const restored = FloorModel.fromJSON(first.toJSON());
assert.deepEqual(restored.toJSON(), first.toJSON());

const manualLargeRoom = new RoomDefinition({
  id: "manual-large",
  gridPosition: { x: 0, y: 0 },
  footprint: { width: 2, height: 1 },
  width: 1600,
  height: 800,
});
assert.equal(manualLargeRoom.cameraMode, "follow");
assert.throws(() => new RoomDefinition({
  id: "bad-size-tier",
  gridPosition: { x: 0, y: 0 },
  sizeTier: "gigantic",
}), /Unsupported room size tier/);
assert.throws(() => FloorGenerator.generate({
  roomFootprintWeights: { "2by1": 1 },
}), /Invalid room footprint key/);
assert.throws(() => FloorGenerator.generate({
  roomSizeWeights: { tiny: 1 },
}), /Unknown room size tier/);

console.log("Room footprint variation tests passed (100 floors, grid occupancy, ports, camera modes, and round-trip).");
