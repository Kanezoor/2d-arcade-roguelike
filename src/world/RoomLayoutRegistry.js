import { validateRoomLayout } from "./RoomLayoutValidator.js";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function assertId(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function normalizePlacement(input, index, layoutId) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`Placement ${index} in layout "${layoutId}" must be an object.`);
  }
  const placement = {
    id: input.id ?? `${layoutId}-element-${String(index + 1).padStart(2, "0")}`,
    definitionId: input.definitionId,
    category: input.category ?? "obstacle",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: input.rotation ?? 0,
    obstaclePools: input.obstaclePools ?? [],
    metadata: clone(input.metadata ?? {}),
  };
  assertId(placement.id, `Placement ${index} id in layout "${layoutId}"`);
  assertId(placement.definitionId, `Placement "${placement.id}" definitionId`);
  assertId(placement.category, `Placement "${placement.id}" category`);
  for (const key of ["x", "y", "width", "height", "rotation"]) {
    if (!Number.isFinite(placement[key])) {
      throw new TypeError(`Placement "${placement.id}" ${key} must be finite.`);
    }
  }
  if (placement.x < 0 || placement.x > 1 || placement.y < 0 || placement.y > 1 ||
      placement.width <= 0 || placement.width > 1 || placement.height <= 0 || placement.height > 1) {
    throw new RangeError(`Placement "${placement.id}" must use normalized room coordinates.`);
  }
  if (!Array.isArray(placement.obstaclePools) || placement.obstaclePools.some(pool => (
    typeof pool !== "string" || pool.trim() === ""
  ))) {
    throw new TypeError(`Placement "${placement.id}" obstaclePools must be an array of non-empty ids.`);
  }
  return placement;
}

function normalizeVariant(input, index, layoutId, fallbackPlacements) {
  const variant = input ?? {};
  const id = variant.id ?? (index === 0 ? "default" : `variant-${index + 1}`);
  assertId(id, `Variant id in layout "${layoutId}"`);
  const weight = variant.weight ?? 1;
  if (!Number.isFinite(weight) || weight < 0) {
    throw new TypeError(`Variant "${id}" weight in layout "${layoutId}" must be non-negative.`);
  }
  const placementsInput = variant.placements ?? fallbackPlacements;
  if (!Array.isArray(placementsInput)) {
    throw new TypeError(`Variant "${id}" placements in layout "${layoutId}" must be an array.`);
  }
  const placements = placementsInput.map((placement, placementIndex) => (
    normalizePlacement(placement, placementIndex, layoutId)
  ));
  const ids = new Set();
  for (const placement of placements) {
    if (ids.has(placement.id)) throw new Error(`Duplicate placement id "${placement.id}" in layout "${layoutId}" variant "${id}".`);
    ids.add(placement.id);
  }
  return { id, weight, placements };
}

