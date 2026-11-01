import { SAVE_KEY, SNAIL } from '../config';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import { NEST_STAGES, SHELL_DECOS } from '../data/nest';

export interface SaveState {
  unlocked: number; // highest unlocked level index
  stars: Record<number, number>; // best optional-objective stars per level
  completed: Record<number, boolean>;
  storage: Record<string, number>; // nest storage
  nestStage: number;
  upgrades: Record<UpgradeId, number>;
  xp: number;
  growth: number; // growth stage (size), increases with xp
  points: number; // unspent upgrade points
  decosOwned: string[];
  decosOn: string[];
  foundSecrets: string[];
  settings: { music: boolean; sfx: boolean };
  tutorialSeen: boolean;
}

function fresh(): SaveState {
  return {
    unlocked: 0,
    stars: {},
    completed: {},
    storage: {},
    nestStage: 0,
    upgrades: { capacity: 0, speed: 0, armor: 0, moisture: 0, reach: 0, climb: 0, cart: 0 },
    xp: 0,
    growth: 0,
    points: 0,
    decosOwned: [],
    decosOn: [],
    foundSecrets: [],
    settings: { music: true, sfx: true },
    tutorialSeen: false,
  };
}

/** XP thresholds for each growth stage. */
export const GROWTH_XP = [0, 40, 100, 180, 280, 400, 550, 730, 950, 1200];

class SaveStore {
  data: SaveState = fresh();

  load(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
      this.data.upgrades = { ...fresh().upgrades, ...this.data.upgrades };
    } catch {
      this.data = fresh();
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable: progress lives for this session only */
    }
  }

  reset(): void {
    const settings = this.data.settings;
    this.data = fresh();
    this.data.settings = settings;
    this.save();
  }

  hasAnyProgress(): boolean {
    return this.data.xp > 0 || this.data.unlocked > 0;
  }

  // ---- derived stats -------------------------------------------------------
  capacity(): number {
    const u = this.data.upgrades;
    return SNAIL.baseCapacity + u.capacity + (u.cart ? 3 : 0) + Math.floor(this.data.growth / 3);
  }
  speedMul(): number {
    return 1 + this.data.upgrades.speed * 0.12 + this.data.growth * 0.015;
  }
  armorMul(): number {
    return 1 - this.data.upgrades.armor * 0.2;
  }
  moistureMul(): number {
    return 1 - this.data.upgrades.moisture * 0.2;
  }
  reach(): number {
    return SNAIL.baseReach + this.data.upgrades.reach * 0.45;
  }
  canClimb(): boolean {
    return this.data.upgrades.climb > 0;
  }
  sizeScale(): number {
    return 0.85 + this.data.growth * 0.045;
  }

  /** Adds xp; returns number of growth stages gained. */
  addXp(n: number): number {
    this.data.xp += n;
    let gained = 0;
    while (this.data.growth + 1 < GROWTH_XP.length && this.data.xp >= GROWTH_XP[this.data.growth + 1]) {
      this.data.growth++;
      this.data.points++;
      gained++;
    }
    return gained;
  }

  growthProgress(): { stage: number; frac: number } {
    const g = this.data.growth;
    if (g + 1 >= GROWTH_XP.length) return { stage: g, frac: 1 };
    const a = GROWTH_XP[g];
    const b = GROWTH_XP[g + 1];
    return { stage: g, frac: (this.data.xp - a) / (b - a) };
  }

  // ---- spending ------------------------------------------------------------
  canAfford(res: Record<string, number>): boolean {
    return Object.entries(res).every(([k, v]) => (this.data.storage[k] ?? 0) >= v);
  }
  spend(res: Record<string, number>): void {
    for (const [k, v] of Object.entries(res)) this.data.storage[k] = (this.data.storage[k] ?? 0) - v;
  }

  buyUpgrade(id: UpgradeId): boolean {
    const def = UPGRADES.find((u) => u.id === id)!;
    const lvl = this.data.upgrades[id];
    if (lvl >= def.maxLevel) return false;
    const c = def.cost(lvl);
    if (this.data.points < c.points || !this.canAfford(c.res)) return false;
    this.data.points -= c.points;
    this.spend(c.res);
    this.data.upgrades[id] = lvl + 1;
    this.save();
    return true;
  }

  buyNestStage(): boolean {
    const next = NEST_STAGES[this.data.nestStage + 1];
    if (!next || !this.canAfford(next.cost)) return false;
    this.spend(next.cost);
    this.data.nestStage++;
    this.save();
    return true;
  }

  buyDeco(id: string): boolean {
    const d = SHELL_DECOS.find((x) => x.id === id)!;
    if (this.data.decosOwned.includes(id) || !this.canAfford(d.cost)) return false;
    this.spend(d.cost);
    this.data.decosOwned.push(id);
    this.data.decosOn.push(id);
    this.save();
    return true;
  }

  toggleDeco(id: string): void {
    const on = this.data.decosOn;
    const i = on.indexOf(id);
    if (i >= 0) on.splice(i, 1);
    else if (this.data.decosOwned.includes(id)) on.push(id);
    this.save();
  }
}

export const Save = new SaveStore();
