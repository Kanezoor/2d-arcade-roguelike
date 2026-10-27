
let nextInstanceId = 1;

export default class InventoryItem {
  constructor(definition) {
    if (!definition || !definition.id) {
      throw new Error(
        'InventoryItem requires a valid item definition.'
      );
    }

    if (
      !Array.isArray(definition.footprint) ||
      definition.footprint.length === 0
    ) {
      throw new Error(
        `Item "${definition.id}" needs a non-empty footprint.`
      );
    }

    this.instanceId = `item-${nextInstanceId++}`;

    this.definition = definition;

    // Each increment represents a 90-degree clockwise turn.
    // 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°.
    this.rotation = 0;
  }
}