import { describe, expect, it } from "vitest";
import { getSpeedGaugeState } from "../src/game/speedGauge";

describe("speed gauge", () => {
  it("shows real speed instead of percent of normal max speed", () => {
    const highwaySpeed = getSpeedGaugeState(28);
    const boostSpeed = getSpeedGaugeState(42);

    expect(highwaySpeed.valueText).toBe("63");
    expect(highwaySpeed.unitText).toBe("MPH");
    expect(highwaySpeed.ratio).toBeCloseTo(2 / 3, 2);
    expect(boostSpeed.valueText).toBe("94");
    expect(boostSpeed.ratio).toBe(1);
  });
});
