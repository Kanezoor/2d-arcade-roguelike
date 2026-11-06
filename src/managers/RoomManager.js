import { spawnEnemy } from "./EnemyManager.js";
import Boss from "../entities/Boss.js";
import Reward from "../entities/Reward.js";
import FloorGenerator from "../world/FloorGenerator.js";
import FloorArchetype from "../world/FloorArchetype.js";
import RunState from "../world/RunState.js";
import {
  getExitForDirection,
  getOppositeDirection,
  getRoomEntryPosition,
} from "../world/RoomNavigation.js";
import RoomEntranceRuntime from "../world/RoomEntranceRuntime.js";
import {
  getArcOpeningAngles,
  getBoundaryOpeningSegments,
  getRectangularEdgeOpenings,
  getRoomEntrySpawnPosition,
  buildRoomEntranceGeometry,
} from "../world/RoomEntranceGeometry.js";
import { getRoomOutlinePoints } from "../world/RoomGeometry.js";
import RoomTransitionController from "../world/RoomTransitionController.js";
import { configureDiamondVestibulePrototype } from "../world/DiamondVestibulePrototype.js";

// Temporary development fixture. Disable once irregular room shapes are
// assigned by the procedural generator.
const ENABLE_DIAMOND_VESTIBULE_PROTOTYPE = true;

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

    this.diamondVestibulePrototype = ENABLE_DIAMOND_VESTIBULE_PROTOTYPE
      ? configureDiamondVestibulePrototype(this.floor)
      : null;

    if (this.diamondVestibulePrototype) {
      console.info(
        "Diamond vestibule prototype configured:",
        this.diamondVestibulePrototype
      );
    } else if (ENABLE_DIAMOND_VESTIBULE_PROTOTYPE) {
      console.warn("No leaf room was available for the diamond vestibule prototype.");
    }

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
    this.entranceRuntimes = [];
    this.door = null; // Temporary compatibility alias for any existing debug code.
    this.walls = [];
    this.isEnteringDoor = false;
    this.entryDirection = null;

    
    // Reuse the model's room definitions in the existing manager.
    this.rooms = this.rooms.map(
      room => this.floor.getRoomDefinition(room.id)
    );

    this.isTransitioning = false;
    this.isRunComplete = false;
    this.isBossRoom = false
    this.isRoomCleared = false;
    this.isDoorOpen = false;
    this.isEncounterActive = true;
    this.roomFloorGraphics = null;
  }

  start() {
    this.loadRoom(this.floor.startRoomId);
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
    this.clearRoomFloor();
    this.clearRewards();
    this.scene.enemies?.clear(true, true);
    this.scene.projectiles?.clear(true, true);

    this.currentRoomId = room.id;
    this.currentRoomData = room;
    this.currentRoom = [...this.floor.rooms.keys()].indexOf(room.id) + 1;
    this.entryDirection = entryDirection;
    this.runState.setCurrentLocation(this.floor.id, room.id);

    const roomState = this.floor.getRoomState(room.id);
    const entryPort = entryDirection
      ? room.ports.find(port => (
          port.direction === entryDirection && port.mode === "vestibule"
        ))
      : null;

    this.isEncounterActive = roomState.cleared || !entryPort?.gate?.closeOnEntry;
    this.isRoomCleared = roomState.cleared;
    this.isDoorOpen = roomState.cleared;
    this.isBossRoom = room.isBossRoom || room.type === "boss";
    this.isTransitioning = false;
    this.isEnteringDoor = false;

    this.scene.cameras.main.setBackgroundColor(room.outsideBackground ?? 0x171923);
    this.createRoomFloor();
    this.createRoomBoundary();

    if (entryDirection) {
      const entryPosition = entryPort
        ? getRoomEntrySpawnPosition(room, entryPort)
        : getRoomEntryPosition(room, entryDirection);

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

  createStaticWallSegment(start, end, thickness = 20, color = 0x444444) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (length < 1) {
      return null;
    }

    const wall = this.scene.add.rectangle(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2,
      length + 4,
      thickness,
      color
    );

    this.scene.matter.add.gameObject(wall, { isStatic: true });
    // After Matter attaches, setRotation updates both the Game Object and
    // its physics body. Setting it before attachment only rotates the display object.
    wall.setRotation(Math.atan2(dy, dx));
    this.walls.push(wall);
    return wall;
  }

  createRectangularEdge(direction, length, fixedCoordinate, thickness, color) {
    const openings = getRectangularEdgeOpenings(
      this.currentRoomData,
      this.currentRoomData.ports,
      direction
    );

    let cursor = 0;
    const edgeCoordinate = fixedCoordinate;

    for (const opening of openings) {
      const start = Math.max(cursor, opening.start);
      const end = Math.max(start, opening.end);

      if (start > cursor) {
        const segmentStart = direction === "north" || direction === "south"
          ? { x: cursor, y: edgeCoordinate }
          : { x: edgeCoordinate, y: cursor };
        const segmentEnd = direction === "north" || direction === "south"
          ? { x: start, y: edgeCoordinate }
          : { x: edgeCoordinate, y: start };
        this.createStaticWallSegment(segmentStart, segmentEnd, thickness, color);
      }

      cursor = Math.max(cursor, end);
    }

    if (cursor < length) {
      const segmentStart = direction === "north" || direction === "south"
        ? { x: cursor, y: edgeCoordinate }
        : { x: edgeCoordinate, y: cursor };
      const segmentEnd = direction === "north" || direction === "south"
        ? { x: length, y: edgeCoordinate }
        : { x: edgeCoordinate, y: length };
      this.createStaticWallSegment(segmentStart, segmentEnd, thickness, color);
    }
  }

  createRectangularWalls() {
    const room = this.currentRoomData;
    const wallThickness = 20;
    const halfThickness = wallThickness / 2;
    const color = 0x444444;

    this.walls = [];
    this.createRectangularEdge("north", room.width, halfThickness, wallThickness, color);
    this.createRectangularEdge("south", room.width, room.height - halfThickness, wallThickness, color);
    this.createRectangularEdge("west", room.height, halfThickness, wallThickness, color);
    this.createRectangularEdge("east", room.height, room.width - halfThickness, wallThickness, color);
  }

  splitPolygonEdge(start, end, openingSegments) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const tolerance = 2;
    const intervals = [];

    for (const opening of openingSegments) {
      const points = [opening.start, opening.end];
      const distances = points.map(point => Math.abs(
        dx * (start.y - point.y) - (start.x - point.x) * dy
      ) / Math.sqrt(lengthSquared));

      if (distances.some(distance => distance > tolerance)) {
        continue;
      }

      const parameters = points.map(point => (
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
      ));

      const intervalStart = Math.max(0, Math.min(...parameters));
      const intervalEnd = Math.min(1, Math.max(...parameters));

      if (intervalEnd > intervalStart) {
        intervals.push({ start: intervalStart, end: intervalEnd });
      }
    }

    intervals.sort((a, b) => a.start - b.start);
    const merged = [];

    for (const interval of intervals) {
      const last = merged[merged.length - 1];
      if (last && interval.start <= last.end + 1e-4) {
        last.end = Math.max(last.end, interval.end);
      } else {
        merged.push({ ...interval });
      }
    }

    const remaining = [];
    let cursor = 0;

    for (const interval of merged) {
      if (interval.start > cursor + 1e-4) {
        remaining.push({
          start: {
            x: start.x + dx * cursor,
            y: start.y + dy * cursor,
          },
          end: {
            x: start.x + dx * interval.start,
            y: start.y + dy * interval.start,
          },
        });
      }
      cursor = Math.max(cursor, interval.end);
    }

    if (cursor < 1 - 1e-4) {
      remaining.push({
        start: { x: start.x + dx * cursor, y: start.y + dy * cursor },
        end: { ...end },
      });
    }

    return remaining;
  }

  createDiamondWalls() {
    const room = this.currentRoomData;
    const points = room.outlinePoints?.length >= 3
      ? room.outlinePoints.map(point => ({ ...point }))
      : [
          { x: room.width / 2, y: 0 },
          { x: room.width, y: room.height / 2 },
          { x: room.width / 2, y: room.height },
          { x: 0, y: room.height / 2 },
        ];
    const openings = room.ports
      .filter(port => port.mode === "vestibule" || port.boundaryOpening)
      .flatMap(port => getBoundaryOpeningSegments(room, port));

    this.walls = [];

    for (let index = 0; index < points.length; index++) {
      const start = points[index];
      const end = points[(index + 1) % points.length];

      this.splitPolygonEdge(start, end, openings).forEach(segment => {
        this.createStaticWallSegment(segment.start, segment.end, 20, 0x444444);
      });
    }
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

    const arcOpenings = room.ports
      .filter(port => port.mode === "vestibule" || port.boundaryOpening)
      .map(port => getArcOpeningAngles(port))
      .filter(Boolean);

    const normalizeAngle = angle => ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const isAngleInOpening = angle => arcOpenings.some(opening => {
      const start = normalizeAngle(opening.startAngle);
      const end = normalizeAngle(opening.endAngle);
      const current = normalizeAngle(angle);
      const span = normalizeAngle(end - start);
      const offset = normalizeAngle(current - start);
      return offset <= span + 1e-4;
    });

    for (let i = 0; i < segmentCount; i++) {
      const angle1 = i * angleStep;
      const angle2 = (i + 1) * angleStep;
      const middleAngle = angle1 + angleStep / 2;

      if (isAngleInOpening(middleAngle)) {
        continue;
      }

      const x1 = centerX + Math.cos(angle1) * radius;
      const y1 = centerY + Math.sin(angle1) * radius;
      const x2 = centerX + Math.cos(angle2) * radius;
      const y2 = centerY + Math.sin(angle2) * radius;
      const midpointX = (x1 + x2) / 2;
      const midpointY = (y1 + y2) / 2;
      const segmentLength = Phaser.Math.Distance.Between(x1, y1, x2, y2) + overlap;
      const tangentAngle = Math.atan2(y2 - y1, x2 - x1);

      const wall = this.scene.add.rectangle(
        midpointX,
        midpointY,
        segmentLength,
        wallThickness,
        0x444444
      );
      this.scene.matter.add.gameObject(wall, { isStatic: true });
      wall.setRotation(tangentAngle);
      this.walls.push(wall);
    }
  }

  createExitDoors() {
    this.clearDoors();

    const exits = this.floor.getExits(
      this.currentRoomId,
      { includeLocked: true }
    );
    const roomState = this.floor.getRoomState(this.currentRoomId);

    for (const exit of exits) {
      const port = this.floor.getPortForExit(this.currentRoomId, exit);
      if (!port) {
        console.warn(`No RoomPort found for connection "${exit.connectionId}".`);
        continue;
      }

      const isOpen = this.isRoomCleared && !exit.locked;
      const color = exit.locked
        ? 0x555555
        : isOpen
          ? 0x00aa44
          : 0xcc3333;

      let gateOpen;
      if (port.gate) {
        const defaultGateOpen = Boolean(
          roomState.cleared && port.gate.openWhenRoomCleared
        ) || Boolean(
          !roomState.cleared && this.entryDirection === port.direction
        ) || port.gate.initiallyOpen;

        gateOpen = !roomState.cleared && this.entryDirection === port.direction
          ? true
          : roomState.isGateOpen(port.gate.id, defaultGateOpen);

        if (roomState.cleared && port.gate.openWhenRoomCleared) {
          gateOpen = true;
          roomState.setGateOpen(port.gate.id, true);
        }
      }

      const runtime = new RoomEntranceRuntime(
        this.scene,
        this.currentRoomData,
        port,
        {
          exit,
          gateOpen,
          doorColor: color,
          exitAvailable: this.isRoomCleared && !exit.locked,
        }
      );

      this.entranceRuntimes.push(runtime);
      if (runtime.exitTrigger) {
        this.doors.push(runtime.exitTrigger);
      }
    }

    this.door = this.doors[0] ?? null;
  }

  clearDoors() {
    const runtimeObjects = new Set();

    for (const runtime of this.entranceRuntimes ?? []) {
      if (runtime.exitTrigger) runtimeObjects.add(runtime.exitTrigger);
      runtime.destroy();
    }

    // Preserve compatibility with any legacy door created outside an entrance runtime.
    for (const door of this.doors ?? []) {
      if (!runtimeObjects.has(door) && door?.active) {
        door.destroy();
      }
    }

    if (this.door?.active && !runtimeObjects.has(this.door)) {
      this.door.destroy();
    }

    this.entranceRuntimes = [];
    this.doors = [];
    this.door = null;
  }

  handleGateEntry(portId) {
    if (this.isRoomCleared || this.scene.isRoomTransitioning) {
      return false;
    }

    const runtime = this.entranceRuntimes.find(
      entrance => entrance.port.id === portId
    );

    if (!runtime?.closeGateAfterEntry()) {
      return false;
    }

    const gateId = runtime.port.gate.id;
    this.floor
      .getRoomState(this.currentRoomId)
      ?.setGateOpen(gateId, false);

    this.isEncounterActive = true;
    return true;
  }

  createRoomFloor() {
    const room = this.currentRoomData;
    if (!room) return;

    const graphics = this.scene.add.graphics();
    graphics.setDepth(-1000);
    graphics.fillStyle(room.background ?? 0xffffff, 1);

    if (room.shape === "rectangle" || room.shape === "square") {
      graphics.fillRect(0, 0, room.width, room.height);
    } else {
      const outline = getRoomOutlinePoints(room);
      graphics.beginPath();
      graphics.moveTo(outline[0].x, outline[0].y);
      outline.slice(1).forEach(point => graphics.lineTo(point.x, point.y));
      graphics.closePath();
      graphics.fillPath();
    }

    // A vestibule is a second walkable polygon attached to the room outline.
    for (const port of room.ports) {
      if (port.mode !== "vestibule" || !port.vestibule) continue;
      const geometry = buildRoomEntranceGeometry(room, port);
      const walls = geometry.vestibuleWalls;
      if (walls.length < 2) continue;

      const points = [
        walls[0].start,
        walls[1].start,
        walls[1].end,
        walls[0].end,
      ];
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(point => graphics.lineTo(point.x, point.y));
      graphics.closePath();
      graphics.fillPath();
    }

    this.roomFloorGraphics = graphics;
  }

  clearRoomFloor() {
    this.roomFloorGraphics?.destroy();
    this.roomFloorGraphics = null;
  }

  createRoomBoundary() {
    const shape = this.currentRoomData.shape;

    if (shape === "rectangle" || shape === "square") {
      this.createRectangularWalls();
    }

    if (shape === "diamond") {
      this.createDiamondWalls();
    }

    if (shape === "circle") {
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

    const roomState = this.floor.getRoomState(this.currentRoomId);
    roomState?.markCleared();

    this.isEncounterActive = false;

    for (const entrance of this.entranceRuntimes) {
      if (entrance.openGateAfterRoomClear()) {
        roomState?.setGateOpen(entrance.port.gate.id, true);
      }
      entrance.openExitAfterRoomClear();
    }

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

