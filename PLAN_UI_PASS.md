# AntCarts UI Pass — Plan

Goal: Add full arcade front-end and meta-game to AntCarts without touching
kart physics or the kart mesh. Aesthetic = ant + house. UI palette = race
track colors.

## Track palette (source of truth for UI)
- Track asphalt:   `#2d6bbf` (blue)
- Centerline stripe: `#f4d150` (yellow)
- Kart red:        `#c73128`
- Sky / fog:       `#8faabd`
- HUD accents:     cyan `#5dfdff`, pink `#ff73bb`, lime `#e9ff80`, warn `#ffbd3f`
- Dark base:       `#101418`

## Architecture
DOM overlay screens on top of the existing canvas (same pattern as the HUD).
A `ScreenManager` owns a `gamePhase` state machine:

  `menu` -> `race` -> `results` -> `betweenRaces` -> `race` -> ... -> `store`/`menu`

New files:
- `src/ui/screens/screenManager.ts`     phase state + show/hide + transitions
- `src/ui/screens/startScreen.ts`       landing / main / start
- `src/ui/screens/resultsScreen.ts`     end-of-race results
- `src/ui/screens/betweenRacesScreen.ts` between-races (next race, standings, repair)
- `src/ui/screens/storeScreen.ts`       store (cosmetics + powerup stock)
- `src/ui/screens/pauseScreen.ts`       pause / options
- `src/game/economy/currency.ts`        Crumb Coin wallet (localStorage)
- `src/game/powerups/powerupCatalog.ts` definitions (ant+house themed)
- `src/game/powerups/powerupInventory.ts` owned stock + loadout
- `src/game/powerups/powerupRunner.ts`  runtime effects (no kart physics edits)
- `src/ui/hud/powerupHud.ts`            pickup slot + activation HUD
- `src/style.css`                       new `.ac-screen`, `.ac-*` themed styles
- tests per module under `tests/`

## Ant + house theme vocabulary
Ant side: anthill mound, formic acid, aphid, mandible, pheromone, leafcutter,
sugar cube, crumb, chitin, antenna.
House side: thumbtack, marble, pencil, button, sugar packet, dust bunny,
thumbtack, matchstick, coin.

## Powerup catalog (browser arcade racer conventions, ant+house skinned)
Offense
- Aphid Launcher     homing missile (ant-farmed aphid)
- Pencil Dart        forward projectile
- Marble Drop        rear dropped trap
- Thumbtack Mine     stationary trap
- Formic Acid Spray  short-range cone slow
Defense / Utility
- Leaf Shield        3-hit shield
- Pheromone Magnet   pull toward next racer / pickup
- Sugar Cube Boost   turbo (uses existing boost pathway, no physics change)
- Dust Bunny Cloak   brief invisibility to AI targeters
- Crumb Coin Magnet  pull coins

## Order of work (each step ships green: tests + build + visual QA)
1. Screen manager + phase state + Start/landing page (ant/house theme).
2. Results screen + between-races screen + currency wallet (Crumb Coins).
3. Store page (buy cosmetics + powerup stock, persistent wallet).
4. Powerup system: catalog, inventory, runner effects, HUD pickup slot.
5. Etc: pause/options, track-select preview, achievements toast.

## Hard rules
- DO NOT touch `src/game/arcadeKart.ts`, kart physics constants, or the kart mesh.
- Powerup effects hook into existing public state (speed multiplier via boost
  pads, AI speed scaling, score) — no new physics bodies on the kart.
- Keep Vercel-static friendly: localStorage only, no backend.
- Every visible change: `npm run check` + `npm run qa:visual` + screenshot notes.
