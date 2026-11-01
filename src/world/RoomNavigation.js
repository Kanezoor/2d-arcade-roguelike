const VALID_DIRECTIONS = new Set(["north", "east", "south", "west"]);

export const OPPOSITE_DIRECTION = Object.freeze({
  north: "south",
  east: "west",
  south: "north",
  west: "east",
});

/** Return the opposite cardinal direction. */
export function getOppositeDirection(direction) {
  const opposite = OPPOSITE_DIRECTION[direction];

  if (!opposite) {
    throw new TypeError(`Unsupported room direction "${direction}".`);
  }

  return opposite;
}

/**
 * Find the exit in a specific direction from a room.
 * Locked exits are excluded by default.
 */
export function getExitForDirection(
  floor,
  roomId,
  direction,
  { allowLocked = false } = {}
) {
  if (!floor || typeof floor.getExits !== "function") {
    throw new TypeError("getExitForDirection requires a FloorModel-like object.");
  }

  if (!VALID_DIRECTIONS.has(direction)) {
    throw new TypeError(`Unsupported room direction "${direction}".`);
  }

  return floor.getExits(roomId, { includeLocked: true }).find(exit => (
    exit.direction === direction && (allowLocked || !exit.locked)
  )) ?? null;
}

/**
 * Return the center position of a doorway trigger, inset from the room edge.
 * The returned width/height describe the trigger rectangle.
 */
export function getDoorPosition(room, direction, inset = 48) {
  if (!room || !Number.isFinite(room.width) || !Number.isFinite(room.height)) {
    throw new TypeError("getDoorPosition requires a room with numeric width and height.");
  }

  if (!VALID_DIRECTIONS.has(direction)) {
    throw new TypeError(`Unsupported room direction "${direction}".`);
  }

  if (!Number.isFinite(inset) || inset <= 0) {
    throw new TypeError("Door inset must be a positive number.");
  }

  switch (direction) {
    case "north":
      return { x: room.width / 2, y: inset, width: 140, height: 32 };
    case "east":
      return { x: room.width - inset, y: room.height / 2, width: 32, height: 140 };
    case "south":
      return { x: room.width / 2, y: room.height - inset, width: 140, height: 32 };
    case "west":
      return { x: inset, y: room.height / 2, width: 32, height: 140 };
    default:
      // The validation above makes this unreachable, but keeps the return shape explicit.
      throw new TypeError(`Unsupported room direction "${direction}".`);
  }
}

/**
 * Position the player just inside the side from which they enter the room.
 * `entryDirection` is the side of the destination room, not the direction
 * the player travelled in the previous room.
 */
export function getRoomEntryPosition(room, entryDirection, inset = 82) {
  if (!room || !Number.isFinite(room.width) || !Number.isFinite(room.height)) {
    throw new TypeError("getRoomEntryPosition requires a room with numeric width and height.");
  }

  if (!VALID_DIRECTIONS.has(entryDirection)) {
    throw new TypeError(`Unsupported room entry direction "${entryDirection}".`);
  }

  if (!Number.isFinite(inset) || inset <= 0) {
    throw new TypeError("Entry inset must be a positive number.");
  }

  switch (entryDirection) {
    case "north":
      return { x: room.width / 2, y: inset };
    case "east":
      return { x: room.width - inset, y: room.height / 2 };
    case "south":
      return { x: room.width / 2, y: room.height - inset };
    case "west":
      return { x: inset, y: room.height / 2 };
    default:
      throw new TypeError(`Unsupported room entry direction "${entryDirection}".`);
  }
}
