import type { Ctx } from './paint';

export interface TexSpec {
  w: number;
  h: number;
  paint: (ctx: Ctx, w: number, h: number) => void;
}

/** All procedurally painted textures, keyed by the same names the game uses everywhere. */
export const SPECS: Record<string, TexSpec> = {};

export function def(key: string, w: number, h: number, paint: TexSpec['paint']): void {
  SPECS[key] = { w, h, paint };
}
