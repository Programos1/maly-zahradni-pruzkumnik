import { TILE_H, TILE_W } from '../config';

/** World space is measured in tiles (x right-down, y left-down on screen). */
export function toScreen(wx: number, wy: number): { x: number; y: number } {
  return { x: (wx - wy) * (TILE_W / 2), y: (wx + wy) * (TILE_H / 2) };
}

export function toWorld(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Convert a screen-space direction (from keyboard) into a normalized world direction. */
export function screenDirToWorld(dx: number, dy: number): { x: number; y: number } {
  if (dx === 0 && dy === 0) return { x: 0, y: 0 };
  const wx = dx / (TILE_W / 2) + dy / (TILE_H / 2);
  const wy = dy / (TILE_H / 2) - dx / (TILE_W / 2);
  const len = Math.hypot(wx, wy);
  return { x: wx / len, y: wy / len };
}

/** Depth for sorting: objects lower on screen draw on top. */
export function depthOf(wx: number, wy: number, bias = 0): number {
  return (wx + wy) * (TILE_H / 2) + bias;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
