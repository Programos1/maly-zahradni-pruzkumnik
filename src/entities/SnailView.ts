import Phaser from 'phaser';
import { depthOf, toScreen } from '../core/iso';
import { SHELL_DECOS } from '../data/nest';
import type { ItemDef } from '../data/items';
import { Save } from '../state/SaveData';
import type { Snail } from './Snail';

/** Where small carried items stick on the shell (local coords relative to shell center). */
const SLOTS: [number, number, number][] = [
  [-4, -20, -0.3], [12, -14, 0.5], [-20, -12, -0.7], [6, -4, 0.2], [-14, 2, -0.2],
  [16, 2, 0.6], [-2, -12, 0.1], [-22, -24, -0.5], [20, -24, 0.7], [0, 6, 0],
];
const DECO_POS: Record<string, [number, number, number]> = {
  flower: [-6, -21, 0], moss: [-2, -19, 0], mushroom: [12, -18, 0.25], stones: [-18, -6, -0.3],
  leaf: [-18, -22, 0], button: [6, -2, 0],
};
const BASE_SCALE = 0.7;

/** Renders the snail from Snail state: body, shell, eye stalks, decorations, carried items, slime trail. */
export class SnailView {
  readonly root: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Image;
  private body: Phaser.GameObjects.Image;
  private shellGroup: Phaser.GameObjects.Container;
  private shell: Phaser.GameObjects.Image;
  private decoLayer: Phaser.GameObjects.Container;
  private carryLayer: Phaser.GameObjects.Container;
  private stalks: Phaser.GameObjects.Graphics;
  private eyes: Phaser.GameObjects.Image[];
  private dragged: { img: Phaser.GameObjects.Image; def: ItemDef }[] = [];
  private cart?: Phaser.GameObjects.Image;
  private thread: Phaser.GameObjects.Graphics;
  private slime: Phaser.GameObjects.Image[] = [];
  private slimeIdx = 0;
  private lastSlimeDist = 0;
  private blinkT = 2;
  private blink = 0;
  private lookT = 0;
  private look = 0;
  private lookTarget = 0;
  private stalkLag = { x: 0, y: 0 };
  private carriedKey = '';

  constructor(private scene: Phaser.Scene, private snail: Snail) {
    for (let i = 0; i < 90; i++) {
      const s = scene.add.image(0, 0, 'slime').setAlpha(0).setDepth(-9000);
      this.slime.push(s);
    }
    this.thread = scene.add.graphics().setDepth(-8000);
    this.shadow = scene.add.image(0, 2, 'shadow').setScale(0.9, 0.9);
    this.body = scene.add.image(0, 0, 'snail_body').setOrigin(0.5, 0.88);
    this.shell = scene.add.image(0, 0, 'snail_shell');
    this.decoLayer = scene.add.container(0, 0);
    this.carryLayer = scene.add.container(0, 0);
    this.shellGroup = scene.add.container(-12, -24, [this.shell, this.decoLayer, this.carryLayer]);
    this.stalks = scene.add.graphics();
    this.eyes = [scene.add.image(0, 0, 'snail_eye'), scene.add.image(0, 0, 'snail_eye')];
    this.root = scene.add.container(0, 0, [this.shadow, this.body, this.stalks, this.eyes[0], this.shellGroup, this.eyes[1]]);
    this.refreshDecorations();
  }

  refreshDecorations(): void {
    this.decoLayer.removeAll(true);
    for (const id of Save.data.decosOn) {
      const d = SHELL_DECOS.find((x) => x.id === id);
      const p = DECO_POS[id];
      if (!d || !p) continue;
      this.decoLayer.add(this.scene.add.image(p[0], p[1], d.tex).setRotation(p[2]).setScale(0.9));
    }
  }

  private syncCarried(): void {
    const key = this.snail.carried.map((d) => d.id).join(',') + (Save.data.upgrades.cart ? 'c' : '');
    if (key === this.carriedKey) return;
    this.carriedKey = key;
    this.carryLayer.removeAll(true);
    this.dragged.forEach((d) => d.img.destroy());
    this.dragged = [];
    let slot = 0;
    for (const def of this.snail.carried) {
      if (def.large) {
        const img = this.scene.add.image(0, 0, def.tex).setOrigin(0.5, 0.75).setScale(0.8);
        this.dragged.push({ img, def });
      } else {
        const [x, y, r] = SLOTS[slot % SLOTS.length];
        slot++;
        this.carryLayer.add(this.scene.add.image(x, y, def.tex).setScale(0.58).setRotation(r));
      }
    }
    if (Save.data.upgrades.cart && this.dragged.length > 0) {
      if (!this.cart) this.cart = this.scene.add.image(0, 0, 'item_leaf').setScale(2.4, 1.6).setOrigin(0.5, 0.6);
      this.cart.setVisible(true);
    } else this.cart?.setVisible(false);
  }

