import FloorModel from "./FloorModel.js";
import { getRoomTemplate } from "./RoomTemplateRegistry.js";
import RunProgressionContext from "../progression/RunProgressionContext.js";
import { createDefaultRoomLayoutRegistry } from "./RoomLayoutRegistry.js";

const DIRECTIONS = [
  { name: "north", dx: 0, dy: -1 },
  { name: "east", dx: 1, dy: 0 },
  { name: "south", dx: 0, dy: 1 },
  { name: "west", dx: -1, dy: 0 },
];

function assertIntegerInRange(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer between ${min} and ${max}.`);
  }
}

function normalizeSeed(seed) {
  if (seed == null) {
    return Math.floor(Math.random() * 0x100000000) >>> 0;
  }

  if (typeof seed === "number" && Number.isFinite(seed)) {
    return Math.trunc(seed) >>> 0;
  }

  if (typeof seed === "string" && seed.length > 0) {
    // FNV-1a: stable conversion from a readable seed to a 32-bit value.
    let hash = 0x811c9dc5;
    for (let index = 0; index < seed.length; index++) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  throw new TypeError("seed must be a finite number, a non-empty string, or null.");
}

/** Create a stable root seed for a new run. */
export function createRunSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] >>> 0;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

/**
 * Derive a floor-specific seed from the root run seed and its identity.
 * Adding or generating another floor will not consume randomness from this one.
 */
export function deriveFloorSeed(runSeed, {
  floorId,
  depth,
  pathId = "default",
  modifierIds = [],
} = {}) {
  if (typeof floorId !== "string" || floorId.trim() === "") {
    throw new TypeError("deriveFloorSeed requires a non-empty floorId.");
  }
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError("deriveFloorSeed depth must be a positive integer.");
  }
  if (typeof pathId !== "string" || pathId.trim() === "") {
    throw new TypeError("deriveFloorSeed pathId must be a non-empty string.");
  }
  if (!Array.isArray(modifierIds)) {
    throw new TypeError("deriveFloorSeed modifierIds must be an array.");
  }
  const normalizedRunSeed = normalizeSeed(runSeed);
  const normalizedModifiers = [...new Set(modifierIds)].sort().join(",");
  return normalizeSeed([
    normalizedRunSeed,
    floorId,
    depth,
    pathId,
    normalizedModifiers,
  ].join("|"));
}

function createRandom(seed) {
  let state = seed >>> 0;

  // Mulberry32: small deterministic PRNG suitable for procedural layout generation.
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function randomInteger(min, max, random) {
  return min + Math.floor(random() * (max - min + 1));
}

function normalizeRoomTemplateWeights(roomTemplateWeights, fallbackTemplateId) {
  const source = roomTemplateWeights ?? { [fallbackTemplateId]: 1 };
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("roomTemplateWeights must be an object mapping template ids to non-negative weights.");
  }

  const entries = Object.keys(source).sort().map(templateId => {
    // Resolve even zero-weight entries so misspelled template IDs fail early.
    getRoomTemplate(templateId);
    const weight = source[templateId];
    if (!Number.isFinite(weight) || weight < 0) {
      throw new TypeError(`Room template weight for "${templateId}" must be a finite non-negative number.`);
    }
    return { templateId, weight };
  }).filter(entry => entry.weight > 0);

  if (entries.length === 0) {
    throw new RangeError("roomTemplateWeights must contain at least one template with a positive weight.");
  }

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new RangeError("The sum of room template weights must be finite and greater than zero.");
  }

  return entries;
}

function chooseWeightedRoomTemplate(entries, random) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let choice = random() * totalWeight;

  for (const entry of entries) {
    choice -= entry.weight;
    if (choice < 0) return entry.templateId;
  }

  // Floating-point rounding can leave a tiny positive remainder.
  return entries[entries.length - 1].templateId;
}

function shuffle(values, random) {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function cellKey(position) {
  return `${position.x},${position.y}`;
}

function getNeighbors(position, gridWidth, gridHeight) {
  return DIRECTIONS
    .map(direction => ({
      x: position.x + direction.dx,
      y: position.y + direction.dy,
    }))
    .filter(candidate => (
      candidate.x >= 0 &&
      candidate.x < gridWidth &&
      candidate.y >= 0 &&
      candidate.y < gridHeight
    ));
}

function getDirectionBetween(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const direction = DIRECTIONS.find(item => item.dx === dx && item.dy === dy);

  if (!direction) {
    throw new Error(
      `Generated rooms must be orthogonally adjacent. Received (${from.x}, ${from.y}) -> (${to.x}, ${to.y}).`
    );
  }

  return direction.name;
}

function findMainPath({
  startPosition,
  targetLength,
  gridWidth,
  gridHeight,
  random,
}) {
  const path = [{ ...startPosition }];
  const occupied = new Set([cellKey(startPosition)]);

  function search() {
    if (path.length === targetLength) {
      return true;
    }

    const current = path[path.length - 1];
    const candidates = shuffle(
      getNeighbors(current, gridWidth, gridHeight)
        .filter(candidate => !occupied.has(cellKey(candidate))),
      random
    );

    for (const candidate of candidates) {
      const key = cellKey(candidate);
      occupied.add(key);
      path.push(candidate);

      if (search()) {
        return true;
      }

      path.pop();
      occupied.delete(key);
    }

    return false;
  }

  return search() ? path : null;
}

const DEFAULT_ROOM_SIZE_SCALES = Object.freeze({
  small: 0.85,
  medium: 1,
  large: 1.15,
});

function normalizeFootprintWeights(weights) {
  const source = weights ?? { "1x1": 1 };
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("roomFootprintWeights must map footprint keys such as '1x1' to non-negative weights.");
  }

  const entries = Object.keys(source).sort().map(key => {
    const match = /^(\d+)x(\d+)$/.exec(key);
    if (!match) {
      throw new TypeError(`Invalid room footprint key "${key}". Expected the form "widthxheight", for example "2x1".`);
    }
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
      throw new TypeError(`Room footprint "${key}" must contain positive integer dimensions.`);
    }
    const weight = source[key];
    if (!Number.isFinite(weight) || weight < 0) {
      throw new TypeError(`Room footprint weight for "${key}" must be a finite non-negative number.`);
    }
    return { key, width, height, weight };
  }).filter(entry => entry.weight > 0);

  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (!entries.length || !Number.isFinite(total) || total <= 0) {
    throw new RangeError("roomFootprintWeights must contain at least one positive finite weight.");
  }
  return entries;
}

function normalizeRoomSizeWeights(weights, scales) {
  const source = weights ?? { medium: 1 };
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("roomSizeWeights must map small, medium, or large to non-negative weights.");
  }
  const resolvedScales = { ...DEFAULT_ROOM_SIZE_SCALES, ...(scales ?? {}) };
  for (const tier of ["small", "medium", "large"]) {
    if (!Number.isFinite(resolvedScales[tier]) || resolvedScales[tier] <= 0) {
      throw new TypeError(`roomSizeScales.${tier} must be a positive finite number.`);
    }
  }
  const supportedTiers = ["small", "medium", "large"];
  const unknownTiers = Object.keys(source).filter(tier => !supportedTiers.includes(tier));
  if (unknownTiers.length) {
    throw new TypeError(`Unknown room size tier(s): ${unknownTiers.join(", ")}.`);
  }
  const entries = Object.keys(source).sort().map(tier => {
    const weight = source[tier];
    if (!Number.isFinite(weight) || weight < 0) {
      throw new TypeError(`Room size weight for "${tier}" must be a finite non-negative number.`);
    }
    return { tier, scale: resolvedScales[tier], weight };
  }).filter(entry => entry.weight > 0);
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (!entries.length || !Number.isFinite(total) || total <= 0) {
    throw new RangeError("roomSizeWeights must contain at least one positive finite weight.");
  }
  return entries;
}

function isFootprintAvailable(position, footprint, gridWidth, gridHeight, occupied, roomId) {
  if (
    position.x + footprint.width > gridWidth ||
    position.y + footprint.height > gridHeight
  ) return false;

  for (let y = position.y; y < position.y + footprint.height; y++) {
    for (let x = position.x; x < position.x + footprint.width; x++) {
      const owner = occupied.get(`${x},${y}`);
      if (owner && owner !== roomId) return false;
    }
  }
  return true;
}

/**
 * Assign rectangular grid footprints after the logical graph has been built.
 * All room anchor cells are reserved first, so expansion can never cover a
 * room node or invalidate a connection. Expansion is from the anchor toward
 * positive grid X/Y; this keeps gridPosition stable for older save data.
 */
function assignRoomFootprints({ roomNodes, gridWidth, gridHeight, weights, random }) {
  const occupied = new Map(roomNodes.map(node => [cellKey(node.gridPosition), node.id]));
  const fallback = { key: "1x1", width: 1, height: 1, weight: 0 };
  const selectionOrder = shuffle(roomNodes, random);
  const byId = new Map();

  for (const node of selectionOrder) {
    const available = weights.filter(entry => isFootprintAvailable(
      node.gridPosition, entry, gridWidth, gridHeight, occupied, node.id
    ));
    const selected = available.length
      ? chooseWeightedRoomTemplate(available.map(entry => ({ templateId: entry.key, weight: entry.weight })), random)
      : fallback.key;
    const footprint = weights.find(entry => entry.key === selected) ?? fallback;

    for (let y = node.gridPosition.y; y < node.gridPosition.y + footprint.height; y++) {
      for (let x = node.gridPosition.x; x < node.gridPosition.x + footprint.width; x++) {
        occupied.set(`${x},${y}`, node.id);
      }
    }
    byId.set(node.id, { width: footprint.width, height: footprint.height });
  }

  return byId;
}

function chooseWeightedEntry(entries, random) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let choice = random() * totalWeight;
  for (const entry of entries) {
    choice -= entry.weight;
    if (choice < 0) return entry;
  }
  return entries[entries.length - 1];
}

function normalizeRoomTypeWeights(weights) {
  if (weights == null) return null;
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    throw new TypeError("roomTypeWeights must map room type ids to non-negative weights.");
  }
  const entries = Object.keys(weights).sort().map(type => {
    if (typeof type !== "string" || type.trim() === "") {
      throw new TypeError("Room type ids must be non-empty strings.");
    }
    const weight = weights[type];
    if (!Number.isFinite(weight) || weight < 0) {
      throw new TypeError(`Room type weight for "${type}" must be a finite non-negative number.`);
    }
    return { type, weight };
  }).filter(entry => entry.weight > 0);
  if (entries.length === 0) {
    throw new RangeError("roomTypeWeights must contain at least one positive weight.");
  }
  return entries;
}

function chooseRoomTypes({
  roomNodes,
  mainPathIds,
  random,
  roomTypeWeights = null,
  guaranteedRoomTypes = ["treasure", "shop"],
}) {
  const typesById = new Map();
  const startNode = roomNodes[0];
  const bossNode = roomNodes.find(node => node.isBossRoom);

  typesById.set(startNode.id, "start");
  typesById.set(bossNode.id, "boss");

  const branchNodes = roomNodes.filter(node => (
    !mainPathIds.has(node.id) &&
    node.id !== startNode.id &&
    node.id !== bossNode.id
  ));
  const mainPathCandidates = roomNodes.filter(node => (
    mainPathIds.has(node.id) &&
    node.id !== startNode.id &&
    node.id !== bossNode.id
  ));
  const available = [
    ...shuffle(branchNodes, random),
    ...shuffle(mainPathCandidates, random),
  ];

  // Legacy callers retain the original room-type assignment behavior.
  const weightedTypes = Array.isArray(roomTypeWeights)
    ? roomTypeWeights
    : normalizeRoomTypeWeights(roomTypeWeights);
  if (!weightedTypes) {
    const treasureNode = available.shift();
    const shopNode = available.shift();
    if (treasureNode) typesById.set(treasureNode.id, "treasure");
    if (shopNode) typesById.set(shopNode.id, "shop");
    if (available.length > 0 && roomNodes.length >= 12 && random() < 0.35) {
      typesById.set(available.shift().id, "special");
    }
  } else {
    if (!Array.isArray(guaranteedRoomTypes) || guaranteedRoomTypes.some(type => (
      typeof type !== "string" || type.trim() === ""
    ))) {
      throw new TypeError("guaranteedRoomTypes must be an array of non-empty room type ids.");
    }
    const weightedIds = new Set(weightedTypes.map(entry => entry.type));
    for (const type of guaranteedRoomTypes) {
      if (!weightedIds.has(type)) {
        throw new Error(`Guaranteed room type "${type}" must have a positive roomTypeWeights entry.`);
      }
      const node = available.shift();
      if (!node) break;
      typesById.set(node.id, type);
    }

    while (available.length > 0) {
      const node = available.shift();
      typesById.set(node.id, chooseWeightedEntry(weightedTypes, random).type);
    }
  }

  for (const node of roomNodes) {
    if (!typesById.has(node.id)) typesById.set(node.id, "combat");
  }
  return typesById;
}

/**
 * Generates a connected, data-only floor.
 *
 * The room graph uses one-cell anchor positions for connectivity, then assigns
 * non-overlapping multi-cell footprints and world-size tiers. It deliberately
 * does not create Phaser objects, enemy instances, or Matter bodies.
 */
export default class FloorGenerator {
  /**
   * Resolve the run's progression profile and generate a deterministically
   * seeded floor. Existing generate() callers remain fully supported.
   */
  static generateForProgression({
    id = "floor-1",
    runSeed,
    progressionContext,
    profileRegistry,
    baseGenerationOptions = {},
    generationOverrides = {},
    roomLayoutRegistry = createDefaultRoomLayoutRegistry(),
    archetypeId = "default",
    variantId = "default",
    generationVersion = 1,
  } = {}) {
    if (!profileRegistry || typeof profileRegistry.resolve !== "function") {
      throw new TypeError("generateForProgression requires a profileRegistry with a resolve() method.");
    }
    if (runSeed == null) {
      throw new TypeError("generateForProgression requires a stable runSeed.");
    }
    const context = progressionContext instanceof RunProgressionContext
      ? progressionContext
      : RunProgressionContext.fromJSON(progressionContext ?? {});
    const resolvedProfile = profileRegistry.resolve(context.toJSON());
    const floorSeed = deriveFloorSeed(runSeed, {
      floorId: id,
      depth: context.depth,
      pathId: context.pathId,
      modifierIds: context.modifierIds,
    });

    // The resolved stage/path/modifier profile takes precedence over the
    // archetype defaults. Explicit generationOverrides are a final escape hatch
    // for a deliberately customized floor instance.
    const generationOptions = {
      ...baseGenerationOptions,
      ...resolvedProfile.generationOptions,
      ...generationOverrides,
    };

    return FloorGenerator.generate({
      ...generationOptions,
      id,
      archetypeId,
      variantId,
      generationVersion,
      depth: context.depth,
      pathId: context.pathId,
      seed: floorSeed,
      generationProfile: {
        ...resolvedProfile,
        runSeed: normalizeSeed(runSeed),
        floorSeed,
      },
      roomLayoutRegistry,
      roomLayoutPoolId: resolvedProfile.contentPools.roomLayoutPoolId ?? "starter",
      obstaclePoolId: resolvedProfile.contentPools.obstaclePoolId ?? null,
    });
  }

  static generate({
    id = "floor-1",
    archetypeId = "default",
    variantId = "default",
    generationVersion = 1,
    depth = 1,
    pathId = "default",
    seed = null,
    generationProfile = null,
    roomLayoutRegistry = createDefaultRoomLayoutRegistry(),
    roomLayoutPoolId = "starter",
    obstaclePoolId = null,
    roomLayoutValidationOptions = {},
    minRooms = 10,
    maxRooms = 15,
    roomCount = null,
    gridWidth = 7,
    gridHeight = 7,
    minMainPathRooms = 7,
    maxMainPathRooms = 9,
    roomWidth = 800,
    roomHeight = 800,
    roomShape = "square",
    roomTemplateWeights = null,
    roomFootprintWeights = null,
    roomSizeWeights = null,
    roomSizeScales = null,
    roomTypeWeights = null,
    guaranteedRoomTypes = ["treasure", "shop"],
    background = 0xffffff,
  } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("FloorGenerator requires a non-empty floor id.");
    }

    if (typeof pathId !== "string" || pathId.trim() === "") {
      throw new TypeError("pathId must be a non-empty string.");
    }

    assertIntegerInRange(depth, 1, Number.MAX_SAFE_INTEGER, "depth");
    assertIntegerInRange(gridWidth, 3, Number.MAX_SAFE_INTEGER, "gridWidth");
    assertIntegerInRange(gridHeight, 3, Number.MAX_SAFE_INTEGER, "gridHeight");
    assertIntegerInRange(minRooms, 4, gridWidth * gridHeight, "minRooms");
    assertIntegerInRange(maxRooms, minRooms, gridWidth * gridHeight, "maxRooms");
    assertIntegerInRange(minMainPathRooms, 3, gridWidth * gridHeight, "minMainPathRooms");
    assertIntegerInRange(maxMainPathRooms, minMainPathRooms, gridWidth * gridHeight, "maxMainPathRooms");

    if (roomCount !== null) {
      assertIntegerInRange(roomCount, 4, gridWidth * gridHeight, "roomCount");
    }

    if (!Number.isFinite(roomWidth) || roomWidth <= 0) {
      throw new TypeError("roomWidth must be a positive number.");
    }

    if (!Number.isFinite(roomHeight) || roomHeight <= 0) {
      throw new TypeError("roomHeight must be a positive number.");
    }

    const normalizedTemplateWeights = normalizeRoomTemplateWeights(
      roomTemplateWeights,
      roomShape
    );
    const normalizedFootprintWeights = normalizeFootprintWeights(roomFootprintWeights);
    const normalizedRoomSizeWeights = normalizeRoomSizeWeights(roomSizeWeights, roomSizeScales);
    const normalizedRoomTypeWeights = normalizeRoomTypeWeights(roomTypeWeights);
    const actualSeed = normalizeSeed(seed);
    const random = createRandom(actualSeed);
    const targetRoomCount = roomCount ?? randomInteger(minRooms, maxRooms, random);

    if (targetRoomCount > gridWidth * gridHeight) {
      throw new RangeError("roomCount cannot exceed the number of grid cells.");
    }

    // Keep at least two rooms outside the main route for optional branches.
    const pathMax = Math.min(maxMainPathRooms, targetRoomCount - 2);
    if (pathMax < minMainPathRooms) {
      throw new RangeError(
        `The selected room count (${targetRoomCount}) is too small for the configured main path and at least two branches.`
      );
    }

    const mainPathLength = randomInteger(minMainPathRooms, pathMax, random);
    const startPosition = {
      x: Math.floor(gridWidth / 2),
      y: Math.floor(gridHeight / 2),
    };

    const mainPath = findMainPath({
      startPosition,
      targetLength: mainPathLength,
      gridWidth,
      gridHeight,
      random,
    });

    if (!mainPath) {
      throw new Error(
        `Could not create a main path of ${mainPathLength} rooms on a ${gridWidth}x${gridHeight} grid.`
      );
    }

    const floorPrefix = id;
    const roomNodes = [];
    const connections = [];
    const occupied = new Set();

    const createRoomNode = (position, index, pathRole, parent = null) => {
      const roomId = `${floorPrefix}-room-${String(index).padStart(2, "0")}`;
      const node = {
        id: roomId,
        gridPosition: { ...position },
        pathRole,
        isStartRoom: index === 1,
        isBossRoom: false,
      };

      roomNodes.push(node);
      occupied.add(cellKey(position));

      if (parent) {
        connections.push({
          id: `${parent.id}--${node.id}`,
          roomAId: parent.id,
          roomBId: node.id,
          directionFromA: getDirectionBetween(parent.gridPosition, node.gridPosition),
        });
      }

      return node;
    };

    // Build the guaranteed start-to-boss path first.
    for (let index = 0; index < mainPath.length; index++) {
      const parent = index > 0 ? roomNodes[index - 1] : null;
      const node = createRoomNode(mainPath[index], index + 1, "main", parent);

      if (index === mainPath.length - 1) {
        node.isBossRoom = true;
      }
    }

    const mainPathRoomIds = new Set(roomNodes.map(node => node.id));
    const bossNode = roomNodes[roomNodes.length - 1];

    // Grow connected side branches from any non-boss room that has free neighbors.
    while (roomNodes.length < targetRoomCount) {
      const possibleParents = shuffle(
        roomNodes.filter(node => (
          node.id !== bossNode.id &&
          getNeighbors(node.gridPosition, gridWidth, gridHeight)
            .some(position => !occupied.has(cellKey(position)))
        )),
        random
      );

      if (possibleParents.length === 0) {
        throw new Error("The floor grid ran out of available cells before all rooms were generated.");
      }

      const parent = possibleParents[0];
      const availablePositions = shuffle(
        getNeighbors(parent.gridPosition, gridWidth, gridHeight)
          .filter(position => !occupied.has(cellKey(position))),
        random
      );
      const position = availablePositions[0];
      const node = createRoomNode(position, roomNodes.length + 1, "branch", parent);
      node.isStartRoom = false;
      node.isBossRoom = false;
    }

    const footprintsById = assignRoomFootprints({
      roomNodes,
      gridWidth,
      gridHeight,
      weights: normalizedFootprintWeights,
      random,
    });

    const typesById = chooseRoomTypes({
      roomNodes,
      mainPathIds: mainPathRoomIds,
      random,
      roomTypeWeights: normalizedRoomTypeWeights,
      guaranteedRoomTypes,
    });

    const rooms = roomNodes.map(node => {
      const templateId = chooseWeightedRoomTemplate(normalizedTemplateWeights, random);
      const template = getRoomTemplate(templateId);
      const footprint = footprintsById.get(node.id) ?? { width: 1, height: 1 };
      const sizeEntry = chooseWeightedEntry(normalizedRoomSizeWeights, random);
      const sizeScale = sizeEntry.scale;
      return {
        id: node.id,
        gridPosition: node.gridPosition,
        type: typesById.get(node.id),
        shape: template.shape,
        templateId,
        footprint,
        sizeTier: sizeEntry.tier,
        sizeScale,
        width: roomWidth * footprint.width * sizeScale,
        height: roomHeight * footprint.height * sizeScale,
        background,
        enemies: [],
        isStartRoom: node.isStartRoom,
        isBossRoom: node.isBossRoom,
      };
    });

    const startRoom = roomNodes.find(node => node.isStartRoom);

    const floor = new FloorModel({
      id,
      archetypeId,
      variantId,
      generationVersion,
      depth,
      pathId,
      seed: actualSeed,
      generationProfile,
      gridWidth,
      gridHeight,
      rooms,
      connections,
      startRoomId: startRoom.id,
      bossRoomId: bossNode.id,
    });

    if (!roomLayoutRegistry || typeof roomLayoutRegistry.selectForRoom !== "function") {
      throw new TypeError("roomLayoutRegistry must provide selectForRoom().");
    }
    if (typeof roomLayoutPoolId !== "string" || !roomLayoutPoolId.trim()) {
      throw new TypeError("roomLayoutPoolId must be a non-empty string.");
    }

    // Layout selection uses independent per-room seeds. It cannot shift the
    // random stream used to build the floor graph, room types or footprints.
    for (const room of floor.rooms.values()) {
      const roomLayoutSeed = deriveFloorSeed(actualSeed, {
        floorId: `${id}:${room.id}:layout`,
        depth,
        pathId,
        modifierIds: [],
      });
      const assignment = roomLayoutRegistry.selectForRoom(room, {
        poolId: roomLayoutPoolId,
        obstaclePoolId,
        seed: roomLayoutSeed,
        validationOptions: roomLayoutValidationOptions,
      });
      room.setRoomLayout(assignment);
    }

    return floor;
  }
}
