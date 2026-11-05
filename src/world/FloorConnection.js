function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Connects one room location to another, potentially across floor instances.
 * This is separate from FloorModel's ordinary room-to-room connections.
 */
export default class FloorConnection {
  constructor({
    id,
    fromFloorId,
    fromRoomId,
    toFloorId,
    toRoomId,
    type = "stairs",
    bidirectional = true,
    locked = false,
    requires = null,
    metadata = {},
  } = {}) {
    const requiredIds = { fromFloorId, fromRoomId, toFloorId, toRoomId };

    for (const [label, value] of Object.entries(requiredIds)) {
      if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`FloorConnection requires a non-empty ${label}.`);
      }
    }

    if (typeof type !== "string" || type.trim() === "") {
      throw new TypeError("FloorConnection type must be a non-empty string.");
    }

    if (typeof bidirectional !== "boolean") {
      throw new TypeError("FloorConnection bidirectional must be a boolean.");
    }

    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new TypeError("FloorConnection metadata must be an object.");
    }

    if (requires !== null && (typeof requires !== "object" || Array.isArray(requires))) {
      throw new TypeError("FloorConnection requires must be an object or null.");
    }

    this.id = id ?? `${fromFloorId}:${fromRoomId}->${toFloorId}:${toRoomId}`;

    if (typeof this.id !== "string" || this.id.trim() === "") {
      throw new TypeError("FloorConnection id must be a non-empty string.");
    }

    this.fromFloorId = fromFloorId;
    this.fromRoomId = fromRoomId;
    this.toFloorId = toFloorId;
    this.toRoomId = toRoomId;
    this.type = type;
    this.bidirectional = bidirectional;
    this.locked = Boolean(locked);
    this.requires = requires === null ? null : cloneSerializable(requires);
    this.metadata = cloneSerializable(metadata);
  }

  toJSON() {
    return {
      id: this.id,
      fromFloorId: this.fromFloorId,
      fromRoomId: this.fromRoomId,
      toFloorId: this.toFloorId,
      toRoomId: this.toRoomId,
      type: this.type,
      bidirectional: this.bidirectional,
      locked: this.locked,
      requires: this.requires === null ? null : cloneSerializable(this.requires),
      metadata: cloneSerializable(this.metadata),
    };
  }

  static fromJSON(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new TypeError("FloorConnection.fromJSON requires an object snapshot.");
    }

    return new FloorConnection(snapshot);
  }
}
