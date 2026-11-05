import Vestibule from "./Vestibule.js";
import RoomGate from "./RoomGate.js";

const VALID_DIRECTIONS = new Set(["north", "east", "south", "west"]);
const VALID_MODES = new Set(["direct", "vestibule"]);

function cloneSerializable(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function validatePoint(point, label) {
  if (point === null || point === undefined) {
    return null;
  }

  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError(`${label} must have finite x/y coordinates.`);
  }

  return { x: point.x, y: point.y };
}

function normalizeVector(vector, label) {
  if (vector == null) {
    return null;
  }

  const x = vector.x;
  const y = vector.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError(`${label} must have finite x/y components.`);
  }

  const length = Math.hypot(x, y);
  if (length === 0) {
    throw new TypeError(`${label} cannot be a zero vector.`);
  }

  return { x: x / length, y: y / length };
}

function validateBoundaryOpening(value) {
  if (value == null) {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("RoomPort boundaryOpening must be a geometry object.");
  }

  // RoomGate performs the supported geometry validation.
  return new RoomGate({ id: "boundary-opening-validation", geometry: value }).geometry;
}

/** A spatial entrance for one logical FloorModel connection. */
export default class RoomPort {
  constructor({
    id,
    connectionId,
    direction,
    mode = "direct",
    anchor = null,
    outwardNormal = null,
    openingWidth = 140,
    triggerDepth = 32,
    triggerInset = 48,
    vestibule = null,
    gate = undefined,
    boundaryOpening = null,
  } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("RoomPort requires a non-empty id.");
    }

    if (connectionId !== null && connectionId !== undefined &&
        (typeof connectionId !== "string" || connectionId.trim() === "")) {
      throw new TypeError("RoomPort connectionId must be a non-empty string or null.");
    }

    if (!VALID_DIRECTIONS.has(direction)) {
      throw new TypeError(`RoomPort direction must be one of: ${[...VALID_DIRECTIONS].join(", ")}.`);
    }

    if (!VALID_MODES.has(mode)) {
      throw new TypeError(`RoomPort mode must be one of: ${[...VALID_MODES].join(", ")}.`);
    }

    if (!Number.isFinite(openingWidth) || openingWidth <= 0) {
      throw new TypeError("RoomPort openingWidth must be a positive number.");
    }

    if (!Number.isFinite(triggerDepth) || triggerDepth <= 0) {
      throw new TypeError("RoomPort triggerDepth must be a positive number.");
    }

    if (!Number.isFinite(triggerInset) || triggerInset < 0) {
      throw new TypeError("RoomPort triggerInset must be a non-negative number.");
    }

    this.id = id;
    this.connectionId = connectionId ?? null;
    this.direction = direction;
    this.mode = mode;
    this.anchor = validatePoint(anchor, "RoomPort anchor");
    this.outwardNormal = normalizeVector(outwardNormal, "RoomPort outwardNormal");
    this.openingWidth = openingWidth;
    this.triggerDepth = triggerDepth;
    this.triggerInset = triggerInset;

    if (mode === "vestibule") {
      const vestibuleConfig = vestibule ?? {};
      this.vestibule = vestibuleConfig instanceof Vestibule
        ? vestibuleConfig
        : new Vestibule({ ...vestibuleConfig, width: vestibuleConfig.width ?? openingWidth });
    } else {
      if (vestibule !== null) {
        throw new TypeError("A direct RoomPort cannot define a vestibule.");
      }
      this.vestibule = null;
    }

    if (gate === undefined) {
      this.gate = mode === "vestibule"
        ? new RoomGate({ id: `${id}-gate` })
        : null;
    } else if (gate === null) {
      this.gate = null;
    } else {
      this.gate = gate instanceof RoomGate
        ? gate
        : new RoomGate({ ...gate, id: gate.id ?? `${id}-gate` });
    }

    this.boundaryOpening = validateBoundaryOpening(boundaryOpening);
  }

  toJSON() {
    return {
      id: this.id,
      connectionId: this.connectionId,
      direction: this.direction,
      mode: this.mode,
      anchor: cloneSerializable(this.anchor),
      outwardNormal: cloneSerializable(this.outwardNormal),
      openingWidth: this.openingWidth,
      triggerDepth: this.triggerDepth,
      triggerInset: this.triggerInset,
      vestibule: this.vestibule?.toJSON() ?? null,
      gate: this.gate?.toJSON() ?? null,
      boundaryOpening: cloneSerializable(this.boundaryOpening),
    };
  }
}
