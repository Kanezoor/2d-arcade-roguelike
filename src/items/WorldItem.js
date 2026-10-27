
export default class WorldItem {
  constructor(scene, item, x, y, footprint) {
    this.scene = scene;
    this.item = item;
    this.active = true;

    this.container = scene.add.container(x, y);
    this.container.setDepth(1);

    this.container.worldItem = this;

    const color = this.getItemColor();
    const cellSize = 22;
    const spacing = 24;

    const maxX = Math.max(
      ...footprint.map(([cellX]) => cellX)
    );

    const maxY = Math.max(
      ...footprint.map(([, cellY]) => cellY)
    );

    const widthInCells = maxX + 1;
    const heightInCells = maxY + 1;

    this.container.setSize(
      widthInCells * spacing,
      heightInCells * spacing
    );

    footprint.forEach(([cellX, cellY]) => {
      const tile = scene.add.rectangle(
        (cellX - (widthInCells - 1) / 2) * spacing,
        (cellY - (heightInCells - 1) / 2) * spacing,
        cellSize,
        cellSize,
        color,
        1
      ).setStrokeStyle(1, 0xffffff, 0.9);

      this.container.add(tile);
    });

    const initials = item.definition.name
      .split(/\s+/)
      .map(word => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const firstCell = footprint[0];

    const label = scene.add.text(
      (firstCell[0] - (widthInCells - 1) / 2) * spacing,
      (firstCell[1] - (heightInCells - 1) / 2) * spacing,
      initials,
      {
        fontFamily: "sans-serif",
        fontSize: "10px",
        color: "#ffffff"
      }
    ).setOrigin(0.5);

    this.container.add(label);
  }

  getItemColor() {
    switch (this.item.definition.category) {
      case "weaponModule":
        return 0x385e9d;

      case "consumable":
        return 0x39805c;

      case "questItem":
        return 0xa88132;

      default:
        return 0x666666;
    }
  }

  destroy() {
    if (!this.active) {
      return;
    }

    this.active = false;

    this.scene.worldItems.remove(
      this.container,
      false,
      false
    );

    this.container.destroy();
  }
}
