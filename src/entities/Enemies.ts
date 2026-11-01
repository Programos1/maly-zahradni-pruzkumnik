import Phaser from 'phaser';
import { TILE_W } from '../config';
import { depthOf, dist, toScreen } from '../core/iso';
import { Audio } from '../audio/AudioEngine';
import type { Enemy, GameContext } from './GameContext';

const ZONE_PX = 62; // radius of fx_zone texture in px
/** Screen scale that makes a ground ellipse texture of radius `px` match a world circle of radius r. */
const zoneScale = (r: number, px = ZONE_PX) => (r * (TILE_W / 2) * Math.SQRT2) / px;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Small speech bubble ("!" / "?") floating over a creature. */
class Bubble {
  img: Phaser.GameObjects.Image;
  private t = 0;
  constructor(scene: Phaser.Scene) {
    this.img = scene.add.image(0, 0, 'fx_alert').setOrigin(0.5, 1).setVisible(false).setDepth(800000);
  }
  show(kind: 'alert' | 'question', time = 1): void {
    this.img.setTexture(kind === 'alert' ? 'fx_alert' : 'fx_question').setVisible(true).setScale(0.2);
    this.img.scene.tweens.add({ targets: this.img, scale: 0.9, duration: 220, ease: 'Back.easeOut' });
    this.t = time;
  }
  update(dt: number, x: number, y: number): void {
    this.img.setPosition(x, y);
    if (this.t > 0) {
      this.t -= dt;
      if (this.t <= 0) this.img.setVisible(false);
    }
  }
  destroy(): void {
    this.img.destroy();
  }
}

function moveToward(ctx: GameContext, e: { x: number; y: number }, tx: number, ty: number, speed: number, dt: number): { arrived: boolean; dx: number; hit: boolean } {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.08) return { arrived: true, dx: 0, hit: false };
  const step = Math.min(d, speed * dt);
  const r = ctx.map.move(e.x, e.y, (dx / d) * step, (dy / d) * step, 0.3, false);
  e.x = r.x;
  e.y = r.y;
  return { arrived: false, dx: dx - dy, hit: r.hit };
}

function canSpot(ctx: GameContext, x: number, y: number, radius: number, from: 'ground' | 'air', seeHidden = false): boolean {
  const s = ctx.snail;
  if (s.fainted || ctx.snailSafe() || ctx.snailConcealed(from)) return false;
  if (s.hidden && !seeHidden) return false;
  return dist(x, y, s.x, s.y) < radius;
}

// ---------------------------------------------------------------------------
export class Hedgehog implements Enemy {
  x: number;
  y: number;
  private wp = 1;
  private state: 'patrol' | 'alert' | 'chase' | 'confused' | 'sated' = 'patrol';
  private t = 0;
  private cooldown = 0;
  private sprite: Phaser.GameObjects.Image;
  private zone: Phaser.GameObjects.Image;
  private bubble: Bubble;
  private walk = 0;
  private faceRight = true;

  constructor(private ctx: GameContext, private path: [number, number][], private radius = 3.2) {
    this.x = path[0][0] + 0.5;
    this.y = path[0][1] + 0.5;
    this.sprite = ctx.phaser.add.image(0, 0, 'hedgehog').setOrigin(0.5, 0.88).setScale(0.8);
    this.zone = ctx.phaser.add.image(0, 0, 'fx_zone').setDepth(-7600).setAlpha(0);
    this.bubble = new Bubble(ctx.phaser);
  }

