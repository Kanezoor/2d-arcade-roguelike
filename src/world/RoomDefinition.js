import RoomPort from "./RoomPort.js";
import { validateRoomPortLayout, assertValidRoomPortLayout } from "./RoomPortLayoutValidator.js";
import { hasRoomTemplate, getRoomTemplate } from "./RoomTemplateRegistry.js";
import { validateRoomLayout as validateRoomLayoutGeometry, assertValidRoomLayout as assertValidRoomLayoutGeometry } from "./RoomLayoutValidator.js";

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
  "octagon",
]);

const CAMERA_MODES = new Set(["fixed", "follow"]);
const ROOM_SIZE_TIERS = new Set(["small", "medium", "large"]);

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
    templateId = null,
    footprint = { width: 1, height: 1 },
    sizeTier = "medium",
    sizeScale = 1,
    width = 800,
    height = 800,
    background = 0xffffff,
    outsideBackground = 0x171923,
    enemies = [],
    cameraMode,
    isStartRoom = false,
    isBossRoom = false,
    initiallyLocked = false,
    ports = [],
    outlinePoints = null,
    roomLayout = null,
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

    const resolvedTemplateId = templateId ?? shape;
    if (!hasRoomTemplate(resolvedTemplateId)) {
      throw new TypeError(`Unknown room template "${resolvedTemplateId}" for room "${id}".`);
    }
    const resolvedShape = getRoomTemplate(resolvedTemplateId).shape;
    if (!ROOM_SHAPES.has(resolvedShape)) ROOM_SHAPES.add(resolvedShape);

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

    if (!ROOM_SIZE_TIERS.has(sizeTier)) {
      throw new TypeError(`Unsupported room size tier "${sizeTier}" for room "${id}".`);
    }
    if (!Number.isFinite(sizeScale) || sizeScale <= 0) {
      throw new TypeError(`Room "${id}" sizeScale must be a positive finite number.`);
    }

    const resolvedCameraMode = cameraMode ?? (
      footprintWidth > 1 || footprintHeight > 1 || sizeTier === "large"
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
    this.shape = resolvedShape;
    this.templateId = resolvedTemplateId;
    this.footprint = {
      width: footprintWidth,
      height: footprintHeight,
    };
    this.sizeTier = sizeTier;
    this.sizeScale = sizeScale;

    // width/height are world-space dimensions retained for current gameplay code.
    this.width = width;
    this.height = height;
    this.background = background;
    this.outsideBackground = outsideBackground;
    this.enemies = cloneSerializable(enemies);
    this.cameraMode = resolvedCameraMode;
    this.isStartRoom = Boolean(isStartRoom);
    this.isBossRoom = Boolean(isBossRoom || type === "boss");
    this.initiallyLocked = Boolean(initiallyLocked);

    if (outlinePoints !== null && (
      !Array.isArray(outlinePoints) ||
      outlinePoints.length < 3 ||
      outlinePoints.some(point => (
        !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
        point.x < 0 || point.x > width || point.y < 0 || point.y > height
      ))
    )) {
      throw new TypeError(
        `Room "${id}" outlinePoints must contain at least three finite points inside the room bounds.`
      );
    }

    this.outlinePoints = outlinePoints === null
      ? null
      : outlinePoints.map(point => ({ x: point.x, y: point.y }));

    this.roomLayout = null;
    if (roomLayout !== null) this.setRoomLayout(roomLayout);

    if (!Array.isArray(ports)) {
      throw new TypeError(`Room "${id}" ports must be an array.`);
    }

    this.ports = [];
    for (const inputPort of ports) {
      this.addPort(inputPort);
    }
  }

  setRoomLayout(input) {
    if (input === null) {
      this.roomLayout = null;
      return null;
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError(`Room "${this.id}" roomLayout must be an object or null.`);
    }
    for (const key of ["layoutId", "poolId", "variantId"]) {
      if (typeof input[key] !== "string" || !input[key].trim()) {
        throw new TypeError(`Room "${this.id}" roomLayout.${key} must be a non-empty string.`);
      }
    }
    if (!Number.isInteger(input.version) || input.version < 1) {
      throw new TypeError(`Room "${this.id}" roomLayout.version must be a positive integer.`);
    }
    if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff) {
      throw new TypeError(`Room "${this.id}" roomLayout.seed must be an unsigned 32-bit integer.`);
    }
    if (!Array.isArray(input.placements)) {
      throw new TypeError(`Room "${this.id}" roomLayout.placements must be an array.`);
    }
    const placementIds = new Set();
    for (const placement of input.placements) {
      if (!placement || typeof placement !== "object" || Array.isArray(placement)) {
        throw new TypeError(`Room "${this.id}" roomLayout placements must be objects.`);
      }
      if (typeof placement.id !== "string" || !placement.id.trim() ||
          typeof placement.definitionId !== "string" || !placement.definitionId.trim()) {
        throw new TypeError(`Room "${this.id}" roomLayout placement requires id and definitionId.`);
      }
      if (placementIds.has(placement.id)) {
        throw new Error(`Room "${this.id}" has duplicate layout placement id "${placement.id}".`);
      }
      placementIds.add(placement.id);
      for (const key of ["x", "y", "width", "height", "rotation"]) {
        if (!Number.isFinite(placement[key])) {
          throw new TypeError(`Room "${this.id}" roomLayout placement "${placement.id}" ${key} must be finite.`);
        }
      }
      if (placement.width <= 0 || placement.height <= 0) {
        throw new RangeError(`Room "${this.id}" roomLayout placement "${placement.id}" dimensions must be positive.`);
      }
    }
    this.roomLayout = cloneSerializable(input);
    return this.roomLayout;
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

  validatePortLayout(options = {}) {
    return validateRoomPortLayout(this, options);
  }

  validateRoomLayout(options = {}) {
    if (!this.roomLayout) return { valid: true, errors: [], warnings: [] };
    const normalizedPlacements = this.roomLayout.placements.map(placement => ({
      ...(placement.normalized ?? {
        x: placement.x / this.width,
        y: placement.y / this.height,
        width: placement.width / this.width,
        height: placement.height / this.height,
      }),
      id: placement.id,
      definitionId: placement.definitionId,
      rotation: placement.rotation ?? placement.normalized?.rotation ?? 0,
    }));
    return validateRoomLayoutGeometry(this, normalizedPlacements, options);
  }

  assertValidRoomLayout(options = {}) {
    if (!this.roomLayout) return { valid: true, errors: [], warnings: [] };
    const normalizedPlacements = this.roomLayout.placements.map(placement => ({
      ...(placement.normalized ?? {
        x: placement.x / this.width,
        y: placement.y / this.height,
        width: placement.width / this.width,
        height: placement.height / this.height,
      }),
      id: placement.id,
      definitionId: placement.definitionId,
      rotation: placement.rotation ?? placement.normalized?.rotation ?? 0,
    }));
    return assertValidRoomLayoutGeometry(this, normalizedPlacements, options);
  }

  assertValidPortLayout(options = {}) {
    return assertValidRoomPortLayout(this, options);
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
      templateId: this.templateId,
      footprint: { ...this.footprint },
      sizeTier: this.sizeTier,
      sizeScale: this.sizeScale,
      width: this.width,
      height: this.height,
      background: this.background,
      outsideBackground: this.outsideBackground,
      enemies: cloneSerializable(this.enemies),
      cameraMode: this.cameraMode,
      isStartRoom: this.isStartRoom,
      isBossRoom: this.isBossRoom,
      initiallyLocked: this.initiallyLocked,
      outlinePoints: this.outlinePoints?.map(point => ({ ...point })) ?? null,
      roomLayout: cloneSerializable(this.roomLayout),
      ports: this.ports.map(port => port.toJSON()),
    };
  }
}
