import Phaser from 'phaser';
import { RESPAWN_INTERVAL, SNAIL } from '../config';
import { bus } from '../core/EventBus';
import { dist, toScreen } from '../core/iso';
import { Audio } from '../audio/AudioEngine';
import { ITEMS, type ItemDef } from '../data/items';
import { LEVELS, type LevelDef, type ObjectiveDef } from '../data/levels';
import { Save } from '../state/SaveData';
import { LevelMap } from '../world/LevelMap';
import { WorldView } from '../world/WorldView';
import { Snail, type SnailInput } from '../entities/Snail';
import { SnailView } from '../entities/SnailView';
import { Collectible } from '../entities/Collectible';
import { AntColony, Beetle, Bird, Frog, Hedgehog } from '../entities/Enemies';
import { Hose, Shears, Web } from '../entities/Hazards';
import type { DamageSource, Enemy, GameContext } from '../entities/GameContext';
import { Fx } from '../systems/Fx';
import { plural } from '../core/plural';
import { Objectives, type ObjectiveView } from '../systems/Objectives';

export interface GameStartData {
  level: number;
  demo?: boolean;
}

export interface HudState {
  level: string;
  levelIndex: number;
  health: number;
  moisture: number;
  growth: number;
  growthFrac: number;
  points: number;
  carried: { id: string; name: string; tex: string; category: string; large: boolean }[];
  slots: number;
  capacity: number;
  objective: string;
  objectives: ObjectiveView[];
  hidden: boolean;
  boost: boolean;
  inSun: boolean;
  safe: boolean;
}

const CONTINUOUS: DamageSource[] = ['ants', 'dry', 'wet'];
const PREDATORS: DamageSource[] = ['hedgehog', 'bird', 'frog', 'ants', 'beetle'];
const FOOD_TINT: Record<string, number> = {
  mushroom: 0xe24b3b, strawberry: 0xff5b5b, raspberry: 0xe0386a, berry: 0x4a63c8, dew: 0x9fd8ff,
};

export class GameScene extends Phaser.Scene implements GameContext {
  map!: LevelMap;
  snail!: Snail;
  fx!: Fx;
  private world!: WorldView;
  private view!: SnailView;
  private def!: LevelDef;
  private enemies: Enemy[] = [];
  private items: Collectible[] = [];
  private objectives!: Objectives;
  private levelIndex = 0;
  private demo = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private highlight!: Phaser.GameObjects.Image;
  private hudTimer = 0;
  private respawnTimer = RESPAWN_INTERVAL;
  private initialNatural = 0;
  private reach!: Uint8Array;
  private prompt = '';
  private completed = false;
  private lastFlash = 0;
  private hints = new Set<string>();
  private demoTarget = { x: 0, y: 0, wait: 0, stuck: 0 };
  private spawn = { x: 0, y: 0 };

  constructor() {
    super('Game');
  }

  get phaser(): Phaser.Scene {
    return this;
  }

  init(data: GameStartData): void {
    this.levelIndex = data.level ?? 0;
    this.demo = !!data.demo;
    this.enemies = [];
    this.items = [];
    this.completed = false;
    this.prompt = '';
    this.hints.clear();
    this.respawnTimer = RESPAWN_INTERVAL;
  }

