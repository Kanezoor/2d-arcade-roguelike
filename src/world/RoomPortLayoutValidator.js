import { getRoomOutlinePoints, isPointInsideRoom } from "./RoomGeometry.js";
import {
  getBoundaryOpeningSegments,
  getGateSegments,
  getVestibuleWallSegments,
  getVestibuleOuterBarrierSegment,
  resolveRoomPortFrame,
} from "./RoomEntranceGeometry.js";

const DEFAULTS = Object.freeze({
  boundaryTolerance: 8,
  openingClearance: 8,
  vestibuleClearance: 12,
  sampleSpacing: 8,
});

function distancePointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function pointOnSegment(point, start, end, tolerance = 1e-7) {
  return distancePointToSegment(point, start, end) <= tolerance;
}

function segmentsIntersect(a, b, c, d, tolerance = 1e-7) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (((o1 > tolerance && o2 < -tolerance) || (o1 < -tolerance && o2 > tolerance)) &&
      ((o3 > tolerance && o4 < -tolerance) || (o3 < -tolerance && o4 > tolerance))) return true;
  return Math.abs(o1) <= tolerance && pointOnSegment(c, a, b, tolerance) ||
    Math.abs(o2) <= tolerance && pointOnSegment(d, a, b, tolerance) ||
    Math.abs(o3) <= tolerance && pointOnSegment(a, c, d, tolerance) ||
    Math.abs(o4) <= tolerance && pointOnSegment(b, c, d, tolerance);
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    distancePointToSegment(a, c, d), distancePointToSegment(b, c, d),
    distancePointToSegment(c, a, b), distancePointToSegment(d, a, b),
  );
}

function segmentOnOutline(segment, outline, tolerance, sampleSpacing) {
  const length = Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
  const steps = Math.max(1, Math.ceil(length / sampleSpacing));
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    const point = {
      x: segment.start.x + (segment.end.x - segment.start.x) * t,
      y: segment.start.y + (segment.end.y - segment.start.y) * t,
    };
    if (!pointOnOutline(point, outline, tolerance)) return false;
  }
  return true;
}

function pointOnOutline(point, outline, tolerance) {
  for (let index = 0; index < outline.length; index++) {
    if (distancePointToSegment(point, outline[index], outline[(index + 1) % outline.length]) <= tolerance) {
      return true;
    }
  }
  return false;
}

function virtualOpening(room, port) {
  const { anchor, tangent } = resolveRoomPortFrame(room, port);
  const half = port.openingWidth / 2;
  return [{
    start: { x: anchor.x - tangent.x * half, y: anchor.y - tangent.y * half },
    end: { x: anchor.x + tangent.x * half, y: anchor.y + tangent.y * half },
  }];
}

function getPortOpeningSegments(room, port) {
  const configured = getBoundaryOpeningSegments(room, port);
  if (configured.length) return configured;
  const gate = getGateSegments(room, port);
  return gate.length ? gate : virtualOpening(room, port);
}

function getObstacleOutline(obstacle) {
  if (Array.isArray(obstacle?.points) && obstacle.points.length >= 3) {
    return obstacle.points;
  }
  if (obstacle && Number.isFinite(obstacle.width) && Number.isFinite(obstacle.height)) {
    return getRoomOutlinePoints(obstacle);
  }
  throw new TypeError("Each obstacle outline must be a room definition or { id, points } polygon.");
}

function segmentTouchesPolygon(segment, polygon, sampleSpacing = DEFAULTS.sampleSpacing) {
  const length = Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
  const steps = Math.max(1, Math.ceil(length / sampleSpacing));
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const point = {
      x: segment.start.x + (segment.end.x - segment.start.x) * t,
      y: segment.start.y + (segment.end.y - segment.start.y) * t,
    };
    // Boundary contact is considered an intersection for an external obstacle.
    if (isPointInPolygon(point, polygon) || pointOnOutline(point, polygon, 0.5)) return true;
  }
  for (let index = 0; index < polygon.length; index++) {
    if (segmentsIntersect(segment.start, segment.end, polygon[index], polygon[(index + 1) % polygon.length])) return true;
  }
  return false;
}

function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}


