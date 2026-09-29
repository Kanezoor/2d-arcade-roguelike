const basicGun = {
  id: 'basic_gun',
  name: 'Basic Pistol',
  description: 'A simple semi-automatic pistol',
  rarity: 'Common',

  stats: {
    damage: 1,
    fireRate: 300,
    projectileSpeed: 5,
    range: 1000,
    knockback: 200,
    magazineSize: Infinity,
    reloadTime: 0,
    accuracy: 0.70,
    accuracySpread: 10,
    criticalChance: 0,
    criticalDamage: 1,
    projectileLifetime: 0,
    penetrationSpeedRetention: 0.85,
  },
  
  slots: 2,
  fireMode: 'single'
};

export default basicGun;