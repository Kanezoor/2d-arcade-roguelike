import assert from "node:assert/strict";
import { getRoomSlideOffsets } from "../world/RoomTransitionController.js";

const width = 800;
const height = 800;

const east = getRoomSlideOffsets("east", width, height);
assert.deepEqual(east.outgoingStart, { x: 0, y: 0 });
assert.deepEqual(east.outgoingEnd, { x: -800, y: 0 });
assert.deepEqual(east.incomingStart, { x: 800, y: 0 });
assert.deepEqual(east.incomingEnd, { x: 0, y: 0 });

const west = getRoomSlideOffsets("west", width, height);
assert.deepEqual(west.outgoingEnd, { x: 800, y: 0 });
assert.deepEqual(west.incomingStart, { x: -800, y: 0 });

const north = getRoomSlideOffsets("north", width, height);
assert.deepEqual(north.outgoingEnd, { x: 0, y: 800 });
assert.deepEqual(north.incomingStart, { x: 0, y: -800 });

const south = getRoomSlideOffsets("south", width, height);
assert.deepEqual(south.outgoingEnd, { x: 0, y: -800 });
assert.deepEqual(south.incomingStart, { x: 0, y: 800 });

const offsetViewport = getRoomSlideOffsets("east", 800, 600, 40, 30);
assert.deepEqual(offsetViewport.outgoingEnd, { x: -760, y: 30 });
assert.deepEqual(offsetViewport.incomingStart, { x: 840, y: 30 });
assert.deepEqual(offsetViewport.incomingEnd, { x: 40, y: 30 });

assert.throws(() => getRoomSlideOffsets("up", width, height), TypeError);
assert.throws(() => getRoomSlideOffsets("east", 0, height), TypeError);
assert.throws(() => getRoomSlideOffsets("west", width, Number.NaN), TypeError);

console.log("Room transition tests passed (4 directions + viewport offsets).");
