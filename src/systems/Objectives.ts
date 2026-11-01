import type { ItemDef } from '../data/items';
import type { ObjectiveDef } from '../data/levels';

export interface ObjectiveView {
  label: string;
  optional: boolean;
  done: boolean;
  failed: boolean;
  progress: number;
  target: number;
  /** Show an x/y counter (not for single-step or nest-stage goals). */
  counter: boolean;
}

/** Tracks progress for a level's objectives. Pure logic: callers forward game events. */
export class Objectives {
  private progress: number[];
  private done: boolean[];
  private failed: boolean[];

  constructor(private defs: ObjectiveDef[], private onComplete: (def: ObjectiveDef) => void) {
    this.progress = defs.map(() => 0);
    this.done = defs.map(() => false);
    this.failed = defs.map(() => false);
  }

  private target(d: ObjectiveDef): number {
    if (d.type === 'find' || d.type === 'avoid') return 1;
    if (d.type === 'nest') return d.stage;
    return d.count;
  }

  private bump(i: number, n = 1, absolute = false): void {
    if (this.done[i] || this.failed[i]) return;
    const d = this.defs[i];
    this.progress[i] = absolute ? n : this.progress[i] + n;
    if (this.progress[i] >= this.target(d)) {
      this.progress[i] = this.target(d);
      this.done[i] = true;
      this.onComplete(d);
    }
  }

  deposited(item: ItemDef): void {
    this.defs.forEach((d, i) => {
      if (d.type === 'deposit' && (d.item ? d.item === item.id : d.category ? d.category === item.category : true)) this.bump(i);
    });
  }

  recycled(): void {
    this.defs.forEach((d, i) => d.type === 'recycle' && this.bump(i));
  }

  ate(item: ItemDef): void {
    this.defs.forEach((d, i) => d.type === 'eat' && (!d.item || d.item === item.id) && this.bump(i));
  }

  found(item: ItemDef): void {
    this.defs.forEach((d, i) => d.type === 'find' && d.item === item.id && this.bump(i));
  }

  nestStage(stage: number): void {
    this.defs.forEach((d, i) => d.type === 'nest' && this.bump(i, stage, true));
  }

  hurtBy(source: string): void {
    this.defs.forEach((d, i) => {
      if (d.type === 'avoid' && d.enemy === source && !this.done[i]) this.failed[i] = true;
    });
  }

  requiredDone(): boolean {
    return this.defs.every((d, i) => d.optional || this.done[i]);
  }

  /** Optional stars; "avoid" objectives count if never failed. */
  stars(): number {
    return this.defs.filter((d, i) => d.optional && (this.done[i] || (d.type === 'avoid' && !this.failed[i]))).length;
  }

  current(): string {
    const i = this.defs.findIndex((d, k) => !d.optional && !this.done[k]);
    if (i >= 0) return this.describe(i);
    const j = this.defs.findIndex((d, k) => d.optional && !this.done[k] && !this.failed[k] && d.type !== 'avoid');
    return j >= 0 ? `Bonus: ${this.describe(j)}` : 'Hotovo! Prozkoumávej dál, nebo se vydej do další zahrady.';
  }

  private describe(i: number): string {
    const d = this.defs[i];
    const t = this.target(d);
    return t > 1 && d.type !== 'nest' ? `${d.label} (${this.progress[i]}/${t})` : d.label;
  }

  list(): ObjectiveView[] {
    return this.defs.map((d, i) => ({
      label: d.label,
      optional: !!d.optional,
      done: this.done[i],
      failed: this.failed[i],
      progress: this.progress[i],
      target: this.target(d),
      counter: this.target(d) > 1 && d.type !== 'nest',
    }));
  }
}