  update(dt: number, time: number): void {
    const s = this.ctx.snail;
    const d = dist(this.x, this.y, s.x, s.y);
    let moving = false;
    if (this.cooldown > 0) this.cooldown -= dt;
    switch (this.state) {
      case 'patrol': {
        const [px, py] = this.path[this.wp];
        const m = moveToward(this.ctx, this, px + 0.5, py + 0.5, 0.9, dt);
        moving = true;
        if (m.dx) this.faceRight = m.dx > 0;
        if (m.arrived) this.wp = (this.wp + 1) % this.path.length;
        if (this.cooldown <= 0 && canSpot(this.ctx, this.x, this.y, this.radius, 'ground')) {
          this.state = 'alert';
          this.t = 0.65;
          this.bubble.show('alert', 1);
          Audio.play('warn');
        }
        break;
      }
      case 'alert':
        this.faceRight = s.x - s.y > this.x - this.y;
        this.t -= dt;
        if (this.t <= 0) {
          this.state = 'chase';
          this.t = 6;
        }
        break;
      case 'chase': {
        const m = moveToward(this.ctx, this, s.x, s.y, 1.85, dt);
        moving = true;
        if (m.dx) this.faceRight = m.dx > 0;
        this.t -= dt;
        if (d > this.radius * 2.2 || this.t <= 0 || this.ctx.snailSafe() || s.fainted || this.ctx.snailConcealed('ground')) {
          this.state = 'confused';
          this.t = 1.4;
          this.bubble.show('question', 1.4);
        } else if (d < 0.6) {
          if (s.hidden) {
            this.state = 'confused';
            this.t = 1.6;
            this.cooldown = 3;
            this.bubble.show('question', 1.6);
            this.ctx.fx.floatText(this.x, this.y, '*čuch čuch*', '#fff2c0');
          } else {
            this.ctx.damage(35, 'hedgehog', this.x, this.y);
            this.state = 'sated';
            this.t = 2.5;
            this.cooldown = 4.5;
          }
        }
        break;
      }
      case 'confused':
      case 'sated':
        this.t -= dt;
        if (this.t <= 0) {
          this.state = 'patrol';
          // resume at the nearest waypoint
          let best = 0;
          this.path.forEach((p, i) => {
            if (dist(p[0], p[1], this.x, this.y) < dist(this.path[best][0], this.path[best][1], this.x, this.y)) best = i;
          });
          this.wp = best;
        }
        break;
    }
    if (moving) this.walk += dt * (this.state === 'chase' ? 14 : 8);
    const p = toScreen(this.x, this.y);
    const hop = this.state === 'alert' ? -Math.abs(Math.sin(this.t * 12)) * 6 : 0;
    this.sprite.setPosition(p.x, p.y + hop).setDepth(depthOf(this.x, this.y, 1));
    this.sprite.setFlipX(!this.faceRight);
    const b = moving ? Math.sin(this.walk) * 0.05 : Math.sin(time / 400) * 0.02;
    this.sprite.setScale(0.8 * (1 - b * 0.5), 0.8 * (1 + b));
    this.zone.setPosition(p.x, p.y).setScale(zoneScale(this.radius));
    const near = clamp01((this.radius + 2.5 - d) / 2.5);
    const chasing = this.state === 'chase' || this.state === 'alert';
    this.zone.setAlpha(chasing ? 0.55 : near * 0.4).setTint(chasing ? 0xff6050 : 0xffffff);
    this.bubble.update(dt, p.x, p.y - 46);
  }

  threat(): number {
    if (this.state === 'chase' || this.state === 'alert') return 1;
    const s = this.ctx.snail;
    return clamp01(1 - dist(this.x, this.y, s.x, s.y) / (this.radius + 3)) * 0.3;
  }

  destroy(): void {
    this.sprite.destroy();
    this.zone.destroy();
    this.bubble.destroy();
  }
}

// ---------------------------------------------------------------------------
export class Bird implements Enemy {
  private angle = Math.random() * Math.PI * 2;
  private gx: number;
  private gy: number;
  private height = 170;
  private state: 'circle' | 'target' | 'dive' | 'rise' = 'circle';
  private t = 0;
  private cooldown = 3;
  private tx = 0;
  private ty = 0;
  private from = { x: 0, y: 0, h: 0 };
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private reticle: Phaser.GameObjects.Image;
  private flap = 0;

  constructor(private ctx: GameContext, private cx: number, private cy: number, private radius: number) {
    this.gx = cx;
    this.gy = cy;
    this.sprite = ctx.phaser.add.image(0, 0, 'bird').setDepth(850000).setScale(0.85);
    this.shadow = ctx.phaser.add.image(0, 0, 'bird_shadow').setDepth(-7400);
    this.reticle = ctx.phaser.add.image(0, 0, 'fx_reticle').setDepth(-7300).setVisible(false);
  }

