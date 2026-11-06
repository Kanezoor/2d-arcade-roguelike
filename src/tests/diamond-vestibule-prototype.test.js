import assert from "node:assert/strict";
import FloorModel from "../world/FloorModel.js";
import RoomDefinition from "../world/RoomDefinition.js";
import { configureDiamondVestibulePrototype } from "../world/DiamondVestibulePrototype.js";
import {
  buildRoomEntranceGeometry,
  getBoundaryOpeningSegments,
} from "../world/RoomEntranceGeometry.js";
import { isPointInsideRoom } from "../world/RoomGeometry.js";
import RoomEntranceRuntime from "../world/RoomEntranceRuntime.js";

function closeTo(actual, expected, epsilon = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be close to ${expected}.`
  );
}

function createTestFloor(candidateDirection = "west") {
  return new FloorModel({
    id: "diamond-prototype-floor",
    gridWidth: 4,
    gridHeight: 4,
    rooms: [
      {
        id: "floor-room-start",
        gridPosition: { x: 1, y: 1 },
        type: "start",
        isStartRoom: true,
      },
      {
        id: "floor-room-diamond",
        gridPosition: { x: 2, y: 1 },
        type: "combat",
      },
      {
        id: "floor-room-boss",
        gridPosition: { x: 1, y: 2 },
        type: "boss",
        isBossRoom: true,
      },
    ],
    connections: [
      {
        id: "start-to-diamond",
        roomAId: "floor-room-diamond",
        roomBId: "floor-room-start",
        directionFromA: candidateDirection,
      },
      {
        id: "start-to-boss",
        roomAId: "floor-room-start",
        roomBId: "floor-room-boss",
        directionFromA: "south",
      },
    ],
    startRoomId: "floor-room-start",
    bossRoomId: "floor-room-boss",
  });
}

const floor = createTestFloor();
const prototype = configureDiamondVestibulePrototype(floor);

assert.ok(prototype);
assert.equal(prototype.roomId, "floor-room-diamond");
assert.equal(prototype.direction, "west");

const room = floor.getRoomDefinition(prototype.roomId);
assert.equal(room.shape, "diamond");
assert.equal(room.type, "combat");
assert.equal(room.outsideBackground, 0x171923);
assert.equal(room.outlinePoints.length, 4);

// The room outline is inset from the viewport so the vestibule remains visible.
assert.deepEqual(room.outlinePoints, [
  { x: 400, y: 80 },
  { x: 720, y: 400 },
  { x: 400, y: 720 },
  { x: 80, y: 400 },
]);

const exit = floor.getExits(room.id)[0];
const port = floor.getPortForExit(room.id, exit);
assert.equal(port.mode, "vestibule");
assert.equal(port.gate.geometry.type, "polyline");

const geometry = buildRoomEntranceGeometry(room, port);
assert.equal(geometry.gateSegments.length, 2);
assert.equal(geometry.boundaryOpeningSegments.length, 2);
assert.equal(geometry.vestibuleWalls.length, 2);
assert.ok(geometry.entrySensor);
assert.ok(geometry.entrySpawn);

// The physical gate follows both adjoining sides of the diamond vertex.
assert.deepEqual(geometry.gateSegments, getBoundaryOpeningSegments(room, port));
for (const point of port.gate.geometry.points) {
  assert.ok(point.x >= 0 && point.x <= room.width);
  assert.ok(point.y >= 0 && point.y <= room.height);
}

// The full room outline remains intact in the data model while the vestibule
// extends from the two edge endpoints to the outer viewport boundary.
assert.equal(room.outlinePoints.length, 4);
for (const wall of geometry.vestibuleWalls) {
  for (const point of [wall.start, wall.end]) {
    assert.ok(point.x >= 0 && point.x <= room.width);
    assert.ok(point.y >= 0 && point.y <= room.height);
  }
}

// The player entry spawn is inside the vestibule, and the room center is inside
// the diamond. Points in the square corners outside the diamond are rejected.
assert.ok(isPointInsideRoom(room, room.width / 2, room.height / 2, 30));
assert.ok(!isPointInsideRoom(room, 40, 40));
assert.ok(!isPointInsideRoom(room, room.width - 20, room.height - 20));
assert.ok(
  geometry.entrySpawn.x >= 0 && geometry.entrySpawn.x <= room.width &&
  geometry.entrySpawn.y >= 0 && geometry.entrySpawn.y <= room.height
);

// RoomDefinition preserves custom outline geometry across serialization.
const definitionRoundTrip = new RoomDefinition(room.toJSON());
assert.deepEqual(definitionRoundTrip.outlinePoints, room.outlinePoints);
assert.equal(definitionRoundTrip.outsideBackground, room.outsideBackground);

const restoredFloor = FloorModel.fromJSON(floor.toJSON());
const restoredRoom = restoredFloor.getRoomDefinition(room.id);
const restoredPort = restoredFloor.getPortForExit(
  room.id,
  restoredFloor.getExits(room.id)[0]
);
assert.equal(restoredRoom.shape, "diamond");
assert.deepEqual(restoredRoom.outlinePoints, room.outlinePoints);
assert.equal(restoredPort.mode, "vestibule");
assert.equal(restoredPort.gate.geometry.type, "polyline");
assert.equal(
  buildRoomEntranceGeometry(restoredRoom, restoredPort).gateSegments.length,
  2
);

// All four cardinal vestibule configurations remain inside the fixed viewport.
for (const direction of ["north", "east", "south", "west"]) {
  const directionalFloor = createTestFloor(direction);
  const directionalPrototype = configureDiamondVestibulePrototype(directionalFloor);
  const directionalRoom = directionalFloor.getRoomDefinition(directionalPrototype.roomId);
  const directionalExit = directionalFloor.getExits(directionalRoom.id)[0];
  const directionalPort = directionalFloor.getPortForExit(directionalRoom.id, directionalExit);
  const directionalGeometry = buildRoomEntranceGeometry(directionalRoom, directionalPort);

  assert.equal(directionalPrototype.direction, direction);
  assert.equal(directionalGeometry.gateSegments.length, 2);
  assert.equal(directionalGeometry.vestibuleWalls.length, 2);

  for (const wall of directionalGeometry.vestibuleWalls) {
    for (const point of [wall.start, wall.end]) {
      assert.ok(point.x >= 0 && point.x <= directionalRoom.width);
      assert.ok(point.y >= 0 && point.y <= directionalRoom.height);
    }
  }

  assert.ok(directionalGeometry.entrySpawn.x >= 0);
  assert.ok(directionalGeometry.entrySpawn.x <= directionalRoom.width);
  assert.ok(directionalGeometry.entrySpawn.y >= 0);
  assert.ok(directionalGeometry.entrySpawn.y <= directionalRoom.height);
}

// The Matter runtime materializes both angled gate panels and toggles their
// collision behavior together.
function createFakeScene() {
  const objects = [];
  return {
    objects,
    add: {
      rectangle(x, y, width, height, color, alpha = 1) {
        const object = {
          x, y, width, height, color, alpha,
          active: true,
          rotation: 0,
          setRotation(value) {
            this.rotation = value;
            if (this.body) this.body.angle = value;
            return this;
          },
          setAlpha(value) { this.alpha = value; return this; },
          destroy() { this.active = false; this.destroyed = true; },
        };
        objects.push(object);
        return object;
      },
    },
    matter: {
      add: {
        gameObject(object, options = {}) {
          object.body = {
            isStatic: Boolean(options.isStatic),
            isSensor: Boolean(options.isSensor),
            angle: 0,
          };
          return object;
        },
      },
    },
  };
}

const runtimeScene = createFakeScene();
const runtime = new RoomEntranceRuntime(runtimeScene, room, port, {
  exit: {
    direction: exit.direction,
    toRoomId: "neighbor-room",
    connectionId: exit.connectionId,
    locked: false,
  },
  gateOpen: false,
});
assert.equal(runtime.gatePanels.length, 2);
for (const panel of runtime.gatePanels) {
  closeTo(panel.body.angle, panel.rotation);
  assert.equal(panel.body.isSensor, false);
}
runtime.setGateOpen(true);
for (const panel of runtime.gatePanels) {
  assert.equal(panel.body.isSensor, true);
}
runtime.setGateOpen(false);
for (const panel of runtime.gatePanels) {
  assert.equal(panel.body.isSensor, false);
}
runtime.destroy();
assert.ok(runtimeScene.objects.every(object => object.destroyed));

// The prototype selection is deterministic for an identical floor structure.
const secondFloor = createTestFloor();
const secondPrototype = configureDiamondVestibulePrototype(secondFloor);
assert.equal(secondPrototype.roomId, prototype.roomId);
assert.deepEqual(secondPrototype.gatePoints, prototype.gatePoints);

// A floor without a non-start/non-boss leaf can skip the test fixture safely.
const noLeafFloor = new FloorModel({
  id: "no-leaf-floor",
  gridWidth: 2,
  gridHeight: 1,
  rooms: [
    { id: "only-start", gridPosition: { x: 0, y: 0 }, type: "start", isStartRoom: true },
    { id: "only-boss", gridPosition: { x: 1, y: 0 }, type: "boss", isBossRoom: true },
  ],
  connections: [{ id: "start-boss", roomAId: "only-start", roomBId: "only-boss", directionFromA: "east" }],
  startRoomId: "only-start",
  bossRoomId: "only-boss",
});
assert.equal(configureDiamondVestibulePrototype(noLeafFloor), null);

console.log("Diamond vestibule prototype tests passed (four directions, geometry, and serialization).");
