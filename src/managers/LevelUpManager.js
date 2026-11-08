import UpgradeCard from "./UpgradeCard.js";
import { getLevelUpChoices } from "../progression/LevelUpUpgrades.js";

export default class LevelUpManager {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.choices = [];
    this.cards = [];
    this.isSelecting = false;
    this.isOpen = false;
    this.waitForPointerRelease = false;
    this.panelWidth = 700;
    this.panelHeight = 500;
  }

  show() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.scene.isLevelUpOpen = true;
    const worldScene = this.scene.gameScene ?? this.scene;
    worldScene.isLevelUpOpen = true;
    worldScene.matter.world.pause();
    this.waitForPointerRelease = this.scene.input.activePointer.isDown;

    if (this.waitForPointerRelease) {
      this.scene.input.once("pointerup", () => {
        this.scene.time.delayedCall(0, () => {
          this.waitForPointerRelease = false;
        });
      });
    }

    this.createUI(true);
  }

  createUI(rebuildChoices = false) {
    const scene = this.scene;
    const viewportWidth = scene.scale.width;
    const viewportHeight = scene.scale.height;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const margin = 16;

    this.panelWidth = Math.max(280, Math.min(700, viewportWidth - margin * 2));
    this.panelHeight = Math.max(250, Math.min(500, viewportHeight - margin * 2));
    const panelTop = centerY - this.panelHeight / 2;

    this.objects.push(
      scene.add.rectangle(
        centerX,
        centerY,
        this.panelWidth,
        this.panelHeight,
        0x111111,
        0.95
      ).setDepth(1000).setScrollFactor(0)
    );

    const title = scene.add.text(
      centerX,
      panelTop + 42,
      `LEVEL ${scene.player.level}`,
      {
        fontFamily: "sans-serif",
        fontSize: "40px",
        color: "#ffffff",
        align: "center",
      }
    ).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
    this.objects.push(title);

    const subtitle = scene.add.text(
      centerX,
      panelTop + 88,
      "Choose an upgrade",
      {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        align: "center",
      }
    ).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
    this.objects.push(subtitle);

    if (rebuildChoices || this.choices.length === 0) {
      this.choices = this.buildChoices();
    }

    const cardLayout = this.getCardLayout(this.choices.length);
    this.cards = [];

    this.choices.forEach((choice, index) => {
      const layout = cardLayout[index];
      if (!layout) return;
      const card = new UpgradeCard(
        scene,
        choice,
        layout.x,
        layout.y,
        layout.width,
        layout.height,
        () => this.selectChoice(choice, card)
      );
      this.cards.push(card);
    });
  }

  buildChoices() {
    return getLevelUpChoices(this.scene.player, 5);
  }

  selectChoice(choice, selectedCard) {
    if (this.isSelecting || this.waitForPointerRelease) return;
    this.isSelecting = true;

    console.log("Level-up choice", choice.title, choice.tierLabel);
    this.cards.forEach(card => {
      if (card === selectedCard) card.animateSelected();
      else card.animateDeselected();
    });

    this.scene.time.delayedCall(300, () => {
      const worldScene = this.scene.gameScene ?? this.scene;
      choice.apply(worldScene.player);
      this.close();
      this.scene.time.delayedCall(0, () => {
        worldScene.player.completeLevelUp();
      });
    });
  }

  destroyUI() {
    this.cards.forEach(card => card?.destroy());
    this.cards = [];
    this.objects.forEach(object => object?.destroy());
    this.objects = [];
  }

  handleResize() {
    if (!this.isOpen || this.isSelecting) return;
    this.destroyUI();
    this.createUI(false);
  }

  close() {
    if (!this.isOpen) return;

    this.destroyUI();
    this.isSelecting = false;
    this.isOpen = false;
    this.waitForPointerRelease = false;
    this.scene.isLevelUpOpen = false;
    const worldScene = this.scene.gameScene ?? this.scene;
    worldScene.isLevelUpOpen = false;
    worldScene.matter.world.resume();
  }

  getCardLayout(count) {
    if (count <= 0) return [];

    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const panelLeft = centerX - this.panelWidth / 2;
    const panelTop = centerY - this.panelHeight / 2;
    const horizontalPadding = Math.min(32, this.panelWidth * 0.06);
    const availableWidth = this.panelWidth - horizontalPadding * 2;

    let columns = count <= 4 ? count : 3;
    if (this.panelWidth < 410) columns = Math.min(2, count);
    if (this.panelWidth < 300) columns = 1;

    const rows = Math.ceil(count / columns);
    const gap = this.panelWidth < 480 ? 10 : 16;
    const cardWidth = Math.max(
      92,
      Math.min(180, (availableWidth - gap * (columns - 1)) / columns)
    );

    const headerHeight = Math.min(132, this.panelHeight * 0.28);
    const bottomPadding = 18;
    const verticalGap = 12;
    const availableCardHeight = Math.max(
      72,
      this.panelHeight - headerHeight - bottomPadding - verticalGap * (rows - 1)
    );
    const cardHeight = Math.min(
      rows === 1 ? 220 : 180,
      availableCardHeight / rows
    );

    const gridHeight = rows * cardHeight + (rows - 1) * verticalGap;
    const gridTop = panelTop + headerHeight +
      Math.max(0, (this.panelHeight - headerHeight - bottomPadding - gridHeight) / 2);

    const positions = [];
    for (let row = 0; row < rows; row++) {
      const firstIndex = row * columns;
      const itemsInRow = Math.min(columns, count - firstIndex);
      const rowWidth = itemsInRow * cardWidth + (itemsInRow - 1) * gap;
      const rowStartX = centerX - rowWidth / 2 + cardWidth / 2;
      const y = gridTop + cardHeight / 2 + row * (cardHeight + verticalGap);

      for (let column = 0; column < itemsInRow; column++) {
        positions.push({
          x: rowStartX + column * (cardWidth + gap),
          y,
          width: cardWidth,
          height: cardHeight,
        });
      }
    }

    return positions;
  }
}
