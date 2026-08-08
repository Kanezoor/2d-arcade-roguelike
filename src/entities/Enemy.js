export default class Enemy {

  constructor(sprite, config) {

    this.sprite = sprite;
    sprite.enemy = this;

    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.damage = config.damage;
    this.score = config.score;
    this.color = config.color;
    this.knockbackResistance = config.knockbackResistance;
    this.kbX = 0;
    this.kbY = 0;
  }

}