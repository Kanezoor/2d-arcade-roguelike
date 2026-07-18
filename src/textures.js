export function createTextures(scene) {
  const g = scene.add.graphics();

  g.fillStyle(0xffff00, 1);
  g.fillRect(0, 0, 30, 30);
  g.generateTexture("playerSquare", 30, 30);
  g.clear();

  g.fillStyle(0xff0000, 1);
  g.fillCircle(5, 5, 5);
  g.generateTexture("bullet", 10, 10);
  g.clear();

  g.fillStyle(0x0000ff, 1);
  g.fillRect(0, 0, 25, 25);
  g.generateTexture("blueEnemy", 25, 25);
  g.clear();

  g.fillStyle(0x800080, 1);
  g.fillRect(0, 0, 45, 45);
  g.generateTexture("purpleBrute", 45, 45);
  g.clear();

  g.destroy();
}