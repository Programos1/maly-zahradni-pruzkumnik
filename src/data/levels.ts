import type { ItemCategory } from './items';

/*
 * Map legend (one char per tile, maps are 32x32 including the border):
 *  .  grass            ,  flowery grass      :  dirt            =  stone path
 *  _  tilled soil      z  sand               ~  deep water (blocks)
 *  l  lily pad (walkable over water)         w  puddle (refills moisture, but drowns slowly)
 *  s  sunny patch (dries you out fast)       h  deep shade (slows drying)
 *  #  hedge            B  bush               o  rock            M  giant mushroom
 *  F  fence            T  stump              U  flower pot      W  watering can
 *  Y  tree trunk       P  pumpkin            V  cabbage         v  carrot (walkable)
 *  r  reeds (walkable) p  leaf pile (walkable, hides you from predators)
 *  c  pebble ridge     L  log   (both climbable with the Climbing Foot upgrade)
 *  x  spider web       K  garden shears      H  hose            A  ant hill
 *  N  nest             R  recycling tin
 */

export type ObjectiveDef =
  | { type: 'deposit'; item?: string; category?: ItemCategory; count: number; label: string; optional?: boolean }
  | { type: 'recycle'; count: number; label: string; optional?: boolean }
  | { type: 'eat'; item?: string; count: number; label: string; optional?: boolean }
  | { type: 'find'; item: string; label: string; optional?: boolean }
  | { type: 'nest'; stage: number; label: string; optional?: boolean }
  | { type: 'avoid'; enemy: string; label: string; optional?: boolean };

export type EnemySpec =
  | { type: 'hedgehog'; path: [number, number][]; radius?: number }
  | { type: 'beetle'; path: [number, number][]; radius?: number }
  | { type: 'bird'; center: [number, number]; radius: number }
  | { type: 'frog'; x: number; y: number; radius?: number };

export interface LevelDef {
  name: string;
  subtitle: string;
  theme: 'backyard' | 'veggie' | 'forest' | 'pond' | 'autumn';
  intro: string[];
  map: string[];
  scatter: { items: string[]; count: number; area?: [number, number, number, number] }[];
  fixed: { item: string; x: number; y: number }[];
  respawn: string[];
  enemies: EnemySpec[];
  hoses?: { x: number; y: number; dir: [number, number]; len: number; period: number }[];
  objectives: ObjectiveDef[];
  music: number;
  night?: boolean;
}

