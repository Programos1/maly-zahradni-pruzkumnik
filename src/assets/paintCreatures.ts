import { def } from './registry';
import { blob, ellipse, highlight, shade, vgrad, groundShadow, type Ctx } from './paint';

// ---------------------------------------------------------------------------
// Snail
// ---------------------------------------------------------------------------
const BODY = '#f3d09c';

function snailBody(ctx: Ctx, face: boolean): void {
  ctx.beginPath();
  ctx.moveTo(4, 41);
  ctx.bezierCurveTo(14, 47, 50, 48, 66, 45);
  ctx.bezierCurveTo(77, 43, 79, 31, 77, 21);
  ctx.bezierCurveTo(75, 7, 61, 3, 56, 10);
  ctx.bezierCurveTo(52, 16, 52, 27, 46, 31);
  ctx.bezierCurveTo(32, 35, 16, 33, 4, 41);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 4, 48, shade(BODY, 0.25), shade(BODY, -0.12));
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = shade(BODY, -0.48);
  ctx.stroke();
  // foot frill
  ctx.beginPath();
  ctx.moveTo(12, 43);
  ctx.bezierCurveTo(26, 46.5, 50, 46.5, 67, 42.5);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,240,215,0.85)';
  ctx.stroke();
  // speckles
  ctx.fillStyle = shade(BODY, -0.18);
  for (const [x, y, r] of [[20, 37, 1.6], [30, 36, 1.2], [40, 38, 1.5], [48, 35, 1.1], [60, 30, 1.3]]) {
    ellipse(ctx, x, y, r, r * 0.8);
    ctx.fill();
  }
  if (face) {
    ellipse(ctx, 66, 30, 4.5, 2.6);
    ctx.fillStyle = 'rgba(255,120,120,0.45)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(71, 26, 3.6, 0.25, Math.PI * 0.85);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b3d2a';
    ctx.stroke();
  } else {
    ctx.fillStyle = shade(BODY, -0.1);
    ellipse(ctx, 68, 22, 6, 9);
    ctx.fill();
  }
  highlight(ctx, 64, 13, 5, 2.6, 0.55);
  highlight(ctx, 26, 35, 7, 1.6, 0.35, -0.1);
}
def('snail_body', 80, 50, (c) => snailBody(c, true));
def('snail_body_back', 80, 50, (c) => snailBody(c, false));

def('snail_shell', 50, 50, (ctx) => {
  const cx = 25, cy = 25, r = 21.5;
  ellipse(ctx, cx, cy, r, r);
  const g = ctx.createRadialGradient(cx - 7, cy - 8, 2, cx, cy, r * 1.1);
  g.addColorStop(0, '#ffcf8a');
  g.addColorStop(0.5, '#ec9450');
  g.addColorStop(1, '#a8502e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#6e3220';
  ctx.stroke();
  ctx.save();
  ellipse(ctx, cx, cy, r - 1, r - 1);
  ctx.clip();
  const sx = cx + 2.5, sy = cy + 1.5;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 5.2; t += 0.08) {
      const rr = 1.2 + t * 1.22;
      const x = sx + Math.cos(t) * rr;
      const y = sy + Math.sin(t) * rr * 0.96;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = pass === 0 ? 4.5 : 1.6;
    ctx.strokeStyle = pass === 0 ? 'rgba(110,50,32,0.55)' : 'rgba(255,230,180,0.9)';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120,55,30,0.25)';
  ctx.lineWidth = 1;
  for (let a = 0; a < Math.PI * 2; a += 0.45) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
    ctx.lineTo(cx + Math.cos(a) * 21, cy + Math.sin(a) * 21);
    ctx.stroke();
  }
  ctx.restore();
  highlight(ctx, cx - 8, cy - 10, 6, 3.2, 0.55);
  highlight(ctx, cx - 12, cy - 4, 2, 1.2, 0.5);
});

