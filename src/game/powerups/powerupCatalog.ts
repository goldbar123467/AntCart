// Powerup catalog for AntCarts — Wave 4 runtime definitions.
//
// Ant + house themed metadata for the eight powerup stock items that the
// SUGAR STORE sells (see `../economy/storeCatalog.ts`). The store owns the
// *commerce* shape (id, price, desc, icon, accent); this catalog owns the
// *runtime* shape (kind, effect duration, display name/icon used by the HUD).
//
// The ids intentionally reuse the store's `"powerup-<slug>"` form so the
// runner can hand the same id straight to `consumePowerup(id)` without a
// mapping step. Keeping ids consistent across store, inventory, runner, and
// HUD is a hard requirement of the plan.
//
// Pure TypeScript, no DOM / Three.js — easily unit-testable.

export type PowerupId =
  | "powerup-aphid-launcher"
  | "powerup-pencil-dart"
  | "powerup-marble-drop"
  | "powerup-thumbtack-mine"
  | "powerup-formic-acid-spray"
  | "powerup-leaf-shield"
  | "powerup-sugar-cube-boost"
  | "powerup-pheromone-magnet";

/** Effect classification — drives HUD accent + grouping. */
export type PowerupKind = "offense" | "defense" | "utility";

export interface PowerupDef {
  /** Stable id; matches the inventory key used by storeCatalog / inventory. */
  id: PowerupId;
  /** Display name (HUD + toasts). */
  name: string;
  /** Effect category. */
  kind: PowerupKind;
  /** Emoji glyph for the HUD slot + toasts. */
  icon: string;
  /** Hex accent from the track palette (HUD chip + slot trim). */
  accent: string;
  /** Short label for HUD chips/toasts (the recognizable noun). */
  chip: string;
  /** Short effect description. */
  desc: string;
  /** Duration of the active effect in ms. Instant effects leave this unset. */
  durationMs?: number;
}

/**
 * The full runtime powerup catalog. Eight entries — one per stocked item in
 * the store. Ordering mirrors the plan's offense-then-defense list.
 */
export const POWERUPS: Record<PowerupId, PowerupDef> = {
  "powerup-aphid-launcher": {
    id: "powerup-aphid-launcher",
    name: "Aphid Launcher",
    kind: "offense",
    icon: "🐜",
    accent: "#ff73bb",
    chip: "APHID",
    desc: "Launch a homing aphid at the racer ahead.",
  },
  "powerup-pencil-dart": {
    id: "powerup-pencil-dart",
    name: "Pencil Dart",
    kind: "offense",
    icon: "✏️",
    accent: "#f4d150",
    chip: "DART",
    desc: "Fire a sharpened pencil dart straight forward.",
  },
  "powerup-marble-drop": {
    id: "powerup-marble-drop",
    name: "Marble Drop",
    kind: "offense",
    icon: "🔵",
    accent: "#2d6bbf",
    chip: "MARBLE",
    desc: "Drop a rolling marble trap behind your kart.",
  },
  "powerup-thumbtack-mine": {
    id: "powerup-thumbtack-mine",
    name: "Thumbtack Mine",
    kind: "offense",
    icon: "📌",
    accent: "#c73128",
    chip: "MINE",
    desc: "Plant a thumbtack mine on the track. Point up.",
  },
  "powerup-formic-acid-spray": {
    id: "powerup-formic-acid-spray",
    name: "Formic Acid Spray",
    kind: "offense",
    icon: "🟢",
    accent: "#e9ff80",
    chip: "FORMIC",
    desc: "Short-range cone that slows tailgating rivals.",
    durationMs: 2000,
  },
  "powerup-leaf-shield": {
    id: "powerup-leaf-shield",
    name: "Leaf Shield",
    kind: "defense",
    icon: "🍃",
    accent: "#5dfdff",
    chip: "SHIELD",
    desc: "A leafcutter shield. Absorbs hits for a few seconds.",
    durationMs: 5000,
  },
  "powerup-sugar-cube-boost": {
    id: "powerup-sugar-cube-boost",
    name: "Sugar Cube Boost",
    kind: "utility",
    icon: "🧊",
    accent: "#ffbd3f",
    chip: "SUGAR",
    desc: "A pure-sugar turbo rush. Uses the existing boost pathway.",
    durationMs: 2500,
  },
  "powerup-pheromone-magnet": {
    id: "powerup-pheromone-magnet",
    name: "Pheromone Magnet",
    kind: "utility",
    icon: "🧲",
    accent: "#5dfdff",
    chip: "MAGNET",
    desc: "Pull in crumbs — score bonus while active.",
    durationMs: 4000,
  },
};

/** Ordered list of every powerup id (used for loadout cycling). */
export const POWERUP_IDS: readonly PowerupId[] = Object.keys(POWERUPS) as PowerupId[];

/** Look up a definition by id. Returns `undefined` for unknown ids. */
export function getPowerup(id: string): PowerupDef | undefined {
  return POWERUPS[id as PowerupId];
}

/** Whether an id names a real powerup in the catalog. */
export function isPowerupId(id: string): id is PowerupId {
  return id in POWERUPS;
}