import Phaser from 'phaser';
import { TILE_H, TILE_W } from '../config';
import { depthOf, toScreen } from '../core/iso';
import { Rng } from '../core/rng';
import { THEMES } from '../assets/paintWorld';
import { Save } from '../state/SaveData';
import type { LevelMap } from './LevelMap';

interface PropStyle {
  key: string | ((rng: Rng) => string);
  oy: number; // origin y (0..1)
  scale?: number;
  ground?: boolean; // drawn flat at ground level
}

function propStyle(ch: string, theme: string, map: LevelMap, tx: number, ty: number): PropStyle | null {
  switch (ch) {
    case '#': return { key: theme === 'forest' ? 'hedge_forest' : theme === 'autumn' ? 'hedge_autumn' : 'hedge', oy: 58 / 80 };
    case 'B': return { key: theme === 'forest' ? 'bush_dark' : theme === 'autumn' ? 'bush_autumn' : 'bush', oy: 70 / 80 };
    case 'o': return { key: 'rock', oy: 40 / 48 };
    case 'M': return { key: (r) => r.pick(['big_mushroom', 'big_mushroom_blue', 'big_mushroom_purple', 'big_mushroom']), oy: 108 / 116, scale: 0.85 };
    case 'F': {
      const alongX = map.charAt(tx - 1, ty) === 'F' || map.charAt(tx + 1, ty) === 'F';
      return { key: alongX ? 'fence_x' : 'fence_y', oy: 38 / 64 };
    }
    case 'T': return { key: 'stump', oy: 60 / 70 };
    case 'U': return { key: 'flowerpot', oy: 60 / 68 };
    case 'W': return { key: 'watering_can', oy: 54 / 62 };
    case 'Y': return { key: 'tree_trunk', oy: 128 / 140 };
    case 'P': return { key: 'pumpkin', oy: 58 / 66 };
    case 'V': return { key: 'cabbage', oy: 52 / 60 };
    case 'v': return { key: 'carrot', oy: 37 / 44, scale: 0.8 };
    case 'H': return { key: 'hose', oy: 44 / 56 };
    case 'A': return { key: 'anthill', oy: 46 / 56 };
    case 'R': return { key: 'recycle', oy: 66 / 76, scale: 0.85 };
    case 'c': return { key: 'ridge', oy: 30 / 40 };
    case 'L': return { key: 'log', oy: 40 / 50 };
    case 'l': return { key: 'lilypad', oy: 0.5, ground: true };
    case 'r': return { key: 'reeds', oy: 70 / 72, scale: 0.8 };
    case 'p': return { key: 'leaf_pile', oy: 40 / 48 };
    default: return null;
  }
}

