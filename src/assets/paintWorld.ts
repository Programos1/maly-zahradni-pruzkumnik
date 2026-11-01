import { def } from './registry';
import { blob, diamond, ellipse, highlight, prng, rgba, shade, vgrad, groundShadow, type Ctx } from './paint';
import { paintFlower, paintMushroom, paintAcorn } from './paintItems';

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------
export interface ThemePalette {
  grass: string;
  grass2: string;
  dirt: string;
  path: string;
  blade: string;
  sky: string;
}

export const THEMES: Record<string, ThemePalette> = {
  backyard: { grass: '#82c65c', grass2: '#73b851', dirt: '#b0805a', path: '#d3c3a4', blade: '#a6dd77', sky: '#bfe6f0' },
  veggie: { grass: '#8cc75a', grass2: '#7dbb4e', dirt: '#7a5236', path: '#cdb894', blade: '#b3e07a', sky: '#cdebd8' },
  forest: { grass: '#5aa070', grass2: '#4b9063', dirt: '#6e5a48', path: '#a99c84', blade: '#86c896', sky: '#2c4a48' },
  pond: { grass: '#7fcb70', grass2: '#6dbb60', dirt: '#e0cd98', path: '#d9d0b8', blade: '#aee38f', sky: '#b8e3f2' },
  autumn: { grass: '#c3b45a', grass2: '#b5a24a', dirt: '#9a6a42', path: '#d8c09a', blade: '#e0cf73', sky: '#f2d7b0' },
};

const TW = 64, TH = 32;

function tileBase(ctx: Ctx, color: string, color2: string): void {
  diamond(ctx, TW / 2, TH / 2, TW + 1.5, TH + 1);
  ctx.fillStyle = vgrad(ctx, 0, TH, color, color2);
  ctx.fill();
}

function clipTile(ctx: Ctx): void {
  diamond(ctx, TW / 2, TH / 2, TW + 1.5, TH + 1);
  ctx.clip();
}

function grassTile(ctx: Ctx, p: ThemePalette, seed: number): void {
  const r = prng(seed);
  tileBase(ctx, p.grass, p.grass2);
  ctx.save();
  clipTile(ctx);
  // soft mottling
  for (let i = 0; i < 6; i++) {
    ellipse(ctx, r() * TW, r() * TH, 6 + r() * 10, 3 + r() * 5);
    ctx.fillStyle = r() < 0.5 ? rgba(p.blade, 0.18) : 'rgba(20,60,20,0.08)';
    ctx.fill();
  }
  // blades
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = r() * TW, y = r() * TH;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 3);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = r() < 0.6 ? rgba(p.blade, 0.8) : shade(p.grass2, -0.15);
    ctx.stroke();
  }
  ctx.restore();
}

function dirtTile(ctx: Ctx, p: ThemePalette, seed: number, tilled = false): void {
  const r = prng(seed);
  tileBase(ctx, p.dirt, shade(p.dirt, -0.12));
  ctx.save();
  clipTile(ctx);
  if (tilled) {
    for (let i = -2; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12, 0);
      ctx.lineTo(i * 12 + 32, 32);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(40,24,12,0.25)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * 12 + 3, 0);
      ctx.lineTo(i * 12 + 35, 32);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,220,180,0.12)';
      ctx.stroke();
    }
  }
  for (let i = 0; i < 22; i++) {
    ellipse(ctx, r() * TW, r() * TH, 0.8 + r() * 1.6, 0.6 + r());
    ctx.fillStyle = r() < 0.5 ? 'rgba(50,30,15,0.3)' : 'rgba(255,235,200,0.25)';
    ctx.fill();
  }
  ctx.restore();
}

function pathTile(ctx: Ctx, p: ThemePalette, seed: number): void {
  const r = prng(seed);
  tileBase(ctx, shade(p.dirt, 0.1), shade(p.dirt, -0.05));
  ctx.save();
  clipTile(ctx);
  for (let i = 0; i < 5; i++) {
    const x = 10 + r() * 44, y = 6 + r() * 20;
    ellipse(ctx, x, y, 7 + r() * 4, 4 + r() * 2);
    blob(ctx, p.path, x, y, 8, true, 1);
  }
  ctx.restore();
}

