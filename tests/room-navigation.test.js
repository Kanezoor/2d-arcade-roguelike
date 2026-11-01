import assert from "node:assert/strict";
import FloorGenerator from "../world/FloorGenerator.js";
import {
  getDoorPosition,
  getExitForDirection,
  getOppositeDirection,
  getRoomEntryPosition,
} from "../world/RoomNavigation.js";

const directions = ["north", "east", "south", "west"];

for (let seed = 1; seed <= 100; seed++) {
  const floor = FloorGenerator.generate({
    id: `navigation-test-${seed}`,
    seed,
    minRooms: 10,
    maxRooms: 15,
    gridWidth: 7,
    gridHeight: 7,
    roomShape: "rectangle",
  });

  for (const room of floor.rooms.values()) {
    const exits = floor.getExits(room.id);
    const directionsForRoom = new Set();

    for (const exit of exits) {
      assert.ok(directions.includes(exit.direction));
      assert.ok(!directionsForRoom.has(exit.direction), "A room cannot have two exits in the same direction.");
      directionsForRoom.add(exit.direction);

      const reverseDirection = getOppositeDirection(exit.direction);
      const reverseExit = getExitForDirection(
        floor,
        exit.toRoomId,
        reverseDirection
      );

      assert.ok(reverseExit, "Neighbor must expose the reciprocal exit.");
      assert.equal(reverseExit.toRoomId, room.id);
      assert.equal(
        getOppositeDirection(reverseExit.direction),
        exit.direction
      );

      const doorPosition = getDoorPosition(room, exit.direction);
      assert.ok(doorPosition.x >= 0 && doorPosition.x <= room.width);
      assert.ok(doorPosition.y >= 0 && doorPosition.y <= room.height);

      const neighbor = floor.getRoomDefinition(exit.toRoomId);
      const entryPosition = getRoomEntryPosition(neighbor, reverseDirection);
      assert.ok(entryPosition.x > 0 && entryPosition.x < neighbor.width);
      assert.ok(entryPosition.y > 0 && entryPosition.y < neighbor.height);
    }
  }

  assert.ok(floor.rooms.size >= 10 && floor.rooms.size <= 15);
  assert.ok(floor.getRoomDefinition(floor.startRoomId));
  assert.ok(floor.getRoomDefinition(floor.bossRoomId));
}

const lockedFloor = FloorGenerator.generate({
  id: "locked-exit-test",
  seed: 42,
  roomCount: 10,
  gridWidth: 7,
  gridHeight: 7,
});

const connection = lockedFloor.connections[0];
lockedFloor.setConnectionLocked(connection.id, true);
const lockedExit = lockedFloor.getExits(connection.roomAId).find(
  exit => exit.connectionId === connection.id
);

assert.ok(lockedExit);
assert.equal(
  getExitForDirection(lockedFloor, connection.roomAId, lockedExit.direction),
  null
);
assert.ok(
  getExitForDirection(
    lockedFloor,
    connection.roomAId,
    lockedExit.direction,
    { allowLocked: true }
  )
);

assert.deepEqual(getRoomEntryPosition({ width: 800, height: 600 }, "west"), {
  x: 82,
  y: 300,
});
assert.deepEqual(getRoomEntryPosition({ width: 800, height: 600 }, "east"), {
  x: 718,
  y: 300,
});
assert.deepEqual(getRoomEntryPosition({ width: 800, height: 600 }, "north"), {
  x: 400,
  y: 82,
});
assert.deepEqual(getRoomEntryPosition({ width: 800, height: 600 }, "south"), {
  x: 400,
  y: 518,
});

assert.throws(() => getOppositeDirection("up"), TypeError);
assert.throws(() => getDoorPosition({ width: 800, height: 600 }, "up"), TypeError);

console.log("Room navigation tests passed (100 generated floors).");
