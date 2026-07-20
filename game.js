// const canvas = document.getElementById('gameCanvas');
// const ctx = canvas.getContext('2d');

// // ***********************
// // GAME STATE & VARIABLES
// // ***********************

// // The Player object and stats
// const player = {
//   health: 100,
//   maxHealth: 100,
//   lastDamageTime: 0,
//   damageCooldown: 500,
//   x: canvas.width / 2,
//   y: canvas.height /2,
//   width: 30,
//   height: 30,
//   color: 'yellow',
//   speed: 1,
//   dx: 0,
//   dy: 0,
//   doubleShot: false,
// };


// //Entity Arrays
// const projectiles = [];
// const enemies = [];
// const particles = [];
// const pickups = [];
// const floatingTexts = [];

// // Game Systems State
// let score = 0;
// let isGameOver = false;
// let timeOfDeath = 0;
// const gameOverDelay = 3000;

// // Input Trackers
// const keys = {
//   w: false,
//   s: false,
//   a: false,
//   d: false,
// };

// const mouse = {
//   x: 0,
//   y: 0,
//   isDown: false
// };

// // Weapon Stats
// const weapon = {
//   fireRate: 300,
//   lastShotTime: 0,
// }

// // *********************************
// // INPUT HANDLING (KEYBOARD & MOUSE)
// // *********************************

// // Track when movement keys are pressed or released
// window.addEventListener('keydown', (e) => {
//   const key = e.key.toLowerCase();
//   if (keys.hasOwnProperty(key)) keys[key] = true;
// });


// window.addEventListener('keyup', (e) => {
//   const key = e.key.toLowerCase();
//   if (keys.hasOwnProperty(key)) keys[key] = false;
// });

// window.addEventListener('mouseup', (e) => {
//   mouse.isDown = false;
// });

// window.addEventListener('mousemove', (e) => {
//   updateMousePos(e);
// });

// // Helper function to translate screen mouse coordinates to canvas coordinates
// function updateMousePos(e) {
//   const rect = canvas.getBoundingClientRect();
//   mouse.x = e.clientX - rect.left;
//   mouse.y = e.clientY - rect.top;
// }

// // Mouse controls for shooting and restarting the game
// window.addEventListener('mousedown', (e) => {
//   if (isGameOver) {
//     if (Date.now() - timeOfDeath >= gameOverDelay) {
//       resetGame();
//     }
//   } else {
//     mouse.isDown = true;
//     updateMousePos(e);
//   }
// });

// // *************************
// // ENTITIES & SPAWNING LOGIC
// // *************************

// // Calculates the angle to the mouse and spawns a bullet
// function shoot() {
//   const playerCenterX = player.x + player.width / 2;
//   const playerCenterY = player.y + player.height / 2;

//   const angle = Math.atan2(mouse.y - playerCenterY, mouse.x - playerCenterX);
//   const speed = 10;

//   if (player.doubleShot) {
//     const angleSpread = 0.15;
//     const angles = [angle - angleSpread, angle + angleSpread];

//     angles.forEach(angle => {
//       projectiles.push({
//         x: playerCenterX,
//         y: playerCenterY,
//         radius: 5,
//         color: 'red',
//         velocity: {
//           x: Math.cos(angle) * speed,
//           y: Math.sin(angle) * speed,
//         }
//       });
//     });
//   } else {
//     const velocity = {
//     x: Math.cos(angle) * speed,
//     y: Math.sin(angle) * speed,
//   }

//   projectiles.push({
//     x: playerCenterX,
//     y: playerCenterY,
//     radius: 5,
//     color: 'red',
//     velocity: velocity,
//   });
//   }
// }

// // Spawns enemies outside of a designated safe zone around the player
// function spawnEnemy() {
//   if (isGameOver) return;

//   let randomX;
//   let randomY;
//   let distanceSquared;

//   const safeRadius = 500;
//   const safeRadiusSquared = safeRadius * safeRadius;
  
