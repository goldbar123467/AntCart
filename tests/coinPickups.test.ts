import { describe, expect, it } from "vitest";
import {
  createCoinPlacements,
  createCoinStates,
  resetCoinStates,
  countCollected,
  MAX_COINS_PER_RACE,
} from "../src/game/coinPickups";

describe("coinPickups", () => {
  it("defaults to 15 coins per race", () => {
    expect(MAX_COINS_PER_RACE).toBe(15);
    const placements = createCoinPlacements();
    expect(placements).toHaveLength(15);
  });

  it("respects a custom count", () => {
    const placements = createCoinPlacements(8);
    expect(placements).toHaveLength(8);
  });

  it("spreads progress values across [0, 1) without duplicates", () => {
    const placements = createCoinPlacements(15);
    const progresses = placements.map((p) => p.progress);
    for (const p of progresses) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
    expect(new Set(progresses).size).toBe(15);
  });

  it("alternates lateral offset sides", () => {
    const placements = createCoinPlacements(6);
    const sides = placements.map((p) => Math.sign(p.lateralOffset));
    expect(sides[0]).toBe(1);
    expect(sides[1]).toBe(-1);
    expect(sides[2]).toBe(1);
    expect(sides[3]).toBe(-1);
  });

  it("starts all coins uncollected", () => {
    const states = createCoinStates(createCoinPlacements(5));
    expect(states.every((s) => !s.collected)).toBe(true);
    expect(countCollected(states)).toBe(0);
  });

  it("tracks collection count", () => {
    const states = createCoinStates(createCoinPlacements(5));
    states[0].collected = true;
    states[3].collected = true;
    expect(countCollected(states)).toBe(2);
  });

  it("resetCoinStates clears all collected flags", () => {
    const states = createCoinStates(createCoinPlacements(5));
    states[0].collected = true;
    states[2].collected = true;
    resetCoinStates(states);
    expect(countCollected(states)).toBe(0);
    expect(states.every((s) => !s.collected)).toBe(true);
  });
});
