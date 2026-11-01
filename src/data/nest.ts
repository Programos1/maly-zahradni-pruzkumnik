export interface NestStage {
  name: string;
  desc: string;
  cost: Record<string, number>;
}

/** Stage 0 is the starting shelter; each subsequent stage is a purchasable improvement. */
export const NEST_STAGES: NestStage[] = [
  { name: 'Obyčejný listový přístřešek', desc: 'Stočený list. Chrání před deštěm. Většinou.', cost: {} },
  { name: 'Mechový přístřešek', desc: 'Měkký mech udržuje hnízdo chladné a vlhké.', cost: { leaf: 4, moss: 4 } },
  { name: 'Houbová chaloupka', desc: 'Kolem zdí raší malé houbičky.', cost: { moss: 3, seed: 4, acorn: 2 } },
  { name: 'Dřevěný vchod', desc: 'Pořádné dveře z větviček se stříškou z kůry.', cost: { twig: 5, bark: 3, stone: 3 } },
  { name: 'Květinová zahrádka', desc: 'Věneček z květin. Včelky souhlasí.', cost: { flower: 6, seed: 4, leaf: 4 } },
  { name: 'Vysněný šnečí domov', desc: 'Lucerničky, knoflíky a poklady. Dokonalost.', cost: { button: 2, bead: 2, coin: 2, moss: 4 } },
];

export interface ShellDeco {
  id: string;
  name: string;
  tex: string;
  cost: Record<string, number>;
}

export const SHELL_DECOS: ShellDeco[] = [
  { id: 'flower', name: 'Sedmikráska', tex: 'deco_flower', cost: { flower: 2 } },
  { id: 'moss', name: 'Mechová čepička', tex: 'deco_moss', cost: { moss: 3 } },
  { id: 'mushroom', name: 'Muchomůrka', tex: 'deco_mushroom', cost: { seed: 3, moss: 1 } },
  { id: 'stones', name: 'Oblázky', tex: 'deco_stones', cost: { stone: 3 } },
  { id: 'leaf', name: 'Listová plachta', tex: 'deco_leaf', cost: { leaf: 3, twig: 1 } },
  { id: 'button', name: 'Knoflíkový odznak', tex: 'deco_button', cost: { button: 1 } },
];
