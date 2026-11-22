import { getRoomOutlinePoints, isPointInsideRoom } from "./RoomGeometry.js";
import { resolveRoomPortFrame } from "./RoomEntranceGeometry.js";

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function pointSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) return distance(point, start);
  const t = Math.max(0, Math.min(1, (
    (point.x - start.x) * dx + (point.y - start.y) * dy
  ) / lengthSquared));
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

function segmentsIntersect(a, b, c, d) {
  const epsilon = 1e-8;
  const o1 = cross(a, b, c);
  const o2 = cross(a, b, d);
  const o3 = cross(c, d, a);
  const o4 = cross(c, d, b);
  if (((o1 > epsilon && o2 < -epsilon) || (o1 < -epsilon && o2 > epsilon)) &&
      ((o3 > epsilon && o4 < -epsilon) || (o3 < -epsilon && o4 > epsilon))) return true;
  return (Math.abs(o1) <= epsilon && pointSegmentDistance(c, a, b) <= epsilon) ||
    (Math.abs(o2) <= epsilon && pointSegmentDistance(d, a, b) <= epsilon) ||
    (Math.abs(o3) <= epsilon && pointSegmentDistance(a, c, d) <= epsilon) ||
    (Math.abs(o4) <= epsilon && pointSegmentDistance(b, c, d) <= epsilon);
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointSegmentDistance(a, c, d),
    pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b),
    pointSegmentDistance(d, a, b),
  );
}

function createPlacementPolygon(room, placement) {
  const center = { x: placement.x * room.width, y: placement.y * room.height };
  const width = placement.width * room.width;
  const height = placement.height * room.height;
  const cosine = Math.cos(placement.rotation ?? 0);
  const sine = Math.sin(placement.rotation ?? 0);
  return [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ].map(point => ({
    x: center.x + point.x * cosine - point.y * sine,
    y: center.y + point.x * sine + point.y * cosine,
  }));
}

function polygonAxes(polygon) {
  return polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: -dy / length, y: dx / length };
  });
}

function projectPolygon(polygon, axis) {
  const values = polygon.map(point => point.x * axis.x + point.y * axis.y);
  return { min: Math.min(...values), max: Math.max(...values) };
}

function polygonsOverlap(first, second) {
  for (const axis of [...polygonAxes(first), ...polygonAxes(second)]) {
    const a = projectPolygon(first, axis);
    const b = projectPolygon(second, axis);
    if (a.max <= b.min || b.max <= a.min) return false;
  }
  return true;
}

function polygonSegmentDistance(polygon, start, end) {
  if (isPointInPolygon(start, polygon) || isPointInPolygon(end, polygon)) return 0;
  let result = Infinity;
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    result = Math.min(result, segmentDistance(start, end, a, b));
  }
  return result;
}

function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function validatePlacementShape(placement, index) {
  if (!placement || typeof placement !== "object" || Array.isArray(placement)) {
    throw new TypeError(`Room layout placement ${index} must be an object.`);
  }
  if (typeof placement.id !== "string" || !placement.id.trim()) {
    throw new TypeError(`Room layout placement ${index} requires a non-empty id.`);
  }
  if (typeof placement.definitionId !== "string" || !placement.definitionId.trim()) {
    throw new TypeError(`Room layout placement "${placement.id}" requires a definitionId.`);
  }
  for (const key of ["x", "y", "width", "height"]) {
    if (!Number.isFinite(placement[key])) {
      throw new TypeError(`Room layout placement "${placement.id}" ${key} must be finite.`);
    }
  }
  if (placement.x < 0 || placement.x > 1 || placement.y < 0 || placement.y > 1 ||
      placement.width <= 0 || placement.width > 1 || placement.height <= 0 || placement.height > 1) {
    throw new RangeError(`Room layout placement "${placement.id}" must fit normalized room bounds.`);
  }
  if (placement.rotation !== undefined && !Number.isFinite(placement.rotation)) {
    throw new TypeError(`Room layout placement "${placement.id}" rotation must be finite.`);
  }
}

/**
 * Validates normalized, room-local content placements before a layout is saved.
 * Placements are rectangles for now; future object definitions can supply more
 * specialized footprints while keeping this validation entry point stable.
 */
