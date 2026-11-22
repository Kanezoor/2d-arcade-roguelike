import assert from "node:assert/strict";
import RoomDefinition from "../world/RoomDefinition.js";
import RoomLayoutRegistry, { createDefaultRoomLayoutRegistry } from "../world/RoomLayoutRegistry.js";

function room(overrides = {}) {
  return new RoomDefinition({
    id: "registry-room",
    gridPosition: { x: 1, y: 1 },
    type: "combat",
    templateId: "square",
    sizeTier: "medium",
    width: 800,
    height: 800,
    ports: [
      { id: "north", direction: "north", anchor: { x: 400, y: 0 }, outwardNormal: { x: 0, y: -1 } },
      { id: "east", direction: "east", anchor: { x: 800, y: 400 }, outwardNormal: { x: 1, y: 0 } },
    ],
    ...overrides,
  });
}

const registry = createDefaultRoomLayoutRegistry();
assert.equal(registry.hasPool("starter"), true);
assert.equal(registry.hasPool("intermediate"), true);
assert.equal(registry.hasPool("complex"), true);
assert.ok(registry.listPool("starter").some(layout => layout.id === "open_basic"));

const first = registry.selectForRoom(room(), { poolId: "starter", obstaclePoolId: "minimal", seed: 12345 });
const repeated = registry.selectForRoom(room(), { poolId: "starter", obstaclePoolId: "minimal", seed: 12345 });
assert.deepEqual(first, repeated, "same room seed and pool must produce the same assignment");
assert.ok(first.layoutId);
assert.ok(Array.isArray(first.placements));
assert.equal(first.poolId, "starter");

const shop = registry.selectForRoom(room({ type: "shop" }), {
  poolId: "complex", obstaclePoolId: "dangerous", seed: 9876,
});
assert.equal(shop.layoutId, "open_basic", "non-combat room types should receive the open layout");
assert.equal(shop.placements.length, 0);

const tooSmall = registry.selectForRoom(room({ sizeTier: "small" }), {
  poolId: "starter", obstaclePoolId: "minimal", seed: 4,
});
assert.equal(tooSmall.layoutId, "open_basic", "small rooms should not receive medium-only layouts");

const custom = new RoomLayoutRegistry({
  layouts: [
    { id: "open_basic", poolWeights: { custom: 1 }, placements: [] },
    {
      id: "custom_pair",
      poolWeights: { custom: 10 },
      allowedRoomTypes: ["combat"],
      variants: [{
        id: "left-right",
        weight: 1,
        placements: [
          { id: "left", definitionId: "test_pillar", x: 0.32, y: 0.32, width: 0.06, height: 0.06 },
          { id: "right", definitionId: "test_pillar", x: 0.68, y: 0.68, width: 0.06, height: 0.06 },
        ],
      }],
    },
  ],
});
const customResult = custom.selectForRoom(room(), { poolId: "custom", seed: 1 });
assert.equal(customResult.layoutId, "custom_pair");
assert.equal(customResult.placements.length, 2);
assert.ok(customResult.placements.every(placement => (
  Number.isFinite(placement.x) && Number.isFinite(placement.y) &&
  Number.isFinite(placement.width) && Number.isFinite(placement.height)
)));

assert.throws(() => registry.selectForRoom(room(), { poolId: "not-registered", seed: 1 }), /Unknown room layout pool/);
assert.throws(() => new RoomLayoutRegistry({ layouts: [{ id: "bad", poolWeights: { starter: 1 }, placements: [{ id: "x", definitionId: "pillar", x: 2, y: 0.5, width: 0.1, height: 0.1 }] }] }), /normalized room coordinates/);

console.log("Room layout registry tests passed (pools, compatibility, stable selection, variants and validation fallback).");