  update(dt: number, time: number): void {
    const s = this.ctx.snail;
    if (this.cooldown > 0) this.cooldown -= dt;
    const orbit = () => {
      this.angle += dt * 0.45;
      return { x: this.cx + Math.cos(this.angle) * this.radius * 0.55, y: this.cy + Math.sin(this.angle) * this.radius * 0.55 };
    };
    switch (this.state) {
      case 'circle': {
        const o = orbit();
        this.gx += (o.x - this.gx) * Math.min(1, dt * 2);
        this.gy += (o.y - this.gy) * Math.min(1, dt * 2);
        this.height += (170 - this.height) * Math.min(1, dt * 2);
        const inZone = dist(s.x, s.y, this.cx, this.cy) < this.radius;
        if (this.cooldown <= 0 && inZone && canSpot(this.ctx, s.x, s.y, 999, 'air')) {
          this.state = 'target';
          this.t = 1.7;
          this.tx = s.x;
          this.ty = s.y;
          this.reticle.setVisible(true).setScale(zoneScale(1.4, 42)).setAlpha(0.2);
          Audio.play('warn');
        }
        break;
      }
      case 'target': {
        const o = orbit();
        this.gx += (o.x - this.gx) * Math.min(1, dt * 2);
        this.gy += (o.y - this.gy) * Math.min(1, dt * 2);
        this.t -= dt;
        if (this.t > 0.6) {
          // Reticle tracks the snail, then locks for the final 0.6s.
          this.tx += (s.x - this.tx) * Math.min(1, dt * 5);
          this.ty += (s.y - this.ty) * Math.min(1, dt * 5);
        }
        const k = 1 - this.t / 1.7;
        const pulse = this.t <= 0.6 ? 0.85 + Math.sin(time / 40) * 0.15 : 1;
        this.reticle.setScale(zoneScale(1.4 - k * 0.6, 42) * pulse).setAlpha(0.35 + k * 0.6);
        if (this.t <= 0) {
          this.state = 'dive';
          this.t = 0.45;
          this.from = { x: this.gx, y: this.gy, h: this.height };
          Audio.play('dive');
        }
        break;
      }
      case 'dive': {
        this.t -= dt;
        const k = Phaser.Math.Easing.Quadratic.In(1 - Math.max(0, this.t) / 0.45);
        this.gx = this.from.x + (this.tx - this.from.x) * k;
        this.gy = this.from.y + (this.ty - this.from.y) * k;
        this.height = this.from.h * (1 - k) + 10 * k;
        if (this.t <= 0) {
          this.reticle.setVisible(false);
          this.ctx.fx.ring(this.tx, this.ty, 0xffffff, 0.9);
          this.ctx.fx.puff(this.tx, this.ty, 0xd8c0a0, 10);
          if (dist(s.x, s.y, this.tx, this.ty) < 0.8 && !s.fainted) {
            if (s.hidden) this.ctx.fx.floatText(s.x, s.y, '*ťuk*', '#fff2c0');
            else this.ctx.damage(30, 'bird', this.tx, this.ty);
          }
          this.state = 'rise';
          this.t = 1.1;
        }
        break;
      }
      case 'rise': {
        this.t -= dt;
        this.height += (170 - this.height) * Math.min(1, dt * 2.5);
        if (this.t <= 0) {
          this.state = 'circle';
          this.cooldown = 4.5;
        }
        break;
      }
    }
    this.flap += dt * (this.state === 'dive' ? 0 : 6);
    const p = toScreen(this.gx, this.gy);
    const ahead = toScreen(this.gx - Math.sin(this.angle), this.gy + Math.cos(this.angle));
    this.sprite.setPosition(p.x, p.y - this.height);
    this.sprite.setTexture(this.state === 'dive' || Math.sin(this.flap) > 0 ? 'bird' : 'bird_flap');
    this.sprite.setFlipX(this.state === 'dive' ? this.tx - this.ty < this.from.x - this.from.y : ahead.x < p.x);
    this.sprite.setRotation(this.state === 'dive' ? 0.4 * (this.sprite.flipX ? -1 : 1) : Math.sin(this.flap * 0.5) * 0.05);
    const hk = 1 - this.height / 200;
    this.shadow.setPosition(p.x, p.y).setScale(0.5 + hk * 0.5).setAlpha(0.5 + hk * 0.5);
    const r = toScreen(this.tx, this.ty);
    this.reticle.setPosition(r.x, r.y);
  }

  threat(): number {
    return this.state === 'target' || this.state === 'dive' ? 1 : 0;
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.reticle.destroy();
  }
}

// ---------------------------------------------------------------------------
export class Frog implements Enemy {
  private state: 'idle' | 'puff' | 'tongue' | 'cool' = 'idle';
  private t = 0;
  private faceRight = true;
  private target = { x: 0, y: 0 };
  private checked = false;
  private sprite: Phaser.GameObjects.Image;
  private tongue: Phaser.GameObjects.Graphics;
  private zone: Phaser.GameObjects.Image;
  private bubble: Bubble;
  private idleT = 2;