function normalizeLayout(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Room layout definitions must be objects.");
  }
  assertId(input.id, "Room layout id");
  const poolWeights = input.poolWeights ?? {};
  if (!poolWeights || typeof poolWeights !== "object" || Array.isArray(poolWeights)) {
    throw new TypeError(`Room layout "${input.id}" poolWeights must be an object.`);
  }
  for (const [poolId, weight] of Object.entries(poolWeights)) {
    assertId(poolId, `Room layout "${input.id}" pool id`);
    if (!Number.isFinite(weight) || weight < 0) {
      throw new TypeError(`Room layout "${input.id}" weight for pool "${poolId}" must be non-negative.`);
    }
  }
  const allowedRoomTypes = input.allowedRoomTypes ?? null;
  const allowedTemplateIds = input.allowedTemplateIds ?? null;
  for (const [label, list] of [["allowedRoomTypes", allowedRoomTypes], ["allowedTemplateIds", allowedTemplateIds]]) {
    if (list !== null && (!Array.isArray(list) || list.some(value => typeof value !== "string" || !value.trim()))) {
      throw new TypeError(`Room layout "${input.id}" ${label} must be null or an array of non-empty ids.`);
    }
  }
  if (!Object.values(poolWeights).some(weight => weight > 0)) {
    throw new RangeError(`Room layout "${input.id}" must have a positive weight in at least one pool.`);
  }
  const minimumSizeTier = input.minimumSizeTier ?? "small";
  if (!["small", "medium", "large"].includes(minimumSizeTier)) {
    throw new TypeError(`Room layout "${input.id}" has unsupported minimumSizeTier "${minimumSizeTier}".`);
  }
  const minimumFootprint = input.minimumFootprint ?? { width: 1, height: 1 };
  if (!minimumFootprint || !Number.isInteger(minimumFootprint.width) ||
      !Number.isInteger(minimumFootprint.height) || minimumFootprint.width < 1 || minimumFootprint.height < 1) {
    throw new TypeError(`Room layout "${input.id}" minimumFootprint must contain positive integer width and height.`);
  }
  const fallbackPlacements = input.placements ?? [];
  if (!Array.isArray(fallbackPlacements)) {
    throw new TypeError(`Room layout "${input.id}" placements must be an array.`);
  }
  const variantsInput = input.variants ?? [{ id: "default", weight: 1, placements: fallbackPlacements }];
  if (!Array.isArray(variantsInput) || variantsInput.length === 0) {
    throw new TypeError(`Room layout "${input.id}" must define at least one variant.`);
  }
  const variants = variantsInput.map((variant, index) => normalizeVariant(
    variant, index, input.id, fallbackPlacements
  ));
  if (!variants.some(variant => variant.weight > 0)) {
    throw new RangeError(`Room layout "${input.id}" must have at least one positive-weight variant.`);
  }

  return {
    id: input.id,
    name: String(input.name ?? input.id),
    description: String(input.description ?? ""),
    poolWeights: clone(poolWeights),
    allowedRoomTypes: allowedRoomTypes ? [...allowedRoomTypes] : null,
    allowedTemplateIds: allowedTemplateIds ? [...allowedTemplateIds] : null,
    minimumSizeTier,
    minimumFootprint: clone(minimumFootprint),
    variants,
    metadata: clone(input.metadata ?? {}),
  };
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function chooseWeighted(entries, random) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  let choice = random() * total;
  for (const entry of entries) {
    choice -= entry.weight;
    if (choice < 0) return entry;
  }
  return entries[entries.length - 1] ?? null;
}

function weightedOrder(entries, random) {
  const remaining = [...entries];
  const result = [];
  while (remaining.length) {
    const selected = chooseWeighted(remaining, random);
    if (!selected) break;
    result.push(selected);
    remaining.splice(remaining.indexOf(selected), 1);
  }
  return result;
}

function layoutSupportsRoom(layout, room) {
  if (layout.allowedRoomTypes && !layout.allowedRoomTypes.includes(room.type)) return false;
  if (layout.allowedTemplateIds && !layout.allowedTemplateIds.includes(room.templateId ?? room.shape)) return false;
  const sizeRank = { small: 0, medium: 1, large: 2 };
  if (sizeRank[room.sizeTier ?? "medium"] < sizeRank[layout.minimumSizeTier]) return false;
  const minimum = layout.minimumFootprint;
  if (!minimum || !Number.isInteger(minimum.width) || !Number.isInteger(minimum.height) || minimum.width < 1 || minimum.height < 1) {
    throw new TypeError(`Layout "${layout.id}" minimumFootprint must contain positive integer width and height.`);
  }
  if (room.footprint.width < minimum.width || room.footprint.height < minimum.height) return false;
  return true;
}

function variantSupportsObstaclePool(variant, obstaclePoolId) {
  if (!obstaclePoolId) return true;
  return variant.placements.every(placement => (
    placement.obstaclePools.length === 0 || placement.obstaclePools.includes(obstaclePoolId)
  ));
}

function resolvePlacements(room, placements) {
  return placements.map(placement => ({
    id: placement.id,
    definitionId: placement.definitionId,
    category: placement.category,
    x: placement.x * room.width,
    y: placement.y * room.height,
    width: placement.width * room.width,
    height: placement.height * room.height,
    rotation: placement.rotation,
    normalized: {
      id: placement.id,
      definitionId: placement.definitionId,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotation: placement.rotation,
    },
    metadata: clone(placement.metadata),
  }));
}

/**
 * Library of authored room arrangements. Selection is deterministic for a
 * room seed; variants provide small authored layout variations without
 * changing the parent room geometry or the floor graph.
 */
