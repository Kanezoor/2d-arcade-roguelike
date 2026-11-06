const CARDINALS = Object.freeze({
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
});

function addScaled(point, vector, amount) {
  return {
    x: point.x + vector.x * amount,
    y: point.y + vector.y * amount,
  };
}

function distanceAlongNormal(point, anchor, normal) {
  return (anchor.x - point.x) * normal.x +
    (anchor.y - point.y) * normal.y;
}

function getDiamondEntrance(room, direction, halfOpeningWidth) {
  const centerX = room.width / 2;
  const centerY = room.height / 2;
  const marginX = room.width * 0.1;
  const marginY = room.height * 0.1;
  const radiusX = centerX - marginX;
  const radiusY = centerY - marginY;

  const vertices = {
    north: { x: centerX, y: marginY },
    east: { x: room.width - marginX, y: centerY },
    south: { x: centerX, y: room.height - marginY },
    west: { x: marginX, y: centerY },
  };

  const anchor = vertices[direction];
  const normal = CARDINALS[direction];
  let firstPoint;
  let lastPoint;

  if (direction === "east" || direction === "west") {
    const horizontalOffset = (radiusX / radiusY) * halfOpeningWidth;
    const inwardX = direction === "east"
      ? anchor.x - horizontalOffset
      : anchor.x + horizontalOffset;

    firstPoint = { x: inwardX, y: centerY - halfOpeningWidth };
    lastPoint = { x: inwardX, y: centerY + halfOpeningWidth };
  } else {
    const verticalOffset = (radiusY / radiusX) * halfOpeningWidth;
    const inwardY = direction === "north"
      ? anchor.y + verticalOffset
      : anchor.y - verticalOffset;

    firstPoint = { x: centerX - halfOpeningWidth, y: inwardY };
    lastPoint = { x: centerX + halfOpeningWidth, y: inwardY };
  }

  return {
    anchor,
    normal,
    points: [firstPoint, anchor, lastPoint],
  };
}

/**
 * Configures one non-start, non-boss leaf room as a temporary playable
 * diamond/vestibule prototype. It changes only serializable floor data.
 */
export function configureDiamondVestibulePrototype(
  floor,
  {
    openingWidth = 140,
    vestibuleLength = 80,
    roomInsetRatio = 0.1,
    gateThickness = 18,
    wallThickness = 20,
  } = {}
) {
  if (!floor?.rooms || typeof floor.getExits !== "function" ||
      typeof floor.setRoomPort !== "function") {
    throw new TypeError("configureDiamondVestibulePrototype requires a FloorModel.");
  }

  for (const [value, label] of [
    [openingWidth, "openingWidth"],
    [vestibuleLength, "vestibuleLength"],
    [gateThickness, "gateThickness"],
    [wallThickness, "wallThickness"],
  ]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new TypeError(`${label} must be a positive number.`);
    }
  }

  if (!Number.isFinite(roomInsetRatio) || roomInsetRatio <= 0 || roomInsetRatio >= 0.5) {
    throw new RangeError("roomInsetRatio must be between 0 and 0.5.");
  }

  const candidates = [...floor.rooms.values()]
    .filter(room => !room.isStartRoom && !room.isBossRoom)
    .map(room => ({ room, exits: floor.getExits(room.id, { includeLocked: true }) }))
    .filter(candidate => candidate.exits.length === 1)
    .sort((a, b) => a.room.id.localeCompare(b.room.id));

  if (candidates.length === 0) {
    return null;
  }

  const selected = candidates.find(candidate => candidate.room.type === "combat")
    ?? candidates[0];
  const { room, exits } = selected;
  const exit = exits[0];

  if (Math.abs(room.width - room.height) > 1e-6) {
    throw new Error(
      `Diamond prototype requires a square room; "${room.id}" is ${room.width}x${room.height}.`
    );
  }

  const centerX = room.width / 2;
  const centerY = room.height / 2;
  const marginX = room.width * roomInsetRatio;
  const marginY = room.height * roomInsetRatio;
  const radiusX = centerX - marginX;
  const radiusY = centerY - marginY;
  const maxHalfOpening = Math.min(radiusX, radiusY) * 0.25;
  const halfOpeningWidth = Math.min(openingWidth / 2, maxHalfOpening);
  const actualOpeningWidth = halfOpeningWidth * 2;

  const outlinePoints = [
    { x: centerX, y: marginY },
    { x: room.width - marginX, y: centerY },
    { x: centerX, y: room.height - marginY },
    { x: marginX, y: centerY },
  ];

  const entrance = getDiamondEntrance(room, exit.direction, halfOpeningWidth);
  const gateGeometry = {
    type: "polyline",
    points: entrance.points,
  };

  const vestibuleWallEndPoints = [entrance.points[0], entrance.points[2]].map(
    boundaryPoint => {
      const distanceToAnchor = distanceAlongNormal(
        boundaryPoint,
        entrance.anchor,
        entrance.normal
      );

      return addScaled(
        boundaryPoint,
        entrance.normal,
        distanceToAnchor + vestibuleLength
      );
    }
  );

  const existingPort = floor.getPortForExit(room.id, exit);
  if (!existingPort) {
    throw new Error(`Could not find the port for prototype connection "${exit.connectionId}".`);
  }

  room.type = "combat";
  room.shape = "diamond";
  room.outlinePoints = outlinePoints;

  floor.setRoomPort(room.id, {
    id: existingPort.id,
    connectionId: exit.connectionId,
    direction: exit.direction,
    mode: "vestibule",
    anchor: entrance.anchor,
    outwardNormal: entrance.normal,
    openingWidth: actualOpeningWidth,
    triggerDepth: 32,
    vestibule: {
      length: vestibuleLength,
      width: actualOpeningWidth,
      wallThickness,
      wallColor: 0x444444,
      outerTriggerInset: 24,
      wallSegments: [
        {
          start: entrance.points[0],
          end: vestibuleWallEndPoints[0],
        },
        {
          start: entrance.points[2],
          end: vestibuleWallEndPoints[1],
        },
      ],
    },
    gate: {
      id: `${room.id}-diamond-threshold`,
      geometry: gateGeometry,
      initiallyOpen: false,
      closeOnEntry: true,
      openWhenRoomCleared: true,
      thickness: gateThickness,
      color: 0xf0c34e,
      openAlpha: 0.2,
    },
  });

  return {
    roomId: room.id,
    connectionId: exit.connectionId,
    direction: exit.direction,
    portId: existingPort.id,
    outlinePoints: outlinePoints.map(point => ({ ...point })),
    gatePoints: entrance.points.map(point => ({ ...point })),
    vestibuleWallSegments: [
      {
        start: { ...entrance.points[0] },
        end: { ...vestibuleWallEndPoints[0] },
      },
      {
        start: { ...entrance.points[2] },
        end: { ...vestibuleWallEndPoints[1] },
      },
    ],
  };
}
