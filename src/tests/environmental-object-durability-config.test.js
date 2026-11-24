import assert from "node:assert/strict";
import EnvironmentalObjectRegistry, { createDefaultEnvironmentalObjectRegistry } from "../world/EnvironmentalObjectRegistry.js";

const registry = createDefaultEnvironmentalObjectRegistry();
for (const id of ["stone_pillar", "wooden_barricade", "stone_wall_segment"]) {
  const definition = registry.get(id);
  assert.ok(definition.destructible, `${id} should be destructible`);
  assert.ok(definition.destructible.maxHealth > 0);
  assert.ok(definition.destructible.damageMultipliers.kinetic > 0);
}
assert.equal(registry.get("pit").destructible, null, "pit hazards remain indestructible");
assert.equal(registry.get("spike_trap").destructible, null, "spike hazards remain indestructible");
assert.ok(registry.get("stone_pillar").destructible.damageMultipliers.laser < registry.get("stone_pillar").destructible.damageMultipliers.kinetic);

assert.throws(() => new EnvironmentalObjectRegistry({ definitions: [{
  id: "bad", visual: {}, collision: {}, destructible: { maxHealth: 0 },
}] }), /maxHealth/);
assert.throws(() => new EnvironmentalObjectRegistry({ definitions: [{
  id: "bad", visual: {}, collision: {}, destructible: { maxHealth: 10, damageMultipliers: { kinetic: -1 } },
}] }), /damage multiplier/);

console.log("Environmental durability configuration tests passed (material durability, hazard immunity and schema validation).");
