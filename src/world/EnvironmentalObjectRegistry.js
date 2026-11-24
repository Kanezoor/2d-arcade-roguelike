function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const COLLISION_MODES = new Set(["solid", "sensor", "none"]);
const VISUAL_SHAPES = new Set(["rectangle", "ellipse"]);
const PHYSICS_SHAPES = new Set(["rectangle", "circle"]);

function normalizeDestructible(input, objectId) {
  if (input == null) return null;
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`Environmental object "${objectId}" destructible settings must be an object.`);
  }
  const maxHealth = input.maxHealth;
  if (!Number.isFinite(maxHealth) || maxHealth <= 0) {
    throw new TypeError(`Environmental object "${objectId}" destructible.maxHealth must be positive.`);
  }
  const damageMultipliers = input.damageMultipliers ?? {};
  if (!damageMultipliers || typeof damageMultipliers !== "object" || Array.isArray(damageMultipliers)) {
    throw new TypeError(`Environmental object "${objectId}" damageMultipliers must be an object.`);
  }
  for (const [type, multiplier] of Object.entries(damageMultipliers)) {
    if (!type.trim() || !Number.isFinite(multiplier) || multiplier < 0) {
      throw new TypeError(`Environmental object "${objectId}" has an invalid damage multiplier.`);
    }
  }
  const defaultDamageMultiplier = input.defaultDamageMultiplier ?? 0;
  if (!Number.isFinite(defaultDamageMultiplier) || defaultDamageMultiplier < 0) {
    throw new TypeError(`Environmental object "${objectId}" defaultDamageMultiplier must be non-negative.`);
  }
  const stages = input.stages ?? [];
  if (!Array.isArray(stages)) {
    throw new TypeError(`Environmental object "${objectId}" damage stages must be an array.`);
  }
  const normalizedStages = stages.map((stage, index) => {
    if (!stage || typeof stage !== "object" || Array.isArray(stage) ||
        !Number.isFinite(stage.healthRatioBelow) || stage.healthRatioBelow <= 0 || stage.healthRatioBelow >= 1) {
      throw new TypeError(`Environmental object "${objectId}" damage stage ${index} has an invalid threshold.`);
    }
    const visual = stage.visual ?? {};
    if (!visual || typeof visual !== "object" || Array.isArray(visual)) {
      throw new TypeError(`Environmental object "${objectId}" damage stage ${index} visual must be an object.`);
    }
    const normalizedVisual = {};
    for (const key of ["fillColor", "strokeColor", "strokeWidth", "alpha"]) {
      if (visual[key] !== undefined) {
        if (!Number.isFinite(visual[key])) throw new TypeError(`Environmental object "${objectId}" damage stage ${index} visual.${key} must be finite.`);
        normalizedVisual[key] = visual[key];
      }
    }
    if (normalizedVisual.strokeWidth !== undefined && normalizedVisual.strokeWidth < 0) {
      throw new RangeError(`Environmental object "${objectId}" damage stage ${index} has a negative strokeWidth.`);
    }
    if (normalizedVisual.alpha !== undefined && (normalizedVisual.alpha < 0 || normalizedVisual.alpha > 1)) {
      throw new RangeError(`Environmental object "${objectId}" damage stage ${index} alpha must be between 0 and 1.`);
    }
    return { healthRatioBelow: stage.healthRatioBelow, visual: normalizedVisual };
  }).sort((a, b) => a.healthRatioBelow - b.healthRatioBelow);
  const destroyedVisualInput = input.destroyedVisual ?? {};
  if (typeof destroyedVisualInput !== "object" || Array.isArray(destroyedVisualInput)) {
    throw new TypeError(`Environmental object "${objectId}" destroyedVisual must be an object.`);
  }
  const destroyedVisual = {};
  for (const key of ["fillColor", "strokeColor", "strokeWidth", "alpha", "shape"]) {
    if (destroyedVisualInput[key] !== undefined) {
      if (key !== "shape" && !Number.isFinite(destroyedVisualInput[key])) {
        throw new TypeError(`Environmental object "${objectId}" destroyedVisual.${key} must be finite.`);
      }
      destroyedVisual[key] = destroyedVisualInput[key];
    }
  }
  if (destroyedVisual.shape !== undefined && !VISUAL_SHAPES.has(destroyedVisual.shape)) {
    throw new TypeError(`Environmental object "${objectId}" has an invalid destroyed visual shape.`);
  }
  if (destroyedVisual.strokeWidth !== undefined && destroyedVisual.strokeWidth < 0) {
    throw new RangeError(`Environmental object "${objectId}" destroyedVisual.strokeWidth cannot be negative.`);
  }
  if (destroyedVisual.alpha !== undefined && (destroyedVisual.alpha < 0 || destroyedVisual.alpha > 1)) {
    throw new RangeError(`Environmental object "${objectId}" destroyedVisual.alpha must be between 0 and 1.`);
  }
  const debrisInput = input.debris ?? {};
  if (!debrisInput || typeof debrisInput !== "object" || Array.isArray(debrisInput)) {
    throw new TypeError(`Environmental object "${objectId}" debris settings must be an object.`);
  }
  const debris = {
    count: debrisInput.count ?? 0,
    color: debrisInput.color ?? 0x777777,
    size: debrisInput.size ?? 8,
    durationMs: debrisInput.durationMs ?? 360,
  };
  if (!Number.isInteger(debris.count) || debris.count < 0 || debris.count > 16 ||
      !Number.isFinite(debris.color) || !Number.isFinite(debris.size) || debris.size <= 0 ||
      !Number.isFinite(debris.durationMs) || debris.durationMs < 0) {
    throw new TypeError(`Environmental object "${objectId}" has invalid debris settings.`);
  }
  return {
    maxHealth,
    damageMultipliers: clone(damageMultipliers),
    defaultDamageMultiplier,
    stages: normalizedStages,
    destroyedVisual,
    debris,
  };
}

