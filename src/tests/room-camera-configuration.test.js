import assert from "node:assert/strict";
import RoomManager from "../managers/RoomManager.js";
import { getRoomCameraLayout } from "../world/RoomCameraLayout.js";

const calls = [];
const camera = {
  stopFollow: () => calls.push(["stopFollow"]),
  setZoom: (...args) => calls.push(["setZoom", ...args]),
  setBounds: (...args) => calls.push(["setBounds", ...args]),
  centerOn: (...args) => calls.push(["centerOn", ...args]),
  startFollow: (...args) => calls.push(["startFollow", ...args]),
  setScroll: (...args) => calls.push(["setScroll", ...args]),
};
const player = { x: 640, y: 420 };
const manager = Object.create(RoomManager.prototype);
manager.scene = {
  cameras: { main: camera },
  player: { sprite: player },
  scale: { width: 1920, height: 1080 },
};

manager.configureRoomCamera({ width: 1600, height: 800, cameraMode: "follow" });
assert.deepEqual(calls, [
  ["stopFollow"],
  ["setZoom", 1.35],
  ["setBounds", 0, 0, 1600, 800],
  ["centerOn", 640, 420],
  ["startFollow", player, true, 0.12, 0.12],
]);

calls.length = 0;
manager.configureRoomCamera({ width: 800, height: 800, cameraMode: "fixed" });
assert.deepEqual(calls, [
  ["stopFollow"],
  ["setZoom", 1.35],
  ["setBounds", -311.1111111111111, 0, 1422.2222222222222, 800],
  ["centerOn", 400, 400],
]);

const fitWide = getRoomCameraLayout(800, 800, 1366, 768);
assert.equal(fitWide.zoom, 0.96);
assert.ok(fitWide.bounds.x < 0);

const fitPortrait = getRoomCameraLayout(800, 1600, 600, 900);
assert.equal(fitPortrait.zoom, 0.75);
assert.equal(fitPortrait.bounds.width, 800);
assert.equal(fitPortrait.bounds.height, 1600);

assert.throws(() => getRoomCameraLayout(0, 800, 1920, 1080), /roomWidth/);

console.log("Room camera configuration tests passed (responsive fixed and follow modes).");
