import { describe, expect, it } from "vitest";
import { applyAiPowerupSpeedMultiplier } from "../src/game/aiPowerupSpeed";

describe("AI powerup speed scaling", () => {
  it("uses base speed so freeze/slow effects do not permanently compound", () => {
    const racers = [
      { baseSpeed: 22, speed: 22 },
      { baseSpeed: 24, speed: 24 },
    ];

    applyAiPowerupSpeedMultiplier(racers, 0.7);
    expect(racers[0].speed).toBeCloseTo(15.4);
    expect(racers[1].speed).toBeCloseTo(16.8);

    applyAiPowerupSpeedMultiplier(racers, 0.7);
    expect(racers[0].speed).toBeCloseTo(15.4);
    expect(racers[1].speed).toBeCloseTo(16.8);

    applyAiPowerupSpeedMultiplier(racers, 1);
    expect(racers[0].speed).toBe(22);
    expect(racers[1].speed).toBe(24);
  });
});
