import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  loadInventory,
  saveInventory,
  ownCosmetic,
  equipCosmetic,
  buyItem,
  getPowerupStock,
  addPowerup,
  consumePowerup,
  resetInventory,
  INVENTORY_STORAGE_KEY,
} from "../src/game/economy/inventory";
import { addCoins, getWallet, WALLET_STORAGE_KEY } from "../src/game/economy/currency";
import { STORE_CATALOG, getCosmetics, getPowerups } from "../src/game/economy/storeCatalog";

/** Map-backed localStorage stub (matches tests/currency.test.ts). */
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

describe("inventory", () => {
  it("loads an empty inventory by default", () => {
    const inv = loadInventory();
    expect(inv.ownedCosmetics).toEqual([]);
    expect(inv.equippedCosmetic).toBeNull();
    expect(inv.powerupStock).toEqual({});
  });

  it("saves and loads an inventory round-trip", () => {
    saveInventory({
      ownedCosmetics: ["livery-honeydew"],
      equippedCosmetic: "livery-honeydew",
      powerupStock: { "powerup-aphid-launcher": 3 },
    });
    expect(loadInventory()).toEqual({
      ownedCosmetics: ["livery-honeydew"],
      equippedCosmetic: "livery-honeydew",
      powerupStock: { "powerup-aphid-launcher": 3 },
    });
  });

  it("persists through the antcarts:inventory localStorage key", () => {
    saveInventory({ ownedCosmetics: ["x"], equippedCosmetic: null, powerupStock: {} });
    const raw = (globalThis as { localStorage: Storage }).localStorage.getItem(INVENTORY_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).ownedCosmetics).toEqual(["x"]);
  });

  it("treats corrupt stored data as an empty inventory", () => {
    (globalThis as { localStorage: Storage }).localStorage.setItem(INVENTORY_STORAGE_KEY, "not-json");
    expect(loadInventory()).toEqual({
      ownedCosmetics: [],
      equippedCosmetic: null,
      powerupStock: {},
    });
  });

  it("filters out non-string ids and non-number counts from corrupt data", () => {
    (globalThis as { localStorage: Storage }).localStorage.setItem(
      INVENTORY_STORAGE_KEY,
      JSON.stringify({
        ownedCosmetics: ["ok", 42, null, "good"],
        equippedCosmetic: 99,
        powerupStock: { "powerup-a": 2, "powerup-b": "bad", "powerup-c": -1, "powerup-d": 1.9 },
      }),
    );
    const inv = loadInventory();
    expect(inv.ownedCosmetics).toEqual(["ok", "good"]);
    expect(inv.equippedCosmetic).toBeNull();
    expect(inv.powerupStock).toEqual({ "powerup-a": 2, "powerup-d": 1 });
  });
});

describe("buyItem — cosmetic", () => {
  it("deducts coins and adds to owned on a successful buy", () => {
    addCoins(500);
    const cosmetic = getCosmetics()[0];
    const result = buyItem(cosmetic.id);
    expect(result.ok).toBe(true);
    expect(getWallet().coins).toBe(500 - cosmetic.price);
    expect(loadInventory().ownedCosmetics).toContain(cosmetic.id);
  });

  it("rejects buying an already-owned cosmetic without spending coins", () => {
    addCoins(1000);
    const cosmetic = getCosmetics()[0];
    expect(buyItem(cosmetic.id).ok).toBe(true);
    const balanceAfterFirstBuy = getWallet().coins;
    const result = buyItem(cosmetic.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/own/i);
    expect(getWallet().coins).toBe(balanceAfterFirstBuy);
  });
});

describe("buyItem — powerup", () => {
  it("deducts coins and increments stock on a successful buy", () => {
    addCoins(500);
    const powerup = getPowerups()[0];
    const result = buyItem(powerup.id);
    expect(result.ok).toBe(true);
    expect(getWallet().coins).toBe(500 - powerup.price);
    expect(getPowerupStock()[powerup.id]).toBe(1);
    // Buying again stacks.
    addCoins(powerup.price);
    buyItem(powerup.id);
    expect(getPowerupStock()[powerup.id]).toBe(2);
  });
});

describe("buyItem — insufficient funds", () => {
  it("fails without mutating wallet or inventory", () => {
    addCoins(10); // far below any item price
    const item = STORE_CATALOG.find((i) => i.price > 10)!;
    const walletBefore = getWallet().coins;
    const invBefore = loadInventory();
    const result = buyItem(item.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/coin/i);
    expect(getWallet().coins).toBe(walletBefore);
    expect(loadInventory()).toEqual(invBefore);
  });
});

describe("buyItem — unknown item", () => {
  it("fails with a reason and no mutation", () => {
    addCoins(1000);
    const result = buyItem("no-such-item");
    expect(result.ok).toBe(false);
    expect(result.reason).toBeDefined();
    expect(getWallet().coins).toBe(1000);
  });
});

describe("equipCosmetic", () => {
  it("equips an owned cosmetic", () => {
    addCoins(1000);
    const cosmetic = getCosmetics()[0];
    buyItem(cosmetic.id);
    equipCosmetic(cosmetic.id);
    expect(loadInventory().equippedCosmetic).toBe(cosmetic.id);
  });

  it("does not equip a cosmetic that is not owned", () => {
    const cosmetic = getCosmetics()[0];
    equipCosmetic(cosmetic.id);
    expect(loadInventory().equippedCosmetic).toBeNull();
  });

  it("unequips when passed null", () => {
    addCoins(1000);
    const cosmetic = getCosmetics()[0];
    buyItem(cosmetic.id);
    equipCosmetic(cosmetic.id);
    equipCosmetic(null);
    expect(loadInventory().equippedCosmetic).toBeNull();
  });
});

describe("powerup stock helpers", () => {
  it("addPowerup increments and persists", () => {
    addPowerup("powerup-aphid-launcher", 2);
    expect(getPowerupStock()["powerup-aphid-launcher"]).toBe(2);
    addPowerup("powerup-aphid-launcher", 1);
    expect(getPowerupStock()["powerup-aphid-launcher"]).toBe(3);
  });

  it("consumePowerup decrements and returns false at zero", () => {
    addPowerup("powerup-pencil-dart", 2);
    expect(consumePowerup("powerup-pencil-dart")).toBe(true);
    expect(getPowerupStock()["powerup-pencil-dart"]).toBe(1);
    expect(consumePowerup("powerup-pencil-dart")).toBe(true);
    // Stock entry removed once depleted.
    expect(getPowerupStock()["powerup-pencil-dart"]).toBeUndefined();
    expect(consumePowerup("powerup-pencil-dart")).toBe(false);
    expect(consumePowerup("never-had")).toBe(false);
  });

  it("consumePowerup does not go negative", () => {
    addPowerup("powerup-marble-drop", 1);
    expect(consumePowerup("powerup-marble-drop")).toBe(true);
    expect(consumePowerup("powerup-marble-drop")).toBe(false);
    expect(getPowerupStock()["powerup-marble-drop"]).toBeUndefined();
  });
});

describe("resetInventory", () => {
  it("clears the inventory to defaults and persists", () => {
    addCoins(1000);
    buyItem(getPowerups()[0].id);
    expect(Object.keys(getPowerupStock()).length).toBeGreaterThan(0);
    resetInventory();
    expect(loadInventory()).toEqual({
      ownedCosmetics: [],
      equippedCosmetic: null,
      powerupStock: {},
    });
  });
});

describe("wallet + inventory isolation", () => {
  it("wallet key and inventory key differ", () => {
    expect(INVENTORY_STORAGE_KEY).not.toBe(WALLET_STORAGE_KEY);
  });
});
