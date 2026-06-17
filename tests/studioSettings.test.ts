import { describe, expect, it } from "vitest";
import {
  DEFAULT_STUDIO_SETTINGS,
  applyPreset,
  buildUniformSnapshot,
  clampStudioSettings,
  STUDIO_PRESETS,
} from "../src/studio/settings";

describe("studio settings", () => {
  it("clamps user-edited values into shader-safe ranges", () => {
    const settings = clampStudioSettings({
      grassHeight: 5,
      windStrength: -2,
      windSpeed: 20,
      skyTurbidity: 0,
      sunElevation: 120,
      sunAzimuth: -45,
      exposure: 5,
      bloomStrength: 5,
      bloomRadius: -1,
      bloomThreshold: 4,
      filmIntensity: 2,
      vignetteDarkness: 4,
      vignetteOffset: 0,
      afterimageDamp: 5,
      cloudCoverage: 5,
      cloudDensity: -2,
      cloudSpeed: 10,
      cloudScale: 50,
    });

    expect(settings).toEqual({
      grassHeight: 1.4,
      windStrength: 0,
      windSpeed: 8,
      skyTurbidity: 1,
      sunElevation: 85,
      sunAzimuth: 0,
      exposure: 2,
      bloomStrength: 1.8,
      bloomRadius: 0,
      bloomThreshold: 1,
      filmIntensity: 1,
      vignetteDarkness: 1.4,
      vignetteOffset: 0.5,
      afterimageDamp: 0.98,
      cloudCoverage: 1,
      cloudDensity: 0,
      cloudSpeed: 2,
      cloudScale: 9,
    });
  });

  it("builds a serializable uniform snapshot for shader updates", () => {
    const snapshot = buildUniformSnapshot({
      ...DEFAULT_STUDIO_SETTINGS,
      grassHeight: 0.72,
      windStrength: 0.38,
      bloomStrength: 0.64,
      vignetteDarkness: 0.52,
      cloudCoverage: 0.58,
      cloudDensity: 0.76,
      sunElevation: 24,
      sunAzimuth: 164,
    });

    expect(snapshot).toMatchObject({
      grassHeight: 0.72,
      windStrength: 0.38,
      bloomStrength: 0.64,
      vignetteDarkness: 0.52,
      cloudCoverage: 0.58,
      cloudDensity: 0.76,
      sunElevationRadians: expect.closeTo(0.418879, 5),
      sunAzimuthRadians: expect.closeTo(2.86234, 5),
    });
  });

  it("applies named presets without mutating defaults", () => {
    const originalDefault = { ...DEFAULT_STUDIO_SETTINGS };
    const sunset = applyPreset("Sunset Field");

    expect(sunset).toEqual(STUDIO_PRESETS["Sunset Field"]);
    expect(DEFAULT_STUDIO_SETTINGS).toEqual(originalDefault);
  });
});
