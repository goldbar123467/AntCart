// Powerup runtime engine for AntCarts — Wave 4.
//
// The single source of truth for *active* powerup effects and the per-frame
// multipliers the host applies. Pure TypeScript: NO Three.js, NO Cannon-es,
// and crucially NO import of `../arcadeKart.ts`. The runner never touches
// kart physics — it communicates only through the `PowerupContext` interface
// (reads of player speed / ai speeds / score + a boost callback the host
// wires to the existing boost pathway) and the `PowerupRuntimeDelta` it
// returns from `update()`.
//
// Effect model
// ------------
//  - Timed effects (boost, shield, magnet, formic-acid) push an `ActiveEffect`
//    with an `endsAt` timestamp. `update()` prunes expired effects and reports
//    the aggregated multipliers/flags the host applies that frame.
//  - Instant effects (aphid-launcher, pencil-dart, marble-drop, thumbtack-mine)
//    do NOT persist; `activate()` returns a `spawnRequest` the host may render.
//    For Wave 4 the host can no-op the spawn but still consumes the item and
//    shows a HUD toast.
//
// Inventory coupling
// ------------------
// `activate()` calls `consumePowerup(id)` from the economy layer. If stock is
// empty the activation is rejected with `{ ok: false }` and nothing changes.

import { POWERUPS, type PowerupId } from "./powerupCatalog";
import { consumePowerup } from "../economy/inventory";

/** A powerup currently in effect (timed effects only). */
export interface ActiveEffect {
  id: PowerupId;
  /** Epoch ms when the effect expires. */
  endsAt: number;
}

/**
 * The narrow window the runner may read/mutate WITHOUT touching kart physics.
 * The host (main.ts) constructs this each frame from existing race state.
 * The runner never imports `arcadeKart.ts` — the boost callback is the host's
 * to implement against its existing boost pathway.
 */
export interface PowerupContext {
  /** Current player speed (m/s), read-only from the runner's perspective. */
  playerSpeed: number;
  /** Player's normal max speed — used for reference, not mutation. */
  playerMaxSpeed: number;
  /** AI racers' speeds; the host scales these per the returned multiplier. */
  aiRacers: { speed: number }[];
  /** Current score; the host adds the returned `scoreBonus` each frame. */
  score: number;
  /**
   * Host hook: request a boost-style speed clamp. The host wires this to its
   * existing boost pathway (e.g. set boostTimer). The runner never creates a
   * physics body or force.
   */
  applyPlayerBoost(multiplier: number): void;
}

/** Request for the host to optionally render a projectile/trap (instant effects). */
export interface SpawnRequest {
  kind: "projectile" | "trap";
  id: PowerupId;
}

/** Result of an `activate()` call. */
export interface PowerupResult {
  ok: boolean;
  /** Human-readable status for a HUD toast. */
  message: string;
  /** For instant offense effects: a spawn request the host may render. */
  spawnRequest?: SpawnRequest;
}

/**
 * Per-frame deltas the host applies to existing race state. All multipliers
 * default to neutral (1 / 0 / false) when no effect is active. The host never
 * reads runner internals — only this return value.
 */
export interface PowerupRuntimeDelta {
  /** Multiplier applied to the player's boost-clamped speed (>1 = faster). */
  playerSpeedMultiplier: number;
  /** Multiplier applied to each AI racer's speed this frame (<1 = slowed). */
  aiSpeedMultiplier: number;
  /** True while a leaf shield is active (host may render a bubble + block hits). */
  shieldActive: boolean;
  /** Score to add this frame (magnet accrual), in whole points. */
  scoreBonus: number;
}

const NEUTRAL_DELTA: PowerupRuntimeDelta = {
  playerSpeedMultiplier: 1,
  aiSpeedMultiplier: 1,
  shieldActive: false,
  scoreBonus: 0,
};

// --- Effect tuning (single source of truth for the runtime) ---
const BOOST_DURATION_MS = 2500;
const BOOST_MULTIPLIER = 1.5;
const SHIELD_DURATION_MS = 5000;
const MAGNET_DURATION_MS = 4000;
const MAGNET_SCORE_PER_SECOND = 2;
const FORMIC_DURATION_MS = 2000;
const FORMIC_AI_MULTIPLIER = 0.7;

const INSTANT_OFFENSE: ReadonlySet<PowerupId> = new Set<PowerupId>([
  "powerup-aphid-launcher",
  "powerup-pencil-dart",
  "powerup-marble-drop",
  "powerup-thumbtack-mine",
]);

