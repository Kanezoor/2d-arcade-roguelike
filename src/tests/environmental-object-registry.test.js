import assert from "node:assert/strict";
import EnvironmentalObjectRegistry, {
  createDefaultEnvironmentalObjectRegistry,
} from "../world/EnvironmentalObjectRegistry.js";

const registry = createDefaultEnvironmentalObjectRegistry();
for (const id of ["stone_pillar", "wooden_barricade", "stone_wall_segment", "pit", "spike_trap"]) {
  assert.equal(registry.has(id), true, `missing definition ${id}`);
  assert.equal(registry.get(id).id, id);
}

const pillar = registry.get("stone_pillar");
assert.equal(pillar.collision.mode, "solid");
assert.equal(pillar.collision.blocksMovement, true);
assert.equal(pillar.collision.blocksProjectiles, true);
assert.equal(pillar.collision.shape, "circle");

const pit = registry.get("pit");
assert.equal(pit.collision.mode, "sensor");
assert.equal(pit.collision.blocksMovement, false);
assert.equal(pit.hazard.damage, 8);
assert.ok(pit.hazard.affects.includes("player"));

assert.throws(() => new EnvironmentalObjectRegistry({ definitions: [{ id: "bad", collision: { mode: "unknown" } }] }), /unsupported collision mode/);
assert.throws(() => new EnvironmentalObjectRegistry({ definitions: [{ id: "bad", hazard: { damage: -1 } }] }), /invalid hazard configuration/);
assert.throws(() => new EnvironmentalObjectRegistry({ definitions: [{ id: "bad", visual: { alpha: 2 } }] }), /invalid visual/);

const custom = new EnvironmentalObjectRegistry({ definitions: [
  { id: "custom-cover", visual: { shape: "rectangle" }, collision: { mode: "solid" } },
] });
const serialized = custom.toJSON();
assert.deepEqual(serialized[0], custom.get("custom-cover"));
serialized[0].visual.fillColor = 0;
assert.notEqual(custom.get("custom-cover").visual.fillColor, 0, "registry should return defensive copies");

console.log("Environmental object registry tests passed (solid cover, sensor hazards, schema validation and serialization).");