function waterTile(ctx: Ctx, deep: boolean): void {
  diamond(ctx, TW / 2, TH / 2, TW + 1.5, TH + 1);
  ctx.fillStyle = deep ? vgrad(ctx, 0, TH, '#4c9ec9', '#3a82b0') : vgrad(ctx, 0, TH, '#8ec9de', '#76b6cf');
  ctx.fill();
  ctx.save();
  clipTile(ctx);
  const r = prng(deep ? 7 : 9);
  for (let i = 0; i < 4; i++) {
    ellipse(ctx, r() * TW, r() * TH, 8 + r() * 6, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
  }
  ctx.restore();
}

function sandTile(ctx: Ctx, p: ThemePalette, seed: number): void {
  const r = prng(seed);
  tileBase(ctx, '#e6d3a0', '#d8c28a');
  ctx.save();
  clipTile(ctx);
  for (let i = 0; i < 26; i++) {
    ellipse(ctx, r() * TW, r() * TH, 0.7, 0.5);
    ctx.fillStyle = r() < 0.5 ? 'rgba(150,120,70,0.35)' : 'rgba(255,255,255,0.4)';
    ctx.fill();
  }
  void p;
  ctx.restore();
}

for (const [name, p] of Object.entries(THEMES)) {
  for (let v = 0; v < 4; v++) def(`tile_grass_${name}_${v}`, TW, TH, (c) => grassTile(c, p, 100 + v * 31 + name.length));
  for (let v = 0; v < 2; v++) def(`tile_dirt_${name}_${v}`, TW, TH, (c) => dirtTile(c, p, 300 + v * 17));
  def(`tile_soil_${name}`, TW, TH, (c) => dirtTile(c, { ...p, dirt: '#6e4a30' }, 77, true));
  for (let v = 0; v < 2; v++) def(`tile_path_${name}_${v}`, TW, TH, (c) => pathTile(c, p, 500 + v * 13));
  def(`tile_sand_${name}`, TW, TH, (c) => sandTile(c, p, 900));
  def(`tuft_${name}`, 30, 26, (ctx) => {
    ctx.lineCap = 'round';
    const r = prng(name.length * 13);
    for (let i = 0; i < 9; i++) {
      const x = 15 + (r() - 0.5) * 14;
      ctx.beginPath();
      ctx.moveTo(x, 25);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 8, 14, x + (r() - 0.5) * 14, 3 + r() * 8);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = i % 2 ? p.blade : shade(p.grass, -0.15);
      ctx.stroke();
    }
  });
}
def('tile_water', TW, TH, (c) => waterTile(c, true));
def('tile_puddle', TW, TH, (c) => waterTile(c, false));

/** Side faces under the map edge, so the garden reads as a little diorama block. */
def('edge_left', 32, 40, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(32, 16);
  ctx.lineTo(32, 40);
  ctx.lineTo(0, 24);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 0, 40, '#8a5f3e', '#5a3c26');
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,190,0.12)';
  ellipse(ctx, 12, 14, 2, 1.2);
  ctx.fill();
  ellipse(ctx, 22, 26, 1.6, 1);
  ctx.fill();
});
def('edge_right', 32, 40, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(32, 0);
  ctx.lineTo(32, 24);
  ctx.lineTo(0, 40);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 0, 40, '#6e4a30', '#45301e');
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,190,0.1)';
  ellipse(ctx, 14, 18, 2, 1.2);
  ctx.fill();
});

