const EPSILON = 1e-8;

function rotatePointToLocal(point, center, rotation) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: dx * cos + dy * sin,
    y: -dx * sin + dy * cos,
  };
}

function distancePointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= EPSILON) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, (
    (point.x - start.x) * dx + (point.y - start.y) * dy
  ) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function segmentIntersectsAabb(start, end, halfWidth, halfHeight) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let tMin = 0;
  let tMax = 1;

  const axes = [
    [start.x, dx, -halfWidth, halfWidth],
    [start.y, dy, -halfHeight, halfHeight],
  ];

  for (const [origin, direction, min, max] of axes) {
    if (Math.abs(direction) <= EPSILON) {
      if (origin < min || origin > max) return false;
      continue;
    }
    let t1 = (min - origin) / direction;
    let t2 = (max - origin) / direction;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return tMax >= 0 && tMin <= 1;
}

function getObjectGeometry(instance) {
  const placement = instance?.placement;
  const definition = instance?.definition;
  if (!placement || !definition) return null;
  return {
    center: { x: placement.x, y: placement.y },
    width: placement.width,
    height: placement.height,
    rotation: Number.isFinite(placement.rotation) ? placement.rotation : 0,
    shape: definition.collision?.shape ?? "rectangle",
  };
}

export function segmentIntersectsEnvironmentalObject(start, end, instance) {
  const geometry = getObjectGeometry(instance);
  if (!geometry || !start || !end) return false;
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return false;

  if (geometry.shape === "circle") {
    const radius = Math.min(geometry.width, geometry.height) / 2;
    return distancePointToSegment(geometry.center, start, end) <= radius;
  }

  const localStart = rotatePointToLocal(start, geometry.center, geometry.rotation);
  const localEnd = rotatePointToLocal(end, geometry.center, geometry.rotation);
  return segmentIntersectsAabb(localStart, localEnd, geometry.width / 2, geometry.height / 2);
}

export function pointOverlapsEnvironmentalObject(point, padding, instance) {
  const geometry = getObjectGeometry(instance);
  if (!geometry || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const safePadding = Math.max(0, Number.isFinite(padding) ? padding : 0);

  if (geometry.shape === "circle") {
    const radius = Math.min(geometry.width, geometry.height) / 2 + safePadding;
    return Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) < radius;
  }

  const local = rotatePointToLocal(point, geometry.center, geometry.rotation);
  return Math.abs(local.x) < geometry.width / 2 + safePadding &&
    Math.abs(local.y) < geometry.height / 2 + safePadding;
}

/** Project an oriented object's half-extents onto a direction vector. */
export function getEnvironmentalObjectSupportRadius(instance, directionX, directionY) {
  const geometry = getObjectGeometry(instance);
  if (!geometry) return 0;
  const length = Math.hypot(directionX, directionY);
  if (length <= EPSILON) return 0;
  const dx = directionX / length;
  const dy = directionY / length;

  if (geometry.shape === "circle") {
    return Math.min(geometry.width, geometry.height) / 2;
  }

  const axisX = { x: Math.cos(geometry.rotation), y: Math.sin(geometry.rotation) };
  const axisY = { x: -Math.sin(geometry.rotation), y: Math.cos(geometry.rotation) };
  return Math.abs(dx * axisX.x + dy * axisX.y) * geometry.width / 2 +
    Math.abs(dx * axisY.x + dy * axisY.y) * geometry.height / 2;
}
