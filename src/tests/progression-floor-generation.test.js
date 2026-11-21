import assert from "node:assert/strict";
import FloorGenerator, { deriveFloorSeed } from "../world/FloorGenerator.js";
import FloorModel from "../world/FloorModel.js";
import RunProgressionContext from "../progression/RunProgressionContext.js";
import { createDefaultProgressionProfileRegistry } from "../progression/ProgressionProfileRegistry.js";

const profiles = createDefaultProgressionProfileRegistry();
const earlyContext = new RunProgressionContext({ depth: 1, pathId: "default" });
const earlyA = FloorGenerator.generateForProgression({
  id: "progression-floor-1",
  runSeed: 123456,
  progressionContext: earlyContext,
  profileRegistry: profiles,
  baseGenerationOptions: {
    roomWidth: 800,
    roomHeight: 800,
    // The progression profile must override old archetype shape/size weights.
    roomTemplateWeights: { octagon: 100 },
    roomFootprintWeights: { "2x2": 1 },
    roomSizeWeights: { large: 1 },
  },
});
const earlyB = FloorGenerator.generateForProgression({
  id: "progression-floor-1",
  runSeed: 123456,
  progressionContext: earlyContext,
  profileRegistry: profiles,
  baseGenerationOptions: {
    roomWidth: 800,
    roomHeight: 800,
    roomTemplateWeights: { octagon: 100 },
    roomFootprintWeights: { "2x2": 1 },
    roomSizeWeights: { large: 1 },
  },
});
assert.deepEqual(earlyA.toJSON(), earlyB.toJSON());
assert.equal(earlyA.depth, 1);
assert.equal(earlyA.pathId, "default");
assert.equal(earlyA.generationProfile.stageId, "early");
assert.equal(earlyA.generationProfile.contentPools.enemyPoolId, "basic");
assert.ok([...earlyA.rooms.values()].every(room => (
  ["square", "rectangle"].includes(room.templateId) &&
  room.footprint.width === 1 && room.footprint.height === 1 &&
  room.sizeTier !== "large"
)));

const middle = FloorGenerator.generateForProgression({
  id: "progression-floor-3",
  runSeed: 123456,
  progressionContext: { depth: 3, pathId: "default", modifierIds: [] },
  profileRegistry: profiles,
  baseGenerationOptions: { roomWidth: 800, roomHeight: 800 },
});
const late = FloorGenerator.generateForProgression({
  id: "progression-floor-5",
  runSeed: 123456,
  progressionContext: { depth: 5, pathId: "default", modifierIds: [] },
  profileRegistry: profiles,
  baseGenerationOptions: { roomWidth: 800, roomHeight: 800 },
});
assert.equal(middle.generationProfile.stageId, "middle");
assert.equal(late.generationProfile.stageId, "late");
assert.equal(middle.pathId, "default");
assert.notEqual(earlyA.seed, middle.seed);
assert.notEqual(middle.seed, late.seed);
assert.notEqual(
  deriveFloorSeed(123456, { floorId: "same", depth: 2, pathId: "nature" }),
  deriveFloorSeed(123456, { floorId: "same", depth: 2, pathId: "facility" }),
);

// Exercise the progression profiles across many seeds, including entrance
// validation after the different room-shape and footprint mixes are applied.
for (const depth of [1, 3, 5]) {
  for (let runSeed = 1; runSeed <= 30; runSeed++) {
    const floor = FloorGenerator.generateForProgression({
      id: `profile-depth-${depth}-seed-${runSeed}`,
      runSeed,
      progressionContext: { depth, pathId: "default", modifierIds: [] },
      profileRegistry: profiles,
      baseGenerationOptions: { roomWidth: 800, roomHeight: 800 },
    });
    assert.equal(floor.depth, depth);
    for (const room of floor.rooms.values()) {
      const report = room.validatePortLayout();
      assert.equal(report.valid, true,
        `${room.id} at depth ${depth}: ${JSON.stringify(report.errors)}`);
      if (depth === 1) {
        assert.ok(["square", "rectangle"].includes(room.templateId));
        assert.equal(room.footprint.width, 1);
        assert.equal(room.footprint.height, 1);
        assert.notEqual(room.sizeTier, "large");
        assert.notEqual(room.type, "special");
      }
    }
  }
}

const restored = FloorModel.fromJSON(earlyA.toJSON());
assert.deepEqual(restored.toJSON(), earlyA.toJSON());
assert.equal(restored.generationProfile.id, earlyA.generationProfile.id);

profiles.registerPath({
  id: "overgrown-ruins",
  generationOverrides: {
    roomTemplateWeights: { square: 0, rectangle: 2, diamond: 4, octagon: 1, circle: 0 },
  },
  contentPoolOverrides: { enemyPoolId: "overgrown-enemies" },
});
const pathFloor = FloorGenerator.generateForProgression({
  id: "path-specific-floor",
  runSeed: 123456,
  progressionContext: { depth: 3, pathId: "overgrown-ruins", modifierIds: [] },
  profileRegistry: profiles,
  baseGenerationOptions: { roomWidth: 800, roomHeight: 800 },
});
assert.equal(pathFloor.pathId, "overgrown-ruins");
assert.equal(pathFloor.generationProfile.contentPools.enemyPoolId, "overgrown-enemies");
assert.equal(pathFloor.generationProfile.id, "middle+overgrown-ruins");
assert.ok([...pathFloor.rooms.values()].every(room => room.templateId !== "square"));
assert.ok([...pathFloor.rooms.values()].some(room => room.templateId === "diamond"));

assert.throws(() => FloorGenerator.generateForProgression({
  id: "missing-registry",
  runSeed: 1,
  progressionContext: earlyContext,
}), /profileRegistry/);
assert.throws(() => FloorGenerator.generateForProgression({
  id: "missing-seed",
  progressionContext: earlyContext,
  profileRegistry: profiles,
}), /runSeed/);

console.log("Progression-aware floor generation tests passed (early/middle/late, deterministic seeds and serialization).");