  create(): void {
    this.def = LEVELS[this.levelIndex];
    this.map = new LevelMap(this.def);
    this.world = new WorldView(this, this.map);
    this.fx = new Fx(this);
    this.reach = this.map.reachable(false);

    this.spawn = { x: this.map.nest.x + 1.1, y: this.map.nest.y + 1.1 };
    this.snail = new Snail(this.spawn.x, this.spawn.y);
    this.view = new SnailView(this, this.snail);
    this.highlight = this.add.image(0, 0, 'fx_ring').setDepth(-7200).setScale(0.32).setAlpha(0).setTint(0xfff3a0);

    this.objectives = new Objectives(this.def.objectives, (d) => this.onObjective(d));
    this.objectives.nestStage(Save.data.nestStage);

    this.spawnEnemies();
    this.spawnItems();

    // camera
    const cam = this.cameras.main;
    const b = this.world.bounds;
    cam.setBounds(b.x - 240, -260, b.width + 480, b.height + 420);
    cam.startFollow(this.view.root, false, 0.08, 0.08, 0, 20);
    const sp = toScreen(this.snail.x, this.snail.y);
    cam.centerOn(sp.x, sp.y);
    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;

    // Key-ups that happen while paused or unfocused are lost; clear key state so nothing sticks.
    const resetKeys = () => kb.resetKeys();
    this.events.on('resume', resetKeys);
    window.addEventListener('blur', resetKeys);

    const onNest = () => this.onNestChanged();
    bus.on('ui:nestChanged', onNest);
    this.events.once('shutdown', () => {
      window.removeEventListener('blur', resetKeys);
      this.events.off('resume', resetKeys);
      bus.off('ui:nestChanged', onNest);
      this.scale.off('resize', this.applyZoom, this);
      Audio.slime(0);
    });

    this.startAudio();

    if (this.demo) cam.fadeIn(500, 255, 250, 235);
    if (!this.demo) {
      bus.emit('levelStart', { index: this.levelIndex, def: this.def });
      this.emitHud();
    }
  }

  /** (Re)start ambience and music for this level; also called once audio is unlocked by a user gesture. */
  startAudio(): void {
    Audio.startAmbience({ water: this.def.theme === 'pond' || this.def.theme === 'veggie', birds: !this.def.night, night: this.def.night });
    Audio.stopMusic();
    Audio.startMusic(this.def.music);
  }

  private applyZoom(): void {
    const w = this.scale.width, h = this.scale.height;
    const z = Phaser.Math.Clamp(Math.min(w / 980, h / 660) * (this.demo ? 1.1 : 1.35), 0.75, 2.4);
    this.cameras.main.setZoom(z);
  }

  // ---------------------------------------------------------------- setup
  private spawnEnemies(): void {
    for (const e of this.def.enemies) {
      if (e.type === 'hedgehog') this.enemies.push(new Hedgehog(this, e.path, e.radius));
      else if (e.type === 'beetle') this.enemies.push(new Beetle(this, e.path, e.radius));
      else if (e.type === 'bird') this.enemies.push(new Bird(this, e.center[0] + 0.5, e.center[1] + 0.5, e.radius));
      else if (e.type === 'frog') this.enemies.push(new Frog(this, e.x + 0.5, e.y + 0.5, e.radius));
    }
    for (const a of this.map.anthills) this.enemies.push(new AntColony(this, a.tx, a.ty));
    for (const w of this.map.webs) this.enemies.push(new Web(this, w.tx, w.ty, () => this.hint('web', 'Uvízl jsi v pavučině! Chvilku vydrž, než se vyprostíš.')));
    for (const s of this.map.shears) this.enemies.push(new Shears(this, s.tx, s.ty));
    for (const h of this.def.hoses ?? []) this.enemies.push(new Hose(this, h.x, h.y, h.dir, h.len, h.period));
  }

  private occupied(tx: number, ty: number): boolean {
    return this.items.some((it) => Math.floor(it.x) === tx && Math.floor(it.y) === ty);
  }

  private randomSpot(area?: [number, number, number, number], minDistFromSnail = 0): { x: number; y: number } | null {
    const [x0, y0, x1, y1] = area ?? [1, 1, this.map.w - 2, this.map.h - 2];
    for (let tries = 0; tries < 200; tries++) {
      const tx = Phaser.Math.Between(x0, x1), ty = Phaser.Math.Between(y0, y1);
      if (!this.map.itemSpot(tx, ty)) continue;
      if (!area && !this.reach[ty * this.map.w + tx]) continue;
      if (this.occupied(tx, ty)) continue;
      if (dist(tx + 0.5, ty + 0.5, this.map.nest.x, this.map.nest.y) < 2.2) continue;
      if (dist(tx + 0.5, ty + 0.5, this.map.recycle.x, this.map.recycle.y) < 1.5) continue;
      if (minDistFromSnail && dist(tx, ty, this.snail.x, this.snail.y) < minDistFromSnail) continue;
      return { x: tx + 0.5 + Phaser.Math.FloatBetween(-0.2, 0.2), y: ty + 0.5 + Phaser.Math.FloatBetween(-0.2, 0.2) };
    }
    return null;
  }

