// Persistent inventory for AntCarts — owned cosmetics + powerup stock.
//
// localStorage key: "antcarts:inventory" -> JSON shaped like `Inventory`.
// Pure TypeScript (SSR-safe localStorage guard) — mirrors the wallet module in
// `./currency`. Buying is atomic: coins are spent via `spendCoins` first; only
// on success is the inventory mutated and persisted. On failure the wallet and
// inventory are both left untouched.
//
// Powerup EFFECTS are Wave 4 — Wave 3 only sells and stocks powerups.

import {
  spendCoins,
  getWallet,
} from "./currency";
import { getStoreItem } from "./storeCatalog";

const INVENTORY_KEY = "antcarts:inventory";

export interface Inventory {
  /** Stable cosmetic ids the player owns permanently. */
  ownedCosmetics: string[];
  /** The currently-equipped cosmetic id, or null for the default. */
  equippedCosmetic: string | null;
  /** Powerup id -> stocked count (buyable pickups, consumed on use in Wave 4). */
  powerupStock: Record<string, number>;
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function getStorage(): StorageLike | undefined {
  try {
    const storage = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (typeof storage === "undefined" || storage === null) {
      return undefined;
    }
    return storage;
  } catch {
    return undefined;
  }
}

function defaultInventory(): Inventory {
  return { ownedCosmetics: [], equippedCosmetic: null, powerupStock: {} };
}

/** Read the inventory from localStorage. Returns defaults when unset/invalid. */
export function loadInventory(): Inventory {
  const storage = getStorage();
  if (!storage) {
    return defaultInventory();
  }
  try {
    const raw = storage.getItem(INVENTORY_KEY);
    if (!raw) {
      return defaultInventory();
    }
    const parsed = JSON.parse(raw) as Partial<Inventory>;
    const ownedCosmetics = Array.isArray(parsed.ownedCosmetics)
      ? parsed.ownedCosmetics.filter((id): id is string => typeof id === "string")
      : [];
    const equippedCosmetic =
      typeof parsed.equippedCosmetic === "string" ? parsed.equippedCosmetic : null;
    const powerupStock =
      parsed.powerupStock && typeof parsed.powerupStock === "object" && !Array.isArray(parsed.powerupStock)
        ? Object.fromEntries(
            Object.entries(parsed.powerupStock)
              .filter(([k, v]) => typeof k === "string" && typeof v === "number" && Number.isFinite(v) && v > 0)
              .map(([k, v]) => [k, Math.max(0, Math.floor(v as number))]),
          )
        : {};
    return { ownedCosmetics, equippedCosmetic, powerupStock };
  } catch {
    return defaultInventory();
  }
}

/** Persist the inventory to localStorage (no-op when storage is unavailable). */
export function saveInventory(inv: Inventory): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  } catch {
    // Quota exceeded or storage disabled — ignore.
  }
}

/** Persist a fresh default inventory (used by tests / reset flows). */
export function resetInventory(): Inventory {
  const inv = defaultInventory();
  saveInventory(inv);
  return inv;
}

/** Mark a cosmetic as owned (does NOT spend coins — use `buyItem` for that). */
export function ownCosmetic(id: string): Inventory {
  const inv = loadInventory();
  if (!inv.ownedCosmetics.includes(id)) {
    inv.ownedCosmetics.push(id);
  }
  saveInventory(inv);
  return inv;
}

/**
 * Equip a cosmetic by id. The id must be one the player owns (or null for the
 * default). Returns the updated inventory. If `id` is not owned, the call is a
 * no-op and the current inventory is returned unchanged.
 */
export function equipCosmetic(id: string | null): Inventory {
  const inv = loadInventory();
  if (id === null) {
    inv.equippedCosmetic = null;
  } else if (inv.ownedCosmetics.includes(id)) {
    inv.equippedCosmetic = id;
  }
  // Unknown id -> no-op (leave equipped as-is).
  saveInventory(inv);
  return inv;
}

/** Read the current powerup stock map. */
export function getPowerupStock(): Record<string, number> {
  return loadInventory().powerupStock;
}

/** Add `n` (default 1) of a powerup to stock and persist. */
export function addPowerup(id: string, n = 1): Inventory {
  const inv = loadInventory();
  const count = Math.max(0, Math.floor(n));
  if (count > 0) {
    inv.powerupStock[id] = (inv.powerupStock[id] ?? 0) + count;
    saveInventory(inv);
  }
  return inv;
}

/**
 * Consume one of a powerup from stock. Returns `true` and decrements on
 * success, or `false` when stock is empty / the id is unknown (no mutation).
 */
export function consumePowerup(id: string): boolean {
  const inv = loadInventory();
  const have = inv.powerupStock[id] ?? 0;
  if (have <= 0) {
    return false;
  }
  if (have <= 1) {
    delete inv.powerupStock[id];
  } else {
    inv.powerupStock[id] = have - 1;
  }
  saveInventory(inv);
  return true;
}

export interface BuyResult {
  ok: boolean;
  reason?: string;
}

/**
 * Atomically buy a store item:
 *  - Validates the item exists in the catalog.
 *  - For cosmetics: rejects if already owned; spends coins; adds to owned.
 *  - For powerups: spends coins; increments powerupStock[id].
 *  - On insufficient funds, neither wallet nor inventory is mutated.
 *
 * Returns `{ ok: true }` on success or `{ ok: false, reason }` on failure.
 */
export function buyItem(itemId: string): BuyResult {
  const item = getStoreItem(itemId);
  if (!item) {
    return { ok: false, reason: "Unknown item." };
  }
  if (item.kind === "cosmetic") {
    const inv = loadInventory();
    if (inv.ownedCosmetics.includes(itemId)) {
      return { ok: false, reason: "Already owned." };
    }
  }
  // Spend coins first (atomic) — on failure the wallet is untouched.
  if (!spendCoins(item.price)) {
    return { ok: false, reason: "Not enough Crumb Coins." };
  }
  // Coins spent — now update the inventory.
  if (item.kind === "cosmetic") {
    ownCosmetic(itemId);
  } else {
    addPowerup(itemId, 1);
  }
  return { ok: true };
}

/** Convenience: current Crumb Coin balance (read-through from the wallet). */
export function getCoins(): number {
  return getWallet().coins;
}

/** localStorage key used by the inventory (exported for tests/inspection). */
export const INVENTORY_STORAGE_KEY = INVENTORY_KEY;
