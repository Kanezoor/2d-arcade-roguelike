const basicGun = {
  id: 'basic_gun',
  name: 'Basic Pistol',
  description: 'A simple semi-automatic pistol',
  rarity: 'Common',

  stats: {
    damage: 1,
    fireRate: 300,
    projectileSpeed: 5,
    range: 500,
    knockback: 200,
    magazineSize: 5,
    reloadTime: 1000,
    accuracy: 0.70,
    accuracySpread: 10,
    criticalChance: 0,
    criticalDamage: 1,
    projectileLifetime: 0,
    penetrationSpeedRetention: 0.85,

    burstCount: 3,
    burstInterval: 150,
    burstCooldown: 600,
  },
  
  slots: 2,
  fireMode: 'single',
  reloadMode: 'magazine',
};

export default basicGun;