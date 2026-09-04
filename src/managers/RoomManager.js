import { spawnEnemy } from "./EnemyManager.js";
import Boss from "../entities/Boss.js";
import Reward from "../entities/Reward.js";

export default class RoomManager {
  constructor(scene) {
    this.scene = scene;

    this.currentRoom = 0;
    this.rooms = [
      {
        width: 800,
        height: 800,
        shape: 'rectangle',
        background: 0xffffff,
        enemies: [
          {type: 'blue', count: 5},
          {type: 'ranged', count: 1},
          {type: 'charger', count: 1}
        ],
      },
      {
        width: 800,
        height: 800,
        shape: 'rectangle',
        background: 0xe8e8e8,
        enemies: [
          {type: 'blue', count: 5},
          {type: 'brute', count: 1},
          // {type: 'blue', count: 1}
        ],
      },
      {
        width: 800,
        height: 650,
        shape: 'rectangle',
        background: 0xdfefff,
        enemies: [
          // {type: 'blue', count: 4},
          // {type: 'brute', count: 2},
          {type: 'blue', count: 1}
        ],
      },
      {
        width: 800,
        height: 800,
        shape: 'circle',
        background: 0xeee0ff,
        enemies: [
          // {type: 'blue', count: 2},
          // {type: 'brute', count: 4}
          {type: 'blue', count: 1}
        ],
      }
    ];

    this.isTransitioning = false;
    this.isRunComplete = false;
    this.isBossRoom = false
    this.isRoomCleared = false;
    this.isDoorOpen = false;

    this.door = null;

  }

  start() {
    this.startNextRoom();
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
   
    this.createRoomBoundary();

    this.scene.cameras.main.setBackgroundColor(room.background);

    this.door = this.scene.add.rectangle(
      room.width - 25,
      room.height / 2,
      40,
      120,
      0xff0000
    );

    this.scene.physics.add.existing(this.door, true);

    this.scene.physics.add.overlap(
      this.scene.player.sprite,
      this.door,
      () => {
        this.enterDoor();
      }
    );

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

    this.scene.physics.add.existing(top, true);
    this.scene.physics.add.existing(bottom, true);
    this.scene.physics.add.existing(left, true);
    this.scene.physics.add.existing(right, true);

    this.walls.forEach(wall => {
      this.scene.physics.add.collider(
        this.scene.player.sprite,
        wall
      );

      this.scene.physics.add.collider(
        this.scene.enemies,
        wall
      );
    });
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

      this.scene.physics.add.existing(wall, true);

      this.walls.push(wall);

      this.scene.physics.add.collider(
        this.scene.player.sprite,
        wall,
      );

      this.scene.physics.add.collider(
        this.scene.enemies,
        wall
      );
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
    this.isDoorOpen = true;

    this.spawnReward();

    if (this.door) {
      this.door.setFillStyle(0x00ff00);
    }
  }

  startBossRoom() {
    this.isBossRoom = true;
    this.isTransitioning = false;

    const bossSprite = this.scene.bosses.create(400, 100, 'boss');

    this.boss = new Boss(bossSprite, this.scene);

  }

  bossDefeated() {
    if (this.isRunComplete) return;
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
    this.startNextRoom();
  }

  spawnReward() {
    const sprite = this.scene.add.rectangle(
      400, 400, 40, 40, 0xffff00
    );

    this.scene.physics.add.existing(sprite, true);

    this.scene.rewards.add(sprite);

    // new Reward(sprite, 'magneticCore');
    new Reward(sprite, 'piercingCore');

    console.log('Reward spawned');
  }

  clearRewards() {
    this.scene.rewards.clear(true, true);
  }

}