export default class RoomLayoutRegistry {
  constructor({ layouts = [] } = {}) {
    if (!Array.isArray(layouts)) throw new TypeError("RoomLayoutRegistry layouts must be an array.");
    this.layouts = new Map();
    this.pools = new Set();
    for (const input of layouts) this.register(input);
  }

  register(input) {
    const layout = normalizeLayout(input);
    if (this.layouts.has(layout.id)) throw new Error(`Duplicate room layout "${layout.id}".`);
    this.layouts.set(layout.id, layout);
    for (const [poolId, weight] of Object.entries(layout.poolWeights)) {
      if (weight > 0) this.pools.add(poolId);
    }
    return this.get(layout.id);
  }

  get(id) {
    const layout = this.layouts.get(id);
    return layout ? clone(layout) : null;
  }

  hasPool(poolId) {
    return this.pools.has(poolId);
  }

  listPool(poolId) {
    return [...this.layouts.values()]
      .filter(layout => (layout.poolWeights[poolId] ?? 0) > 0)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(layout => clone(layout));
  }

  selectForRoom(room, {
    poolId = "starter",
    obstaclePoolId = null,
    seed = 0,
    validationOptions = {},
  } = {}) {
    if (!room || typeof room.id !== "string") throw new TypeError("selectForRoom requires a room definition.");
    assertId(poolId, "Room layout poolId");
    if (!this.hasPool(poolId)) throw new Error(`Unknown room layout pool "${poolId}".`);
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new TypeError("Room layout seed must be an unsigned 32-bit integer.");
    }
    if (obstaclePoolId !== null) assertId(obstaclePoolId, "Obstacle pool id");

    const random = createRandom(seed);
    const candidates = [...this.layouts.values()]
      .filter(layout => (layout.poolWeights[poolId] ?? 0) > 0 && layoutSupportsRoom(layout, room))
      .map(layout => ({ ...layout, weight: layout.poolWeights[poolId] }))
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const layout of weightedOrder(candidates, random)) {
      const variants = weightedOrder(layout.variants
        .filter(variant => variant.weight > 0 && variantSupportsObstaclePool(variant, obstaclePoolId)), random);
      for (const variant of variants) {
        const report = validateRoomLayout(room, variant.placements, validationOptions);
        if (!report.valid) continue;
        return {
          version: 1,
          layoutId: layout.id,
          poolId,
          variantId: variant.id,
          seed,
          fallbackUsed: false,
          placements: resolvePlacements(room, variant.placements),
          validationWarnings: clone(report.warnings),
          metadata: clone(layout.metadata),
        };
      }
    }

    const fallback = this.layouts.get("open_basic");
    if (!fallback) throw new Error('RoomLayoutRegistry requires an "open_basic" fallback layout.');
    const fallbackVariant = fallback.variants.find(variant => variant.weight > 0 && variant.placements.length === 0)
      ?? fallback.variants.find(variant => variant.weight > 0);
    if (!fallbackVariant) throw new Error("RoomLayoutRegistry fallback layout has no positive-weight variant.");
    return {
      version: 1,
      layoutId: fallback.id,
      poolId,
      variantId: fallbackVariant.id,
      seed,
      fallbackUsed: true,
      fallbackReason: candidates.length === 0 ? "no-compatible-layout" : "no-valid-layout-variant",
      placements: resolvePlacements(room, fallbackVariant.placements),
      validationWarnings: [],
      metadata: clone(fallback.metadata),
    };
  }

  toJSON() {
    return [...this.layouts.values()].map(layout => clone(layout));
  }
}

