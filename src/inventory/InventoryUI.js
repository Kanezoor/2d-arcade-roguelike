import InventoryItem from "./InventoryItem.js";
import { ITEM_DEFINITIONS } from "./ItemDefinitions.js";
import WeaponModuleFactory from "../weapons/modules/WeaponModuleFactory.js";

export default class InventoryUI {
  constructor(scene, inventory) {
    this.scene = scene;
    this.inventory = inventory;
    this.isOpen = false;
    this.objects = [];
    this.hoveredItemId = null;
    this.itemVisuals = new Map();
    this.equipmentSlotVisuals = [];

    this.gridX = 0;
    this.gridY = 0;
    this.cellSize = 42;

    this.dragState = null;
    this.dragPreviewGraphics = null;
    this.moduleSlotPress = null;
  }

  addObject(object, depth = 2000) {
    object.setDepth(depth);
    object.setScrollFactor(0);
    this.objects.push(object);
    return object;
  }

  open() {
    if (
      this.isOpen ||
      this.scene.isLevelUpOpen
    ) {
      return;
    }

    this.isOpen = true;
    this.scene.isInventoryOpen = true;
    this.scene.matter.world.pause();

    this.createUI();

    this.scene.input.on(
      "pointermove",
      this.handlePointerMove,
      this
    );

    this.scene.input.on(
      "pointerup",
      this.handlePointerUp,
      this
    );

    this.scene.input.keyboard.on(
      "keydown-R",
      this.handleRotateKey,
      this
    );

    this.scene.input.keyboard.on(
      "keydown-Q",
      this.handleDropKey,
      this
    );
  }

  close() {
    if (!this.isOpen) {
      return;
    }

    this.scene.input.off(
      "pointermove",
      this.handlePointerMove,
      this
    );

    this.scene.input.off(
      "pointerup",
      this.handlePointerUp,
      this
    );

    this.scene.input.keyboard.off(
      "keydown-R",
      this.handleRotateKey,
      this
    );

    this.scene.input.keyboard.off(
      "keydown-Q",
      this.handleDropKey,
      this
    );

    this.cancelDrag();

    this.objects.forEach(object => {
      object.destroy();
    });

    this.objects = [];
    this.itemVisuals.clear();
    this.moduleSlotPress = null;
    this.dragPreviewGraphics = null;
    this.hoveredItemId = null;
    this.isOpen = false;
    this.scene.isInventoryOpen = false;
    this.scene.matter.world.resume();
  }

  createUI() {
    const scene = this.scene;

    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;

    const panelWidth = 700;
    const panelHeight = 500;

    const panelLeft = centerX - panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;

    this.addObject(
      scene.add.rectangle(
        centerX,
        centerY,
        panelWidth,
        panelHeight,
        0x111111,
        0.97
      ),
      2000
    );

    this.addObject(
      scene.add.rectangle(
        centerX,
        centerY,
        panelWidth,
        panelHeight,
        0x000000,
        0
      ).setStrokeStyle(2, 0x888888),
      2001
    );

    this.addObject(
      scene.add.text(
        centerX,
        panelTop + 35,
        "INVENTORY",
        {
          fontFamily: "sans-serif",
          fontSize: "28px",
          color: "#ffffff"
        }
      ).setOrigin(0.5),
      2002
    );

    this.addObject(
      scene.add.text(
        centerX,
        panelTop + 68,
        "8 × 4 STORAGE",
        {
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: "#aaaaaa"
        }
      ).setOrigin(0.5),
      2002
    );

    this.createGrid(panelLeft + 28, panelTop + 130);

    this.createEquipmentPanel(
      panelLeft + 385,
      panelTop + 95
    );

    this.createDetailsPanel(
      panelLeft + 385,
      panelTop + 299
    );

    this.addObject(
      scene.add.text(
        centerX,
        panelTop + panelHeight - 22,
        "TAB — Close inventory",
        {
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: "#aaaaaa"
        }
      ).setOrigin(0.5),
      2002
    );
  }

