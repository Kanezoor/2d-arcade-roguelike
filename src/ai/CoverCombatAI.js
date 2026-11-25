function stop(enemy) {
  enemy.sprite.setVelocity(0, 0);
}

function moveTowards(enemy, target, arrivalDistance = 14) {
  const dx = target.x - enemy.sprite.x;
  const dy = target.y - enemy.sprite.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= arrivalDistance) {
    stop(enemy);
    return true;
  }
  const speed = Math.max(0.1, enemy.speed);
  enemy.sprite.setVelocity(
    (dx / distance) * speed + (enemy.kbX ?? 0),
    (dy / distance) * speed + (enemy.kbY ?? 0),
  );
  enemy.kbX = (enemy.kbX ?? 0) * 0.85;
  enemy.kbY = (enemy.kbY ?? 0) * 0.85;
  return false;
}

function clearCoverPlan(enemy) {
  enemy.coverPlan = null;
  enemy.coverAIState = "searching";
  enemy.coverAITimer = 0;
  enemy.coverBurstRemaining = 0;
  enemy.coverBurstTimer = 0;
}

function enterFallback(enemy, scene, retryMs) {
  clearCoverPlan(enemy);
  enemy.coverAIState = "fallback";
  enemy.nextCoverSearchAt = (scene.time?.now ?? 0) + retryMs;
  return false;
}

/**
 * Opt-in ranged-enemy cover behavior. Returns true while it owns movement and
 * firing for this update; false lets EnemyManager run the enemy's legacy AI.
 */
export function updateCoverCombatAI(enemy, scene) {
  if (!enemy?.usesCover) return false;
  const environment = scene.roomManager?.roomEnvironment;
  const player = scene.player?.sprite;
  if (!environment || !player || enemy.isDead || enemy.sprite?.active === false) return false;

  const now = scene.time?.now ?? 0;
  const delta = Math.max(0, Math.min(100, scene.game?.loop?.delta ?? 16.67));
  const config = enemy.coverAIConfig;
  const playerPosition = { x: player.x, y: player.y };
  const enemyPosition = { x: enemy.sprite.x, y: enemy.sprite.y };

  if (enemy.coverAIState === "fallback") {
    if (now < enemy.nextCoverSearchAt) return false;
    enemy.coverAIState = "searching";
  }

  if (enemy.coverPlan && !environment.isCoverAvailable(enemy.coverPlan.placementId)) {
    clearCoverPlan(enemy);
  }

  if (!enemy.coverPlan) {
    const plan = environment.findCoverPosition(enemyPosition, playerPosition, {
      enemyRadius: config.enemyRadius,
      clearance: config.clearance,
    });
    if (!plan) return enterFallback(enemy, scene, config.searchRetryMs);
    enemy.coverPlan = plan;
    enemy.coverAIState = "approaching";
  }

  const plan = enemy.coverPlan;
  if (!environment.isCoverAvailable(plan.placementId)) {
    clearCoverPlan(enemy);
    return true;
  }

  if (enemy.coverAIState === "approaching") {
    if (moveTowards(enemy, plan.hidePosition, config.arrivalDistance)) {
      enemy.coverAIState = "hiding";
      enemy.coverAITimer = config.hideDurationMs;
    }
    return true;
  }

  if (enemy.coverAIState === "hiding") {
    stop(enemy);
    if (environment.hasLineOfSight(playerPosition, enemyPosition)) {
      // The player has flanked the current position. Recalculate relative to
      // the player's new angle instead of pretending the old cover is safe.
      const updatedPlan = environment.findCoverPosition(enemyPosition, playerPosition, {
        enemyRadius: config.enemyRadius,
        clearance: config.clearance,
      });
      if (!updatedPlan) return enterFallback(enemy, scene, config.searchRetryMs);
      enemy.coverPlan = updatedPlan;
      enemy.coverAIState = "approaching";
      return true;
    }
    enemy.coverAITimer -= delta;
    if (enemy.coverAITimer > 0) return true;

    const peekPosition = environment.findPeekPosition(plan.placementId, playerPosition, {
      fromPosition: enemyPosition,
      enemyRadius: config.enemyRadius,
      clearance: config.peekClearance,
    });
    if (!peekPosition) return enterFallback(enemy, scene, config.searchRetryMs);
    plan.peekPosition = peekPosition;
    enemy.coverAIState = "peeking";
    return true;
  }

  if (enemy.coverAIState === "peeking") {
    if (moveTowards(enemy, plan.peekPosition, config.arrivalDistance)) {
      if (!environment.hasLineOfSight(playerPosition, enemyPosition)) {
        return enterFallback(enemy, scene, config.searchRetryMs);
      }
      enemy.coverAIState = "firing";
      enemy.coverBurstRemaining = config.burstShots;
      enemy.coverBurstTimer = 0;
    }
    return true;
  }

  if (enemy.coverAIState === "firing") {
    if (!environment.hasLineOfSight(playerPosition, enemyPosition)) {
      enemy.coverAIState = "hiding";
      enemy.coverAITimer = config.hideDurationMs * 0.5;
      stop(enemy);
      return true;
    }
    stop(enemy);
    enemy.coverBurstTimer -= delta;
    if (enemy.coverBurstTimer <= 0) {
      enemy.fireBurstShot();
      enemy.coverBurstRemaining -= 1;
      if (enemy.coverBurstRemaining > 0) {
        enemy.coverBurstTimer = config.burstDelayMs;
      } else {
        enemy.lastBurst = now;
        enemy.coverAIState = "returning";
      }
    }
    return true;
  }

  if (enemy.coverAIState === "returning") {
    if (moveTowards(enemy, plan.hidePosition, config.arrivalDistance)) {
      enemy.coverAIState = "hiding";
      enemy.coverAITimer = config.hideDurationMs;
    }
    return true;
  }

  // Unknown state: reset safely instead of leaving an enemy motionless.
  clearCoverPlan(enemy);
  return true;
}