export interface PowerupRunner {
  /**
   * Consume one stock of `id` and apply its effect. Returns `{ok:false}` when
   * stock is empty or the id is unknown — nothing is mutated in that case.
   */
  activate(id: PowerupId, now: number, ctx: PowerupContext): PowerupResult;
  /**
   * Tick active effects and return the per-frame deltas for the host to apply.
   * Prunes expired effects. Safe to call every race frame; a no-op outside races.
   */
  update(now: number, ctx: PowerupContext): PowerupRuntimeDelta;
  /** Snapshot of currently active (unexpired) timed effects, for the HUD. */
  getActive(): ActiveEffect[];
  /** Reset all active effects (used on race restart). Does NOT touch inventory. */
  clear(): void;
}

export function createPowerupRunner(): PowerupRunner {
  // Timed effects currently in play. Instant effects never enter this list.
  const active: ActiveEffect[] = [];
  // The most recent scoreBonus rate (points/sec) — recomputed each update().
  let magnetRatePerSecond = 0;

  function pushTimed(id: PowerupId, now: number, durationMs: number): void {
    // Refresh: a re-activate extends the window from `now` (no stacking abuse).
    const existing = active.find((e) => e.id === id);
    const endsAt = now + durationMs;
    if (existing) {
      existing.endsAt = endsAt;
    } else {
      active.push({ id, endsAt });
    }
  }

  function activate(id: PowerupId, now: number, ctx: PowerupContext): PowerupResult {
    const def = POWERUPS[id];
    if (!def) {
      return { ok: false, message: "Unknown powerup." };
    }
    // Consume one from persistent stock first. Atomic: on failure, no effect.
    if (!consumePowerup(id)) {
      return { ok: false, message: `No ${def.name} in stock.` };
    }

    switch (id) {
      case "powerup-sugar-cube-boost": {
        pushTimed(id, now, BOOST_DURATION_MS);
        // Nudge the host's existing boost pathway immediately for responsiveness.
        ctx.applyPlayerBoost(BOOST_MULTIPLIER);
        return { ok: true, message: `${def.name}! Turbo engaged.` };
      }
      case "powerup-leaf-shield": {
        pushTimed(id, now, SHIELD_DURATION_MS);
        return { ok: true, message: `${def.name} up!` };
      }
      case "powerup-pheromone-magnet": {
        pushTimed(id, now, MAGNET_DURATION_MS);
        return { ok: true, message: `${def.name} pulling crumbs!` };
      }
      case "powerup-formic-acid-spray": {
        pushTimed(id, now, FORMIC_DURATION_MS);
        return { ok: true, message: `${def.name} — rivals slowed!` };
      }
      default: {
        // Instant offense: aphid-launcher / pencil-dart / marble-drop / thumbtack-mine.
        if (INSTANT_OFFENSE.has(id)) {
          const kind: SpawnRequest["kind"] =
            id === "powerup-marble-drop" || id === "powerup-thumbtack-mine" ? "trap" : "projectile";
          return {
            ok: true,
            message: `${def.name} fired!`,
            spawnRequest: { kind, id },
          };
        }
        // Unreachable given the catalog, but keeps the switch total.
        return { ok: false, message: "Powerup has no runtime effect." };
      }
    }
  }

  function update(now: number, _ctx: PowerupContext): PowerupRuntimeDelta {
    // Prune expired timed effects.
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].endsAt <= now) {
        active.splice(i, 1);
      }
    }
    if (active.length === 0) {
      magnetRatePerSecond = 0;
      return NEUTRAL_DELTA;
    }

    let playerSpeedMultiplier = 1;
    let aiSpeedMultiplier = 1;
    let shieldActive = false;
    let scoreBonus = 0;

    for (const effect of active) {
      switch (effect.id) {
        case "powerup-sugar-cube-boost":
          // Take the max so a fresh boost isn't diluted by a weaker one.
          playerSpeedMultiplier = Math.max(playerSpeedMultiplier, BOOST_MULTIPLIER);
          break;
        case "powerup-formic-acid-spray":
          aiSpeedMultiplier = Math.min(aiSpeedMultiplier, FORMIC_AI_MULTIPLIER);
          break;
        case "powerup-leaf-shield":
          shieldActive = true;
          break;
        case "powerup-pheromone-magnet":
          scoreBonus += MAGNET_SCORE_PER_SECOND;
          break;
        default:
          // Instant effects never appear in `active`; nothing to do.
          break;
      }
    }
    magnetRatePerSecond = scoreBonus;
    return { playerSpeedMultiplier, aiSpeedMultiplier, shieldActive, scoreBonus };
  }

  function getActive(): ActiveEffect[] {
    // Return a defensive copy so callers can't mutate runner state.
    return active.map((e) => ({ ...e }));
  }

  function clear(): void {
    active.length = 0;
    magnetRatePerSecond = 0;
  }

  return { activate, update, getActive, clear };
}

/** Exposed for tests: the per-second magnet score rate while active. */
export const MAGNET_RATE_PER_SECOND = MAGNET_SCORE_PER_SECOND;
