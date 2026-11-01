import Phaser from 'phaser';
import { SPECS } from './registry';
import './paintCreatures';
import './paintItems';
import './paintWorld';

/**
 * Asset pipeline.
 *
 * Every texture key has a procedural painter. To replace one with hand-made art,
 * drop `public/assets/sprites/<key>.png` and add the key to OVERRIDES below.
 * Overridden PNGs are loaded in preload(); the painter is skipped for them.
 * Keep the PNG the same size (or same aspect, with matching origin) as the painter
 * for drop-in compatibility.
 */
export const OVERRIDES: string[] = [
  // 'snail_shell',
];

export function preloadOverrides(scene: Phaser.Scene): void {
  for (const key of OVERRIDES) scene.load.image(key, `assets/sprites/${key}.png`);
}

export function buildTextures(scene: Phaser.Scene): void {
  for (const [key, spec] of Object.entries(SPECS)) {
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, spec.w, spec.h);
    if (!tex) continue;
    const ctx = tex.getContext();
    ctx.lineJoin = 'round';
    spec.paint(ctx, spec.w, spec.h);
    tex.refresh();
  }
}
