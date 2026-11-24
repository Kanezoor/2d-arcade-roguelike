import assert from "node:assert/strict";
import RoomEnvironmentRuntime from "../world/RoomEnvironmentRuntime.js";
import { createDefaultEnvironmentalObjectRegistry } from "../world/EnvironmentalObjectRegistry.js";
import RoomState from "../world/RoomState.js";

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
  getBounds() { return { x: this.x - this.width / 2, y: this.y - this.height / 2, width: this.width, height: this.height }; }
}

function makeScene() {
  const scene = {
    add: {
      rectangle: (...args) => new FakeGameObject("rectangle", ...args),
      ellipse: (...args) => new FakeGameObject("ellipse", ...args),
    },
    matter: {
      add: {
        gameObject: (object, options) => {
          object.body = { ...options, angle: 0 };
          return object;
        },
      },
    },
    tweens: { add(config) { scene.lastTween = config; } },
  };
  return scene;
}

const room = {
  id: "destruction-room",
  roomLayout: {
    placements: [
      { id: "wood-1", definitionId: "wooden_barricade", x: 250, y: 250, width: 140, height: 36, rotation: 0 },
      { id: "stone-1", definitionId: "stone_pillar", x: 500, y: 250, width: 60, height: 60, rotation: 0 },
      { id: "pit-1", definitionId: "pit", x: 250, y: 500, width: 100, height: 100, rotation: 0 },
    ],
  },
};
const roomState = new RoomState(room.id);
const scene = makeScene();
const runtime = new RoomEnvironmentRuntime(scene, room, { roomState });
const wood = runtime.byPlacementId.get("wood-1");
const stone = runtime.byPlacementId.get("stone-1");
const pit = runtime.byPlacementId.get("pit-1");

assert.equal(wood.health, 10);
assert.equal(wood.gameObject.body.isSensor, false);
const firstHit = runtime.applyDamageToObject(wood.gameObject, { baseDamage: 4, type: "kinetic" });
assert.equal(firstHit.applied, true);
assert.equal(firstHit.destroyed, false);
assert.equal(firstHit.health, 6);
assert.notEqual(wood.gameObject.color, wood.definition.visual.fillColor, "damaged cover should change appearance");
assert.equal(roomState.getEnvironmentalObjectState("wood-1").health, 6, "partial damage should persist immediately");

const immuneHit = runtime.applyDamageToObject(stone.gameObject, { baseDamage: 10, type: "physical" });
assert.equal(immuneHit.applied, false, "unconfigured damage types should not damage stone by default");
const laserHit = runtime.applyDamageToObject(stone.gameObject, { baseDamage: 10, type: "laser" });
assert.equal(laserHit.applied, true);
assert.equal(laserHit.health, 15.5, "stone pillar should resist laser damage");

const breakingHit = runtime.applyDamageToObject(wood.gameObject, { baseDamage: 10, type: "kinetic" });
assert.equal(breakingHit.destroyed, true);
assert.equal(wood.health, 0);
assert.equal(wood.gameObject.environmentalObject.blocksMovement, false);
assert.equal(wood.gameObject.environmentalObject.blocksProjectiles, false);
assert.equal(wood.gameObject.body.isSensor, true, "destroyed cover should stop blocking Matter bodies");
assert.equal(runtime.getGameObjects().includes(wood.gameObject), true, "destroyed object should leave visible rubble");
assert.equal(scene.lastTween?.targets instanceof Object, true, "destruction should spawn animated debris");
assert.equal(roomState.getEnvironmentalObjectState("wood-1").destroyed, true);

const pitHit = runtime.applyDamageToObject(pit.gameObject, { baseDamage: 99, type: "kinetic" });
assert.equal(pitHit.applied, false, "hazards remain indestructible in H.10");

const savedRoomState = JSON.parse(JSON.stringify(roomState.toJSON()));
runtime.destroy();
const restoredState = new RoomState(room.id, savedRoomState);
const restoredRuntime = new RoomEnvironmentRuntime(makeScene(), room, { roomState: restoredState });
const restoredWood = restoredRuntime.byPlacementId.get("wood-1");
const restoredStone = restoredRuntime.byPlacementId.get("stone-1");
assert.equal(restoredWood.isDestroyed, true);
assert.equal(restoredWood.gameObject.body, null, "destroyed rubble should not recreate a collision body");
assert.equal(restoredWood.gameObject.environmentalObject.blocksProjectiles, false);
assert.equal(restoredStone.health, 15.5, "partially damaged objects should retain health when revisiting");
restoredRuntime.destroy();

console.log("Environmental destruction tests passed (durability, typed damage, resistance, damage visuals, debris, collision removal and room-state persistence).");
