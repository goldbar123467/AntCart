import { describe, expect, it } from "vitest";
import { TRACK_RAIL_CONFIG } from "../src/game/trackVisualConfig";

describe("track visual config", () => {
  it("uses low curbs instead of camera-blocking side walls", () => {
    expect(TRACK_RAIL_CONFIG.height).toBeLessThanOrEqual(0.42);
    expect(TRACK_RAIL_CONFIG.centerY + TRACK_RAIL_CONFIG.height * 0.5).toBeLessThanOrEqual(0.55);
    expect(TRACK_RAIL_CONFIG.centerY + TRACK_RAIL_CONFIG.tubeRadius).toBeLessThanOrEqual(0.55);
  });
});
