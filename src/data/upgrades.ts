export type UpgradeId = 'capacity' | 'speed' | 'armor' | 'moisture' | 'reach' | 'climb' | 'cart';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  icon: string; // emoji, shown in DOM UI
  maxLevel: number;
  /** Cost per level: growth points + stored nest resources. */
  cost: (level: number) => { points: number; res: Record<string, number> };
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'capacity', name: 'Lepkavá ulita', icon: '🐚', maxLevel: 3,
    desc: '+1 místo na nošení za každou úroveň.',
    cost: (l) => ({ points: 1, res: { moss: 2 + l * 2, leaf: 2 + l * 2 } }),
  },
  {
    id: 'speed', name: 'Kluzký sliz', icon: '💨', maxLevel: 3,
    desc: '+12 % rychlosti pohybu za každou úroveň.',
    cost: (l) => ({ points: 1, res: { seed: 2 + l * 2, flower: 1 + l } }),
  },
  {
    id: 'armor', name: 'Silná ulita', icon: '🛡️', maxLevel: 3,
    desc: 'O 20 % menší zranění od predátorů za každou úroveň.',
    cost: (l) => ({ points: 1, res: { stone: 3 + l * 2, bark: 1 + l } }),
  },
  {
    id: 'moisture', name: 'Orosená kůže', icon: '💧', maxLevel: 3,
    desc: 'Vysycháš o 20 % pomaleji za každou úroveň.',
    cost: (l) => ({ points: 1, res: { moss: 2 + l * 2, acorn: 1 + l } }),
  },
  {
    id: 'reach', name: 'Dlouhá tykadla', icon: '👀', maxLevel: 2,
    desc: 'Sbíráš a ovládáš věci z větší dálky.',
    cost: (l) => ({ points: 1, res: { twig: 2 + l * 2, leaf: 3 } }),
  },
  {
    id: 'climb', name: 'Šplhací noha', icon: '🧗', maxLevel: 1,
    desc: 'Přelezeš oblázkové valy a klády a dostaneš se na skrytá místa.',
    cost: () => ({ points: 2, res: { stone: 4, twig: 3, moss: 3 } }),
  },
  {
    id: 'cart', name: 'Listový vozík', icon: '🛷', maxLevel: 1,
    desc: '+3 místa a velké věci tě při tahání nezpomalují.',
    cost: () => ({ points: 2, res: { leaf: 6, twig: 4, bark: 2 } }),
  },
];
