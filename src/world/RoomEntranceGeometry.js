import RoomPort from "./RoomPort.js";

const DIRECTION_NORMALS = Object.freeze({
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
});

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    throw new TypeError("A room port normal cannot be a zero vector.");
  }

  return { x: vector.x / length, y: vector.y / length };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(vector, amount) {
  return { x: vector.x * amount, y: vector.y * amount };
}

function toSegments(geometry) {
  if (!geometry) return [];

  if (geometry.type === "line") {
    return [{ start: { ...geometry.start }, end: { ...geometry.end } }];
  }

  if (geometry.type === "segments") {
    return geometry.segments.map(segment => ({
      start: { ...segment.start },
      end: { ...segment.end },
    }));
  }

  if (geometry.type === "polyline") {
    return geometry.points.slice(1).map((point, index) => ({
      start: { ...geometry.points[index] },
      end: { ...point },
    }));
  }

  if (geometry.type === "arc") {
    const segments = [];
    const step = (geometry.endAngle - geometry.startAngle) / geometry.segmentCount;

    for (let index = 0; index < geometry.segmentCount; index++) {
      const angleA = geometry.startAngle + step * index;
      const angleB = geometry.startAngle + step * (index + 1);

      segments.push({
        start: {
          x: geometry.center.x + Math.cos(angleA) * geometry.radius,
          y: geometry.center.y + Math.sin(angleA) * geometry.radius,
        },
        end: {
          x: geometry.center.x + Math.cos(angleB) * geometry.radius,
          y: geometry.center.y + Math.sin(angleB) * geometry.radius,
        },
      });
    }

    return segments;
  }

  throw new TypeError(`Unsupported entrance geometry type "${geometry.type}".`);
}

export function resolveRoomPortFrame(room, inputPort) {
  if (!room || !Number.isFinite(room.width) || !Number.isFinite(room.height)) {
    throw new TypeError("resolveRoomPortFrame requires a room with numeric width and height.");
  }

  const port = inputPort instanceof RoomPort ? inputPort : new RoomPort(inputPort);
  const directionNormal = DIRECTION_NORMALS[port.direction];

  const anchor = port.anchor ?? {
    north: { x: room.width / 2, y: 0 },
    east: { x: room.width, y: room.height / 2 },
    south: { x: room.width / 2, y: room.height },
    west: { x: 0, y: room.height / 2 },
  }[port.direction];

  const normal = normalize(port.outwardNormal ?? directionNormal);
  const tangent = { x: -normal.y, y: normal.x };

  return {
    port,
    anchor: { ...anchor },
    normal,
    tangent,
  };
}

export function getGateSegments(room, inputPort) {
  const { port, anchor, tangent } = resolveRoomPortFrame(room, inputPort);

  if (!port.gate) return [];

  if (port.gate.geometry) {
    return toSegments(port.gate.geometry);
  }

  const halfWidth = port.openingWidth / 2;

  return [{
    start: add(anchor, scale(tangent, -halfWidth)),
    end: add(anchor, scale(tangent, halfWidth)),
  }];
}

export function getBoundaryOpeningSegments(room, inputPort) {
  const { port } = resolveRoomPortFrame(room, inputPort);

  if (port.boundaryOpening) {
    return toSegments(port.boundaryOpening);
  }

  if (port.mode === "vestibule" && port.gate) {
    return getGateSegments(room, port);
  }

  return [];
}

export function getVestibuleWallSegments(room, inputPort) {
  const { port, anchor, normal, tangent } = resolveRoomPortFrame(room, inputPort);

  if (port.mode !== "vestibule" || !port.vestibule) {
    return [];
  }

  if (port.vestibule.wallSegments) {
    return port.vestibule.wallSegments.map(segment => ({
      start: { ...segment.start },
      end: { ...segment.end },
    }));
  }

  const halfWidth = port.vestibule.width / 2;
  const outwardOffset = scale(normal, port.vestibule.length);
  const sideOffset = scale(tangent, halfWidth);
  const innerA = add(anchor, scale(sideOffset, -1));
  const innerB = add(anchor, sideOffset);
  const outerA = add(innerA, outwardOffset);
  const outerB = add(innerB, outwardOffset);

  return [
    { start: innerA, end: outerA },
    { start: innerB, end: outerB },
  ];
}