  createEquipmentPanel(x, y) {
    this.addObject(
      this.scene.add.text(
        x + 4,
        y,
        "EQUIPPED WEAPONS",
        {
          fontFamily: "sans-serif",
          fontSize: "16px",
          color: "#ffffff"
        }
      ),
      2003
    );

    this.equipmentSlotVisuals = [];

    const cardWidth = 280;
    const cardHeight = 78;

    for (let slotIndex = 0; slotIndex < 2; slotIndex++) {
      const cardX = x;
      const cardY = y + 23 + slotIndex * 84;

      const background = this.addObject(
        this.scene.add.rectangle(
          cardX + cardWidth / 2,
          cardY + cardHeight / 2,
          cardWidth,
          cardHeight,
          0x202020,
          1
        ).setStrokeStyle(1, 0x666666),
        2002
      );

      background.setInteractive({
        useHandCursor: true
      });

      background.on("pointerdown", () => {
        this.scene.player.selectWeaponSlot(slotIndex);
        this.refreshEquipmentPanel();
      });

      const weaponName = this.addObject(
        this.scene.add.text(
          cardX + 10,
          cardY + 7,
          "",
          {
            fontFamily: "sans-serif",
            fontSize: "13px",
            color: "#ffffff"
          }
        ),
        2004
      );

      const activeLabel = this.addObject(
        this.scene.add.text(
          cardX + cardWidth - 10,
          cardY + 9,
          "",
          {
            fontFamily: "sans-serif",
            fontSize: "10px",
            color: "#8fc7ff"
          }
        ).setOrigin(1, 0),
        2004
      );

      const moduleCount = this.addObject(
        this.scene.add.text(
          cardX + 10,
          cardY + 30,
          "",
          {
            fontFamily: "sans-serif",
            fontSize: "10px",
            color: "#aaaaaa"
          }
        ),
        2004
      );

      const moduleSlots = [];

      for (let moduleIndex = 0; moduleIndex < 10; moduleIndex++) {
        const slotX = cardX + 10 + moduleIndex * 25;
        const slotY = cardY + 47;
        const slotSize = 18;

        const slotBackground = this.addObject(
          this.scene.add.rectangle(
            slotX + slotSize / 2,
            slotY + slotSize / 2,
            slotSize,
            slotSize,
            0x333333,
            1
          ).setStrokeStyle(1, 0x707070),
          2003
        );

        slotBackground.setInteractive({
          useHandCursor: true
        });

        slotBackground.on("pointerdown", pointer => {
          const weapon =
            this.scene.player.weaponSlots[slotIndex] ?? null;

          const module =
            weapon?.moduleSlots[moduleIndex] ?? null;

          if (!module) {
            return;
          }

          this.moduleSlotPress = {
            sourceWeaponSlotIndex: slotIndex,
            sourceModuleSlotIndex: moduleIndex,
            startX: pointer.x,
            startY: pointer.y,
            sDragging: false,
            background: slotBackground,
            label: slotLabel
          };
        });

        const slotLabel = this.addObject(
          this.scene.add.text(
            slotX + slotSize / 2,
            slotY + slotSize / 2,
            "",
            {
              fontFamily: "sans-serif",
              fontSize: "10px",
              color: "#ffffff",
              fontStyle: "bold",
              align: "center"
            }
          ).setOrigin(0.5),
          2004
        );

        moduleSlots.push({
            background: slotBackground,
            label: slotLabel,
            x: slotX,
            y: slotY,
            size: slotSize
        });
      }

      this.equipmentSlotVisuals.push({
        slotIndex,
        background,
        weaponName,
        activeLabel,
        moduleCount,
        moduleSlots
      });
    }

    this.refreshEquipmentPanel();
  }

