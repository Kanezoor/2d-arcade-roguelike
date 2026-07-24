# Weapon System

## Purpose

The weapon system is one of the core pillars of the game.

Weapons should not only deal damage but also encourage experimentation,
build creation, and player expression. A player should constantly make
interesting decisions about which weapons to carry, how to modify them,
and how they interact with the rest of the build.

The long-term goal is to make every weapon feel unique without requiring
a unique implementation for every single gun.

---

# Design Philosophy

Weapons are composed of multiple independent systems.

Instead of creating hundreds of different weapon classes, every weapon
should be built from reusable components.

Example:

Weapon
    ↓
Weapon Stats
    ↓
Fire Mode
    ↓
Modules
    ↓
Projectile
    ↓
Projectile Behaviours

This makes it possible to create thousands of weapon combinations while
maintaining a relatively small amount of code.

---

# Weapon Responsibilities

A Weapon is responsible for:

- shooting
- cooldown management
- reload management
- module management
- communicating with Fire Modes
- creating projectiles
- owning runtime weapon data

A Weapon should NOT:

- calculate player movement
- control enemies
- apply experience
- spawn loot
- contain UI logic

---

# Weapon Definition

Every weapon has two parts.

## Weapon Definition

The definition contains immutable data.

Examples:

- id
- name
- description
- sprite
- icon
- rarity
- default statistics
- default fire mode

Definitions should never change during gameplay.

---

## Weapon Instance

The weapon owned by the player.

Contains mutable information.

Examples:

- current ammo
- current modules
- upgraded damage
- upgraded fire rate
- durability (future)
- temporary buffs

Every dropped weapon creates its own Weapon Instance.

---

# Weapon Statistics

Current planned statistics:

- Damage
- Fire Rate
- Projectile Speed
- Range
- Knockback
- Accuracy
- Critical Chance
- Critical Damage
- Magazine Size
- Reload Time
- Projectile Lifetime

Future statistics may be added without changing the architecture.

---

# Fire Modes

Fire Modes determine HOW a weapon shoots.

Planned fire modes:

- Single
- Automatic
- Burst
- Spread
- Beam
- Charge
- Nova
- Continuous

Fire Modes should be reusable between weapons.

Example:

Assault Rifle
    -> Automatic

Shotgun
    -> Spread

Laser
    -> Beam

Boss Weapon
    -> Burst

---

# Weapon Modules

Modules are one of the primary progression systems.

Modules modify weapon behaviour instead of replacing it.

Examples:

Fire Module

- burn damage

Poison Module

- poison damage

Ricochet Module

- bullets bounce

Split Module

- projectile duplicates

Gravity Module

- curved trajectory

Chain Lightning Module

- electric arcs

A module should only have one responsibility.

Multiple modules should be stackable.

---

# Weapon Slots

Every weapon contains a number of module slots.

Module slots determine how many modules can be installed into a weapon.

Example:

Common Weapon

[ ]
[ ]

Rare Weapon

[ ]
[ ]
[ ]

Legendary Weapon

[ ]
[ ]
[ ]
[ ]
[ ]

The number of slots is one of the factors determining a weapon's potential,
but it is not fixed for the weapon's entire lifetime.

## Slot Expansion

Players may permanently increase the number of module slots through gameplay.

Possible expansion methods include:

- Blacksmith upgrades
- Rare crafting materials
- Boss rewards
- Quest rewards
- Special NPC services
- Extremely rare consumable items

This means that even a Common weapon can become a long-term investment if
the player chooses to improve it.

The architecture should support adding or removing module slots dynamically.

A weapon should therefore not store only an integer value.

Instead, module slots should be represented as a collection that can grow.

Example:

[
    Module,
    Module,
    null,
    null,
    null
]

rather than

slots = 5

This allows future systems to expand, lock, unlock or otherwise manipulate
individual slots.

---

# Weapon Rarity

Current planned rarities:

Common

Uncommon

Rare

Epic

Legendary

Mythic

Rarity should influence:

- number of module slots
- base statistics
- drop chance
- sell value
- visual appearance

Rarity should NOT be the only factor determining weapon strength.

A well-built Common weapon should remain useful.

---

# Weapon Acquisition

Weapons may be obtained from:

- starting equipment
- boss drops
- elite enemies
- treasure rooms
- shops
- events
- crafting (future)

Players can carry multiple weapons.

Initially the player starts with two weapon slots.

Future upgrades may increase this limit.

---

# Weapon Swapping

When a new weapon is found:

Player chooses:

Replace Left Weapon

Replace Right Weapon

Leave Weapon

No weapon should be replaced automatically.

---

# Future Systems

The following systems are planned but not yet implemented:

- WeaponFactory
- WeaponStats class
- FireMode classes
- Projectile Behaviours
- Weapon Serialization
- Procedural Weapon Generation
- Weapon Crafting
- Weapon Evolution
- Multiplayer Synchronization

---

# Design Goals

The weapon system should satisfy the following goals:

✔ Easy to expand.

✔ Easy to balance.

✔ Easy to serialize.

✔ Multiplayer friendly.

✔ Data-driven.

✔ Support procedural generation.

✔ Encourage experimentation.

✔ Avoid duplicated code.

If a new weapon requires copying large amounts of code,
the architecture should be reconsidered.