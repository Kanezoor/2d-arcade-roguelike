function cloneSerializable(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function validatePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError(`${label} must have finite x/y coordinates.`);
  }

  return { x: point.x, y: point.y };
}

function validateSegment(segment, label) {
  const start = validatePoint(segment?.start, `${label} start`);
  const end = validatePoint(segment?.end, `${label} end`);

  if (start.x === end.x && start.y === end.y) {
    throw new TypeError(`${label} must have a non-zero length.`);
  }

  return { start, end };
}

function validateGeometry(geometry) {
  if (geometry == null) {
    return null;
  }

  if (geometry.type === "line") {
    return {
      type: "line",
      ...validateSegment(geometry, "Gate line"),
    };
  }

  if (geometry.type === "segments") {
    if (!Array.isArray(geometry.segments) || geometry.segments.length === 0) {
      throw new TypeError("Gate segments geometry requires at least one segment.");
    }

    return {
      type: "segments",
      segments: geometry.segments.map((segment, index) =>
        validateSegment(segment, `Gate segment ${index}`)
      ),
    };
  }

  if (geometry.type === "polyline") {
    if (!Array.isArray(geometry.points) || geometry.points.length < 2) {
      throw new TypeError("Gate polyline geometry requires at least two points.");
    }

    return {
      type: "polyline",
      points: geometry.points.map((point, index) =>
        validatePoint(point, `Gate polyline point ${index}`)
      ),
    };
  }

  if (geometry.type === "arc") {
    const center = validatePoint(geometry.center, "Gate arc center");
    const { radius, startAngle, endAngle } = geometry;
    const segmentCount = geometry.segmentCount ?? 8;

    if (!Number.isFinite(radius) || radius <= 0) {
      throw new TypeError("Gate arc radius must be a positive number.");
    }

    if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle)) {
      throw new TypeError("Gate arc angles must be finite radians.");
    }

    if (!Number.isInteger(segmentCount) || segmentCount < 1 || segmentCount > 128) {
      throw new RangeError("Gate arc segmentCount must be an integer between 1 and 128.");
    }

    if (startAngle === endAngle) {
      throw new TypeError("Gate arc must span a non-zero angle.");
    }

    return {
      type: "arc",
      center,
      radius,
      startAngle,
      endAngle,
      segmentCount,
    };
  }

  throw new TypeError(`Unsupported gate geometry type "${geometry.type}".`);
}

/** Data/configuration for a physical threshold barrier. Runtime bodies are created elsewhere. */
export default class RoomGate {
  constructor({
    id,
    geometry = null,
    initiallyOpen = false,
    closeOnEntry = true,
    openWhenRoomCleared = true,
    thickness = 14,
    color = 0xc58d44,
    openAlpha = 0.16,
  } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("RoomGate requires a non-empty id.");
    }

    if (!Number.isFinite(thickness) || thickness <= 0) {
      throw new TypeError("RoomGate thickness must be a positive number.");
    }

    if (!Number.isFinite(openAlpha) || openAlpha < 0 || openAlpha > 1) {
      throw new RangeError("RoomGate openAlpha must be between 0 and 1.");
    }

    this.id = id;
    this.geometry = validateGeometry(geometry);
    this.initiallyOpen = Boolean(initiallyOpen);
    this.closeOnEntry = Boolean(closeOnEntry);
    this.openWhenRoomCleared = Boolean(openWhenRoomCleared);
    this.thickness = thickness;
    this.color = color;
    this.openAlpha = openAlpha;
  }

  toJSON() {
    return {
      id: this.id,
      geometry: cloneSerializable(this.geometry),
      initiallyOpen: this.initiallyOpen,
      closeOnEntry: this.closeOnEntry,
      openWhenRoomCleared: this.openWhenRoomCleared,
      thickness: this.thickness,
      color: this.color,
      openAlpha: this.openAlpha,
    };
  }
}