export function createDefaultRoomLayoutRegistry() {
  return new RoomLayoutRegistry({
    layouts: [
      {
        id: "open_basic",
        name: "Open Room",
        description: "An intentionally open layout with no environmental objects.",
        poolWeights: { starter: 8, intermediate: 4, complex: 2 },
        minimumSizeTier: "small",
        placements: [],
        variants: [{ id: "default", weight: 1, placements: [] }],
        metadata: { intent: "open-combat-space" },
      },
      {
        id: "sparse_pillars",
        name: "Sparse Pillars",
        description: "Two isolated pillars leave the center and entrance approaches open.",
        poolWeights: { starter: 2, intermediate: 0, complex: 0 },
        allowedRoomTypes: ["combat"],
        allowedTemplateIds: ["square", "rectangle", "diamond", "circle", "octagon"],
        minimumSizeTier: "medium",
        placements: [],
        variants: [
          {
            id: "diagonal-a",
            weight: 1,
            placements: [
              { id: "pillar-a", definitionId: "stone_pillar", x: 0.34, y: 0.34, width: 0.075, height: 0.075, obstaclePools: ["minimal", "mixed", "dangerous"] },
              { id: "pillar-b", definitionId: "stone_pillar", x: 0.66, y: 0.66, width: 0.075, height: 0.075, obstaclePools: ["minimal", "mixed", "dangerous"] },
            ],
          },
          {
            id: "diagonal-b",
            weight: 1,
            placements: [
              { id: "pillar-a", definitionId: "stone_pillar", x: 0.34, y: 0.66, width: 0.075, height: 0.075, obstaclePools: ["minimal", "mixed", "dangerous"] },
              { id: "pillar-b", definitionId: "stone_pillar", x: 0.66, y: 0.34, width: 0.075, height: 0.075, obstaclePools: ["minimal", "mixed", "dangerous"] },
            ],
          },
        ],
        metadata: { intent: "light-cover" },
      },
      {
        id: "pillar_arena",
        name: "Pillar Arena",
        description: "A four-pillar arrangement around an open center.",
        poolWeights: { starter: 0, intermediate: 3, complex: 2 },
        allowedRoomTypes: ["combat"],
        minimumSizeTier: "medium",
        variants: [
          {
            id: "wide",
            weight: 1,
            placements: [
              { id: "pillar-nw", definitionId: "stone_pillar", x: 0.29, y: 0.30, width: 0.075, height: 0.075, obstaclePools: ["minimal", "mixed", "dangerous"] },
              { id: "pillar-ne", definitionId: "stone_pillar", x: 0.71, y: 0.30, width: 0.075, height: 0.075, obstaclePools: ["minimal", "mixed", "dangerous"] },
              { id: "pillar-sw", definitionId: "stone_pillar", x: 0.29, y: 0.70, width: 0.075, height: 0.075, obstaclePools: ["minimal", "mixed", "dangerous"] },
              { id: "pillar-se", definitionId: "stone_pillar", x: 0.71, y: 0.70, width: 0.075, height: 0.075, obstaclePools: ["minimal", "mixed", "dangerous"] },
            ],
          },
          {
            id: "compact",
            weight: 1,
            placements: [
              { id: "pillar-nw", definitionId: "stone_pillar", x: 0.32, y: 0.32, width: 0.07, height: 0.07, obstaclePools: ["minimal", "mixed", "dangerous"] },
              { id: "pillar-ne", definitionId: "stone_pillar", x: 0.68, y: 0.32, width: 0.07, height: 0.07, obstaclePools: ["minimal", "mixed", "dangerous"] },
              { id: "pillar-sw", definitionId: "stone_pillar", x: 0.32, y: 0.68, width: 0.07, height: 0.07, obstaclePools: ["minimal", "mixed", "dangerous"] },
              { id: "pillar-se", definitionId: "stone_pillar", x: 0.68, y: 0.68, width: 0.07, height: 0.07, obstaclePools: ["minimal", "mixed", "dangerous"] },
            ],
          },
        ],
        metadata: { intent: "distributed-cover" },
      },
      {
        id: "staggered_barricades",
        name: "Staggered Barricades",
        description: "Short wooden barricades create cover without sealing the central routes.",
        poolWeights: { starter: 0, intermediate: 2, complex: 3 },
        allowedRoomTypes: ["combat"],
        minimumSizeTier: "medium",
        variants: [
          {
            id: "rising",
            weight: 1,
            placements: [
              { id: "barricade-a", definitionId: "wooden_barricade", x: 0.28, y: 0.34, width: 0.17, height: 0.045, rotation: -0.12, obstaclePools: ["mixed", "dangerous"] },
              { id: "barricade-b", definitionId: "wooden_barricade", x: 0.72, y: 0.66, width: 0.17, height: 0.045, rotation: -0.12, obstaclePools: ["mixed", "dangerous"] },
            ],
          },
          {
            id: "falling",
            weight: 1,
            placements: [
              { id: "barricade-a", definitionId: "wooden_barricade", x: 0.28, y: 0.66, width: 0.17, height: 0.045, rotation: 0.12, obstaclePools: ["mixed", "dangerous"] },
              { id: "barricade-b", definitionId: "wooden_barricade", x: 0.72, y: 0.34, width: 0.17, height: 0.045, rotation: 0.12, obstaclePools: ["mixed", "dangerous"] },
            ],
          },
        ],
        metadata: { intent: "staggered-cover" },
      },
      {
        id: "broken_stone_walls",
        name: "Broken Stone Walls",
        description: "Short broken wall segments create cover while preserving central and entrance routes.",
        poolWeights: { starter: 0, intermediate: 0, complex: 1 },
        allowedRoomTypes: ["combat"],
        minimumSizeTier: "medium",
        variants: [
          {
            id: "offset-pair",
            weight: 1,
            placements: [
              { id: "wall-a", definitionId: "stone_wall_segment", x: 0.28, y: 0.28, width: 0.18, height: 0.045, rotation: 0.42, obstaclePools: ["dangerous"] },
              { id: "wall-b", definitionId: "stone_wall_segment", x: 0.72, y: 0.72, width: 0.18, height: 0.045, rotation: -0.42, obstaclePools: ["dangerous"] },
            ],
          },
        ],
        metadata: { intent: "partial-wall-cover" },
      },
      {
        id: "pit_pair",
        name: "Pit Pair",
        description: "Two floor pits create optional dangerous shortcuts while keeping the center and entrances clear.",
        poolWeights: { starter: 0, intermediate: 0, complex: 1 },
        allowedRoomTypes: ["combat"],
        minimumSizeTier: "medium",
        variants: [
          {
            id: "diagonal-a",
            weight: 1,
            placements: [
              { id: "pit-a", definitionId: "pit", x: 0.32, y: 0.32, width: 0.11, height: 0.11, obstaclePools: ["dangerous"] },
              { id: "pit-b", definitionId: "pit", x: 0.68, y: 0.68, width: 0.11, height: 0.11, obstaclePools: ["dangerous"] },
            ],
          },
        ],
        metadata: { intent: "floor-hazards" },
      },
      {
        id: "spike_patches",
        name: "Spike Patches",
        description: "Small floor traps create dangerous zones away from the main entrance approaches.",
        poolWeights: { starter: 0, intermediate: 0, complex: 1 },
        allowedRoomTypes: ["combat"],
        minimumSizeTier: "medium",
        variants: [
          {
            id: "offset-pair",
            weight: 1,
            placements: [
              { id: "spikes-a", definitionId: "spike_trap", x: 0.32, y: 0.68, width: 0.10, height: 0.10, obstaclePools: ["dangerous"] },
              { id: "spikes-b", definitionId: "spike_trap", x: 0.68, y: 0.32, width: 0.10, height: 0.10, obstaclePools: ["dangerous"] },
            ],
          },
        ],
        metadata: { intent: "contact-hazards" },
      },
      {
        id: "dense_cover",
        name: "Dense Cover",
        description: "A denser arrangement for large rooms and later progression.",
        poolWeights: { starter: 0, intermediate: 0, complex: 2 },
        allowedRoomTypes: ["combat"],
        minimumSizeTier: "large",
        variants: [
          {
            id: "quad-and-pair",
            weight: 1,
            placements: [
              { id: "pillar-nw", definitionId: "stone_pillar", x: 0.25, y: 0.30, width: 0.08, height: 0.08, obstaclePools: ["dangerous"] },
              { id: "pillar-ne", definitionId: "stone_pillar", x: 0.75, y: 0.30, width: 0.08, height: 0.08, obstaclePools: ["dangerous"] },
              { id: "pillar-sw", definitionId: "stone_pillar", x: 0.25, y: 0.70, width: 0.08, height: 0.08, obstaclePools: ["dangerous"] },
              { id: "pillar-se", definitionId: "stone_pillar", x: 0.75, y: 0.70, width: 0.08, height: 0.08, obstaclePools: ["dangerous"] },
            ],
          },
        ],
        metadata: { intent: "dense-cover" },
      },
    ],
  });
}
