const TIER_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 12,
  veryRare: 3,
};

const LEVEL_UP_UPGRADES = [
  {
    id: 'movement_common',
    familyId: 'movement',
    tier: 'common',
    tierLabel: 'Common',
    weight: TIER_WEIGHTS.common,
    title: 'Lightweight Frame',
    value: 0.05,
    maxStacks: 5,
    description: '+0.05 movement speed',
    canAppear: player => 
      player.getLevelUpStacks('movement') < 5,
    apply: player => {
      player.speed += 0.05;
      player.addLevelUpStack('movement');
    },
  },

  {
    id: 'movement_uncommon',
    familyId: 'movement',
    tier: 'uncommon',
    tierLabel: 'Uncommon',
    weight: TIER_WEIGHTS.uncommon,
    title: 'Lightweight Frame',
    value: 0.10,
    maxStacks: 5,
    description: '+0.10 movement speed.',
    canAppear: player =>
      player.getLevelUpStacks('movement') < 5,
    apply: player => {
      player.speed += 0.10;
      player.addLevelUpStack('movement');
    },
  },

  {
    id: 'movement_rare',
    familyId: 'movement',
    tier: 'rare',
    tierLabel: 'Rare',
    weight: TIER_WEIGHTS.rare,
    title: 'Lightweight Frame',
    value: 0.15,
    maxStacks: 5,
    description: '+0.15 movement speed.',
    canAppear: player =>
      player.getLevelUpStacks('movement') < 5,
    apply: player => {
      player.speed += 0.15;
      player.addLevelUpStack('movement');
    },
  },

  {
    id: 'movement_veryRare',
    familyId: 'movement',
    tier: 'veryRare',
    tierLabel: 'Very Rare',
    weight: TIER_WEIGHTS.veryRare,
    title: 'Lightweight Frame',
    value: 0.25,
    maxStacks: 5,
    description: '+0.25 movement speed.',
    canAppear: player =>
      player.getLevelUpStacks('movement') < 5,
    apply: player => {
      player.speed += 0.25;
      player.addLevelUpStack('movement');
    },
  },

  {
    id: 'maxHealth_common',
    familyId: 'maxHealth',
    tier: 'common',
    tierLabel: 'Common',
    weight: TIER_WEIGHTS.common,
    title: 'Reinforced Frame',
    description: '+5 maximum health.',
    canAppear: player =>
      player.getLevelUpStacks('maxHealth') < 5,
    apply: player => {
      player.maxHealth += 5;
      player.addLevelUpStack('maxHealth');
    },
  },

  {
    id: 'maxHealth_uncommon',
    familyId: 'maxHealth',
    tier: 'uncommon',
    tierLabel: 'Uncommon',
    weight: TIER_WEIGHTS.uncommon,
    title: 'Reinforced Frame',
    description: '+10 maximum health.',
    canAppear: player =>
      player.getLevelUpStacks('maxHealth') < 5,
    apply: player => {
      player.maxHealth += 10;
      player.addLevelUpStack('maxHealth');
    },
  },

  {
    id: 'maxHealth_rare',
    familyId: 'maxHealth',
    tier: 'rare',
    tierLabel: 'Rare',
    weight: TIER_WEIGHTS.rare,
    title: 'Reinforced Frame',
    description: '+15 maximum health.',
    canAppear: player =>
      player.getLevelUpStacks('maxHealth') < 5,
    apply: player => {
      player.maxHealth += 15;
      player.addLevelUpStack('maxHealth');
    },
  },

  {
    id: 'maxHealth_veryRare',
    familyId: 'maxHealth',
    tier: 'veryRare',
    tierLabel: 'Very Rare',
    weight: TIER_WEIGHTS.veryRare,
    title: 'Reinforced Frame',
    description: '+25 maximum health.',
    canAppear: player =>
      player.getLevelUpStacks('maxHealth') < 5,
    apply: player => {
      player.maxHealth += 25;
      player.addLevelUpStack('maxHealth');
    },
  },


  {
    id: 'steadfast_common',
    familyId: 'steadfast',
    tier: 'common',
    tierLabel: 'Common',
    weight: TIER_WEIGHTS.common,
    title: 'Steadfast',
    description: '+5% knockback resistance.',
    canAppear: player =>
      player.knockbackResistance < 0.75 &&
      player.knockbackResistance + 0.05 <= 0.75,
    apply: player => {
      player.increaseKnockbackResistance(0.05);
      player.addLevelUpStack('steadfast');
    },
  },

  {
    id: 'steadfast_uncommon',
    familyId: 'steadfast',
    tier: 'uncommon',
    tierLabel: 'Uncommon',
    weight: TIER_WEIGHTS.uncommon,
    title: 'Steadfast',
    description: '+7.5% knockback resistance.',
    canAppear: player =>
      player.knockbackResistance < 0.75 &&
      player.knockbackResistance + 0.075 <= 0.75,
    apply: player => {
      player.increaseKnockbackResistance(0.075);
      player.addLevelUpStack('steadfast');
    },
  },

  {
    id: 'steadfast_rare',
    familyId: 'steadfast',
    tier: 'rare',
    tierLabel: 'Rare',
    weight: TIER_WEIGHTS.rare,
    title: 'Steadfast',
    description: '+10% knockback resistance.',
    canAppear: player =>
      player.knockbackResistance < 0.75 &&
      player.knockbackResistance + 0.10 <= 0.75,
    apply: player => {
      player.increaseKnockbackResistance(0.10);
      player.addLevelUpStack('steadfast');
    },
  },

  {
    id: 'steadfast_veryRare',
    familyId: 'steadfast',
    tier: 'veryRare',
    tierLabel: 'Very Rare',
    weight: TIER_WEIGHTS.veryRare,
    title: 'Steadfast',
    description: '+15% knockback resistance.',
    canAppear: player =>
      player.knockbackResistance < 0.75 &&
      player.knockbackResistance + 0.15 <= 0.75,
    apply: player => {
      player.increaseKnockbackResistance(0.15);
      player.addLevelUpStack('steadfast');
    },
  },

  {
    id: 'heal_common',
    familyId: 'heal',
    tier: 'common',
    tierLabel: 'Common',
    weight: TIER_WEIGHTS.common,
    title: 'Emergency Repair',
    description: 'Restore 15% of maximum health.',
    apply: player => {
      player.health = Math.min(
        player.health + player.maxHealth * 0.15,
        player.maxHealth
      );
    },
  },

  {
    id: 'heal_uncommon',
    familyId: 'heal',
    tier: 'uncommon',
    tierLabel: 'Uncommon',
    weight: TIER_WEIGHTS.uncommon,
    title: 'Emergency Repair',
    description: 'Restore 20% of maximum health.',
    apply: player => {
      player.health = Math.min(
        player.health + player.maxHealth * 0.20,
        player.maxHealth
      );
    },
  },

  {
    id: 'heal_rare',
    familyId: 'heal',
    tier: 'rare',
    tierLabel: 'Rare',
    weight: TIER_WEIGHTS.rare,
    title: 'Emergency Repair',
    description: 'Restore 25% of maximum health.',
    apply: player => {
      player.health = Math.min(
        player.health + player.maxHealth * 0.25,
        player.maxHealth
      );
    },
  },

  {
    id: 'heal_veryRare',
    familyId: 'heal',
    tier: 'veryRare',
    tierLabel: 'Very Rare',
    weight: TIER_WEIGHTS.veryRare,
    title: 'Emergency Repair',
    description: 'Restore 30% of maximum health.',
    apply: player => {
      player.health = Math.min(
        player.health + player.maxHealth * 0.30,
        player.maxHealth
      );
    },
  },
];

function weightedPick(entries) {
  const totalWeight = entries.reduce(
    (sum, entry) => sum + entry.weight, 0
  );

  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;

    if (roll <= 0) {
      return entry;
    }
  }

  return entries[entries.length - 1];
}

export function getLevelUpChoices(player, count = 3) {
  const eligibleUpgrades = LEVEL_UP_UPGRADES.filter(
    upgrade => 
      !upgrade.canAppear || upgrade.canAppear(player)
  );

  const familyIds = [
    ...new Set(eligibleUpgrades.map(upgrade => upgrade.familyId))
  ];

  Phaser.Utils.Array.Shuffle(familyIds);

  const selectedFamilyIds = familyIds.slice(
    0, Math.min(count, familyIds.length)
  );

  return selectedFamilyIds.map(familyId => {
    const familyUpgrades = eligibleUpgrades.filter(
      upgrade => upgrade.familyId === familyId
    );

    return weightedPick(familyUpgrades);
  }); 
}