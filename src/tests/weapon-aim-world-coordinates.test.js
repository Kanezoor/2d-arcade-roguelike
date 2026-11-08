import assert from 'node:assert/strict';
import Weapon from '../weapons/Weapon.js';

globalThis.Phaser = {
  Math: {
    Angle: {
      Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    },
  },
};

const weapon = Object.create(Weapon.prototype);
weapon.owner = { sprite: { x: 100, y: 100 } };

// Screen coordinates point east, but the camera-adjusted world point points south.
// A projectile must use worldX/worldY, matching Beam's existing behavior.
const pointer = {
  x: 900,
  y: 100,
  worldX: 100,
  worldY: 300,
};

assert.equal(weapon.getAimAngle(pointer), Math.PI / 2);

// Fallback keeps simple test pointers and non-camera contexts usable.
assert.equal(
  weapon.getAimAngle({ x: 300, y: 100 }),
  0,
);

assert.throws(() => weapon.getAimAngle(null), /requires a pointer/);
assert.throws(() => weapon.getAimAngle({}), /finite worldX\/worldY/);

console.log('Weapon world-coordinate aiming tests passed.');
