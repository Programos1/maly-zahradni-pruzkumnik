import type { HudState } from '../scenes/GameScene';
import { icon } from './icons';

/** In-game heads-up display (DOM). Built once, then patched on each `hud` event. */
export class Hud {
  private el: HTMLElement;
  private carriedKey = '';
  private objKey = '';
  showList = false;

  constructor(root: HTMLElement, private onPause: () => void) {
    this.el = root;
    root.innerHTML = `
      <div class="panel hud-vitals">
        <div class="hud-level"><span data-k="level"></span><small data-k="growthLabel"></small></div>
        <div class="bar-row" title="Zdraví"><span class="ico">❤️</span><div class="bar health"><i data-k="health"></i></div></div>
        <div class="bar-row" title="Vlhkost"><span class="ico">💧</span><div class="bar moist" data-k="moistBar"><i data-k="moist"></i></div></div>
        <div class="bar-row" title="Růst"><span class="ico">🐌</span><div class="bar grow"><i data-k="grow"></i></div></div>
        <div class="status-chips" data-k="chips"></div>
      </div>
      <div class="panel hud-objective"><span class="scroll">📜</span><span data-k="objective"></span></div>
      <div class="hud-buttons">
        <button class="icon-btn" data-k="listBtn" title="Úkoly (Tab)">📋</button>
        <button class="icon-btn" data-k="pauseBtn" title="Pauza (Esc)">⏸</button>
      </div>
      <div class="panel hud-objlist hidden" data-k="objlist"></div>
      <div class="panel hud-carry">
        <div class="title"><span>Neseš</span><span data-k="cap"></span></div>
        <div class="slots" data-k="slots"></div>
      </div>
      <div class="panel hud-help"><kbd>WASD</kbd> pohyb · <kbd>E</kbd> akce · <kbd>Mezerník</kbd> schovat · <kbd>Tab</kbd> úkoly · <kbd>Esc</kbd> pauza</div>
    `;
    this.q('pauseBtn').addEventListener('click', () => this.onPause());
    this.q('listBtn').addEventListener('click', () => this.toggleList());
  }

  private q(k: string): HTMLElement {
    return this.el.querySelector(`[data-k="${k}"]`) as HTMLElement;
  }

  toggleList(force?: boolean): void {
    this.showList = force ?? !this.showList;
    this.q('objlist').classList.toggle('hidden', !this.showList);
  }

  update(s: HudState): void {
    this.q('level').textContent = s.level;
    this.q('growthLabel').innerHTML = `Velikost ${s.growth + 1}${s.points ? `<span class="badge">+${s.points}</span>` : ''}`;
    this.q('health').style.width = `${Math.max(0, s.health) * 100}%`;
    this.q('moist').style.width = `${Math.max(0, s.moisture) * 100}%`;
    this.q('grow').style.width = `${s.growthFrac * 100}%`;
    this.q('moistBar').classList.toggle('low', s.moisture < 0.25);
    const chips: string[] = [];
    if (s.safe) chips.push('<span class="chip safe">🏡 V bezpečí doma</span>');
    if (s.inSun) chips.push('<span class="chip sun">☀️ Pálí slunce</span>');
    if (s.hidden) chips.push('<span class="chip hide">🐚 Schovaný</span>');
    if (s.boost) chips.push('<span class="chip">💨 Zrychlení</span>');
    this.q('chips').innerHTML = chips.join('');
    this.q('objective').textContent = s.objective;
    this.q('cap').textContent = `${s.slots}/${s.capacity}`;

    const ck = s.carried.map((c) => c.id).join(',') + '|' + s.capacity;
    if (ck !== this.carriedKey) {
      const grew = s.carried.length > this.carriedKey.split('|')[0].split(',').filter(Boolean).length;
      this.carriedKey = ck;
      const html: string[] = [];
      let used = 0;
      s.carried.forEach((c, i) => {
        const pop = grew && i === s.carried.length - 1 ? ' pop' : '';
        html.push(`<div class="slot ${c.large ? 'large' : ''} ${c.category}${pop}" title="${c.name}"><img src="${icon(c.tex)}" alt=""></div>`);
        used += c.large ? 2 : 1;
      });
      for (let i = used; i < s.capacity; i++) html.push('<div class="slot"></div>');
      this.q('slots').innerHTML = html.join('');
    }

    const ok = JSON.stringify(s.objectives.map((o) => [o.progress, o.done, o.failed]));
    if (ok !== this.objKey) {
      this.objKey = ok;
      this.q('objlist').innerHTML = `<h4>Úkoly: ${s.level}</h4>` + objectivesHtml(s.objectives);
    }
  }
}

export function objectivesHtml(list: HudState['objectives']): string {
  return list
    .map((o) => {
      const cls = ['obj', o.done ? 'done' : '', o.failed ? 'failed' : '', o.optional ? 'optional' : ''].join(' ');
      const mark = o.done ? '✓' : o.failed ? '✕' : '';
      const prog = o.counter ? ` <small>(${o.progress}/${o.target})</small>` : '';
      return `<div class="${cls}"><span class="box">${mark}</span><span class="label">${o.label}${prog}</span></div>`;
    })
    .join('');
}
