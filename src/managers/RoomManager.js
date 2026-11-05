import { spawnEnemy } from "./EnemyManager.js";
import Boss from "../entities/Boss.js";
import Reward from "../entities/Reward.js";
import FloorGenerator from "../world/FloorGenerator.js";
import FloorArchetype from "../world/FloorArchetype.js";
import RunState from "../world/RunState.js";
import {
  getDoorPosition,
  getExitForDirection,
  getOppositeDirection,
  getRoomEntryPosition,
} from "../world/RoomNavigation.js";
import RoomTransitionController from "../world/RoomTransitionController.js";

export default class RoomManager {
  constructor(scene) {
    this.scene = scene;
    this.roomTransitionController = new RoomTransitionController(scene, {
      duration: 260,
      ease: "Sine.easeInOut",
    });

    this.currentRoom = 0;

    // Archetypes are static game content; each generated floor is a separate instance.
    this.floorArchetype = new FloorArchetype({
      id: "prototype-dungeon",
      name: "Prototype Dungeon",
      generationOptions: {
        minRooms: 10,
        maxRooms: 15,
        gridWidth: 7,
        gridHeight: 7,
        roomWidth: 800,
        roomHeight: 800,
        roomShape: "rectangle",
        background: 0xffffff,
      },
      variants: [
        { id: "default", name: "Default" },
      ],
    });

    const initialVariantId = "default";
    const floorGenerationOptions = this.floorArchetype.resolveGenerationOptions(
      initialVariantId
    );

    this.floor = FloorGenerator.generate({
      ...floorGenerationOptions,
      id: "floor-instance-001",
      archetypeId: this.floorArchetype.id,
      variantId: initialVariantId,
      generationVersion: 1,
      depth: 1,
      seed: null, // null creates a new random seed for each run.
    });

    this.runState = new RunState({
      seed: this.floor.seed,
      floors: [this.floor],
    });

    // The registry owns all floor instances for this run.
    this.floorRegistry = this.runState.floorRegistry;

    this.rooms = [...this.floor.rooms.values()];
    this.bossRoomDefinition = this.floor.getRoomDefinition(
      this.floor.bossRoomId
    );
    this.currentRoomId = null;
    this.currentRoomData = null;

    this.doors = [];
    this.door = null; // Temporary compatibility alias for any existing debug code.
    this.walls = [];
    this.isEnteringDoor = false;

    
    // Reuse the model's room definitions in the existing manager.
    this.rooms = this.rooms.map(
      room => this.floor.getRoomDefinition(room.id)
    );

    this.isTransitioning = false;
    this.isRunComplete = false;
    this.isBossRoom = false
    this.isRoomCleared = false;
    this.isDoorOpen = false;
  }

  start() {
    this.loadRoom(this.floor.startRoomId);
    console.log(this.floor.toJSON());
    console.log(this.runState.toJSON());
  }

  startNextRoom() {

    this.isRoomCleared = false;
    this.isDoorOpen = false;
    this.isTransitioning = false;

    if (this.currentRoom >= this.rooms.length) {
      this.startBossRoom();
      return;
    }

    this.currentRoom++;

    this.currentRoomData = this.rooms[this.currentRoom - 1];
    const room = this.currentRoomData;

    this.currentRoomId = room.id;
    this.runState.setCurrentLocation(this.floor.id, room.id);
   
    this.createRoomBoundary();

    this.scene.cameras.main.setBackgroundColor(room.background);

    this.door = this.scene.add.rectangle(
      room.width - 25,
      room.height / 2,
      40,
      120,
      0xff0000
    );

    this.scene.matter.add.gameObject(
      this.door,
      {
        isStatic: true,
        isSensor: true,
      }
    );

    this.door.isDoor = true;

    for (const enemyGroup of room.enemies) {
      for (let i = 0; i < enemyGroup.count; i++) {
        spawnEnemy(this.scene, enemyGroup.type);
      }
    }
  }

