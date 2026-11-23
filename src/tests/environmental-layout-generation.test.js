import assert from "node:assert/strict";
import FloorGenerator from "../world/FloorGenerator.js";
import FloorModel from "../world/FloorModel.js";
import RunProgressionContext from "../progression/RunProgressionContext.js";
import { createDefaultProgressionProfileRegistry } from "../progression/ProgressionProfileRegistry.js";
import { createDefaultEnvironmentalObjectRegistry } from "../world/EnvironmentalObjectRegistry.js";

const profiles = createDefaultProgressionProfileRegistry();
const objects = createDefaultEnvironmentalObjectRegistry();
const seen = new Set();

for (let seed = 1; seed <= 80; seed++) {
  const floor = FloorGenerator.generateForProgression({
    id: `environment-floor-${seed}`,
    runSeed: seed,
    progressionContext: new RunProgressionContext({ depth: 5, pathId: "default" }),
    profileRegistry: profiles,
    baseGenerationOptions: { roomWidth: 800, roomHeight: 800 },
  });
  for (const room of floor.rooms.values()) {
    const report = room.validateRoomLayout();
    assert.equal(report.valid, true, `${room.id}: ${JSON.stringify(report.errors)}`);
    for (const placement of room.roomLayout.placements) {
      assert.ok(objects.has(placement.definitionId), `missing environmental definition ${placement.definitionId}`);
      seen.add(placement.definitionId);
    }
  }
  const restored = FloorModel.fromJSON(floor.toJSON());
  assert.deepEqual(restored.toJSON(), floor.toJSON(), "layout placements must round-trip with floor saves");
}

for (const required of ["stone_pillar", "wooden_barricade", "stone_wall_segment", "pit", "spike_trap"]) {
  assert.ok(objects.has(required), `missing environmental object definition ${required}`);
}
for (const generated of ["stone_pillar", "wooden_barricade", "stone_wall_segment", "pit", "spike_trap"]) {
  assert.ok(seen.has(generated), `late-game profiles should be able to select ${generated}`);
}

console.log(`Environmental layout generation tests passed (80 late floors; generated: ${[...seen].sort().join(", ")}).`);
