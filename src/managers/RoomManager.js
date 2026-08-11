import { spawnEnemy } from "./EnemyManager.js";
import Boss from "../entities/Boss.js";

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
    this.isBossRoom = false;
  }

  start() {
    this.startNextRoom();
  }

  startNextRoom() {
    if (this.currentRoom >= this.rooms.length) {
      this.startBossRoom();
      return;
    }

    this.currentRoom++;

    const room = this.rooms[this.currentRoom - 1];

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
    console.log(`Room ${this.currentRoom} complete`);

    this.scene.time.delayedCall(1000, () => {
      this.isTransitioning = false;
      this.startNextRoom();
    });
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

}

