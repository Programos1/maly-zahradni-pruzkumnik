/** Global tuning constants. Gameplay numbers live here so balancing is one-stop. */
export const TILE_W = 64;
export const TILE_H = 32;

export const SNAIL = {
  baseSpeed: 2.1, // tiles / second
  accel: 9,
  decel: 11,
  radius: 0.28,
  baseCapacity: 4,
  baseReach: 0.95,
  maxHealth: 100,
  maxMoisture: 100,
  moistureDrain: 1.1, // per second in normal conditions
  sunDrainMul: 3.2,
  shadeDrainMul: 0.35,
  dryDamage: 6, // health per second when fully dried
  hideMoistureDrain: 1.6,
  invulnTime: 1.4,
};

export const RESPAWN_INTERVAL = 22; // seconds between natural resource respawns
export const SAVE_KEY = 'little-garden-explorer-save-v1';
