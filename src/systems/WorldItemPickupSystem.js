
export default class WorldItemPickupSystem {
  constructor(scene) {
    this.scene = scene;
    this.pickupRadius = 65;
    this.nearestWorldItem = null;

    this.pickupKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
    );

    this.feedbackMessage = "";
    this.feedbackUntil = 0;

    this.promptText = scene.add.text(
      scene.scale.width / 2,
      scene.scale.height - 45,
      "",
      {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#171717",
        padding: { x: 12, y: 8 },
        align: "center"
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1500)
      .setVisible(false);
  }

  update() {
    const scene = this.scene;

    if (
      scene.isGameOver ||
      scene.isInventoryOpen ||
      scene.isLevelUpOpen ||
      !scene.player?.sprite
    ) {
      this.nearestWorldItem = null;
      this.promptText.setVisible(false);
      return;
    }

    this.nearestWorldItem = this.findNearestWorldItem();

    if (
      Phaser.Input.Keyboard.JustDown(this.pickupKey) &&
      this.nearestWorldItem
    ) {
      const worldItem = this.nearestWorldItem;
      const itemName = this.getPickupName(worldItem);

      if (this.tryPickup(worldItem)) {
        this.showFeedback(`Picked up: ${itemName}`, 1000);
        this.nearestWorldItem = null;
      } else {
        this.showFeedback(
          worldItem.weapon
            ? "Could not equip weapon"
            : "Inventory full — make space",
          1400
        );
      }
    }

    if (scene.time.now < this.feedbackUntil) {
      this.promptText
        .setText(this.feedbackMessage)
        .setVisible(true);

      return;
    }

    if (!this.nearestWorldItem) {
      this.promptText.setVisible(false);
      return;
    }

    if (this.nearestWorldItem.weapon) {
      this.promptText.setText(
        this.getWeaponPickupPrompt(
          this.nearestWorldItem
        )
      );
    } else {
      const item = this.nearestWorldItem.item;
      const position = this.findInventoryPosition(item);

      this.promptText.setText(
        position
          ? `[E] Pick up: ${item.definition.name}`
          : `Inventory full: ${item.definition.name}`
      );
    }

    this.promptText.setVisible(true);
  }

  findNearestWorldItem() {
    const scene = this.scene;
    const playerSprite = scene.player.sprite;

    let nearest = null;
    let nearestDistance = this.pickupRadius;

    for (const container of scene.worldItems.getChildren()) {
      const worldItem = container.worldItem;

      if (!worldItem || !worldItem.active) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        playerSprite.x,
        playerSprite.y,
        container.x,
        container.y
      );

      if (distance <= nearestDistance) {
        nearest = worldItem;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  findInventoryPosition(item) {
    const inventory = this.scene.player.inventory;
    const startingRotation = item.rotation ?? 0;

    for (let offset = 0; offset < 4; offset++) {
      const rotation = inventory.normalizeRotation(
        startingRotation + offset
      );

      const position = inventory.findFirstFit(
        item,
        rotation
      );

      if (position) {
        return position;
      }
    }

    return null;
  }

  tryPickupWeapon(worldWeapon) {
    if (
      !worldWeapon?.active ||
      !worldWeapon.weapon
    ) {
      return false;
    }

    const player = this.scene.player;
    const slots = player.weaponSlots;
    const weapon = worldWeapon.weapon;

    if (slots.includes(weapon)) {
      return false;
    }

    let slotIndex = slots.findIndex(
      equippedWeapon => !equippedWeapon
    );

    const hasEmptySlot = slotIndex !== -1;

    if (!hasEmptySlot) {
      slotIndex = player.activeWeaponSlot;
    }

    if (
      !Number.isInteger(slotIndex) ||
      slotIndex < 0 ||
      slotIndex >= slots.length
    ) {
      return false;
    }

    const previousWeapon = slots[slotIndex] ?? null;
    let droppedWeapon = null;

    if (previousWeapon) {
      droppedWeapon = this.scene.createWorldWeapon(
        previousWeapon
      );

      if (!droppedWeapon) {
        return false;
      }
    }

    const equipped = player.setWeaponSlot(
      slotIndex,
      weapon
    );

    if (!equipped) {
      droppedWeapon?.destroy();
      return false;
    }

    if (hasEmptySlot) {
      player.selectWeaponSlot(slotIndex);
    }

    worldWeapon.destroy();

    return true;
  }

  tryPickup(worldItem) {
    if (!worldItem?.active) {
      return false;
    }

    if (worldItem.weapon) {
      return this.tryPickupWeapon(worldItem);
    }

    const inventory = this.scene.player.inventory;
    const item = worldItem.item;
    const position = this.findInventoryPosition(item);

    if (!position) {
      return false;
    }

    const added = inventory.addItem(
      item,
      position.x,
      position.y,
      position.rotation
    );

    if (!added) {
      return false;
    }

    worldItem.destroy();

    return true;
  }

  getPickupName(worldItem) {
    return (
      worldItem.weapon?.name ??
      worldItem.item?.definition?.name ??
      "Unknown item"
    );
  }

  getWeaponPickupPrompt(worldWeapon) {
    const player = this.scene.player;

    const emptySlotIndex = player.weaponSlots.findIndex(
      weapon => !weapon
    );

    if (emptySlotIndex !== -1) {
      return (
        `[E] Equip ${worldWeapon.weapon.name} ` +
        `(slot ${emptySlotIndex + 1})`
      );
    }

    const slotIndex = player.activeWeaponSlot;
    const equippedWeapon = player.weaponSlots[slotIndex];

    return (
      `[E] Replace ${equippedWeapon?.name ?? "Empty slot"} ` +
      `with ${worldWeapon.weapon.name} ` +
      `(slot ${slotIndex + 1})`
    );
  }

  showFeedback(message, duration) {
    this.feedbackMessage = message;
    this.feedbackUntil = this.scene.time.now + duration;
  }
}
