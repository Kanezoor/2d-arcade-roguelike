import { spawnEnemy } from "./EnemyManager.js";
import Boss from "../entities/Boss.js";
import Reward from "../entities/Reward.js";

export default class RoomManager {
  constructor(scene) {
    this.scene = scene;

    this.currentRoom = 0;
    this.rooms = [
      {enemyCount: 5},
      {enemyCount: 7},
      {enemyCount: 9},
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

    const room = this.rooms[this.currentRoom - 1];

    this.door = this.scene.add.rectangle(
      750,
      400,
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

    console.log(`Starting room ${this.currentRoom} with ${room.enemyCount} enemies`);

    for (let i = 0; i < room.enemyCount; i++) {
      spawnEnemy(this.scene);
    }
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
    console.log(`Room ${this.currentRoom} complete`);

    this.spawnReward();

    if (this.door) {
      this.door.setFillStyle(0x00ff00);
    }
  }

  startBossRoom() {
    // this.isRunComplete = true;
    this.isBossRoom = true;
    this.isTransitioning = false;
    console.log('Boss encounter starting');

    const bossSprite = this.scene.bosses.create(400, 100, 'boss');

    this.boss = new Boss(bossSprite, this.scene);
    console.log('Boss encounter!')
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

    console.log(`Leaving room ${this.currentRoom}`);
    this.isTransitioning = true;

    if (this.door) {
      this.door.destroy();
      this.door = null;
    }

    this.clearRewards();
    this.startNextRoom();
  }

  spawnReward() {
    const sprite = this.scene.add.rectangle(
      400, 400, 40, 40, 0xffff00
    );

    this.scene.physics.add.existing(sprite, true);

    this.scene.rewards.add(sprite);

    new Reward(sprite);

    console.log('Reward spawned');
  }

  clearRewards() {
    this.scene.rewards.clear(true, true);
  }

}

