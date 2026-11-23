import { createTextures } from "./textures.js";
import Player from "./entities/Player.js";
import { hitEnemy, createEnemies, updateEnemies } from "./managers/EnemyManager.js";
import RoomManager from "./managers/RoomManager.js";
import { showGameOverScreen, showVictoryScreen, refreshEndScreenLayout } from "./ui.js";
import HUDScene from "./HUDScene.js";
import DamageSystem from "./combat/DamageSystem.js";
import DamageContext from "./combat/DamageContext.js";
import DamageType from "./combat/DamageType.js";
import InventoryItem from "./inventory/InventoryItem.js";
import { ITEM_DEFINITIONS } from "./inventory/ItemDefinitions.js";
import WorldItem from "./items/WorldItem.js";
import WorldItemPickupSystem from "./systems/WorldItemPickupSystem.js";
import WorldWeapon from "./items/WorldWeapon.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {

  }

  create() {
    this.cameras.main.setBackgroundColor("#ffffff");

    createTextures(this);

    this.player = new Player(this);
    this.levelUpManager = null;
    this.inventoryUI = null;
    this.hudScene = null;
    this.isLevelUpOpen = false;
    this.isInventoryOpen = false;
    this.isRoomTransitioning = false;

    this.input.keyboard.on("keydown-TAB", event => {
      event.preventDefault();

      if (this.isLevelUpOpen || this.isRoomTransitioning) {
        return;
      }   

      if (this.inventoryUI?.isOpen) {
        this.inventoryUI.close();
      } else {
        this.inventoryUI?.open();
      }
    });

    this.enemyHpGraphics = this.add.graphics().setDepth(900);

    createEnemies(this);

    this.player.inventory.addItem(
      new InventoryItem(ITEM_DEFINITIONS.precision),
      0,
      0
    );

    this.player.inventory.addItem(
      new InventoryItem(ITEM_DEFINITIONS.medkit),
      2,
      0
    );

    this.player.inventory.addItem(
      new InventoryItem(ITEM_DEFINITIONS.salvagePart),
      4,
      0
    );

    this.bosses = this.add.group();
    this.roomManager = new RoomManager(this);
    this.projectiles = this.add.group();
    this.particles = this.add.group();
    this.rewards = this.add.group();
    this.worldItems = this.add.group();
    this.worldItemPickupSystem = new WorldItemPickupSystem(this);  

    this.score = 0;

    this.isGameOver = false;
    this.endScreenObjects = null;

    this.matter.world.on(
      'collisionstart',
      (event) => {
        event.pairs.forEach(pair => {
          this.handleMatterCollision(pair);
        });
      }
    );

  
    this.matter.world.on(
      'collisionactive',
      (event) => {
        event.pairs.forEach(pair => {
          const objectA = pair.bodyA.gameObject;
          const objectB = pair.bodyB.gameObject;

          if (!objectA || !objectB) {
            return;
          }

          if (
            objectA === this.player.sprite &&
            objectB.enemy
          ) {
            this.handleEnemyContact(
              objectB,
              false
            );
          }

          if (
            objectB === this.player.sprite &&
            objectA.enemy
          ) {
            this.handleEnemyContact(
              objectA,
              false
            );
          }
        });
      }
    );

    this.roomManager.start();

    this.createWorldWeapon(this.player.laserGun);

    // Keep screen-space UI and interactive menus out of the zooming world camera.
    if (this.game.scene.keys?.HUDScene) {
      this.scene.stop("HUDScene");
      this.scene.remove("HUDScene");
    }
    this.scene.add("HUDScene", HUDScene, false);
    this.scene.launch("HUDScene", { gameScene: this });

    this.scale.off("resize", this.handleViewportResize, this);
    this.scale.on("resize", this.handleViewportResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleViewportResize, this);
    });
  }

  
  handleViewportResize() {
    if (this.roomManager?.currentRoomData && !this.isRoomTransitioning) {
      this.roomManager.configureRoomCamera(this.roomManager.currentRoomData);
    }

    this.worldItemPickupSystem?.layoutPrompt?.();
    refreshEndScreenLayout(this);
  }

  createWorldItem(item) {
    if (!item || !this.player?.sprite || !this.worldItems) {
      return null;
    }

    const position = this.getWorldItemDropPosition();

    const footprint =
      this.player.inventory.getRotatedFootprint(item);

    const worldItem = new WorldItem(
      this,
      item,
      position.x,
      position.y,
      footprint
    );

    this.worldItems.add(worldItem.container);

    return worldItem;
  }

  createWorldWeapon(weapon) {
    if (
      !weapon ||
      !this.player?.sprite ||
      !this.worldItems
    ) {
      return null;
    }

    const position = this.getWorldItemDropPosition();

    const worldWeapon = new WorldWeapon(
      this,
      weapon,
      position.x,
      position.y
    );

    this.worldItems.add(worldWeapon.container);

    return worldWeapon;
  }

  getWorldItemDropPosition() {
    const playerSprite = this.player.sprite;
    const room = this.roomManager?.currentRoomData;

    const roomWidth = room?.width ?? this.scale.width;
    const roomHeight = room?.height ?? this.scale.height;

    const existingCount = this.worldItems.countActive(true);

    const angle = existingCount * 2.399963229728653;
    const distance = 48 + Math.sqrt(existingCount) * 20;

    let x = playerSprite.x + Math.cos(angle) * distance;
    let y = playerSprite.y + Math.sin(angle) * distance;

    const margin = 45;

    if (room?.shape === "circle") {
      const centerX = roomWidth / 2;
      const centerY = roomHeight / 2;

      const safeRadius =
        Math.min(roomWidth, roomHeight) / 2 - margin;

      const dx = x - centerX;
      const dy = y - centerY;
      const currentDistance = Math.hypot(dx, dy);

      if (currentDistance > safeRadius) {
        const scale = safeRadius / currentDistance;

        x = centerX + dx * scale;
        y = centerY + dy * scale;
      }
    } else {
      x = Phaser.Math.Clamp(
        x,
        margin,
        roomWidth - margin
      );

      y = Phaser.Math.Clamp(
        y,
        margin,
        roomHeight - margin
      );
    }

    return { x, y };
  }

  clearWorldItems() {
    if (!this.worldItems) {
      return;
    }

    [...this.worldItems.getChildren()].forEach(object => {
      if (object.worldItem) {
        object.worldItem.destroy();
      } else {
        object.destroy();
      }
    });
  }


  handleMatterCollision(pair) {

    if (this.isRoomTransitioning) {
      return;
    }

    const objectA = pair.bodyA.gameObject;
    const objectB = pair.bodyB.gameObject;

    if (!objectA || !objectB) {
      return;
    }

    // Static environmental cover blocks both player and enemy projectiles.
    if (objectA.projectile && objectB.environmentalObject?.blocksProjectiles) {
      this.handleProjectileEnvironmentalCollision(objectA);
      return;
    }
    if (objectB.projectile && objectA.environmentalObject?.blocksProjectiles) {
      this.handleProjectileEnvironmentalCollision(objectB);
      return;
    }

    if (objectA === this.player.sprite && objectB.environmentalObject?.hazard) {
      this.handleEnvironmentalHazardContact(objectB, this.player.sprite);
      return;
    }
    if (objectB === this.player.sprite && objectA.environmentalObject?.hazard) {
      this.handleEnvironmentalHazardContact(objectA, this.player.sprite);
      return;
    }
    if (objectA.enemy && objectB.environmentalObject?.hazard) {
      this.handleEnvironmentalHazardContact(objectB, objectA);
      return;
    }
    if (objectB.enemy && objectA.environmentalObject?.hazard) {
      this.handleEnvironmentalHazardContact(objectA, objectB);
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.enemy
    ) {
      this.handleEnemyContact(objectB);
      return;
    }

    if (
      objectB === this.player.sprite &&
      objectA.enemy
    ) {
      this.handleEnemyContact(objectA);
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.projectile
    ) {
      this.handlePlayerProjectileContact(objectB);
      return;
    }

    if (
      objectB === this.player.sprite &&
      objectA.projectile
    ) {
      this.handlePlayerProjectileContact(objectA);
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.reward
    ) {
      this.handleRewardCollection(objectB);
      return;
    }

    if (
      objectB === this.player.sprite && 
      objectA.reward
    ) {
      this.handleRewardCollection(objectA);
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.isRoomGateEntry
    ) {
      this.roomManager.handleGateEntry(objectB.portId);
      return;
    }

    if (
      objectB === this.player.sprite &&
      objectA.isRoomGateEntry
    ) {
      this.roomManager.handleGateEntry(objectA.portId);
      return;
    }

    if (
      objectA === this.player.sprite &&
      objectB.isDoor
    ) {
      this.roomManager.enterDoor(objectB.doorDirection);
      return;
    }

    if (
      objectB === this.player.sprite &&
      objectA.isDoor
    ) {
      this.roomManager.enterDoor(objectA.doorDirection);
      return;
    }

    if (objectA.projectile && objectB.enemy) {
      this.handleProjectileEnemyHit(objectA, objectB);
      return;
    }

    if (objectB.projectile && objectA.enemy) {
      this.handleProjectileEnemyHit(objectB, objectA);
      return;
    }

    if (objectA.projectile && objectB.boss) {
      this.handleProjectileBossHit(objectA, objectB);
      return;
    }

    if (objectB.projectile && objectA.boss) {
      this.handleProjectileBossHit(objectB, objectA);
    }
  }

  handleProjectileEnvironmentalCollision(projectileSprite) {
    if (!projectileSprite || projectileSprite.active === false) return;
    projectileSprite.destroy();
  }

  handleEnvironmentalHazardContact(hazardSprite, targetSprite) {
    const environmentalObject = hazardSprite?.environmentalObject;
    const hazard = environmentalObject?.hazard;
    if (!hazard || !targetSprite || this.isGameOver) return false;

    const isPlayer = targetSprite === this.player?.sprite;
    const isEnemy = Boolean(targetSprite.enemy);
    const targetKind = isPlayer ? "player" : (isEnemy ? "enemy" : null);
    if (!targetKind || !hazard.affects.includes(targetKind) || hazard.damage <= 0) return false;

    const target = isPlayer ? this.player : targetSprite.enemy;
    const now = this.time.now;
    const lastContactAt = environmentalObject.lastContactAt?.get(targetSprite) ?? -Infinity;
    if (now - lastContactAt < hazard.cooldownMs) return false;
    environmentalObject.lastContactAt?.set(targetSprite, now);

    const died = DamageSystem.apply(new DamageContext({
      source: hazardSprite,
      target,
      baseDamage: hazard.damage,
      type: DamageType.PHYSICAL,
      hitX: hazardSprite.x,
      hitY: hazardSprite.y,
      knockBackStrength: 0,
    }));

    if (isPlayer && died) {
      this.matter.world.pause();
      showGameOverScreen(this);
    }
    return true;
  }

  handleEnemyContact(enemySprite, applyHitReaction = true) {

    const enemy = enemySprite.enemy;

    if (!enemy) {
      return;
    }

    const isCharging =
      enemy.behavior === 'charger' &&
      enemy.state === 'charge';

    if (
      isCharging &&
      enemy.hasHitPlayerThisCharge
    ) {
      return;
    }

    const hitReactionDistance = isCharging
      ? enemy.chargeHitReactionDistance
      : enemy.hitReactionDistance;

    const hitPushDuration = isCharging
      ? enemy.chargeHitPushDuration
      : enemy.hitPushDuration;

    const hitStunDuration = isCharging
      ? enemy.chargeHitStunDuration
      : enemy.hitStunDuration;

    const context = new DamageContext({
      source: enemySprite,
      target: this.player,
      baseDamage: enemy.damage,
      type: DamageType.PHYSICAL,
      hitX: enemySprite.x,
      hitY: enemySprite.y,
      hitReactionDistance:
        applyHitReaction
          ? hitReactionDistance
          : 0,
      hitPushDuration:
        applyHitReaction
          ? hitPushDuration
          : 0,
      hitStunDuration:
        applyHitReaction
          ? hitStunDuration
          : 0,
    });

    const playerDied =
      DamageSystem.apply(context);

    if (playerDied) {
      this.matter.world.pause();
      showGameOverScreen(this);
      return;
    }

    if (
      applyHitReaction &&
      isCharging
    ) {

      enemy.hasHitPlayerThisCharge = true;

      enemy.sprite.setVelocity(0, 0);

      enemy.state = 'chargeRecovery';
      enemy.chargeTimer = enemy.chargeRecovery;

      enemy.isVulnerable = true;
      enemy.sprite.setTint(0xffff00);
    }
  }

  handleProjectileEnemyHit(bullet, enemySprite) {

    if (bullet.team !== 'player') {
      return;
    }

    const projectile = bullet.projectile;

    if (!projectile) {
      return;
    }

    if (!projectile.registerHit(enemySprite)) {
      return;
    }

    hitEnemy(this, bullet, enemySprite);

    projectile.applyPenetrationSpeedLoss();

    if (projectile.remainingHits <= 0) {
      bullet.destroy();
    }
  }

  handleProjectileBossHit(bullet, bossSprite) {

    if (bullet.team !== 'player') {
      return;
    }

    if (!bossSprite.active) {
      return;
    }

    const boss = bossSprite.boss;

    if (!boss || boss.isDead) {
      return;
    }

    const hitX = bullet.x;
    const hitY = bullet.y;
    const damage = bullet.projectile
      ? bullet.projectile.getImpactDamage()
      : bullet.damage;

    const context = new DamageContext({
      source: bullet,
      target: boss,
      baseDamage: damage,
      type: DamageType.PHYSICAL,
      hitX,
      hitY,
      knockbackStrength: 0,
    });

    DamageSystem.apply(context);

    this.time.delayedCall(0, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  }
  
  handlePlayerProjectileContact(bullet) {

  if (bullet.team !== 'enemy') {
    return;
  }

  const projectile = bullet.projectile;

    const context = new DamageContext({
      source: bullet,
      target: this.player,
      baseDamage: bullet.projectile
        ? bullet.projectile.getImpactDamage()
        : bullet.damage,
      type: DamageType.PHYSICAL,
      hitX: bullet.x,
      hitY: bullet.y,
      hitReactionDistance:
        projectile?.hitReactionDistance ?? 0,
      hitPushDuration:
        projectile?.hitPushDuration ?? 0,
      hitStunDuration:
        projectile?.hitStunDuration ?? 0,
    });

    bullet.destroy();

    const playerDied =
      DamageSystem.apply(context);

    if (playerDied) {
      this.matter.world.pause();
      showGameOverScreen(this);
    }
  }

  handleRewardCollection(rewardSprite) {

    console.log('Reward collected');

    const reward = rewardSprite.reward;

    if (!reward) {
      return;
    }

    reward.applyTo(this.player);

    console.log(
      'Piercing Core:',
      this.player.hasPassive('piercingCore')
    );
    
    console.log(
      'Magnetic Core:',
      this.player.hasPassive('magneticCore')
    );

    rewardSprite.destroy();

    console.log(
      'Player health:',
      this.player.health,
      '/',
      this.player.maxHealth
    );
  }

  update() {
    if (this.isRoomTransitioning) {
      return;
    }

    this.worldItemPickupSystem?.update();
    
    if (this.isLevelUpOpen || this.isInventoryOpen) {
      return;
    }

    this.player.update();
    updateEnemies(this);

    this.roomManager.update();
    if (this.roomManager.boss) {
      this.roomManager.boss.update(this.game.loop.delta);
    }

    if (this.roomManager && this.roomManager.isRunComplete && !this.isVictory) {
      this.isVictory = true;
      console.log('GAME COMPLETE!');
      showVictoryScreen(this); 
    }

    this.projectiles.getChildren().forEach(bullet => {
      if (bullet.projectile) {
        bullet.projectile.update(
          this.game.loop.delta
        );
      }
    });

  }
}