import assert from "node:assert/strict";
import FloorModel from "../world/FloorModel.js";
import RoomPort from "../world/RoomPort.js";
import RoomState from "../world/RoomState.js";
import RoomEntranceRuntime from "../world/RoomEntranceRuntime.js";
import {
  buildRoomEntranceGeometry,
  getBoundaryOpeningSegments,
  getExitTriggerGeometry,
  getGateSegments,
  getRectangularEdgeOpenings,
  getRoomEntrySpawnPosition,
  getVestibuleWallSegments,
} from "../world/RoomEntranceGeometry.js";

function closeTo(actual, expected, epsilon = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be close to ${expected}.`
  );
}

const room = {
  id: "room-test",
  width: 800,
  height: 800,
};

// Existing direct exits retain their former cardinal placement.
for (const [direction, expected] of [
  ["north", { x: 400, y: 48, width: 140, height: 32 }],
  ["east", { x: 752, y: 400, width: 140, height: 32 }],
  ["south", { x: 400, y: 752, width: 140, height: 32 }],
  ["west", { x: 48, y: 400, width: 140, height: 32 }],
]) {
  const port = new RoomPort({
    id: `direct-${direction}`,
    connectionId: `connection-${direction}`,
    direction,
  });
  const trigger = getExitTriggerGeometry(room, port);
  assert.equal(trigger.x, expected.x);
  assert.equal(trigger.y, expected.y);
  assert.equal(trigger.width, expected.width);
  assert.equal(trigger.height, expected.height);
  assert.equal(port.mode, "direct");
  assert.equal(port.vestibule, null);
  assert.equal(port.gate, null);
}

// A generic vestibule creates two external side walls, a threshold gate,
// an entry sensor position, and an outer transition trigger.
const northVestibule = new RoomPort({
  id: "north-vestibule",
  connectionId: "north-connection",
  direction: "north",
  mode: "vestibule",
  anchor: { x: 400, y: 0 },
  outwardNormal: { x: 0, y: -1 },
  openingWidth: 120,
  vestibule: {
    length: 140,
    width: 120,
    wallThickness: 18,
  },
  gate: {
    id: "north-gate",
    initiallyOpen: false,
    closeOnEntry: true,
    openWhenRoomCleared: true,
  },
});

const northGeometry = buildRoomEntranceGeometry(room, northVestibule);
assert.equal(northGeometry.vestibuleWalls.length, 2);
assert.equal(northGeometry.gateSegments.length, 1);
assert.ok(northGeometry.entrySensor);
assert.ok(northGeometry.entrySpawn);
assert.equal(northGeometry.exitTrigger.x, 400);
assert.equal(northGeometry.exitTrigger.y, -116);
assert.equal(northGeometry.entrySpawn.x, 400);
assert.equal(northGeometry.entrySpawn.y, -76);

const northWalls = getVestibuleWallSegments(room, northVestibule);
assert.deepEqual(northWalls[0].start, { x: 340, y: 0 });
assert.deepEqual(northWalls[0].end, { x: 340, y: -140 });
assert.deepEqual(getBoundaryOpeningSegments(room, northVestibule), northGeometry.gateSegments);

// Rectangular room boundaries leave a gap only for vestibule (or explicitly
// configured boundary-opening) ports. Direct doors preserve the legacy walls.
assert.deepEqual(
  getRectangularEdgeOpenings(room, [northVestibule], "north"),
  [{ start: 340, end: 460 }]
);
assert.deepEqual(
  getRectangularEdgeOpenings(room, [northVestibule], "south"),
  []
);

// Diamond entrance: two custom gate panels follow the two adjoining edges.
const diamondRoom = {
  id: "diamond-room",
  width: 800,
  height: 800,
  shape: "diamond",
};
const diamondGateGeometry = {
  type: "segments",
  segments: [
    { start: { x: 730, y: 330 }, end: { x: 800, y: 400 } },
    { start: { x: 800, y: 400 }, end: { x: 730, y: 470 } },
  ],
};
const diamondPort = new RoomPort({
  id: "diamond-east-port",
  connectionId: "diamond-east-connection",
  direction: "east",
  mode: "vestibule",
  anchor: { x: 800, y: 400 },
  outwardNormal: { x: 1, y: 0 },
  openingWidth: 140,
  vestibule: {
    length: 120,
    width: 130,
    wallSegments: [
      { start: { x: 730, y: 330 }, end: { x: 920, y: 330 } },
      { start: { x: 730, y: 470 }, end: { x: 920, y: 470 } },
    ],
  },
  gate: {
    id: "diamond-east-gate",
    geometry: diamondGateGeometry,
  },
  boundaryOpening: diamondGateGeometry,
});
assert.equal(getGateSegments(diamondRoom, diamondPort).length, 2);
assert.equal(getBoundaryOpeningSegments(diamondRoom, diamondPort).length, 2);
assert.equal(getVestibuleWallSegments(diamondRoom, diamondPort).length, 2);

// Circular entrance: a curved arc is converted into short Matter-friendly
// segments while the same arc can be used as a boundary opening.
const circleRoom = {
  id: "circle-room",
  width: 800,
  height: 800,
  shape: "circle",
};
const circleArc = {
  type: "arc",
  center: { x: 400, y: 400 },
  radius: 400,
  startAngle: Math.PI / 2 - 0.2,
  endAngle: Math.PI / 2 + 0.2,
  segmentCount: 8,
};
const circlePort = new RoomPort({
  id: "circle-south-port",
  connectionId: "circle-south-connection",
  direction: "south",
  mode: "vestibule",
  anchor: { x: 400, y: 800 },
  outwardNormal: { x: 0, y: 1 },
  openingWidth: 160,
  vestibule: {
    length: 130,
    width: 160,
    wallSegments: [
      { start: { x: 480.0, y: 791.9 }, end: { x: 480.0, y: 930 } },
      { start: { x: 320.0, y: 791.9 }, end: { x: 320.0, y: 930 } },
    ],
  },
  gate: {
    id: "circle-south-gate",
    geometry: circleArc,
  },
  boundaryOpening: circleArc,
});
assert.equal(getGateSegments(circleRoom, circlePort).length, 8);
assert.equal(getBoundaryOpeningSegments(circleRoom, circlePort).length, 8);

// Gate state is room state, not a Phaser/Matter object.
const roomState = new RoomState("room-state-test");
assert.equal(roomState.isGateOpen("north-gate", false), false);
roomState.setGateOpen("north-gate", true);
assert.equal(roomState.isGateOpen("north-gate"), true);
const restoredRoomState = new RoomState("room-state-test", roomState.toJSON());
assert.equal(restoredRoomState.isGateOpen("north-gate"), true);

// A FloorModel automatically creates a direct RoomPort for every graph edge.
const floor = new FloorModel({
  id: "ports-floor",
  gridWidth: 2,
  gridHeight: 1,
  rooms: [
    { id: "room-a", gridPosition: { x: 0, y: 0 }, type: "start" },
    { id: "room-b", gridPosition: { x: 1, y: 0 }, type: "boss" },
  ],
  connections: [
    {
      id: "a-to-b",
      roomAId: "room-a",
      roomBId: "room-b",
      directionFromA: "east",
    },
  ],
  startRoomId: "room-a",
  bossRoomId: "room-b",
});
assert.equal(floor.getPortForExit("room-a", "a-to-b").direction, "east");
assert.equal(floor.getPortForExit("room-b", "a-to-b").direction, "west");
const floorRoundTrip = FloorModel.fromJSON(floor.toJSON());
assert.equal(floorRoundTrip.getPortForExit("room-a", "a-to-b").mode, "direct");
const customizedPort = new RoomPort({
  id: "room-a:a-to-b",
  connectionId: "a-to-b",
  direction: "east",
  mode: "vestibule",
  anchor: { x: 790, y: 400 },
  outwardNormal: { x: 1, y: 0 },
  vestibule: { length: 120, width: 140 },
});
floor.setRoomPort("room-a", customizedPort);
assert.equal(floor.getPortForExit("room-a", "a-to-b").mode, "vestibule");
assert.equal(FloorModel.fromJSON(floor.toJSON())
  .getPortForExit("room-a", "a-to-b").mode, "vestibule");
assert.throws(() => new FloorModel({
  id: "invalid-port-floor",
  gridWidth: 2,
  gridHeight: 1,
  rooms: [
    {
      id: "room-a",
      gridPosition: { x: 0, y: 0 },
      ports: [{
        id: "wrong-port",
        connectionId: "a-to-b",
        direction: "north",
      }],
    },
    { id: "room-b", gridPosition: { x: 1, y: 0 } },
  ],
  connections: [{
    id: "a-to-b",
    roomAId: "room-a",
    roomBId: "room-b",
    directionFromA: "east",
  }],
}), /direction does not match/);

// Smoke-test the runtime adapter with lightweight Phaser/Matter stand-ins.
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
          // Simulate Matter creating an unrotated body on attachment.
          // A subsequent Matter-aware setRotation call must update body.angle.
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

const fakeScene = createFakeScene();
const runtime = new RoomEntranceRuntime(fakeScene, room, northVestibule, {
  exit: {
    direction: "north",
    toRoomId: "neighbor-room",
    connectionId: "north-connection",
    locked: false,
  },
  gateOpen: true,
});
assert.equal(runtime.vestibuleWalls.length, 2);
assert.equal(runtime.gatePanels.length, 1);
assert.equal(runtime.exitTrigger.isDoor, true);
assert.equal(runtime.entrySensor.isRoomGateEntry, true);
assert.equal(runtime.gatePanels[0].body.isSensor, true);
assert.equal(runtime.closeGateAfterEntry(), true);
assert.equal(runtime.gatePanels[0].body.isSensor, false);
assert.equal(runtime.entrySensor, null);
assert.equal(runtime.openGateAfterRoomClear(), true);
assert.equal(runtime.gatePanels[0].body.isSensor, true);
runtime.destroy();
assert.ok(fakeScene.objects.every(object => object.destroyed));

// East/west entrance bodies must be rotated after Matter attachment.
// Otherwise a 140x32 exit sensor remains horizontal and overlaps the player's
// side-entry spawn position, causing an immediate transition back.
const eastVestibule = new RoomPort({
  id: "east-vestibule",
  connectionId: "east-connection",
  direction: "east",
  mode: "vestibule",
  anchor: { x: 800, y: 400 },
  outwardNormal: { x: 1, y: 0 },
  openingWidth: 120,
  vestibule: { length: 140, width: 120 },
  gate: {
    id: "east-gate",
    closeOnEntry: true,
  },
});
const eastRuntime = new RoomEntranceRuntime(fakeScene, room, eastVestibule, {
  exit: {
    direction: "east",
    toRoomId: "neighbor-room",
    connectionId: "east-connection",
    locked: false,
  },
});
closeTo(eastRuntime.exitTrigger.rotation, Math.PI / 2);
closeTo(eastRuntime.exitTrigger.body.angle, Math.PI / 2);
closeTo(eastRuntime.entrySensor.rotation, Math.PI / 2);
closeTo(eastRuntime.entrySensor.body.angle, Math.PI / 2);
for (const wall of eastRuntime.vestibuleWalls) {
  closeTo(wall.body.angle, wall.rotation);
}
for (const panel of eastRuntime.gatePanels) {
  closeTo(panel.body.angle, panel.rotation);
}
eastRuntime.destroy();

assert.throws(() => new RoomPort({
  id: "invalid-normal",
  direction: "north",
  outwardNormal: { x: 0, y: 0 },
}), /zero vector/);

console.log("Room port tests passed (direct, vestibule, diamond, circle, gates, and runtime adapter).");
