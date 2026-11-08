import { createUI, drawUI, layoutUI } from "./ui.js";
import LevelUpManager from "./managers/LevelUpManager.js";
import InventoryUI from "./inventory/InventoryUI.js";

/**
 * Screen-space layer. It has its own default camera (zoom 1, scroll 0), so HUD
 * and menu objects are unaffected by gameplay camera zoom or room scrolling.
 */
export default class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: "HUDScene" });
  }

  init(data) {
    this.gameScene = data?.gameScene ?? null;
  }

  create() {
    if (!this.gameScene) {
      this.scene.stop();
      return;
    }

    const world = this.gameScene;
    this.player = world.player;
    this.isLevelUpOpen = false;
    this.isInventoryOpen = false;

    // Managers create their interactive objects in this unzoomed scene, but
    // operate on the same player and Matter world as the gameplay scene.
    this.levelUpManager = new LevelUpManager(this);
    this.inventoryUI = new InventoryUI(this, world.player.inventory);
    world.levelUpManager = this.levelUpManager;
    world.inventoryUI = this.inventoryUI;
    world.hudScene = this;

    createUI(this);
    this.scale.off("resize", this.handleResize, this);
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
    });
  }

  createWorldItem(item) {
    return this.gameScene.createWorldItem(item);
  }

  handleResize() {
    layoutUI(this);
    this.levelUpManager?.handleResize();
    this.inventoryUI?.handleResize();
  }

  update() {
    if (this.gameScene) drawUI(this.gameScene, this);
  }
}