// ---------------------------------------------------------------------------
// Decorations (non-blocking)
// ---------------------------------------------------------------------------
const FLOWER_COLORS: Record<string, string> = {
  pink: '#ff8fb1', yellow: '#ffd84a', white: '#fffaf0', purple: '#b48cf0', blue: '#7fb6ff', orange: '#ff9f4a',
};
for (const [n, col] of Object.entries(FLOWER_COLORS)) {
  def(`deco_flower_${n}`, 22, 36, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(11, 35);
    ctx.quadraticCurveTo(9, 22, 11, 12);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4f9a3a';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10.5, 26);
    ctx.quadraticCurveTo(4, 22, 3, 25);
    ctx.quadraticCurveTo(6, 28, 10.5, 26);
    ctx.fillStyle = '#5fae46';
    ctx.fill();
    paintFlower(ctx, 11, 10, 8.5, col, n === 'yellow' ? '#f08a2a' : '#ffd23f');
  });
}
def('deco_shroom', 22, 24, (c) => paintMushroom(c, 11, 12, 0.8, '#d98a4a'));
def('deco_pebbles', 30, 16, (ctx) => {
  for (const [x, y, r] of [[8, 9, 4], [17, 8, 5], [24, 11, 3]]) {
    ellipse(ctx, x, y, r, r * 0.7);
    blob(ctx, '#b4b0a8', x, y, r, true, 1);
  }
});
def('deco_fallen', 44, 22, (ctx) => {
  const cols = ['#e8862e', '#d65a2a', '#f0b23a', '#b8562a'];
  const r = prng(5);
  for (let i = 0; i < 6; i++) {
    const x = 6 + r() * 32, y = 5 + r() * 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * 6);
    ctx.scale(1, 0.55);
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(0, -6, 7, 0);
    ctx.quadraticCurveTo(0, 6, -7, 0);
    ctx.fillStyle = cols[i % 4];
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,30,10,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
});
def('reeds', 40, 72, (ctx) => {
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * 4;
    ctx.beginPath();
    ctx.moveTo(x, 70);
    ctx.quadraticCurveTo(x + (i - 3) * 2, 40, x + (i - 3) * 4, 10 + (i % 3) * 8);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = i % 2 ? '#5f9a3a' : '#7cb54a';
    ctx.stroke();
  }
  for (const [x, y] of [[14, 22], [26, 16]]) {
    ellipse(ctx, x, y, 3, 8);
    blob(ctx, '#7a4a28', x, y, 4, true, 1);
  }
});
def('lilypad', 64, 32, (ctx) => {
  ctx.beginPath();
  ctx.ellipse(32, 16, 26, 12, 0, 0.35, Math.PI * 2 - 0.05);
  ctx.lineTo(32, 16);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 4, 28, '#7cc85a', '#4f9a3c');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3a7a2c';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,90,30,0.4)';
  ctx.lineWidth = 1;
  for (let a = 0.8; a < 6; a += 0.8) {
    ctx.beginPath();
    ctx.moveTo(32, 16);
    ctx.lineTo(32 + Math.cos(a) * 22, 16 + Math.sin(a) * 10);
    ctx.stroke();
  }
});
def('lily_flower', 28, 22, (ctx) => {
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    ellipse(ctx, 14 + Math.cos(a) * 6, 15 + Math.sin(a) * 6, 4, 7, a + Math.PI / 2);
    blob(ctx, '#ffd0e4', 14 + Math.cos(a) * 6, 15 + Math.sin(a) * 6, 5, true, 1);
  }
  ellipse(ctx, 14, 14, 3, 2.4);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
});
def('water_glint', 22, 8, (ctx) => {
  ellipse(ctx, 11, 4, 10, 1.6);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
});
def('sun_patch', 160, 80, (ctx) => {
  const g = ctx.createRadialGradient(80, 40, 6, 80, 40, 78);
  g.addColorStop(0, 'rgba(255,240,170,0.55)');
  g.addColorStop(0.6, 'rgba(255,230,140,0.25)');
  g.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.save();
  ctx.translate(80, 40);
  ctx.scale(1, 0.5);
  ctx.translate(-80, -40);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(80, 40, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
});
def('shade_patch', 160, 80, (ctx) => {
  ctx.save();
  ctx.translate(80, 40);
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 78);
  g.addColorStop(0, 'rgba(10,40,30,0.3)');
  g.addColorStop(1, 'rgba(10,40,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
});

// ---------------------------------------------------------------------------
// Blocking props (origin: bottom-center-ish, foot at tile center)
// ---------------------------------------------------------------------------
function leafyClump(ctx: Ctx, cx: number, cy: number, w: number, h: number, base: string, seed: number): void {
  const r = prng(seed);
  const bumps: [number, number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    bumps.push([cx + Math.cos(a) * d * w * 0.38, cy + Math.sin(a) * d * h * 0.36, w * (0.16 + r() * 0.1)]);
  }
  bumps.sort((a, b) => a[1] - b[1]);
  for (const [x, y, rr] of bumps) {
    ellipse(ctx, x, y, rr, rr * 0.9);
    const tone = shade(base, (y - cy) / h * -0.5);
    blob(ctx, tone, x, y, rr, true, 1.5);
    // leaf veins
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x - rr * 0.2, y - rr * 0.1, rr * 0.5, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
  }
}

def('bush', 88, 80, (ctx) => {
  groundShadow(ctx, 44, 70, 38, 10, 0.3);
  leafyClump(ctx, 44, 42, 80, 62, '#4f9e48', 3);
  for (const [x, y] of [[30, 34], [56, 30], [46, 50]]) {
    ellipse(ctx, x, y, 3, 3);
    blob(ctx, '#e0386a', x, y, 3, true, 1);
  }
});
def('bush_dark', 88, 80, (ctx) => {
  groundShadow(ctx, 44, 70, 38, 10, 0.3);
  leafyClump(ctx, 44, 42, 80, 62, '#3c7d52', 11);
});
def('bush_autumn', 88, 80, (ctx) => {
  groundShadow(ctx, 44, 70, 38, 10, 0.3);
  leafyClump(ctx, 44, 42, 80, 62, '#ef9a44', 19);
});

function hedgeBlock(ctx: Ctx, top: string, seed: number): void {
  // iso prism: top diamond centered (32,20), height 40
  const h = 38;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(32, 36);
  ctx.lineTo(32, 36 + h);
  ctx.lineTo(0, 20 + h);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 20, 20 + h, shade(top, -0.15), shade(top, -0.45));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(64, 20);
  ctx.lineTo(32, 36);
  ctx.lineTo(32, 36 + h);
  ctx.lineTo(64, 20 + h);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 20, 20 + h, shade(top, -0.3), shade(top, -0.55));
  ctx.fill();
  diamond(ctx, 32, 20, 64, 32);
  ctx.fillStyle = top;
  ctx.fill();
  const r = prng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(64, 20);
  ctx.lineTo(64, 20 + h);
  ctx.lineTo(32, 36 + h);
  ctx.lineTo(0, 20 + h);
  ctx.lineTo(0, 20);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 22; i++) {
    const x = 4 + r() * 56, y = 6 + r() * 66;
    ellipse(ctx, x, y, 4 + r() * 3, 3 + r() * 2);
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,30,0,0.15)';
    ctx.fill();
  }
  ctx.restore();
  // rounded top bumps
  for (let i = 0; i < 6; i++) {
    const x = 14 + r() * 36, y = 12 + r() * 14;
    ellipse(ctx, x, y, 7, 5);
    blob(ctx, shade(top, 0.08), x, y, 7, false);
  }
}
def('hedge', 64, 80, (c) => hedgeBlock(c, '#4c9a46', 1));
def('hedge_forest', 64, 80, (c) => hedgeBlock(c, '#2f6e4c', 2));
def('hedge_autumn', 64, 80, (c) => hedgeBlock(c, '#b8652c', 3));

