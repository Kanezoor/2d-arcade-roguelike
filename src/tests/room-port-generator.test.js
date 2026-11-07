import assert from "node:assert/strict";
import RoomDefinition from "../world/RoomDefinition.js";
import FloorModel from "../world/FloorModel.js";
import { createTemplateAwareRoomPort } from "../world/RoomPortGenerator.js";
import { resolveRoomPortFrame, getRoomInteriorEntrySpawnPosition } from "../world/RoomEntranceGeometry.js";
import { isPointInsideRoom } from "../world/RoomGeometry.js";

const directions = ["north", "east", "south", "west"];
const expectedModes = {
  square: "direct",
  rectangle: "direct",
  octagon: "direct",
  circle: "direct",
  diamond: "vestibule",
};

for (const [shape, expectedMode] of Object.entries(expectedModes)) {
  for (const direction of directions) {
    const room = new RoomDefinition({
      id: `${shape}-${direction}`,
      gridPosition: { x: 1, y: 1 },
      shape,
      width: 800,
      height: 800,
    });
    const port = createTemplateAwareRoomPort(room, {
      id: `${room.id}:connection`,
      connectionId: `${room.id}-connection`,
      direction,
    });
    room.addPort(port);

    assert.equal(port.mode, expectedMode, `${shape} ${direction} mode`);
    const spawn = getRoomInteriorEntrySpawnPosition(room, port);
    if (expectedMode === "direct") {
      assert.equal(isPointInsideRoom(room, spawn.x, spawn.y), true,
        `${shape} ${direction} spawn must be inside the room`);
    }
    assert.equal(room.validatePortLayout().valid, true,
      `${shape} ${direction}: ${JSON.stringify(room.validatePortLayout().errors)}`);

    if (shape === "diamond") {
      assert.equal(port.gate.closeOnEntry, true);
      assert.equal(port.gate.openWhenRoomCleared, true);
      assert.equal(port.boundaryOpening.type, "polyline");
      assert.equal(port.vestibule.wallSegments.length, 2);
      assert.ok(port.vestibule.width > 0);
    }

    if (shape === "circle") {
      // Direct circular portals retain the complete collision boundary. Their
      // trigger is placed relative to the template-derived boundary anchor.
      assert.equal(port.boundaryOpening, null);
      const radius = Math.min(room.width, room.height) / 2;
      const center = { x: room.width / 2, y: room.height / 2 };
      const frame = resolveRoomPortFrame(room, port);
      const derived = Math.hypot(frame.anchor.x - center.x, frame.anchor.y - center.y);
      assert.ok(Math.abs(derived - radius) < 1e-5);
    }
  }
}

// FloorModel now creates template-aware ports for both ends of every graph edge.
const reverse = { north: "south", east: "west", south: "north", west: "east" };
const offsets = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};
for (const shape of Object.keys(expectedModes)) {
  for (const direction of directions) {
    const offset = offsets[direction];
    const floor = new FloorModel({
      id: `automatic-${shape}-${direction}`,
      gridWidth: 3,
      gridHeight: 3,
      rooms: [
        { id: "template-room", gridPosition: { x: 1, y: 1 }, shape, isStartRoom: true, type: "start" },
        { id: "neighbor", gridPosition: { x: 1 + offset.x, y: 1 + offset.y }, shape: "rectangle", type: "combat" },
      ],
      connections: [{
        id: "template-link",
        roomAId: "template-room",
        roomBId: "neighbor",
        directionFromA: direction,
      }],
      startRoomId: "template-room",
    });
    const room = floor.getRoomDefinition("template-room");
    const port = room.getPortForConnection("template-link");
    const reversePort = floor.getRoomDefinition("neighbor").getPortForConnection("template-link");
    assert.ok(port);
    assert.ok(reversePort);
    assert.equal(port.direction, direction);
    assert.equal(reversePort.direction, reverse[direction]);
    assert.equal(port.mode, expectedModes[shape]);
    assert.equal(room.validatePortLayout().valid, true,
      `${shape} ${direction} floor port: ${JSON.stringify(room.validatePortLayout().errors)}`);

    // Port strategy and custom geometry survive save/load serialization.
    const restored = FloorModel.fromJSON(floor.toJSON());
    const restoredPort = restored.getRoomDefinition("template-room").getPortForConnection("template-link");
    assert.equal(restoredPort.mode, expectedModes[shape]);
    assert.equal(restoredPort.direction, direction);
    assert.equal(restored.getRoomDefinition("template-room").validatePortLayout().valid, true);
  }
}

// Procedural floors using each built-in shape generate valid ports across
// multiple deterministic layouts, including rooms with several connections.
import FloorGenerator from "../world/FloorGenerator.js";
for (const shape of Object.keys(expectedModes)) {
  for (let seed = 1; seed <= 25; seed++) {
    const floor = FloorGenerator.generate({
      id: `template-floor-${shape}-${seed}`,
      seed,
      roomShape: shape,
      roomCount: 10,
      minRooms: 10,
      maxRooms: 10,
    });
    for (const room of floor.rooms.values()) {
      const report = room.validatePortLayout();
      assert.equal(report.valid, true,
        `${shape} seed ${seed} room ${room.id}: ${JSON.stringify(report.errors)}`);
    }
  }
}

// Explicitly supplied ports are preserved rather than regenerated/replaced.
const manualFloor = new FloorModel({
  id: "manual-port-preservation",
  gridWidth: 3,
  gridHeight: 3,
  rooms: [
    {
      id: "manual-diamond", gridPosition: { x: 1, y: 1 }, shape: "diamond",
      ports: [{
        id: "manual-port", connectionId: "manual-link", direction: "east",
        mode: "vestibule", anchor: { x: 800, y: 400 }, outwardNormal: { x: 1, y: 0 },
        openingWidth: 140,
        boundaryOpening: { type: "polyline", points: [{x:730,y:330},{x:800,y:400},{x:730,y:470}] },
        vestibule: {
          length: 96, width: 140,
          wallSegments: [
            {start:{x:730,y:330},end:{x:826,y:330}},
            {start:{x:730,y:470},end:{x:826,y:470}},
          ],
        },
      }],
    },
    { id: "manual-neighbor", gridPosition: { x: 2, y: 1 }, shape: "rectangle" },
  ],
  connections: [{ id: "manual-link", roomAId: "manual-diamond", roomBId: "manual-neighbor", directionFromA: "east" }],
  startRoomId: "manual-diamond",
});
assert.equal(manualFloor.getRoomDefinition("manual-diamond").ports[0].id, "manual-port");
assert.equal(manualFloor.getRoomDefinition("manual-diamond").ports[0].anchor.x, 800);

console.log("room-port-generator.test.js passed (5 templates x 4 directions, floor integration, serialization, 125 generated floors).");
