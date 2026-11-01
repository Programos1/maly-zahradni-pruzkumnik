import type { LevelDef } from '../data/levels';

export type Ground = 'grass' | 'flowery' | 'dirt' | 'path' | 'soil' | 'sand' | 'water' | 'puddle';

export const enum Solid {
  Free = 0,
  Wall = 1,
  Climb = 2,
  Water = 3,
}

/** Characters that place a blocking prop sprite on top of the ground. */
const BLOCK_PROPS = '#BoMFTUWYPVHANR';
const CLIMB_PROPS = 'cL';

export interface PropPlacement {
  ch: string;
  tx: number;
  ty: number;
}

/** Pure data view of a level map: ground types, collision, and special tiles. No rendering. */
export class LevelMap {
  readonly w: number;
  readonly h: number;
  readonly ground: Ground[] = [];
  readonly solid: Uint8Array;
  readonly sun: Uint8Array;
  readonly shade: Uint8Array;
  readonly lily: Uint8Array;
  readonly pile: Uint8Array;
  readonly props: PropPlacement[] = [];
  readonly webs: { tx: number; ty: number }[] = [];
  readonly shears: { tx: number; ty: number }[] = [];
  readonly anthills: { tx: number; ty: number }[] = [];
  nest = { x: 2.5, y: 2.5 };
  recycle = { x: 4.5, y: 4.5 };

  constructor(public def: LevelDef) {
    const rows = def.map;
    this.h = rows.length;
    this.w = rows[0].length;
    const n = this.w * this.h;
    this.solid = new Uint8Array(n);
    this.sun = new Uint8Array(n);
    this.shade = new Uint8Array(n);
    this.lily = new Uint8Array(n);
    this.pile = new Uint8Array(n);
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        const ch = rows[ty][tx];
        const i = ty * this.w + tx;
        let g: Ground = 'grass';
        if (ch === ',') g = 'flowery';
        else if (ch === ':') g = 'dirt';
        else if (ch === '=') g = 'path';
        else if (ch === '_' || ch === 'v') g = 'soil';
        else if (ch === 'z') g = 'sand';
        else if (ch === '~' || ch === 'l') g = 'water';
        else if (ch === 'w') g = 'puddle';
        else if (ch === 'F' && def.theme === 'veggie' && this.neighborIs(rows, tx, ty, '_')) g = 'soil';
        this.ground[i] = g;
        if (ch === '~') this.solid[i] = Solid.Water;
        if (ch === 'l') this.lily[i] = 1;
        if (ch === 's') this.sun[i] = 1;
        if (ch === 'h') this.shade[i] = 1;
        if (ch === 'p') this.pile[i] = 1;
        if (BLOCK_PROPS.includes(ch)) this.solid[i] = Solid.Wall;
        if (CLIMB_PROPS.includes(ch)) this.solid[i] = Solid.Climb;
        if (BLOCK_PROPS.includes(ch) || CLIMB_PROPS.includes(ch) || 'lrvp'.includes(ch)) this.props.push({ ch, tx, ty });
        if (ch === 'x') this.webs.push({ tx, ty });
        if (ch === 'K') this.shears.push({ tx, ty });
        if (ch === 'A') this.anthills.push({ tx, ty });
        if (ch === 'N') this.nest = { x: tx + 0.5, y: ty + 0.5 };
        if (ch === 'R') this.recycle = { x: tx + 0.5, y: ty + 0.5 };
      }
    }
    // Bushes, trees, mushrooms and stumps cast shade on neighbouring tiles.
    for (const p of this.props) {
      if (!'BMYT#'.includes(p.ch)) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = p.tx + dx, y = p.ty + dy;
          if (this.inside(x, y)) this.shade[y * this.w + x] = 1;
        }
    }
  }

  private neighborIs(rows: string[], x: number, y: number, ch: string): boolean {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => rows[y + dy]?.[x + dx] === ch);
  }

  inside(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h;
  }

  idx(x: number, y: number): number {
    return Math.floor(y) * this.w + Math.floor(x);
  }

  blocked(tx: number, ty: number, canClimb: boolean): boolean {
    if (!this.inside(tx, ty)) return true;
    const i = ty * this.w + tx;
    const s = this.solid[i];
    if (s === Solid.Free) return false;
    if (s === Solid.Climb) return !canClimb;
    if (s === Solid.Water) return !this.lily[i];
    return true;
  }

  groundAt(x: number, y: number): Ground {
    if (!this.inside(Math.floor(x), Math.floor(y))) return 'grass';
    return this.ground[this.idx(x, y)];
  }

  flag(arr: Uint8Array, x: number, y: number): boolean {
    if (!this.inside(Math.floor(x), Math.floor(y))) return false;
    return arr[this.idx(x, y)] === 1;
  }

  charAt(tx: number, ty: number): string {
    return this.def.map[ty]?.[tx] ?? '#';
  }

  /**
   * Move a circle (approximated as an AABB of half-size r) with axis-separated resolution,
   * so the snail slides smoothly along walls.
   */
  move(x: number, y: number, dx: number, dy: number, r: number, canClimb: boolean): { x: number; y: number; hit: boolean } {
    let hit = false;
    let nx = x + dx;
    if (this.overlaps(nx, y, r, canClimb)) {
      hit = true;
      nx = dx > 0 ? Math.floor(nx + r) - r - 0.001 : Math.floor(nx - r) + 1 + r + 0.001;
      if (this.overlaps(nx, y, r, canClimb)) nx = x;
    }
    let ny = y + dy;
    if (this.overlaps(nx, ny, r, canClimb)) {
      hit = true;
      ny = dy > 0 ? Math.floor(ny + r) - r - 0.001 : Math.floor(ny - r) + 1 + r + 0.001;
      if (this.overlaps(nx, ny, r, canClimb)) ny = y;
    }
    return { x: nx, y: ny, hit };
  }

  overlaps(x: number, y: number, r: number, canClimb: boolean): boolean {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
    const y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.blocked(tx, ty, canClimb)) return true;
    return false;
  }

  /** Tiles reachable from the nest without climbing, used for fair item placement. */
  reachable(canClimb = false): Uint8Array {
    const seen = new Uint8Array(this.w * this.h);
    const stack: [number, number][] = [[Math.floor(this.nest.x) + 1, Math.floor(this.nest.y) + 1]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (!this.inside(x, y)) continue;
      const i = y * this.w + x;
      if (seen[i] || this.blocked(x, y, canClimb)) continue;
      seen[i] = 1;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return seen;
  }

  /** True if a tile is a fine spot for an item (walkable, not a hazard tile). */
  itemSpot(tx: number, ty: number): boolean {
    if (this.blocked(tx, ty, true)) return false;
    const ch = this.charAt(tx, ty);
    return !'xwlK'.includes(ch) && this.solid[ty * this.w + tx] === Solid.Free;
  }
}
