const DEFAULT_ROOM_REFERENCE_SIZE = 800;

/**
 * Returns a camera zoom and world bounds that keep the room's scale stable
 * across viewport aspect ratios while allowing camera follow in oversized rooms.
 * Small rooms are centered against the outside-background instead of pinned
 * to the top-left corner when the viewport is larger than the room.
 */
export function getRoomCameraLayout(
  roomWidth,
  roomHeight,
  viewportWidth,
  viewportHeight,
  referenceSize = DEFAULT_ROOM_REFERENCE_SIZE
) {
  for (const [value, label] of [
    [roomWidth, "roomWidth"],
    [roomHeight, "roomHeight"],
    [viewportWidth, "viewportWidth"],
    [viewportHeight, "viewportHeight"],
    [referenceSize, "referenceSize"],
  ]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new TypeError(`${label} must be a positive finite number.`);
    }
  }

  // A 800-world-unit-high room keeps roughly the same apparent scale at
  // different desktop resolutions. Width is also considered for portrait or
  // unusually narrow browser windows.
  const zoom = Math.min(
    viewportWidth / referenceSize,
    viewportHeight / referenceSize
  );

  const visibleWidth = viewportWidth / zoom;
  const visibleHeight = viewportHeight / zoom;
  const boundsX = roomWidth < visibleWidth ? (roomWidth - visibleWidth) / 2 : 0;
  const boundsY = roomHeight < visibleHeight ? (roomHeight - visibleHeight) / 2 : 0;
  const boundsWidth = Math.max(roomWidth, visibleWidth);
  const boundsHeight = Math.max(roomHeight, visibleHeight);

  return {
    zoom,
    visibleWidth,
    visibleHeight,
    bounds: {
      x: boundsX,
      y: boundsY,
      width: boundsWidth,
      height: boundsHeight,
    },
  };
}
