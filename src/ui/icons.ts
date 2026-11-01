import type Phaser from 'phaser';

let game: Phaser.Game | null = null;
const cache = new Map<string, string>();

export function setIconSource(g: Phaser.Game): void {
  game = g;
}

/** Data URL for a game texture, so DOM UI can show the same art as the game. */
export function icon(key: string): string {
  const hit = cache.get(key);
  if (hit) return hit;
  if (!game || !game.textures.exists(key)) return '';
  const src = game.textures.get(key).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
  const url = 'toDataURL' in src ? (src as HTMLCanvasElement).toDataURL() : (src as HTMLImageElement).src;
  cache.set(key, url);
  return url;
}

/** Paints the snail mascot (body, shell, stalks, eyes) from game textures into a canvas. */
export function drawMascot(canvas: HTMLCanvasElement, decos: string[] = []): void {
  if (!game) return;
  const ctx = canvas.getContext('2d')!;
  const img = (k: string) => game!.textures.get(k).getSourceImage() as CanvasImageSource;
  const s = canvas.width / 110;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(14, 32);
  ctx.drawImage(img('shadow'), 6, 36, 70, 18);
  ctx.drawImage(img('snail_body'), 0, 0);
  ctx.strokeStyle = '#a87a55';
  ctx.lineCap = 'round';
  for (const [bx, by, tx, ty] of [[59, 9, 62, -12], [66, 10, 75, -8]]) {
    ctx.lineWidth = 4.6;
    ctx.strokeStyle = '#a87a55';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - 2, (by + ty) / 2, tx, ty);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f0cd98';
    ctx.stroke();
  }
  ctx.drawImage(img('snail_shell'), 3, -5);
  const pos: Record<string, [number, number]> = { flower: [22, -12], moss: [26, -10], mushroom: [40, -10], stones: [10, 4], leaf: [10, -12], button: [34, 8] };
  for (const d of decos) {
    const p = pos[d];
    if (!p || !game.textures.exists(`deco_${d}`)) continue;
    const src = img(`deco_${d}`) as HTMLCanvasElement;
    ctx.drawImage(src, p[0] + 3 - src.width / 2 + 12, p[1] - src.height / 2 + 12);
  }
  ctx.drawImage(img('snail_eye'), 54, -20);
  ctx.drawImage(img('snail_eye'), 67, -16);
  ctx.restore();
}
