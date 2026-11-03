const VALID_DIRECTIONS = new Set(["north", "east", "south", "west"]);

/**
 * Calculates the screen-space positions used for a directional room slide.
 * The outgoing room moves opposite the direction of travel; the incoming
 * room starts one viewport away and moves into the viewport.
 */
export function getRoomSlideOffsets(
  direction,
  width,
  height,
  originX = 0,
  originY = 0
) {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new TypeError(`Unsupported room direction "${direction}".`);
  }

  if (!Number.isFinite(width) || width <= 0) {
    throw new TypeError("Viewport width must be a positive number.");
  }

  if (!Number.isFinite(height) || height <= 0) {
    throw new TypeError("Viewport height must be a positive number.");
  }

  if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
    throw new TypeError("Viewport origin must contain finite coordinates.");
  }

  let outgoingX = 0;
  let outgoingY = 0;

  switch (direction) {
    case "east":
      outgoingX = -width;
      break;
    case "west":
      outgoingX = width;
      break;
    case "south":
      outgoingY = -height;
      break;
    case "north":
      outgoingY = height;
      break;
  }

  return {
    outgoingStart: { x: originX, y: originY },
    outgoingEnd: {
      x: originX + outgoingX,
      y: originY + outgoingY,
    },
    incomingStart: {
      x: originX - outgoingX,
      y: originY - outgoingY,
    },
    incomingEnd: { x: originX, y: originY },
  };
}

/**
 * Produces a short directional slide between two room views.
 * The current room is captured, the destination is loaded behind it, and
 * both captured views slide together. The live destination room is revealed
 * when the animation finishes.
 */
export default class RoomTransitionController {
  constructor(scene, { duration = 260, ease = "Sine.easeInOut" } = {}) {
    if (!scene) {
      throw new TypeError("RoomTransitionController requires a Phaser scene.");
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new TypeError("Transition duration must be a positive number.");
    }

    this.scene = scene;
    this.duration = duration;
    this.ease = ease;
    this.isTransitioning = false;
    this.snapshotDepth = 10000;
  }

  getHudObjects() {
    const scene = this.scene;

    return [
      scene.scoreText,
      scene.uiGraphics,
      scene.weaponNameText,
      scene.weaponAmmoText,
      scene.weaponReloadText,
    ].filter(object => object && object.active && object.setDepth);
  }

  captureRoomSnapshot(backgroundColor) {
    const scene = this.scene;
    const camera = scene.cameras.main;
    const width = camera.width || scene.scale.width;
    const height = camera.height || scene.scale.height;

    const snapshot = scene.add.renderTexture(
      camera.x,
      camera.y,
      width,
      height
    );

    snapshot
      .setOrigin(0, 0)
      .setScrollFactor(0, 0)
      .setDepth(this.snapshotDepth);

    snapshot.isRoomTransitionSnapshot = true;
    snapshot.fill(backgroundColor ?? 0x000000);

    // Match the main camera's view while drawing the room into the texture.
    snapshot.camera.setScroll(camera.scrollX, camera.scrollY);
    snapshot.camera.setZoom(camera.zoom);

    const excludedObjects = new Set([
      snapshot,
      ...this.getHudObjects(),
    ]);

    const worldObjects = scene.children.list.filter(object => (
      object &&
      object.active !== false &&
      object.visible !== false &&
      !object.isRoomTransitionSnapshot &&
      !excludedObjects.has(object) &&
      !(object.scrollFactorX === 0 && object.scrollFactorY === 0)
    ));

    snapshot.draw(worldObjects);

    return snapshot;
  }

  raiseHudAboveSnapshots() {
    const hudObjects = this.getHudObjects();
    const previousDepths = hudObjects.map(object => ({
      object,
      depth: object.depth,
    }));

    hudObjects.forEach(object => {
      object.setDepth(this.snapshotDepth + 1);
    });

    return previousDepths;
  }

  restoreHudDepths(previousDepths) {
    previousDepths.forEach(({ object, depth }) => {
      if (object?.active && object.setDepth) {
        object.setDepth(depth);
      }
    });
  }

