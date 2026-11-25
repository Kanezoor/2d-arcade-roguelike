import assert from "node:assert/strict";
import RoomEnvironmentRuntime from "../world/RoomEnvironmentRuntime.js";
import { createDefaultEnvironmentalObjectRegistry } from "../world/EnvironmentalObjectRegistry.js";
import { updateCoverCombatAI } from "../ai/CoverCombatAI.js";

class FakeGameObject {
  constructor(kind, x, y, width, height, color, alpha = 1) {
    Object.assign(this, { kind, x, y, width, height, color, alpha, active: true, rotation: 0, body: null });
  }
  setStrokeStyle(width, color) { this.strokeWidth = width; this.strokeColor = color; return this; }
  setDepth(depth) { this.depth = depth; return this; }
  setRotation(rotation) { this.rotation = rotation; if (this.body) this.body.angle = rotation; return this; }
  setFillStyle(color, alpha = this.alpha) { this.color = color; this.alpha = alpha; return this; }
  setAlpha(alpha) { this.alpha = alpha; return this; }
  setSensor(value) { if (this.body) this.body.isSensor = Boolean(value); return this; }
  destroy() { this.active = false; return this; }
}

function makeScene() {
  const scene = {
    add: {
      rectangle: (...args) => new FakeGameObject("rectangle", ...args),
      ellipse: (...args) => new FakeGameObject("ellipse", ...args),
    },
    matter: { add: { gameObject: (object, options) => { object.body = { ...options, angle: 0 }; return object; } } },
    tweens: { add() {} },
  };
  return scene;
}

const room = {
  id: "cover-ai-room",
  shape: "rectangle",
  width: 800,
  height: 800,
  roomLayout: {
    placements: [
      { id: "pillar-center", definitionId: "stone_pillar", x: 420, y: 400, width: 60, height: 60, rotation: 0 },
    ],
  },
};
const scene = makeScene();
const environment = new RoomEnvironmentRuntime(scene, room, {
  registry: createDefaultEnvironmentalObjectRegistry(),
});
const player = { x: 200, y: 400 };
const enemySprite = {
  x: 580,
  y: 400,
  active: true,
  velocity: { x: 0, y: 0 },
  setVelocity(x, y) { this.velocity = { x, y }; return this; },
};
let shotsFired = 0;
const enemy = {
  usesCover: true,
  isDead: false,
  sprite: enemySprite,
  speed: 3,
  kbX: 0,
  kbY: 0,
  coverAIState: "searching",
  coverPlan: null,
  coverAITimer: 0,
  coverBurstRemaining: 0,
  coverBurstTimer: 0,
  nextCoverSearchAt: 0,
  coverAIConfig: {
    enemyRadius: 18,
    clearance: 16,
    peekClearance: 22,
    arrivalDistance: 14,
    hideDurationMs: 50,
    searchRetryMs: 100,
    burstShots: 2,
    burstDelayMs: 20,
  },
  fireBurstShot() { shotsFired += 1; return true; },
};
scene.player = { sprite: player };
scene.roomManager = { roomEnvironment: environment };
scene.time = { now: 0 };
scene.game = { loop: { delta: 16 } };

assert.equal(environment.hasLineOfSight(player, enemySprite), false, "pillar should block sight to the enemy");
assert.equal(updateCoverCombatAI(enemy, scene), true);
assert.equal(enemy.coverAIState, "approaching");
assert.equal(enemy.coverPlan.placementId, "pillar-center");
assert.equal(environment.hasLineOfSight(player, enemy.coverPlan.hidePosition), false, "hide position should be behind cover");

// Move to the proposed hide position and let the AI enter its hiding phase.
enemySprite.x = enemy.coverPlan.hidePosition.x;
enemySprite.y = enemy.coverPlan.hidePosition.y;
scene.time.now += 16;
assert.equal(updateCoverCombatAI(enemy, scene), true);
assert.equal(enemy.coverAIState, "hiding");
assert.equal(enemySprite.velocity.x, 0);

// Finish the hide interval and move toward a tested, visible peek position.
enemy.coverAITimer = 0;
scene.time.now += 60;
assert.equal(updateCoverCombatAI(enemy, scene), true);
assert.equal(enemy.coverAIState, "peeking");
assert.ok(enemy.coverPlan.peekPosition);
assert.equal(environment.hasLineOfSight(player, enemy.coverPlan.peekPosition), true);

enemySprite.x = enemy.coverPlan.peekPosition.x;
enemySprite.y = enemy.coverPlan.peekPosition.y;
scene.time.now += 16;
assert.equal(updateCoverCombatAI(enemy, scene), true);
assert.equal(enemy.coverAIState, "firing");
scene.time.now += 16;
updateCoverCombatAI(enemy, scene);
assert.equal(shotsFired, 1, "enemy should fire from a clear peek position");

// Destroying its selected cover must invalidate the plan. With no replacement
// cover available, it yields control to the existing kite behavior.
const pillar = environment.getInstance("pillar-center");
environment.destroyInstance(pillar);
scene.time.now += 16;
assert.equal(updateCoverCombatAI(enemy, scene), false, "destroyed cover with no replacement should restore legacy AI control immediately");
assert.equal(enemy.coverAIState, "fallback");

environment.destroy();
console.log("Enemy cover AI tests passed (approach, hide, peek, firing, and destroyed-cover fallback).");