export function validateRoomLayout(room, placements, options = {}) {
  if (!room || !Number.isFinite(room.width) || !Number.isFinite(room.height)) {
    throw new TypeError("validateRoomLayout requires a room with numeric dimensions.");
  }
  if (!Array.isArray(placements)) {
    throw new TypeError("Room layout placements must be an array.");
  }

  const settings = {
    wallClearance: options.wallClearance ?? 28,
    pathClearance: options.pathClearance ?? 48,
    objectClearance: options.objectClearance ?? 16,
    preserveCenter: options.preserveCenter ?? true,
  };
  for (const [key, value] of Object.entries(settings)) {
    if (key === "preserveCenter") continue;
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(`Room layout validation option ${key} must be non-negative.`);
    }
  }

  const errors = [];
  const warnings = [];
  const ids = new Set();
  const outline = getRoomOutlinePoints(room);
  const center = { x: room.width / 2, y: room.height / 2 };
  const resolved = [];

  placements.forEach((placement, index) => {
    validatePlacementShape(placement, index);
    if (ids.has(placement.id)) {
      errors.push({ code: "duplicate-placement-id", placementId: placement.id,
        message: `Placement id "${placement.id}" occurs more than once.` });
    }
    ids.add(placement.id);
    const polygon = createPlacementPolygon(room, placement);
    const invalidCorners = polygon.filter(point => !isPointInsideRoom(
      room, point.x, point.y, settings.wallClearance
    ));
    if (invalidCorners.length) {
      errors.push({ code: "outside-room-outline", placementId: placement.id,
        message: `Placement "${placement.id}" does not fit inside the room boundary.` });
    }
    if (settings.preserveCenter && isPointInPolygon(center, polygon)) {
      errors.push({ code: "blocks-center", placementId: placement.id,
        message: `Placement "${placement.id}" occupies the central room area.` });
    }

    for (const port of room.ports ?? []) {
      const frame = resolveRoomPortFrame(room, port);
      const approachDistance = polygonSegmentDistance(polygon, frame.anchor, center);
      const halfDiagonal = Math.hypot(
        placement.width * room.width,
        placement.height * room.height,
      ) / 2;
      if (approachDistance < settings.pathClearance) {
        errors.push({ code: "blocks-entrance-approach", placementId: placement.id,
          portId: port.id,
          message: `Placement "${placement.id}" obstructs the approach from entrance "${port.id}".` });
      } else if (distance(frame.anchor, center) < halfDiagonal + settings.pathClearance) {
        errors.push({ code: "too-close-to-entrance", placementId: placement.id,
          portId: port.id,
          message: `Placement "${placement.id}" is too close to entrance "${port.id}".` });
      }
    }

    resolved.push({ placement, polygon });
  });

  for (let first = 0; first < resolved.length; first++) {
    for (let second = first + 1; second < resolved.length; second++) {
      const a = resolved[first];
      const b = resolved[second];
      if (polygonsOverlap(a.polygon, b.polygon)) {
        errors.push({ code: "overlapping-placements",
          placementIds: [a.placement.id, b.placement.id],
          message: `Placements "${a.placement.id}" and "${b.placement.id}" overlap.` });
        continue;
      }
      if (settings.objectClearance > 0) {
        let gap = Infinity;
        for (let index = 0; index < a.polygon.length; index++) {
          const a1 = a.polygon[index];
          const a2 = a.polygon[(index + 1) % a.polygon.length];
          for (let other = 0; other < b.polygon.length; other++) {
            gap = Math.min(gap, segmentDistance(
              a1, a2, b.polygon[other], b.polygon[(other + 1) % b.polygon.length]
            ));
          }
        }
        if (gap < settings.objectClearance) {
          warnings.push({ code: "tight-object-spacing",
            placementIds: [a.placement.id, b.placement.id],
            message: `Placements "${a.placement.id}" and "${b.placement.id}" are closer than the preferred clearance.` });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertValidRoomLayout(room, placements, options = {}) {
  const report = validateRoomLayout(room, placements, options);
  if (!report.valid) {
    const details = report.errors.map(issue => issue.message).join(" ");
    throw new Error(`Invalid room layout for room "${room.id}": ${details}`);
  }
  return report;
}
