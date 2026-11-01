import Phaser from 'phaser';

/**
 * Single event channel between game logic and the DOM UI.
 * Logic emits facts ("hud", "toast", "levelComplete"); UI emits intents ("ui:resume", ...).
 */
export const bus = new Phaser.Events.EventEmitter();