function eye(ctx: Ctx, pupil: boolean): void {
  ellipse(ctx, 8, 8, 6.2, 6.2);
  const g = ctx.createRadialGradient(6, 6, 1, 8, 8, 7);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#dfe4ea');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#5a3a2a';
  ctx.stroke();
  if (pupil) {
    ellipse(ctx, 9, 8.6, 3.6, 3.9);
    ctx.fillStyle = '#2a1d1a';
    ctx.fill();
    ellipse(ctx, 7.6, 7, 1.4, 1.4);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}
def('snail_eye', 16, 16, (c) => eye(c, true));
def('snail_eye_back', 16, 16, (c) => eye(c, false));

def('shadow', 64, 24, (ctx) => groundShadow(ctx, 32, 12, 31, 11, 0.32));
def('slime', 28, 14, (ctx) => {
  ellipse(ctx, 14, 7, 12, 5);
  const g = ctx.createRadialGradient(11, 5, 1, 14, 7, 13);
  g.addColorStop(0, 'rgba(240,250,255,0.85)');
  g.addColorStop(1, 'rgba(170,215,235,0.35)');
  ctx.fillStyle = g;
  ctx.fill();
});

// ---------------------------------------------------------------------------
// Predators
// ---------------------------------------------------------------------------
def('hedgehog', 92, 64, (ctx) => {
  groundShadow(ctx, 46, 58, 38, 7, 0.3);
  ctx.fillStyle = '#7b5640';
  for (const x of [28, 44, 58]) {
    ellipse(ctx, x, 56, 5, 3.5);
    ctx.fill();
  }
  for (let layer = 0; layer < 3; layer++) {
    const col = ['#4d3426', '#6b4a35', '#8a6447'][layer];
    for (let a = Math.PI * 1.02; a < Math.PI * 2.02; a += 0.17) {
      const r0 = 24 - layer * 4;
      const cx = 40, cy = 44;
      const bx = cx + Math.cos(a) * r0 * 1.35;
      const by = cy + Math.sin(a) * r0;
      const tx = cx + Math.cos(a + 0.08) * (r0 + 12) * 1.35;
      const ty = cy + Math.sin(a + 0.08) * (r0 + 12);
      ctx.beginPath();
      ctx.moveTo(bx - Math.sin(a) * 4, by + Math.cos(a) * 4);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx + Math.sin(a) * 4, by - Math.cos(a) * 4);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    }
  }
  ellipse(ctx, 42, 46, 30, 12);
  blob(ctx, '#8a6447', 42, 46, 24, false);
  ctx.beginPath();
  ctx.moveTo(56, 34);
  ctx.bezierCurveTo(70, 34, 84, 42, 86, 46);
  ctx.bezierCurveTo(84, 52, 68, 56, 56, 54);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 34, 56, '#f2dcbc', '#c9a582');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#7b5640';
  ctx.stroke();
  ellipse(ctx, 86, 46, 3.6, 3.2);
  ctx.fillStyle = '#2a1a14';
  ctx.fill();
  ellipse(ctx, 68, 41, 2.6, 3);
  ctx.fill();
  highlight(ctx, 67.5, 40, 1, 1, 0.9);
  ellipse(ctx, 70, 48, 4, 2);
  ctx.fillStyle = 'rgba(255,120,120,0.4)';
  ctx.fill();
  ellipse(ctx, 60, 33, 4, 3.5);
  ctx.fillStyle = '#c9a582';
  ctx.fill();
});