  private spawnItems(): void {
    for (const f of this.def.fixed) {
      this.items.push(new Collectible(this, ITEMS[f.item], f.x + 0.5, f.y + 0.5));
    }
    for (const sc of this.def.scatter) {
      for (let i = 0; i < sc.count; i++) {
        const spot = this.randomSpot(sc.area);
        if (!spot) continue;
        const id = sc.items[Math.floor(Math.random() * sc.items.length)];
        this.items.push(new Collectible(this, ITEMS[id], spot.x, spot.y));
      }
    }
    this.initialNatural = this.items.filter((i) => i.def.category === 'resource' || i.def.category === 'food').length;
  }

  // ---------------------------------------------------------------- GameContext
  snailSafe(): boolean {
    return dist(this.snail.x, this.snail.y, this.map.nest.x, this.map.nest.y) < 2.3;
  }

  snailConcealed(from: 'ground' | 'air'): boolean {
    const s = this.snail;
    if (this.map.flag(this.map.pile, s.x, s.y)) return true;
    return from === 'air' && this.map.flag(this.map.shade, s.x, s.y);
  }

  damage(amount: number, source: DamageSource, fromX?: number, fromY?: number): void {
    const s = this.snail;
    if (this.demo || s.fainted) return;
    if (PREDATORS.includes(source) || source === 'shears') amount *= Save.armorMul();
    if (CONTINUOUS.includes(source)) {
      if (this.time.now - this.lastFlash > 450) {
        this.lastFlash = this.time.now;
        this.view.hurtFlash();
        if (source === 'ants') this.fx.floatText(s.x, s.y, 'au!', '#ffb0a0');
      }
      if (source === 'ants') this.objectives.hurtBy('ants');
    } else {
      if (s.invuln > 0) return;
      s.invuln = SNAIL.invulnTime;
      s.setAnim('hurt');
      this.view.hurtFlash();
      Audio.play('hurt');
      this.cameras.main.shake(160, 0.006);
      this.fx.floatText(s.x, s.y, `-${Math.round(amount)}`, '#ff8070', true);
      this.objectives.hurtBy(source);
      if (fromX !== undefined && fromY !== undefined) {
        const dx = s.x - fromX, dy = s.y - fromY, d = Math.hypot(dx, dy) || 1;
        for (let i = 0; i < 8; i++) {
          const r = this.map.move(s.x, s.y, (dx / d) * 0.1, (dy / d) * 0.1, SNAIL.radius, Save.canClimb());
          s.x = r.x;
          s.y = r.y;
        }
        s.vx = s.vy = 0;
      }
      if (PREDATORS.includes(source)) this.knockOffItem();
      if (source === 'hedgehog') this.hint('hog', 'Tip: podrž MEZERNÍK a schovej se do ulity. Na zavřenou ulitu ježek nemá!');
      if (source === 'bird') this.hint('bird', 'Tip: když se objeví červený terč, uhni nebo se schovej do ulity.');
    }
    s.health -= amount;
    if (s.health <= 0) this.faint();
  }

  knockOffItem(): void {
    const s = this.snail;
    if (!s.carried.length) return;
    const idx = Math.floor(Math.random() * s.carried.length);
    const [def] = s.carried.splice(idx, 1);
    this.dropItem(def);
    this.fx.floatText(s.x, s.y - 0.3, `Ztraceno: ${def.name}!`, '#ffe0a0');
  }

