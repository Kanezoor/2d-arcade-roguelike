import assert from 'node:assert/strict';
import Enemy from '../entities/Enemy.js';

globalThis.Phaser = {
  Math: {
    FloatBetween: (min, max) => (min + max) / 2,
    Angle: { Between: () => 0 },
  },
};

let xpAwarded = 0;
const scene = {
  score: 10,
  // Deliberately no scene.scoreText: score presentation belongs to HUDScene.
  player: { gainExperience: amount => { xpAwarded += amount; } },
  add: {
    rectangle: () => ({ destroy() {} }),
  },
  tweens: { add() {} },
};
const sprite = {
  x: 120,
  y: 80,
  active: true,
  destroy() { this.active = false; },
};
const enemy = new Enemy(sprite, {
  health: 1,
  speed: 1,
  damage: 1,
  score: 25,
  xp: 7,
  color: 0xffffff,
  knockbackResistance: 0,
}, scene);

assert.equal(enemy.takeDamage({ baseDamage: 1, knockbackStrength: 0 }), true);
assert.equal(enemy.isDead, true);
assert.equal(scene.score, 35);
assert.equal(xpAwarded, 7);
assert.equal(sprite.active, false);

// A second collision callback in the same frame must not award score/XP twice.
assert.equal(enemy.takeDamage({ baseDamage: 1, knockbackStrength: 0 }), false);
assert.equal(scene.score, 35);
assert.equal(xpAwarded, 7);

console.log('Enemy death score/HUD decoupling tests passed.');
