# AntCarts

AntCarts is a local Vite + TypeScript + Three.js ant racing prototype.

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5174`.

Useful commands:

```bash
npm test
npm run build
npm run check
npm run preview
```

## First Pass

- Seeded arcade race layout using `1 Three.js unit = 1 meter`, with a 900m lap, 12m road, seed-selected dogleg/kidney/switchback/wide-S topology variants, and hard validation against tight corners, centerline crossings, and broken offset curbs.
- Arcade-scale raceway in a stripped room with procedural PBR-style carpet, painted wall, and ceiling materials; no loose decor, furniture, crumbs, or backdrop blocks competing with the track.
- Playable go-kart with WASD / arrow-key steering, a dedicated arcade controller, tight low-speed and high-speed turning, soft section speed limits, normal speed near 24-28m/s, and boost pads up to 42m/s.
- Three-lap checkpoint-gated race state with 7 AI placeholder racers following the racing line.
- Invisible checkpoint triggers, score, countdown timer, minimap, speed gauge, and speed-scaled follow camera.
- Arcade HUD with score/time/checkpoint info, minimap, MPH speed gauge, and an engine-audio unlock button.
- Web Audio engine hum rises and falls with kart speed after the player enables audio or presses a driving key.
- Cannon-es static colliders remain available for room walls and future track-only obstacles.

## Game Development Shape

Keep gameplay state outside Three.js objects:

- `src/game/simulation/` should own rules, entities, timers, win/loss state, and saveable state.
- `src/game/input/` should map keys, pointer, and controller inputs into named actions.
- `src/render/` should stay focused on scene composition, shaders, camera, lighting, and rendering.
- `src/ui/` should own DOM HUD, menus, settings, and editor panels.
- `src/physics/` should bridge `cannon-es` bodies to render objects.

For future assets, use Blender to GLB/glTF and optimize with glTF Transform before shipping.

## Visual QA

For visible gameplay, camera, HUD, track, material, or asset changes, run:

```bash
npm run check
npm run dev
npm run qa:visual
```

`npm run qa:visual` expects the dev server at `http://127.0.0.1:5174/` by default. Override it with:

```bash
ANTCARTS_URL=http://127.0.0.1:5174/ npm run qa:visual
```

The visual QA script drives the kart in desktop and mobile Chromium viewports, captures start/turn/recovery screenshots, checks the WebGL canvas and MPH gauge, and writes reports under `test-results/`. Inspect screenshots manually when fixing visual bugs.

## Deployment

This folder can deploy as a static Vite app if you later make AntCarts public:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`
