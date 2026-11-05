import RoomPort from "./RoomPort.js";

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
    ports = [],
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

    if (!Array.isArray(ports)) {
      throw new TypeError(`Room "${id}" ports must be an array.`);
    }

    this.ports = [];
    for (const inputPort of ports) {
      this.addPort(inputPort);
    }
  }

  addPort(inputPort) {
    const port = inputPort instanceof RoomPort
      ? inputPort
      : new RoomPort(inputPort);

    if (this.ports.some(existing => existing.id === port.id)) {
      throw new Error(`Duplicate room port id "${port.id}" in room "${this.id}".`);
    }

    if (
      port.connectionId &&
      this.ports.some(existing => existing.connectionId === port.connectionId)
    ) {
      throw new Error(
        `Connection "${port.connectionId}" already has a port in room "${this.id}".`
      );
    }

    this.ports.push(port);
    return port;
  }

  setPort(inputPort) {
    const port = inputPort instanceof RoomPort
      ? inputPort
      : new RoomPort(inputPort);

    const existingIndex = this.ports.findIndex(existing => (
      existing.id === port.id ||
      (port.connectionId && existing.connectionId === port.connectionId)
    ));

    const duplicate = this.ports.find((existing, index) => (
      index !== existingIndex && (
        existing.id === port.id ||
        (port.connectionId && existing.connectionId === port.connectionId)
      )
    ));

    if (duplicate) {
      throw new Error(`RoomPort "${port.id}" conflicts with another port in room "${this.id}".`);
    }

    if (existingIndex === -1) {
      this.ports.push(port);
    } else {
      this.ports[existingIndex] = port;
    }

    return port;
  }

  getPortForConnection(connectionId) {
    return this.ports.find(port => port.connectionId === connectionId) ?? null;
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
      ports: this.ports.map(port => port.toJSON()),
    };
  }
}