//   const playerCenterX = player.x + player.width / 2;
//   const playerCenterY = player.y + player.height / 2;

//   do {
//     randomX = Math.random() * canvas.width;
//     randomY = Math.random() * canvas.height;

//     const dx = playerCenterX - randomX;
//     const dy = playerCenterY - randomY;

//     distanceSquared = (dx * dx) + (dy * dy);
//   } while  (distanceSquared < safeRadiusSquared);

//   const isBrute = Math.random() < 0.3;

//   enemies.push({
//     x: randomX,
//     y: randomY,
//     width: isBrute ? 45 : 25,
//     height: isBrute ? 45 : 25,
//     color: isBrute ? 'purple' : 'blue',
//     speed: isBrute ? 1.0 : 2.0,
//     health: isBrute ? 6 : 3,
//     maxHealth: isBrute ? 6 : 3,
//     kbX: 0,
//     kbY: 0,
//   });
// }

// // Spawns an enemy every 1500ms
// setInterval(spawnEnemy, 1500);

// // Generates a burst of 15 random debris particles for explosions
// function createParticles(x, y, color, count = 15) {
//   for (let i = 0; i < count; i++) {
//     particles.push({
//       x: x,
//       y: y,
//       radius: Math.random() * 3 + 1, 
//       color: color,
//       velocity: {
//         x: (Math.random() - 0.5) * (Math.random() * 6),
//         y: (Math.random() - 0.5) * (Math.random() * 6),
//       },
//       alpha: 1, 
//     });
//   }
// }

// // Spawns floating notification above the player

// function spawnFloatingText(x, y, text, color) {
//   floatingTexts.push({
//     x: x,
//     y: y,
//     text: text,
//     color: color,
//     alpha: 1,
//     velocity: -0.8
//   });
// }

// // *******************************
// //CORE GAME LOOP (UPDATE & DRAW)
// // *******************************

// // UPDATE: Calculates all the math, movement, and collisions
// function update() {

//   if (isGameOver) {
//     return;
//   }

//   // PLAYER MOVEMENT 
//   player.dx = 0;
//   player.dy = 0;

//   if (keys.w) player.dy = -player.speed;
//   if (keys.s) player.dy = player.speed;
//   if (keys.a) player.dx = -player.speed;
//   if (keys.d) player.dx = player.speed;
//   if (keys.w && keys.s) player.dy = 0;
//   if (keys.a && keys.d) player.dx = 0;

//   player.x += player.dx;
//   player.y += player.dy;

//   // Player Screen Boundaries
//   if (player.x < 0 ) player.x = 0;
//   if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
//   if (player.y < 0) player.y = 0;
//   if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

//   // WEAPON FIRING
//   if (mouse.isDown) {
//     const currTime = Date.now();

//     if (currTime - weapon.lastShotTime > weapon.fireRate) {
//       shoot();
//       weapon.lastShotTime = currTime;
//     }
//   }

//   // UPDATE PROJECTILES
//   for (let i = projectiles.length - 1; i >= 0; i--) {
//     const p = projectiles[i];

//     p.x += p.velocity.x;
//     p.y += p.velocity.y;
    
//     if (p.x + p.radius < 0 ||
//         p.x - p.radius > canvas.width ||
//         p.y + p.radius < 0 ||
//         p.y - p.radius > canvas.height
//     ) projectiles.splice(i, 1);
//   }

//   // UPDATE ENEMIES (Homing Logic & knockback decay)
//   for (let i = 0; i < enemies.length; i++) {
//     const enemy = enemies[i];

//     if (enemy.kbX === undefined) enemy.kbX = 0;
//     if (enemy.kbY === undefined) enemy.kbY = 0;

//     const playerCenterX = player.x + player.width / 2;
//     const playerCenterY = player.y + player.height / 2;
//     const enemyCenterX = enemy.x + enemy.width / 2;
//     const enemyCenterY = enemy.y + enemy.height / 2;