  refreshEquipmentPanel() {
    const player = this.scene.player;

    if (!player) {
      return;
    }

    const shortLabels = {
      precision: "P",
      acceleratedRounds: "A",
      heavyRounds: "H",
      penetrator: "N"
    };

    this.equipmentSlotVisuals.forEach(visual => {
      const slotIndex = visual.slotIndex;
      const weapon = player.weaponSlots[slotIndex] ?? null;
      const isActive = player.activeWeaponSlot === slotIndex;

      visual.background.setFillStyle(
        isActive ? 0x263a50 : 0x202020,
        1
      );

      visual.background.setStrokeStyle(
        isActive ? 2 : 1,
        isActive ? 0x8fc7ff : 0x666666,
        1
      );

      visual.weaponName.setText(
        weapon
          ? `${slotIndex + 1}. ${weapon.name}`
          : `${slotIndex + 1}. EMPTY SLOT`
      );

      visual.weaponName.setColor(
        weapon ? "#ffffff" : "#888888"
      );

      visual.activeLabel.setText(
        isActive ? "ACTIVE" : ""
      );

      const installedCount = weapon?.modules?.length ?? 0;
      const capacity = weapon?.moduleSlots?.length ?? 0;

      visual.moduleCount.setText(
        weapon
          ? `MODULES ${installedCount}/${capacity}  ·  MAX 10`
          : "NO WEAPON EQUIPPED"
      );

      visual.moduleSlots.forEach((slotVisual, moduleIndex) => {
        const isUnlocked = Boolean(
          weapon && moduleIndex < capacity
        );

        const module = isUnlocked
          ? weapon.moduleSlots[moduleIndex]
          : null;

        let fillColor;
        let borderColor;
        let labelColor;
        let label;

        if (!isUnlocked) {
          fillColor = 0x141414;
          borderColor = 0x333333;
          labelColor = "#555555";
          label = "×";
        } else if (module) {
          fillColor = 0x385e9d;
          borderColor = 0x8fc7ff;
          labelColor = "#ffffff";

          label =
            shortLabels[module.id] ??
            (module.name
              ? module.name.charAt(0).toUpperCase()
              : "M");
        } else {
          fillColor = 0x333333;
          borderColor = 0x707070;
          labelColor = "#aaaaaa";
          label = "+";
        }

        slotVisual.background.setFillStyle(fillColor, 1);
        slotVisual.background.setStrokeStyle(
          1,
          borderColor,
          1
        );

        slotVisual.label.setText(label);
        slotVisual.label.setColor(labelColor);
      });
    });
  }

  createGrid(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.cellSize = 42;
    const cellSize = this.cellSize;
    this.itemVisuals.clear();

    for (let row = 0; row < this.inventory.height; row++) {
      for (let column = 0; column < this.inventory.width; column++) {
        const x = gridX + column * cellSize;
        const y = gridY + row * cellSize;

        this.addObject(
          this.scene.add.rectangle(
            x + cellSize / 2,
            y + cellSize / 2,
            cellSize - 3,
            cellSize - 3,
            0x292929,
            1
          ).setStrokeStyle(1, 0x666666),
          2002
        );
      }
    }

    this.renderItems(gridX, gridY, cellSize);
  }

