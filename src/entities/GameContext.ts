import type Phaser from 'phaser';
import type { Fx } from '../systems/Fx';
import type { LevelMap } from '../world/LevelMap';
import type { Snail } from './Snail';

export type DamageSource = 'hedgehog' | 'bird' | 'frog' | 'ants' | 'beetle' | 'shears' | 'hose' | 'dry' | 'wet';

/** What enemies and hazards are allowed to know about / do to the game. */
export interface GameContext {
  phaser: Phaser.Scene;
  map: LevelMap;
  snail: Snail;
  fx: Fx;
  /** True while the snail is inside the nest's safe zone. */
  snailSafe(): boolean;
  /** True if the snail is concealed (hiding in a leaf pile, or deep shade for birds). */
  snailConcealed(from: 'ground' | 'air'): boolean;
  damage(amount: number, source: DamageSource, fromX?: number, fromY?: number): void;
  knockOffItem(): void;
}

export interface Enemy {
  update(dt: number, time: number): void;
  /** Distance-based threat level 0..1 used for the danger vignette & warning music. */
  threat(): number;
  destroy(): void;
}