  constructor(private ctx: GameContext, private x: number, private y: number, private radius = 3) {
    this.sprite = ctx.phaser.add.image(0, 0, 'frog').setOrigin(0.5, 0.88).setScale(0.85);
    this.tongue = ctx.phaser.add.graphics();
    this.zone = ctx.phaser.add.image(0, 0, 'fx_zone').setDepth(-7600).setAlpha(0).setScale(zoneScale(radius));
    this.bubble = new Bubble(ctx.phaser);
  }

  private mouth(): { x: number; y: number } {
    const p = toScreen(this.x, this.y);
    return { x: p.x + (this.faceRight ? 16 : -16), y: p.y - 14 };
  }

  update(dt: number, time: number): void {
    const s = this.ctx.snail;
    const d = dist(this.x, this.y, s.x, s.y);
    this.tongue.clear();
    switch (this.state) {
      case 'idle':
        this.idleT -= dt;
        if (this.idleT <= 0) {
          this.idleT = 2 + Math.random() * 3;
          this.ctx.phaser.tweens.add({ targets: this.sprite, scaleY: 0.95, scaleX: 0.9, duration: 120, yoyo: true });
        }
        if (canSpot(this.ctx, this.x, this.y, this.radius, 'ground')) {
          this.state = 'puff';
          this.t = 0.8;
          this.sprite.setTexture('frog_puff');
          this.bubble.show('alert', 0.8);
          Audio.play('croak');
        }
        break;
      case 'puff':
        this.faceRight = s.x - s.y > this.x - this.y;
        this.t -= dt;
        if (this.t > 0.15) {
          const dd = Math.min(d, this.radius);
          const a = Math.atan2(s.y - this.y, s.x - this.x);
          this.target = { x: this.x + Math.cos(a) * dd, y: this.y + Math.sin(a) * dd };
        }
        if (this.t <= 0) {
          this.state = 'tongue';
          this.t = 0;
          this.checked = false;
          this.sprite.setTexture('frog');
        }
        break;
      case 'tongue': {
        this.t += dt;
        const dur = 0.4;
        const ext = this.t < dur * 0.4 ? this.t / (dur * 0.4) : Math.max(0, 1 - (this.t - dur * 0.4) / (dur * 0.6));
        const tipW = { x: this.x + (this.target.x - this.x) * ext, y: this.y + (this.target.y - this.y) * ext };
        const m = this.mouth();
        const tip = toScreen(tipW.x, tipW.y);
        this.tongue.lineStyle(6, 0xb8455a, 1).lineBetween(m.x, m.y, tip.x, tip.y - 8);
        this.tongue.lineStyle(3.5, 0xff8aa0, 1).lineBetween(m.x, m.y, tip.x, tip.y - 8);
        this.tongue.fillStyle(0xff7a92, 1).fillCircle(tip.x, tip.y - 8, 6);
        if (!this.checked && ext >= 0.99) {
          this.checked = true;
          // distance from snail to the tongue segment
          const vx = this.target.x - this.x, vy = this.target.y - this.y;
          const L = vx * vx + vy * vy || 1;
          const u = Phaser.Math.Clamp(((s.x - this.x) * vx + (s.y - this.y) * vy) / L, 0, 1);
          const hd = dist(s.x, s.y, this.x + vx * u, this.y + vy * u);
          if (hd < 0.5 && !s.fainted) {
            if (s.hidden) this.ctx.fx.floatText(s.x, s.y, '*bum*', '#fff2c0');
            else this.ctx.damage(25, 'frog', this.x, this.y);
          }
        }
        if (this.t >= dur) {
          this.state = 'cool';
          this.t = 2.2;
        }
        break;
      }
      case 'cool':
        this.t -= dt;
        if (this.t <= 0) this.state = 'idle';
        break;
    }
    const p = toScreen(this.x, this.y);
    this.sprite.setPosition(p.x, p.y).setDepth(depthOf(this.x, this.y, 1)).setFlipX(!this.faceRight);
    if (this.state === 'puff') this.sprite.setScale(0.85 + Math.sin(time / 50) * 0.03);
    this.tongue.setDepth(this.sprite.depth + 0.5);
    this.zone.setPosition(p.x, p.y);
    const near = clamp01((this.radius + 2 - d) / 2);
    this.zone.setAlpha(this.state === 'puff' || this.state === 'tongue' ? 0.55 : near * 0.4).setTint(this.state === 'puff' ? 0xff6050 : 0xffffff);
    this.bubble.update(dt, p.x, p.y - 40);
  }