//     const angle = Math.atan2(playerCenterY - enemyCenterY, playerCenterX - enemyCenterX);

//     enemy.x += Math.cos(angle) * enemy.speed + enemy.kbX; 
//     enemy.y += Math.sin(angle) * enemy.speed + enemy.kbY;

//     if (Math.abs(enemy.kbX) < 0.01) {
//       enemy.kbX = 0;
//     } else {
//       enemy.kbX *= 0.85;
//     }

//     if (Math.abs(enemy.kbY) < 0.01) {
//       enemy.kbY = 0; 
//     } else {
//       enemy.kbY *= 0.85;
//     }
//   }

//   // PROJECTILE VS ENEMY COLLISION
//   for (let i = projectiles.length - 1; i >= 0; i--) {
//     const p = projectiles[i];
//     let projectileHit = false;

//     for (let j = enemies.length - 1; j >= 0; j--) {
//       const e = enemies[j];

//       // AABB Clamping for circle-to-rectangle collision
//       let closestX = Math.max(e.x, Math.min(p.x, e.x + e.width));
//       let closestY = Math.max(e.y, Math.min(p.y, e.y + e.height));

//       const distanceX = p.x - closestX;
//       const distanceY = p.y - closestY;
//       const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

//       if (distanceSquared < (p.radius * p.radius)) {
//         e.health -= 1;
//         projectileHit = true;

//         if (e.health <= 0) {
//           createParticles(e.x + e.width / 2, e.y + e.height / 2, 'red');

//           const dropChance = Math.random();
//           const targetChange = (e.maxHealth === 6) ? 0.45 : 0.25;

//           if (dropChance < targetChange) {
//             const types = ['heart', 'firerate', 'speed', 'doubleshot'];
//             const chosenType = types[Math.floor(Math.random() * types.length)];

//             pickups.push({
//               x: e.x + e.width / 2,
//               y: e.y + e.height /2,
//               radius: 8,
//               type: chosenType,
//               spawnTime: Date.now()
//             });
//           }

//           enemies.splice(j, 1);
//           score += (e.maxHealth === 6) ? 30 : 10; 
//         } else {
//           createParticles(p.x, p.y, 'white', 5);
//         }
//         break;
//       }
//     }

//     if (projectileHit) {
//       projectiles.splice(i, 1);
//     }
//   }


//   //PLAYER VS PICKUPS COLLISION
//   for (let i = pickups.length - 1; i >= 0; i--) {
//     const pick = pickups[i];

//     const closestX = Math.max(player.x, Math.min(pick.x, player.x + player.width));
//     const closestY = Math.max(player.y, Math.min(pick.y, player.y + player.height));

//     const distanceX = pick.x - closestX;
//     const distanceY = pick.y - closestY;

//     const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

//     if (distanceSquared < (pick.radius * pick.radius)) {
//       createParticles(pick.x, pick.y, 'yellow', 10);

//       if (pick.type === 'heart') {
//         player.health = Math.min(player.maxHealth, player.health + 25);
//         spawnFloatingText(player.x + player.width / 2, player.y, '+25 HP', '#00FF00');
//       }
//       else if (pick.type === 'firerate') {
//         weapon.fireRate = Math.max(25, weapon.fireRate - 10);
//         spawnFloatingText(player.x + player.width / 2, player.y, '+10 Fire rate', 'cyan');
//       } else if (pick.type === 'speed') {
//         player.speed = Math.min(5, player.speed + 0.2);
//         spawnFloatingText(player.x + player.width / 2, player.y, '+0,2 Speed', 'lime');
//       } else if (pick.type === 'doubleshot'){
//         player.doubleShot = true;
//         spawnFloatingText(player.x + player.width / 2, player.y, 'Double Shot', 'orange');
//       }

//       pickups.splice(i, 1);
//     }
//   }

//   // PLAYER VS ENEMY COLLISION (Taking Damage)
//   const currentTime = Date.now();

