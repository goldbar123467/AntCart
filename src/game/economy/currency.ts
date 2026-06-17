// Crumb Coin wallet — localStorage-backed, SSR-safe.
//
// Pure TypeScript: the only DOM-ish dependency is `localStorage`, accessed via
// `globalThis` with a typeof guard so the module is unit-testable in a plain
// Node environment (and safe under SSR/prerender). No Three.js, no DOM tree.
//
// Persistence key: "antcarts:wallet" -> JSON `{ coins: number }`.

const WALLET_KEY = "antcarts:wallet";

export interface Wallet {
  coins: number;
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
    // Some privacy modes throw on localStorage access.
    return undefined;
  }
}

function clampCoins(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.round(n));
}

/** Read the wallet from localStorage. Returns `{ coins: 0 }` when unset/invalid. */
export function loadWallet(): Wallet {
  const storage = getStorage();
  if (!storage) {
    return { coins: 0 };
  }
  try {
    const raw = storage.getItem(WALLET_KEY);
    if (!raw) {
      return { coins: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<Wallet>;
    return { coins: clampCoins(parsed.coins ?? 0) };
  } catch {
    return { coins: 0 };
  }
}

/** Persist the wallet to localStorage (no-op when storage is unavailable). */
export function saveWallet(wallet: Wallet): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const coins = clampCoins(wallet.coins);
  try {
    storage.setItem(WALLET_KEY, JSON.stringify({ coins }));
  } catch {
    // Quota exceeded or storage disabled — ignore.
  }
}

/** Current wallet (read-through from localStorage each call). */
export function getWallet(): Wallet {
  return loadWallet();
}

/** Add `n` crumbs to the wallet, persist, and return the new balance. */
export function addCoins(n: number): number {
  if (!Number.isFinite(n)) {
    // Reject non-finite input safely — leave the wallet untouched.
    return loadWallet().coins;
  }
  const wallet = loadWallet();
  wallet.coins = clampCoins(wallet.coins + n);
  saveWallet(wallet);
  return wallet.coins;
}

/**
 * Spend `n` crumbs. Returns `true` and debits on success, or `false` when the
 * wallet has insufficient funds (wallet left untouched on failure).
 */
export function spendCoins(n: number): boolean {
  if (!Number.isFinite(n) || n < 0) {
    return false;
  }
  const wallet = loadWallet();
  if (wallet.coins < n) {
    return false;
  }
  wallet.coins = clampCoins(wallet.coins - n);
  saveWallet(wallet);
  return true;
}

/** localStorage key used by the wallet (exported for tests/inspection). */
export const WALLET_STORAGE_KEY = WALLET_KEY;
