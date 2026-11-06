import { buildRoomEntranceGeometry } from "./RoomEntranceGeometry.js";

function getSegmentTransform(segment) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;

  return {
    x: (segment.start.x + segment.end.x) / 2,
    y: (segment.start.y + segment.end.y) / 2,
    length: Math.hypot(dx, dy),
    rotation: Math.atan2(dy, dx),
  };
}

/**
 * Materializes one RoomPort as Phaser/Matter objects.
 * Room-boundary geometry must leave the matching boundaryOpening clear;
 * RoomManager currently does this for rectangular vestibule ports.
 */
export default class RoomEntranceRuntime {
  constructor(scene, room, port, {
    exit,
    gateOpen = undefined,
    doorColor = 0xcc3333,
    exitAvailable = false,
    createEntrySensor = true,
  } = {}) {
    if (!scene?.add || !scene?.matter?.add) {
      throw new TypeError("RoomEntranceRuntime requires a Phaser scene with Matter enabled.");
    }

    this.scene = scene;
    this.room = room;
    this.port = port;
    this.geometry = buildRoomEntranceGeometry(room, port);
    this.vestibuleWalls = [];
    this.gatePanels = [];
    this.exitTrigger = null;
    this.outerExitBarrier = null;
    this.entrySensor = null;
    this.isPermanentlyLocked = Boolean(exit?.locked);
    this.exitAvailable = Boolean(exitAvailable && !this.isPermanentlyLocked);
    this.isDestroyed = false;

    this.createVestibuleWalls();
    this.createOuterExitBarrier();
    this.createGatePanels();

    if (this.port.gate) {
      const resolvedGateOpen = gateOpen ?? this.port.gate.initiallyOpen;
      this.setGateOpen(resolvedGateOpen);

      if (createEntrySensor && this.port.gate.closeOnEntry) {
        this.createEntrySensor();
      }
    }

    if (exit) {
      this.createExitTrigger(exit, doorColor);
    }
  }

  createStaticSegment(segment, thickness, color, alpha = 1) {
    const transform = getSegmentTransform(segment);
    const visual = this.scene.add.rectangle(
      transform.x,
      transform.y,
      transform.length + 3,
      thickness,
      color,
      alpha
    );

    this.scene.matter.add.gameObject(visual, { isStatic: true });
    visual.setRotation(transform.rotation);
    return visual;
  }

  createVestibuleWalls() {
    const vestibule = this.port.vestibule;
    if (!vestibule) return;

    this.geometry.vestibuleWalls.forEach(segment => {
      const wall = this.createStaticSegment(
        segment,
        vestibule.wallThickness,
        vestibule.wallColor
      );
      wall.isVestibuleWall = true;
      wall.portId = this.port.id;
      this.vestibuleWalls.push(wall);
    });
  }

  createOuterExitBarrier() {
    const segment = this.geometry.outerBarrier;
    const vestibule = this.port.vestibule;
    if (!segment || !vestibule) return;

    this.outerExitBarrier = this.createStaticSegment(
      segment,
      vestibule.wallThickness,
      0x777777,
      this.exitAvailable ? 0.12 : 1
    );
    this.outerExitBarrier.isOuterExitBarrier = true;
    this.outerExitBarrier.portId = this.port.id;
    if (this.outerExitBarrier.body) {
      this.outerExitBarrier.body.isSensor = this.exitAvailable;
    }
  }

  setExitAvailable(isAvailable) {
    this.exitAvailable = Boolean(isAvailable);
    if (this.outerExitBarrier?.active) {
      if (this.outerExitBarrier.body) {
        this.outerExitBarrier.body.isSensor = this.exitAvailable;
      }
      this.outerExitBarrier.setAlpha(this.exitAvailable ? 0.12 : 1);
    }
    if (this.exitTrigger) {
      this.exitTrigger.isLocked = this.isPermanentlyLocked || !this.exitAvailable;
      this.exitTrigger.setFillStyle(this.exitAvailable ? 0x00aa44 : 0xcc3333);
    }
    return this.exitAvailable;
  }

  openExitAfterRoomClear() {
    if (this.isPermanentlyLocked) return false;
    return this.setExitAvailable(true);
  }

  createGatePanels() {
    const gate = this.port.gate;
    if (!gate) return;

    this.geometry.gateSegments.forEach(segment => {
      const panel = this.createStaticSegment(
        segment,
        gate.thickness,
        gate.color
      );
      panel.isRoomGatePanel = true;
      panel.portId = this.port.id;
      this.gatePanels.push(panel);
    });
  }

  createEntrySensor() {
    const position = this.geometry.entrySensor;
    if (!position) return;

    this.entrySensor = this.scene.add.rectangle(
      position.x,
      position.y,
      position.width,
      position.height,
      0xffffff,
      0.001
    );
    this.scene.matter.add.gameObject(this.entrySensor, {
      isStatic: true,
      isSensor: true,
    });
    this.entrySensor.setRotation(position.rotation);
    this.entrySensor.isRoomGateEntry = true;
    this.entrySensor.portId = this.port.id;
  }

  createExitTrigger(exit, color) {
    const position = this.geometry.exitTrigger;
    this.exitTrigger = this.scene.add.rectangle(
      position.x,
      position.y,
      position.width,
      position.height,
      color,
      1
    );
    this.scene.matter.add.gameObject(this.exitTrigger, {
      isStatic: true,
      isSensor: true,
    });
    this.exitTrigger.setRotation(position.rotation);

    this.exitTrigger.isDoor = true;
    this.exitTrigger.doorDirection = exit.direction;
    this.exitTrigger.targetRoomId = exit.toRoomId;
    this.exitTrigger.connectionId = exit.connectionId;
    this.exitTrigger.portId = this.port.id;
    this.exitTrigger.isLocked = Boolean(exit.locked) || !this.exitAvailable;
  }

  setGateOpen(isOpen) {
    const open = Boolean(isOpen);

    for (const panel of this.gatePanels) {
      if (!panel?.active) continue;
      if (panel.body) {
        panel.body.isSensor = open;
      }
      panel.setAlpha(open ? this.port.gate.openAlpha : 1);
    }

    this.isGateOpen = open;
    return true;
  }

  closeGateAfterEntry() {
    if (!this.port.gate || !this.port.gate.closeOnEntry || !this.isGateOpen) {
      return false;
    }

    this.setGateOpen(false);
    this.entrySensor?.destroy();
    this.entrySensor = null;
    return true;
  }

  openGateAfterRoomClear() {
    if (!this.port.gate || !this.port.gate.openWhenRoomCleared) {
      return false;
    }

    this.setGateOpen(true);
    this.entrySensor?.destroy();
    this.entrySensor = null;
    return true;
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.entrySensor?.destroy();
    this.exitTrigger?.destroy();
    this.outerExitBarrier?.destroy();
    this.vestibuleWalls.forEach(object => object.destroy());
    this.gatePanels.forEach(object => object.destroy());

    this.entrySensor = null;
    this.exitTrigger = null;
    this.outerExitBarrier = null;
    this.vestibuleWalls = [];
    this.gatePanels = [];
  }
}
