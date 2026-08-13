export default class Reward {
  constructor(sprite) {
    this.sprite = sprite;
    this.type = 'vitalityCore';

    sprite.reward = this;
  }
}