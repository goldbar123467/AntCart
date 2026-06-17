import { describe, expect, it } from "vitest";
import {
  POWERUPS,
  POWERUP_IDS,
  getPowerup,
  isPowerupId,
  type PowerupId,
  type PowerupKind,
} from "../src/game/powerups/powerupCatalog";

const EXPECTED_IDS: PowerupId[] = [
  "powerup-aphid-launcher",
  "powerup-pencil-dart",
  "powerup-marble-drop",
  "powerup-thumbtack-mine",
  "powerup-formic-acid-spray",
  "powerup-leaf-shield",
  "powerup-sugar-cube-boost",
  "powerup-pheromone-magnet",
];

const VALID_KINDS: PowerupKind[] = ["offense", "defense", "utility"];

describe("powerupCatalog — ids", () => {
  it("defines all eight expected powerup ids", () => {
    expect(POWERUP_IDS).toHaveLength(8);
    for (const id of EXPECTED_IDS) {
      expect(POWERUP_IDS).toContain(id);
    }
  });

  it("has a definition for every expected id", () => {
    for (const id of EXPECTED_IDS) {
      expect(POWERUPS[id]).toBeDefined();
      expect(POWERUPS[id].id).toBe(id);
    }
  });

  it("getPowerup returns the def for known ids and undefined otherwise", () => {
    expect(getPowerup("powerup-leaf-shield")?.name).toBe("Leaf Shield");
    expect(getPowerup("nope")).toBeUndefined();
  });

  it("isPowerupId narrows correctly", () => {
    expect(isPowerupId("powerup-aphid-launcher")).toBe(true);
    expect(isPowerupId("powerup-dust-bunny")).toBe(false);
  });
});

describe("powerupCatalog — shape", () => {
  it("every def has a valid kind", () => {
    for (const id of POWERUP_IDS) {
      expect(VALID_KINDS).toContain(POWERUPS[id].kind);
    }
  });

  it("every def has a non-empty name, icon, accent, and desc", () => {
    for (const id of POWERUP_IDS) {
      const def = POWERUPS[id];
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.icon.length).toBeGreaterThan(0);
      expect(def.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(def.desc.length).toBeGreaterThan(0);
    }
  });

  it("timed effects have sensible positive durations; instant effects omit duration", () => {
    const timed: PowerupId[] = [
      "powerup-sugar-cube-boost",
      "powerup-leaf-shield",
      "powerup-pheromone-magnet",
      "powerup-formic-acid-spray",
    ];
    const instant: PowerupId[] = [
      "powerup-aphid-launcher",
      "powerup-pencil-dart",
      "powerup-marble-drop",
      "powerup-thumbtack-mine",
    ];
    for (const id of timed) {
      const ms = POWERUPS[id].durationMs;
      expect(typeof ms).toBe("number");
      expect(ms!).toBeGreaterThan(0);
      expect(ms!).toBeLessThan(60_000); // sensible arcade duration
    }
    for (const id of instant) {
      expect(POWERUPS[id].durationMs).toBeUndefined();
    }
  });
});
