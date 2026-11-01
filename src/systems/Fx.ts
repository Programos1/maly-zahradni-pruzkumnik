import Phaser from 'phaser';
import { toScreen } from '../core/iso';

const FX_DEPTH = 900000;

/** Particle & floating-text effects. All positions are world tile coordinates unless noted. */
export class Fx {
  private sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
  private dots: Phaser.GameObjects.Particles.ParticleEmitter;
  private drops: Phaser.GameObjects.Particles.ParticleEmitter;
  private bits: Phaser.GameObjects.Particles.ParticleEmitter;
  private hearts: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: Phaser.Scene) {
    this.sparkle = scene.add.particles(0, 0, 'fx_sparkle', {
      speed: { min: 30, max: 110 }, lifespan: 600, scale: { start: 0.9, end: 0 }, rotate: { min: 0, max: 180 },
      gravityY: 60, emitting: false,
    }).setDepth(FX_DEPTH);
    this.dots = scene.add.particles(0, 0, 'fx_dot', {
      speed: { min: 10, max: 50 }, lifespan: 700, scale: { start: 0.8, end: 0 }, alpha: { start: 0.8, end: 0 },
      emitting: false,
    }).setDepth(FX_DEPTH);
    this.drops = scene.add.particles(0, 0, 'fx_drop', {
      speed: { min: 40, max: 140 }, angle: { min: 200, max: 340 }, lifespan: 600, gravityY: 400,
      scale: { start: 0.9, end: 0.4 }, emitting: false,
    }).setDepth(FX_DEPTH);
    this.bits = scene.add.particles(0, 0, 'fx_leafbit', {
      speed: { min: 30, max: 90 }, angle: { min: 200, max: 340 }, lifespan: 700, gravityY: 300,
      rotate: { min: 0, max: 360 }, scale: { start: 0.9, end: 0.3 }, emitting: false,
    }).setDepth(FX_DEPTH);
    this.hearts = scene.add.particles(0, 0, 'fx_heart', {
      speedY: { min: -60, max: -30 }, speedX: { min: -20, max: 20 }, lifespan: 1000,
      scale: { start: 0.9, end: 0.4 }, alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(FX_DEPTH);
  }

  sparkles(wx: number, wy: number, tint = 0xffffff, n = 10, lift = 10): void {
    const p = toScreen(wx, wy);
    this.sparkle.setParticleTint(tint);
    this.sparkle.explode(n, p.x, p.y - lift);
  }

  puff(wx: number, wy: number, tint = 0xffffff, n = 8): void {
    const p = toScreen(wx, wy);
    this.dots.setParticleTint(tint);
    this.dots.explode(n, p.x, p.y - 4);
  }

  splash(wx: number, wy: number, n = 10): void {
    const p = toScreen(wx, wy);
    this.drops.explode(n, p.x, p.y - 4);
  }

  crumbs(wx: number, wy: number, tint: number, n = 8): void {
    const p = toScreen(wx, wy);
    this.bits.setParticleTint(tint);
    this.bits.explode(n, p.x, p.y - 12);
  }

  heart(wx: number, wy: number, n = 3): void {
    const p = toScreen(wx, wy);
    this.hearts.explode(n, p.x, p.y - 30);
  }

  floatText(wx: number, wy: number, text: string, color = '#ffffff', big = false): void {
    const p = toScreen(wx, wy);
    const t = this.scene.add
      .text(p.x, p.y - 40, text, {
        fontFamily: 'Fredoka, "Trebuchet MS", sans-serif',
        fontSize: big ? '22px' : '15px',
        fontStyle: 'bold',
        color,
        stroke: '#3a2a1a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(FX_DEPTH + 1)
      .setResolution(2);
    this.scene.tweens.add({ targets: t, y: t.y - 34, alpha: 0, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** Expanding ring on the ground (ripples, landing impacts). */
  ring(wx: number, wy: number, tint = 0xffffff, scale = 0.6): void {
    const p = toScreen(wx, wy);
    const r = this.scene.add.image(p.x, p.y, 'fx_ring').setTint(tint).setScale(scale * 0.2).setDepth(-7000).setAlpha(0.8);
    this.scene.tweens.add({ targets: r, scale, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
  }
}
