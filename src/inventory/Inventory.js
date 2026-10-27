
export default class Inventory {
  constructor(width = 8, height = 4) {
    this.width = width;
    this.height = height;

    // Maps each item instance ID to its position in the grid.
    this.placements = new Map();
  }

  normalizeRotation(rotation) {
    return ((rotation % 4) + 4) % 4;
  }

  getRotatedFootprint(item, rotation = item.rotation) {
    let cells = item.definition.footprint.map(
      ([x, y]) => [x, y]
    );

    const turns = this.normalizeRotation(rotation);

    // Rotate 90 degrees clockwise for each turn.
    for (let i = 0; i < turns; i++) {
      cells = cells.map(([x, y]) => [-y, x]);
    }

    // Shift the footprint so its top-left occupied cell is (0, 0).
    const minX = Math.min(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));

    return cells.map(([x, y]) => [
      x - minX,
      y - minY,
    ]);
  }

  getOccupiedCells(ignoreInstanceId = null) {
    const occupied = new Set();

    for (const [instanceId, placement] of this.placements) {
      if (instanceId === ignoreInstanceId) {
        continue;
      }

      const footprint = this.getRotatedFootprint(
        placement.item
      );

      for (const [offsetX, offsetY] of footprint) {
        const x = placement.x + offsetX;
        const y = placement.y + offsetY;

        occupied.add(`${x},${y}`);
      }
    }

    return occupied;
  }

  canPlace(
    item,
    x,
    y,
    rotation = item.rotation,
    ignoreInstanceId = null
  ) {
    if (!item || !item.instanceId || !item.definition) {
      return false;
    }

    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return false;
    }

    const footprint = this.getRotatedFootprint(
      item,
      rotation
    );

    const occupied = this.getOccupiedCells(
      ignoreInstanceId
    );

    for (const [offsetX, offsetY] of footprint) {
      const cellX = x + offsetX;
      const cellY = y + offsetY;

      // The item must fit inside the grid.
      if (
        cellX < 0 ||
        cellY < 0 ||
        cellX >= this.width ||
        cellY >= this.height
      ) {
        return false;
      }

      // No occupied cell may overlap another item.
      if (occupied.has(`${cellX},${cellY}`)) {
        return false;
      }
    }

    return true;
  }

  addItem(item, x, y, rotation = item.rotation) {
    if (this.placements.has(item.instanceId)) {
      return false;
    }

    const normalizedRotation = this.normalizeRotation(rotation);

    if (!this.canPlace(item, x, y, normalizedRotation)) {
      return false;
    }

    item.rotation = normalizedRotation;

    this.placements.set(item.instanceId, {
      item,
      x,
      y,
    });

    return true;
  }

  moveItem(instanceId, x, y, rotation) {
    const placement = this.placements.get(instanceId);

    if (!placement) {
      return false;
    }

    const nextRotation = this.normalizeRotation(
      rotation ?? placement.item.rotation
    );

    // Ignore this item when checking whether its new position fits.
    if (
      !this.canPlace(
        placement.item,
        x,
        y,
        nextRotation,
        instanceId
      )
    ) {
      return false;
    }

    placement.item.rotation = nextRotation;
    placement.x = x;
    placement.y = y;

    return true;
  }

  rotateItem(instanceId, turns = 1) {
    const placement = this.placements.get(instanceId);

    if (!placement) {
      return false;
    }

    const nextRotation = this.normalizeRotation(
      placement.item.rotation + turns
    );

    return this.moveItem(
      instanceId,
      placement.x,
      placement.y,
      nextRotation
    );
  }

  removeItem(instanceId) {
    const placement = this.placements.get(instanceId);

    if (!placement) {
      return null;
    }

    this.placements.delete(instanceId);

    return placement.item;
  }

  getItems() {
    return Array.from(this.placements.values());
  }

  getPlacement(instanceId) {
    return this.placements.get(instanceId) ?? null;
  }

  getItemAtCell(x, y) {
    for (const placement of this.placements.values()) {
      const footprint = this.getRotatedFootprint(
        placement.item
      );

      const containsCell = footprint.some(
        ([offsetX, offsetY]) =>
          placement.x + offsetX === x &&
          placement.y + offsetY === y
      );

      if (containsCell) {
        return placement;
      }
    }

    return null;
  }

  findFirstFit(item, rotation = item.rotation) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.canPlace(item, x, y, rotation)) {
          return { x, y, rotation };
        }
      }
    }

    return null;
  }

  addItemToFirstFit(item, rotation = item.rotation) {
    const position = this.findFirstFit(item, rotation);

    if (!position) {
      return null;
    }

    const added = this.addItem(
      item,
      position.x,
      position.y,
      position.rotation
    );

    return added ? position : null;
  }
}