export function getExitTriggerGeometry(room, inputPort) {
  const { port, anchor, normal, tangent } = resolveRoomPortFrame(room, inputPort);

  let center;
  let width = port.openingWidth;

  if (port.mode === "vestibule") {
    const vestibule = port.vestibule;
    center = add(
      anchor,
      scale(normal, vestibule.length - vestibule.outerTriggerInset)
    );
    width = vestibule.width;
  } else {
    center = add(anchor, scale(normal, -port.triggerInset));
  }

  return {
    x: center.x,
    y: center.y,
    width,
    height: port.triggerDepth,
    rotation: Math.atan2(tangent.y, tangent.x),
  };
}

export function getRoomEntrySpawnPosition(room, inputPort) {
  const { port, anchor, normal } = resolveRoomPortFrame(room, inputPort);

  if (port.mode !== "vestibule") {
    throw new TypeError("getRoomEntrySpawnPosition is intended for vestibule ports.");
  }

  const trigger = getExitTriggerGeometry(room, port);
  const inwardOffset = port.triggerDepth / 2 + 24;

  return {
    x: trigger.x - normal.x * inwardOffset,
    y: trigger.y - normal.y * inwardOffset,
  };
}

/** Resolve all local geometry needed to build one entrance in a Phaser scene. */
export function buildRoomEntranceGeometry(room, inputPort) {
  const { port } = resolveRoomPortFrame(room, inputPort);
  const vestibuleWalls = getVestibuleWallSegments(room, port);
  const gateSegments = getGateSegments(room, port);
  const boundaryOpeningSegments = getBoundaryOpeningSegments(room, port);
  const exitTrigger = getExitTriggerGeometry(room, port);

  return {
    port,
    vestibuleWalls,
    gateSegments,
    boundaryOpeningSegments,
    exitTrigger,
    entrySensor: port.gate?.closeOnEntry
      ? (() => {
          const frame = resolveRoomPortFrame(room, port);
          const position = add(
            frame.anchor,
            scale(frame.normal, -Math.max(36, port.triggerDepth))
          );
          return {
            x: position.x,
            y: position.y,
            width: port.openingWidth,
            height: port.triggerDepth,
            rotation: Math.atan2(frame.tangent.y, frame.tangent.x),
          };
        })()
      : null,
    entrySpawn: port.mode === "vestibule"
      ? getRoomEntrySpawnPosition(room, port)
      : null,
  };
}

/** Utility for splitting a straight rectangular room edge around vestibule openings. */
export function getRectangularEdgeOpenings(room, ports, direction) {
  const horizontal = direction === "north" || direction === "south";
  const result = [];

  for (const inputPort of ports ?? []) {
    const { port, anchor, normal } = resolveRoomPortFrame(room, inputPort);

    const hasPhysicalOpening = port.mode === "vestibule" || Boolean(port.boundaryOpening);
    if (!hasPhysicalOpening || port.direction !== direction) {
      continue;
    }

    // A rectangular edge can only consume a port whose outward normal is cardinal
    // and aligned with the edge being split. Custom curved/angled edges are handled
    // by the shape-specific boundary builder in the geometry checkpoint.
    const expectedNormal = DIRECTION_NORMALS[direction];
    if (
      Math.abs(normal.x - expectedNormal.x) > 1e-4 ||
      Math.abs(normal.y - expectedNormal.y) > 1e-4
    ) {
      continue;
    }

    const center = horizontal ? anchor.x : anchor.y;
    const halfWidth = port.openingWidth / 2;
    const max = horizontal ? room.width : room.height;

    result.push({
      start: Math.max(0, center - halfWidth),
      end: Math.min(max, center + halfWidth),
    });
  }

  return result.sort((a, b) => a.start - b.start);
}

export function getArcOpeningAngles(inputPort) {
  const port = inputPort instanceof RoomPort ? inputPort : new RoomPort(inputPort);
  const geometry = port.boundaryOpening ?? port.gate?.geometry;

  if (geometry?.type !== "arc") return null;

  return {
    startAngle: geometry.startAngle,
    endAngle: geometry.endAngle,
  };
}
