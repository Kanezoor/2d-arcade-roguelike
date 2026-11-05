import RoomDefinition from "./RoomDefinition.js";
import RoomState from "./RoomState.js";
import RoomPort from "./RoomPort.js";

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
    archetypeId = "default",
    variantId = "default",
    generationVersion = 1,
    depth = 1,
    seed = null,
    visited = false,
    visitCount = 0,
    completed = false,
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

    if (typeof archetypeId !== "string" || archetypeId.trim() === "") {
      throw new TypeError("FloorModel requires a non-empty archetypeId.");
    }

    if (typeof variantId !== "string" || variantId.trim() === "") {
      throw new TypeError("FloorModel requires a non-empty variantId.");
    }

    assertPositiveInteger(generationVersion, "Floor generationVersion");
    assertPositiveInteger(depth, "Floor depth");
    assertPositiveInteger(gridWidth, "Floor gridWidth");
    assertPositiveInteger(gridHeight, "Floor gridHeight");

    if (!Array.isArray(rooms) || rooms.length === 0) {
      throw new TypeError("FloorModel requires at least one room definition.");
    }

    this.id = id;
    this.archetypeId = archetypeId;
    this.variantId = variantId;
    this.generationVersion = generationVersion;
    this.depth = depth;
    this.seed = seed;
    this.visited = Boolean(visited);
    this.visitCount = Number.isInteger(visitCount) && visitCount >= 0
      ? visitCount
      : 0;
    this.completed = Boolean(completed);
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

    this.ensurePortsForConnections();

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

  markVisited() {
    this.visited = true;
    this.visitCount += 1;
  }

  markCompleted() {
    this.completed = true;
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

  ensurePortsForConnections() {
    for (const connection of this.connections) {
      const roomA = this.getRoomDefinition(connection.roomAId);
      const roomB = this.getRoomDefinition(connection.roomBId);
      const reverseDirection = OPPOSITE_DIRECTION[connection.directionFromA];

      if (!roomA.getPortForConnection(connection.id)) {
        roomA.addPort(new RoomPort({
          id: `${roomA.id}:${connection.id}`,
          connectionId: connection.id,
          direction: connection.directionFromA,
          mode: "direct",
        }));
      }

      if (!roomB.getPortForConnection(connection.id)) {
        roomB.addPort(new RoomPort({
          id: `${roomB.id}:${connection.id}`,
          connectionId: connection.id,
          direction: reverseDirection,
          mode: "direct",
        }));
      }

      const portA = roomA.getPortForConnection(connection.id);
      const portB = roomB.getPortForConnection(connection.id);

      if (portA.direction !== connection.directionFromA) {
        throw new Error(
          `RoomPort "${portA.id}" direction does not match connection "${connection.id}".`
        );
      }

      if (portB.direction !== reverseDirection) {
        throw new Error(
          `RoomPort "${portB.id}" direction does not match the reverse of connection "${connection.id}".`
        );
      }
    }

    for (const room of this.rooms.values()) {
      for (const port of room.ports) {
        if (port.connectionId && !this.connections.some(
          connection => connection.id === port.connectionId &&
            (connection.roomAId === room.id || connection.roomBId === room.id)
        )) {
          throw new Error(
            `RoomPort "${port.id}" references an unknown connection "${port.connectionId}".`
          );
        }
      }
    }
  }

  getPortForExit(roomId, exitOrConnectionId) {
    const room = this.getRoomDefinition(roomId);
    if (!room) return null;

    const connectionId = typeof exitOrConnectionId === "string"
      ? exitOrConnectionId
      : exitOrConnectionId?.connectionId;

    if (connectionId) {
      return room.getPortForConnection(connectionId);
    }

    const direction = exitOrConnectionId?.direction;
    return room.ports.find(port => port.direction === direction) ?? null;
  }

  setRoomPort(roomId, inputPort) {
    const room = this.getRoomDefinition(roomId);
    if (!room) {
      throw new Error(`Cannot set a port on unknown room "${roomId}".`);
    }

    const port = room.setPort(inputPort);
    if (port.connectionId) {
      const exit = this.getExits(roomId, { includeLocked: true }).find(
        item => item.connectionId === port.connectionId
      );

      if (!exit) {
        throw new Error(
          `RoomPort "${port.id}" references a connection that does not leave room "${roomId}".`
        );
      }

      if (exit.direction !== port.direction) {
        throw new Error(
          `RoomPort "${port.id}" direction must be "${exit.direction}" for this connection.`
        );
      }
    }

    return port;
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
      archetypeId: this.archetypeId,
      variantId: this.variantId,
      generationVersion: this.generationVersion,
      depth: this.depth,
      seed: this.seed,
      visited: this.visited,
      visitCount: this.visitCount,
      completed: this.completed,
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
