import FloorModel from "./FloorModel.js";

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

function chooseRoomTypes({ roomNodes, mainPathIds, random }) {
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

  const branchPool = shuffle(branchNodes, random);
  const fallbackPool = shuffle(mainPathCandidates, random);
  const available = [...branchPool, ...fallbackPool];

  // Ensure each generated floor has at least one optional reward room and one shop.
  const treasureNode = available.shift();
  const shopNode = available.shift();

  if (treasureNode) {
    typesById.set(treasureNode.id, "treasure");
  }

  if (shopNode) {
    typesById.set(shopNode.id, "shop");
  }

  // A special room is an occasional extra, not a guaranteed room type.
  if (available.length > 0 && roomNodes.length >= 12 && random() < 0.35) {
    const specialNode = available.shift();
    typesById.set(specialNode.id, "special");
  }

  for (const node of roomNodes) {
    if (!typesById.has(node.id)) {
      typesById.set(node.id, "combat");
    }
  }

  return typesById;
}

/**
 * Generates a connected, data-only floor.
 *
 * The first version uses one-cell rooms and a tree-shaped room graph:
 * a guaranteed start-to-boss main path plus optional side branches.
 * It deliberately does not create Phaser objects, enemy instances, or Matter bodies.
 */
export default class FloorGenerator {
  static generate({
    id = "floor-1",
    archetypeId = "default",
    variantId = "default",
    generationVersion = 1,
    depth = 1,
    seed = null,
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
    background = 0xffffff,
  } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("FloorGenerator requires a non-empty floor id.");
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

    const typesById = chooseRoomTypes({
      roomNodes,
      mainPathIds: mainPathRoomIds,
      random,
    });

    const rooms = roomNodes.map(node => ({
      id: node.id,
      gridPosition: node.gridPosition,
      type: typesById.get(node.id),
      shape: roomShape,
      footprint: { width: 1, height: 1 },
      width: roomWidth,
      height: roomHeight,
      background,
      enemies: [],
      cameraMode: "fixed",
      isStartRoom: node.isStartRoom,
      isBossRoom: node.isBossRoom,
    }));

    const startRoom = roomNodes.find(node => node.isStartRoom);

    return new FloorModel({
      id,
      archetypeId,
      variantId,
      generationVersion,
      depth,
      seed: actualSeed,
      gridWidth,
      gridHeight,
      rooms,
      connections,
      startRoomId: startRoom.id,
      bossRoomId: bossNode.id,
    });
  }
}
