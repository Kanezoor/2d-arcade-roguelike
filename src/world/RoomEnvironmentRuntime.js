import { createDefaultEnvironmentalObjectRegistry } from "./EnvironmentalObjectRegistry.js";
import { isPointInsideRoom } from "./RoomGeometry.js";
import {
  getEnvironmentalObjectSupportRadius,
  pointOverlapsEnvironmentalObject,
  segmentIntersectsEnvironmentalObject,
} from "./CoverGeometry.js";

function isValidPlacement(placement) {
  return placement &&
    typeof placement.id === "string" && placement.id.trim() &&
    typeof placement.definitionId === "string" && placement.definitionId.trim() &&
    ["x", "y", "width", "height", "rotation"].every(key => Number.isFinite(placement[key])) &&
    placement.width > 0 && placement.height > 0;
}

function mergeVisual(base, override = {}) {
  return { ...base, ...override };
}

function visualForState(definition, health, maxHealth, destroyed) {
  const destructible = definition.destructible;
  if (!destructible) return { ...definition.visual };
  if (destroyed) return mergeVisual(definition.visual, destructible.destroyedVisual);
  const ratio = maxHealth > 0 ? health / maxHealth : 1;
  const stage = destructible.stages.find(candidate => ratio <= candidate.healthRatioBelow);
  return stage ? mergeVisual(definition.visual, stage.visual) : { ...definition.visual };
}

