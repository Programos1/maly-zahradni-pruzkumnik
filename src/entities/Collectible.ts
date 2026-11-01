import Phaser from 'phaser';
import { depthOf, toScreen } from '../core/iso';
import type { ItemDef } from '../data/items';

/** An item lying in the garden, gently bobbing and glinting. */
export class Collectible {
  readonly sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private phase = Math.random() * Math.PI * 2;
  private glintT = Math.random() * 4;
  alive = true;

  constructor(scene: Phaser.Scene, readonly def: ItemDef, public x: number, public y: number, pop = false) {
    const p = toScreen(x, y);
    this.shadow = scene.add.image(p.x, p.y, 'shadow').setScale(def.large ? 0.6 : 0.42, 0.5).setDepth(-8300).setAlpha(0.8);
    this.sprite = scene.add.image(p.x, p.y, def.tex).setOrigin(0.5, 0.8).setDepth(depthOf(x, y)).setScale(def.large ? 0.9 : 0.85);
    if (def.category === 'treasure') this.sprite.setScale(1);
    if (pop) {
      this.sprite.setScale(0);
      scene.tweens.add({ targets: this.sprite, scale: def.large ? 0.9 : 0.85, duration: 400, ease: 'Back.easeOut' });
    }
  }

  update(dt: number, time: number, fx: { sparkles: (x: number, y: number, tint: number, n: number, lift: number) => void }): void {
    const p = toScreen(this.x, this.y);
    const bob = Math.sin(time / 380 + this.phase);
    this.sprite.setPosition(p.x, p.y - 4 - bob * 2.5);
    this.shadow.setScale((this.def.large ? 0.6 : 0.42) * (1 - bob * 0.08), 0.5);
    this.glintT -= dt;
    if (this.glintT <= 0) {
      const rare = this.def.category === 'treasure';
      this.glintT = rare ? 0.8 + Math.random() : 3 + Math.random() * 4;
      fx.sparkles(this.x, this.y, rare ? 0xffe680 : 0xffffff, rare ? 3 : 1, 16);
    }
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
