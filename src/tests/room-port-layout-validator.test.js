import assert from "node:assert/strict";
import RoomDefinition from "../world/RoomDefinition.js";
import RoomPort from "../world/RoomPort.js";
import FloorModel from "../world/FloorModel.js";
import FloorGenerator from "../world/FloorGenerator.js";
import { configureDiamondVestibulePrototype } from "../world/DiamondVestibulePrototype.js";
import {
  assertValidRoomPortLayout,
  RoomPortLayoutError,
  validateRoomPortLayout,
} from "../world/RoomPortLayoutValidator.js";

function makeRoom(shape = "rectangle", width = 800, height = 600) {
  return new RoomDefinition({
    id: `validation-${shape}-${width}-${height}`,
    gridPosition: { x: 0, y: 0 },
    shape,
    width,
    height,
  });
}

// Standard ports fit on rectangular, square, diamond-custom and octagonal edges.
const rectangle = makeRoom("rectangle");
rectangle.addPort(new RoomPort({ id: "north", direction: "north", anchor: { x: 400, y: 0 }, outwardNormal: { x: 0, y: -1 } }));
rectangle.addPort(new RoomPort({ id: "south", direction: "south", anchor: { x: 400, y: 600 }, outwardNormal: { x: 0, y: 1 } }));
assert.equal(rectangle.validatePortLayout().valid, true);
assert.equal(assertValidRoomPortLayout(rectangle).portsChecked, 2);

for (const [shape, width, height] of [
  ["square", 800, 800],
  ["rectangle", 920, 540],
  ["octagon", 800, 600],
  ["circle", 800, 800],
]) {
  const room = makeRoom(shape, width, height);
  room.addPort(new RoomPort({ id: `${shape}-east`, direction: "east" }));
  const report = validateRoomPortLayout(room);
  assert.equal(report.valid, true, `${shape} east port should fit: ${JSON.stringify(report.errors)}`);
}

// A too-wide opening and an opening too close to the corner are rejected.
const tooWide = makeRoom();
tooWide.addPort(new RoomPort({
  id: "too-wide", direction: "north", anchor: { x: 400, y: 0 },
  outwardNormal: { x: 0, y: -1 }, openingWidth: 900,
}));
assert.ok(tooWide.validatePortLayout().errors.some(issue => issue.code === "opening-does-not-fit-boundary"));

const nearCorner = makeRoom();
nearCorner.addPort(new RoomPort({
  id: "near-corner", direction: "north", anchor: { x: 55, y: 0 },
  outwardNormal: { x: 0, y: -1 }, openingWidth: 140,
}));
assert.ok(nearCorner.validatePortLayout().errors.some(issue => issue.code === "opening-does-not-fit-boundary"));

// Two openings cannot occupy the same section of wall.
const overlapping = makeRoom();
overlapping.addPort(new RoomPort({ id: "north-a", direction: "north", anchor: { x: 350, y: 0 }, outwardNormal: { x: 0, y: -1 }, openingWidth: 180 }));
overlapping.addPort(new RoomPort({ id: "north-b", direction: "north", anchor: { x: 430, y: 0 }, outwardNormal: { x: 0, y: -1 }, openingWidth: 180 }));
assert.ok(overlapping.validatePortLayout().errors.some(issue => issue.code === "room-entrances-overlap"));
assert.throws(() => overlapping.assertValidPortLayout(), RoomPortLayoutError);

const overlappingVestibules = makeRoom();
for (const [id, x] of [["north-vestibule-a", 360], ["north-vestibule-b", 440]]) {
  overlappingVestibules.addPort(new RoomPort({
    id, direction: "north", mode: "vestibule",
    anchor: { x, y: 0 }, outwardNormal: { x: 0, y: -1 },
    openingWidth: 180, vestibule: { width: 180, length: 140 },
  }));
}
assert.ok(overlappingVestibules.validatePortLayout().errors.some(issue => issue.code === "room-entrances-overlap"));
assert.ok(overlappingVestibules.validatePortLayout().errors.some(issue => issue.code === "vestibules-intersect"));

