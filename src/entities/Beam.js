import DamageContext from "../combat/DamageContext.js";
import DamageSystem from "../combat/DamageSystem.js";
import DamageType from "../combat/DamageType.js";

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

    const endX = startX + Math.cos(angle) * this.range;
    const endY = startY + Math.sin(angle) * this.range;

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