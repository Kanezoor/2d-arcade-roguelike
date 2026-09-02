export default class Reward {
  constructor(sprite, type = 'vitalityCore') {
    this.sprite = sprite;
    this.type = type;

    sprite.reward = this;
  }

  applyTo(player) {
    if (this.type === 'vitalityCore') {
      player.maxHealth += 20;
      player.health += 20;
    }

    if (this.type === 'magneticCore') {
      player.addPassive('magneticCore');
    }

    if (this.type === 'piercingCore') {
      player.addPassive('piercingCore');
    }
  }
}