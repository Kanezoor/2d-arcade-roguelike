export default class HitReaction {
  constructor(entity) {
    this.entity = entity;
    this.active = false;
    this.phase = 'none';
    this.pushRemaining = 0;
    this.stunRemaining = 0;
    this.pushVelocityX = 0;
    this.pushVelocityY = 0;
  }

  start (distance, pushDuration, stunDuration, angle) {
    if (distance <= 0 && stunDuration <= 0) {
      return;
    }

    this.active = true;
    this.pushRemaining = Math.max(pushDuration, 0);
    this.stunRemaining = Math.max(stunDuration, 0);

    if (this.pushRemaining > 0) {
      this.phase = 'push';
      
      const speed = distance / (this.pushRemaining / 1000);

      this.pushVelocityX = Math.cos(angle) * speed;
      this.pushVelocityY = Math.sin(angle) * speed;

      this.entity.sprite.body.setVelocity(
        this.pushVelocityX,
        this.pushVelocityY,
      );
    } else {
      this.phase = 'stun';

      this.entity.sprite.body.setVelocity(
        0,
        0,
      );
    }
  }

  update(delta) {
    if (!this.active) {
      return false;
    }

    if (this.phase === 'push') {
      this.pushRemaining -= delta;

      if (this.pushRemaining <= 0) {
        this.entity.sprite.body.setVelocity(
          0,
          0,
        );

        if (this.stunRemaining > 0) {
          this.phase = 'stun';
        } else {
          this.stop();
          return false;
        }
      }

      return true;
    }

    if (this.phase === 'stun') {
      this.stunRemaining -= delta;
      
      if (this.stunRemaining <= 0) {
        this.stop();
        
        return false;
      }

      return true;
    }

    return false;
  }

  stop() {
    this.active = false;
    this.phase = 'none';

    this.pushRemaining = 0;
    this.stunRemaining = 0;

    this.entity.sprite.body.setVelocity(0, 0);
  }
}