function bird(ctx: Ctx, up: boolean): void {
  const wingY = up ? 10 : 40;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(44, 30);
    ctx.quadraticCurveTo(44 + side * 20, wingY - 4, 44 + side * 38, wingY);
    ctx.quadraticCurveTo(44 + side * 22, wingY + 12, 44 + side * 4, 34);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, wingY - 6, 36, '#7a5a48', '#4e3a30');
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#33241c';
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(30, 36);
  ctx.lineTo(16, 44);
  ctx.lineTo(20, 34);
  ctx.closePath();
  ctx.fillStyle = '#4e3a30';
  ctx.fill();
  ellipse(ctx, 44, 32, 15, 10, -0.15);
  blob(ctx, '#8b6a55', 44, 32, 14);
  ellipse(ctx, 50, 35, 8, 6, -0.2);
  ctx.fillStyle = '#e8743b';
  ctx.fill();
  ellipse(ctx, 58, 25, 8, 7.5);
  blob(ctx, '#8b6a55', 58, 25, 8);
  ctx.beginPath();
  ctx.moveTo(65, 24);
  ctx.lineTo(73, 26);
  ctx.lineTo(65, 28);
  ctx.closePath();
  ctx.fillStyle = '#f0b43c';
  ctx.fill();
  ellipse(ctx, 60, 23, 2, 2.2);
  ctx.fillStyle = '#1a1210';
  ctx.fill();
  highlight(ctx, 59.5, 22.4, 0.8, 0.8, 1);
}
def('bird', 88, 56, (c) => bird(c, true));
def('bird_flap', 88, 56, (c) => bird(c, false));
def('bird_shadow', 80, 32, (ctx) => {
  ctx.save();
  ctx.translate(40, 16);
  ctx.scale(1, 0.5);
  ctx.fillStyle = 'rgba(20,25,15,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-20, -4, 18, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(20, -4, 18, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
});