def('rock', 60, 48, (ctx) => {
  groundShadow(ctx, 30, 40, 28, 7, 0.3);
  ctx.beginPath();
  ctx.moveTo(6, 38);
  ctx.quadraticCurveTo(4, 16, 22, 10);
  ctx.quadraticCurveTo(40, 4, 52, 18);
  ctx.quadraticCurveTo(58, 32, 52, 40);
  ctx.quadraticCurveTo(30, 46, 6, 38);
  const g = ctx.createLinearGradient(10, 8, 50, 44);
  g.addColorStop(0, '#d2d3cf');
  g.addColorStop(1, '#7c807e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#555a58';
  ctx.stroke();
  ctx.fillStyle = 'rgba(100,150,70,0.6)';
  ellipse(ctx, 22, 14, 8, 3, -0.2);
  ctx.fill();
  highlight(ctx, 20, 20, 6, 2.5, 0.35);
});

function bigMushroom(ctx: Ctx, cap: string): void {
  groundShadow(ctx, 48, 108, 40, 9, 0.35);
  ctx.beginPath();
  ctx.moveTo(38, 50);
  ctx.quadraticCurveTo(34, 96, 30, 108);
  ctx.quadraticCurveTo(48, 114, 66, 108);
  ctx.quadraticCurveTo(62, 96, 58, 50);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 50, 110, '#fff4e2', '#d8c4a4');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#8f7a5c';
  ctx.stroke();
  ellipse(ctx, 48, 62, 16, 5);
  ctx.fillStyle = 'rgba(120,90,60,0.2)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, 56);
  ctx.quadraticCurveTo(6, 6, 48, 6);
  ctx.quadraticCurveTo(90, 6, 92, 56);
  ctx.quadraticCurveTo(48, 68, 4, 56);
  ctx.closePath();
  const g = ctx.createRadialGradient(34, 20, 4, 48, 34, 56);
  g.addColorStop(0, shade(cap, 0.35));
  g.addColorStop(1, shade(cap, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = shade(cap, -0.55);
  ctx.stroke();
  ctx.fillStyle = '#fff6e8';
  for (const [x, y, r] of [[28, 26, 6], [52, 18, 5], [70, 32, 6.5], [44, 40, 4.5], [16, 44, 3.5], [82, 48, 3.5]]) {
    ellipse(ctx, x, y, r, r * 0.75);
    ctx.fill();
  }
}
def('big_mushroom', 96, 116, (c) => bigMushroom(c, '#d9433a'));
def('big_mushroom_blue', 96, 116, (c) => bigMushroom(c, '#5a7fd0'));
def('big_mushroom_purple', 96, 116, (c) => bigMushroom(c, '#9a5ac8'));

function fence(ctx: Ctx, dir: 1 | -1): void {
  // posts along an iso axis; dir 1 = going down-right
  const pts = [0, 1, 2].map((i) => ({ x: dir === 1 ? 8 + i * 24 : 56 - i * 24, y: 26 + i * 12 }));
  ctx.lineCap = 'round';
  for (const yOff of [-34, -18]) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y + yOff);
    ctx.lineTo(pts[2].x, pts[2].y + yOff);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#8a5e3a';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c99a68';
    ctx.stroke();
  }
  for (const p of pts) {
    ctx.beginPath();
    ctx.moveTo(p.x - 4, p.y);
    ctx.lineTo(p.x - 4, p.y - 40);
    ctx.lineTo(p.x, p.y - 46);
    ctx.lineTo(p.x + 4, p.y - 40);
    ctx.lineTo(p.x + 4, p.y);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, p.y - 46, p.y, '#e3b884', '#9a6a42');
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#5e3c22';
    ctx.stroke();
  }
}
def('fence_x', 64, 64, (c) => fence(c, 1));
def('fence_y', 64, 64, (c) => fence(c, -1));

