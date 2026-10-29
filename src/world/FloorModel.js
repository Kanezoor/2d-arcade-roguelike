import RoomDefinition from "./RoomDefinition.js";
import RoomState from "./RoomState.js";

const DIRECTIONS = new Set(["north", "east", "south", "west"]);
const OPPOSITE_DIRECTION = {
  north: "south",
  east: "west",
  south: "north",
  west: "east",
};

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer.`);
  }
}

function cloneSerializable(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

/**
 * Holds the logical floor graph and serializable room progress.
 * It does not create or update Phaser/Matter objects.
 */
export default class FloorModel {
  constructor({
    id,
    depth = 1,
    seed = null,
    gridWidth = 7,
    gridHeight = 7,
    rooms = [],
    connections = [],
    roomStates = [],
    startRoomId = null,
    bossRoomId = null,
    activeRoomId = null,
  } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("FloorModel requires a non-empty string id.");
    }

    assertPositiveInteger(depth, "Floor depth");
    assertPositiveInteger(gridWidth, "Floor gridWidth");
    assertPositiveInteger(gridHeight, "Floor gridHeight");

    if (!Array.isArray(rooms) || rooms.length === 0) {
      throw new TypeError("FloorModel requires at least one room definition.");
    }

    this.id = id;
    this.depth = depth;
    this.seed = seed;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.rooms = new Map();
    this.roomStates = new Map();
    this.connections = [];
    this.activeRoomId = null;

    for (const input of rooms) {
      const room = input instanceof RoomDefinition
        ? input
        : new RoomDefinition(input);

      if (this.rooms.has(room.id)) {
        throw new Error(`Duplicate room id "${room.id}" on floor "${id}".`);
      }

      this.assertRoomFitsGrid(room);
      this.rooms.set(room.id, room);
    }

    this.assertNoOverlappingRoomFootprints();

    const savedStates = new Map();
    for (const state of roomStates ?? []) {
      if (state?.roomId) {
        savedStates.set(state.roomId, state);
      }
    }

    for (const room of this.rooms.values()) {
      const savedState = savedStates.get(room.id);
      this.roomStates.set(
        room.id,
        new RoomState(room.id, savedState ?? {
          locked: room.initiallyLocked,
        })
      );
    }

    for (const connection of connections) {
      this.addConnection(connection);
    }

    this.startRoomId = startRoomId ?? (
      [...this.rooms.values()].find(room => room.isStartRoom)?.id ??
      [...this.rooms.keys()][0]
    );
    this.bossRoomId = bossRoomId ?? (
      [...this.rooms.values()].find(room => room.isBossRoom)?.id ?? null
    );

    if (!this.rooms.has(this.startRoomId)) {
      throw new Error(`Start room "${this.startRoomId}" does not exist on floor "${id}".`);
    }

    if (this.bossRoomId !== null && !this.rooms.has(this.bossRoomId)) {
      throw new Error(`Boss room "${this.bossRoomId}" does not exist on floor "${id}".`);
    }

    if (activeRoomId !== null) {
      this.setActiveRoom(activeRoomId, { markVisited: false });
    }
  }

  assertRoomFitsGrid(room) {
    const { x, y } = room.gridPosition;
    const { width, height } = room.footprint;

    if (
      x + width > this.gridWidth ||
      y + height > this.gridHeight
    ) {
      throw new RangeError(
        `Room "${room.id}" footprint exceeds floor grid bounds.`
      );
    }
  }

  assertNoOverlappingRoomFootprints() {
    const occupiedCells = new Map();

    for (const room of this.rooms.values()) {
      for (
        let y = room.gridPosition.y;
        y < room.gridPosition.y + room.footprint.height;
        y++
      ) {
        for (
          let x = room.gridPosition.x;
          x < room.gridPosition.x + room.footprint.width;
          x++
        ) {
          const cellKey = `${x},${y}`;
          const otherRoomId = occupiedCells.get(cellKey);

          if (otherRoomId) {
            throw new Error(
              `Rooms "${otherRoomId}" and "${room.id}" overlap at grid cell ${cellKey}.`
            );
          }

          occupiedCells.set(cellKey, room.id);
        }
      }
    }
  }

  addConnection({
    id,
    roomAId,
    roomBId,
    directionFromA,
    locked = false,
    requiresKey = null,
  } = {}) {
    if (!this.rooms.has(roomAId) || !this.rooms.has(roomBId)) {
      throw new Error("A floor connection must reference two existing rooms.");
    }

    if (roomAId === roomBId) {
      throw new Error("A room cannot connect to itself.");
    }

    if (!DIRECTIONS.has(directionFromA)) {
      throw new TypeError(
        `Connection direction must be one of: ${[...DIRECTIONS].join(", ")}.`
      );
    }

    const normalizedId = id ?? `${roomAId}--${roomBId}`;
    if (this.connections.some(connection => connection.id === normalizedId)) {
      throw new Error(`Duplicate floor connection id "${normalizedId}".`);
    }

    const duplicatePair = this.connections.some(connection => (
      (connection.roomAId === roomAId && connection.roomBId === roomBId) ||
      (connection.roomAId === roomBId && connection.roomBId === roomAId)
    ));

    if (duplicatePair) {
      throw new Error(`Rooms "${roomAId}" and "${roomBId}" are already connected.`);
    }

    const connection = {
      id: normalizedId,
      roomAId,
      roomBId,
      directionFromA,
      locked: Boolean(locked),
      requiresKey,
    };

    this.connections.push(connection);
    return connection;
  }

  getRoomDefinition(roomId) {
    return this.rooms.get(roomId) ?? null;
  }

  getRoomState(roomId) {
    return this.roomStates.get(roomId) ?? null;
  }

  setActiveRoom(roomId, { markVisited = true } = {}) {
    const room = this.getRoomDefinition(roomId);

    if (!room) {
      throw new Error(`Cannot activate unknown room "${roomId}".`);
    }

    this.activeRoomId = roomId;

    if (markVisited) {
      this.getRoomState(roomId).markVisited();
    }

    return room;
  }

  getConnection(roomAId, roomBId) {
    return this.connections.find(connection => (
      (connection.roomAId === roomAId && connection.roomBId === roomBId) ||
      (connection.roomAId === roomBId && connection.roomBId === roomAId)
    )) ?? null;
  }

  getExits(roomId, { includeLocked = true } = {}) {
    if (!this.rooms.has(roomId)) {
      return [];
    }

    const exits = [];

    for (const connection of this.connections) {
      let toRoomId;
      let direction;

      if (connection.roomAId === roomId) {
        toRoomId = connection.roomBId;
        direction = connection.directionFromA;
      } else if (connection.roomBId === roomId) {
        toRoomId = connection.roomAId;
        direction = OPPOSITE_DIRECTION[connection.directionFromA];
      } else {
        continue;
      }

      if (!includeLocked && connection.locked) {
        continue;
      }

      exits.push({
        connectionId: connection.id,
        toRoomId,
        direction,
        locked: connection.locked,
        requiresKey: connection.requiresKey,
      });
    }

    return exits;
  }

  setConnectionLocked(connectionId, locked, requiresKey = undefined) {
    const connection = this.connections.find(item => item.id === connectionId);

    if (!connection) {
      return false;
    }

    connection.locked = Boolean(locked);

    if (requiresKey !== undefined) {
      connection.requiresKey = requiresKey;
    }

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      depth: this.depth,
      seed: this.seed,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      startRoomId: this.startRoomId,
      bossRoomId: this.bossRoomId,
      activeRoomId: this.activeRoomId,
      rooms: [...this.rooms.values()].map(room => room.toJSON()),
      roomStates: [...this.roomStates.values()].map(state => state.toJSON()),
      connections: this.connections.map(connection => cloneSerializable(connection)),
    };
  }

  static fromJSON(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new TypeError("FloorModel.fromJSON requires a floor snapshot object.");
    }

    return new FloorModel(snapshot);
  }
}
