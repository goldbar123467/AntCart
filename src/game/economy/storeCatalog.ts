// Store catalog for AntCarts — pure data module.
//
// Defines the inventory sold by the SUGAR STORE: cosmetics (visual-only kart
// livery colors / antennae / wheel caps — NO physics) and powerup stock
// (buyable pickups the player stocks and uses in races — runtime EFFECTS are
// Wave 4; Wave 3 only sells and stocks them).
//
// Ant + house themed names. Accents are drawn from the race track palette
// (see PLAN_UI_PASS.md). Pure TypeScript, no DOM/Three.js — easily testable.

export type StoreItemKind = "cosmetic" | "powerup";

export interface StoreItem {
  /** Stable unique id, used as the inventory key. */
  id: string;
  /** Display name. */
  name: string;
  /** "cosmetic" (owned permanently once bought) or "powerup" (stocked, consumed on use). */
  kind: StoreItemKind;
  /** Price in Crumb Coins. Always a positive integer. */
  price: number;
  /** Short flavor / effect description. */
  desc: string;
  /** Emoji glyph or short SVG path data — rendered on the store card. */
  icon: string;
  /** Hex accent from the track palette (used for card trim + icon tint). */
  accent: string;
}

/**
 * The full store inventory. ~16 items split between cosmetics and powerups.
 * Cosmetics are owned permanently; powerups are stocked one-at-a-time per buy.
 */
export const STORE_CATALOG: StoreItem[] = [
  // --- Cosmetics (visual only) ---
  {
    id: "livery-honeydew",
    name: "Honeydew Livery",
    kind: "cosmetic",
    price: 120,
    desc: "Sweet green shine. Pure sugar-coated carapace.",
    icon: "🟢",
    accent: "#e9ff80",
  },
  {
    id: "wheels-sugar",
    name: "Sugar-Wheel Caps",
    kind: "cosmetic",
    price: 90,
    desc: "Crystalline hubcaps that glint in the kitchen light.",
    icon: "⭕",
    accent: "#f8f4e9",
  },
  {
    id: "wrap-crimson-mandible",
    name: "Crimson Mandible Wrap",
    kind: "cosmetic",
    price: 180,
    desc: "Mandible-red paint job. Intimidates rival foragers.",
    icon: "🔴",
    accent: "#c73128",
  },
  {
    id: "antenna-golden-tip",
    name: "Golden Antenna Tip",
    kind: "cosmetic",
    price: 150,
    desc: "A polished yellow tip. Pheromones travel faster, allegedly.",
    icon: "💫",
    accent: "#f4d150",
  },
  {
    id: "carapace-sky-blue",
    name: "Sky-Blue Carapace",
    kind: "cosmetic",
    price: 160,
    desc: "Track-asphalt blue shell. Camouflage on the centerline.",
    icon: "🔵",
    accent: "#2d6bbf",
  },
  {
    id: "stripe-pink-aphid",
    name: "Pink Aphid Stripe",
    kind: "cosmetic",
    price: 110,
    desc: "A farmed-aphid pink racing stripe down the thorax.",
    icon: "🌸",
    accent: "#ff73bb",
  },
  {
    id: "glow-lime-pheromone",
    name: "Lime Pheromone Glow",
    kind: "cosmetic",
    price: 200,
    desc: "Lime underglow. Signals the colony you mean business.",
    icon: "✨",
    accent: "#e9ff80",
  },
  {
    id: "eyes-cyan-compound",
    name: "Cyan Compound Eyes",
    kind: "cosmetic",
    price: 140,
    desc: "Cyan-tinted compound eyes. 360° of kitchen vision.",
    icon: "👁️",
    accent: "#5dfdff",
  },

  // --- Powerups (stock items; effects in Wave 4) ---
  {
    id: "powerup-aphid-launcher",
    name: "Aphid Launcher x1",
    kind: "powerup",
    price: 60,
    desc: "Launch a homing aphid at the racer ahead. (Stock item — effects soon.)",
    icon: "🐜",
    accent: "#ff73bb",
  },
  {
    id: "powerup-pencil-dart",
    name: "Pencil Dart x1",
    kind: "powerup",
    price: 45,
    desc: "Fire a sharpened pencil dart straight forward.",
    icon: "✏️",
    accent: "#f4d150",
  },
  {
    id: "powerup-marble-drop",
    name: "Marble Drop x1",
    kind: "powerup",
    price: 40,
    desc: "Drop a rolling marble trap behind your kart.",
    icon: "🔵",
    accent: "#2d6bbf",
  },
  {
    id: "powerup-thumbtack-mine",
    name: "Thumbtack Mine x1",
    kind: "powerup",
    price: 50,
    desc: "Plant a thumbtack mine on the track. Point up.",
    icon: "📌",
    accent: "#c73128",
  },
  {
    id: "powerup-formic-acid-spray",
    name: "Formic Acid Spray x1",
    kind: "powerup",
    price: 55,
    desc: "Short-range cone that slows anyone tailgating you.",
    icon: "🟢",
    accent: "#e9ff80",
  },
  {
    id: "powerup-leaf-shield",
    name: "Leaf Shield x1",
    kind: "powerup",
    price: 70,
    desc: "A leafcutter shield that absorbs three hits.",
    icon: "🍃",
    accent: "#5dfdff",
  },
  {
    id: "powerup-sugar-cube-boost",
    name: "Sugar Cube Boost x1",
    kind: "powerup",
    price: 65,
    desc: "A pure-sugar turbo rush. Uses the existing boost pathway.",
    icon: "🧊",
    accent: "#ffbd3f",
  },
  {
    id: "powerup-pheromone-magnet",
    name: "Pheromone Magnet x1",
    kind: "powerup",
    price: 75,
    desc: "Pull toward the next racer or pickup ahead.",
    icon: "🧲",
    accent: "#5dfdff",
  },
];

/** Look up a catalog item by id. Returns `undefined` when not found. */
export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_CATALOG.find((item) => item.id === id);
}

/** All cosmetic items in the catalog. */
export function getCosmetics(): StoreItem[] {
  return STORE_CATALOG.filter((item) => item.kind === "cosmetic");
}

/** All powerup items in the catalog. */
export function getPowerups(): StoreItem[] {
  return STORE_CATALOG.filter((item) => item.kind === "powerup");
}