export const LEVELS: LevelDef[] = [
  // ---------------------------------------------------------------- 1
  {
    name: 'Dvorek',
    subtitle: 'Kde začíná každé dobrodružství',
    theme: 'backyard',
    music: 57,
    intro: [
      'Pohybuj se klávesami <b>WASD</b> nebo <b>šipkami</b>. Klávesou <b>E</b> sbíráš věci a jíš.',
      'Malé věci se ti přilepí na ulitu, velké táhneš za sebou. Suroviny nos domů do <b>hnízda</b> a odpad do <b>recyklační plechovky</b>.',
      'Pozor na <b>ježka</b>! <b>MEZERNÍKEM</b> se schováš do ulity. Slunce tě vysušuje, takže hledej stín, louže a rosu.',
    ],
    map: [
      '################################',
      '#..,,.....B......:::.....ssss..#',
      '#.,,..........B..:::....ssssss.#',
      '#..N..............:::...ssssss.#',
      '#......=...,,....:::.....ssss..#',
      '#...R..=...,,....:::...........#',
      '#......=.........B===B.........#',
      '#.,....============............#',
      '#.................=............#',
      '#........o........=.......w....#',
      '#,,...............=......www...#',
      '#,,......,,.......=.......w..,,#',
      '#........,,.......=............#',
      '##########........=.....U..o...#',
      '#........#........=............#',
      '#..,,....#........=====........#',
      '#..,,....B............=...B....#',
      '#........#............=........#',
      '#........#............=........#',
      '#####.####............=........#',
      '#.....................=....,,,.#',
      '#...w......,,.........=....,,,.#',
      '#..www.....,,....W....=........#',
      '#...w.................=.....B..#',
      '#........B............=........#',
      '#..ssss...............=...ooo..#',
      '#.ssssss......,,......=........#',
      '#.ssssss......,,......=====....#',
      '#..ssss...................=....#',
      '#........B..........B.....=..,.#',
      '#...........................,,.#',
      '################################',
    ],
    scatter: [
      { items: ['leaf', 'leaf', 'leaf', 'twig', 'moss', 'flower', 'stone'], count: 26 },
      { items: ['seed', 'seed', 'flower'], count: 6, area: [16, 1, 20, 6] },
      { items: ['paper', 'wrapper', 'cap', 'metal'], count: 9 },
      { items: ['strawberry', 'mushroom', 'dew', 'raspberry', 'berry'], count: 7 },
      { items: ['dew'], count: 3, area: [23, 1, 30, 5] },
    ],
    fixed: [
      { item: 'golden_acorn', x: 2, y: 15 },
      { item: 'button', x: 7, y: 17 },
      { item: 'coin', x: 30, y: 30 },
      { item: 'bead', x: 29, y: 2 },
    ],
    respawn: ['leaf', 'leaf', 'twig', 'moss', 'stone', 'flower', 'dew', 'strawberry', 'mushroom'],
    enemies: [{ type: 'hedgehog', path: [[12, 9], [22, 9], [23, 18], [12, 18]], radius: 3.2 }],
    objectives: [
      { type: 'deposit', item: 'leaf', count: 6, label: 'Přines do hnízda 6 listů' },
      { type: 'recycle', count: 4, label: 'Recykluj 4 kusy odpadu' },
      { type: 'eat', count: 3, label: 'Sněz 3 dobroty' },
      { type: 'find', item: 'golden_acorn', label: 'Najdi skrytý zlatý žalud', optional: true },
      { type: 'nest', stage: 1, label: 'Postav mechový přístřešek', optional: true },
      { type: 'avoid', enemy: 'hedgehog', label: 'Nenech se chytit ježkem', optional: true },
    ],
  },
  // ---------------------------------------------------------------- 2
  {
    name: 'Zeleninový záhon',
    subtitle: 'Křupavý, šťavnatý a plný mravenců',
    theme: 'veggie',
    music: 60,
    intro: [
      '<b>Novinka:</b> Mravenci si hlídají své území. Když do něj vlezeš, vyrojí se na tebe, takže hledej cestu okolo.',
      '<b>Zahradní hadice</b> občas stříká. Nejdřív začne kapat, a to je signál, že máš uhnout.',
      'Nad volnou hlínou krouží <b>pták</b>. Když se objeví červený terč, uhni nebo se schovej do ulity!',
    ],
    map: [
      '################################',
      '#..........FFFFFFFFFFFFF.......#',
      '#..,,......F____v______F.......#',
      '#..,,......F_v___v___v_F.......#',
      '#..........F_____A_____F.......#',
      '#....o.....F_v___v___v_F.......#',
      '#..........F___________F.......#',
      '#..........FFFFFF.FFFFFF.......#',
      '#.........................w....#',
      '#..ssssss.....=============....#',
      '#.ssssssss....=..........B.....#',
      '#.ssssssss....=.H..............#',
      '#..ssssss.....=................#',
      '#.............=......FFFFFFF...#',
      '#...V...V.....=......F_____F...#',
      '#..._____.....=......F_v_v_F...#',
      '#..._____.....=......F__A__F...#',
      '#...V...V.....=......F_v_v_F...#',
      '#.............=......F_____F...#',
      '#.............=......FFF.FFF...#',
      '#..w..........=................#',
      '#.www.........=====.....o......#',
      '#..w..............=............#',
      '#.................=....V..V....#',
      '#.,,,.............=............#',
      '#.,N,.............==========...#',
      '#.,,,..R..................=....#',
      '#.............B...........=....#',
      '#....B..................U.=....#',
      '#...............,,,............#',
      '#...............,,,............#',
      '################################',
    ],
    scatter: [
      { items: ['seed', 'seed', 'flower', 'leaf'], count: 14, area: [12, 2, 23, 6] },
      { items: ['seed', 'leaf', 'leaf', 'twig', 'moss', 'stone', 'flower'], count: 22 },
      { items: ['strawberry', 'strawberry', 'raspberry'], count: 6, area: [22, 14, 26, 18] },
      { items: ['strawberry', 'berry', 'dew', 'mushroom'], count: 8 },
      { items: ['paper', 'wrapper', 'cap', 'metal'], count: 12 },
    ],
    fixed: [
      { item: 'golden_acorn', x: 30, y: 1 },
      { item: 'coin', x: 23, y: 17 },
      { item: 'button', x: 2, y: 29 },
      { item: 'bead', x: 18, y: 2 },
    ],
    respawn: ['seed', 'leaf', 'twig', 'moss', 'stone', 'flower', 'strawberry', 'dew', 'raspberry'],
    enemies: [{ type: 'bird', center: [13, 15], radius: 7 }],
    hoses: [{ x: 16, y: 11, dir: [-1, 0], len: 6, period: 7 }],
    objectives: [
      { type: 'deposit', item: 'seed', count: 6, label: 'Přines do hnízda 6 semínek' },
      { type: 'eat', item: 'strawberry', count: 3, label: 'Sněz 3 jahody' },
      { type: 'recycle', count: 6, label: 'Recykluj 6 kusů odpadu' },
      { type: 'find', item: 'golden_acorn', label: 'Najdi zlatý žalud', optional: true },
      { type: 'deposit', item: 'flower', count: 3, label: 'Přines domů 3 kytičky', optional: true },
      { type: 'avoid', enemy: 'ants', label: 'Nenech se kousnout mravencem', optional: true },
    ],
  },
  // ---------------------------------------------------------------- 3
  {
    name: 'Houbový les',
    subtitle: 'Vlhký, šerý a báječně podivný',
    theme: 'forest',
    music: 53,
    night: true,
    intro: [
      '<b>Novinka:</b> Lepkavé <b>pavučiny</b> tě na chvilku zadrží.',
      'Za <b>oblázkovými valy</b> a <b>kládami</b> se skrývají tajné mýtinky. S vylepšením <b>Šplhací noha</b> je přelezeš.',
      'Tímhle lesem se toulají dva ježci, ale aspoň je tu příjemně vlhko.',
    ],
    map: [
      '################################',
      '#..h...M..B...h..M....c........#',
      '#.N.....M..B.....M....c........#',
      '#..h...........B......L........#',
      '#...R.......M...x.....c........#',
      '#...............M.....c........#',
      '#..B..M.........T.....cccccLccc#',
      '#............x.................#',
      '#MM..T....M....B...M...x....T..#',
      '#..........M.....h.............#',
      '#..x...B.......M.......M...B...#',
      '#....M.......x..............x..#',
      '#.M......h....T....M....M......#',
      '#....B.....M..........B........#',
      '#..M....x.......h...B....T....M#',
      '#............M.........x.......#',
      '#...T..M...........B....M......#',
      '#..x.......M.......M...........#',
      '#.B....h.......x....T.....h..B.#',
      '#....M.........M..............M#',
      '#.............B.........M......#',
      '#..M...T.............x.......M.#',
      '#.....x......M.........T.......#',
      '#M...........T.........x.....B.#',
      '#cccLccc.....B....M....T.......#',
      '#......c.....M...........x...B.#',
      '#..h...L..........M............#',
      '#......c.....x.........M..T....#',
      '#......c........B..............#',
      '#......c.....M......M....x.....#',
      '#......c....................M..#',
      '################################',
    ],
    scatter: [
      { items: ['moss', 'moss', 'bark', 'twig', 'leaf', 'seed', 'stone'], count: 30 },
      { items: ['mushroom', 'mushroom', 'mushroom', 'berry', 'dew'], count: 14 },
      { items: ['paper', 'cap', 'metal', 'wrapper'], count: 7 },
      { items: ['bead', 'button', 'coin', 'mushroom'], count: 6, area: [24, 1, 30, 5] },
    ],
    fixed: [
      { item: 'golden_acorn', x: 3, y: 28 },
      { item: 'bead', x: 5, y: 26 },
      { item: 'coin', x: 2, y: 30 },
    ],
    respawn: ['moss', 'bark', 'twig', 'mushroom', 'mushroom', 'seed', 'berry', 'dew', 'leaf'],
    enemies: [
      { type: 'hedgehog', path: [[16, 7], [21, 7], [21, 19], [16, 19]], radius: 3 },
      { type: 'hedgehog', path: [[19, 21], [27, 21], [27, 28], [19, 28]], radius: 3 },
    ],
    objectives: [
      { type: 'eat', item: 'mushroom', count: 5, label: 'Sněz 5 hub' },
      { type: 'deposit', item: 'moss', count: 5, label: 'Přines do hnízda 5 kousků mechu' },
      { type: 'deposit', item: 'bark', count: 3, label: 'Dotáhni domů 3 kusy kůry' },
      { type: 'find', item: 'golden_acorn', label: 'Najdi zlatý žalud na skryté mýtince', optional: true },
      { type: 'nest', stage: 2, label: 'Postav houbovou chaloupku', optional: true },
      { type: 'deposit', category: 'treasure', count: 3, label: 'Přines domů 3 poklady', optional: true },
    ],
  },
  // ---------------------------------------------------------------- 4
  {
    name: 'Rybníček',
    subtitle: 'Lekníny, vlnky a hladové žáby',
    theme: 'pond',
    music: 55,
    intro: [
      '<b>Novinka:</b> Hluboká voda ti zatarasí cestu, ale přes <b>lekníny</b> se dostaneš na druhou stranu.',
      '<b>Žáby</b> si před vymrštěním jazyka nafouknou hrdlo. Jakmile to uvidíš, zmiz z dosahu!',
      'Prý se na ostrůvku uprostřed skrývá něco zlatého.',
    ],
    map: [
      '################################',
      '#..............B.......o.......#',
      '#.N..................B.........#',
      '#............,,,...............#',
      '#..R.........,,,........ss.....#',
      '#........................ssss..#',
      '#.....rzzzzzzzzzzzzr.....ssss..#',
      '#....rzz~~~~~l~~~~zzr.....ss...#',
      '#....zz~~~~~~l~~~~~zzr.........#',
      '#...rz~~~~~~~l~~~~~~zzr........#',
      '#...zz~~~~~~~l~~~~~~~zz........#',
      '#...z~~~~~~~~l~~~~~~~~z....B...#',
      '#..rz~~~~~~~~llll~~~~~zr.......#',
      '#..zz~~~~~~~~~~lzzz~~~z........#',
      '#..z~~~~~~~~~~~zzzzz~~zz.......#',
      '#..zlllllllllllzzzzz~~~z.......#',
      '#..z~~~~~~~~~~~~zzz~~~~z...o...#',
      '#..zz~~~~~~~~~~~~l~~~~zz.......#',
      '#...z~~~~~~~~~~~~l~~~~z........#',
      '#...zz~~~~~~~~~~~l~~~zz....B...#',
      '#....z~~~~~~~~~~~l~~~z.........#',
      '#....zz~~~~~~~~~~l~zzr.........#',
      '#.....rzz~~~~~~~~lzr...........#',
      '#......rzzzzzzzzzz.....,,......#',
      '#......................,,......#',
      '#..B.......o...................#',
      '#...............B.......B......#',
      '#....,,........................#',
      '#....,,.........U..............#',
      '#.......................W......#',
      '#..............................#',
      '################################',
    ],
    scatter: [
      { items: ['stone', 'stone', 'flower', 'leaf', 'moss', 'twig', 'seed'], count: 26 },
      { items: ['dew', 'dew', 'raspberry', 'berry', 'strawberry'], count: 10 },
      { items: ['paper', 'wrapper', 'cap', 'metal', 'cap'], count: 12 },
      { items: ['flower', 'stone'], count: 5, area: [16, 13, 20, 16] },
    ],
    fixed: [
      { item: 'golden_acorn', x: 18, y: 14 },
      { item: 'coin', x: 18, y: 16 },
      { item: 'coin', x: 30, y: 1 },
      { item: 'bead', x: 2, y: 30 },
      { item: 'button', x: 17, y: 13 },
    ],
    respawn: ['stone', 'flower', 'leaf', 'moss', 'dew', 'raspberry', 'twig', 'seed'],
    enemies: [
      { type: 'frog', x: 13, y: 6, radius: 3 },
      { type: 'frog', x: 23, y: 14, radius: 3 },
      { type: 'frog', x: 3, y: 16, radius: 3 },
      { type: 'frog', x: 19, y: 23, radius: 3 },
      { type: 'bird', center: [26, 8], radius: 6 },
    ],
    objectives: [
      { type: 'deposit', item: 'stone', count: 5, label: 'Přines do hnízda 5 oblázků' },
      { type: 'deposit', item: 'flower', count: 3, label: 'Přines do hnízda 3 kytičky' },
      { type: 'recycle', count: 6, label: 'Ukliď 6 kusů odpadu' },
      { type: 'find', item: 'golden_acorn', label: 'Dostaň se na ostrůvek a najdi zlatý žalud', optional: true },
      { type: 'avoid', enemy: 'frog', label: 'Nenech se chytit žabím jazykem', optional: true },
      { type: 'deposit', item: 'coin', count: 2, label: 'Přines domů 2 mince', optional: true },
    ],
  },
  // ---------------------------------------------------------------- 5
  {
    name: 'Podzimní zahrada',
    subtitle: 'Šustivé listí, buclaté dýně, ostré nůžky',
    theme: 'autumn',
    music: 52,
    intro: [
      '<b>Novinka:</b> V <b>hromádkách listí</b> tě neuvidí ptáci ani brouci, tak se do nich v nouzi schovej.',
      '<b>Střevlíci</b> se po tobě rozběhnou rovně, jakmile tě zahlédnou. Uskoč jim z cesty!',
      '<b>Zahradní nůžky</b> cvakají v pravidelném rytmu. Dobře si načasuj, kdy kolem nich projdeš.',
    ],
    map: [
      '################################',
      '#......,.......p.......PP......#',
      '#.N...............Y............#',
      '#............p.........p.......#',
      '#..R...p....................K..#',
      '#.............P.....x..........#',
      '#....B..................p...B..#',
      '#............ssssss............#',
      '#..p.........ssssssss....P.....#',
      '#............ssssssss..........#',
      '#....P........ssssss.....p.....#',
      '#..........................Y...#',
      '#..Y.............K.............#',
      '#............p....p......B.....#',
      '#....p...........p.........p...#',
      '#..B...........H.......P.......#',
      '#..............................#',
      '#.....PP..........p.....A......#',
      '#..............................#',
      '#..p..........B...........K....#',
      '#..............................#',
      '#...Y............p.....P.......#',
      '#............x.................#',
      '#....p............P......p.....#',
      '#..............................#',
      '#cccccccc.....B.........ssss...#',
      '#.......c..............ssssss..#',
      '#..p....L......p.......ssssss..#',
      '#.......c...............ssss...#',
      '#.......c.....P........p.......#',
      '#.......c......................#',
      '################################',
    ],
    scatter: [
      { items: ['acorn', 'acorn', 'acorn', 'leaf', 'leaf', 'twig', 'bark', 'seed'], count: 32 },
      { items: ['mushroom', 'raspberry', 'berry', 'dew', 'strawberry'], count: 10 },
      { items: ['paper', 'wrapper', 'cap', 'metal'], count: 14 },
    ],
    fixed: [
      { item: 'golden_acorn', x: 3, y: 29 },
      { item: 'coin', x: 6, y: 27 },
      { item: 'button', x: 2, y: 27 },
      { item: 'bead', x: 30, y: 1 },
      { item: 'bead', x: 29, y: 30 },
      { item: 'button', x: 17, y: 3 },
      { item: 'coin', x: 30, y: 17 },
    ],
    respawn: ['acorn', 'acorn', 'leaf', 'twig', 'bark', 'mushroom', 'dew', 'seed', 'raspberry'],
    enemies: [
      { type: 'hedgehog', path: [[2, 11], [11, 11], [11, 23], [2, 23]], radius: 3 },
      { type: 'beetle', path: [[12, 18], [22, 18], [22, 24], [12, 24]], radius: 4 },
      { type: 'beetle', path: [[21, 5], [29, 5], [29, 14], [21, 14]], radius: 4 },
      { type: 'bird', center: [16, 9], radius: 7 },
    ],
    hoses: [{ x: 15, y: 15, dir: [1, 0], len: 6, period: 6 }],
    objectives: [
      { type: 'deposit', item: 'acorn', count: 6, label: 'Uschovej na zimu 6 žaludů' },
      { type: 'deposit', item: 'leaf', count: 5, label: 'Přines do hnízda 5 listů' },
      { type: 'recycle', count: 8, label: 'Recykluj 8 kusů odpadu' },
      { type: 'find', item: 'golden_acorn', label: 'Najdi poslední zlatý žalud', optional: true },
      { type: 'nest', stage: 5, label: 'Dokonči vysněný šnečí domov', optional: true },
      { type: 'avoid', enemy: 'beetle', label: 'Nenech se srazit broukem', optional: true },
    ],
  },
];
