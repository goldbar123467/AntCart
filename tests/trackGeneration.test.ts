import { describe, expect, it } from "vitest";
import { mulberry32 } from "../src/game/random";
import { generateTrackPoints, type TrackGenerationConfig } from "../src/game/track";

const config: TrackGenerationConfig = {
  radiusXMin: 25,
  radiusXMax: 36,
  radiusZMin: 18,
  radiusZMax: 28,
  pointCount: 18,
  wobbleX: 7,
  wobbleZ: 6,
};

describe("track generation", () => {
  it("generates deterministic closed-loop control points from a seed", () => {
    const first = generateTrackPoints(config, mulberry32(1234));
    const second = generateTrackPoints(config, mulberry32(1234));

    expect(first).toHaveLength(config.pointCount);
    expect(second.map((point) => point.toArray())).toEqual(first.map((point) => point.toArray()));
    expect(first.every((point) => point.y === 0.05)).toBe(true);
    expect(first[0].distanceTo(first.at(-1)!)).toBeGreaterThan(4);
  });
});
