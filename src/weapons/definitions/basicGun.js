const basicGun = {
  id: 'basic_gun',
  name: 'Basic Pisto;',
  description: 'A simple semi-automatic pistol',
  rarity: 'Common',
  stats: {
    damage: 10,
    fireRate: 300,
    projectileSpeed: 600,
    range: 1000,
    knockBack: 200,
    magazineSize: Infinity,
    realoadTime: 0,
  },
  slots: 2,
  fireMode: 'single'
};

export default basicGun;