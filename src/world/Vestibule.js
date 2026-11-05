function cloneSerializable(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function assertPositiveNumber(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive number.`);
  }
}

function validateSegments(segments, label) {
  if (!Array.isArray(segments)) {
    throw new TypeError(`${label} must be an array.`);
  }

  return segments.map((segment, index) => {
    const start = segment?.start;
    const end = segment?.end;

    for (const [pointName, point] of [["start", start], ["end", end]]) {
      if (
        !point ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y)
      ) {
        throw new TypeError(`${label}[${index}].${pointName} must have finite x/y coordinates.`);
      }
    }

    if (start.x === end.x && start.y === end.y) {
      throw new TypeError(`${label}[${index}] must have a non-zero length.`);
    }

    return {
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
    };
  });
}

/** Serializable physical passage attached to a room boundary. */
export default class Vestibule {
  constructor({
    length = 140,
    width = 140,
    wallThickness = 20,
    wallColor = 0x444444,
    wallSegments = null,
    outerTriggerInset = 24,
  } = {}) {
    assertPositiveNumber(length, "Vestibule length");
    assertPositiveNumber(width, "Vestibule width");
    assertPositiveNumber(wallThickness, "Vestibule wallThickness");
    assertPositiveNumber(outerTriggerInset, "Vestibule outerTriggerInset");

    this.length = length;
    this.width = width;
    this.wallThickness = wallThickness;
    this.wallColor = wallColor;
    this.wallSegments = wallSegments === null
      ? null
      : validateSegments(wallSegments, "Vestibule wallSegments");
    this.outerTriggerInset = outerTriggerInset;
  }

  toJSON() {
    return {
      length: this.length,
      width: this.width,
      wallThickness: this.wallThickness,
      wallColor: this.wallColor,
      wallSegments: cloneSerializable(this.wallSegments),
      outerTriggerInset: this.outerTriggerInset,
    };
  }
}
