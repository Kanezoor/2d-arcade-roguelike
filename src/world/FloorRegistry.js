import FloorModel from "./FloorModel.js";
import FloorConnection from "./FloorConnection.js";

/**
 * Owns all generated floor instances and cross-floor location connections
 * belonging to a single run. It does not create Phaser or Matter objects.
 */
export default class FloorRegistry {
  constructor({ floors = [], connections = [] } = {}) {
    if (!Array.isArray(floors) || !Array.isArray(connections)) {
      throw new TypeError("FloorRegistry floors and connections must be arrays.");
    }

    this.floors = new Map();
    this.connections = new Map();

    for (const floor of floors) {
      this.addFloor(floor);
    }

    for (const connection of connections) {
      this.addConnection(connection);
    }
  }

  addFloor(input) {
    const floor = input instanceof FloorModel
      ? input
      : FloorModel.fromJSON(input);

    if (this.floors.has(floor.id)) {
      throw new Error(`Floor instance "${floor.id}" is already registered.`);
    }

    this.floors.set(floor.id, floor);
    return floor;
  }

  getFloor(floorId) {
    return this.floors.get(floorId) ?? null;
  }

  hasFloor(floorId) {
    return this.floors.has(floorId);
  }

  getFloors() {
    return [...this.floors.values()];
  }

  addConnection(input) {
    const connection = input instanceof FloorConnection
      ? input
      : new FloorConnection(input);

    const fromFloor = this.getFloor(connection.fromFloorId);
    const toFloor = this.getFloor(connection.toFloorId);

    if (!fromFloor || !toFloor) {
      throw new Error(
        `Floor connection "${connection.id}" references an unregistered floor instance.`
      );
    }

    if (!fromFloor.getRoomDefinition(connection.fromRoomId)) {
      throw new Error(
        `Floor connection "${connection.id}" references unknown room "${connection.fromRoomId}" on floor "${connection.fromFloorId}".`
      );
    }

    if (!toFloor.getRoomDefinition(connection.toRoomId)) {
      throw new Error(
        `Floor connection "${connection.id}" references unknown room "${connection.toRoomId}" on floor "${connection.toFloorId}".`
      );
    }

    if (this.connections.has(connection.id)) {
      throw new Error(`Floor connection "${connection.id}" is already registered.`);
    }

    this.connections.set(connection.id, connection);
    return connection;
  }

  getConnection(connectionId) {
    return this.connections.get(connectionId) ?? null;
  }

  getConnections() {
    return [...this.connections.values()];
  }

  getConnectionsFrom(floorId, roomId) {
    if (!this.getFloor(floorId)?.getRoomDefinition(roomId)) {
      return [];
    }

    const results = [];

    for (const connection of this.connections.values()) {
      if (
        connection.fromFloorId === floorId &&
        connection.fromRoomId === roomId
      ) {
        results.push({
          connection,
          direction: "forward",
          destination: {
            floorId: connection.toFloorId,
            roomId: connection.toRoomId,
          },
        });
      }

      if (
        connection.bidirectional &&
        connection.toFloorId === floorId &&
        connection.toRoomId === roomId
      ) {
        results.push({
          connection,
          direction: "reverse",
          destination: {
            floorId: connection.fromFloorId,
            roomId: connection.fromRoomId,
          },
        });
      }
    }

    return results;
  }

  setConnectionLocked(connectionId, locked, requires = undefined) {
    const connection = this.getConnection(connectionId);

    if (!connection) {
      return false;
    }

    connection.locked = Boolean(locked);

    if (requires !== undefined) {
      if (requires !== null && (typeof requires !== "object" || Array.isArray(requires))) {
        throw new TypeError("Connection requirements must be an object or null.");
      }
      connection.requires = requires === null ? null : JSON.parse(JSON.stringify(requires));
    }

    return true;
  }

  toJSON() {
    return {
      floors: this.getFloors().map(floor => floor.toJSON()),
      connections: this.getConnections().map(connection => connection.toJSON()),
    };
  }

  static fromJSON(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new TypeError("FloorRegistry.fromJSON requires an object snapshot.");
    }

    return new FloorRegistry({
      floors: snapshot.floors ?? [],
      connections: snapshot.connections ?? [],
    });
  }
}
