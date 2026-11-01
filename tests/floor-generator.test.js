import assert from "node:assert/strict";
import FloorGenerator from "../src/world/FloorGenerator.js";

function getReachableRoomIds(floor, startRoomId) {
  const visited = new Set([startRoomId]);
  const queue = [startRoomId];

  while (queue.length > 0) {
    const currentRoomId = queue.shift();

    for (const exit of floor.getExits(currentRoomId, { includeLocked: false })) {
      if (!visited.has(exit.toRoomId)) {
        visited.add(exit.toRoomId);
        queue.push(exit.toRoomId);
      }
    }
  }

  return visited;
}

function expectedDirection(from, to) {
  if (to.x === from.x && to.y === from.y - 1) return "north";
  if (to.x === from.x + 1 && to.y === from.y) return "east";
  if (to.x === from.x && to.y === from.y + 1) return "south";
  if (to.x === from.x - 1 && to.y === from.y) return "west";
  return null;
}

// A specific seed must always generate the exact same model.
const deterministicA = FloorGenerator.generate({ id: "test-floor", seed: 123456 });
const deterministicB = FloorGenerator.generate({ id: "test-floor", seed: 123456 });
assert.deepEqual(deterministicA.toJSON(), deterministicB.toJSON());

// Numeric and string seeds are both supported.
assert.equal(
  FloorGenerator.generate({ seed: "stable-seed" }).seed,
  FloorGenerator.generate({ seed: "stable-seed" }).seed
);

// Exercise a range of seeds and verify all structural guarantees.
for (let seed = 1; seed <= 100; seed++) {
  const floor = FloorGenerator.generate({
    id: `floor-${seed}`,
    seed,
  });

  const rooms = [...floor.rooms.values()];
  assert.ok(rooms.length >= 10 && rooms.length <= 15);
  assert.equal(rooms.filter(room => room.isStartRoom).length, 1);
  assert.equal(rooms.filter(room => room.isBossRoom).length, 1);
  assert.equal(floor.getRoomDefinition(floor.startRoomId).type, "start");
  assert.equal(floor.getRoomDefinition(floor.bossRoomId).type, "boss");
  assert.ok(rooms.some(room => room.type === "treasure"));
  assert.ok(rooms.some(room => room.type === "shop"));

  // Every generated room must be reachable from the start.
  const reachable = getReachableRoomIds(floor, floor.startRoomId);
  assert.equal(reachable.size, rooms.length);
  assert.ok(reachable.has(floor.bossRoomId));

  // All connections must join orthogonally adjacent rooms in the stated direction.
  for (const connection of floor.connections) {
    const roomA = floor.getRoomDefinition(connection.roomAId);
    const roomB = floor.getRoomDefinition(connection.roomBId);

    assert.equal(
      expectedDirection(roomA.gridPosition, roomB.gridPosition),
      connection.directionFromA
    );
  }

  // A tree with N rooms has N - 1 connections; it guarantees a unique route
  // from start to boss in this first generator version.
  assert.equal(floor.connections.length, rooms.length - 1);
}

// The generator must support an explicitly requested room count.
for (const roomCount of [10, 12, 15]) {
  const floor = FloorGenerator.generate({ roomCount, seed: 9876 });
  assert.equal(floor.rooms.size, roomCount);
}

// Reject impossible or invalid configurations with useful errors.
assert.throws(
  () => FloorGenerator.generate({ roomCount: 50, gridWidth: 7, gridHeight: 7 }),
  /roomCount/
);
assert.throws(
  () => FloorGenerator.generate({ minRooms: 16, maxRooms: 15 }),
  /maxRooms/
);

console.log("Floor generator tests passed (100 deterministic seeds). ");
