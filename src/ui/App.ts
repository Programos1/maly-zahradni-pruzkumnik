import type Phaser from 'phaser';
import { bus } from '../core/EventBus';
import { Audio } from '../audio/AudioEngine';
import { LEVELS, type LevelDef } from '../data/levels';
import { ITEMS } from '../data/items';
import { UPGRADES } from '../data/upgrades';
import { NEST_STAGES, SHELL_DECOS } from '../data/nest';
import { GROWTH_XP, Save } from '../state/SaveData';
import type { GameScene, HudState } from '../scenes/GameScene';
import type { ObjectiveView } from '../systems/Objectives';
import { Hud, objectivesHtml } from './Hud';
import { plural } from '../core/plural';
import { drawMascot, icon, setIconSource } from './icons';

type Mode = 'menu' | 'playing' | 'paused';

const $ = (id: string) => document.getElementById(id)!;
const RES_ORDER = ['leaf', 'twig', 'moss', 'flower', 'acorn', 'seed', 'stone', 'bark', 'button', 'coin', 'bead', 'golden_acorn'];

/** Owns all DOM screens and the high-level flow: menu → level select → play → pause / nest / complete. */
export class App {
  private mode: Mode = 'menu';
  private hud: Hud;
  private screen = $('screen');
  private level = 0;
  private lastHud?: HudState;
  private nestTab: 'home' | 'snail' | 'shell' = 'home';
  private modalOpen = false;
  private toastQueue: HTMLElement[] = [];

  constructor(private game: Phaser.Game) {
    setIconSource(game);
    this.hud = new Hud($('hud'), () => this.pause());
    Audio.setMusic(Save.data.settings.music);
    Audio.setSfx(Save.data.settings.sfx);
  }

