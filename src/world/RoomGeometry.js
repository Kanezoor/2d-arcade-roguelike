const TAU = Math.PI * 2;

function pointOnSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(0, Math.min(1, (
    (point.x - start.x) * dx + (point.y - start.y) * dy
  ) / lengthSquared));
  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

export function getRoomOutlinePoints(room, circleSegments = 64) {
  if (!room || !Number.isFinite(room.width) || !Number.isFinite(room.height)) {
    throw new TypeError("getRoomOutlinePoints requires room dimensions.");
  }

  if (Array.isArray(room.outlinePoints) && room.outlinePoints.length >= 3) {
    return room.outlinePoints.map(point => ({ x: point.x, y: point.y }));
  }

  if (room.shape === "diamond") {
    return [
      { x: room.width / 2, y: 0 },
      { x: room.width, y: room.height / 2 },
      { x: room.width / 2, y: room.height },
      { x: 0, y: room.height / 2 },
    ];
  }

  if (room.shape === "circle") {
    const radius = Math.min(room.width, room.height) / 2;
    const centerX = room.width / 2;
    const centerY = room.height / 2;

    return Array.from({ length: circleSegments }, (_, index) => {
      const angle = (TAU * index) / circleSegments;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  }

  return [
    { x: 0, y: 0 },
    { x: room.width, y: 0 },
    { x: room.width, y: room.height },
    { x: 0, y: room.height },
  ];
}

function isPointInPolygon(point, polygon) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    const crosses = (
      (a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    );

    if (crosses) inside = !inside;
  }

  return inside;
}

/** Check whether a room-local point is inside its outline, optionally inset from walls. */
export function isPointInsideRoom(room, x, y, padding = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }

  if (!Number.isFinite(padding) || padding < 0) {
    throw new TypeError("Room point padding must be a non-negative number.");
  }

  const point = { x, y };
  const outline = getRoomOutlinePoints(room);

  if (!isPointInPolygon(point, outline)) {
    return false;
  }

  if (padding === 0) {
    return true;
  }

  for (let index = 0; index < outline.length; index++) {
    const start = outline[index];
    const end = outline[(index + 1) % outline.length];

    if (pointOnSegmentDistance(point, start, end) < padding) {
      return false;
    }
  }

  return true;
}
