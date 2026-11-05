import assert from "node:assert/strict";
import FloorArchetype from "../world/FloorArchetype.js";
import FloorConnection from "../world/FloorConnection.js";
import FloorGenerator from "../world/FloorGenerator.js";
import FloorRegistry from "../world/FloorRegistry.js";
import RunState, { RUN_STATE_SCHEMA_VERSION } from "../world/RunState.js";

const catacombs = new FloorArchetype({
  id: "forgotten-catacombs",
  name: "Forgotten Catacombs",
  generationOptions: {
    roomCount: 10,
    gridWidth: 7,
    gridHeight: 7,
    roomWidth: 800,
    roomHeight: 800,
  },
  variants: [
    { id: "original", name: "Original" },
    {
      id: "corrupted",
      name: "Corrupted",
      generationOverrides: { background: 0x331122 },
      visualThemeId: "catacombs-corrupted",
      enemyPoolId: "catacombs-elite",
    },
  ],
});

const originalFloor = FloorGenerator.generate({
  ...catacombs.resolveGenerationOptions("original"),
  id: "floor-instance-original",
  archetypeId: catacombs.id,
  variantId: "original",
  generationVersion: 1,
  depth: 2,
  seed: 10101,
});

const corruptedFloor = FloorGenerator.generate({
  ...catacombs.resolveGenerationOptions("corrupted"),
  id: "floor-instance-corrupted",
  archetypeId: catacombs.id,
  variantId: "corrupted",
  generationVersion: 1,
  depth: 2,
  seed: 20202,
});

assert.equal(originalFloor.archetypeId, corruptedFloor.archetypeId);
assert.notEqual(originalFloor.id, corruptedFloor.id);
assert.notEqual(originalFloor.variantId, corruptedFloor.variantId);
assert.notEqual(originalFloor.seed, corruptedFloor.seed);
assert.equal(corruptedFloor.getRoomDefinition(corruptedFloor.startRoomId).background, 0x331122);
assert.equal(catacombs.resolveGenerationOptions("corrupted").background, 0x331122);
assert.throws(() => catacombs.resolveGenerationOptions("missing"), /does not exist/);
assert.deepEqual(
  FloorArchetype.fromJSON(catacombs.toJSON()).toJSON(),
  catacombs.toJSON()
);

const run = new RunState({
  id: "run-test-001",
  seed: 5150,
  floors: [originalFloor],
});

assert.equal(run.getFloor(originalFloor.id), originalFloor);
assert.equal(run.getCurrentFloor(), null);

run.setCurrentLocation(originalFloor.id, originalFloor.startRoomId);
assert.equal(run.currentFloorId, originalFloor.id);
assert.equal(run.currentRoomId, originalFloor.startRoomId);
assert.equal(originalFloor.visited, true);
assert.equal(originalFloor.visitCount, 1);
assert.equal(originalFloor.getRoomState(originalFloor.startRoomId).visited, true);

// Moving between rooms on the same floor must not count as re-entering the floor.
const anotherRoomId = [...originalFloor.rooms.keys()].find(
  roomId => roomId !== originalFloor.startRoomId
);
run.setCurrentLocation(originalFloor.id, anotherRoomId);
assert.equal(originalFloor.visitCount, 1);
assert.equal(originalFloor.getRoomState(anotherRoomId).visited, true);

run.addFloor(corruptedFloor);
const connection = run.addFloorConnection(new FloorConnection({
  id: "portal-original-to-corrupted",
  fromFloorId: originalFloor.id,
  fromRoomId: originalFloor.bossRoomId,
  toFloorId: corruptedFloor.id,
  toRoomId: corruptedFloor.startRoomId,
  type: "time_portal",
  bidirectional: true,
  locked: true,
  requires: { globalFlag: "catacombsPortalUnlocked" },
  metadata: { label: "Return to the corrupted past" },
}));

assert.equal(connection.type, "time_portal");
assert.equal(
  run.floorRegistry.getConnectionsFrom(originalFloor.id, originalFloor.bossRoomId).length,
  1
);
assert.equal(
  run.floorRegistry.getConnectionsFrom(corruptedFloor.id, corruptedFloor.startRoomId)[0].direction,
  "reverse"
);

run.floorRegistry.setConnectionLocked(connection.id, false);
assert.equal(run.floorRegistry.getConnection(connection.id).locked, false);

