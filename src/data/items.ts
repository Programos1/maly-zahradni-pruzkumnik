export type ItemCategory = 'resource' | 'food' | 'trash' | 'treasure';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  /** Texture key for the item lying in the world (also used when stuck to the shell). */
  tex: string;
  /** Large items are dragged behind the snail and take 2 slots. */
  large?: boolean;
  xp: number;
  /** Food effects applied when eaten. */
  food?: { health?: number; moisture?: number; growth?: number; speedBoost?: number };
}

const R = (id: string, name: string, xp = 2, large = false): ItemDef => ({
  id, name, category: 'resource', tex: `item_${id}`, xp, large,
});
const T = (id: string, name: string, category: ItemCategory = 'trash', xp = 3, large = false): ItemDef => ({
  id, name, category, tex: `item_${id}`, xp, large,
});
const F = (id: string, name: string, food: ItemDef['food'], xp = 3): ItemDef => ({
  id, name, category: 'food', tex: `item_${id}`, xp, food,
});

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [
    R('leaf', 'List'),
    R('twig', 'Větvička', 2, true),
    R('moss', 'Mech'),
    R('flower', 'Kytička', 3),
    R('acorn', 'Žalud', 3),
    R('seed', 'Semínko'),
    R('stone', 'Oblázek'),
    R('bark', 'Kůra', 3, true),
    F('mushroom', 'Houba', { health: 25, growth: 3 }, 4),
    F('strawberry', 'Jahoda', { health: 15, moisture: 25, growth: 4 }, 4),
    F('raspberry', 'Malina', { health: 12, moisture: 18, growth: 3 }, 3),
    F('berry', 'Borůvka', { health: 8, moisture: 10, speedBoost: 6, growth: 2 }, 3),
    F('dew', 'Kapka rosy', { moisture: 45 }, 2),
    T('paper', 'Útržek papíru'),
    T('wrapper', 'Plastový obal', 'trash', 4),
    T('cap', 'Víčko od lahve'),
    T('metal', 'Rezavý hřebík'),
    T('button', 'Knoflík', 'treasure', 5),
    T('coin', 'Mince', 'treasure', 6),
    T('bead', 'Skleněný korálek', 'treasure', 6),
    T('golden_acorn', 'Zlatý žalud', 'treasure', 40),
  ].map((d) => [d.id, d]),
);

export const RESOURCE_IDS = ['leaf', 'twig', 'moss', 'flower', 'acorn', 'seed', 'stone', 'bark'];
export const TREASURE_IDS = ['button', 'coin', 'bead', 'golden_acorn'];
