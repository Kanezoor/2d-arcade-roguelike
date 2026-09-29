const laserGun = {
  id: 'laser_gun',
  name: 'Laser Gun',
  description: 'A continuous laser beam.',
  rarity: 'Common',

  stats: {
    damage: 1,
    fireRate: 0,
    range: 500,
    accuracy: 1,
    criticalChance: 0,
    criticalDamage: 1,
  },

  slots: 2,
  fireMode: 'beam',
};

export default laserGun;