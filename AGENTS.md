# AntCarts Agent Rules

These rules apply inside `/home/clark/code/AntCarts`. They extend the workspace-level `../AGENTS.md`.

## Research-Backed Game Development

- Use current online research before nontrivial gameplay, rendering, physics, browser, asset, or deployment changes.
- Prefer primary sources: Three.js docs and examples, Cannon-es docs/examples, Vite and Vercel docs, glTF and Blender docs, glTF Transform docs, and relevant public GitHub repositories.
- Read the relevant GitHub repository README and source before using a pattern. Do not copy code or assets blindly.
- Check asset licenses before importing models, textures, audio, or code. Prefer original, generated, CC0, MIT-compatible, or clearly licensed assets, and record attribution when needed.
- Include source links in final notes or QA reports when external information materially changes the implementation.
- Do not invent APIs, tuning claims, or engine behavior from model prediction. Verify with docs, source, measurements, tests, and browser screenshots.

Useful starting references for this project:

- Three.js `TubeGeometry` for continuous curve-following geometry.
- Three.js `GLTFLoader` for Blender to GLB/glTF assets.
- Cannon-es for physics primitives and static/dynamic bodies.
- Vite static deployment docs and Vercel Vite docs for production build assumptions.
- `jakesgordon/javascript-racer`, `pakastin/car`, and `SergeyMakeev/ArcadeCarPhysics` for racing-map, drift, and arcade vehicle-control ideas. Treat these as design references, not drop-in code.

## Game Implementation Rules

- Keep `1 Three.js unit = 1 meter`.
- Keep gameplay state outside Three.js meshes. Simulation modules should own race rules, timers, input state, lap/checkpoint state, and speed values.
- Use proven Three.js APIs for rendering structure: `InstancedMesh` for repeated track edge pieces, curve-based geometry for roads/rails/curbs, `GLTFLoader` for shipped models, and post-processing only when it survives visual QA.
- For complex art, use Blender to GLB/glTF. Optimize production assets with glTF Transform before shipping.
- Keep the app Vercel-friendly: static Vite app, no backend, no database, no auth, no WebSockets unless the user explicitly changes scope.
- Preserve the local studio controls and browser-debug hooks when making gameplay changes.

## Visual QA

Every visible, gameplay, camera, HUD, track, shader, material, or asset change must include screenshot-based QA.

Required local pass before saying the work is done:

```bash
npm run check
npm run dev
npm run qa:visual
```

Use `ANTCARTS_URL=http://127.0.0.1:5174/ npm run qa:visual` if the dev server is on a different URL.

The visual QA pass must:

- Capture desktop and mobile screenshots.
- Capture at least one moving/turning state, not only the starting grid.
- Inspect the generated screenshots manually when fixing visual bugs.
- Record screenshot paths and the JSON/Markdown report under `test-results/`.
- Check that HUD elements, the MPH gauge, track edges, minimap checkpoint dots, curbs, props, and car scale are readable and not visually broken.
- Reproduce the user's screenshot angle as closely as practical when fixing a reported visual bug.

Do not claim a visual/gameplay fix is complete without fresh screenshot evidence from the current build.
