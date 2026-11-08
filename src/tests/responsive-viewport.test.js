import assert from "node:assert/strict";
import { getRoomCameraLayout } from "../world/RoomCameraLayout.js";
import LevelUpManager from "../managers/LevelUpManager.js";
import InventoryUI from "../inventory/InventoryUI.js";

const fullHd = getRoomCameraLayout(1600, 800, 1920, 1080);
assert.equal(fullHd.zoom, 1.35);
assert.equal(fullHd.visibleHeight, 800);
assert.ok(fullHd.bounds.width >= 1600);

const laptop = getRoomCameraLayout(800, 800, 1366, 768);
assert.equal(laptop.zoom, 0.96);
assert.equal(laptop.visibleHeight, 800);

const ultrawide = getRoomCameraLayout(800, 800, 2560, 1080);
assert.equal(ultrawide.zoom, 1.35);
assert.ok(ultrawide.visibleWidth > 1800);

const smallViewport = getRoomCameraLayout(800, 800, 640, 480);
assert.equal(smallViewport.zoom, 0.6);
assert.ok(smallViewport.visibleWidth > 800);
assert.equal(smallViewport.visibleHeight, 800);
assert.ok(smallViewport.bounds.x < 0);
assert.equal(smallViewport.bounds.y, 0);

const multiCell = getRoomCameraLayout(1600, 1600, 1920, 1080);
assert.equal(multiCell.zoom, 1.35);
assert.equal(multiCell.bounds.width, 1600);
assert.equal(multiCell.bounds.height, 1600);

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 800, height: 600 },
  { width: 640, height: 480 },
]) {
  const manager = Object.create(LevelUpManager.prototype);
  manager.scene = { scale: viewport };
  manager.panelWidth = Math.max(280, Math.min(700, viewport.width - 32));
  manager.panelHeight = Math.max(250, Math.min(500, viewport.height - 32));
  const cards = manager.getCardLayout(5);
  assert.equal(cards.length, 5);
  for (const card of cards) {
    assert.ok(card.width > 0 && card.height > 0);
    assert.ok(card.x - card.width / 2 >= 0);
    assert.ok(card.x + card.width / 2 <= viewport.width);
    assert.ok(card.y - card.height / 2 >= 0);
    assert.ok(card.y + card.height / 2 <= viewport.height);
  }
}

const inventory = Object.create(InventoryUI.prototype);
inventory.scene = { scale: { width: 600, height: 400 } };
inventory.uiContainer = {
  setPosition(x, y) { this.position = { x, y }; return this; },
  setScale(value) { this.scale = value; return this; },
};
inventory.updateContainerTransform();
const local = inventory.getLocalPointer({ x: 300, y: 200 });
assert.ok(Math.abs(local.x - 400) < 1e-9);
assert.ok(Math.abs(local.y - 400) < 1e-9);

console.log("Responsive viewport layout, level-up layout, and inventory scaling tests passed.");
