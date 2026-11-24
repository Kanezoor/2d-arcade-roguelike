import DamageContext from "../combat/DamageContext.js";
import DamageSystem from "../combat/DamageSystem.js";
import DamageType from "../combat/DamageType.js";

function rayBoundsDistance(originX, originY, directionX, directionY, maxDistance, bounds) {
  let minimum = 0;
  let maximum = maxDistance;
  const axes = [
    { origin: originX, direction: directionX, min: bounds.x, max: bounds.x + bounds.width },
    { origin: originY, direction: directionY, min: bounds.y, max: bounds.y + bounds.height },
  ];

  for (const axis of axes) {
    if (Math.abs(axis.direction) < 1e-9) {
      if (axis.origin < axis.min || axis.origin > axis.max) return null;
      continue;
    }
    let first = (axis.min - axis.origin) / axis.direction;
    let second = (axis.max - axis.origin) / axis.direction;
    if (first > second) [first, second] = [second, first];
    minimum = Math.max(minimum, first);
    maximum = Math.min(maximum, second);
    if (maximum < minimum) return null;
  }

  if (maximum < 0 || minimum > maxDistance) return null;
  return Math.max(0, minimum);
}

/** Returns the first point where a beam reaches any blocking environment object. */
export function getBeamEndPoint(startX, startY, angle, range, obstacles = []) {
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  let nearestDistance = range;
  let blockingObject = null;

  for (const obstacle of obstacles) {
    if (!obstacle || obstacle.active === false || !obstacle.environmentalObject?.blocksProjectiles ||
        typeof obstacle.getBounds !== "function") continue;
    const distance = rayBoundsDistance(
      startX, startY, directionX, directionY, range, obstacle.getBounds()
    );
    if (distance !== null && distance > 2 && distance < nearestDistance) {
      nearestDistance = distance;
      blockingObject = obstacle;
    }
  }

  const endDistance = Math.max(0, nearestDistance - (blockingObject ? 2 : 0));
  return {
    x: startX + directionX * endDistance,
    y: startY + directionY * endDistance,
    distance: endDistance,
    blockingObject,
  };
}

export default class Beam {
  constructor(scene, owner, damage = 1, range = 500) {
    this.scene = scene;
    this.owner = owner;
    this.damage = damage;
    this.range = range;
    this.active = false;
    this.graphics = scene.add.graphics();
    this.damageInterval = 200;
    this.lastDamageTimes = new Map();
    this.lastEnvironmentDamageTimes = new Map();
  }

  start() {
    this.active = true;
  }

  stop() {
    this.active = false;
    this.graphics.clear();
  }

  update(pointer) {
    if (!this.active) {
      return;
    }

    this.graphics.clear();

    const startX = this.owner.sprite.x;
    const startY = this.owner.sprite.y;

    const angle = Phaser.Math.Angle.Between(
      startX,
      startY,
      pointer.worldX,
      pointer.worldY
    );

    const environmentObjects = this.scene.roomManager?.roomEnvironment?.getGameObjects?.() ?? [];
    const beamEnd = getBeamEndPoint(startX, startY, angle, this.range, environmentObjects);
    const endX = beamEnd.x;
    const endY = beamEnd.y;

    // A continuous laser can damage destructible cover at the beam's first impact point.
    if (beamEnd.blockingObject?.environmentalObject?.destructible) {
      const now = this.scene.time.now;
      const lastDamageTime = this.lastEnvironmentDamageTimes.get(beamEnd.blockingObject) ?? -Infinity;
      if (now - lastDamageTime >= this.damageInterval) {
        this.lastEnvironmentDamageTimes.set(beamEnd.blockingObject, now);
        this.scene.roomManager?.damageEnvironmentalObject(beamEnd.blockingObject, {
          source: this,
          target: beamEnd.blockingObject,
          baseDamage: this.damage,
          type: DamageType.LASER,
          hitX: endX,
          hitY: endY,
        });
      }
    }

    this.graphics.lineStyle(
      8,
      0xff0000,
      1
    );

    this.graphics.beginPath();
    this.graphics.moveTo(startX, startY);
    this.graphics.lineTo(endX, endY);
    this.graphics.strokePath();

    const beamLine = new Phaser.Geom.Line(
      startX,
      startY,
      endX,
      endY
    );

    this.checkEnemyCollisions(beamLine);
    this.checkBossCollisions(beamLine);
  }

  checkEnemyCollisions(beamLine) {
    const now = this.scene.time.now;

    this.scene.enemies.getChildren().forEach(enemySprite => {
      if (!enemySprite.active) {
        return;
      }

      const bounds = enemySprite.getBounds();

      if (!Phaser.Geom.Intersects.LineToRectangle(beamLine, bounds)) {
        return;
      }

      const lastDamageTime = this.lastDamageTimes.get(enemySprite) ?? - Infinity;

      if (now - lastDamageTime < this.damageInterval) {
        return;
      }

      this.lastDamageTimes.set(enemySprite, now);

      const context = new DamageContext({
        source: this,
        target: enemySprite.enemy,
        baseDamage: this.damage,
        type: DamageType.LASER,
        hitX: enemySprite.x,
        hitY: enemySprite.y,
        knockBackStrength: 0,
      });

      DamageSystem.apply(context);
    })
  }

  checkBossCollisions(beamLine) {
    const now = this.scene.time.now;

    this.scene.bosses.getChildren().forEach(bossSprite => {
      if (!bossSprite.active) {
        return;
      }

      const boss = bossSprite.boss;

      if (!boss || boss.isDead) {
        return;
      }

      const bounds = bossSprite.getBounds();

      if (!Phaser.Geom.Intersects.LineToRectangle(beamLine, bounds)) {
        return;
      }

      const lastDamageTime = this.lastDamageTimes.get(bossSprite) ?? -Infinity;

      if (now - lastDamageTime < this.damageInterval) {
        return;
      }

      this.lastDamageTimes.set(bossSprite, now);

      const context = new DamageContext({
        source: this,
        target: boss,
        baseDamage: this.damage,
        type: DamageType.LASER,
        hitX: bossSprite.x,
        hitY: bossSprite.y,
        knockBackStrength: 0,
      });

      DamageSystem.apply(context);
    });
  }
}