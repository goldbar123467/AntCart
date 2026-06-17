import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  loadWallet,
  saveWallet,
  addCoins,
  spendCoins,
  getWallet,
  WALLET_STORAGE_KEY,
} from "../src/game/economy/currency";

/**
 * Minimal in-memory localStorage stub (Map-backed). Node 20 does not expose a
 * global localStorage by default, so we install one for the duration of each
 * test and restore afterward.
 */
function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = makeStorage();
});

afterEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage;
});

describe("currency wallet", () => {
  it("loads an empty wallet by default", () => {
    expect(loadWallet()).toEqual({ coins: 0 });
    expect(getWallet()).toEqual({ coins: 0 });
  });

  it("saves and loads a wallet round-trip", () => {
    saveWallet({ coins: 250 });
    expect(loadWallet()).toEqual({ coins: 250 });
  });

  it("persists through the antcarts:wallet localStorage key", () => {
    saveWallet({ coins: 42 });
    const raw = (globalThis as { localStorage: Storage }).localStorage.getItem(WALLET_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ coins: 42 });
  });

  it("addCoins accumulates and persists", () => {
    expect(addCoins(100)).toBe(100);
    expect(addCoins(25)).toBe(125);
    expect(loadWallet()).toEqual({ coins: 125 });
  });

  it("addCoins floors fractional and rejects non-finite input safely", () => {
    addCoins(10);
    addCoins(0.9);
    expect(loadWallet().coins).toBe(11);
    addCoins(Number.POSITIVE_INFINITY);
    expect(loadWallet().coins).toBe(11);
  });

  it("spendCoins debits on success and returns true", () => {
    addCoins(200);
    expect(spendCoins(80)).toBe(true);
    expect(loadWallet()).toEqual({ coins: 120 });
    expect(spendCoins(120)).toBe(true);
    expect(loadWallet()).toEqual({ coins: 0 });
  });

  it("spendCoins returns false on insufficient funds and leaves the wallet untouched", () => {
    addCoins(50);
    expect(spendCoins(80)).toBe(false);
    expect(loadWallet()).toEqual({ coins: 50 });
  });

  it("spendCoins rejects negative amounts without debiting", () => {
    addCoins(30);
    expect(spendCoins(-10)).toBe(false);
    expect(loadWallet()).toEqual({ coins: 30 });
  });

  it("treats corrupt stored data as an empty wallet", () => {
    (globalThis as { localStorage: Storage }).localStorage.setItem(WALLET_STORAGE_KEY, "not-json");
    expect(loadWallet()).toEqual({ coins: 0 });
  });

  it("clamps negative stored coins to zero on load", () => {
    (globalThis as { localStorage: Storage }).localStorage.setItem(
      WALLET_STORAGE_KEY,
      JSON.stringify({ coins: -40 }),
    );
    expect(loadWallet()).toEqual({ coins: 0 });
  });
});
