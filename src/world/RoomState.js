function cloneSerializable(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

/**
 * Stores serializable progress for one logical room.
 * Runtime sprites, enemies, Matter bodies, and Phaser objects do not belong here.
 */
export default class RoomState {
  constructor(roomId, snapshot = {}) {
    if (typeof roomId !== "string" || roomId.trim() === "") {
      throw new TypeError("RoomState requires a non-empty roomId.");
    }

    this.roomId = roomId;
    this.visited = Boolean(snapshot.visited);
    this.visitCount = Number.isInteger(snapshot.visitCount) && snapshot.visitCount >= 0
      ? snapshot.visitCount
      : 0;
    this.cleared = Boolean(snapshot.cleared);
    this.locked = Boolean(snapshot.locked);
    this.defeatedEnemyIds = Array.isArray(snapshot.defeatedEnemyIds)
      ? [...snapshot.defeatedEnemyIds]
      : [];
    this.droppedItems = Array.isArray(snapshot.droppedItems)
      ? cloneSerializable(snapshot.droppedItems)
      : [];
    this.collectedItemIds = Array.isArray(snapshot.collectedItemIds)
      ? [...snapshot.collectedItemIds]
      : [];
    this.collectedRewardIds = Array.isArray(snapshot.collectedRewardIds)
      ? [...snapshot.collectedRewardIds]
      : [];
    this.gateStates = snapshot.gateStates && typeof snapshot.gateStates === "object"
      && !Array.isArray(snapshot.gateStates)
      ? cloneSerializable(snapshot.gateStates)
      : {};
    this.customData = snapshot.customData && typeof snapshot.customData === "object"
      ? cloneSerializable(snapshot.customData)
      : {};
  }

  markVisited() {
    this.visited = true;
    this.visitCount += 1;
  }

  markCleared() {
    this.cleared = true;
  }

  setLocked(isLocked) {
    this.locked = Boolean(isLocked);
  }

  recordDefeatedEnemy(enemyId) {
    if (enemyId == null || this.defeatedEnemyIds.includes(enemyId)) {
      return false;
    }

    this.defeatedEnemyIds.push(enemyId);
    return true;
  }

  addDroppedItem(itemSnapshot) {
    if (!itemSnapshot || typeof itemSnapshot.id !== "string") {
      throw new TypeError("A dropped-item snapshot requires a string id.");
    }

    const snapshot = cloneSerializable(itemSnapshot);
    const existingIndex = this.droppedItems.findIndex(
      item => item.id === snapshot.id
    );

    if (existingIndex >= 0) {
      this.droppedItems[existingIndex] = snapshot;
    } else {
      this.droppedItems.push(snapshot);
    }
  }

  removeDroppedItem(itemId) {
    const previousLength = this.droppedItems.length;
    this.droppedItems = this.droppedItems.filter(item => item.id !== itemId);
    return this.droppedItems.length !== previousLength;
  }

  recordCollectedItem(itemId) {
    if (itemId == null || this.collectedItemIds.includes(itemId)) {
      return false;
    }

    this.collectedItemIds.push(itemId);
    this.removeDroppedItem(itemId);
    return true;
  }

  hasGateState(gateId) {
    return Object.prototype.hasOwnProperty.call(this.gateStates, gateId);
  }

  isGateOpen(gateId, fallback = false) {
    return this.hasGateState(gateId)
      ? Boolean(this.gateStates[gateId])
      : Boolean(fallback);
  }

  setGateOpen(gateId, isOpen) {
    if (typeof gateId !== "string" || gateId.trim() === "") {
      throw new TypeError("Gate state requires a non-empty gateId.");
    }

    this.gateStates[gateId] = Boolean(isOpen);
    return true;
  }

  recordCollectedReward(rewardId) {
    if (rewardId == null || this.collectedRewardIds.includes(rewardId)) {
      return false;
    }

    this.collectedRewardIds.push(rewardId);
    return true;
  }

  toJSON() {
    return {
      roomId: this.roomId,
      visited: this.visited,
      visitCount: this.visitCount,
      cleared: this.cleared,
      locked: this.locked,
      defeatedEnemyIds: [...this.defeatedEnemyIds],
      droppedItems: cloneSerializable(this.droppedItems),
      collectedItemIds: [...this.collectedItemIds],
      collectedRewardIds: [...this.collectedRewardIds],
      gateStates: cloneSerializable(this.gateStates),
      customData: cloneSerializable(this.customData),
    };
  }
}
