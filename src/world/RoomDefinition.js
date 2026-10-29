const ROOM_TYPES = new Set([
  "start",
  "combat",
  "treasure",
  "shop",
  "boss",
  "secret",
  "special",
]);

const ROOM_SHAPES = new Set([
  "square",
  "rectangle",
  "diamond",
  "circle",
]);

const CAMERA_MODES = new Set(["fixed", "follow"]);

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer.`);
  }
}

function cloneSerializable(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

/**
 * Describes a room's stable identity and layout metadata.
 * It intentionally contains no Phaser objects or Matter bodies.
 */
export default class RoomDefinition {
  constructor({
    id,
    gridPosition,
    type = "combat",
    shape = "rectangle",
    footprint = { width: 1, height: 1 },
    width = 800,
    height = 800,
    background = 0xffffff,
    enemies = [],
    cameraMode,
    isStartRoom = false,
    isBossRoom = false,
    initiallyLocked = false,
  } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("RoomDefinition requires a non-empty string id.");
    }

    if (
      !gridPosition ||
      !Number.isInteger(gridPosition.x) ||
      !Number.isInteger(gridPosition.y) ||
      gridPosition.x < 0 ||
      gridPosition.y < 0
    ) {
      throw new TypeError(
        `Room "${id}" requires non-negative integer gridPosition.x/y values.`
      );
    }

    if (!ROOM_TYPES.has(type)) {
      throw new TypeError(`Unsupported room type "${type}" for room "${id}".`);
    }

    if (!ROOM_SHAPES.has(shape)) {
      throw new TypeError(`Unsupported room shape "${shape}" for room "${id}".`);
    }

    const footprintWidth = footprint?.width ?? 1;
    const footprintHeight = footprint?.height ?? 1;
    assertPositiveInteger(footprintWidth, `Room "${id}" footprint.width`);
    assertPositiveInteger(footprintHeight, `Room "${id}" footprint.height`);

    if (!Number.isFinite(width) || width <= 0) {
      throw new TypeError(`Room "${id}" width must be a positive number.`);
    }

    if (!Number.isFinite(height) || height <= 0) {
      throw new TypeError(`Room "${id}" height must be a positive number.`);
    }

    const resolvedCameraMode = cameraMode ?? (
      footprintWidth > 1 || footprintHeight > 1
        ? "follow"
        : "fixed"
    );

    if (!CAMERA_MODES.has(resolvedCameraMode)) {
      throw new TypeError(
        `Unsupported camera mode "${resolvedCameraMode}" for room "${id}".`
      );
    }

    if (!Array.isArray(enemies)) {
      throw new TypeError(`Room "${id}" enemies must be an array.`);
    }

    this.id = id;
    this.gridPosition = {
      x: gridPosition.x,
      y: gridPosition.y,
    };
    this.type = type;
    this.shape = shape;
    this.footprint = {
      width: footprintWidth,
      height: footprintHeight,
    };

    // width/height are world-space dimensions retained for current gameplay code.
    this.width = width;
    this.height = height;
    this.background = background;
    this.enemies = cloneSerializable(enemies);
    this.cameraMode = resolvedCameraMode;
    this.isStartRoom = Boolean(isStartRoom);
    this.isBossRoom = Boolean(isBossRoom || type === "boss");
    this.initiallyLocked = Boolean(initiallyLocked);
  }

  toJSON() {
    return {
      id: this.id,
      gridPosition: { ...this.gridPosition },
      type: this.type,
      shape: this.shape,
      footprint: { ...this.footprint },
      width: this.width,
      height: this.height,
      background: this.background,
      enemies: cloneSerializable(this.enemies),
      cameraMode: this.cameraMode,
      isStartRoom: this.isStartRoom,
      isBossRoom: this.isBossRoom,
      initiallyLocked: this.initiallyLocked,
    };
  }
}