  /** Pop animation when an item lands on the shell. */
  bumpShell(): void {
    this.scene.tweens.add({ targets: this.shellGroup, scaleX: 1.15, scaleY: 0.88, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  hurtFlash(): void {
    this.body.setTint(0xff7070);
    this.shell.setTint(0xff9090);
    this.scene.time.delayedCall(180, () => {
      this.body.clearTint();
      this.shell.clearTint();
    });
  }

  update(dt: number, time: number): void {
    const s = this.snail;
    this.syncCarried();
    const p = toScreen(s.x, s.y);
    const scale = BASE_SCALE * Save.sizeScale();
    this.root.setPosition(p.x, p.y);
    this.root.setDepth(depthOf(s.x, s.y, 2));
    this.root.setScale(s.faceRight ? scale : -scale, scale);

    const t = time / 1000;
    const walkPhase = s.distance * 9;
    const moving = s.anim === 'walk';
    const hide = s.hideAmount;

    // Body: squash & stretch while walking, gentle breathing when idle.
    let bx = 1, by = 1;
    if (moving) {
      bx = 1 + Math.sin(walkPhase) * 0.07;
      by = 1 - Math.sin(walkPhase) * 0.05;
    } else {
      by = 1 + Math.sin(t * 2.2) * 0.02;
    }
    if (s.anim === 'eat') {
      const m = Math.abs(Math.sin(s.animTime * 16));
      bx += m * 0.06;
      by -= m * 0.05;
    }
    if (s.anim === 'collect') by += Math.sin(Math.min(1, s.animTime / 0.35) * Math.PI) * 0.08;
    this.body.setTexture(s.faceBack ? 'snail_body_back' : 'snail_body');
    this.body.setScale(bx * (1 - hide * 0.55), by * (1 - hide * 0.8));
    this.body.setAlpha(1 - hide * 0.9);

    // Shell bobs with the gait and sinks onto the ground when hiding.
    const bob = moving ? Math.sin(walkPhase + 0.6) * 1.4 : Math.sin(t * 2.2) * 0.5;
    let hop = 0;
    if (s.anim === 'collect') hop = -Math.sin(Math.min(1, s.animTime / 0.35) * Math.PI) * 5;
    let shake = 0;
    if (s.anim === 'hurt' && s.animTime < 0.4) shake = Math.sin(s.animTime * 70) * 3;
    if (s.hidden) shake += Math.sin(t * 30) * 0.4;
    this.shellGroup.setPosition(-12 + hide * 10 + shake, -24 + bob + hop + hide * 10);
    this.shellGroup.setRotation((moving ? Math.sin(walkPhase) * 0.04 : 0) + hide * -0.15);
    this.shadow.setScale(0.9 * (1 - hide * 0.25), 0.9);

    // Eye stalks: springy lag behind movement, idle looking around, blinking.
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.14;
      this.blinkT = 2.5 + Math.random() * 3;
    }
    if (this.blink > 0) this.blink -= dt;
    this.lookT -= dt;
    if (this.lookT <= 0) {
      this.lookTarget = moving ? 0 : (Math.random() - 0.5) * 1.2;
      this.lookT = 1.5 + Math.random() * 2.5;
    }
    this.look += (this.lookTarget - this.look) * Math.min(1, dt * 3);
    const sx = (s.vx - s.vy) * (s.faceRight ? 1 : -1);
    const sy = s.vx + s.vy;
    this.stalkLag.x += (-sx * 2.5 - this.stalkLag.x) * Math.min(1, dt * 6);
    this.stalkLag.y += (-sy * 1.2 - this.stalkLag.y) * Math.min(1, dt * 6);

    let len = 1;
    if (s.anim === 'hurt') len = 0.45 + Math.min(1, s.animTime / 0.6) * 0.55;
    if (s.anim === 'collect') len = 1.15;
    len *= 1 - hide;
    const bodyShiftX = (bx - 1) * 22;
    const bases: [number, number][] = [[19 + bodyShiftX, -35 * by], [26 + bodyShiftX, -34 * by]];
    const tipsRel: [number, number][] = [[4, -19], [10, -16]];
    this.stalks.clear();
    const stalkCol = s.faceBack ? 0xe4bd88 : 0xf0cd98;
    for (let i = 0; i < 2; i++) {
      const [bxp, byp] = bases[i];
      const sway = Math.sin(t * 2.4 + i * 1.3) * 1.6 + this.look * 6 + this.stalkLag.x;
      const tipX = bxp + (tipsRel[i][0] + sway) * len;
      const tipY = byp + (tipsRel[i][1] + this.stalkLag.y * 0.5 + Math.cos(t * 2 + i) * 0.8) * len;
      const midX = (bxp + tipX) / 2 - 2 * len;
      const midY = (byp + tipY) / 2;
      this.stalks.lineStyle(4.6, 0xa87a55, 1 - hide);
      this.drawCurve(bxp, byp, midX, midY, tipX, tipY);
      this.stalks.lineStyle(3, stalkCol, 1 - hide);
      this.drawCurve(bxp, byp, midX, midY, tipX, tipY);
      const eye = this.eyes[i];
      eye.setPosition(tipX, tipY);
      eye.setTexture(s.faceBack ? 'snail_eye_back' : 'snail_eye');
      eye.setScale(0.9 * Math.max(0.01, len), (this.blink > 0 ? 0.15 : 0.9) * Math.max(0.01, len));
      eye.setVisible(len > 0.05);
    }

    // Invulnerability blink.
    this.root.setAlpha(s.invuln > 0 && Math.floor(t * 14) % 2 === 0 ? 0.55 : s.fainted ? 0.4 : 1);

    // Dragged large items follow the breadcrumb trail on a slime thread.
    this.thread.clear();
    let prev = this.shellAnchor();
    this.dragged.forEach((d, i) => {
      const tp = s.trailPoint(0.62 + i * 0.5);
      const sp = toScreen(tp.x, tp.y);
      d.img.setPosition(sp.x, sp.y + (Save.data.upgrades.cart ? -4 : 0));
      d.img.setDepth(depthOf(tp.x, tp.y, 1));
      d.img.setRotation(Math.sin(s.distance * 6 + i) * 0.08);
      this.thread.lineStyle(1.5, 0xdff4ff, 0.7);
      this.thread.lineBetween(prev.x, prev.y, sp.x, sp.y - 6);
      prev = { x: sp.x, y: sp.y - 6 };
      if (i === 0 && this.cart) {
        this.cart.setPosition(sp.x, sp.y + 4).setDepth(depthOf(tp.x, tp.y, 0.5));
      }
    });
    this.thread.setDepth(this.root.depth - 1);

    // Slime trail: drop a glossy blob every little bit travelled; they fade over time.
    if (s.distance - this.lastSlimeDist > 0.13) {
      this.lastSlimeDist = s.distance;
      const tail = s.trailPoint(0.18);
      const tp = toScreen(tail.x, tail.y);
      const blob = this.slime[this.slimeIdx++ % this.slime.length];
      blob.setPosition(tp.x + (Math.random() - 0.5) * 3, tp.y + 1).setAlpha(0.55).setScale(0.8 + Math.random() * 0.3, 0.8);
    }
    for (const b of this.slime) if (b.alpha > 0) b.setAlpha(Math.max(0, b.alpha - dt * 0.07));
  }

  private drawCurve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): void {
    const c = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x0, y0), new Phaser.Math.Vector2(cx, cy), new Phaser.Math.Vector2(x1, y1));
    c.draw(this.stalks, 8);
  }

  /** World-screen position of the shell (used for item fly-in and threads). */
  shellAnchor(): { x: number; y: number } {
    const sc = this.root.scaleY;
    const dir = this.snail.faceRight ? 1 : -1;
    return { x: this.root.x + this.shellGroup.x * sc * dir, y: this.root.y + this.shellGroup.y * sc };
  }

  destroy(): void {
    this.root.destroy();
    this.thread.destroy();
    this.cart?.destroy();
    this.dragged.forEach((d) => d.img.destroy());
    this.slime.forEach((s) => s.destroy());
  }
}