  threat(): number {
    return this.state === 'puff' || this.state === 'tongue' ? 1 : 0;
  }

  destroy(): void {
    this.sprite.destroy();
    this.tongue.destroy();
    this.zone.destroy();
    this.bubble.destroy();
  }
}

// ---------------------------------------------------------------------------
interface Ant {
  x: number;
  y: number;
  tx: number;
  ty: number;
  sprite: Phaser.GameObjects.Image;
  retarget: number;
  phase: number;
}

export class AntColony implements Enemy {
  private ants: Ant[] = [];
  private zone: Phaser.GameObjects.Image;
  private active = false;
  private hx: number;
  private hy: number;
  private warned = false;

  constructor(private ctx: GameContext, tx: number, ty: number, private radius = 3.5) {
    this.hx = tx + 0.5;
    this.hy = ty + 0.5;
    const p = toScreen(this.hx, this.hy);
    this.zone = ctx.phaser.add.image(p.x, p.y, 'fx_zone').setDepth(-7600).setTint(0xff7a40).setAlpha(0.3).setScale(zoneScale(radius));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const x = this.hx + Math.cos(a) * 1.0, y = this.hy + Math.sin(a) * 1.0;
      this.ants.push({ x, y, tx: x, ty: y, retarget: 0, phase: Math.random() * 6, sprite: ctx.phaser.add.image(0, 0, 'ant').setScale(0.9) });
    }
  }

  update(dt: number, time: number): void {
    const s = this.ctx.snail;
    const d = dist(this.hx, this.hy, s.x, s.y);
    const wasActive = this.active;
    this.active = d < this.radius && !this.ctx.snailSafe() && !s.fainted;
    if (this.active && !wasActive) {
      if (!this.warned) this.ctx.fx.floatText(this.hx, this.hy, 'Vetřelec!', '#ff9a7a');
      this.warned = true;
      Audio.play('warn');
    }
    let biting = 0;
    for (const a of this.ants) {
      a.retarget -= dt;
      let speed = 0.7;
      if (this.active) {
        a.tx = s.x + Math.cos(a.phase + time / 300) * 0.25;
        a.ty = s.y + Math.sin(a.phase + time / 300) * 0.25;
        speed = 2.3;
      } else if (a.retarget <= 0 || dist(a.x, a.y, this.hx, this.hy) > this.radius) {
        const ang = Math.random() * Math.PI * 2, r = 0.7 + Math.random() * 1.3;
        a.tx = this.hx + Math.cos(ang) * r;
        a.ty = this.hy + Math.sin(ang) * r;
        a.retarget = 1.5 + Math.random() * 2;
        speed = 1.6;
      }
      const dx = a.tx - a.x, dy = a.ty - a.y, dd = Math.hypot(dx, dy);
      if (dd > 0.05) {
        a.x += (dx / dd) * Math.min(dd, speed * dt);
        a.y += (dy / dd) * Math.min(dd, speed * dt);
      }
      if (this.active && dist(a.x, a.y, s.x, s.y) < 0.45) biting++;
      const p = toScreen(a.x, a.y);
      const sdx = dx - dy;
      a.sprite.setPosition(p.x, p.y - Math.abs(Math.sin(time / 60 + a.phase)) * 1.2).setDepth(depthOf(a.x, a.y, 0.5));
      if (Math.abs(sdx) > 0.02) a.sprite.setFlipX(sdx < 0);
    }
    if (biting > 0) this.ctx.damage(biting * 2.6 * dt * (s.hidden ? 0.35 : 1), 'ants');
    this.zone.setAlpha(this.active ? 0.45 + Math.sin(time / 120) * 0.1 : 0.22);
  }

  threat(): number {
    return this.active ? 0.8 : 0;
  }

  destroy(): void {
    this.ants.forEach((a) => a.sprite.destroy());
    this.zone.destroy();
  }
}

// ---------------------------------------------------------------------------
export class Beetle implements Enemy {
  x: number;
  y: number;
  private wp = 1;
  private state: 'patrol' | 'alert' | 'charge' | 'stunned' = 'patrol';
  private t = 0;
  private dir = { x: 0, y: 0 };
  private travelled = 0;
  private faceRight = true;
  private sprite: Phaser.GameObjects.Image;
  private zone: Phaser.GameObjects.Image;
  private bubble: Bubble;
  private lane: Phaser.GameObjects.Graphics;
  private walk = 0;

