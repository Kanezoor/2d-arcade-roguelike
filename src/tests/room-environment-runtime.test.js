import assert from "node:assert/strict";
import RoomEnvironmentRuntime from "../world/RoomEnvironmentRuntime.js";
import { createDefaultEnvironmentalObjectRegistry } from "../world/EnvironmentalObjectRegistry.js";

class FakeGameObject {
  constructor(kind, x, y, width, height, color, alpha = 1) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.alpha = alpha;
    this.active = true;
    this.rotation = 0;
    this.body = null;
  }
  setStrokeStyle(width, color) { this.strokeWidth = width; this.strokeColor = color; return this; }
  setDepth(depth) { this.depth = depth; return this; }
  setRotation(rotation) { this.rotation = rotation; if (this.body) this.body.angle = rotation; return this; }
  destroy() { this.active = false; return this; }
  getBounds() { return { x: this.x - this.width / 2, y: this.y - this.height / 2, width: this.width, height: this.height }; }
}

const attached = [];
const scene = {
  add: {
    rectangle: (...args) => new FakeGameObject("rectangle", ...args),
    ellipse: (...args) => new FakeGameObject("ellipse", ...args),
  },
  matter: {
    add: {
      gameObject: (object, options) => {
        object.body = { ...options, angle: 0 };
        attached.push({ object, options });
        return object;
      },
    },
  },
};

const room = {
  id: "runtime-test-room",
  roomLayout: {
    placements: [
      { id: "pillar-1", definitionId: "stone_pillar", x: 250, y: 250, width: 60, height: 60, rotation: 0 },
      { id: "barricade-1", definitionId: "wooden_barricade", x: 550, y: 250, width: 140, height: 36, rotation: 0.35 },
      { id: "pit-1", definitionId: "pit", x: 250, y: 550, width: 100, height: 100, rotation: 0 },
      { id: "unknown-1", definitionId: "missing_object", x: 550, y: 550, width: 60, height: 60, rotation: 0 },
    ],
  },
};

const warnings = [];
const runtime = new RoomEnvironmentRuntime(scene, room, {
  registry: createDefaultEnvironmentalObjectRegistry(),
  onWarning: warning => warnings.push(warning),
});

assert.equal(runtime.objects.length, 3, "unknown definitions should be skipped safely");
assert.equal(warnings.length, 1);
assert.equal(attached.length, 3);

const pillar = runtime.byPlacementId.get("pillar-1").gameObject;
assert.equal(pillar.kind, "ellipse");
assert.equal(pillar.body.isStatic, true);
assert.equal(pillar.body.isSensor, false);
assert.equal(pillar.body.shape.type, "circle");
assert.equal(pillar.environmentalObject.blocksMovement, true);
assert.equal(pillar.environmentalObject.blocksProjectiles, true);

const barricade = runtime.byPlacementId.get("barricade-1").gameObject;
assert.equal(barricade.kind, "rectangle");
assert.equal(barricade.body.isStatic, true);
assert.equal(barricade.rotation, 0.35);
assert.equal(barricade.body.angle, 0.35, "body rotation must be applied after Matter attachment");

const pit = runtime.byPlacementId.get("pit-1").gameObject;
assert.equal(pit.body.isStatic, true);
assert.equal(pit.body.isSensor, true);
assert.equal(pit.environmentalObject.blocksMovement, false);
assert.equal(pit.environmentalObject.hazard.damage, 8);
assert.equal(runtime.getGameObjects().length, 3);

runtime.destroy();
assert.equal(runtime.objects.length, 0);
assert.equal(runtime.getGameObjects().length, 0);
assert.equal(pillar.active, false);
assert.equal(barricade.active, false);
assert.equal(pit.active, false);

console.log("Room environment runtime tests passed (Phaser primitives, Matter solids/sensors, rotation, unknown definitions and cleanup).");