function frog(ctx: Ctx, puff: boolean): void {
  groundShadow(ctx, 32, 46, 26, 6, 0.3);
  ellipse(ctx, 18, 40, 11, 7);
  blob(ctx, '#5fa344', 18, 40, 10);
  ellipse(ctx, 32, 34, 20, 13);
  blob(ctx, '#77bf55', 32, 34, 19);
  ellipse(ctx, 34, 40, 13, 6);
  ctx.fillStyle = '#e4efb0';
  ctx.fill();
  if (puff) {
    ellipse(ctx, 44, 40, 10, 8);
    blob(ctx, '#f3e48a', 44, 40, 9);
  }
  ctx.fillStyle = '#4f8f3a';
  for (const [x, y] of [[24, 28], [30, 25], [20, 34]]) {
    ellipse(ctx, x, y, 2.4, 1.8);
    ctx.fill();
  }
  for (const x of [32, 44]) {
    ellipse(ctx, x, 20, 6.5, 6.5);
    blob(ctx, '#77bf55', x, 20, 6.5);
    ellipse(ctx, x + 0.5, 19.5, 4, 4);
    ctx.fillStyle = '#fffbe0';
    ctx.fill();
    ellipse(ctx, x + 1.2, 19.8, 2.4, 3);
    ctx.fillStyle = '#1a1a12';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(38, 31);
  ctx.quadraticCurveTo(46, 35, 52, 30);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#2f5a22';
  ctx.stroke();
  ellipse(ctx, 40, 46, 5, 2.5);
  ctx.fillStyle = '#5fa344';
  ctx.fill();
}
def('frog', 64, 52, (c) => frog(c, false));
def('frog_puff', 64, 52, (c) => frog(c, true));

def('ant', 22, 14, (ctx) => {
  ctx.strokeStyle = '#2a120c';
  ctx.lineWidth = 1;
  for (const x of [8, 11, 14]) {
    ctx.beginPath();
    ctx.moveTo(x, 8);
    ctx.lineTo(x - 2, 13);
    ctx.moveTo(x, 8);
    ctx.lineTo(x + 2, 13);
    ctx.stroke();
  }
  for (const [x, r] of [[5, 3.6], [11, 2.4], [17, 2.8]] as const) {
    ellipse(ctx, x, 8, r, r * 0.85);
    blob(ctx, '#8a2d1c', x, 8, r, false);
  }
  ctx.beginPath();
  ctx.moveTo(18, 6);
  ctx.lineTo(21, 2);
  ctx.stroke();
});

def('anthill', 96, 56, (ctx) => {
  groundShadow(ctx, 48, 46, 44, 9, 0.25);
  ctx.beginPath();
  ctx.moveTo(6, 48);
  ctx.quadraticCurveTo(30, 6, 48, 8);
  ctx.quadraticCurveTo(66, 6, 90, 48);
  ctx.quadraticCurveTo(48, 56, 6, 48);
  ctx.fillStyle = vgrad(ctx, 8, 52, '#c8915a', '#8a5a34');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#5e3b22';
  ctx.stroke();
  ctx.fillStyle = 'rgba(90,55,30,0.5)';
  for (let i = 0; i < 40; i++) {
    const x = 18 + ((i * 37) % 60), y = 18 + ((i * 23) % 28);
    ellipse(ctx, x, y, 1.2, 0.9);
    ctx.fill();
  }
  for (const [x, y] of [[48, 14], [34, 34], [62, 38]]) {
    ellipse(ctx, x, y, 4.5, 2.6);
    ctx.fillStyle = '#3a2214';
    ctx.fill();
  }
});

def('beetle', 52, 40, (ctx) => {
  groundShadow(ctx, 26, 34, 22, 5, 0.3);
  ctx.strokeStyle = '#1a1420';
  ctx.lineWidth = 1.6;
  for (const x of [16, 24, 32]) {
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.lineTo(x - 4, 34);
    ctx.moveTo(x, 26);
    ctx.lineTo(x + 4, 34);
    ctx.stroke();
  }
  ellipse(ctx, 22, 22, 17, 11);
  const g = ctx.createLinearGradient(6, 12, 38, 32);
  g.addColorStop(0, '#5b3c8f');
  g.addColorStop(0.5, '#2f6b74');
  g.addColorStop(1, '#2a1f45');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#140f22';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, 11);
  ctx.lineTo(22, 33);
  ctx.stroke();
  ellipse(ctx, 41, 22, 7, 6);
  ctx.fillStyle = '#1e1830';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(46, 19);
  ctx.quadraticCurveTo(52, 14, 50, 10);
  ctx.moveTo(46, 25);
  ctx.quadraticCurveTo(52, 28, 51, 32);
  ctx.stroke();
  ellipse(ctx, 43, 20, 1.6, 1.6);
  ctx.fillStyle = '#ffdd66';
  ctx.fill();
  highlight(ctx, 16, 16, 6, 2.2, 0.45);
});

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
def('fx_sparkle', 18, 18, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.quadraticCurveTo(10, 8, 18, 9);
  ctx.quadraticCurveTo(10, 10, 9, 18);
  ctx.quadraticCurveTo(8, 10, 0, 9);
  ctx.quadraticCurveTo(8, 8, 9, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
});
def('fx_dot', 12, 12, (ctx) => {
  const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 12, 12);
});
def('fx_drop', 10, 14, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.quadraticCurveTo(10, 8, 9, 10);
  ctx.arc(5, 9.5, 4, 0.1, Math.PI - 0.1);
  ctx.quadraticCurveTo(0, 8, 5, 0);
  ctx.fillStyle = 'rgba(140,200,255,0.9)';
  ctx.fill();
  highlight(ctx, 3.8, 8, 1.2, 1.8, 0.8, 0);
});
def('fx_leafbit', 12, 8, (ctx) => {
  ellipse(ctx, 6, 4, 5, 2.5, 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
});
def('fx_heart', 16, 14, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(8, 13);
  ctx.bezierCurveTo(-2, 6, 2, -2, 8, 3.5);
  ctx.bezierCurveTo(14, -2, 18, 6, 8, 13);
  ctx.fillStyle = '#ff6b8a';
  ctx.fill();
  highlight(ctx, 5, 4.5, 1.6, 1.1, 0.8);
});
function bubble(ctx: Ctx, color: string, glyph: string): void {
  ellipse(ctx, 13, 13, 11, 11);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9, 22);
  ctx.lineTo(13, 30);
  ctx.lineTo(16, 23);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 13, 14);
}
def('fx_alert', 26, 32, (c) => bubble(c, '#e0423a', '!'));
def('fx_question', 26, 32, (c) => bubble(c, '#e8a33a', '?'));
def('fx_reticle', 96, 48, (ctx) => {
  ctx.save();
  ctx.translate(48, 24);
  ctx.scale(1, 0.5);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(230,60,50,0.9)';
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(230,60,50,0.18)';
  ctx.fill();
  ctx.restore();
});
def('fx_ring', 96, 48, (ctx) => {
  ctx.save();
  ctx.translate(48, 24);
  ctx.scale(1, 0.5);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
});
def('fx_zone', 128, 64, (ctx) => {
  ctx.save();
  ctx.translate(64, 32);
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 30, 0, 0, 62);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
});