//   if (currentTime - player.lastDamageTime > player.damageCooldown) {
//     for (let i = 0; i < enemies.length; i++) {
//       const e = enemies[i];

//       // AABB Rectangle Overlap Collision
//       if (player.x < e.x + e.width &&
//           player.x + player.width > e.x &&
//           player.y < e.y + e.height &&
//           player.y + player.height > e.y ) {
//             player.health -= 10;
//             player.lastDamageTime = currentTime;

//             const playerCenterX = player.x + player.width / 2;
//             const playerCenterY = player.y + player.height / 2;

//             const knockBackRadius = 100;
//             const knockBackRadiusSq = knockBackRadius * knockBackRadius;
//             const knockBackStength = 25;

//             enemies.forEach(enemyMove => {
//               const enemyCenterX = enemyMove.x + enemyMove.width / 2;
//               const enemyCenterY = enemyMove.y + enemyMove.height / 2;

//               const dx = enemyCenterX - playerCenterX;
//               const dy = enemyCenterY - playerCenterY;
//               const distSquared = (dx * dx) + (dy * dy);

//               if (distSquared <= knockBackRadiusSq) {
//                 const pushAngle = Math.atan2(dy, dx);

//                 enemyMove.kbX = Math.cos(pushAngle) * knockBackStength;
//                 enemyMove.kbY = Math.sin(pushAngle) * knockBackStength;
//               }
//             });

//             if (player.health <= 0) {
//               player.health = 0;
//               isGameOver = true;
//               timeOfDeath = Date.now();
//             }

//             break;
//           }
//     }
//   }

//   //FLOATIN TEXT NOTIFICATION
//   for (let i = floatingTexts.length - 1; i >= 0; i--) {
//     const ft = floatingTexts[i];
//     ft.y +=ft.velocity;
//     ft.alpha -= 0.02;
//     if (ft.alpha <= 0) {
//       floatingTexts.splice(i, 1);
//     }
//   }

//   // UPDATE PARTICLES
//   for (let i = particles.length - 1; i >= 0; i--) {
//     const p = particles[i];
//     p.x += p.velocity.x;
//     p.y += p.velocity.y;
//     p.alpha -= 0.02;

//     if (p.alpha <= 0) particles.splice(i, 1);
//   }
// };


// // ************************************************
// // DRAW: Paints the calculated math onto the screen
// // ************************************************

// function draw() {
//   ctx.clearRect(0, 0, canvas.width, canvas.height); 

//   // Draw Player
//   ctx.fillStyle = player.color;
//   ctx.fillRect(player.x, player.y, player.width, player.height);

//   // Draw Projectiles
//   projectiles.forEach((p) => {
//     ctx.beginPath();
//     ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
//     ctx.fillStyle = p.color;
//     ctx.fill();
//   })

//   // Draw Enemies
//   enemies.forEach((enemy) => {
//     ctx.fillStyle = enemy.color;
//     ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

//     if (enemy.health < enemy.maxHealth) {
//       const hpBarHeight = 4;
//       const hpY = enemy.y - 8;
//       const hpPercentage = enemy.health / enemy.maxHealth;

//       ctx.fillStyle = 'red';
//       ctx.fillRect(enemy.x , hpY, enemy.width, hpBarHeight);


//       ctx.fillStyle = 'green';
//       ctx.fillRect(enemy.x, hpY, enemy.width * hpPercentage, hpBarHeight);
//     }
//   });

//   //Draw Pickable Items
//   pickups.forEach(pick => {
//     const hoverOffset = Math.sin((Date.now() - pick.spawnTime) / 1500) * 4;
//     const finalY = pick.y + hoverOffset;

//     ctx.beginPath();
//     ctx.arc(pick.x, finalY, pick.radius + 3, 0, Math.PI * 2);
//     ctx.fillStyle = 'rgba(236, 69, 214, 0.3)';
//     ctx.fill();