/** Creates and owns the Phaser/Matter representation of a saved room layout. */
export default class RoomEnvironmentRuntime {
  constructor(scene, room, {
    registry = createDefaultEnvironmentalObjectRegistry(),
    roomState = null,
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
    this.roomState = roomState;
    this.onWarning = onWarning;
    this.objects = [];
    this.byPlacementId = new Map();
    this.debrisObjects = [];
    this.isDestroyed = false;

    const placements = room.roomLayout?.placements ?? [];
    for (const placement of placements) this.createPlacement(placement);
  }

  readSavedState(placement, definition) {
    if (!definition.destructible) return null;
    const saved = this.roomState?.getEnvironmentalObjectState?.(placement.id);
    if (!saved || (saved.definitionId && saved.definitionId !== definition.id)) return null;
    const maxHealth = Number.isFinite(saved.maxHealth) && saved.maxHealth > 0
      ? saved.maxHealth
      : definition.destructible.maxHealth;
    const health = Number.isFinite(saved.health)
      ? Math.max(0, Math.min(maxHealth, saved.health))
      : maxHealth;
    return { maxHealth, health, destroyed: Boolean(saved.destroyed || health <= 0) };
  }

  persistInstanceState(instance) {
    if (!instance.definition.destructible || !this.roomState?.setEnvironmentalObjectState) return;
    this.roomState.setEnvironmentalObjectState(instance.placement.id, {
      definitionId: instance.definition.id,
      health: instance.health,
      maxHealth: instance.maxHealth,
      destroyed: instance.isDestroyed,
    });
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

    const saved = this.readSavedState(placement, definition);
    const destructible = definition.destructible;
    const maxHealth = destructible ? (saved?.maxHealth ?? destructible.maxHealth) : null;
    const health = destructible ? (saved?.health ?? maxHealth) : null;
    const isDestroyed = Boolean(destructible && (saved?.destroyed || health <= 0));
    const visual = visualForState(definition, health, maxHealth, isDestroyed);
    const { x, y, width, height, rotation = 0 } = placement;
    const gameObject = visual.shape === "ellipse"
      ? this.scene.add.ellipse(x, y, width, height, visual.fillColor, visual.alpha)
      : this.scene.add.rectangle(x, y, width, height, visual.fillColor, visual.alpha);

    if (typeof gameObject.setStrokeStyle === "function" && visual.strokeWidth > 0) {
      gameObject.setStrokeStyle(visual.strokeWidth, visual.strokeColor, 1);
    }
    gameObject.setDepth?.(visual.depth);

    const collision = definition.collision;
    if (collision.mode !== "none" && !isDestroyed) {
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
      blocksMovement: isDestroyed ? false : collision.blocksMovement,
      blocksProjectiles: isDestroyed ? false : collision.blocksProjectiles,
      collisionMode: isDestroyed ? "none" : collision.mode,
      hazard: definition.hazard,
      destructible: Boolean(destructible),
      health,
      maxHealth,
      isDestroyed,
      lastContactAt: new WeakMap(),
    };
    gameObject.environmentalObject = runtimeData;
    gameObject.environmentPlacementId = placement.id;

    const instance = {
      gameObject,
      placement,
      definition,
      runtimeData,
      health,
      maxHealth,
      isDestroyed,
    };
    this.objects.push(instance);
    this.byPlacementId.set(placement.id, instance);
    return instance;
  }

  getGameObjects() {
    return this.objects.map(instance => instance.gameObject).filter(object => object?.active !== false);
  }

  getInstance(target) {
    if (typeof target === "string") return this.byPlacementId.get(target) ?? null;
    if (!target) return null;
    const placementId = target.environmentPlacementId ?? target.environmentalObject?.placementId;
    return placementId ? (this.byPlacementId.get(placementId) ?? null) : null;
  }

  getCoverInstances() {
    return this.objects.filter(instance => {
      const category = instance.definition.category;
      return instance.gameObject?.active !== false &&
        !instance.isDestroyed &&
        instance.runtimeData.blocksMovement &&
        instance.runtimeData.blocksProjectiles &&
        (category === "cover" || category === "wall");
    });
  }

  isCoverAvailable(placementId) {
    const instance = this.getInstance(placementId);
    return Boolean(instance && !instance.isDestroyed &&
      instance.gameObject?.active !== false &&
      instance.runtimeData.blocksMovement && instance.runtimeData.blocksProjectiles &&
      (instance.definition.category === "cover" || instance.definition.category === "wall"));
  }

  hasLineOfSight(start, end, { ignorePlacementId = null } = {}) {
    if (!start || !end || ![start.x, start.y, end.x, end.y].every(Number.isFinite)) return false;
    return !this.objects.some(instance => {
      if (instance.placement.id === ignorePlacementId || instance.gameObject?.active === false) return false;
      if (!instance.runtimeData.blocksProjectiles || instance.runtimeData.collisionMode === "none") return false;
      return segmentIntersectsEnvironmentalObject(start, end, instance);
    });
  }

  isPositionClear(x, y, padding = 18, { ignorePlacementId = null } = {}) {
    if (![x, y, padding].every(Number.isFinite) || padding < 0) return false;
    const point = { x, y };
    return !this.objects.some(instance => {
      if (instance.placement.id === ignorePlacementId || instance.gameObject?.active === false) return false;
      if (!instance.runtimeData.blocksMovement || instance.runtimeData.collisionMode === "none") return false;
      return pointOverlapsEnvironmentalObject(point, padding, instance);
    });
  }

  findCoverPosition(enemyPosition, playerPosition, { enemyRadius = 18, clearance = 16 } = {}) {
    if (!enemyPosition || !playerPosition) return null;
    const candidates = [];

    for (const instance of this.getCoverInstances()) {
      const center = { x: instance.placement.x, y: instance.placement.y };
      const dx = center.x - playerPosition.x;
      const dy = center.y - playerPosition.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 1) continue;
      const directionX = dx / distance;
      const directionY = dy / distance;
      const support = getEnvironmentalObjectSupportRadius(instance, directionX, directionY);
      const offset = support + enemyRadius + clearance;
      const hidePosition = {
        x: center.x + directionX * offset,
        y: center.y + directionY * offset,
      };

      if (!isPointInsideRoom(this.room, hidePosition.x, hidePosition.y, enemyRadius + 4)) continue;
      if (!this.isPositionClear(hidePosition.x, hidePosition.y, enemyRadius)) continue;
      if (!segmentIntersectsEnvironmentalObject(playerPosition, hidePosition, instance)) continue;
      if (!this.hasLineOfSight(enemyPosition, hidePosition)) continue;

      candidates.push({
        placementId: instance.placement.id,
        instance,
        hidePosition,
        distanceFromEnemy: Math.hypot(hidePosition.x - enemyPosition.x, hidePosition.y - enemyPosition.y),
      });
    }

    candidates.sort((a, b) => a.distanceFromEnemy - b.distanceFromEnemy);
    return candidates[0] ?? null;
  }

  findPeekPosition(placementId, playerPosition, {
    fromPosition = null,
    enemyRadius = 18,
    clearance = 22,
  } = {}) {
    const instance = this.getInstance(placementId);
    if (!instance || !this.isCoverAvailable(placementId) || !playerPosition) return null;

    const center = { x: instance.placement.x, y: instance.placement.y };
    const towardEnemyX = center.x - playerPosition.x;
    const towardEnemyY = center.y - playerPosition.y;
    const baseAngle = Math.atan2(towardEnemyY, towardEnemyX);
    const offsets = [65, -65, 80, -80, 95, -95, 110, -110, 125, -125];
    const candidates = [];

    for (const offsetDegrees of offsets) {
      const angle = baseAngle + offsetDegrees * Math.PI / 180;
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      const support = getEnvironmentalObjectSupportRadius(instance, directionX, directionY);
      const distance = support + enemyRadius + clearance;
      const position = {
        x: center.x + directionX * distance,
        y: center.y + directionY * distance,
      };

      if (!isPointInsideRoom(this.room, position.x, position.y, enemyRadius + 4)) continue;
      if (!this.isPositionClear(position.x, position.y, enemyRadius)) continue;
      if (!this.hasLineOfSight(playerPosition, position)) continue;
      if (fromPosition && !this.hasLineOfSight(fromPosition, position)) continue;

      candidates.push({
        ...position,
        distanceFromStart: fromPosition
          ? Math.hypot(position.x - fromPosition.x, position.y - fromPosition.y)
          : 0,
      });
    }

    candidates.sort((a, b) => a.distanceFromStart - b.distanceFromStart);
    return candidates[0] ? { x: candidates[0].x, y: candidates[0].y } : null;
  }

