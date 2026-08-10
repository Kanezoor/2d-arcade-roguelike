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
  }

  start() {
    this.startNextRoom();
  }

  startNextRoom() {
    if (this.currentRoom >= this.rooms.length) {
      this.completeRun();
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
    if (this.isTransitioning || this.isRunComplete) {
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

  completeRun() {
    this.isRunComplete = true;
    console.log('Boss encounter starting');
    const bossSprite = this.scene.bosses.create(400, 100, 'boss');

    this.boss = new Boss(bossSprite, this.scene);
    console.log('Boss encounter!');
    // console.log('Run complete!');
  }

}