// One-way exits are only returned from their source location.
run.addFloorConnection({
  id: "one-way-secret-exit",
  fromFloorId: corruptedFloor.id,
  fromRoomId: corruptedFloor.bossRoomId,
  toFloorId: originalFloor.id,
  toRoomId: originalFloor.startRoomId,
  type: "one_way_portal",
  bidirectional: false,
});
assert.equal(
  run.floorRegistry.getConnectionsFrom(originalFloor.id, originalFloor.startRoomId)
    .some(entry => entry.connection.id === "one-way-secret-exit"),
  false
);

run.setCurrentLocation(corruptedFloor.id, corruptedFloor.startRoomId);
assert.equal(corruptedFloor.visitCount, 1);
run.setCurrentLocation(originalFloor.id, originalFloor.startRoomId);
assert.equal(originalFloor.visitCount, 2);

run.markFloorCompleted(originalFloor.id);
assert.equal(originalFloor.completed, true);

const persistentRoomState = originalFloor.getRoomState(originalFloor.startRoomId);
persistentRoomState.recordDefeatedEnemy("enemy-guard-01");
persistentRoomState.addDroppedItem({
  id: "world-item-01",
  definitionId: "shotgun",
  position: { x: 420, y: 315 },
});

const playerSnapshot = {
  health: 80,
  weapons: [{ id: "basic_gun", ammo: 12, modules: ["precision"] }],
  inventory: { items: [{ instanceId: "item-1", definitionId: "medkit" }] },
};
run.setPlayerState("player-1", playerSnapshot);
playerSnapshot.weapons[0].ammo = 0;
assert.equal(run.getPlayerState("player-1").weapons[0].ammo, 12);

run.setGlobalFlag("catacombsPortalUnlocked", true);
assert.equal(run.getGlobalFlag("catacombsPortalUnlocked"), true);
assert.equal(run.getGlobalFlag("missingFlag", false), false);

const serialized = JSON.stringify(run.toJSON());
const restored = RunState.fromJSON(JSON.parse(serialized));

assert.equal(restored.schemaVersion, RUN_STATE_SCHEMA_VERSION);
assert.equal(restored.currentFloorId, originalFloor.id);
assert.equal(restored.currentRoomId, originalFloor.startRoomId);
assert.equal(restored.getFloor(originalFloor.id).variantId, "original");
assert.equal(restored.getFloor(corruptedFloor.id).variantId, "corrupted");
assert.equal(restored.getFloor(originalFloor.id).completed, true);
assert.equal(restored.getFloor(originalFloor.id).visitCount, 2);
assert.deepEqual(
  restored.getFloor(originalFloor.id)
    .getRoomState(originalFloor.startRoomId).defeatedEnemyIds,
  ["enemy-guard-01"]
);
assert.deepEqual(
  restored.getFloor(originalFloor.id)
    .getRoomState(originalFloor.startRoomId).droppedItems,
  [{
    id: "world-item-01",
    definitionId: "shotgun",
    position: { x: 420, y: 315 },
  }]
);
assert.equal(restored.floorRegistry.getConnections().length, 2);
assert.deepEqual(restored.getPlayerState("player-1"), run.getPlayerState("player-1"));
assert.equal(restored.getGlobalFlag("catacombsPortalUnlocked"), true);

assert.throws(
  () => restored.addFloor(restored.getFloor(originalFloor.id)),
  /already registered/
);
assert.throws(
  () => run.addFloorConnection({
    id: "bad-connection",
    fromFloorId: "missing-floor",
    fromRoomId: "room-1",
    toFloorId: originalFloor.id,
    toRoomId: originalFloor.startRoomId,
  }),
  /unregistered floor/
);
assert.throws(
  () => RunState.fromJSON({ ...run.toJSON(), schemaVersion: 99 }),
  /Unsupported RunState schema version/
);
assert.throws(
  () => run.setPlayerState("player-2", { invalid: () => {} }),
  /JSON-serializable/
);

const standaloneRegistry = FloorRegistry.fromJSON(run.floorRegistry.toJSON());
assert.equal(standaloneRegistry.getFloors().length, 2);
assert.equal(standaloneRegistry.getConnections().length, 2);

console.log("RunState tests passed (multiple instances, variants, links, and JSON round-trip).");
