import Inventory from "./Inventory.js";
import InventoryItem from "./InventoryItem.js";
import { ITEM_DEFINITIONS } from "./ItemDefinitions.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[Inventory test failed] ${message}`);
  }
}

export function runInventoryDebugTests() {
  const inventory = new Inventory(8, 4);

  const precision = new InventoryItem(
    ITEM_DEFINITIONS.precision
  );

  const secondPrecision = new InventoryItem(
    ITEM_DEFINITIONS.precision
  );

  // A normal item can be placed.
  assert(
    inventory.addItem(precision, 0, 0),
    "Should place an item in an empty cell."
  );

  // Different items must not overlap.
  assert(
    !inventory.canPlace(secondPrecision, 0, 0),
    "Should reject overlapping items."
  );

  assert(
    inventory.addItem(secondPrecision, 1, 0),
    "Should allow adjacent items."
  );

  // A multi-cell item occupies both cells.
  const medkit = new InventoryItem(
    ITEM_DEFINITIONS.medkit
  );

  assert(
    inventory.addItem(medkit, 3, 0),
    "Should place a two-cell item."
  );

  assert(
    inventory.getItemAtCell(4, 0)?.item === medkit,
    "Both medkit cells should be occupied."
  );

  // An item must not extend outside the grid.
  const edgeMedkit = new InventoryItem(
    ITEM_DEFINITIONS.medkit
  );

  assert(
    !inventory.canPlace(edgeMedkit, 7, 0),
    "Should reject an item extending beyond the right edge."
  );

  // An irregular item can be rotated.
  const salvage = new InventoryItem(
    ITEM_DEFINITIONS.salvagePart
  );

  assert(
    inventory.addItem(salvage, 5, 0),
    "Should place the L-shaped item."
  );

  assert(
    inventory.rotateItem(salvage.instanceId, 1),
    "Should rotate the L-shaped item."
  );

  assert(
    inventory.getItemAtCell(6, 1)?.item === salvage,
    "Rotated footprint should occupy the expected cell."
  );

  // Invalid moves must not change the existing placement.
  const originalMedkit = inventory.getPlacement(
    medkit.instanceId
  );

  assert(
    !inventory.moveItem(medkit.instanceId, 4, 0),
    "Should reject moving the medkit into an occupied cell."
  );

  assert(
    inventory.getPlacement(medkit.instanceId) === originalMedkit,
    "Invalid move should preserve the original placement."
  );

  // Removing an item frees its cells.
  assert(
    inventory.removeItem(secondPrecision.instanceId) === secondPrecision,
    "Should return the removed item."
  );

  assert(
    inventory.getItemAtCell(1, 0) === null,
    "Removed item should free its cell."
  );

  // Automatic placement should find available space.
  const nextItem = new InventoryItem(
    ITEM_DEFINITIONS.precision
  );

  assert(
    inventory.addItemToFirstFit(nextItem) !== null,
    "Should find an available position."
  );

  console.log("Inventory grid tests passed.");
}