def('ridge', 64, 40, (ctx) => {
  groundShadow(ctx, 32, 30, 30, 8, 0.25);
  const r = prng(41);
  for (let i = 0; i < 9; i++) {
    const x = 10 + i * 5 + r() * 4, y = 30 - (i % 3) * 4 - r() * 4;
    const rr = 5 + r() * 3;
    ellipse(ctx, x, y, rr, rr * 0.75);
    blob(ctx, i % 2 ? '#b9b4aa' : '#a39d92', x, y, rr, true, 1.4);
  }
});
def('log', 84, 50, (ctx) => {
  groundShadow(ctx, 42, 40, 38, 8, 0.3);
  ctx.save();
  ctx.translate(42, 28);
  ctx.rotate(0.46);
  ctx.beginPath();
  ctx.rect(-32, -11, 60, 22);
  ctx.fillStyle = vgrad(ctx, -11, 11, '#9c6a42', '#5c3a22');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3e2414';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,20,8,0.5)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-26 + i * 14, -9);
    ctx.lineTo(-22 + i * 14, 9);
    ctx.stroke();
  }
  ellipse(ctx, 28, 0, 6, 11);
  ctx.fillStyle = '#d8b07a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3e2414';
  ctx.stroke();
  ellipse(ctx, 28, 0, 3, 6);
  ctx.strokeStyle = '#a07a4a';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(100,160,70,0.8)';
  ellipse(ctx, -10, -9, 9, 3);
  ctx.fill();
  ctx.restore();
});
def('stump', 76, 70, (ctx) => {
  groundShadow(ctx, 38, 60, 34, 9, 0.3);
  ctx.beginPath();
  ctx.moveTo(10, 22);
  ctx.lineTo(10, 54);
  ctx.quadraticCurveTo(38, 66, 66, 54);
  ctx.lineTo(66, 22);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 20, 64, '#8a5c38', '#4e321e');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#33200f';
  ctx.stroke();
  ellipse(ctx, 38, 22, 28, 13);
  ctx.fillStyle = '#d9b283';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,95,55,0.7)';
  ctx.lineWidth = 1.2;
  for (const s of [0.75, 0.5, 0.25]) {
    ellipse(ctx, 38, 22, 28 * s, 13 * s);
    ctx.stroke();
  }
});
def('pumpkin', 76, 66, (ctx) => {
  groundShadow(ctx, 38, 58, 34, 8, 0.3);
  for (const [x, w] of [[20, 16], [56, 16], [30, 16], [46, 16], [38, 18]]) {
    ellipse(ctx, x, 38, w, 21);
    blob(ctx, '#ef8a2a', x, 38, 20, true, 2);
  }
  ctx.beginPath();
  ctx.moveTo(36, 18);
  ctx.quadraticCurveTo(38, 6, 46, 4);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#5a7a2a';
  ctx.lineCap = 'round';
  ctx.stroke();
  highlight(ctx, 30, 28, 5, 2.4, 0.4);
});
def('cabbage', 70, 60, (ctx) => {
  groundShadow(ctx, 35, 52, 30, 7, 0.3);
  const r = prng(8);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = 35 + Math.cos(a) * 18, y = 36 + Math.sin(a) * 10;
    ellipse(ctx, x, y, 14, 10, a);
    blob(ctx, '#8fcf6a', x, y, 13, true, 1.5);
  }
  ellipse(ctx, 35, 30, 15, 13);
  blob(ctx, '#c6eaa0', 35, 30, 15, true, 1.5);
  ctx.strokeStyle = 'rgba(80,140,60,0.5)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(35 + (r() - 0.5) * 6, 32, 6 + i * 2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
});
def('carrot', 34, 44, (ctx) => {
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(17, 34);
    ctx.quadraticCurveTo(17 + i * 4, 18, 17 + i * 7, 4 + Math.abs(i) * 4);
    ctx.lineWidth = 3;
    ctx.strokeStyle = i % 2 ? '#5aaa3a' : '#78c44e';
    ctx.stroke();
  }
  ellipse(ctx, 17, 37, 7, 4);
  blob(ctx, '#f08a2a', 17, 37, 7, true, 1.5);
});
def('flowerpot', 60, 68, (ctx) => {
  groundShadow(ctx, 30, 60, 26, 7, 0.3);
  leafyClump(ctx, 30, 16, 50, 26, '#5aa848', 4);
  ctx.beginPath();
  ctx.moveTo(10, 24);
  ctx.lineTo(50, 24);
  ctx.lineTo(44, 60);
  ctx.quadraticCurveTo(30, 64, 16, 60);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 24, 62, '#e8875a', '#a8502e');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#6e2e18';
  ctx.stroke();
  ctx.fillStyle = '#d27248';
  ctx.fillRect(8, 22, 44, 7);
  ctx.strokeRect(8, 22, 44, 7);
  paintFlower(ctx, 22, 12, 7, '#ffd84a');
  paintFlower(ctx, 38, 9, 7, '#ff8fb1');
});
def('watering_can', 76, 62, (ctx) => {
  groundShadow(ctx, 36, 54, 32, 7, 0.3);
  ctx.beginPath();
  ctx.moveTo(48, 34);
  ctx.lineTo(72, 14);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#4a8aa8';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, 20);
  ctx.lineTo(14, 52);
  ctx.quadraticCurveTo(32, 58, 50, 52);
  ctx.lineTo(50, 20);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 20, 56, '#7ec4e0', '#3e7a98');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2a5468';
  ctx.stroke();
  ellipse(ctx, 32, 20, 18, 6);
  ctx.fillStyle = '#2a5468';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(32, 14, 12, Math.PI, 0);
  ctx.lineWidth = 4;
  ctx.stroke();
  highlight(ctx, 22, 34, 3, 10, 0.3, 0);
});
def('tree_trunk', 96, 140, (ctx) => {
  groundShadow(ctx, 48, 128, 44, 12, 0.35);
  ctx.beginPath();
  ctx.moveTo(30, 130);
  ctx.quadraticCurveTo(36, 80, 34, 0);
  ctx.lineTo(62, 0);
  ctx.quadraticCurveTo(60, 80, 66, 130);
  ctx.quadraticCurveTo(48, 138, 30, 130);
  ctx.fillStyle = vgrad(ctx, 0, 130, '#7a5a3e', '#4a3220');
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#2e1e10';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,18,8,0.45)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(38 + (i % 3) * 7, i * 16);
    ctx.quadraticCurveTo(40 + (i % 3) * 7, i * 16 + 8, 37 + (i % 3) * 7, i * 16 + 16);
    ctx.stroke();
  }
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(48 + s * 16, 128);
    ctx.quadraticCurveTo(48 + s * 30, 128, 48 + s * 42, 134);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#5a3e28';
    ctx.stroke();
  }
});
def('acorn_pile', 50, 34, (ctx) => {
  ctx.save();
  ctx.scale(0.8, 0.8);
  for (const [dx, dy] of [[0, 8], [18, 10], [9, 2]]) {
    ctx.save();
    ctx.translate(dx, dy);
    paintAcorn(ctx);
    ctx.restore();
  }
  ctx.restore();
});

