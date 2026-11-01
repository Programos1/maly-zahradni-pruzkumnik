import Phaser from 'phaser';
import { depthOf, dist, toScreen } from '../core/iso';
import { Audio } from '../audio/AudioEngine';
import { SNAIL } from '../config';
import { Save } from '../state/SaveData';
import type { Enemy, GameContext } from './GameContext';

/** Sticky spider web: holds the snail briefly, then lets it wriggle free. */
export class Web implements Enemy {
  private sprite: Phaser.GameObjects.Image;
  private cooldown = 0;
  private x: number;
  private y: number;

  constructor(private ctx: GameContext, tx: number, ty: number, private onFirst: () => void) {
    this.x = tx + 0.5;
    this.y = ty + 0.5;
    const p = toScreen(this.x, this.y);
    this.sprite = ctx.phaser.add.image(p.x, p.y, 'web').setDepth(-8400).setAlpha(0.9);
  }

  update(dt: number): void {
    const s = this.ctx.snail;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.cooldown <= 0 && !s.hidden && dist(s.x, s.y, this.x, this.y) < 0.55) {
      s.stuck = 1.3;
      s.vx = s.vy = 0;
      this.cooldown = 3.2;
      this.onFirst();
      this.ctx.fx.floatText(s.x, s.y, 'Uvízl jsi!', '#e8f4ff');
      this.ctx.phaser.tweens.add({ targets: this.sprite, scaleX: 1.12, scaleY: 0.9, duration: 120, yoyo: true, repeat: 4 });
    }
  }

  threat(): number {
    return 0;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

/** Garden shears snapping shut on a fixed rhythm, with a visible wind-up. */
export class Shears implements Enemy {
  private sprite: Phaser.GameObjects.Image;
  private zone: Phaser.GameObjects.Image;
  private x: number;
  private y: number;
  private prevPhase = 0;
  private offset = Math.random() * 3;
  private static PERIOD = 3.4;

  constructor(private ctx: GameContext, tx: number, ty: number) {
    this.x = tx + 0.5;
    this.y = ty + 0.5;
    const p = toScreen(this.x, this.y);
    this.sprite = ctx.phaser.add.image(p.x, p.y, 'shears_open').setOrigin(0.5, 0.65).setDepth(depthOf(this.x, this.y, 0));
    this.zone = ctx.phaser.add.image(p.x, p.y, 'fx_zone').setDepth(-7600).setScale(0.55).setTint(0xff5040).setAlpha(0);
  }

  update(_dt: number, time: number): void {
    const ph = (time / 1000 + this.offset) % Shears.PERIOD;
    const warn = ph > 2.4 && ph < 3.0;
    const closed = ph >= 3.0;
    this.sprite.setTexture(closed ? 'shears_closed' : 'shears_open');
    const p = toScreen(this.x, this.y);
    this.sprite.setX(p.x + (warn ? Math.sin(time / 20) * 1.5 : 0));
    this.zone.setAlpha(warn ? 0.35 + Math.sin(time / 50) * 0.2 : closed ? 0.6 : 0);
    if (this.prevPhase < 3.0 && ph >= 3.0) {
      const s = this.ctx.snail;
      const d = dist(s.x, s.y, this.x, this.y);
      if (d < 6) Audio.play('snip');
      if (d < 0.8 && !s.fainted) {
        if (s.hidden) this.ctx.damage(10, 'shears', this.x, this.y);
        else this.ctx.damage(30, 'shears', this.x, this.y);
      }
    }
    this.prevPhase = ph;
  }

  threat(): number {
    return 0;
  }

  destroy(): void {
    this.sprite.destroy();
    this.zone.destroy();
  }
}

/** Garden hose: drips as a warning, then sprays a line that pushes the snail and knocks items off. */
export class Hose implements Enemy {
  private marks: Phaser.GameObjects.Image[] = [];
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private t: number;
  private state: 'idle' | 'drip' | 'spray' = 'idle';
  private hitThisSpray = false;
  private ox: number;
  private oy: number;

  constructor(private ctx: GameContext, tx: number, ty: number, private dir: [number, number], private len: number, private period: number) {
    this.ox = tx + 0.5;
    this.oy = ty + 0.5;
    this.t = period * 0.5;
    for (let i = 1; i <= len; i++) {
      const p = toScreen(this.ox + dir[0] * i, this.oy + dir[1] * i);
      this.marks.push(ctx.phaser.add.image(p.x, p.y, 'fx_zone').setScale(0.42).setTint(0x60b0ff).setAlpha(0).setDepth(-7600));
    }
    const a = toScreen(this.ox, this.oy);
    const b = toScreen(this.ox + dir[0] * len, this.oy + dir[1] * len);
    const ang = Phaser.Math.RadToDeg(Math.atan2(b.y - a.y, b.x - a.x));
    const speed = Math.hypot(b.x - a.x, b.y - a.y) / 0.55;
    this.emitter = ctx.phaser.add.particles(a.x, a.y - 14, 'fx_drop', {
      angle: { min: ang - 5, max: ang + 5 }, speed: { min: speed * 0.85, max: speed * 1.05 }, lifespan: 560,
      scale: { start: 0.9, end: 0.5 }, alpha: { start: 0.9, end: 0.2 }, frequency: 18, quantity: 2, emitting: false,
    }).setDepth(700000);
  }

  update(dt: number, time: number): void {
    this.t -= dt;
    const s = this.ctx.snail;
    if (this.state === 'idle' && this.t <= 0) {
      this.state = 'drip';
      this.t = 1.3;
    } else if (this.state === 'drip') {
      if (Math.random() < dt * 8) this.ctx.fx.splash(this.ox + this.dir[0] * 0.4, this.oy + this.dir[1] * 0.4, 1);
      this.marks.forEach((m, i) => m.setAlpha(0.25 + Math.sin(time / 90 - i) * 0.15));
      if (this.t <= 0) {
        this.state = 'spray';
        this.t = 1.7;
        this.hitThisSpray = false;
        this.emitter.start();
        if (dist(s.x, s.y, this.ox, this.oy) < 10) Audio.play('spray');
      }
    } else if (this.state === 'spray') {
      this.marks.forEach((m) => m.setAlpha(0.45));
      const vx = this.dir[0], vy = this.dir[1];
      const u = (s.x - this.ox) * vx + (s.y - this.oy) * vy;
      const perp = Math.abs((s.x - this.ox) * vy - (s.y - this.oy) * vx);
      if (u > 0.3 && u < this.len + 0.4 && perp < 0.6 && !s.fainted) {
        const r = this.ctx.map.move(s.x, s.y, vx * 3.2 * dt, vy * 3.2 * dt, SNAIL.radius, Save.canClimb());
        s.x = r.x;
        s.y = r.y;
        s.moisture = SNAIL.maxMoisture;
        if (!this.hitThisSpray) {
          this.hitThisSpray = true;
          this.ctx.fx.splash(s.x, s.y, 14);
          Audio.play('splash');
          if (!s.hidden) {
            this.ctx.damage(8, 'hose');
            this.ctx.knockOffItem();
          }
        }
      }
      if (this.t <= 0) {
        this.state = 'idle';
        this.t = Math.max(1.5, this.period - 3);
        this.emitter.stop();
        this.marks.forEach((m) => m.setAlpha(0));
      }
    }
  }

  threat(): number {
    return 0;
  }

  destroy(): void {
    this.emitter.destroy();
    this.marks.forEach((m) => m.destroy());
  }
}
