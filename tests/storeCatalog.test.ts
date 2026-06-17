import { describe, expect, it } from "vitest";
import {
  STORE_CATALOG,
  getStoreItem,
  getCosmetics,
  getPowerups,
  type StoreItem,
} from "../src/game/economy/storeCatalog";

const VALID_KINDS = new Set(["cosmetic", "powerup"]);

describe("store catalog", () => {
  it("has between 12 and 16 items", () => {
    expect(STORE_CATALOG.length).toBeGreaterThanOrEqual(12);
    expect(STORE_CATALOG.length).toBeLessThanOrEqual(16);
  });

  it("has unique ids", () => {
    const ids = STORE_CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item has the required shape", () => {
    for (const item of STORE_CATALOG) {
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);
      expect(typeof item.name).toBe("string");
      expect(item.name.length).toBeGreaterThan(0);
      expect(VALID_KINDS.has(item.kind)).toBe(true);
      expect(typeof item.price).toBe("number");
      expect(Number.isInteger(item.price)).toBe(true);
      expect(item.price).toBeGreaterThan(0);
      expect(typeof item.desc).toBe("string");
      expect(item.desc.length).toBeGreaterThan(0);
      expect(typeof item.icon).toBe("string");
      expect(item.icon.length).toBeGreaterThan(0);
      expect(typeof item.accent).toBe("string");
      expect(item.accent.startsWith("#")).toBe(true);
      expect(item.accent.length).toBe(7);
    }
  });

  it("has both cosmetics and powerups", () => {
    const kinds = new Set(STORE_CATALOG.map((item) => item.kind));
    expect(kinds.has("cosmetic")).toBe(true);
    expect(kinds.has("powerup")).toBe(true);
  });

  it("getStoreItem looks up by id and returns undefined for unknown ids", () => {
    const first = STORE_CATALOG[0] as StoreItem;
    expect(getStoreItem(first.id)).toBe(first);
    expect(getStoreItem("does-not-exist")).toBeUndefined();
  });

  it("getCosmetics and getPowerups partition the catalog", () => {
    const cosmetics = getCosmetics();
    const powerups = getPowerups();
    expect(cosmetics.every((item) => item.kind === "cosmetic")).toBe(true);
    expect(powerups.every((item) => item.kind === "powerup")).toBe(true);
    expect(cosmetics.length + powerups.length).toBe(STORE_CATALOG.length);
  });

  it("accents use the track palette hex values", () => {
    // Sanity: at least the canonical track-palette accents appear.
    const accents = new Set(STORE_CATALOG.map((item) => item.accent));
    const palette = ["#e9ff80", "#c73128", "#f4d150", "#2d6bbf", "#ff73bb", "#5dfdff", "#ffbd3f"];
    for (const hex of palette) {
      expect(accents.has(hex)).toBe(true);
    }
  });
});