// ---------------------------------------------------------------------------
// Hazards & stations
// ---------------------------------------------------------------------------
def('web', 80, 44, (ctx) => {
  ctx.save();
  ctx.translate(40, 22);
  ctx.scale(1, 0.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38);
    ctx.stroke();
  }
  ctx.lineWidth = 1.2;
  for (let r = 8; r < 38; r += 7) {
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(Math.cos(a - 0.39) * r * 0.85, Math.sin(a - 0.39) * r * 0.85, x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  for (const [x, y] of [[30, 16], [52, 26], [42, 12]]) {
    ellipse(ctx, x, y, 1.6, 1.6);
    ctx.fillStyle = 'rgba(200,240,255,0.9)';
    ctx.fill();
  }
});

function shears(ctx: Ctx, open: boolean): void {
  groundShadow(ctx, 40, 34, 34, 6, 0.3);
  const ang = open ? 0.38 : 0.06;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(38, 26);
    ctx.rotate(s * ang);
    // blade
    ctx.beginPath();
    ctx.moveTo(0, -2 * s);
    ctx.lineTo(38, -1 * s);
    ctx.lineTo(0, 4 * s);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -4, 4, '#e8eef2', '#9aa4ac');
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#4e5a62';
    ctx.stroke();
    // handle
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-26, 6 * s);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d93a3a';
    ctx.stroke();
    ctx.restore();
  }
  ellipse(ctx, 38, 26, 3, 3);
  ctx.fillStyle = '#333';
  ctx.fill();
}
def('shears_open', 84, 44, (c) => shears(c, true));
def('shears_closed', 84, 44, (c) => shears(c, false));

def('hose', 80, 56, (ctx) => {
  groundShadow(ctx, 40, 44, 36, 9, 0.3);
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, 36, 38 - i * 6, 26 - i * 2, 11 - i);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#2f8a3a';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6fd07a';
    ctx.stroke();
  }
  ctx.fillStyle = '#e2b13a';
  ctx.fillRect(58, 18, 16, 9);
  ctx.strokeStyle = '#8a6a1a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(58, 18, 16, 9);
});

