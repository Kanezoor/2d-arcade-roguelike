import assert from "node:assert/strict";
import Beam from "../entities/Beam.js";

globalThis.Phaser = {
  Math: { Angle: { Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1) } },
  Geom: {
    Line: class Line { constructor(x1, y1, x2, y2) { Object.assign(this, { x1, y1, x2, y2 }); } },
    Intersects: { LineToRectangle: () => false },
  },
};

const calls = [];
const obstacle = {
  x: 100,
  y: 50,
  active: true,
  environmentalObject: { blocksProjectiles: true, destructible: true },
  getBounds: () => ({ x: 100, y: 40, width: 20, height: 20 }),
};
const graphics = {
  clear() {}, lineStyle() {}, beginPath() {}, moveTo() {}, lineTo() {}, strokePath() {},
};
const scene = {
  add: { graphics: () => graphics },
  time: { now: 0 },
  roomManager: {
    roomEnvironment: { getGameObjects: () => [obstacle] },
    damageEnvironmentalObject(target, context) { calls.push({ target, context }); },
  },
  enemies: { getChildren: () => [] },
  bosses: { getChildren: () => [] },
};
const beam = new Beam(scene, { sprite: { x: 0, y: 50 } }, 2, 300);
beam.start();
beam.update({ worldX: 300, worldY: 50 });
assert.equal(calls.length, 1);
assert.equal(calls[0].target, obstacle);
assert.equal(calls[0].context.type, "laser");
assert.equal(calls[0].context.baseDamage, 2);

scene.time.now = 100;
beam.update({ worldX: 300, worldY: 50 });
assert.equal(calls.length, 1, "beam damage should respect its damage interval");
scene.time.now = 200;
beam.update({ worldX: 300, worldY: 50 });
assert.equal(calls.length, 2, "beam should damage the same obstruction again after the interval");
beam.stop();

console.log("Environmental beam damage tests passed (laser damage routing and interval cooldown).");
