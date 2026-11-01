import { def } from './registry';
import { blob, ellipse, highlight, shade, vgrad, type Ctx } from './paint';

const S = 32; // item canvas size

function leafShape(ctx: Ctx, cx: number, cy: number, len: number, wid: number, rot: number, color: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.quadraticCurveTo(0, -wid, len / 2, 0);
  ctx.quadraticCurveTo(0, wid, -len / 2, 0);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -wid, wid, shade(color, 0.25), shade(color, -0.2));
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = shade(color, -0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-len / 2 - 3, 0);
  ctx.lineTo(len / 2 - 2, 0);
  for (let i = -2; i <= 2; i++) {
    const x = i * len * 0.16;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + len * 0.1, -wid * 0.45);
    ctx.moveTo(x, 0);
    ctx.lineTo(x + len * 0.1, wid * 0.45);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = shade(color, -0.35);
  ctx.stroke();
  ctx.restore();
}

export function paintLeaf(ctx: Ctx, color = '#6fbf4a'): void {
  leafShape(ctx, 16, 17, 24, 10, -0.5, color);
}

def('item_leaf', S, S, (c) => paintLeaf(c));
def('item_twig', 44, S, (ctx) => {
  ctx.lineCap = 'round';
  for (const [w, col] of [[6, '#5a3a22'], [4, '#9a6b42']] as const) {
    ctx.beginPath();
    ctx.moveTo(4, 24);
    ctx.quadraticCurveTo(20, 18, 40, 10);
    ctx.moveTo(22, 18);
    ctx.lineTo(28, 24);
    ctx.moveTo(30, 14);
    ctx.lineTo(33, 6);
    ctx.lineWidth = w;
    ctx.strokeStyle = col;
    ctx.stroke();
  }
  leafShape(ctx, 34, 5, 8, 3.5, -0.8, '#7cc24f');
});
def('item_moss', S, S, (ctx) => {
  const pts = [[10, 20, 7], [18, 17, 8], [24, 21, 6], [15, 23, 6], [21, 24, 5]];
  for (const [x, y, r] of pts) {
    ellipse(ctx, x, y, r, r * 0.8);
    blob(ctx, '#5f9e3a', x, y, r, true, 1.4);
  }
  ctx.fillStyle = '#a6d86a';
  for (let i = 0; i < 14; i++) {
    ellipse(ctx, 7 + ((i * 7) % 20), 14 + ((i * 5) % 12), 1, 1);
    ctx.fill();
  }
});
export function paintFlower(ctx: Ctx, cx: number, cy: number, r: number, petal: string, center = '#ffd23f'): void {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ellipse(ctx, cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.48, r * 0.33, a);
    blob(ctx, petal, cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.48, true, 1.2);
  }
  ellipse(ctx, cx, cy, r * 0.34, r * 0.34);
  blob(ctx, center, cx, cy, r * 0.34, true, 1.2);
}
def('item_flower', S, S, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(16, 18);
  ctx.quadraticCurveTo(14, 26, 18, 31);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#4f9a3a';
  ctx.stroke();
  paintFlower(ctx, 16, 14, 11, '#ff8fb1');
});
export function paintAcorn(ctx: Ctx, gold = false): void {
  const nut = gold ? '#ffd24a' : '#c98a4b';
  const cap = gold ? '#e0a020' : '#7a5232';
  ellipse(ctx, 16, 20, 8.5, 9.5);
  blob(ctx, nut, 16, 20, 9);
  ctx.beginPath();
  ctx.moveTo(6, 14);
  ctx.quadraticCurveTo(16, 4, 26, 14);
  ctx.quadraticCurveTo(16, 18, 6, 14);
  ctx.fillStyle = cap;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = shade(cap, -0.4);
  ctx.stroke();
  ctx.strokeStyle = shade(cap, 0.25);
  ctx.lineWidth = 1;
  for (let x = 9; x < 24; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, 13);
    ctx.lineTo(x + 2, 10);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(16, 8);
  ctx.lineTo(17, 4);
  ctx.lineWidth = 2;
  ctx.strokeStyle = shade(cap, -0.3);
  ctx.stroke();
  highlight(ctx, 12.5, 20, 2, 3.5, 0.5, 0.2);
  if (gold) highlight(ctx, 19, 24, 1.2, 1.2, 0.9);
}
def('item_acorn', S, S, (c) => paintAcorn(c));
def('item_golden_acorn', S, S, (c) => paintAcorn(c, true));
def('item_seed', S, S, (ctx) => {
  for (const [x, y, r] of [[12, 19, -0.4], [20, 17, 0.5], [16, 23, 0.1]]) {
    ellipse(ctx, x, y, 5, 3, r);
    blob(ctx, '#e3c27a', x, y, 5, true, 1.2);
    ctx.beginPath();
    ctx.moveTo(x - 3 * Math.cos(r), y - 3 * Math.sin(r));
    ctx.lineTo(x + 3 * Math.cos(r), y + 3 * Math.sin(r));
    ctx.strokeStyle = 'rgba(120,80,40,0.5)';
    ctx.stroke();
  }
});
def('item_stone', S, S, (ctx) => {
  ellipse(ctx, 16, 20, 10, 7);
  blob(ctx, '#a8adb3', 16, 20, 10);
  ctx.fillStyle = 'rgba(80,85,95,0.35)';
  ellipse(ctx, 19, 22, 2, 1.2);
  ctx.fill();
  ellipse(ctx, 12, 21, 1.2, 0.8);
  ctx.fill();
});
def('item_bark', 40, S, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(4, 18);
  ctx.lineTo(10, 8);
  ctx.lineTo(36, 10);
  ctx.lineTo(34, 22);
  ctx.lineTo(8, 26);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 8, 26, '#9b6a44', '#5e3c25');
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#3e2616';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,24,12,0.6)';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(10 + i * 5, 10 + (i % 2) * 2);
    ctx.lineTo(12 + i * 5, 23 - (i % 2) * 2);
    ctx.stroke();
  }
});
export function paintMushroom(ctx: Ctx, cx: number, cy: number, s: number, cap = '#e24b3b'): void {
  ctx.beginPath();
  ctx.moveTo(cx - 3.5 * s, cy);
  ctx.quadraticCurveTo(cx - 4 * s, cy + 8 * s, cx - 2 * s, cy + 9 * s);
  ctx.lineTo(cx + 2 * s, cy + 9 * s);
  ctx.quadraticCurveTo(cx + 4 * s, cy + 8 * s, cx + 3.5 * s, cy);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, cy, cy + 9 * s, '#fff8ec', '#e2d2b8');
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#9a8468';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 10 * s, cy + 1 * s);
  ctx.quadraticCurveTo(cx - 9 * s, cy - 9 * s, cx, cy - 9 * s);
  ctx.quadraticCurveTo(cx + 9 * s, cy - 9 * s, cx + 10 * s, cy + 1 * s);
  ctx.quadraticCurveTo(cx, cy + 3 * s, cx - 10 * s, cy + 1 * s);
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - 3 * s, cy - 6 * s, 1, cx, cy - 3 * s, 11 * s);
  g.addColorStop(0, shade(cap, 0.3));
  g.addColorStop(1, shade(cap, -0.25));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = shade(cap, -0.5);
  ctx.stroke();
  ctx.fillStyle = '#fff6e6';
  for (const [x, y, r] of [[-4, -4, 1.8], [3, -6, 1.4], [5, -1, 1.6], [-7, -0.5, 1.1], [0, -1.5, 1]]) {
    ellipse(ctx, cx + x * s, cy + y * s, r * s, r * s * 0.8);
    ctx.fill();
  }
}
def('item_mushroom', S, S, (c) => paintMushroom(c, 16, 18, 1.2));
def('item_strawberry', S, S, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(16, 29);
  ctx.bezierCurveTo(4, 22, 5, 9, 16, 10);
  ctx.bezierCurveTo(27, 9, 28, 22, 16, 29);
  ctx.fillStyle = vgrad(ctx, 10, 29, '#ff5b5b', '#c4203a');
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#7e1426';
  ctx.stroke();
  ctx.fillStyle = '#ffe58a';
  for (let i = 0; i < 9; i++) {
    ellipse(ctx, 10 + (i % 3) * 6 + ((i / 3) | 0) % 2, 15 + ((i / 3) | 0) * 4.5, 0.9, 1.3);
    ctx.fill();
  }
  for (let i = -2; i <= 2; i++) leafShape(ctx, 16 + i * 2.5, 9, 7, 2.5, i * 0.6, '#4caf50');
  highlight(ctx, 11.5, 15, 2, 3, 0.45, 0.3);
});
function berryCluster(ctx: Ctx, color: string, bloom = false): void {
  const pts = [[12, 16], [18, 15], [15, 20], [21, 20], [10, 22], [17, 25], [23, 25]];
  for (const [x, y] of pts) {
    ellipse(ctx, x, y, 4, 4);
    blob(ctx, color, x, y, 4, true, 1.1);
    if (bloom) highlight(ctx, x - 1, y - 1.2, 1.1, 0.8, 0.6);
  }
}
def('item_raspberry', S, S, (ctx) => {
  berryCluster(ctx, '#e0386a', true);
  leafShape(ctx, 16, 9, 9, 3, 0.2, '#4caf50');
});
def('item_berry', S, S, (ctx) => {
  for (const [x, y] of [[11, 19], [20, 18], [16, 24]]) {
    ellipse(ctx, x, y, 5.6, 5.6);
    blob(ctx, '#4a63c8', x, y, 5.6, true, 1.3);
    ctx.fillStyle = '#2a3480';
    ellipse(ctx, x + 1, y - 2.5, 1.6, 1);
    ctx.fill();
    highlight(ctx, x - 2, y - 1, 1.6, 1.1, 0.5);
  }
});
def('item_dew', S, S, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(16, 5);
  ctx.bezierCurveTo(19, 12, 25, 16, 25, 21);
  ctx.arc(16, 21, 9, 0, Math.PI);
  ctx.bezierCurveTo(7, 16, 13, 12, 16, 5);
  const g = ctx.createRadialGradient(13, 17, 1, 16, 20, 12);
  g.addColorStop(0, 'rgba(235,250,255,0.95)');
  g.addColorStop(1, 'rgba(110,190,240,0.75)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(60,130,190,0.9)';
  ctx.stroke();
  highlight(ctx, 12.5, 19, 2, 3.5, 0.85, 0.3);
});
def('item_paper', S, S, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(6, 12);
  ctx.lineTo(22, 7);
  ctx.lineTo(27, 20);
  ctx.lineTo(18, 27);
  ctx.lineTo(8, 24);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 7, 27, '#fbfaf3', '#d8d4c4');
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#8e8a7a';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,110,190,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(9 + i, 15 + i * 3.5);
    ctx.lineTo(22 + i, 11 + i * 3.5);
    ctx.stroke();
  }
});
def('item_wrapper', S, S, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(4, 14);
  ctx.lineTo(9, 16);
  ctx.lineTo(23, 12);
  ctx.lineTo(28, 10);
  ctx.lineTo(27, 20);
  ctx.lineTo(23, 19);
  ctx.lineTo(9, 23);
  ctx.lineTo(5, 25);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 10, 25, '#5ed0e8', '#2a86c8');
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1d5a8a';
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ellipse(ctx, 16, 17.5, 4, 2.6, -0.2);
  ctx.fill();
  highlight(ctx, 13, 15, 5, 1, 0.6, -0.25);
});
def('item_cap', S, S, (ctx) => {
  ellipse(ctx, 16, 21, 10, 6);
  ctx.fillStyle = '#9e1f1f';
  ctx.fill();
  ellipse(ctx, 16, 18, 10, 6);
  blob(ctx, '#e04040', 16, 18, 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ellipse(ctx, 16, 18, 6.5, 3.8);
  ctx.stroke();
});
def('item_metal', S, S, (ctx) => {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, 25);
  ctx.lineTo(23, 11);
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = '#6f6a66';
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#b9b2aa';
  ctx.stroke();
  ellipse(ctx, 24, 10, 4.6, 2.6, -0.75);
  blob(ctx, '#9a928a', 24, 10, 4.6, true, 1.2);
  ctx.fillStyle = 'rgba(170,90,40,0.55)';
  ellipse(ctx, 14, 20, 2.2, 1.4, -0.75);
  ctx.fill();
});
def('item_button', S, S, (ctx) => {
  ellipse(ctx, 16, 18, 10, 9);
  blob(ctx, '#7a5cd6', 16, 18, 10);
  ellipse(ctx, 16, 18, 7, 6);
  ctx.strokeStyle = 'rgba(40,20,90,0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#2f2160';
  for (const [x, y] of [[13.5, 16], [18.5, 16], [13.5, 20], [18.5, 20]]) {
    ellipse(ctx, x, y, 1.3, 1.3);
    ctx.fill();
  }
});
def('item_coin', S, S, (ctx) => {
  ellipse(ctx, 16, 20, 10, 6);
  ctx.fillStyle = '#a5761a';
  ctx.fill();
  ellipse(ctx, 16, 18, 10, 6);
  blob(ctx, '#f2c23c', 16, 18, 10);
  ellipse(ctx, 16, 18, 6.5, 3.6);
  ctx.strokeStyle = '#b8861c';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  highlight(ctx, 12, 16, 2.5, 1, 0.8, -0.2);
});
def('item_bead', S, S, (ctx) => {
  ellipse(ctx, 16, 18, 8.5, 8.5);
  const g = ctx.createRadialGradient(13, 15, 1, 16, 18, 10);
  g.addColorStop(0, 'rgba(220,255,240,0.95)');
  g.addColorStop(0.6, 'rgba(60,200,170,0.85)');
  g.addColorStop(1, 'rgba(20,110,110,0.9)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#13605c';
  ctx.stroke();
  ellipse(ctx, 16, 18, 2.4, 2.4);
  ctx.fillStyle = 'rgba(10,60,60,0.6)';
  ctx.fill();
  highlight(ctx, 12.5, 14.5, 2.4, 1.5, 0.9);
});

// ---------------------------------------------------------------------------
// Shell decorations (drawn centered; positioned on the shell by SnailView)
// ---------------------------------------------------------------------------
def('deco_flower', 24, 24, (c) => paintFlower(c, 12, 12, 10, '#fff2f6', '#ffbf2f'));
def('deco_moss', 34, 18, (ctx) => {
  for (const [x, y, r] of [[8, 11, 6], [16, 8, 7], [25, 10, 6], [12, 13, 5], [21, 13, 5]]) {
    ellipse(ctx, x, y, r, r * 0.75);
    blob(ctx, '#5c9c3a', x, y, r, true, 1.2);
  }
});
def('deco_mushroom', 26, 26, (c) => paintMushroom(c, 13, 13, 1, '#d2452f'));
def('deco_stones', 28, 18, (ctx) => {
  for (const [x, y, r, col] of [[8, 11, 5, '#b9bcc2'], [16, 9, 5.5, '#d8c9b0'], [23, 12, 4.4, '#9aa3ad']] as const) {
    ellipse(ctx, x, y, r, r * 0.8);
    blob(ctx, col, x, y, r, true, 1.2);
  }
});
def('deco_leaf', 30, 30, (c) => leafShape(c, 15, 15, 26, 9, -1.1, '#8fd05a'));
def('deco_button', 20, 20, (ctx) => {
  ellipse(ctx, 10, 10, 8, 8);
  blob(ctx, '#e8546a', 10, 10, 8);
  ctx.fillStyle = '#7a1c2c';
  for (const [x, y] of [[8, 8.5], [12, 8.5], [8, 11.5], [12, 11.5]]) {
    ellipse(ctx, x, y, 1.1, 1.1);
    ctx.fill();
  }
});
