import { createDefaultEnvironmentalObjectRegistry } from "./EnvironmentalObjectRegistry.js";

function isValidPlacement(placement) {
  return placement &&
    typeof placement.id === "string" && placement.id.trim() &&
    typeof placement.definitionId === "string" && placement.definitionId.trim() &&
    ["x", "y", "width", "height", "rotation"].every(key => Number.isFinite(placement[key])) &&
    placement.width > 0 && placement.height > 0;
}

/** Creates and owns the Phaser/Matter representation of a saved room layout. */
export default class RoomEnvironmentRuntime {
  constructor(scene, room, {
    registry = createDefaultEnvironmentalObjectRegistry(),
    onWarning = message => console.warn(message),
  } = {}) {
    if (!scene || !scene.add || !scene.matter?.add?.gameObject) {
      throw new TypeError("RoomEnvironmentRuntime requires a Phaser scene with Matter support.");
    }
    if (!room || typeof room.id !== "string") {
      throw new TypeError("RoomEnvironmentRuntime requires a room definition.");
    }
    this.scene = scene;
    this.room = room;
    this.registry = registry;
    this.onWarning = onWarning;
    this.objects = [];
    this.byPlacementId = new Map();
    this.isDestroyed = false;

    const placements = room.roomLayout?.placements ?? [];
    for (const placement of placements) this.createPlacement(placement);
  }

  createPlacement(placement) {
    if (!isValidPlacement(placement)) {
      this.onWarning(`Skipping invalid environmental placement in room "${this.room.id}".`);
      return null;
    }
    if (this.byPlacementId.has(placement.id)) {
      this.onWarning(`Skipping duplicate environmental placement "${placement.id}" in room "${this.room.id}".`);
      return null;
    }

    const definition = this.registry.get(placement.definitionId);
    if (!definition) {
      this.onWarning(`Unknown environmental object "${placement.definitionId}" in room "${this.room.id}"; placement was skipped.`);
      return null;
    }

    const { x, y, width, height, rotation = 0 } = placement;
    const visual = definition.visual;
    const gameObject = visual.shape === "ellipse"
      ? this.scene.add.ellipse(x, y, width, height, visual.fillColor, visual.alpha)
      : this.scene.add.rectangle(x, y, width, height, visual.fillColor, visual.alpha);

    if (typeof gameObject.setStrokeStyle === "function" && visual.strokeWidth > 0) {
      gameObject.setStrokeStyle(visual.strokeWidth, visual.strokeColor, 1);
    }
    gameObject.setDepth?.(visual.depth);

    const collision = definition.collision;
    if (collision.mode !== "none") {
      const bodyOptions = {
        isStatic: true,
        isSensor: collision.mode === "sensor",
        label: `environment:${definition.id}:${placement.id}`,
      };
      if (collision.shape === "circle") {
        bodyOptions.shape = {
          type: "circle",
          radius: Math.min(width, height) / 2,
        };
      }
      this.scene.matter.add.gameObject(gameObject, bodyOptions);
      // Match the visual and Matter body after attachment (same rule as room walls).
      if (rotation !== 0) gameObject.setRotation(rotation);
    } else if (rotation !== 0) {
      gameObject.setRotation(rotation);
    }

    const runtimeData = {
      placementId: placement.id,
      definitionId: definition.id,
      category: definition.category,
      blocksMovement: collision.blocksMovement,
      blocksProjectiles: collision.blocksProjectiles,
      collisionMode: collision.mode,
      hazard: definition.hazard,
      definition,
      lastContactAt: new WeakMap(),
    };
    gameObject.environmentalObject = runtimeData;
    gameObject.environmentPlacementId = placement.id;

    const instance = { gameObject, placement, definition, runtimeData };
    this.objects.push(instance);
    this.byPlacementId.set(placement.id, instance);
    return instance;
  }

  getGameObjects() {
    return this.objects.map(instance => instance.gameObject).filter(object => object?.active !== false);
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    for (const instance of this.objects) {
      const gameObject = instance.gameObject;
      if (gameObject?.active !== false) gameObject?.destroy?.();
    }
    this.objects = [];
    this.byPlacementId.clear();
  }
}