  private dropItem(def: ItemDef): void {
    const s = this.snail;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.7 + Math.random() * 0.8;
      const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
      if (this.map.itemSpot(Math.floor(x), Math.floor(y))) {
        this.items.push(new Collectible(this, def, x, y, true));
        return;
      }
    }
    this.items.push(new Collectible(this, def, s.x, s.y, true));
  }

  private faint(): void {
    const s = this.snail;
    s.fainted = true;
    s.health = 0;
    s.vx = s.vy = 0;
    const lost = s.carried.splice(0);
    lost.forEach((d) => this.dropItem(d));
    bus.emit('toast', { text: 'Au! Omdlel jsi. Věci ti vypadly tam, kde jsi padl. Zpátky do hnízda…', kind: 'bad' });
    this.time.delayedCall(1100, () => this.cameras.main.fadeOut(500, 40, 30, 20));
    this.time.delayedCall(1700, () => {
      s.x = this.spawn.x;
      s.y = this.spawn.y;
      s.trail.forEach((p) => {
        p.x = s.x;
        p.y = s.y;
      });
      s.health = 60;
      s.moisture = 80;
      s.fainted = false;
      s.invuln = 2.5;
      s.stuck = 0;
      const p = toScreen(s.x, s.y);
      this.cameras.main.centerOn(p.x, p.y);
      this.cameras.main.fadeIn(600, 40, 30, 20);
    });
  }

  // ---------------------------------------------------------------- loop
  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    const s = this.snail;
    const input = this.demo ? this.demoInput(dt) : this.readInput();
    const wasHidden = s.hidden;
    s.update(dt, input, this.map);
    if (s.hidden !== wasHidden && !this.demo) Audio.play(s.hidden ? 'hide' : 'unhide');

    if (!this.demo) this.environment(dt);
    for (const e of this.enemies) e.update(dt, time);
    for (const it of this.items) it.update(dt, time, this.fx);

    if (!this.demo && Phaser.Input.Keyboard.JustDown(this.keys.E)) this.interact();

    this.view.update(dt, time);
    this.world.update(time);
    this.world.updateOcclusion(this.view.root.x, this.view.root.y, this.view.root.depth);
    if (this.map.flag(this.map.pile, s.x, s.y)) {
      if (s.speed > 0.3) this.world.rustle(Math.floor(s.x), Math.floor(s.y));
      this.view.root.setAlpha(0.6);
    }

    this.updateHighlight(time);
    if (!this.demo) {
      Audio.slime(s.fainted ? 0 : Math.min(1, s.speed / 2));
      const threat = this.enemies.reduce((m, e) => Math.max(m, e.threat()), 0);
      bus.emit('threat', threat);
      this.respawn(dt);
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) {
        this.hudTimer = 0.1;
        this.emitHud();
      }
    }
  }

  private readInput(): SnailInput {
    const k = this.keys;
    const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    return { dx, dy, hide: k.SPACE.isDown };
  }

  /** Attract-mode wandering for the menu background. */
  private demoInput(dt: number): SnailInput {
    const s = this.snail, d = this.demoTarget;
    if (d.wait > 0) {
      d.wait -= dt;
      return { dx: 0, dy: 0, hide: false };
    }
    const dx = d.x - s.x, dy = d.y - s.y;
    d.stuck = s.speed < 0.2 ? d.stuck + dt : 0;
    if (Math.hypot(dx, dy) < 0.4 || d.stuck > 1.2 || d.x === 0) {
      const spot = this.randomSpot([2, 2, 14, 14]) ?? { x: s.x, y: s.y };
      d.x = spot.x;
      d.y = spot.y;
      d.wait = Math.random() < 0.5 ? 1 + Math.random() * 2 : 0;
      d.stuck = 0;
      return { dx: 0, dy: 0, hide: false };
    }
    const sx = dx - dy, sy = (dx + dy) / 2;
    const l = Math.hypot(sx, sy) || 1;
    return { dx: sx / l, dy: sy / l, hide: false };
  }

  private environment(dt: number): void {
    const s = this.snail, m = this.map;
    if (s.fainted) return;
    let drain = SNAIL.moistureDrain * Save.moistureMul();
    const inSun = m.flag(m.sun, s.x, s.y);
    if (inSun) {
      drain *= SNAIL.sunDrainMul;
      this.hint('sun', 'Slunce tě vysušuje! Hlídej si vlhkost.');
    } else if (m.flag(m.shade, s.x, s.y) || this.def.night) drain *= SNAIL.shadeDrainMul;
    if (s.hidden) drain *= 0.5;
    const g = m.groundAt(s.x, s.y);
    if (g === 'puddle') {
      s.moisture = Math.min(SNAIL.maxMoisture, s.moisture + 40 * dt);
      s.wetTime += dt;
      if (s.wetTime > 3) {
        this.hint('wet', 'Moc mokro! Šneci mají rádi vlhko, ale v louži se jen brouzdá, nemáčí.');
        this.damage(5 * dt, 'wet');
      }
      if (Math.random() < dt * 3 && s.speed > 0.2) this.fx.ring(s.x, s.y, 0xffffff, 0.35);
    } else {
      s.wetTime = Math.max(0, s.wetTime - dt * 2);
      s.moisture -= drain * dt;
    }
    if (this.snailSafe()) {
      s.health = Math.min(SNAIL.maxHealth, s.health + 7 * dt);
      s.moisture = Math.min(SNAIL.maxMoisture, s.moisture + 18 * dt);
    }
    if (s.moisture <= 0) {
      s.moisture = 0;
      this.hint('dry', 'Vysycháš! Rychle najdi stín, kapku rosy nebo louži.');
      this.damage(SNAIL.dryDamage * dt, 'dry');
    } else if (s.moisture < 25) {
      this.hint('lowdry', 'Začínáš vysychat… Rosa, bobule a louže doplní vlhkost.');
    }
  }

  private hint(key: string, text: string): void {
    if (this.hints.has(key) || this.demo) return;
    this.hints.add(key);
    bus.emit('toast', { text, kind: 'hint' });
  }

  // ---------------------------------------------------------------- interaction
  private nearestItem(): Collectible | null {
    const s = this.snail;
    const r = Save.reach();
    let best: Collectible | null = null, bd = r;
    for (const it of this.items) {
      const d = dist(it.x, it.y, s.x, s.y);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  private context(): { action: string; label: string; item?: Collectible } {
    const s = this.snail;
    if (s.fainted || s.hidden) return { action: '', label: '' };
    const nearNest = dist(s.x, s.y, this.map.nest.x, this.map.nest.y) < 1.9;
    const nearRecycle = dist(s.x, s.y, this.map.recycle.x, this.map.recycle.y) < 1.7;
    const trash = s.carried.filter((d) => d.category === 'trash').length;
    const goods = s.carried.length - trash;
    if (nearRecycle && trash) return { action: 'recycle', label: `Recyklovat odpad (${trash})` };
    if (nearNest && goods) return { action: 'deposit', label: `Uložit do hnízda: ${goods} ${plural(goods, 'věc', 'věci', 'věcí')}` };
    const it = this.nearestItem();
    if (it) {
      if (it.def.category === 'food') return { action: 'eat', label: `Sníst: ${it.def.name}`, item: it };
      if (!s.canCarry(it.def)) return { action: 'full', label: 'Ulita je plná! Zamiř domů', item: it };
      return { action: 'pick', label: `Sebrat: ${it.def.name}`, item: it };
    }
    if (nearNest) return { action: 'nest', label: 'Otevřít hnízdo' };
    return { action: '', label: '' };
  }

  private updateHighlight(time: number): void {
    if (this.demo) return;
    const c = this.context();
    const label = c.label;
    if (label !== this.prompt) {
      this.prompt = label;
      bus.emit('prompt', label);
    }
    if (c.item) {
      const p = toScreen(c.item.x, c.item.y);
      this.highlight.setPosition(p.x, p.y).setAlpha(0.7 + Math.sin(time / 150) * 0.2).setScale(0.3 + Math.sin(time / 200) * 0.02);
      this.highlight.setTint(c.action === 'full' ? 0xff9080 : 0xfff3a0);
    } else this.highlight.setAlpha(0);
  }

  private interact(): void {
    const c = this.context();
    const s = this.snail;
    switch (c.action) {
      case 'recycle':
        return this.recycle();
      case 'deposit':
        return this.deposit();
      case 'eat':
        return this.eat(c.item!);
      case 'pick':
        return this.pickUp(c.item!);
      case 'full':
        Audio.play('full');
        this.fx.floatText(s.x, s.y, 'Ulita je plná!', '#ffd0b0');
        this.hint('full', 'Ulita je plná. Zamiř domů věci uložit, nebo vyhoď odpad do recyklační plechovky.');
        return;
      case 'nest':
        if (s.carried.some((d) => d.category === 'trash')) bus.emit('toast', { text: 'Odpad patří do recyklační plechovky, ne do hnízda!', kind: 'hint' });
        Audio.play('ui');
        bus.emit('openNest');
        return;
    }
  }

  private removeItem(it: Collectible): void {
    this.items.splice(this.items.indexOf(it), 1);
    it.destroy();
  }

  private eat(it: Collectible): void {
    const s = this.snail;
    const f = it.def.food ?? {};
    s.setAnim('eat');
    s.vx = s.vy = 0;
    Audio.play('eat');
    this.fx.crumbs(it.x, it.y, FOOD_TINT[it.def.id] ?? 0xffffff, 10);
    if (f.health) s.health = Math.min(SNAIL.maxHealth, s.health + f.health);
    if (f.moisture) s.moisture = Math.min(SNAIL.maxMoisture, s.moisture + f.moisture);
    if (f.speedBoost) {
      s.boost = f.speedBoost;
      this.fx.floatText(s.x, s.y - 0.4, 'Zrychlení!', '#a0d0ff');
    }
    const parts = [f.health ? `+${f.health}♥` : '', f.moisture ? `+${f.moisture}💧` : ''].filter(Boolean).join(' ');
    if (parts) this.fx.floatText(s.x, s.y, parts, '#d8ffb0');
    this.fx.heart(s.x, s.y, 2);
    this.addXp(it.def.xp + (f.growth ?? 0));
    this.objectives.ate(it.def);
    this.removeItem(it);
  }

  private pickUp(it: Collectible): void {
    const s = this.snail;
    s.carried.push(it.def);
    s.setAnim('collect');
    Audio.play('pickup');
    this.fx.sparkles(it.x, it.y, it.def.category === 'treasure' ? 0xffe070 : 0xffffff, 8);
    // fly the item onto the shell
    const from = toScreen(it.x, it.y);
    const fly = this.add.image(from.x, from.y - 6, it.def.tex).setDepth(900000).setScale(0.85);
    const to = this.view.shellAnchor();
    this.tweens.add({
      targets: fly, x: to.x, duration: 260, ease: 'Sine.easeIn',
    });
    this.tweens.add({
      targets: fly, y: { from: from.y - 6, to: to.y }, scale: 0.4, duration: 260, ease: 'Back.easeIn',
      onComplete: () => {
        fly.destroy();
        this.view.bumpShell();
      },
    });
    this.addXp(1);
    this.objectives.found(it.def);
    if (it.def.id === 'golden_acorn') {
      Audio.play('levelup');
      this.fx.sparkles(s.x, s.y, 0xffd84a, 30, 30);
      bus.emit('toast', { text: '✨ Zlatý žalud nalezen! Odnes ho domů, ať se máš čím chlubit.', kind: 'good' });
      if (!Save.data.foundSecrets.includes(`golden_${this.levelIndex}`)) Save.data.foundSecrets.push(`golden_${this.levelIndex}`);
    } else if (it.def.large) this.hint('large', 'Velké věci táhneš za sebou. Zaberou 2 místa a trochu tě zpomalí.');
    else if (it.def.category === 'trash') this.hint('trash', 'Odpad! Odnes ho do recyklační plechovky u hnízda.');
    this.removeItem(it);
  }

  private flyToward(defs: ItemDef[], tx: number, ty: number, done: () => void): void {
    const target = toScreen(tx, ty);
    const from = this.view.shellAnchor();
    defs.forEach((d, i) => {
      const img = this.add.image(from.x, from.y, d.tex).setDepth(900000).setScale(0.55);
      this.tweens.add({
        targets: img, x: target.x, y: target.y - 30, scale: 0.8, delay: i * 90, duration: 380, ease: 'Cubic.easeInOut',
        onComplete: () => {
          img.destroy();
          this.fx.sparkles(tx, ty, 0xfff0a0, 4, 30);
          if (i === defs.length - 1) done();
        },
      });
    });
  }

  private deposit(): void {
    const s = this.snail;
    const goods = s.carried.filter((d) => d.category !== 'trash');
    s.carried = s.carried.filter((d) => d.category === 'trash');
    let xp = 0;
    for (const d of goods) {
      Save.data.storage[d.id] = (Save.data.storage[d.id] ?? 0) + 1;
      xp += d.xp;
    }
    Audio.play('deposit');
    const summary = summarize(goods);
    this.flyToward(goods, this.map.nest.x, this.map.nest.y, () => {
      this.fx.floatText(this.map.nest.x, this.map.nest.y, `Uloženo ${goods.length}!`, '#fff4c0', true);
      this.tweens.add({ targets: this.world.nest, scaleX: 1.06, scaleY: 0.95, duration: 120, yoyo: true });
    });
    bus.emit('toast', { text: `Uloženo v hnízdě: ${summary}`, kind: 'good' });
    goods.forEach((d) => this.objectives.deposited(d));
    this.addXp(xp);
    Save.save();
    if (Save.data.points > 0 || this.canAffordSomething()) this.hint('spend', 'Postav se k hnízdu a stiskni E (s prázdnou ulitou) – můžeš stavět, vylepšovat a zdobit!');
  }

  private canAffordSomething(): boolean {
    return Save.canAfford({ leaf: 4, moss: 4 }) && Save.data.nestStage === 0;
  }

  private recycle(): void {
    const s = this.snail;
    const trash = s.carried.filter((d) => d.category === 'trash');
    s.carried = s.carried.filter((d) => d.category !== 'trash');
    Audio.play('recycle');
    this.flyToward(trash, this.map.recycle.x, this.map.recycle.y, () => {
      this.fx.floatText(this.map.recycle.x, this.map.recycle.y, 'Recyklováno!', '#c0ffc0', true);
    });
    let xp = 0;
    trash.forEach((d) => {
      xp += d.xp;
      this.objectives.recycled();
    });
    bus.emit('toast', { text: `Recykloval jsi ${trash.length} ${plural(trash.length, 'kus', 'kusy', 'kusů')} odpadu. Zahrada ti děkuje!`, kind: 'good' });
    this.addXp(xp);
    Save.save();
  }

  private addXp(n: number): void {
    const gained = Save.addXp(n);
    if (gained > 0) {
      Audio.play('levelup');
      this.fx.sparkles(this.snail.x, this.snail.y, 0xa0ffb0, 24, 30);
      this.fx.floatText(this.snail.x, this.snail.y - 0.5, 'Vyrostl jsi!', '#b0ffb0', true);
      bus.emit('toast', { text: `🐌 Vyrostl jsi! +${gained} ${plural(gained, 'bod', 'body', 'bodů')} vylepšení. Utratíš je v hnízdě.`, kind: 'good' });
      this.tweens.add({ targets: this.view.root, scaleY: this.view.root.scaleY * 1.25, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
      Save.save();
    }
  }

  private onObjective(d: ObjectiveDef): void {
    if (this.demo) return;
    Audio.play('upgrade');
    bus.emit('toast', { text: `✔ ${d.label}${d.optional ? ' (bonusová hvězda!)' : ''}`, kind: 'objective' });
    this.time.delayedCall(10, () => this.addXp(d.optional ? 25 : 15));
    if (this.completed) {
      const stars = this.objectives.stars();
      if (stars > (Save.data.stars[this.levelIndex] ?? 0)) {
        Save.data.stars[this.levelIndex] = stars;
        Save.save();
      }
    } else if (this.objectives.requiredDone()) {
      this.completed = true;
      this.time.delayedCall(1400, () => this.completeLevel());
    }
  }

  private completeLevel(): void {
    const i = this.levelIndex;
    const stars = this.objectives.stars();
    Save.data.completed[i] = true;
    Save.data.unlocked = Math.max(Save.data.unlocked, Math.min(i + 1, LEVELS.length - 1));
    Save.data.stars[i] = Math.max(Save.data.stars[i] ?? 0, stars);
    Save.save();
    Audio.play('complete');
    this.fx.sparkles(this.snail.x, this.snail.y, 0xffe680, 40, 30);
    bus.emit('levelComplete', {
      index: i,
      stars,
      maxStars: this.def.objectives.filter((o) => o.optional).length,
      objectives: this.objectives.list(),
      isLast: i === LEVELS.length - 1,
    });
  }

  private onNestChanged(): void {
    if (this.world.nest.texture.key !== `nest_${Save.data.nestStage}`) {
      this.world.setNestStage(Save.data.nestStage);
      this.fx.sparkles(this.map.nest.x, this.map.nest.y, 0xfff0a0, 30, 40);
    }
    this.view.refreshDecorations();
    this.objectives.nestStage(Save.data.nestStage);
    this.emitHud();
  }

  private respawn(dt: number): void {
    this.respawnTimer -= dt;
    if (this.respawnTimer > 0) return;
    this.respawnTimer = RESPAWN_INTERVAL;
    const natural = this.items.filter((i) => i.def.category === 'resource' || i.def.category === 'food').length;
    if (natural >= this.initialNatural * 0.85) return;
    const spot = this.randomSpot(undefined, 5);
    if (!spot) return;
    const id = this.def.respawn[Math.floor(Math.random() * this.def.respawn.length)];
    this.items.push(new Collectible(this, ITEMS[id], spot.x, spot.y, true));
    this.fx.sparkles(spot.x, spot.y, 0xffffff, 6);
  }

  emitHud(): void {
    const s = this.snail;
    const g = Save.growthProgress();
    const state: HudState = {
      level: this.def.name,
      levelIndex: this.levelIndex,
      health: s.health / SNAIL.maxHealth,
      moisture: s.moisture / SNAIL.maxMoisture,
      growth: g.stage,
      growthFrac: g.frac,
      points: Save.data.points,
      carried: s.carried.map((d) => ({ id: d.id, name: d.name, tex: d.tex, category: d.category, large: !!d.large })),
      slots: s.slotsUsed(),
      capacity: Save.capacity(),
      objective: this.objectives.current(),
      objectives: this.objectives.list(),
      hidden: s.hidden,
      boost: s.boost > 0,
      inSun: this.map.flag(this.map.sun, s.x, s.y),
      safe: this.snailSafe(),
    };
    bus.emit('hud', state);
  }
}

function summarize(defs: ItemDef[]): string {
  const counts = new Map<string, number>();
  defs.forEach((d) => counts.set(d.name, (counts.get(d.name) ?? 0) + 1));
  return [...counts].map(([n, c]) => `${c}× ${n}`).join(', ');
}