def('recycle', 76, 76, (ctx) => {
  groundShadow(ctx, 38, 66, 34, 9, 0.3);
  // tin can bin
  ctx.beginPath();
  ctx.moveTo(14, 22);
  ctx.lineTo(14, 62);
  ctx.quadraticCurveTo(38, 72, 62, 62);
  ctx.lineTo(62, 22);
  ctx.closePath();
  const g = ctx.createLinearGradient(14, 0, 62, 0);
  g.addColorStop(0, '#9fb3bd');
  g.addColorStop(0.35, '#e9f1f4');
  g.addColorStop(1, '#7f939d');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#4b5d66';
  ctx.stroke();
  for (const y of [32, 48]) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.quadraticCurveTo(38, y + 9, 62, y);
    ctx.strokeStyle = 'rgba(70,90,100,0.45)';
    ctx.stroke();
  }
  ellipse(ctx, 38, 22, 24, 9);
  ctx.fillStyle = '#3c4a52';
  ctx.fill();
  ctx.strokeStyle = '#4b5d66';
  ctx.stroke();
  // green label with leaf arrows
  ellipse(ctx, 38, 45, 12, 10);
  ctx.fillStyle = '#4caf50';
  ctx.fill();
  ctx.strokeStyle = '#2e7d32';
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(38, 45, 6, a, a + 1.5);
    ctx.stroke();
  }
});

// ---------------------------------------------------------------------------
// Nest stages (cumulative)
// ---------------------------------------------------------------------------
function nest(ctx: Ctx, stage: number): void {
  const cx = 64, base = 114;
  groundShadow(ctx, cx, base - 4, 56, 14, 0.35);
  if (stage >= 4) {
    // flower ring behind
    const cols = ['#ff8fb1', '#ffd84a', '#b48cf0', '#fffaf0', '#7fb6ff'];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const x = cx + Math.cos(a) * 54, y = base - 14 + Math.sin(a) * 18;
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#4f9a3a';
      ctx.lineWidth = 2;
      ctx.stroke();
      paintFlower(ctx, x, y - 2, 7, cols[i % cols.length]);
    }
  }
  // leaf dome
  ctx.beginPath();
  ctx.moveTo(cx - 48, base - 8);
  ctx.bezierCurveTo(cx - 52, base - 70, cx - 10, base - 96, cx + 20, base - 88);
  ctx.bezierCurveTo(cx + 50, base - 78, cx + 54, base - 40, cx + 48, base - 8);
  ctx.quadraticCurveTo(cx, base + 4, cx - 48, base - 8);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, base - 96, base, '#8fd05a', '#4a9038');
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#2f6a26';
  ctx.stroke();
  // leaf veins
  ctx.beginPath();
  ctx.moveTo(cx - 30, base - 10);
  ctx.bezierCurveTo(cx - 30, base - 60, cx, base - 84, cx + 22, base - 84);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(220,255,190,0.6)';
  ctx.stroke();
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const x = cx - 30 + t * 40, y = base - 20 - t * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 22, y + 10);
    ctx.moveTo(x, y);
    ctx.lineTo(x - 12, y - 8);
    ctx.stroke();
  }
  if (stage >= 1) {
    for (const [x, y, r] of [[-38, -24, 12], [-26, -52, 10], [30, -30, 12], [16, -70, 9], [38, -56, 8], [-6, -78, 8]]) {
      ellipse(ctx, cx + x, base + y, r, r * 0.7);
      blob(ctx, '#5c9c3a', cx + x, base + y, r, true, 1.2);
    }
  }
  // entrance
  ctx.beginPath();
  ctx.moveTo(cx - 18, base - 4);
  ctx.quadraticCurveTo(cx - 20, base - 44, cx + 2, base - 46);
  ctx.quadraticCurveTo(cx + 22, base - 44, cx + 20, base - 4);
  ctx.closePath();
  ctx.fillStyle = stage >= 5 ? vgrad(ctx, base - 46, base, '#5a3a1e', '#2a1a0e') : '#2a1d14';
  ctx.fill();
  if (stage >= 5) {
    // warm light inside
    ellipse(ctx, cx + 1, base - 14, 12, 8);
    ctx.fillStyle = 'rgba(255,200,90,0.55)';
    ctx.fill();
  }
  if (stage >= 3) {
    // twig door frame + bark awning
    ctx.lineCap = 'round';
    for (const [w, c] of [[6, '#5a3a22'], [3.5, '#a0703f']] as const) {
      ctx.beginPath();
      ctx.moveTo(cx - 20, base - 2);
      ctx.quadraticCurveTo(cx - 23, base - 48, cx + 1, base - 50);
      ctx.quadraticCurveTo(cx + 25, base - 48, cx + 22, base - 2);
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 30, base - 50);
    ctx.lineTo(cx + 32, base - 54);
    ctx.lineTo(cx + 28, base - 44);
    ctx.lineTo(cx - 28, base - 40);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, base - 54, base - 40, '#9b6a44', '#5e3c25');
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#3e2616';
    ctx.stroke();
    // doormat leaf
    ellipse(ctx, cx + 1, base, 16, 4);
    ctx.fillStyle = '#c99a50';
    ctx.fill();
  }
  if (stage >= 2) {
    paintMushroom(ctx, cx - 46, base - 10, 1.1, '#e24b3b');
    paintMushroom(ctx, cx + 46, base - 14, 0.9, '#d98a4a');
    paintMushroom(ctx, cx - 34, base - 4, 0.7, '#e24b3b');
    paintMushroom(ctx, cx + 30, base - 66, 0.8, '#d98a4a');
  }
  if (stage >= 5) {
    // lantern berries on a thread + button windows + bead garland
    ctx.beginPath();
    ctx.moveTo(cx - 44, base - 40);
    ctx.quadraticCurveTo(cx, base - 22, cx + 44, base - 44);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5;
      const x = cx - 44 + t * 88;
      const y = base - 40 + Math.sin(t * Math.PI) * 15 - t * 4;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 9);
      glow.addColorStop(0, 'rgba(255,230,120,0.95)');
      glow.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 9, y - 9, 18, 18);
      ellipse(ctx, x, y, 3, 3);
      ctx.fillStyle = ['#ffd84a', '#7fe0c8', '#ff8fb1'][i % 3];
      ctx.fill();
    }
    for (const [x, y, c] of [[-28, -62, '#7a5cd6'], [26, -70, '#e8546a']] as const) {
      ellipse(ctx, cx + x, base + y, 7, 7);
      blob(ctx, c, cx + x, base + y, 7, true, 1.5);
      ctx.fillStyle = 'rgba(255,240,180,0.9)';
      for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
        ellipse(ctx, cx + x + dx, base + y + dy, 1.1, 1.1);
        ctx.fill();
      }
    }
    // little flag
    ctx.beginPath();
    ctx.moveTo(cx + 20, base - 88);
    ctx.lineTo(cx + 20, base - 108);
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 20, base - 108);
    ctx.lineTo(cx + 36, base - 103);
    ctx.lineTo(cx + 20, base - 98);
    ctx.fillStyle = '#ff6b8a';
    ctx.fill();
  }
}
for (let s = 0; s < 6; s++) def(`nest_${s}`, 128, 122, (c) => nest(c, s));