  boot(): void {
    bus.on('hud', (s: HudState) => {
      this.lastHud = s;
      this.hud.update(s);
    });
    bus.on('prompt', (text: string) => this.setPrompt(text));
    bus.on('toast', (t: { text: string; kind: string }) => this.toast(t.text, t.kind));
    bus.on('threat', (v: number) => ($('vignette').style.opacity = String(Math.min(0.9, v * 0.8))));
    bus.on('levelStart', (e: { index: number; def: LevelDef }) => this.showIntro(e.index, e.def));
    bus.on('openNest', () => this.openNest(true));
    bus.on('levelComplete', (d: CompleteData) => this.showComplete(d));

    const unlock = () => {
      const first = !(Audio as unknown as { ctx?: unknown }).ctx;
      Audio.unlock();
      if (first) this.gameScene()?.startAudio();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'playing' && !this.modalOpen) this.pause();
    });

    this.startScene(0, true);
    this.showMenu();
  }

  // ---------------------------------------------------------------- scene control
  private gameScene(): GameScene | undefined {
    return this.game.scene.getScene('Game') as GameScene | undefined;
  }

  private startScene(level: number, demo: boolean): void {
    this.level = level;
    const sm = this.game.scene;
    if (sm.isActive('Game') || sm.isPaused('Game')) sm.stop('Game');
    sm.start('Game', { level, demo });
  }

  private freeze(on: boolean): void {
    const sm = this.game.scene;
    if (on && sm.isActive('Game')) sm.pause('Game');
    if (!on && sm.isPaused('Game')) sm.resume('Game');
    if (on) {
      Audio.slime(0);
      $('vignette').style.opacity = '0';
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (this.mode === 'playing' && !this.modalOpen) this.hud.toggleList();
      return;
    }
    if (e.key === 'Escape') {
      if (this.mode === 'playing' && !this.modalOpen) this.pause();
      else if (this.mode === 'paused' || this.modalOpen) this.resume();
    }
    if ((e.key === 'Enter' || e.key === ' ') && this.modalOpen) {
      const primary = this.screen.querySelector<HTMLButtonElement>('[data-primary]');
      if (primary && this.screen.dataset.kind === 'intro') {
        e.preventDefault();
        primary.click();
      }
    }
  }

  // ---------------------------------------------------------------- helpers
  private show(html: string, kind: string, clear = false): void {
    this.screen.innerHTML = html;
    this.screen.dataset.kind = kind;
    this.screen.classList.remove('hidden');
    this.screen.classList.toggle('clear', clear);
    this.screen.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => Audio.play('ui')));
  }

  private hide(): void {
    this.screen.classList.add('hidden');
    this.screen.innerHTML = '';
    this.screen.dataset.kind = '';
  }

  private on(sel: string, fn: (el: HTMLElement) => void): void {
    this.screen.querySelectorAll<HTMLElement>(sel).forEach((el) => el.addEventListener('click', () => fn(el)));
  }

  private setHud(visible: boolean): void {
    $('hud').classList.toggle('hidden', !visible);
    if (!visible) this.setPrompt('');
  }

  private setPrompt(text: string): void {
    const p = $('prompt');
    if (!text || this.mode !== 'playing') {
      p.classList.add('hidden');
      return;
    }
    p.innerHTML = `<kbd>E</kbd>${text}`;
    p.classList.remove('hidden');
    p.classList.add('panel');
    // restart entry animation
    p.style.animation = 'none';
    void p.offsetWidth;
    p.style.animation = '';
  }

  toast(text: string, kind = 'good'): void {
    const box = $('toasts');
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = text;
    box.appendChild(t);
    this.toastQueue.push(t);
    while (this.toastQueue.length > 4) this.toastQueue.shift()!.remove();
    const life = kind === 'hint' ? 5200 : 3200;
    setTimeout(() => t.classList.add('out'), life);
    setTimeout(() => {
      t.remove();
      this.toastQueue = this.toastQueue.filter((x) => x !== t);
    }, life + 450);
  }

  private costHtml(res: Record<string, number>, points = 0): string {
    const parts = Object.entries(res).map(([k, v]) => {
      const have = Save.data.storage[k] ?? 0;
      return `<span class="${have < v ? 'lack' : ''}" title="${ITEMS[k]?.name ?? k}"><img src="${icon(`item_${k}`)}" alt="">${have}/${v}</span>`;
    });
    if (points) parts.unshift(`<span class="${Save.data.points < points ? 'lack' : ''}">⭐ ${points} b.</span>`);
    return `<div class="cost">${parts.join('')}</div>`;
  }

  private settingsHtml(): string {
    const s = Save.data.settings;
    return `<div class="toggles">
      <button class="btn small secondary toggle" data-toggle="music">🎵 Hudba: ${s.music ? 'Zap.' : 'Vyp.'}</button>
      <button class="btn small secondary toggle" data-toggle="sfx">🔊 Zvuky: ${s.sfx ? 'Zap.' : 'Vyp.'}</button>
    </div>`;
  }

  private bindSettings(rerender: () => void): void {
    this.on('[data-toggle]', (el) => {
      const k = el.dataset.toggle as 'music' | 'sfx';
      Save.data.settings[k] = !Save.data.settings[k];
      Save.save();
      Audio.unlock();
      if (k === 'music') Audio.setMusic(Save.data.settings.music);
      else Audio.setSfx(Save.data.settings.sfx);
      rerender();
    });
  }

  // ---------------------------------------------------------------- main menu
  showMenu(): void {
    this.mode = 'menu';
    this.modalOpen = false;
    this.setHud(false);
    const has = Save.hasAnyProgress();
    this.show(
      `<div class="card title-card">
        <canvas class="mascot-canvas" width="220" height="150" style="width:165px;height:112px;animation:mascot 2.4s ease-in-out infinite"></canvas>
        <div class="logo">Malý zahradní<span>průzkumník</span></div>
        <p class="sub">Malý šnek. Velká zahrada. Útulný domov, který si postavíš.</p>
        <div class="btns">
          <button class="btn" data-act="play">${has ? '▶ Pokračovat' : '▶ Hrát'}</button>
          ${has ? '<button class="btn secondary" data-act="new">🌱 Nová hra</button>' : ''}
          <button class="btn secondary" data-act="help">❔ Jak hrát</button>
        </div>
        ${this.settingsHtml()}
        <div class="foot">Postup se automaticky ukládá v prohlížeči.</div>
      </div>`,
      'menu',
    );
    drawMascot(this.screen.querySelector('canvas')!, Save.data.decosOn);
    this.on('[data-act="play"]', () => (has ? this.showLevelSelect() : this.beginLevel(0)));
    this.on('[data-act="new"]', () => {
      if (confirm('Začít znovu? Hnízdo, vylepšení i postup budou smazány.')) {
        Save.reset();
        this.showMenu();
      }
    });
    this.on('[data-act="help"]', () => this.showHelp(() => this.showMenu()));
    this.bindSettings(() => this.showMenu());
  }

  private showHelp(back: () => void): void {
    this.show(
      `<div class="card">
        <h2>Jak hrát</h2>
        <div class="help-grid">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / šipky</span><span>Lezení po zahradě (8 směrů)</span>
          <span><kbd>E</kbd></span><span>Sebrat, sníst, uložit do hnízda, recyklovat u plechovky, otevřít hnízdo</span>
          <span><kbd>Mezerník</kbd> (podržet)</span><span>Schovat se do ulity: predátoři ti neublíží, ale nemůžeš se hýbat</span>
          <span><kbd>Tab</kbd></span><span>Zobrazit všechny úkoly v zahradě</span>
          <span><kbd>Esc</kbd></span><span>Pauza</span>
        </div>
        <ul class="tips">
          <li>🐚 Malé věci se ti přilepí na ulitu, velké táhneš za sebou. Místa na ulitě je málo, tak si cesty domů dobře naplánuj!</li>
          <li>🏡 Suroviny ukládej do <b>hnízda</b>: rozšíříš ho, za body růstu koupíš vylepšení a ozdobíš si ulitu.</li>
          <li>♻️ Odpad patří do <b>recyklační plechovky</b>. Lesklé ztracené poklady (knoflíky, mince, korálky) patří do hnízda.</li>
          <li>💧 Slunce tě vysušuje. Stín, kapky rosy, bobule a louže tě udrží vlhkého. V hnízdě se v bezpečí zotavíš.</li>
          <li>⚠️ Predátoři tě vždycky před útokem varují: bublinou „!“, červeným terčem, nafouknutým hrdlem nebo vyznačenou dráhou výpadu.</li>
        </ul>
        <div class="btns row"><button class="btn" data-act="back">Rozumím!</button></div>
      </div>`,
      'help',
    );
    this.on('[data-act="back"]', back);
  }

  // ---------------------------------------------------------------- level select
  showLevelSelect(): void {
    this.mode = 'menu';
    this.modalOpen = false;
    this.setHud(false);
    if (this.level !== 0 || !this.game.scene.isActive('Game')) this.startScene(0, true);
    const totalStars = Object.values(Save.data.stars).reduce((a, b) => a + b, 0);
    const cards = LEVELS.map((l, i) => {
      const locked = i > Save.data.unlocked;
      const stars = Save.data.stars[i] ?? 0;
      const max = l.objectives.filter((o) => o.optional).length;
      const starHtml = Array.from({ length: max }, (_, k) => `<span class="${k < stars ? '' : 'off'}">★</span>`).join('');
      return `<div class="lvl th-${l.theme} ${locked ? 'locked' : ''}" data-lvl="${i}">
        ${Save.data.completed[i] ? '<span class="check">✅</span>' : ''}
        <div><div class="n">Zahrada ${i + 1}</div><div class="name">${l.name}</div></div>
        <div class="desc">${l.subtitle}</div>
        <div class="stars">${starHtml}</div>
      </div>`;
    }).join('');
    this.show(
      `<div class="card wide">
        <h2>🗺️ Vyber si zahradu</h2>
        <p class="sub">Splň hlavní úkoly zahrady a odemkneš další. ★ Za bonusové úkoly získáš hvězdy.</p>
        <div class="levels">${cards}</div>
        <div class="hub-row">
          <span class="stat-line">🐌 Velikost ${Save.data.growth + 1} · ⭐ ${totalStars} ${plural(totalStars, 'hvězda', 'hvězdy', 'hvězd')} · 🏡 ${NEST_STAGES[Save.data.nestStage].name}</span>
          <span style="display:flex;gap:8px">
            <button class="btn secondary small" data-act="back">← Nabídka</button>
            <button class="btn small" data-act="nest">🏡 Hnízdo a vylepšení${Save.data.points ? ` (+${Save.data.points})` : ''}</button>
          </span>
        </div>
      </div>`,
      'select',
    );
    this.on('[data-lvl]', (el) => {
      const i = Number(el.dataset.lvl);
      if (i <= Save.data.unlocked) this.beginLevel(i);
      else Audio.play('error');
    });
    this.on('[data-act="back"]', () => this.showMenu());
    this.on('[data-act="nest"]', () => this.openNest(false));
  }

  private beginLevel(i: number): void {
    this.hide();
    this.mode = 'playing';
    this.startScene(i, false);
    this.setHud(true);
    this.hud.toggleList(false);
  }

  // ---------------------------------------------------------------- intro
  private showIntro(index: number, def: LevelDef): void {
    this.modalOpen = true;
    // defer so the scene finishes create() before being paused
    requestAnimationFrame(() => this.freeze(true));
    this.show(
      `<div class="card">
        <div class="sub">Zahrada ${index + 1} z ${LEVELS.length}</div>
        <h1>${def.name}</h1>
        <p class="sub">${def.subtitle}</p>
        <ul class="tips">${def.intro.map((t) => `<li>${t}</li>`).join('')}</ul>
        <h4 style="margin:14px 0 4px">Úkoly</h4>
        ${objectivesHtml(def.objectives.map((o) => ({ label: o.label, optional: !!o.optional, done: false, failed: false, progress: 0, target: 1, counter: false })))}
        <div class="btns row"><button class="btn" data-primary data-act="go">Jdeme na to! 🐌</button></div>
      </div>`,
      'intro',
    );
    this.on('[data-act="go"]', () => this.resume());
  }

  // ---------------------------------------------------------------- pause
  private pause(): void {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.freeze(true);
    this.setPrompt('');
    const objectives = this.lastHud?.objectives ?? [];
    this.show(
      `<div class="card">
        <h2>⏸ Pauza</h2>
        <p class="sub">${LEVELS[this.level].name}</p>
        <div style="background:#f6ead2;border-radius:14px;padding:10px 12px;margin-top:8px">${objectivesHtml(objectives)}</div>
        <div class="btns">
          <button class="btn" data-act="resume">▶ Pokračovat</button>
          <button class="btn secondary" data-act="help">❔ Jak hrát</button>
          <button class="btn secondary" data-act="restart">↻ Začít zahradu znovu</button>
          <button class="btn secondary" data-act="map">🗺️ Mapa zahrad</button>
        </div>
        ${this.settingsHtml()}
      </div>`,
      'pause',
    );
    this.on('[data-act="resume"]', () => this.resume());
    this.on('[data-act="help"]', () => {
      this.showHelp(() => {
        this.mode = 'playing';
        this.pause();
      });
    });
    this.on('[data-act="restart"]', () => this.beginLevel(this.level));
    this.on('[data-act="map"]', () => this.showLevelSelect());
    this.bindSettings(() => {
      this.mode = 'playing';
      this.pause();
    });
  }

  private resume(): void {
    if (this.mode === 'menu') {
      // closing the nest from the level-select hub
      this.modalOpen = false;
      this.showLevelSelect();
      return;
    }
    this.hide();
    this.modalOpen = false;
    this.mode = 'playing';
    this.freeze(false);
  }

  // ---------------------------------------------------------------- nest
  private openNest(fromGame: boolean): void {
    if (fromGame) {
      if (this.mode !== 'playing') return;
      this.freeze(true);
      this.setPrompt('');
    }
    this.modalOpen = true;
    this.renderNest(fromGame);
  }

  private renderNest(fromGame: boolean): void {
    const stage = Save.data.nestStage;
    const next = NEST_STAGES[stage + 1];
    const storage = RES_ORDER.map((k) => {
      const n = Save.data.storage[k] ?? 0;
      return `<div class="res ${n ? '' : 'zero'}" title="${ITEMS[k].name}"><img src="${icon(`item_${k}`)}" alt="">${n}</div>`;
    }).join('');
    const g = Save.growthProgress();
    const nextXp = GROWTH_XP[g.stage + 1];
    let body = '';
    if (this.nestTab === 'home') {
      body = `
        <div class="nest-preview">
          <img src="${icon(`nest_${stage}`)}" alt="nest">
          <div style="flex:1">
            <div style="font-weight:700;font-size:19px">${NEST_STAGES[stage].name}</div>
            <div style="font-size:14px;opacity:.8">${NEST_STAGES[stage].desc}</div>
            <div class="stages">${NEST_STAGES.map((_, i) => `<i class="${i <= stage ? 'on' : ''}"></i>`).join('')}</div>
          </div>
        </div>
        ${next ? `
          <div style="margin-top:12px;background:#f6ead2;border-radius:14px;padding:12px">
            <div style="font-weight:700">Další: ${next.name}</div>
            <div style="font-size:14px;opacity:.8">${next.desc}</div>
            ${this.costHtml(next.cost)}
            <button class="btn small" data-act="build" ${Save.canAfford(next.cost) ? '' : 'disabled'}>🔨 Postavit!</button>
          </div>` : '<p style="text-align:center;font-weight:600">🏆 Tvůj šnečí domov je hotový. Je to nejútulnější hnízdo v celé zahradě!</p>'}
        <p style="font-size:13px;opacity:.75">Hnízdo je bezpečné místo: predátoři tě sem nesledují a pomalu se ti tu doplňuje zdraví i vlhkost.</p>`;
    } else if (this.nestTab === 'snail') {
      body = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span>🐌 Velikost ${g.stage + 1} ${nextXp ? `· ${Save.data.xp}/${nextXp} zkušeností do dalšího růstu` : '· plně dospělý!'}</span>
          <span class="points-pill">⭐ ${Save.data.points} ${plural(Save.data.points, 'bod', 'body', 'bodů')}</span>
        </div>
        <div class="upg-list">${UPGRADES.map((u) => {
          const lvl = Save.data.upgrades[u.id];
          const maxed = lvl >= u.maxLevel;
          const c = u.cost(lvl);
          const can = !maxed && Save.data.points >= c.points && Save.canAfford(c.res);
          return `<div class="upg">
            <div class="ico">${u.icon}</div>
            <div><div class="name">${u.name}<span class="pips">${Array.from({ length: u.maxLevel }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span></div>
              <div class="desc">${u.desc}</div>${maxed ? '' : this.costHtml(c.res, c.points)}</div>
            <button class="btn small" data-upg="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'Max.' : 'Vylepšit'}</button>
          </div>`;
        }).join('')}</div>
        <p style="font-size:13px;opacity:.75">Rosteš jídlem, sbíráním a plněním úkolů. Každá nová velikost ti dá bod vylepšení.</p>`;
    } else {
      body = `
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:10px">
          <canvas width="220" height="150" style="width:150px;height:102px;background:#eaf5dc;border-radius:14px"></canvas>
          <p style="font-size:14px;margin:0">Ozdob si ulitu věcmi ze zásob. Vyrobené ozdoby můžeš kdykoli nasadit nebo sundat.</p>
        </div>
        <div class="deco-grid">${SHELL_DECOS.map((d) => {
          const owned = Save.data.decosOwned.includes(d.id);
          const on = Save.data.decosOn.includes(d.id);
          return `<div class="deco ${on ? 'on' : ''}">
            <img src="${icon(d.tex)}" alt=""><div class="name">${d.name}</div>
            ${owned ? `<button class="btn small secondary" data-deco-toggle="${d.id}">${on ? 'Sundat' : 'Nasadit'}</button>`
              : `${this.costHtml(d.cost)}<button class="btn small" data-deco-buy="${d.id}" ${Save.canAfford(d.cost) ? '' : 'disabled'}>Vyrobit</button>`}
          </div>`;
        }).join('')}</div>`;
    }
    this.show(
      `<div class="card wide">
        <h2>🏡 Tvoje hnízdo</h2>
        <div class="tabs">
          <button class="tab ${this.nestTab === 'home' ? 'on' : ''}" data-tab="home">🏠 Domov</button>
          <button class="tab ${this.nestTab === 'snail' ? 'on' : ''}" data-tab="snail">🐌 Vylepšení${Save.data.points ? ` (+${Save.data.points})` : ''}</button>
          <button class="tab ${this.nestTab === 'shell' ? 'on' : ''}" data-tab="shell">🎀 Ozdoby ulity</button>
        </div>
        <div class="nest-layout">
          <div>${body}</div>
          <div class="storage"><h4>📦 Zásoby</h4><div class="res-grid">${storage}</div></div>
        </div>
        <div class="btns row"><button class="btn" data-act="close">${fromGame ? '▶ Zpět do zahrady' : '← Zpět na mapu'}</button></div>
      </div>`,
      'nest',
    );
    const canvas = this.screen.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) drawMascot(canvas, Save.data.decosOn);
    const changed = () => {
      bus.emit('ui:nestChanged');
      this.renderNest(fromGame);
    };
    this.on('[data-tab]', (el) => {
      this.nestTab = el.dataset.tab as typeof this.nestTab;
      this.renderNest(fromGame);
    });
    this.on('[data-act="build"]', () => {
      if (Save.buyNestStage()) {
        Audio.play('levelup');
        this.toast(`🏡 Postaveno: ${NEST_STAGES[Save.data.nestStage].name}!`, 'objective');
        changed();
      }
    });
    this.on('[data-upg]', (el) => {
      if (Save.buyUpgrade(el.dataset.upg as never)) {
        Audio.play('upgrade');
        changed();
      }
    });
    this.on('[data-deco-buy]', (el) => {
      if (Save.buyDeco(el.dataset.decoBuy!)) {
        Audio.play('upgrade');
        changed();
      }
    });
    this.on('[data-deco-toggle]', (el) => {
      Save.toggleDeco(el.dataset.decoToggle!);
      changed();
    });
    this.on('[data-act="close"]', () => this.resume());
  }

  // ---------------------------------------------------------------- complete
  private showComplete(d: CompleteData): void {
    if (this.mode !== 'playing') return;
    this.modalOpen = true;
    this.freeze(true);
    this.setPrompt('');
    const stars = Array.from({ length: d.maxStars }, (_, i) => `<span class="${i < d.stars ? '' : 'off'}" style="animation-delay:${0.2 + i * 0.25}s">★</span>`).join('');
    const confetti = Array.from({ length: 40 }, () => {
      const c = ['#ff8fb1', '#ffd84a', '#79c257', '#7fb6ff', '#b48cf0'][Math.floor(Math.random() * 5)];
      return `<i style="left:${Math.random() * 100}%;background:${c};animation-delay:${Math.random() * 0.8}s"></i>`;
    }).join('');
    const nextUnlocked = !d.isLast;
    this.show(
      `<div class="card">
        <div class="confetti">${confetti}</div>
        <h1 style="text-align:center">${d.isLast ? '🏆 Celá zahrada prozkoumána!' : '🌼 Zahrada splněna!'}</h1>
        <p class="sub" style="text-align:center">${LEVELS[d.index].name}</p>
        <div class="big-stars">${stars}</div>
        <div style="background:#f6ead2;border-radius:14px;padding:10px 12px">${objectivesHtml(d.objectives)}</div>
        ${d.isLast ? '<p style="text-align:center">Prozkoumal jsi každý kout. Dál vylepšuj vysněné hnízdo, sbírej chybějící hvězdy a užívej si pomalý život. 🐌💛</p>'
          : `<p style="text-align:center">🔓 <b>${LEVELS[d.index + 1].name}</b> je teď odemčená!</p>`}
        <div class="btns row">
          <button class="btn secondary" data-act="stay">Prozkoumávat dál</button>
          ${nextUnlocked ? '<button class="btn" data-act="next">Další zahrada →</button>' : ''}
          <button class="btn secondary" data-act="map">🗺️ Mapa</button>
        </div>
      </div>`,
      'complete',
    );
    this.on('[data-act="stay"]', () => this.resume());
    this.on('[data-act="next"]', () => this.beginLevel(d.index + 1));
    this.on('[data-act="map"]', () => this.showLevelSelect());
  }
}

interface CompleteData {
  index: number;
  stars: number;
  maxStars: number;
  objectives: ObjectiveView[];
  isLast: boolean;
}