  constructor(private ctx: GameContext, private path: [number, number][], private radius = 4) {
    this.x = path[0][0] + 0.5;
    this.y = path[0][1] + 0.5;
    this.sprite = ctx.phaser.add.image(0, 0, 'beetle').setOrigin(0.5, 0.85);
    this.zone = ctx.phaser.add.image(0, 0, 'fx_zone').setDepth(-7600).setAlpha(0).setScale(zoneScale(radius));
    this.lane = ctx.phaser.add.graphics().setDepth(-7500);
    this.bubble = new Bubble(ctx.phaser);
  }

  update(dt: number, time: number): void {
    const s = this.ctx.snail;
    const d = dist(this.x, this.y, s.x, s.y);
    this.lane.clear();
    switch (this.state) {
      case 'patrol': {
        const [px, py] = this.path[this.wp];
        const m = moveToward(this.ctx, this, px + 0.5, py + 0.5, 1.1, dt);
        this.walk += dt * 10;
        if (m.dx) this.faceRight = m.dx > 0;
        if (m.arrived) this.wp = (this.wp + 1) % this.path.length;
        if (canSpot(this.ctx, this.x, this.y, this.radius, 'ground', true)) {
          this.state = 'alert';
          this.t = 0.85;
          this.bubble.show('alert', 0.9);
          Audio.play('warn');
        }
        break;
      }
      case 'alert': {
        this.t -= dt;
        if (this.t > 0.2) {
          const dx = s.x - this.x, dy = s.y - this.y, dd = Math.hypot(dx, dy) || 1;
          this.dir = { x: dx / dd, y: dy / dd };
          this.faceRight = dx - dy > 0;
        }
        // Telegraph: show the charge lane on the ground.
        const a = toScreen(this.x, this.y), b = toScreen(this.x + this.dir.x * 7, this.y + this.dir.y * 7);
        this.lane.lineStyle(10, 0xff5040, 0.18 + (0.85 - this.t) * 0.3).lineBetween(a.x, a.y, b.x, b.y);
        if (this.t <= 0) {
          this.state = 'charge';
          this.travelled = 0;
        }
        break;
      }
      case 'charge': {
        const step = 6.5 * dt;
        const r = this.ctx.map.move(this.x, this.y, this.dir.x * step, this.dir.y * step, 0.3, false);
        this.x = r.x;
        this.y = r.y;
        this.travelled += step;
        this.walk += dt * 30;
        if (Math.random() < 0.5) this.ctx.fx.puff(this.x, this.y, 0xd8c8a8, 1);
        if (dist(this.x, this.y, s.x, s.y) < 0.6 && !s.fainted) {
          if (s.hidden) {
            this.ctx.fx.floatText(s.x, s.y, '*BUM*', '#fff2c0');
            this.stun(2.2);
          } else {
            this.ctx.damage(30, 'beetle', this.x, this.y);
            this.stun(1.4);
          }
        } else if (r.hit) {
          this.ctx.fx.puff(this.x, this.y, 0xffffff, 8);
          this.stun(1.8);
        } else if (this.travelled > 7) this.stun(0.8);
        break;
      }
      case 'stunned':
        this.t -= dt;
        if (this.t <= 0) this.state = 'patrol';
        break;
    }
    void d;
    const p = toScreen(this.x, this.y);
    const shake = this.state === 'alert' ? Math.sin(time / 25) * 2 : 0;
    this.sprite.setPosition(p.x + shake, p.y).setDepth(depthOf(this.x, this.y, 1)).setFlipX(!this.faceRight);
    this.sprite.setRotation(this.state === 'stunned' ? Math.sin(time / 60) * 0.15 : Math.sin(this.walk) * 0.04);
    this.zone.setPosition(p.x, p.y);
    const near = clamp01((this.radius + 2 - dist(this.x, this.y, s.x, s.y)) / 2);
    this.zone.setAlpha(this.state === 'alert' || this.state === 'charge' ? 0.5 : near * 0.35).setTint(this.state === 'alert' ? 0xff6050 : 0xffffff);
    this.bubble.update(dt, p.x, p.y - 30);
  }

  private stun(t: number): void {
    this.state = 'stunned';
    this.t = t;
    this.bubble.show('question', t);
  }

  threat(): number {
    return this.state === 'alert' || this.state === 'charge' ? 1 : 0;
  }

  destroy(): void {
    this.sprite.destroy();
    this.zone.destroy();
    this.lane.destroy();
    this.bubble.destroy();
  }
}
