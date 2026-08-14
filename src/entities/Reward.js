export default class Reward {
  constructor(sprite) {
    this.sprite = sprite;
    this.type = 'vitalityCore';

    sprite.reward = this;
  }

  applyTo(player) {
    if (this.type === 'vitalityCore') {
      player.maxHealth += 20;
      player.health += 20;
    }
  }
}