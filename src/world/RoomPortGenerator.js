import RoomPort from "./RoomPort.js";
import { getRoomTemplate } from "./RoomTemplateRegistry.js";
import { getRoomOutlinePoints } from "./RoomGeometry.js";
import { deriveRoomPortAnchor } from "./RoomEntranceGeometry.js";

const CARDINAL_NORMALS = Object.freeze({
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
});

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointToward(origin, target, amount) {
  const length = distance(origin, target);
  if (length <= 1e-9) throw new Error("Cannot construct an entrance on a zero-length room edge.");
  const t = Math.min(1, amount / length);
  return {
    x: origin.x + (target.x - origin.x) * t,
    y: origin.y + (target.y - origin.y) * t,
  };
}

function addScaled(point, vector, amount) {
  return { x: point.x + vector.x * amount, y: point.y + vector.y * amount };
}

function createBoundaryPort(room, spec, options) {
  return new RoomPort({
    ...spec,
    mode: "direct",
    openingWidth: options.openingWidth,
    triggerDepth: options.triggerDepth,
    triggerInset: options.triggerInset,
  });
}

function createCornerVestibulePort(room, spec, options) {
  const derived = deriveRoomPortAnchor(room, spec.direction);
  const outline = getRoomOutlinePoints(room);
  let vertexIndex = -1;
  let nearestDistance = Infinity;

  for (let index = 0; index < outline.length; index++) {
    const currentDistance = distance(derived.anchor, outline[index]);
    if (currentDistance < nearestDistance) {
      nearestDistance = currentDistance;
      vertexIndex = index;
    }
  }

  if (nearestDistance > 1e-4) {
    throw new Error(
      `Template "${room.templateId ?? room.shape}" uses corner-vestibule ports, but its ${spec.direction} anchor is not a room vertex.`
    );
  }

  const anchor = outline[vertexIndex];
  const previous = outline[(vertexIndex - 1 + outline.length) % outline.length];
  const next = outline[(vertexIndex + 1) % outline.length];
  const requestedHalfWidth = options.openingWidth / 2;
  const halfWidth = Math.min(
    requestedHalfWidth,
    distance(anchor, previous) * 0.3,
    distance(anchor, next) * 0.3,
  );

  if (halfWidth < 8) {
    throw new Error(`Room "${room.id}" has insufficient edge length for a diamond corner entrance.`);
  }

  const firstBoundaryPoint = pointToward(anchor, previous, halfWidth);
  const secondBoundaryPoint = pointToward(anchor, next, halfWidth);
  const normal = CARDINAL_NORMALS[spec.direction];
  const firstOuterPoint = addScaled(firstBoundaryPoint, normal, options.vestibuleLength);
  const secondOuterPoint = addScaled(secondBoundaryPoint, normal, options.vestibuleLength);
  const wallSegments = [
    { start: firstBoundaryPoint, end: firstOuterPoint },
    { start: secondBoundaryPoint, end: secondOuterPoint },
  ];
  const boundaryOpening = {
    type: "polyline",
    points: [firstBoundaryPoint, anchor, secondBoundaryPoint],
  };
  const openingWidth = distance(firstBoundaryPoint, anchor) + distance(anchor, secondBoundaryPoint);
  const vestibuleWidth = distance(firstOuterPoint, secondOuterPoint);

  return new RoomPort({
    ...spec,
    mode: "vestibule",
    anchor,
    outwardNormal: normal,
    openingWidth,
    triggerDepth: options.triggerDepth,
    triggerInset: options.triggerInset,
    vestibule: {
      width: vestibuleWidth,
      length: options.vestibuleLength,
      wallThickness: options.wallThickness,
      wallColor: options.wallColor,
      outerTriggerInset: options.outerTriggerInset,
      wallSegments,
    },
    gate: {
      id: `${spec.id}-gate`,
      geometry: boundaryOpening,
      initiallyOpen: false,
      closeOnEntry: true,
      openWhenRoomCleared: true,
      thickness: options.gateThickness,
      color: options.gateColor,
      openAlpha: options.gateOpenAlpha,
    },
    boundaryOpening,
  });
}

const DEFAULT_OPTIONS = Object.freeze({
  openingWidth: 140,
  triggerDepth: 32,
  triggerInset: 48,
  vestibuleLength: 96,
  wallThickness: 20,
  wallColor: 0x444444,
  outerTriggerInset: 24,
  gateThickness: 18,
  gateColor: 0xf0c34e,
  gateOpenAlpha: 0.2,
});

/**
 * Create a RoomPort using the entrance strategy declared by the room's template.
 * The returned port is serializable and contains no Phaser or Matter objects.
 */
export function createTemplateAwareRoomPort(room, spec, overrides = {}) {
  if (!room || !Number.isFinite(room.width) || !Number.isFinite(room.height)) {
    throw new TypeError("createTemplateAwareRoomPort requires a room with dimensions.");
  }
  if (!spec || typeof spec.id !== "string" || !spec.id.trim()) {
    throw new TypeError("A generated room port requires a non-empty id.");
  }
  const template = getRoomTemplate(room.templateId ?? room.shape ?? "rectangle");
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  for (const [key, value] of Object.entries(options)) {
    if (!Number.isFinite(value) || value < 0 || (key !== "triggerInset" && key !== "gateOpenAlpha" && value === 0)) {
      throw new TypeError(`Room port generation option "${key}" must be a valid non-negative number.`);
    }
  }
  if (options.gateOpenAlpha > 1) throw new RangeError("gateOpenAlpha must be between 0 and 1.");

  switch (template.portStrategy) {
    case "boundary":
      return createBoundaryPort(room, spec, options);
    case "corner-vestibule":
      return createCornerVestibulePort(room, spec, options);
    default:
      throw new Error(`Unknown port strategy "${template.portStrategy}" on template "${template.id}".`);
  }
}

export function getDefaultRoomPortGenerationOptions() {
  return { ...DEFAULT_OPTIONS };
}
