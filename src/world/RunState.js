import FloorRegistry from "./FloorRegistry.js";

export const RUN_STATE_SCHEMA_VERSION = 1;

function assertJsonValue(value, label, ancestors = new WeakSet()) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${label} must not contain non-finite numbers.`);
    }
    return;
  }

  if (typeof value !== "object") {
    throw new TypeError(`${label} must contain only JSON-serializable data.`);
  }

  if (ancestors.has(value)) {
    throw new TypeError(`${label} must not contain circular references.`);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) {
    throw new TypeError(`${label} must contain only plain objects and arrays.`);
  }

  ancestors.add(value);

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      throw new TypeError(`${label} must not contain symbol keys.`);
    }
    assertJsonValue(value[key], `${label}.${key}`, ancestors);
  }

  ancestors.delete(value);
}

function cloneSerializable(value, label = "value") {
  assertJsonValue(value, label);

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new TypeError(`${label} must contain only JSON-serializable data.`);
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function createRunId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return `run-${uuid}`;
  }

  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Serializable root state for one playthrough. It owns floor instances,
 * cross-floor links, player snapshots, and run-wide flags.
 */
export default class RunState {
  constructor({
    id = createRunId(),
    seed = null,
    currentFloorId = null,
    currentRoomId = null,
    floors = [],
    floorConnections = [],
    playerStates = {},
    globalFlags = {},
  } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("RunState requires a non-empty id.");
    }

    if (
      seed !== null &&
      !(typeof seed === "string" && seed.length > 0) &&
      !(typeof seed === "number" && Number.isFinite(seed))
    ) {
      throw new TypeError("RunState seed must be a finite number, non-empty string, or null.");
    }

    assertPlainObject(playerStates, "playerStates");
    assertPlainObject(globalFlags, "globalFlags");

    this.schemaVersion = RUN_STATE_SCHEMA_VERSION;
    this.id = id;
    this.seed = seed;
    this.currentFloorId = null;
    this.currentRoomId = null;
    this.floorRegistry = new FloorRegistry({
      floors,
      connections: floorConnections,
    });
    this.playerStates = new Map();
    this.globalFlags = cloneSerializable(globalFlags, "globalFlags");

    for (const [playerId, playerState] of Object.entries(playerStates)) {
      this.setPlayerState(playerId, playerState);
    }

    if (currentFloorId !== null || currentRoomId !== null) {
      if (currentFloorId === null || currentRoomId === null) {
        throw new TypeError("currentFloorId and currentRoomId must either both be set or both be null.");
      }

      this.setCurrentLocation(currentFloorId, currentRoomId, {
        markVisited: false,
      });
    }
  }

  addFloor(floor, { makeCurrent = false, roomId = null } = {}) {
    const registeredFloor = this.floorRegistry.addFloor(floor);

    if (makeCurrent) {
      this.setCurrentLocation(
        registeredFloor.id,
        roomId ?? registeredFloor.startRoomId
      );
    }

    return registeredFloor;
  }

  addFloorConnection(connection) {
    return this.floorRegistry.addConnection(connection);
  }

  getFloor(floorId) {
    return this.floorRegistry.getFloor(floorId);
  }

  getCurrentFloor() {
    return this.currentFloorId
      ? this.getFloor(this.currentFloorId)
      : null;
  }

  getCurrentRoom() {
    const floor = this.getCurrentFloor();
    return floor?.getRoomDefinition(this.currentRoomId) ?? null;
  }

  setCurrentLocation(floorId, roomId, { markVisited = true } = {}) {
    const floor = this.getFloor(floorId);

    if (!floor) {
      throw new Error(`Cannot set current location to unknown floor "${floorId}".`);
    }

    if (!floor.getRoomDefinition(roomId)) {
      throw new Error(`Cannot set current location to unknown room "${roomId}" on floor "${floorId}".`);
    }

    const enteringDifferentFloor = this.currentFloorId !== floorId;

    floor.setActiveRoom(roomId, { markVisited });

    if (markVisited && enteringDifferentFloor) {
      floor.markVisited();
    }

    this.currentFloorId = floorId;
    this.currentRoomId = roomId;

    return {
      floor,
      room: floor.getRoomDefinition(roomId),
    };
  }

  markFloorCompleted(floorId) {
    const floor = this.getFloor(floorId);

    if (!floor) {
      return false;
    }

    floor.markCompleted();
    return true;
  }

  setPlayerState(playerId, state) {
    if (typeof playerId !== "string" || playerId.trim() === "") {
      throw new TypeError("Player state requires a non-empty playerId.");
    }

    assertPlainObject(state, `Player state for "${playerId}"`);
    this.playerStates.set(playerId, cloneSerializable(state, `Player state for "${playerId}"`));
    return true;
  }

  getPlayerState(playerId) {
    const state = this.playerStates.get(playerId);
    return state === undefined
      ? null
      : cloneSerializable(state, `Player state for "${playerId}"`);
  }

  removePlayerState(playerId) {
    return this.playerStates.delete(playerId);
  }

  setGlobalFlag(flagId, value) {
    if (typeof flagId !== "string" || flagId.trim() === "") {
      throw new TypeError("Global flag requires a non-empty id.");
    }

    this.globalFlags[flagId] = cloneSerializable(value, `Global flag "${flagId}"`);
    return true;
  }

  getGlobalFlag(flagId, fallback = undefined) {
    if (!Object.prototype.hasOwnProperty.call(this.globalFlags, flagId)) {
      return fallback;
    }

    return cloneSerializable(this.globalFlags[flagId], `Global flag "${flagId}"`);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      seed: this.seed,
      currentFloorId: this.currentFloorId,
      currentRoomId: this.currentRoomId,
      floorRegistry: this.floorRegistry.toJSON(),
      playerStates: Object.fromEntries(
        [...this.playerStates.entries()].map(([playerId, state]) => [
          playerId,
          cloneSerializable(state, `Player state for "${playerId}"`),
        ])
      ),
      globalFlags: cloneSerializable(this.globalFlags, "globalFlags"),
    };
  }

  static fromJSON(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new TypeError("RunState.fromJSON requires an object snapshot.");
    }

    const version = snapshot.schemaVersion ?? 1;

    if (version !== RUN_STATE_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported RunState schema version "${version}". Expected ${RUN_STATE_SCHEMA_VERSION}.`
      );
    }

    const registrySnapshot = snapshot.floorRegistry ?? {
      floors: snapshot.floors ?? [],
      connections: snapshot.floorConnections ?? [],
    };

    return new RunState({
      id: snapshot.id,
      seed: snapshot.seed ?? null,
      currentFloorId: snapshot.currentFloorId ?? null,
      currentRoomId: snapshot.currentRoomId ?? null,
      floors: registrySnapshot.floors ?? [],
      floorConnections: registrySnapshot.connections ?? [],
      playerStates: snapshot.playerStates ?? {},
      globalFlags: snapshot.globalFlags ?? {},
    });
  }
}
