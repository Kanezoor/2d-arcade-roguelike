import assert from "node:assert/strict";
import FloorGenerator from "../world/FloorGenerator.js";
import FloorModel from "../world/FloorModel.js";
import RunProgressionContext from "../progression/RunProgressionContext.js";
import { createDefaultProgressionProfileRegistry } from "../progression/ProgressionProfileRegistry.js";
import { createDefaultRoomLayoutRegistry } from "../world/RoomLayoutRegistry.js";

const profiles = createDefaultProgressionProfileRegistry();
const layouts = createDefaultRoomLayoutRegistry();

function generate(depth, runSeed, pathId = "default") {
  return FloorGenerator.generateForProgression({
    id: `layout-floor-${depth}`,
    runSeed,
    progressionContext: new RunProgressionContext({ depth, pathId }),
    profileRegistry: profiles,
    roomLayoutRegistry: layouts,
    baseGenerationOptions: { roomWidth: 800, roomHeight: 800 },
  });
}

const earlyA = generate(1, 123456);
const earlyB = generate(1, 123456);
assert.deepEqual(earlyA.toJSON(), earlyB.toJSON(), "room layouts must be deterministic for a run/floor/room seed");
assert.ok([...earlyA.rooms.values()].every(room => room.roomLayout), "every room must have a layout assignment");
assert.ok([...earlyA.rooms.values()].every(room => room.roomLayout.poolId === "starter"));
assert.ok([...earlyA.rooms.values()].some(room => room.roomLayout.placements.length === 0), "empty layouts must be assigned");
for (const room of earlyA.rooms.values()) {
  assert.equal(room.validateRoomLayout().valid, true, `${room.id}: ${JSON.stringify(room.validateRoomLayout().errors)}`);
  assert.ok(room.roomLayout.layoutId);
  assert.ok(room.roomLayout.variantId);
  assert.ok(Number.isInteger(room.roomLayout.seed));
}

const middle = generate(3, 123456);
const late = generate(5, 123456);
assert.ok([...middle.rooms.values()].every(room => room.roomLayout.poolId === "intermediate"));
assert.ok([...late.rooms.values()].every(room => room.roomLayout.poolId === "complex"));
assert.ok([...earlyA.rooms.values()].every(room => room.roomLayout.layoutId !== "dense_cover"));


// Exercise the room-layout validator across all three default progression pools
// and varied templates/directions. This is data-level integration, not Phaser rendering.
for (const depth of [1, 3, 5]) {
  for (let runSeed = 1; runSeed <= 40; runSeed++) {
    const floor = generate(depth, runSeed);
    for (const room of floor.rooms.values()) {
      assert.ok(room.roomLayout, `missing layout assignment for ${room.id}`);
      const report = room.validateRoomLayout();
      assert.equal(report.valid, true,
        `${room.id} depth ${depth} seed ${runSeed}: ${JSON.stringify(report.errors)}`);
    }
  }
}

const restored = FloorModel.fromJSON(earlyA.toJSON());
assert.deepEqual(restored.toJSON(), earlyA.toJSON(), "room layout assignments must survive floor save/load");
for (const room of restored.rooms.values()) {
  assert.equal(room.validateRoomLayout().valid, true);
}

const legacyFloor = FloorGenerator.generate({
  id: "layout-legacy-generator",
  seed: 444,
  roomCount: 10,
  minMainPathRooms: 7,
  maxMainPathRooms: 8,
  roomWidth: 800,
  roomHeight: 800,
});
assert.ok([...legacyFloor.rooms.values()].every(room => room.roomLayout), "legacy generate() calls also receive the default starter layout pool");

profiles.registerPath({
  id: "layout-test-path",
  contentPoolOverrides: { roomLayoutPoolId: "complex", obstaclePoolId: "dangerous" },
});
const pathFloor = FloorGenerator.generateForProgression({
  id: "layout-path-floor",
  runSeed: 88,
  progressionContext: { depth: 5, pathId: "layout-test-path", modifierIds: [] },
  profileRegistry: profiles,
  roomLayoutRegistry: layouts,
  baseGenerationOptions: { roomWidth: 800, roomHeight: 800 },
});
assert.ok([...pathFloor.rooms.values()].every(room => room.roomLayout.poolId === "complex"));

console.log("Room layout generation tests passed (per-room assignment, progression pools, deterministic seeds and save/load).");
