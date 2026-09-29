const shotgun = {
  id: 'shotgun',
  name: 'Shotgun',
  description: 'Fires five projectiles in a spread',
  rarity: 'Common',

  stats: {
    damage: 1,
    fireRate: 1500,
    projectileSpeed: 7,
    range: 1000,
    knockback: 2.5,
    magazineSize: 5,
    reloadTime: 0,
    accuracy: 0.85,
    accuracySpread: 10,
    criticalChance: 0,
    criticalDamage: 1,
    projectileLifetime: 0,
    pelletCount: 5,
    spreadAngle: 10,
    patternJitter: 0.15,
    penetrationSpeedRetention: 0.85,
  },

  slots: 2,
  fireMode: 'spread'
};

export default shotgun;