  async animateSnapshots(outgoingSnapshot, incomingSnapshot, direction) {
    const scene = this.scene;
    const camera = scene.cameras.main;
    const width = camera.width || scene.scale.width;
    const height = camera.height || scene.scale.height;
    const originX = camera.x;
    const originY = camera.y;

    const positions = getRoomSlideOffsets(
      direction,
      width,
      height,
      originX,
      originY
    );

    outgoingSnapshot.setPosition(
      positions.outgoingStart.x,
      positions.outgoingStart.y
    );

    incomingSnapshot.setPosition(
      positions.incomingStart.x,
      positions.incomingStart.y
    );

    await new Promise(resolve => {
      let completedTweens = 0;
      const onTweenComplete = () => {
        completedTweens += 1;

        if (completedTweens === 2) {
          resolve();
        }
      };

      scene.tweens.add({
        targets: outgoingSnapshot,
        x: positions.outgoingEnd.x,
        y: positions.outgoingEnd.y,
        duration: this.duration,
        ease: this.ease,
        onComplete: onTweenComplete,
      });

      scene.tweens.add({
        targets: incomingSnapshot,
        x: positions.incomingEnd.x,
        y: positions.incomingEnd.y,
        duration: this.duration,
        ease: this.ease,
        onComplete: onTweenComplete,
      });
    });
  }

  async transition({
    direction,
    oldBackground,
    loadDestination,
    getNewBackground,
  } = {}) {
    if (this.isTransitioning) {
      return false;
    }

    if (!VALID_DIRECTIONS.has(direction)) {
      throw new TypeError(`Unsupported room direction "${direction}".`);
    }

    if (typeof loadDestination !== "function") {
      throw new TypeError("transition requires a loadDestination callback.");
    }

    const scene = this.scene;
    const player = scene.player;
    let outgoingSnapshot = null;
    let incomingSnapshot = null;
    let previousHudDepths = [];
    let matterPaused = false;
    let previousMatterDebugState = null;

    this.isTransitioning = true;
    scene.isRoomTransitioning = true;

    try {
      player?.sprite?.setVelocity(0, 0);
      player?.activeWeapon?.release?.();
      player?.activeWeapon?.stop?.();

      if (player) {
        player.blockFireUntilRelease = true;
        player.fireButtonDown = Boolean(scene.input?.activePointer?.isDown);
      }

      const matterWorld = scene.matter?.world;

      if (matterWorld) {
        previousMatterDebugState = {
        drawDebug: matterWorld.drawDebug,
        graphicVisible: matterWorld.debugGraphic?.visible ?? false,
      };

      matterWorld.drawDebug = false;
      matterWorld.debugGraphic?.setVisible(false);
}
      // The Matter world is paused only for the short visual transition.
      scene.matter?.world?.pause?.();
      matterPaused = Boolean(scene.matter?.world?.resume);

      // Capture the outgoing room before the room manager destroys its objects.
      outgoingSnapshot = this.captureRoomSnapshot(oldBackground);

      const loaded = loadDestination();
      if (loaded === false) {
        throw new Error("The destination room could not be loaded.");
      }

      player?.sprite?.setVelocity(0, 0);

      // Capture the newly loaded room, including its background and player entry position.
      incomingSnapshot = this.captureRoomSnapshot(
        getNewBackground?.() ?? 0x000000
      );

      previousHudDepths = this.raiseHudAboveSnapshots();

      await this.animateSnapshots(
        outgoingSnapshot,
        incomingSnapshot,
        direction
      );

      return true;
    } finally {
      outgoingSnapshot?.destroy();
      incomingSnapshot?.destroy();
      this.restoreHudDepths(previousHudDepths);

      if (matterPaused) {
        scene.matter.world.resume();
      }
      if (previousMatterDebugState && scene.matter?.world) {
        const matterWorld = scene.matter.world;

        matterWorld.drawDebug =
          previousMatterDebugState.drawDebug;

        matterWorld.debugGraphic?.setVisible(
          previousMatterDebugState.graphicVisible
        );
      }

      scene.isRoomTransitioning = false;
      this.isTransitioning = false;
    }
  }
}
