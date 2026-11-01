import { SNAIL } from '../config';
import { screenDirToWorld } from '../core/iso';
import type { ItemDef } from '../data/items';
import { Save } from '../state/SaveData';
import type { LevelMap } from '../world/LevelMap';

export type SnailAnim = 'idle' | 'walk' | 'collect' | 'eat' | 'hurt';

export interface SnailInput {
  dx: number; // screen-space direction, -1..1
  dy: number;
  hide: boolean;
}

/** Snail simulation state: movement, vitals, carried items. Rendering lives in SnailView. */
export class Snail {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  /** Screen-space facing, used by the view. */
  faceRight = true;
  faceBack = false;
  health = SNAIL.maxHealth;
  moisture = SNAIL.maxMoisture;
  hidden = false;
  hideAmount = 0; // 0..1 animated retraction
  stuck = 0; // seconds remaining stuck in a web
  invuln = 0;
  boost = 0; // seconds of berry speed boost
  wetTime = 0; // seconds continuously spent in a puddle
  anim: SnailAnim = 'idle';
  animTime = 0;
  carried: ItemDef[] = [];
  distance = 0; // total distance travelled, drives walk cycle & slime trail
  fainted = false;
  /** Breadcrumb of recent positions, used to drag large items behind. */
  trail: { x: number; y: number }[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    for (let i = 0; i < 60; i++) this.trail.push({ x, y });
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  slotsUsed(): number {
    return this.carried.reduce((n, d) => n + (d.large ? 2 : 1), 0);
  }

  canCarry(d: ItemDef): boolean {
    return this.slotsUsed() + (d.large ? 2 : 1) <= Save.capacity();
  }

  maxSpeed(map: LevelMap): number {
    let s = SNAIL.baseSpeed * Save.speedMul();
    if (this.boost > 0) s *= 1.35;
    const g = map.groundAt(this.x, this.y);
    if (g === 'puddle') s *= 0.6;
    if (g === 'sand') s *= 0.9;
    if (g === 'path') s *= 1.1;
    if (!Save.data.upgrades.cart) {
      const large = this.carried.filter((d) => d.large).length;
      s *= Math.max(0.6, 1 - large * 0.1);
    }
    return s;
  }

  setAnim(a: SnailAnim): void {
    this.anim = a;
    this.animTime = 0;
  }

  update(dt: number, input: SnailInput, map: LevelMap): void {
    this.animTime += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.boost > 0) this.boost -= dt;
    if (this.stuck > 0) this.stuck -= dt;

    const busy = this.anim === 'eat' && this.animTime < 0.6;
    this.hidden = input.hide && !this.fainted;
    this.hideAmount += ((this.hidden ? 1 : 0) - this.hideAmount) * Math.min(1, dt * 12);

    let tx = 0, ty = 0;
    const canMove = !this.hidden && this.stuck <= 0 && !busy && !this.fainted;
    if (canMove && (input.dx || input.dy)) {
      const d = screenDirToWorld(input.dx, input.dy);
      const ms = this.maxSpeed(map);
      tx = d.x * ms;
      ty = d.y * ms;
      // facing in screen space
      if (input.dx !== 0) this.faceRight = input.dx > 0;
      if (input.dy !== 0) this.faceBack = input.dy < 0;
      else if (input.dx !== 0) this.faceBack = false;
    }
    const rate = tx || ty ? SNAIL.accel : SNAIL.decel;
    const k = 1 - Math.exp(-rate * dt);
    this.vx += (tx - this.vx) * k;
    this.vy += (ty - this.vy) * k;
    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vy) < 0.01) this.vy = 0;

    const res = map.move(this.x, this.y, this.vx * dt, this.vy * dt, SNAIL.radius, Save.canClimb());
    const moved = Math.hypot(res.x - this.x, res.y - this.y);
    this.x = res.x;
    this.y = res.y;
    this.distance += moved;

    const head = this.trail[0];
    if (Math.hypot(head.x - this.x, head.y - this.y) > 0.06) {
      this.trail.unshift({ x: this.x, y: this.y });
      this.trail.length = 60;
    }

    if (this.anim === 'walk' || this.anim === 'idle') {
      const want = this.speed > 0.15 ? 'walk' : 'idle';
      if (want !== this.anim) this.setAnim(want);
    } else if (this.animTime > (this.anim === 'eat' ? 0.9 : 0.5)) {
      this.setAnim('idle');
    }
  }

  /** Position `d` tiles back along the travelled path. */
  trailPoint(d: number): { x: number; y: number } {
    let acc = 0;
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1], b = this.trail[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (acc + seg >= d) {
        const t = (d - acc) / (seg || 1);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      acc += seg;
    }
    return this.trail[this.trail.length - 1];
  }
}
