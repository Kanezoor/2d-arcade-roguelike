import assert from "node:assert/strict";
import RoomDefinition from "../world/RoomDefinition.js";
import { validateRoomLayout } from "../world/RoomLayoutValidator.js";

function createRoom(overrides = {}) {
  return new RoomDefinition({
    id: "layout-validation-room",
    gridPosition: { x: 1, y: 1 },
    type: "combat",
    templateId: "rectangle",
    width: 800,
    height: 800,
    ports: [
      { id: "north-port", direction: "north", anchor: { x: 400, y: 0 }, outwardNormal: { x: 0, y: -1 } },
      { id: "east-port", direction: "east", anchor: { x: 800, y: 400 }, outwardNormal: { x: 1, y: 0 } },
    ],
    ...overrides,
  });
}

const room = createRoom();
const validLayout = [
  { id: "pillar-a", definitionId: "stone_pillar", x: 0.32, y: 0.32, width: 0.075, height: 0.075, rotation: 0 },
  { id: "pillar-b", definitionId: "stone_pillar", x: 0.68, y: 0.68, width: 0.075, height: 0.075, rotation: 0 },
];
assert.equal(validateRoomLayout(room, validLayout).valid, true);
assert.equal(validateRoomLayout(room, []).valid, true, "empty layouts are valid assignments");

const outside = validateRoomLayout(room, [
  { id: "edge-pillar", definitionId: "stone_pillar", x: 0.04, y: 0.04, width: 0.1, height: 0.1, rotation: 0 },
]);
assert.equal(outside.valid, false);
assert.ok(outside.errors.some(issue => issue.code === "outside-room-outline"));

const blocksEntry = validateRoomLayout(room, [
  { id: "north-blocker", definitionId: "stone_pillar", x: 0.5, y: 0.3, width: 0.12, height: 0.12, rotation: 0 },
]);
assert.equal(blocksEntry.valid, false);
assert.ok(blocksEntry.errors.some(issue => issue.code === "blocks-entrance-approach"));

const overlaps = validateRoomLayout(room, [
  { id: "pillar-a", definitionId: "stone_pillar", x: 0.3, y: 0.3, width: 0.12, height: 0.12, rotation: 0 },
  { id: "pillar-b", definitionId: "stone_pillar", x: 0.34, y: 0.34, width: 0.12, height: 0.12, rotation: 0 },
]);
assert.equal(overlaps.valid, false);
assert.ok(overlaps.errors.some(issue => issue.code === "overlapping-placements"));

const diamond = createRoom({
  id: "diamond-layout-room",
  templateId: "diamond",
  ports: [],
});
const diamondValid = validateRoomLayout(diamond, [
  { id: "diamond-pillar-a", definitionId: "stone_pillar", x: 0.34, y: 0.34, width: 0.075, height: 0.075, rotation: 0 },
  { id: "diamond-pillar-b", definitionId: "stone_pillar", x: 0.66, y: 0.66, width: 0.075, height: 0.075, rotation: 0 },
]);
assert.equal(diamondValid.valid, true, JSON.stringify(diamondValid.errors));

console.log("Room layout validator tests passed (bounds, entrances, overlap, polygon shapes and empty layouts).");
