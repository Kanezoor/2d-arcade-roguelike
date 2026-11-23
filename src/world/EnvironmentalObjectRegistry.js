function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const COLLISION_MODES = new Set(["solid", "sensor", "none"]);
const VISUAL_SHAPES = new Set(["rectangle", "ellipse"]);
const PHYSICS_SHAPES = new Set(["rectangle", "circle"]);

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
        metadata: { material: "stone", plannedDurability: 180 },
      },
      {
        id: "wooden_barricade",
        name: "Wooden Barricade",
        category: "cover",
        description: "A wooden barrier that blocks movement and projectiles.",
        visual: { shape: "rectangle", fillColor: 0x956338, strokeColor: 0x4d301d, strokeWidth: 5, depth: -1 },
        collision: { mode: "solid", shape: "rectangle", blocksMovement: true, blocksProjectiles: true },
        metadata: { material: "wood", plannedDurability: 90 },
      },
      {
        id: "stone_wall_segment",
        name: "Stone Wall Segment",
        category: "wall",
        description: "A short solid wall segment that blocks movement and projectiles.",
        visual: { shape: "rectangle", fillColor: 0x626b78, strokeColor: 0x303741, strokeWidth: 5, depth: -1 },
        collision: { mode: "solid", shape: "rectangle", blocksMovement: true, blocksProjectiles: true },
        metadata: { material: "stone", plannedDurability: 260 },
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