function assertId(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function normalizeDefinition(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Environmental object definitions must be objects.");
  }
  assertId(input.id, "Environmental object id");
  const visual = input.visual ?? {};
  const collision = input.collision ?? {};
  const mode = collision.mode ?? "solid";
  const visualShape = visual.shape ?? "rectangle";
  const physicsShape = collision.shape ?? (visualShape === "ellipse" ? "circle" : "rectangle");

  if (!COLLISION_MODES.has(mode)) {
    throw new TypeError(`Environmental object "${input.id}" has unsupported collision mode "${mode}".`);
  }
  if (!VISUAL_SHAPES.has(visualShape)) {
    throw new TypeError(`Environmental object "${input.id}" has unsupported visual shape "${visualShape}".`);
  }
  if (!PHYSICS_SHAPES.has(physicsShape)) {
    throw new TypeError(`Environmental object "${input.id}" has unsupported physics shape "${physicsShape}".`);
  }

  const fillColor = visual.fillColor ?? 0x777777;
  const strokeColor = visual.strokeColor ?? 0x333333;
  const strokeWidth = visual.strokeWidth ?? 3;
  const alpha = visual.alpha ?? 1;
  const depth = visual.depth ?? -1;
  for (const [key, value] of Object.entries({ fillColor, strokeColor, strokeWidth, alpha, depth })) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Environmental object "${input.id}" visual.${key} must be finite.`);
    }
  }
  if (strokeWidth < 0 || alpha < 0 || alpha > 1) {
    throw new RangeError(`Environmental object "${input.id}" has invalid visual strokeWidth or alpha.`);
  }

  const hazard = input.hazard == null ? null : {
    kind: input.hazard.kind ?? "contact",
    damage: input.hazard.damage ?? 0,
    cooldownMs: input.hazard.cooldownMs ?? 750,
    affects: [...(input.hazard.affects ?? ["player"])],
  };
  if (hazard) {
    assertId(hazard.kind, `Environmental object "${input.id}" hazard kind`);
    if (!Number.isFinite(hazard.damage) || hazard.damage < 0 ||
        !Number.isFinite(hazard.cooldownMs) || hazard.cooldownMs < 0 ||
        !Array.isArray(hazard.affects) || hazard.affects.some(target => !["player", "enemy"].includes(target))) {
      throw new TypeError(`Environmental object "${input.id}" has invalid hazard configuration.`);
    }
  }

  return {
    id: input.id,
    name: String(input.name ?? input.id),
    category: String(input.category ?? "obstacle"),
    description: String(input.description ?? ""),
    visual: { shape: visualShape, fillColor, strokeColor, strokeWidth, alpha, depth },
    collision: {
      mode,
      shape: physicsShape,
      blocksMovement: collision.blocksMovement ?? mode === "solid",
      blocksProjectiles: collision.blocksProjectiles ?? mode === "solid",
    },
    hazard,
    destructible: normalizeDestructible(input.destructible, input.id),
    metadata: clone(input.metadata ?? {}),
  };
}

/** Data-only catalog of environmental objects. Runtime Phaser objects are created elsewhere. */
export default class EnvironmentalObjectRegistry {
  constructor({ definitions = [] } = {}) {
    if (!Array.isArray(definitions)) {
      throw new TypeError("EnvironmentalObjectRegistry definitions must be an array.");
    }
    this.definitions = new Map();
    for (const definition of definitions) this.register(definition);
  }

  register(input) {
    const definition = normalizeDefinition(input);
    if (this.definitions.has(definition.id)) {
      throw new Error(`Duplicate environmental object definition "${definition.id}".`);
    }
    this.definitions.set(definition.id, definition);
    return this.get(definition.id);
  }

  get(id) {
    const definition = this.definitions.get(id);
    return definition ? clone(definition) : null;
  }

  has(id) {
    return this.definitions.has(id);
  }

  list() {
    return [...this.definitions.values()].map(clone);
  }

  toJSON() {
    return this.list();
  }
}

export function createDefaultEnvironmentalObjectRegistry() {
  return new EnvironmentalObjectRegistry({
    definitions: [
      {
        id: "stone_pillar",
        name: "Stone Pillar",
        category: "cover",
        description: "A solid stone column that blocks movement and projectiles.",
        visual: { shape: "ellipse", fillColor: 0x777f8b, strokeColor: 0x343b45, strokeWidth: 7, depth: -1 },
        collision: { mode: "solid", shape: "circle", blocksMovement: true, blocksProjectiles: true },
        destructible: {
          maxHealth: 18,
          damageMultipliers: { kinetic: 1, laser: 0.25 },
          stages: [
            { healthRatioBelow: 0.66, visual: { fillColor: 0x626b77, strokeColor: 0x303741 } },
            { healthRatioBelow: 0.30, visual: { fillColor: 0x424852, strokeColor: 0x242a32, alpha: 0.92 } },
          ],
          destroyedVisual: { fillColor: 0x343a43, strokeColor: 0x232830, strokeWidth: 3, alpha: 0.62, shape: "ellipse" },
          debris: { count: 6, color: 0x777f8b, size: 7, durationMs: 380 },
        },
        metadata: { material: "stone" },
      },
      {
        id: "wooden_barricade",
        name: "Wooden Barricade",
        category: "cover",
        description: "A wooden barrier that blocks movement and projectiles.",
        visual: { shape: "rectangle", fillColor: 0x956338, strokeColor: 0x4d301d, strokeWidth: 5, depth: -1 },
        collision: { mode: "solid", shape: "rectangle", blocksMovement: true, blocksProjectiles: true },
        destructible: {
          maxHealth: 10,
          damageMultipliers: { kinetic: 1, laser: 0.45 },
          stages: [
            { healthRatioBelow: 0.66, visual: { fillColor: 0x754c2d, strokeColor: 0x3f291a } },
            { healthRatioBelow: 0.30, visual: { fillColor: 0x50351f, strokeColor: 0x2b1c12, alpha: 0.92 } },
          ],
          destroyedVisual: { fillColor: 0x3a291c, strokeColor: 0x24190f, strokeWidth: 2, alpha: 0.58 },
          debris: { count: 7, color: 0xa8794b, size: 7, durationMs: 340 },
        },
        metadata: { material: "wood" },
      },
      {
        id: "stone_wall_segment",
        name: "Stone Wall Segment",
        category: "wall",
        description: "A short solid wall segment that blocks movement and projectiles.",
        visual: { shape: "rectangle", fillColor: 0x626b78, strokeColor: 0x303741, strokeWidth: 5, depth: -1 },
        collision: { mode: "solid", shape: "rectangle", blocksMovement: true, blocksProjectiles: true },
        destructible: {
          maxHealth: 26,
          damageMultipliers: { kinetic: 0.8, laser: 0.2 },
          stages: [
            { healthRatioBelow: 0.66, visual: { fillColor: 0x515b68, strokeColor: 0x292f38 } },
            { healthRatioBelow: 0.30, visual: { fillColor: 0x3c444f, strokeColor: 0x20262e, alpha: 0.92 } },
          ],
          destroyedVisual: { fillColor: 0x303741, strokeColor: 0x20262e, strokeWidth: 2, alpha: 0.58 },
          debris: { count: 8, color: 0x626b78, size: 7, durationMs: 400 },
        },
        metadata: { material: "stone" },
      },
      {
        id: "pit",
        name: "Floor Pit",
        category: "hazard",
        description: "A floor hazard. Crossing it causes contact damage; it does not block movement.",
        visual: { shape: "ellipse", fillColor: 0x171923, strokeColor: 0x626775, strokeWidth: 6, alpha: 0.98, depth: -3 },
        collision: { mode: "sensor", shape: "circle", blocksMovement: false, blocksProjectiles: false },
        hazard: { kind: "contact", damage: 8, cooldownMs: 900, affects: ["player"] },
        metadata: { material: "void" },
      },
      {
        id: "spike_trap",
        name: "Spike Trap",
        category: "hazard",
        description: "A floor trap that damages the player when entered.",
        visual: { shape: "rectangle", fillColor: 0xb84d4d, strokeColor: 0x512b30, strokeWidth: 5, alpha: 0.92, depth: -2 },
        collision: { mode: "sensor", shape: "rectangle", blocksMovement: false, blocksProjectiles: false },
        hazard: { kind: "contact", damage: 12, cooldownMs: 900, affects: ["player"] },
        metadata: { material: "metal" },
      },
    ],
  });
}