function polygonsOverlap(first, second) {
  if (first.some(point => isPointInPolygon(point, second)) ||
      second.some(point => isPointInPolygon(point, first))) return true;
  for (let a = 0; a < first.length; a++) {
    const a1 = first[a], a2 = first[(a + 1) % first.length];
    for (let b = 0; b < second.length; b++) {
      const b1 = second[b], b2 = second[(b + 1) % second.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function createVestibuleFootprint(walls) {
  if (walls.length < 2) return null;
  return [walls[0].start, walls[1].start, walls[1].end, walls[0].end]
    .map(point => ({ x: point.x, y: point.y }));
}

function pushIssue(issues, code, message, portIds = []) {
  issues.push({ code, message, portIds });
}

/**
 * Validate a room's port layout without mutating the room.
 * obstacleOutlines must use the same local coordinate system as the room.
 */
export function validateRoomPortLayout(room, options = {}) {
  if (!room || !Number.isFinite(room.width) || !Number.isFinite(room.height)) {
    throw new TypeError("validateRoomPortLayout requires a room with numeric dimensions.");
  }
  const settings = {
    boundaryTolerance: options.boundaryTolerance ?? DEFAULTS.boundaryTolerance,
    openingClearance: options.openingClearance ?? DEFAULTS.openingClearance,
    vestibuleClearance: options.vestibuleClearance ?? DEFAULTS.vestibuleClearance,
    sampleSpacing: options.sampleSpacing ?? DEFAULTS.sampleSpacing,
  };
  for (const [key, value] of Object.entries(settings)) {
    if (!Number.isFinite(value) || value < 0) throw new TypeError(`${key} must be a non-negative number.`);
  }

  const ports = options.ports ?? room.ports ?? [];
  if (!Array.isArray(ports)) throw new TypeError("Room ports must be an array.");
  const outline = getRoomOutlinePoints(room);
  const errors = [];
  const warnings = [];
  const resolved = [];

  for (const port of ports) {
    try {
      const frame = resolveRoomPortFrame(room, port);
      if (!pointOnOutline(frame.anchor, outline, settings.boundaryTolerance)) {
        pushIssue(errors, "port-anchor-off-boundary",
          `Port "${port.id}" anchor is not on the room boundary.`, [port.id]);
      }

      const openings = getPortOpeningSegments(room, frame.port);
      const openingPoints = openings.flatMap(segment => [segment.start, segment.end]);
      const distinctOpeningPoints = openingPoints.filter((point, index) => (
        openingPoints.findIndex(other => Math.hypot(other.x - point.x, other.y - point.y) < 1e-6) === index
      ));
      // A circular template is polygonal. A straight threshold spanning a
      // curved boundary naturally deviates from the chord endpoints by its
      // sagitta, so account for that approximation without weakening other shapes.
      const circleRadius = Math.min(room.width, room.height) / 2;
      const curvatureAllowance = (room.templateId ?? room.shape) === "circle"
        ? (frame.port.openingWidth ** 2) / Math.max(8 * circleRadius, 1) + 2
        : 0;
      const fitTolerance = settings.boundaryTolerance + curvatureAllowance;
      const offBoundary = distinctOpeningPoints.filter(point => (
        !pointOnOutline(point, outline, fitTolerance)
      ));
      const openingCutsAcrossRoom = openings.some(segment => (
        !segmentOnOutline(segment, outline, fitTolerance, settings.sampleSpacing)
      ));
      if (offBoundary.length || openingCutsAcrossRoom) {
        pushIssue(errors, "opening-does-not-fit-boundary",
          `Port "${port.id}" opening extends beyond or away from its room boundary.`, [port.id]);
      }

      const openingLength = openings.reduce((sum, segment) => sum + Math.hypot(
        segment.end.x - segment.start.x, segment.end.y - segment.start.y,
      ), 0);
      if (openingLength + settings.boundaryTolerance < frame.port.openingWidth) {
        pushIssue(errors, "opening-too-short",
          `Port "${port.id}" boundary opening is shorter than its configured openingWidth.`, [port.id]);
      }

      const vestibuleWalls = getVestibuleWallSegments(room, frame.port);
      const outerBarrier = getVestibuleOuterBarrierSegment(room, frame.port);
      const vestibuleSegments = [...vestibuleWalls, ...(outerBarrier ? [outerBarrier] : [])];

      if (frame.port.mode === "vestibule") {
        if (vestibuleWalls.length < 2 || !outerBarrier) {
          pushIssue(errors, "vestibule-incomplete",
            `Vestibule for port "${port.id}" must have two side walls and an outer barrier.`, [port.id]);
        }

        for (let index = 0; index < vestibuleWalls.length; index++) {
          const wall = vestibuleWalls[index];
          const boundaryEnds = [wall.start, wall.end].filter(point => (
            pointOnOutline(point, outline, settings.boundaryTolerance)
          ));
          if (boundaryEnds.length !== 1) {
            pushIssue(errors, "vestibule-wall-not-attached",
              `Vestibule wall ${index + 1} for port "${port.id}" must meet the room outline at exactly one endpoint.`, [port.id]);
            continue;
          }
          const boundaryEnd = boundaryEnds[0];
          const outsideEnd = boundaryEnd === wall.start ? wall.end : wall.start;
          const steps = Math.max(2, Math.ceil(Math.hypot(
            outsideEnd.x - boundaryEnd.x, outsideEnd.y - boundaryEnd.y,
          ) / settings.sampleSpacing));
          let entersRoom = false;
          for (let step = 1; step < steps; step++) {
            const t = step / steps;
            const point = {
              x: boundaryEnd.x + (outsideEnd.x - boundaryEnd.x) * t,
              y: boundaryEnd.y + (outsideEnd.y - boundaryEnd.y) * t,
            };
            if (isPointInsideRoom(room, point.x, point.y)) {
              entersRoom = true;
              break;
            }
          }
          if (entersRoom) {
            pushIssue(errors, "vestibule-wall-enters-room",
              `Vestibule wall ${index + 1} for port "${port.id}" crosses the room interior.`, [port.id]);
          }
        }

        if (outerBarrier) {
          const length = Math.hypot(
            outerBarrier.end.x - outerBarrier.start.x,
            outerBarrier.end.y - outerBarrier.start.y,
          );
          const steps = Math.max(2, Math.ceil(length / settings.sampleSpacing));
          for (let step = 1; step < steps; step++) {
            const t = step / steps;
            const point = {
              x: outerBarrier.start.x + (outerBarrier.end.x - outerBarrier.start.x) * t,
              y: outerBarrier.start.y + (outerBarrier.end.y - outerBarrier.start.y) * t,
            };
            if (isPointInsideRoom(room, point.x, point.y)) {
              pushIssue(errors, "vestibule-outer-barrier-enters-room",
                `Outer vestibule barrier for port "${port.id}" crosses the room interior.`, [port.id]);
              break;
            }
          }
        }
      }

      resolved.push({ port: frame.port, openings, vestibuleSegments, vestibulePolygon: createVestibuleFootprint(vestibuleWalls) });
    } catch (error) {
      pushIssue(errors, "port-geometry-invalid",
        `Port "${port?.id ?? "<unknown>"}" could not be resolved: ${error.message}`, [port?.id].filter(Boolean));
    }
  }

  // Entrances on one room may not consume overlapping boundary space.
  for (let first = 0; first < resolved.length; first++) {
    for (let second = first + 1; second < resolved.length; second++) {
      const a = resolved[first], b = resolved[second];
      let conflict = false;
      for (const segmentA of a.openings) {
        for (const segmentB of b.openings) {
          if (segmentDistance(segmentA.start, segmentA.end, segmentB.start, segmentB.end) < settings.openingClearance) {
            conflict = true;
            break;
          }
        }
        if (conflict) break;
      }
      if (conflict) {
        pushIssue(errors, "room-entrances-overlap",
          `Ports "${a.port.id}" and "${b.port.id}" have overlapping or insufficiently separated openings.`,
          [a.port.id, b.port.id]);
      }

      let vestibuleConflict = false;
      for (const segmentA of a.vestibuleSegments) {
        for (const segmentB of b.vestibuleSegments) {
          if (segmentDistance(segmentA.start, segmentA.end, segmentB.start, segmentB.end) < settings.vestibuleClearance) {
            vestibuleConflict = true;
            break;
          }
        }
        if (vestibuleConflict) break;
      }
      if (!vestibuleConflict && a.vestibulePolygon && b.vestibulePolygon) {
        vestibuleConflict = polygonsOverlap(a.vestibulePolygon, b.vestibulePolygon);
      }
      if (vestibuleConflict) {
        pushIssue(errors, "vestibules-intersect",
          `Vestibules for ports "${a.port.id}" and "${b.port.id}" intersect or violate the clearance distance.`,
          [a.port.id, b.port.id]);
      }
    }
  }

  const obstacles = options.obstacleOutlines ?? [];
  if (!Array.isArray(obstacles)) throw new TypeError("obstacleOutlines must be an array.");
  for (const obstacle of obstacles) {
    const polygon = getObstacleOutline(obstacle);
    const obstacleId = obstacle.id ?? "external-obstacle";
    for (const item of resolved) {
      const footprintHit = item.vestibulePolygon && polygonsOverlap(item.vestibulePolygon, polygon);
      const wallHit = item.vestibuleSegments.some(segment => (
        segmentTouchesPolygon(segment, polygon, settings.sampleSpacing)
      ));
      if (footprintHit || wallHit) {
        pushIssue(errors, "vestibule-intersects-obstacle",
          `Vestibule for port "${item.port.id}" intersects obstacle "${obstacleId}".`,
          [item.port.id, obstacleId]);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    portsChecked: ports.length,
  };
}

export class RoomPortLayoutError extends Error {
  constructor(report) {
    super(`Room port layout is invalid: ${report.errors.map(issue => issue.code).join(", ")}.`);
    this.name = "RoomPortLayoutError";
    this.report = report;
  }
}

export function assertValidRoomPortLayout(room, options = {}) {
  const report = validateRoomPortLayout(room, options);
  if (!report.valid) throw new RoomPortLayoutError(report);
  return report;
}
