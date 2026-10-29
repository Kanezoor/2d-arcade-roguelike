import { spawnEnemy } from "./EnemyManager.js";
import Boss from "../entities/Boss.js";
import Reward from "../entities/Reward.js";
import FloorModel from "../world/FloorModel.js";

export default class RoomManager {
  constructor(scene) {
    this.scene = scene;

    this.currentRoom = 0;
    this.rooms = [
      {
        id: "room-01",
        gridPosition: { x: 1, y: 3 },
        type: "combat",
        isStartRoom: true,
        width: 800,
        height: 800,
        shape: 'rectangle',
        background: 0xffffff,
        enemies: [
          // {type: 'brute', count: 3},
          // {type: 'blue', count: 5},
          {type: 'ranged', count: 3},
          // {type: 'charger', count: 3}
        ],
      },
      {
        id: "room-02",
        gridPosition: { x: 2, y: 3 },
        type: "combat",
        width: 800,
        height: 800,
        shape: 'rectangle',
        background: 0xe8e8e8,
        enemies: [
          {type: 'blue', count: 5},
          {type: 'brute', count: 1},
        ],
      },
      {
        id: "room-03",
        gridPosition: { x: 3, y: 3 },
        type: "combat",
        width: 800,
        height: 650,
        shape: 'rectangle',
        background: 0xdfefff,
        enemies: [
          {type: 'blue', count: 4},
          {type: 'brute', count: 2},
          {type: 'blue', count: 1}
        ],
      },
      {
        id: "room-04",
        gridPosition: { x: 4, y: 3 },
        type: "combat",
        width: 800,
        height: 800,
        shape: 'circle',
        background: 0xeee0ff,
        enemies: [
          {type: 'blue', count: 2},
          {type: 'brute', count: 4},
          {type: 'blue', count: 1}
        ],
      }
    ];

    this.bossRoomDefinition = {
      id: "boss-room",
      gridPosition: { x: 5, y: 3 },
      type: "boss",
      isBossRoom: true,
      shape: "circle",
      width: 800,
      height: 800,
      background: 0xeee0ff,
      enemies: [],
    };

    this.floor = new FloorModel({
      id: "floor-1",
      depth: 1,
      seed: null,
      gridWidth: 7,
      gridHeight: 7,
      rooms: [
        ...this.rooms,
        this.bossRoomDefinition,
      ],
      startRoomId: "room-01",
      bossRoomId: "boss-room",
      connections: [
        {
          id: "room-01--room-02",
          roomAId: "room-01",
          roomBId: "room-02",
          directionFromA: "east",
        },
        {
          id: "room-02--room-03",
          roomAId: "room-02",
          roomBId: "room-03",
          directionFromA: "east",
        },
        {
          id: "room-03--room-04",
          roomAId: "room-03",
          roomBId: "room-04",
          directionFromA: "east",
        },
        {
          id: "room-04--boss-room",
          roomAId: "room-04",
          roomBId: "boss-room",
          directionFromA: "east",
        },
      ],
    });

    // Reuse the model's room definitions in the existing manager.
    this.rooms = this.rooms.map(
      room => this.floor.getRoomDefinition(room.id)
    );

    this.bossRoomDefinition =
      this.floor.getRoomDefinition("boss-room");

    this.currentRoomId = null;

    this.isTransitioning = false;
    this.isRunComplete = false;
    this.isBossRoom = false
    this.isRoomCleared = false;
    this.isDoorOpen = false;

    this.door = null;

  }

  start() {
    this.startNextRoom();
    console.log(this.floor.toJSON());
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
    this.floor.setActiveRoom(room.id);
   
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

  createRoomBoundary() {
    const shape = this.currentRoomData.shape;

    if(shape === 'rectangle') {
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
    if (this.isTransitioning || this.isRunComplete || this.isBossRoom) {
      return;
    }

    if (this.scene.isGameOver) {
      return;
    }

    const activeEnemies = this.scene.enemies.countActive(true);

    if (activeEnemies === 0) {
      this.completeRoom();
    }
  }

  completeRoom() {
    this.isTransitioning = true;

    this.isRoomCleared = true;

    this.floor.getRoomState(this.currentRoomId)?.markCleared();
    this.isDoorOpen = true;

    this.spawnReward();

    if (this.door) {
      this.door.setFillStyle(0x00ff00);
    }
  }

  startBossRoom() {
    this.isBossRoom = true;
    this.currentRoomId = this.bossRoomDefinition.id;
    this.currentRoomData = this.bossRoomDefinition;
    this.floor.setActiveRoom(this.currentRoomId);
    this.isTransitioning = false;

    const bossSprite = this.scene.matter.add.sprite(
      400,
      100,
      'boss',
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

    this.floor.getRoomState(this.currentRoomId)?.markCleared();
    this.isRunComplete = true;
    this.isBossRoom = false;

    console.log('Run Complete!');
    
  }

  enterDoor() {
    if (!this.isRoomCleared || !this.isDoorOpen) {
      return;
    }

    this.isTransitioning = true;

    if (this.door) {
      this.door.destroy();
      this.door = null;
    }
    this.clearRoomWalls();
    this.clearRewards();
    this.scene.clearWorldItems();
    this.startNextRoom();
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