//     ctx.beginPath();
//     ctx.arc(pick.x, finalY, pick.radius, 0, Math.PI * 2);

//     if (pick.type === 'heart') {
//       ctx.fillStyle = '#ff3366';
//     } else if (pick.type === 'firerate') {
//       ctx.fillStyle = 'cyan';
//     } else if (pick.type === 'speed') {
//       ctx.fillStyle = '#33ff33'
//     } else if (pick.type === 'doubleshot') {
//       ctx.fillStyle = 'orange';
//     }
//     ctx.fill();

//     ctx.beginPath();
//     ctx.arc(pick.x - 2, finalY - 2, 2.5, 0, Math.PI * 2);
//     ctx.fillStyle = 'white';
//     ctx.fill();
//   });

//   // Draw Particles (Using globalAlpha for transparency)
//   particles.forEach(particle => {
//     ctx.save();
//     ctx.globalAlpha = particle.alpha;
//     ctx.beginPath();
//     ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
//     ctx.fillStyle = particle.color;
//     ctx.fill();
//     ctx.restore();
//   });

//   //Draw Floating Notifications
//   floatingTexts.forEach(ft => {
//     ctx.save();
//     ctx.globalAlpha = ft.alpha;
//     ctx.fillStyle = ft.color;
//     ctx.font = 'bold 16px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText(ft.text, ft.x, ft.y - 15);
//     ctx.restore();
//   });

//   // Draw UI (Score & Health)
//   ctx.fillStyle = 'orange';
//   ctx.font = '24px sans-serif';
//   ctx.textAlign = 'left';
//   ctx.textBaseline = 'top';
//   ctx.fillText('Score: ' + score, 20, 20);

//   const currentTime = Date.now();
//   const barWidth = 200;
//   const barHeight = 20;
//   const barX = 20;
//   const barY = 55;

//   // Health bar background
//   ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
//   ctx.fillRect(barX, barY, barWidth, barHeight);

//   // Health bar fill
//   const healthPercentage = player.health / player.maxHealth;
//   const currentBarWidth = barWidth * healthPercentage;

//   // Flash yellow if immune
//   if (currentTime - player.lastDamageTime < player.damageCooldown) {
//     ctx.fillStyle = 'yellow';
//   } else {
//     ctx.fillStyle = 'red';
//   }
//   ctx.fillRect(barX, barY, currentBarWidth, barHeight);

//   // Health bar border
//   ctx.strokeStyle = 'orange';
//   ctx.lineWidth = 2;
//   ctx.strokeRect(barX, barY, barWidth, barHeight);

//   // Draw Cinematic Game Over Screen
//   if (isGameOver) {
//     const timeSinceDeath = Date.now() - timeOfDeath;
//     const alpha = Math.min(timeSinceDeath / gameOverDelay, 1);

//     ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';

//     ctx.font = '48px sans-serif';
//     ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);

//     ctx.font = '24px sans-serif';
//     ctx.fillText('Final score: ' + score, canvas.width / 2, canvas.height / 2 + 10);

//     if (alpha === 1) {
//       ctx.fillText('Click anywhere to restart.', canvas.width / 2, canvas.height / 2 + 50);
//     }
//   }

// };

// // ***************************
// // 6. INITIALIZATION & RESTART
// // ***************************

// // Resets all game variables back to their starting state
// function resetGame() {
//   player.health = player.maxHealth;
//   player.speed = 1;
//   player.x = canvas.width / 2;
//   player.y = canvas.height / 2;
//   weapon.fireRate = 300;
//   score = 0;
//   player.doubleShot = false;

//   enemies.length = 0;
//   particles.length = 0;
//   projectiles.length = 0;
//   pickups.length = 0;
//   floatingTexts.length = 0;

//   isGameOver = false;
// }


// // The master engine loop
// function gameLoop() {
//   update();
//   draw();

//   requestAnimationFrame(gameLoop);
// };

// // Kickstart
// gameLoop();