  loadRoom(roomId, entryDirection = null) {
    const room = this.floor.getRoomDefinition(roomId);

    if (!room) {
      console.error(`Cannot load unknown room: ${roomId}`);
      return false;
    }

    // Remove runtime objects belonging to the previous room.
    this.clearDoors();
    this.clearRoomWalls();
    this.clearRewards();
    this.scene.enemies?.clear(true, true);
    this.scene.projectiles?.clear(true, true);

    this.currentRoomId = room.id;
    this.currentRoomData = room;
    this.currentRoom = [...this.floor.rooms.keys()].indexOf(room.id) + 1;
    this.runState.setCurrentLocation(this.floor.id, room.id);

    const roomState = this.floor.getRoomState(room.id);

    this.isRoomCleared = roomState.cleared;
    this.isDoorOpen = roomState.cleared;
    this.isBossRoom = room.isBossRoom || room.type === "boss";
    this.isTransitioning = false;
    this.isEnteringDoor = false;

    this.scene.cameras.main.setBackgroundColor(room.background);
    this.createRoomBoundary();

    if (entryDirection) {
      const entryPosition = getRoomEntryPosition(
        room,
        entryDirection
      );

      this.scene.player.sprite.setPosition(
        entryPosition.x,
        entryPosition.y
      );
      this.scene.player.sprite.setVelocity(0, 0);
    }

    if (this.isBossRoom) {
      this.startBossRoom();
      return true;
    }

    this.createExitDoors();

    if (roomState.cleared) {
      this.doors.forEach(door => {
        if (!door.isLocked) {
          door.setFillStyle(0x00aa44);
        }
      });

      return true;
    }

    const enemyGroups = this.getEnemyGroupsForRoom(room);

    for (const enemyGroup of enemyGroups) {
      for (let index = 0; index < enemyGroup.count; index++) {
        spawnEnemy(this.scene, enemyGroup.type);
      }
    }

    return true;
  }

  getEnemyGroupsForRoom(room) {
  
    if (Array.isArray(room.enemies) && room.enemies.length > 0) {
      return room.enemies;
    }

    if (room.type !== "combat") {
      return [];
    }

  
    const roomNumber = Number(room.id.match(/room-(\d+)$/)?.[1] ?? 1);
    const variant = roomNumber % 3;

    if (variant === 0) {
      return [
        { type: "blue", count: 3 },
        { type: "ranged", count: 1 },
      ];
    }

    if (variant === 1) {
      return [
        { type: "blue", count: 4 },
      ];
    }

    return [
      { type: "blue", count: 2 },
      { type: "brute", count: 1 },
    ];
  }

  createRectangularWalls() {
    const room = this.currentRoomData;
    const wallThickness = 20;
    const color = 0x444444;

    const top = this.scene.add.rectangle(
      room.width / 2,
      wallThickness / 2,
      room.width,
      wallThickness,
      color
    );

    const bottom = this.scene.add.rectangle(
      room.width / 2,
      room.height - wallThickness / 2,
      room.width,
      wallThickness,
      color
    );

    const left = this.scene.add.rectangle(
      wallThickness / 2,
      room.height / 2,
      wallThickness,
      room.height,
      color
    );

    const right = this.scene.add. rectangle (
      room.width - wallThickness / 2,
      room.height / 2,
      wallThickness,
      room.height,
      color
    );

    this.walls = [top, bottom, left, right];

    this.scene.matter.add.gameObject(
      top,
      { isStatic: true },
    );

    this.scene.matter.add.gameObject(
      bottom,
      { isStatic: true },
    );
    this.scene.matter.add.gameObject(
      left,
      { isStatic: true },
    );
    this.scene.matter.add.gameObject(
      right,
      { isStatic: true },
    );
  }

