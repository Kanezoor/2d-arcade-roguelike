/**
 * Small serializable description of the generation-relevant state of a run.
 * It deliberately contains no Phaser objects or gameplay entity instances.
 */
export default class RunProgressionContext {
  constructor({ depth = 1, pathId = "default", modifierIds = [] } = {}) {
    if (!Number.isInteger(depth) || depth < 1) {
      throw new TypeError("Run progression depth must be a positive integer.");
    }
    if (typeof pathId !== "string" || pathId.trim() === "") {
      throw new TypeError("Run progression pathId must be a non-empty string.");
    }
    if (!Array.isArray(modifierIds) || modifierIds.some(id => (
      typeof id !== "string" || id.trim() === ""
    ))) {
      throw new TypeError("Run progression modifierIds must be an array of non-empty strings.");
    }

    this.depth = depth;
    this.pathId = pathId;
    this.modifierIds = [...new Set(modifierIds)];
  }

  setLocation(depth, pathId = this.pathId) {
    const next = new RunProgressionContext({
      depth,
      pathId,
      modifierIds: this.modifierIds,
    });
    this.depth = next.depth;
    this.pathId = next.pathId;
    return this;
  }

  setModifierIds(modifierIds) {
    const next = new RunProgressionContext({
      depth: this.depth,
      pathId: this.pathId,
      modifierIds,
    });
    this.modifierIds = next.modifierIds;
    return this;
  }

  toJSON() {
    return {
      depth: this.depth,
      pathId: this.pathId,
      modifierIds: [...this.modifierIds],
    };
  }

  static fromJSON(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new TypeError("RunProgressionContext.fromJSON requires an object.");
    }
    return new RunProgressionContext(snapshot);
  }
}
