export default class WorldWeapon {
  constructor(scene, weapon, x, y) {
    this.scene = scene;
    this.weapon = weapon;
    this.active = true;

    this.container = scene.add.container(x, y);
    this.container.setDepth(1);
    this.container.setSize(58, 38);

    this.container.worldItem = this;

    const color = this.getWeaponColor();

    const body = scene.add.rectangle(
      -3, 0, 30, 12, color, 1
    ).setStrokeStyle(1, 0xffffff);

    const grip = scene.add.rectangle(
      -5, 8, 7, 8, 0x444444, 1
    );

    const barrel = scene.add.rectangle(
      18, -2, 13, 5, color, 1
    );

    const label = scene.add.text(
      0,
      19,
      weapon.name,
      {
        fontFamily: "sans-serif",
        fontSize: "10px",
        color: "#ffffff",
        backgroundColor: "#202020",
        padding: { x: 3, y: 2 }
      }
    ).setOrigin(0.5);

    this.container.add([
      body,
      grip,
      barrel,
      label
    ]);
  }

  getWeaponColor() {
    switch (this.weapon.id) {
      case "basic_gun":
        return 0x6688aa;

      case "shotgun":
        return 0xc58a45;

      case "laser_gun":
        return 0x43a7a7;

      default:
        return 0x777777;
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