  createCircularBoundry() {
    const room = this.currentRoomData;

    const centerX = room.width / 2;
    const centerY = room.height / 2;

    const radius = Math.min(room.width, room.height) / 2;

    const segmentCount = 64;
    const wallThickness = 20;
    const overlap = 6;

    this.walls = [];

    const angleStep = (Math.PI * 2) / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      const angle1 = i * angleStep;
      const angle2 = (i + 1) * angleStep;

      const x1 = centerX + Math.cos(angle1) * radius;
      const y1 = centerY + Math.sin(angle1) * radius;

      const x2 = centerX + Math.cos(angle2) * radius;
      const y2 = centerY + Math.sin(angle2) * radius;

      const midpointX = (x1 + x2) / 2;
      const midpointY = (y1 + y2) / 2;

      const segmentLenght = Phaser.Math.Distance.Between(
        x1,
        y1,
        x2,
        y2,
      ) + overlap;

      const wall = this.scene.add.rectangle(
        midpointX,
        midpointY,
        segmentLenght,
        wallThickness,
        0x444444,
      );

      const tangentAngle = Math.atan2(
        y2 - y1,
        x2 - x1
      );

      wall.rotation = tangentAngle;

      this.scene.matter.add.gameObject(
        wall,
        { isStatic: true },
      );

      this.walls.push(wall);
    }
  }

  createExitDoors() {
    this.clearDoors();

    const exits = this.floor.getExits(
      this.currentRoomId,
      { includeLocked: true }
    );

    for (const exit of exits) {
      const position = getDoorPosition(
        this.currentRoomData,
        exit.direction
      );

      const isOpen = this.isRoomCleared && !exit.locked;
      const color = exit.locked
        ? 0x555555
        : isOpen
          ? 0x00aa44
          : 0xcc3333;

      const door = this.scene.add.rectangle(
        position.x,
        position.y,
        position.width,
        position.height,
        color,
        1
      );

      this.scene.matter.add.gameObject(door, {
        isStatic: true,
        isSensor: true,
      });

      door.isDoor = true;
      door.doorDirection = exit.direction;
      door.targetRoomId = exit.toRoomId;
      door.connectionId = exit.connectionId;
      door.isLocked = exit.locked;

      this.doors.push(door);
    }

    this.door = this.doors[0] ?? null;
  }

  clearDoors() {
    if (!this.doors) {
      this.doors = [];
      this.door = null;
      return;
    }

    this.doors.forEach(door => door.destroy());
    this.doors = [];
    this.door = null;
  }

  createRoomBoundary() {
    const shape = this.currentRoomData.shape;

    if (shape === "rectangle" || shape === "square") {
      this.createRectangularWalls();
    }

    if (shape === 'circle') {
      this.createCircularBoundry();
    }
  }

  clearRoomWalls() {
    if (!this.walls) return;

    this.walls.forEach(wall => wall.destroy());
    this.walls = [];
  }

  update() {
    if (
      this.isTransitioning ||
      this.isRunComplete ||
      this.isBossRoom ||
      this.scene.isGameOver ||
      this.isRoomCleared
    ) {
      return;
    }

    const activeEnemies = this.scene.enemies.countActive(true);

    if (activeEnemies === 0) {
      this.completeRoom();
    }
  }

  completeRoom() {
    if (this.isRoomCleared || this.isBossRoom) {
      return;
    }

    this.isTransitioning = true;
    this.isRoomCleared = true;
    this.isDoorOpen = true;

    this.floor
      .getRoomState(this.currentRoomId)
      ?.markCleared();

    if (this.currentRoomData.type === "combat") {
      this.spawnReward();
    }

    this.doors.forEach(door => {
      if (!door.isLocked) {
        door.setFillStyle(0x00aa44);
      }
    });
  }

  startBossRoom() {
    this.isBossRoom = true;
    this.isTransitioning = false;

    const room = this.currentRoomData;

    const bossSprite = this.scene.matter.add.sprite(
      room.width / 2,
      100,
      "boss",
      undefined,
      {
        isStatic: true,
        ignoreGravity: true,
      }
    );

    bossSprite.setFixedRotation();
    this.scene.bosses.add(bossSprite);

    this.boss = new Boss(bossSprite, this.scene);
  }

  bossDefeated() {
    if (this.isRunComplete) return;

    this.floor
      .getRoomState(this.currentRoomId)
      ?.markCleared();

    this.runState.markFloorCompleted(this.floor.id);

    this.isRunComplete = true;
    this.isBossRoom = false;

    console.log("Run Complete!");
  }

  enterDoor(direction) {
    if (
      !this.isRoomCleared ||
      !this.isDoorOpen ||
      this.isEnteringDoor ||
      this.scene.isRoomTransitioning
    ) {
      return false;
    }

    const exit = getExitForDirection(
      this.floor,
      this.currentRoomId,
      direction
    );

    if (!exit) {
      return false;
    }

    this.isEnteringDoor = true;

    this.roomTransitionController.transition({
      direction,
      oldBackground: this.currentRoomData?.background,
      loadDestination: () => {
        // This preserves the current cleanup behavior for now.
        // Persistent dropped items will be handled in a later checkpoint.
        this.scene.clearWorldItems();

        return this.loadRoom(
          exit.toRoomId,
          getOppositeDirection(exit.direction)
        );
      },
      getNewBackground: () => this.currentRoomData?.background,
    })
      .catch(error => {
        console.error("Room transition failed:", error);
      })
      .finally(() => {
        this.isEnteringDoor = false;
      });

    return true;
  }

  spawnReward() {
    const sprite = this.scene.add.rectangle(
      400, 400, 40, 40, 0xffff00
    );

    this.scene.matter.add.gameObject(
      sprite,
      {
        isStatic: true,
        isSensor: true,
      }
    );

    this.scene.rewards.add(sprite);

    // new Reward(sprite, 'magneticCore');
    new Reward(sprite, 'piercingCore');
    console.log(this.floor.toJSON());
    console.log('Reward spawned');
  }

  clearRewards() {
    this.scene.rewards.clear(true, true);
  }

}