  renderItems(gridX, gridY, cellSize) {
    for (const placement of this.inventory.getItems()) {
      const { item, x, y } = placement;

      const footprint = this.inventory.getRotatedFootprint(item);
      const color = this.getItemColor(item);

      const visuals = {
        cells: [],
        label: null
      };

      footprint.forEach(([offsetX, offsetY]) => {
        const cellX = x + offsetX;
        const cellY = y + offsetY;

        const cell = this.addObject(
          this.scene.add.rectangle(
            gridX + cellX * cellSize + cellSize / 2,
            gridY + cellY * cellSize + cellSize / 2,
            cellSize - 5,
            cellSize - 5,
            color,
            1
          ).setStrokeStyle(1, 0xffffff, 0.7),
          2003
        );

        cell.setInteractive({
          useHandCursor: true
        });

        cell.on("pointerover", () => {
          this.showItemDetails(item);
        });

        cell.on("pointerout", () => {
          this.clearItemDetails(item);
        });

        cell.on("pointerdown", pointer => {
          const currentCellX = Math.floor(
            (pointer.x - this.gridX) / this.cellSize
          );

          const currentCellY = Math.floor(
            (pointer.y - this.gridY) / this.cellSize
          );

          this.startDrag(
            item,
            currentCellX,
            currentCellY,
            pointer
          );
        });

        visuals.cells.push(cell);
      });

      // A short label identifies the item in the grid.
      const firstCell = footprint[0];
      const initials = item.definition.name
        .split(/\s+/)
        .map(word => word[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();

      visuals.label = this.addObject(
        this.scene.add.text(
          gridX + (x + firstCell[0]) * cellSize + cellSize / 2,
          gridY + (y + firstCell[1]) * cellSize + cellSize / 2,
          initials,
          {
            fontFamily: "sans-serif",
            fontSize: "11px",
            color: "#ffffff",
            align: "center"
          }
        ).setOrigin(0.5),
        2004
      );

      this.itemVisuals.set(
        item.instanceId,
        visuals
      );
    }
  }

  
startDrag(item, cellX, cellY, pointer) {
  if (!this.isOpen || this.dragState) {
    return;
  }

  const placement = this.inventory.getPlacement(
    item.instanceId
  );

  const visuals = this.itemVisuals.get(
    item.instanceId
  );

  const footprint = this.inventory.getRotatedFootprint(item);

  const anchorIndex = footprint.findIndex(
    ([offsetX, offsetY]) =>
      offsetX === cellX - placement.x &&
      offsetY === cellY - placement.y
  );

  if (!placement || !visuals) {
    return;
  }

  this.dragState = {
    item,
    instanceId: item.instanceId,

    offsetX: cellX - placement.x,
    offsetY: cellY - placement.y,

    targetX: placement.x,
    targetY: placement.y,
    isValid: true,
    targetRotation: item.rotation,
    anchorIndex: anchorIndex >= 0 ? anchorIndex : 0,
    pointerX: pointer.x,
    pointerY: pointer.y,
  };

  visuals.cells.forEach(cell => {
    cell.setAlpha(0.4);
  });

  visuals.label.setAlpha(0.4);

  if (!this.dragPreviewGraphics) {
    this.dragPreviewGraphics = this.addObject(
      this.scene.add.graphics(),
      2005
    );
  }

  this.showItemDetails(item);
  this.updateDragPreview(pointer);
}

getModuleSlotAtPointer(pointer) {
  for (const weaponVisual of this.equipmentSlotVisuals) {
    for (
      let moduleIndex = 0;
      moduleIndex < weaponVisual.moduleSlots.length;
      moduleIndex++
    ) {
      const slot = weaponVisual.moduleSlots[moduleIndex];

      const isInside =
        pointer.x >= slot.x &&
        pointer.x <= slot.x + slot.size &&
        pointer.y >= slot.y &&
        pointer.y <= slot.y + slot.size;

      if (isInside) {
        return {
          weaponSlotIndex: weaponVisual.slotIndex,
          moduleSlotIndex: moduleIndex
        };
      }
    }
  }

  return null;
}

installModuleFromInventory(
  item,
  weaponSlotIndex,
  moduleSlotIndex
) {
  if (
    item.definition.category !== "weaponModule"
  ) {
    return false;
  }

  const weapon =
    this.scene.player.weaponSlots[weaponSlotIndex] ?? null;

  if (!weapon) {
    return false;
  }

  if (
    moduleSlotIndex < 0 ||
    moduleSlotIndex >= weapon.moduleSlots.length ||
    weapon.moduleSlots[moduleSlotIndex] !== null
  ) {
    return false;
  }

  const module = WeaponModuleFactory.create(
    item.definition.moduleId,
    weapon
  );

  if (!module) {
    return false;
  }

  module.inventoryItem = item;

  const installed = weapon.installModule(
    module,
    moduleSlotIndex
  );

  if (!installed) {
    return false;
  }

  const removedItem = this.inventory.removeItem(
    item.instanceId
  );

  if (!removedItem) {
    weapon.removeModuleAt(moduleSlotIndex);
    return false;
  }

  this.removeItemVisuals(item.instanceId);
  this.clearItemDetails(item);
  this.refreshEquipmentPanel();

  return true;
}

removeModuleToInventory(
  weaponSlotIndex,
  moduleSlotIndex
) {
  const weapon =
    this.scene.player.weaponSlots[weaponSlotIndex] ?? null;

  if (!weapon) {
    return false;
  }

  const module = weapon.moduleSlots[moduleSlotIndex];

  if (!module) {
    return false;
  }

  const definition =
    module.inventoryItem?.definition ??
    ITEM_DEFINITIONS[module.id];

  if (!definition) {
    console.warn(
      `No inventory item definition found for module "${module.id}".`
    );

    return false;
  }

  const item =
    module.inventoryItem ?? new InventoryItem(definition);

  const position = this.inventory.findFirstFit(item);

  if (!position) {
    this.detailName.setText("INVENTORY FULL");
    this.detailCategory.setText("MODULE");
    this.detailDescription.setText(
      "Make room in the inventory before removing this module."
    );
    this.detailFootprint.setText("");

    return false;
  }

  const removedModule = weapon.removeModuleAt(
    moduleSlotIndex
  );

  if (!removedModule) {
    return false;
  }

  const added = this.inventory.addItem(
    item,
    position.x,
    position.y,
    position.rotation
  );


  if (!added) {
    weapon.installModule(
      removedModule,
      moduleSlotIndex
    );

    return false;
  }

  this.refreshGridItems();
  this.refreshEquipmentPanel();

  return true;
}

moveInstalledModule(
  sourceWeaponSlotIndex,
  sourceModuleSlotIndex,
  targetWeaponSlotIndex,
  targetModuleSlotIndex
) {
  const player = this.scene.player;

  const sourceWeapon =
    player.weaponSlots[sourceWeaponSlotIndex] ?? null;

  const targetWeapon =
    player.weaponSlots[targetWeaponSlotIndex] ?? null;

  if (!sourceWeapon || !targetWeapon) {
    return false;
  }

  const sourceModule =
    sourceWeapon.moduleSlots[sourceModuleSlotIndex];

  if (
    !sourceModule ||
    !Number.isInteger(targetModuleSlotIndex) ||
    targetModuleSlotIndex < 0 ||
    targetModuleSlotIndex >= targetWeapon.moduleSlots.length ||
    targetWeapon.moduleSlots[targetModuleSlotIndex] !== null
  ) {
    return false;
  }

  if (sourceWeapon === targetWeapon) {
    const moved = sourceWeapon.moveModule(
      sourceModuleSlotIndex,
      targetModuleSlotIndex
    );

    if (moved) {
      this.refreshEquipmentPanel();
    }

    return moved;
  }

  const removedModule = sourceWeapon.removeModuleAt(
    sourceModuleSlotIndex
  );

  if (!removedModule) {
    return false;
  }

  const transferredModule = WeaponModuleFactory.create(
    removedModule.id,
    targetWeapon
  );

  if (!transferredModule) {
    sourceWeapon.installModule(
      removedModule,
      sourceModuleSlotIndex
    );

    return false;
  }

  transferredModule.inventoryItem =
    removedModule.inventoryItem;

  const installed = targetWeapon.installModule(
    transferredModule,
    targetModuleSlotIndex
  );

  if (!installed) {
    sourceWeapon.installModule(
      removedModule,
      sourceModuleSlotIndex
    );

    this.refreshEquipmentPanel();

    return false;
  }

  this.refreshEquipmentPanel();

  return true;
}

refreshGridItems() {
  const existingItemIds = [
    ...this.itemVisuals.keys()
  ];

  existingItemIds.forEach(instanceId => {
    this.removeItemVisuals(instanceId);
  });

  this.renderItems(
    this.gridX,
    this.gridY,
    this.cellSize
  );
}

handlePointerMove(pointer) {
  if (this.moduleSlotPress) {
    const press = this.moduleSlotPress;

    const distance = Math.hypot(
      pointer.x - press.startX,
      pointer.y - press.startY
    );

    if (distance >= 6) {
      press.isDragging = true;
    }

    if (press.isDragging) {
      press.background.setAlpha(0.45);
      press.label.setAlpha(0.45);
    }
  }

  if (!this.dragState) {
    return;
  }

  this.updateDragPreview(pointer);
}

handlePointerUp(pointer) {
  if (this.moduleSlotPress) {
    const press = this.moduleSlotPress;

    this.moduleSlotPress = null;

    press.background.setAlpha(1);
    press.label.setAlpha(1);

    if (press.isDragging) {
      const target = this.getModuleSlotAtPointer(pointer);

      if (target) {
        this.moveInstalledModule(
          press.sourceWeaponSlotIndex,
          press.sourceModuleSlotIndex,
          target.weaponSlotIndex,
          target.moduleSlotIndex
        );
      }
    } else {
      this.removeModuleToInventory(
        press.sourceWeaponSlotIndex,
        press.sourceModuleSlotIndex
      );
    }

    return;
  }

  if (!this.dragState) {
    return;
  }

  const drag = this.dragState;

  const moduleTarget = this.getModuleSlotAtPointer(
    pointer
  );

  if (
    moduleTarget &&
    drag.item.definition.category === "weaponModule"
  ) {
    this.installModuleFromInventory(
      drag.item,
      moduleTarget.weaponSlotIndex,
      moduleTarget.moduleSlotIndex
    );

    this.cancelDrag();
    return;
  }

  this.updateDragPreview(pointer);

  if (drag.isValid) {
    const moved = this.inventory.moveItem(
      drag.instanceId,
      drag.targetX,
      drag.targetY,
      drag.targetRotation
    );

    if (moved) {
      this.updateItemVisuals(drag.item);
    }
  }

  this.cancelDrag();
}


handleDropKey(event) {
  if (
    !this.isOpen ||
    this.dragState ||
    !this.hoveredItemId
  ) {
    return;
  }

  const placement = this.inventory.getPlacement(
    this.hoveredItemId
  );

  if (!placement) {
    return;
  }

  event?.preventDefault();

  const item = placement.item;

  const worldItem = this.scene.createWorldItem(item);

  if (!worldItem) {
    return;
  }

  const removedItem = this.inventory.removeItem(
    item.instanceId
  );

  if (!removedItem) {
    worldItem.destroy();
    return;
  }

  this.clearItemDetails(removedItem);
  this.removeItemVisuals(removedItem.instanceId);
}

removeItemVisuals(instanceId) {
  const visuals = this.itemVisuals.get(instanceId);

  if (!visuals) {
    return;
  }

  const objects = [
    ...visuals.cells,
    visuals.label
  ];

  objects.forEach(object => {
    const index = this.objects.indexOf(object);

    if (index !== -1) {
      this.objects.splice(index, 1);
    }

    if (object?.active) {
      object.destroy();
    }
  });

  this.itemVisuals.delete(instanceId);
}


handleRotateKey(event) {
  if (!this.dragState || event?.repeat) {
    return;
  }

  event?.preventDefault();
  this.rotateDraggedItem();
}

rotateDraggedItem() {
  const drag = this.dragState;

  if (!drag) {
    return;
  }

  const nextRotation = this.inventory.normalizeRotation(
    drag.targetRotation + 1
  );

  const rotatedFootprint =
    this.inventory.getRotatedFootprint(
      drag.item,
      nextRotation
    );

  const anchor =
    rotatedFootprint[drag.anchorIndex] ??
    rotatedFootprint[0];

  drag.targetRotation = nextRotation;
  drag.offsetX = anchor[0];
  drag.offsetY = anchor[1];

  this.updateDragPreview({
    x: drag.pointerX,
    y: drag.pointerY
  });
}

updateDragPreview(pointer) {
  const drag = this.dragState;
  const graphics = this.dragPreviewGraphics;

  if (!drag || !graphics) {
    return;
  }

  drag.pointerX = pointer.x;
  drag.pointerY = pointer.y;

  graphics.clear();

  const gridRight =
    this.gridX +
    this.inventory.width * this.cellSize;

  const gridBottom =
    this.gridY +
    this.inventory.height * this.cellSize;

  const pointerIsInsideGrid =
    pointer.x >= this.gridX &&
    pointer.x < gridRight &&
    pointer.y >= this.gridY &&
    pointer.y < gridBottom;

  if (!pointerIsInsideGrid) {
    drag.isValid = false;
    return;
  }

  const pointerColumn = Math.floor(
    (pointer.x - this.gridX) / this.cellSize
  );

  const pointerRow = Math.floor(
    (pointer.y - this.gridY) / this.cellSize
  );

  drag.targetX = pointerColumn - drag.offsetX;
  drag.targetY = pointerRow - drag.offsetY;

  drag.isValid = this.inventory.canPlace(
    drag.item,
    drag.targetX,
    drag.targetY,
    drag.targetRotation,
    drag.instanceId
  );

  const color = drag.isValid
    ? 0x55dd88
    : 0xff5555;

  graphics.fillStyle(color, 0.45);
  graphics.lineStyle(2, color, 0.95);

  const footprint = this.inventory.getRotatedFootprint(
    drag.item,
    drag.targetRotation
  );

  footprint.forEach(([offsetX, offsetY]) => {
    const x =
      this.gridX +
      (drag.targetX + offsetX) * this.cellSize + 2;

    const y =
      this.gridY +
      (drag.targetY + offsetY) * this.cellSize + 2;

    graphics.fillRect(
      x,
      y,
      this.cellSize - 5,
      this.cellSize - 5
    );

    graphics.strokeRect(
      x,
      y,
      this.cellSize - 5,
      this.cellSize - 5
    );
  });
}

updateItemVisuals(item) {
  const placement = this.inventory.getPlacement(
    item.instanceId
  );

  const visuals = this.itemVisuals.get(
    item.instanceId
  );

  if (!placement || !visuals) {
    return;
  }

  const footprint = this.inventory.getRotatedFootprint(
    item
  );

  footprint.forEach(([offsetX, offsetY], index) => {
    const cell = visuals.cells[index];

    if (!cell) {
      return;
    }

    const cellX = placement.x + offsetX;
    const cellY = placement.y + offsetY;

    cell.setPosition(
      this.gridX +
        cellX * this.cellSize +
        this.cellSize / 2,
      this.gridY +
        cellY * this.cellSize +
        this.cellSize / 2
    );
  });

  const firstCell = footprint[0];

  visuals.label.setPosition(
    this.gridX +
      (placement.x + firstCell[0]) *
        this.cellSize +
      this.cellSize / 2,
    this.gridY +
      (placement.y + firstCell[1]) *
        this.cellSize +
      this.cellSize / 2
  );
}

cancelDrag() {
  if (this.dragState) {
    const visuals = this.itemVisuals.get(
      this.dragState.instanceId
    );

    if (visuals) {
      visuals.cells.forEach(cell => {
        cell.setAlpha(1);
      });

      visuals.label.setAlpha(1);
    }
  }

  this.dragState = null;

  if (this.dragPreviewGraphics) {
    this.dragPreviewGraphics.clear();
  }
}

  createDetailsPanel(x, y) {
    this.addObject(
      this.scene.add.rectangle(
        x + 140,
        y + 71,
        280,
        142,
        0x242424,
        1
      ).setStrokeStyle(1, 0x666666),
      2002
    );

    this.detailName = this.addObject(
      this.scene.add.text(
        x + 12,
        y + 8,
        "ITEM DETAILS",
        {
          fontFamily: "sans-serif",
          fontSize: "18px",
          color: "#ffffff",
          wordWrap: { width: 250 }
        }
      ),
      2003
    );

    this.detailCategory = this.addObject(
      this.scene.add.text(
        x + 12,
        y + 32,
        "",
        {
          fontFamily: "sans-serif",
          fontSize: "12px",
          color: "#aaaaaa"
        }
      ),
      2003
    );

    this.detailDescription = this.addObject(
      this.scene.add.text(
        x + 12,
        y + 54,
        "Hover over an item to inspect it.",
        {
          fontFamily: "sans-serif",
          fontSize: "13px",
          color: "#dddddd",
          wordWrap: { width: 250 },
          lineSpacing: 3
        }
      ),
      2003
    );

    this.detailFootprint = this.addObject(
      this.scene.add.text(
        x + 12,
        y + 118,
        "",
        {
          fontFamily: "sans-serif",
          fontSize: "12px",
          color: "#aaaaaa"
        }
      ),
      2003
    );
  }

  showItemDetails(item) {
    this.hoveredItemId = item.instanceId;

    this.detailName.setText(item.definition.name);
    this.detailCategory.setText(
      item.definition.category.toUpperCase()
    );
    this.detailDescription.setText(
      item.definition.description
    );

    const footprint = this.inventory.getRotatedFootprint(item);

    this.detailFootprint.setText(
      `Size: ${footprint.length} cells`
    );
  }

  clearItemDetails(item) {
    if (this.hoveredItemId !== item.instanceId) {
      return;
    }

    this.hoveredItemId = null;

    this.detailName.setText("ITEM DETAILS");
    this.detailCategory.setText("");
    this.detailDescription.setText(
      "Hover over an item to inspect it."
    );
    this.detailFootprint.setText("");
  }

  getItemColor(item) {
    switch (item.definition.category) {
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
}