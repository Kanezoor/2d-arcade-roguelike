export function takeDamage(context) {
  this.health -= context.baseDamage;
}

// export function takeDamge(enemy) {
//   if (this.scene.time.now - this.lastDamageTime < this.damageCooldown) 
//     return false;

//   this.lastDamageTime = this.scene.time.now;

//   this.health -= enemy.damageValue;

//   const angle = Phaser.Math.Angle.Between(
//     enemy.x,
//     enemy.y,
//     this.sprite.x,
//     this.sprite.y
//   );

//   this.sprite.body.setVelocity(
//     Math.cos(angle) * 400,
//     Math.sin(angle) * 400
//   );

//   const enemyKnockback = 3000;
//   enemy.kbX = -Math.cos(angle) * enemyKnockback;
//   enemy.kbY = -Math.sin(angle) * enemyKnockback;

//   if (this.health <= 0) {
//     this.health = 0;
//     this.die();
//     return true;
//   }
    
//   return false;
// }

// export function die() {
//   this.scene.isGameOver = true;
//   this.sprite.setTint(0xff0000);
// }