// ---------------------------------------------------------------------------
// Ambient life
// ---------------------------------------------------------------------------
def('butterfly', 28, 22, (ctx) => {
  for (const s of [-1, 1]) {
    ellipse(ctx, 14 + s * 6, 8, 6.5, 6, s * 0.4);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ellipse(ctx, 14 + s * 5, 15, 4.5, 4, -s * 0.4);
    ctx.fill();
    ellipse(ctx, 14 + s * 7, 7, 2, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
  }
  ellipse(ctx, 14, 11, 1.6, 6);
  ctx.fillStyle = '#3a2a2a';
  ctx.fill();
});
def('leaf_pile', 76, 48, (ctx) => {
  groundShadow(ctx, 38, 40, 34, 8, 0.25);
  const cols = ['#e8862e', '#d65a2a', '#f0b23a', '#b8562a', '#c9702e'];
  const r = prng(77);
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = 38 + Math.cos(a) * d * 30, y = 30 + Math.sin(a) * d * 12 - (1 - d) * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * 6);
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(0, -5, 7, 0);
    ctx.quadraticCurveTo(0, 5, -7, 0);
    ctx.fillStyle = cols[i % cols.length];
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(90,35,10,0.6)';
    ctx.stroke();
    ctx.restore();
  }
});
def('cloud_shadow', 256, 128, (ctx) => {
  ctx.save();
  ctx.translate(128, 64);
  ctx.scale(1, 0.5);
  for (const [x, y, r] of [[-50, 10, 60], [20, -10, 70], [70, 15, 50]]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(20,40,60,0.16)');
    g.addColorStop(1, 'rgba(20,40,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
});

for (const [name, col] of [['green', '#5aa848'], ['autumn', '#ec8a3a'], ['dark', '#3c7d52']] as const) {
  def(`canopy_${name}`, 220, 170, (ctx) => {
    leafyClump(ctx, 110, 86, 210, 150, col, name.length * 31);
    if (name === 'autumn') leafyClump(ctx, 80, 70, 90, 60, '#e2b13a', 7);
  });
}