// A vestibule whose walls point into the room is invalid.
const inwardVestibule = makeRoom();
inwardVestibule.addPort(new RoomPort({
  id: "inward", direction: "north", mode: "vestibule",
  anchor: { x: 400, y: 0 }, outwardNormal: { x: 0, y: 1 },
  vestibule: { width: 120, length: 140 },
}));
assert.ok(inwardVestibule.validatePortLayout().errors.some(issue => issue.code === "vestibule-wall-enters-room"));

// A geometrically valid vestibule is rejected when it intrudes into another
// room/obstacle polygon in the same coordinate space.
const northVestibule = makeRoom();
northVestibule.addPort(new RoomPort({
  id: "north-vestibule", direction: "north", mode: "vestibule",
  anchor: { x: 400, y: 0 }, outwardNormal: { x: 0, y: -1 },
  vestibule: { width: 120, length: 140 },
}));
const obstacleReport = northVestibule.validatePortLayout({
  obstacleOutlines: [{
    id: "neighboring-structure",
    points: [
      { x: 370, y: -100 }, { x: 430, y: -100 },
      { x: 430, y: -60 }, { x: 370, y: -60 },
    ],
  }],
});
assert.ok(obstacleReport.errors.some(issue => issue.code === "vestibule-intersects-obstacle"));

// The project's bespoke diamond vestibule keeps its multi-segment threshold
// and remains valid after the template-driven checks.
const diamondFloor = new FloorModel({
  id: "validator-diamond-floor", gridWidth: 4, gridHeight: 4,
  rooms: [
    { id: "validator-start", gridPosition: { x: 1, y: 1 }, type: "start", isStartRoom: true },
    { id: "validator-diamond", gridPosition: { x: 2, y: 1 }, type: "combat" },
    { id: "validator-boss", gridPosition: { x: 1, y: 2 }, type: "boss", isBossRoom: true },
  ],
  connections: [
    { id: "validator-start-link", roomAId: "validator-diamond", roomBId: "validator-start", directionFromA: "west" },
    { id: "validator-boss-link", roomAId: "validator-start", roomBId: "validator-boss", directionFromA: "south" },
  ],
  startRoomId: "validator-start", bossRoomId: "validator-boss",
});
const diamondPrototype = configureDiamondVestibulePrototype(diamondFloor);
assert.ok(diamondPrototype);
const diamond = diamondFloor.getRoomDefinition(diamondPrototype.roomId);
assert.equal(diamond.validatePortLayout().valid, true, JSON.stringify(diamond.validatePortLayout().errors));

for (const direction of ["north", "east", "south", "west"]) {
  const directionalFloor = new FloorModel({
    id: `validator-diamond-${direction}`, gridWidth: 4, gridHeight: 4,
    rooms: [
      { id: "start", gridPosition: { x: 1, y: 1 }, type: "start", isStartRoom: true },
      { id: "diamond", gridPosition: { x: 2, y: 1 }, type: "combat" },
      { id: "boss", gridPosition: { x: 1, y: 2 }, type: "boss", isBossRoom: true },
    ],
    connections: [
      { id: "to-start", roomAId: "diamond", roomBId: "start", directionFromA: direction },
      { id: "to-boss", roomAId: "start", roomBId: "boss", directionFromA: "south" },
    ],
    startRoomId: "start", bossRoomId: "boss",
  });
  const result = configureDiamondVestibulePrototype(directionalFloor);
  const configuredRoom = directionalFloor.getRoomDefinition(result.roomId);
  assert.equal(configuredRoom.validatePortLayout().valid, true,
    `${direction} diamond port: ${JSON.stringify(configuredRoom.validatePortLayout().errors)}`);
}

// The active procedural floor configuration remains valid before RoomManager
// begins materializing Phaser/Matter objects.
const generatedFloor = FloorGenerator.generate({
  id: "validator-generated-floor", seed: 9127, roomCount: 10,
  minRooms: 10, maxRooms: 10, gridWidth: 7, gridHeight: 7,
  roomWidth: 800, roomHeight: 800, roomShape: "rectangle",
});
configureDiamondVestibulePrototype(generatedFloor);
for (const generatedRoom of generatedFloor.rooms.values()) {
  assert.equal(generatedRoom.validatePortLayout().valid, true,
    `${generatedRoom.id}: ${JSON.stringify(generatedRoom.validatePortLayout().errors)}`);
}

console.log("Room port layout validator tests passed (fit, overlap, vestibule and obstacle clearance).");
