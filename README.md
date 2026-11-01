# Little Garden Explorer 🐌

A cozy isometric browser game: guide a little snail through five handcrafted gardens, collect resources, clean up trash, dodge predators, grow, and build the coziest nest in the garden.

## Running

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # typecheck + production build to dist/
npm run preview   # serve the production build
```

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move (8 directions, screen-relative) |
| E | Pick up, eat, store at nest, recycle at tin, open nest menu |
| Space (hold) | Hide in shell (immune to predators, can't move) |
| Tab | Toggle goals list |
| Esc | Pause |

## Architecture

```
src/
  config.ts          gameplay tuning constants
  core/              iso projection, seeded RNG, event bus (logic ⇄ UI)
  assets/            procedural Canvas2D painters + texture registry + PNG override hook
  audio/             WebAudio synth: ambience, generative music, SFX (no audio files)
  data/              items, levels (ASCII maps + spawns + objectives), upgrades, nest stages
  state/SaveData.ts  persistent progress (localStorage) and derived snail stats
  world/             LevelMap (pure data: tiles, collision), WorldView (rendering)
  entities/          Snail (logic), SnailView (rendering), enemies, hazards, collectibles
  systems/           objectives tracking, particle/text effects
  scenes/            BootScene (build textures), GameScene (one level, or demo mode behind menus)
  ui/                DOM/CSS HUD and screens (menu, map, intro, pause, nest, complete)
```

Game logic emits events on `core/EventBus` (`hud`, `toast`, `prompt`, `levelComplete`, …); the DOM UI listens and emits intents back (`ui:nestChanged`). Logic never touches the DOM.

## Replacing art

Every sprite is painted procedurally under a stable texture key (see `src/assets/paint*.ts`). To swap in hand-made art:

1. Save `public/assets/sprites/<key>.png` at the same size as the painter's canvas.
2. Add `<key>` to `OVERRIDES` in `src/assets/textures.ts`.

## Adding a level

Add an entry to `LEVELS` in `src/data/levels.ts`. The legend for the 32×32 ASCII map is at the top of that file. Enemy paths should run over walkable tiles. Scatter specs place items randomly on tiles reachable from the nest; fixed items can be hidden behind climbable ridges (`c`/`L`), which unlock with the Climbing Foot upgrade.