  updateVisual(instance, destroyed = false) {
    const visual = visualForState(
      instance.definition,
      instance.health,
      instance.maxHealth,
      destroyed,
    );
    const object = instance.gameObject;
    object.setFillStyle?.(visual.fillColor, visual.alpha);
    if (visual.alpha !== undefined) object.setAlpha?.(visual.alpha);
    if (typeof object.setStrokeStyle === "function" && visual.strokeWidth > 0) {
      object.setStrokeStyle(visual.strokeWidth, visual.strokeColor, 1);
    }
    return visual;
  }

  spawnDebris(instance) {
    const settings = instance.definition.destructible?.debris;
    if (!settings?.count || typeof this.scene.add.rectangle !== "function") return;
    const { x, y } = instance.placement;
    const offsets = [
      [-0.32, -0.24], [0.28, -0.30], [-0.12, 0.34], [0.36, 0.18], [-0.38, 0.16], [0.02, -0.42], [0.16, 0.43], [-0.04, 0.08],
    ];
    for (let index = 0; index < settings.count; index++) {
      const [offsetX, offsetY] = offsets[index % offsets.length];
      const fragment = this.scene.add.rectangle(
        x + offsetX * instance.placement.width,
        y + offsetY * instance.placement.height,
        settings.size,
        settings.size * (index % 2 ? 0.65 : 1),
        settings.color,
        0.95,
      );
      fragment.setDepth?.(instance.definition.visual.depth + 1);
      this.debrisObjects.push(fragment);
      if (this.scene.tweens?.add) {
        this.scene.tweens.add({
          targets: fragment,
          x: fragment.x + offsetX * 28,
          y: fragment.y + offsetY * 28,
          alpha: 0,
          scaleX: 0.25,
          scaleY: 0.25,
          duration: settings.durationMs,
          onComplete: () => {
            fragment.destroy?.();
            this.debrisObjects = this.debrisObjects.filter(item => item !== fragment);
          },
        });
      }
    }
  }

  removeCollision(instance) {
    const object = instance.gameObject;
    if (typeof object.setSensor === "function") object.setSensor(true);
    else if (object.body) object.body.isSensor = true;
    if (object.body) object.body.isSensor = true;
    instance.runtimeData.blocksMovement = false;
    instance.runtimeData.blocksProjectiles = false;
    instance.runtimeData.collisionMode = "none";
    instance.runtimeData.hazard = null;
  }

  destroyInstance(instance) {
    if (instance.isDestroyed) return false;
    instance.health = 0;
    instance.isDestroyed = true;
    instance.runtimeData.health = 0;
    instance.runtimeData.isDestroyed = true;
    this.removeCollision(instance);
    this.updateVisual(instance, true);
    this.spawnDebris(instance);
    this.persistInstanceState(instance);
    return true;
  }

  applyDamageToObject(target, context = {}) {
    const instance = this.getInstance(target);
    if (!instance || instance.isDestroyed || !instance.definition.destructible || instance.gameObject.active === false) {
      return { applied: false, destroyed: Boolean(instance?.isDestroyed), health: instance?.health ?? null, damage: 0 };
    }
    const baseDamage = context.baseDamage;
    if (!Number.isFinite(baseDamage) || baseDamage <= 0) {
      return { applied: false, destroyed: false, health: instance.health, damage: 0 };
    }

    const config = instance.definition.destructible;
    const damageType = typeof context.type === "string" ? context.type : "";
    const multiplier = config.damageMultipliers[damageType] ?? config.defaultDamageMultiplier;
    const damage = baseDamage * multiplier;
    if (!Number.isFinite(damage) || damage <= 0) {
      return { applied: false, destroyed: false, health: instance.health, damage: 0, multiplier };
    }

    const previousHealth = instance.health;
    instance.health = Math.max(0, previousHealth - damage);
    instance.runtimeData.health = instance.health;
    const destroyed = instance.health <= 0;
    if (destroyed) {
      this.destroyInstance(instance);
    } else {
      this.updateVisual(instance, false);
      this.persistInstanceState(instance);
    }
    return {
      applied: true,
      destroyed,
      damage,
      previousHealth,
      health: instance.health,
      maxHealth: instance.maxHealth,
      multiplier,
    };
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    for (const instance of this.objects) {
      const gameObject = instance.gameObject;
      if (gameObject?.active !== false) gameObject?.destroy?.();
    }
    for (const fragment of this.debrisObjects) fragment?.destroy?.();
    this.debrisObjects = [];
    this.objects = [];
    this.byPlacementId.clear();
  }
}
