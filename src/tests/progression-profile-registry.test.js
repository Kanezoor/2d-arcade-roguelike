import assert from "node:assert/strict";
import RunProgressionContext from "../progression/RunProgressionContext.js";
import ProgressionProfileRegistry, {
  createDefaultProgressionProfileRegistry,
} from "../progression/ProgressionProfileRegistry.js";

const registry = createDefaultProgressionProfileRegistry();
const early = registry.resolve(new RunProgressionContext({ depth: 1 }).toJSON());
const middle = registry.resolve({ depth: 3, pathId: "default", modifierIds: [] });
const late = registry.resolve({ depth: 6, pathId: "default", modifierIds: [] });

assert.equal(early.stageId, "early");
assert.equal(middle.stageId, "middle");
assert.equal(late.stageId, "late");
assert.deepEqual(early.generationOptions.roomTemplateWeights, {
  square: 8, rectangle: 2, diamond: 0, octagon: 0, circle: 0,
});
assert.deepEqual(early.generationOptions.roomFootprintWeights, { "1x1": 1 });
assert.equal(early.contentPools.enemyPoolId, "basic");
assert.equal(early.difficulty.encounterBudget, 10);
assert.ok(middle.difficulty.encounterBudget > early.difficulty.encounterBudget);
assert.ok(late.difficulty.encounterBudget > middle.difficulty.encounterBudget);

// Paths and modifiers are overlays, not separate generator implementations.
const custom = new ProgressionProfileRegistry({
  stages: [{
    id: "test-stage",
    minDepth: 1,
    maxDepth: null,
    generationOptions: { roomTemplateWeights: { square: 8, rectangle: 2 } },
    contentPools: { enemyPoolId: "base", rewardPoolId: "base-rewards" },
    difficulty: { encounterBudgetBase: 10, encounterBudgetPerDepth: 1 },
  }],
  paths: [
    { id: "default" },
    {
      id: "nature",
      generationOverrides: { roomTemplateWeights: { square: 0, diamond: 5 } },
      contentPoolOverrides: { enemyPoolId: "nature-enemies" },
      difficultyOverrides: { encounterBudgetBase: 12 },
    },
  ],
  modifiers: [{
    id: "hazardous",
    contentPoolOverrides: { obstaclePoolId: "hazardous" },
    difficultyOverrides: { encounterBudgetPerDepth: 3 },
  }],
});
const resolved = custom.resolve({
  depth: 2,
  pathId: "nature",
  modifierIds: ["hazardous"],
});
assert.deepEqual(resolved.generationOptions.roomTemplateWeights, {
  square: 0,
  rectangle: 2,
  diamond: 5,
});
assert.equal(resolved.contentPools.enemyPoolId, "nature-enemies");
assert.equal(resolved.contentPools.obstaclePoolId, "hazardous");
assert.equal(resolved.difficulty.encounterBudget, 15);
assert.deepEqual(resolved.modifierIds, ["hazardous"]);

assert.throws(() => registry.resolve({ depth: 0 }), /positive integer/);
assert.throws(() => registry.resolve({ depth: 1, pathId: "missing", modifierIds: [] }), /Unknown progression path/);
assert.throws(() => registry.resolve({ depth: 1, pathId: "default", modifierIds: ["missing"] }), /Unknown run modifier/);
assert.throws(() => new ProgressionProfileRegistry({
  stages: [
    { id: "one", minDepth: 1, maxDepth: 3 },
    { id: "two", minDepth: 3, maxDepth: null },
  ],
}), /overlap/);

const context = RunProgressionContext.fromJSON({
  depth: 4,
  pathId: "nature",
  modifierIds: ["hazardous", "hazardous"],
});
assert.deepEqual(context.toJSON(), {
  depth: 4,
  pathId: "nature",
  modifierIds: ["hazardous"],
});
context.setLocation(5, "facility");
context.setModifierIds(["elite"]);
assert.deepEqual(context.toJSON(), { depth: 5, pathId: "facility", modifierIds: ["elite"] });
assert.throws(() => new RunProgressionContext({ depth: 0 }), /positive integer/);
assert.throws(() => new RunProgressionContext({ pathId: "" }), /non-empty string/);

console.log("Progression profile registry tests passed (stages, paths, modifiers and context validation).");