/** Renders a LevelMap: baked ground, props, swaying decorations and ambient life. */
export class WorldView {
  nest!: Phaser.GameObjects.Image;
  private sway: { obj: Phaser.GameObjects.Image; phase: number; amp: number }[] = [];
  private glints: Phaser.GameObjects.Image[] = [];
  private critters: { obj: Phaser.GameObjects.Image; cx: number; cy: number; ph: number; sp: number; r: number; kind: string }[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private suns: Phaser.GameObjects.Image[] = [];
  readonly piles: Map<number, Phaser.GameObjects.Image> = new Map();
  /** Tall props that fade out when the snail is behind them. */
  private occluders: Phaser.GameObjects.Image[] = [];
  readonly bounds: Phaser.Geom.Rectangle;

  constructor(private scene: Phaser.Scene, private map: LevelMap) {
    const theme = map.def.theme;
    const rng = new Rng(map.def.name.length * 7919 + 13);
    const left = -map.h * (TILE_W / 2);
    const width = (map.w + map.h) * (TILE_W / 2);
    const height = (map.w + map.h) * (TILE_H / 2) + 48;
    this.bounds = new Phaser.Geom.Rectangle(left, 0, width, height);
    scene.cameras.main.setBackgroundColor(THEMES[theme].sky);

    // ---- baked ground -------------------------------------------------------
    const rt = scene.add.renderTexture(left, 0, width, height).setOrigin(0, 0).setDepth(-10000);
    const stamp = (key: string, x: number, y: number, ox = 0.5, oy = 0.5) =>
      rt.stamp(key, undefined, x - left, y, { originX: ox, originY: oy });
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const p = toScreen(tx + 0.5, ty + 0.5);
        if (ty === map.h - 1) stamp('edge_left', p.x - TILE_W / 4, p.y + TILE_H / 4, 0.5, 0.4);
        if (tx === map.w - 1) stamp('edge_right', p.x + TILE_W / 4, p.y + TILE_H / 4, 0.5, 0.4);
      }
    }
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const p = toScreen(tx + 0.5, ty + 0.5);
        const g = map.ground[ty * map.w + tx];
        let key = `tile_grass_${theme}_${rng.int(0, 3)}`;
        if (g === 'dirt') key = `tile_dirt_${theme}_${rng.int(0, 1)}`;
        else if (g === 'path') key = `tile_path_${theme}_${rng.int(0, 1)}`;
        else if (g === 'soil') key = `tile_soil_${theme}`;
        else if (g === 'sand') key = `tile_sand_${theme}`;
        else if (g === 'water') key = 'tile_water';
        else if (g === 'puddle') key = 'tile_puddle';
        stamp(key, p.x, p.y);
      }
    }

    // ---- ground overlays: sun, shade, water glints --------------------------
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const i = ty * map.w + tx;
        const p = toScreen(tx + 0.5, ty + 0.5);
        if (map.sun[i]) {
          const s = scene.add.image(p.x, p.y, 'sun_patch').setDepth(-8800).setScale(0.75).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
          this.suns.push(s);
        }
        if (map.def.map[ty][tx] === 'h') scene.add.image(p.x, p.y, 'shade_patch').setDepth(-8800).setScale(0.8).setAlpha(0.8);
        const g = map.ground[i];
        if ((g === 'water' || g === 'puddle') && rng.chance(0.35)) {
          const gl = scene.add.image(p.x + rng.range(-14, 14), p.y + rng.range(-5, 5), 'water_glint').setDepth(-8700).setAlpha(0);
          gl.setData('ph', rng.range(0, 6.28));
          this.glints.push(gl);
        }
      }
    }

    // ---- props ---------------------------------------------------------------
    for (const pr of map.props) {
      const st = propStyle(pr.ch, theme, map, pr.tx, pr.ty);
      if (!st) continue;
      const key = typeof st.key === 'function' ? st.key(rng) : st.key;
      const p = toScreen(pr.tx + 0.5, pr.ty + 0.5);
      const img = scene.add.image(p.x, p.y, key).setOrigin(0.5, st.oy).setScale(st.scale ?? 1);
      img.setDepth(st.ground ? -8600 : depthOf(pr.tx + 0.5, pr.ty + 0.5));
      if (pr.ch === 'l' && rng.chance(0.3)) {
        scene.add.image(p.x + 6, p.y - 4, 'lily_flower').setDepth(-8590).setScale(0.8);
      }
      if (pr.ch === 'r' || pr.ch === 'v') this.sway.push({ obj: img, phase: rng.range(0, 6), amp: 0.06 });
      if (pr.ch === 'p') this.piles.set(pr.ty * map.w + pr.tx, img);
      if (pr.ch === 'Y') {
        scene.add.image(p.x, p.y, 'shade_patch').setDepth(-8800).setScale(1.6).setAlpha(0.9);
        const crown = theme === 'autumn' ? 'canopy_autumn' : theme === 'forest' ? 'canopy_dark' : 'canopy_green';
        const c = scene.add.image(p.x, p.y - 118, crown).setOrigin(0.5, 0.75).setDepth(img.depth + 0.1);
        this.sway.push({ obj: c, phase: rng.range(0, 6), amp: 0.015 });
        this.occluders.push(c);
      }
      if ('M#B'.includes(pr.ch) && rng.chance(0.15)) img.setFlipX(true);
      if ('MBYTU#PVWHRA'.includes(pr.ch)) this.occluders.push(img);
    }

    // ---- nest -------------------------------------------------------------------
    const np = toScreen(map.nest.x, map.nest.y);
    this.nest = scene.add.image(np.x, np.y + 6, `nest_${Save.data.nestStage}`).setOrigin(0.5, 110 / 122).setDepth(depthOf(map.nest.x, map.nest.y));
    this.occluders.push(this.nest);

    // ---- decorations -----------------------------------------------------------
    const flowerCols = theme === 'autumn' ? ['orange', 'yellow', 'white'] : theme === 'forest' ? ['purple', 'blue', 'white'] : ['pink', 'yellow', 'white', 'purple', 'blue'];
    for (let ty = 1; ty < map.h - 1; ty++) {
      for (let tx = 1; tx < map.w - 1; tx++) {
        const ch = map.def.map[ty][tx];
        if (!'.,shz:'.includes(ch)) continue;
        if (Math.abs(tx + 0.5 - map.nest.x) < 1.2 && Math.abs(ty + 0.5 - map.nest.y) < 1.2) continue;
        const n = ch === ',' ? 3 : ch === 'z' || ch === ':' ? (rng.chance(0.2) ? 1 : 0) : rng.chance(0.6) ? 1 : 0;
        for (let k = 0; k < n; k++) {
          const wx = tx + rng.range(0.1, 0.9), wy = ty + rng.range(0.1, 0.9);
          const p = toScreen(wx, wy);
          let key: string;
          if (ch === ',') key = `deco_flower_${rng.pick(flowerCols)}`;
          else if (ch === 'z') key = 'deco_pebbles';
          else if (ch === ':') key = 'deco_pebbles';
          else {
            const roll = rng.next();
            if (theme === 'forest' && roll < 0.2) key = 'deco_shroom';
            else if (theme === 'autumn' && roll < 0.35) key = 'deco_fallen';
            else if (roll < 0.1) key = `deco_flower_${rng.pick(flowerCols)}`;
            else if (roll < 0.14) key = 'deco_pebbles';
            else key = `tuft_${theme}`;
          }
          const flat = key === 'deco_fallen' || key === 'deco_pebbles';
          const img = scene.add.image(p.x, p.y, key).setOrigin(0.5, flat ? 0.5 : 0.95).setScale(rng.range(0.7, 1));
          img.setDepth(flat ? -8500 : depthOf(wx, wy, -0.5));
          if (rng.chance(0.5)) img.setFlipX(true);
          if (!flat) this.sway.push({ obj: img, phase: rng.range(0, 6.28), amp: key.startsWith('deco_flower') ? 0.1 : 0.07 });
        }
      }
    }

    // ---- ambient life -------------------------------------------------------------
    const critterKind = map.def.night ? 'firefly' : theme === 'autumn' ? 'leaf' : 'butterfly';
    const count = critterKind === 'firefly' ? 26 : critterKind === 'leaf' ? 14 : 7;
    const tints = [0xffe680, 0xffb0d0, 0xb0d8ff, 0xffffff, 0xffc080];
    for (let i = 0; i < count; i++) {
      const cx = rng.range(3, map.w - 3), cy = rng.range(3, map.h - 3);
      let obj: Phaser.GameObjects.Image;
      if (critterKind === 'firefly') {
        obj = scene.add.image(0, 0, 'fx_dot').setTint(0xfff080).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9);
      } else if (critterKind === 'leaf') {
        obj = scene.add.image(0, 0, 'fx_leafbit').setTint(rng.pick([0xe8862e, 0xd65a2a, 0xf0b23a])).setScale(1.4);
      } else {
        obj = scene.add.image(0, 0, 'butterfly').setTint(rng.pick(tints)).setScale(0.7);
      }
      obj.setDepth(800000);
      this.critters.push({ obj, cx, cy, ph: rng.range(0, 100), sp: rng.range(0.6, 1.2), r: rng.range(1.5, 4), kind: critterKind });
    }
    if (!map.def.night) {
      for (let i = 0; i < 3; i++) {
        const c = scene.add.image(0, 0, 'cloud_shadow').setDepth(-7900).setScale(rng.range(2, 3));
        c.setData('ox', rng.range(0, width)).setData('oy', rng.range(0, height)).setData('sp', rng.range(8, 16));
        this.clouds.push(c);
      }
    }
  }

  setNestStage(stage: number): void {
    this.nest.setTexture(`nest_${stage}`);
    this.scene.tweens.add({ targets: this.nest, scaleX: 1.1, scaleY: 0.92, duration: 140, yoyo: true, repeat: 1 });
  }

  /** Rustle a leaf pile when the snail moves through it. */
  rustle(tx: number, ty: number): void {
    const img = this.piles.get(ty * this.map.w + tx);
    if (img && !this.scene.tweens.isTweening(img)) {
      this.scene.tweens.add({ targets: img, scaleX: 1.08, scaleY: 0.93, duration: 110, yoyo: true });
    }
  }

  /** Fade props standing in front of the snail so it never disappears behind scenery. */
  updateOcclusion(sx: number, sy: number, depth: number): void {
    for (const o of this.occluders) {
      let target = 1;
      if (o.depth > depth) {
        const b = o.getBounds();
        if (sx > b.left + 6 && sx < b.right - 6 && sy - 18 > b.top && sy - 10 < b.bottom) target = 0.4;
      }
      if (Math.abs(o.alpha - target) > 0.01) o.setAlpha(o.alpha + (target - o.alpha) * 0.2);
    }
  }

  update(time: number): void {
    const t = time / 1000;
    const wind = Math.sin(t * 0.7) * 0.5 + 0.5;
    for (const s of this.sway) s.obj.setRotation(Math.sin(t * 2 + s.phase) * s.amp * (0.6 + wind * 0.6));
    for (const g of this.glints) {
      const a = Math.sin(t * 1.5 + (g.getData('ph') as number));
      g.setAlpha(Math.max(0, a) * 0.7);
    }
    for (const s of this.suns) s.setAlpha(0.42 + Math.sin(t * 0.8 + s.x * 0.01) * 0.08);
    for (const c of this.critters) {
      const k = t * c.sp + c.ph;
      let wx: number, wy: number, lift: number;
      if (c.kind === 'leaf') {
        // drifting falling leaves loop across the map
        const span = 14;
        const prog = (k * 0.4) % span;
        wx = c.cx + prog * 0.6 + Math.sin(k * 2) * 0.6;
        wy = c.cy + prog * 0.2;
        lift = 120 - prog * 8.5;
        c.obj.setRotation(k * 2);
        c.obj.setAlpha(Math.min(1, (span - prog) / 2, prog));
      } else {
        wx = c.cx + Math.sin(k * 0.7) * c.r;
        wy = c.cy + Math.sin(k * 0.53 + 1) * c.r * 0.8;
        lift = 26 + Math.sin(k * 1.7) * 10;
        if (c.kind === 'butterfly') c.obj.setScale(0.7 * Math.abs(Math.sin(k * 12)) + 0.08, 0.7);
        else c.obj.setAlpha(0.4 + Math.max(0, Math.sin(k * 3)) * 0.6);
      }
      const p = toScreen(wx, wy);
      c.obj.setPosition(p.x, p.y - lift);
    }
    for (const c of this.clouds) {
      const ox = c.getData('ox') as number, oy = c.getData('oy') as number, sp = c.getData('sp') as number;
      const w = this.bounds.width + 600;
      c.setPosition(this.bounds.x - 300 + ((ox + t * sp) % w), oy + ((t * sp * 0.3) % this.bounds.height));
    }
  }
}
