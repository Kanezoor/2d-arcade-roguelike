# Passive Item System

## Purpose

Passive Items are permanent upgrades acquired during a run that modify the
player instead of their weapons.

Unlike Weapon Modules, Passive Items become part of the player's build and
often introduce entirely new mechanics rather than simply increasing
numerical values.

The purpose of the Passive Item system is to encourage experimentation,
reward creative combinations and make every run feel unique.

Passive Items should allow players to build their own playstyle rather than
simply becoming stronger.

---

# Design Philosophy

Passive Items should change how the player plays the game.

Some items improve existing mechanics.

Others create completely new mechanics.

Whenever possible, Passive Items should encourage interesting interactions
with other systems.

A Passive Item should answer the question:

"How does this change the way I play?"

rather than

"How much stronger am I?"

---

# Responsibilities

Passive Items may:

- modify player statistics
- react to gameplay events
- create new mechanics
- summon helper entities
- interact with weapons
- interact with enemies
- interact with NPC systems
- interact with future mechanics

Passive Items should NOT:

- permanently modify weapon definitions
- replace Weapon Modules
- contain UI logic

---

# Categories

Passive Items can generally be divided into several categories.

## Statistical

Simple numerical improvements.

Examples

- +10% Reload Speed
- +20 Maximum Health
- +15% Movement Speed
- +5% Critical Chance

---

## Reactive

Trigger when something happens.

Examples

When taking damage:

- knock nearby enemies away

When reloading:

- gain temporary movement speed

When entering a room:

- gain temporary shield

When killing an enemy:

- heal for a small amount

---

## Mechanical

Introduce completely new gameplay mechanics.

Examples

- Dash ability
- Double jump (future)
- Wall climbing (future)
- Automatic dodge chance
- Projectile reflection

---

## Companion

Create additional allied entities.

Examples

- Shoulder Turret
- Floating Drone
- Healing Companion
- Summoned Creature

Companions behave as independent entities while remaining part of the
player's build.

---

## Utility

Modify exploration and progression.

Examples

- Reveal treasure rooms
- Increase currency drops
- Better shop prices
- Increased experience gain
- Additional chest rewards

---

# Event Driven Design

Passive Items should react to gameplay events instead of constantly
checking game state.

Examples of future events:

PlayerDamaged

PlayerHealed

EnemyKilled

WeaponReloaded

RoomEntered

BossDefeated

ProjectileHit

CriticalHit

DashStarted

DashEnded

Passive Items should subscribe only to the events they require.

This keeps systems independent and encourages interesting combinations.

---

# Item Synergy

Passive Items should naturally interact with one another.

Example

Reactive Armor

↓

Knock enemies away.

↓

Frozen Core

↓

Knocked enemies become frozen.

↓

Shatter Crystal

↓

Frozen enemies explode on death.

Each item performs only one task.

Interesting gameplay emerges from combining many simple mechanics.

---

# Interaction With Weapons

Passive Items and Weapon Modules serve different purposes.

Weapon Modules modify a weapon.

Passive Items modify the player.

Example

Weapon Module

Fire Module

↓

Bullets ignite enemies.

Passive Item

Mechanical Gloves

↓

Every weapon reloads faster.

Both systems should work together without replacing one another.

---

# Long-Term Design Goals

Passive Items should allow players to create completely different builds.

Examples

Tank Build

- defensive abilities
- crowd control
- health regeneration

Glass Cannon

- high damage
- low survivability

Engineer

- drones
- turrets
- automated combat

Elementalist

- poison
- fire
- ice
- electricity

Support

- healing
- buffs
- crowd control

No build should be objectively superior.

Different situations should reward different playstyles.

---

# Future Expansion

Possible future additions:

- Passive Item rarity
- Passive Item evolution
- Passive Item crafting
- Passive Item sets
- Passive Item fusion
- Passive Item corruption
- Legendary Passive Items
- Cursed Passive Items

These systems should extend the existing architecture rather than replace it.

---

# Design Goals

The Passive Item system should:

✔ Encourage experimentation.

✔ Create memorable builds.

✔ Introduce new mechanics.

✔ Reward creative combinations.

✔ Work independently of weapon systems.

✔ Support procedural item generation.

✔ Remain easy to expand.

✔ Encourage replayability.

The strongest builds should emerge from the interaction of many simple
Passive Items rather than from a single overpowered item.