export type StudioPresetName = "Morning Dew" | "High Noon" | "Sunset Field";

export type StudioSettings = {
  grassHeight: number;
  windStrength: number;
  windSpeed: number;
  skyTurbidity: number;
  sunElevation: number;
  sunAzimuth: number;
  exposure: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  filmIntensity: number;
  vignetteDarkness: number;
  vignetteOffset: number;
  afterimageDamp: number;
  cloudCoverage: number;
  cloudDensity: number;
  cloudSpeed: number;
  cloudScale: number;
};

type Range = {
  min: number;
  max: number;
};

export const STUDIO_RANGES: Record<keyof StudioSettings, Range> = {
  grassHeight: { min: 0.18, max: 1.4 },
  windStrength: { min: 0, max: 1 },
  windSpeed: { min: 0.05, max: 8 },
  skyTurbidity: { min: 1, max: 12 },
  sunElevation: { min: 0, max: 85 },
  sunAzimuth: { min: 0, max: 360 },
  exposure: { min: 0.35, max: 2 },
  bloomStrength: { min: 0, max: 1.8 },
  bloomRadius: { min: 0, max: 1 },
  bloomThreshold: { min: 0, max: 1 },
  filmIntensity: { min: 0, max: 1 },
  vignetteDarkness: { min: 0, max: 1.4 },
  vignetteOffset: { min: 0.5, max: 1.8 },
  afterimageDamp: { min: 0.78, max: 0.98 },
  cloudCoverage: { min: 0, max: 1 },
  cloudDensity: { min: 0, max: 1 },
  cloudSpeed: { min: 0, max: 2 },
  cloudScale: { min: 1.5, max: 9 },
};

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  grassHeight: 0.58,
  windStrength: 0.34,
  windSpeed: 1.5,
  skyTurbidity: 4.2,
  sunElevation: 38,
  sunAzimuth: 132,
  exposure: 1,
  bloomStrength: 0.28,
  bloomRadius: 0.42,
  bloomThreshold: 0.64,
  filmIntensity: 0.08,
  vignetteDarkness: 0.62,
  vignetteOffset: 1.16,
  afterimageDamp: 0.84,
  cloudCoverage: 0.46,
  cloudDensity: 0.54,
  cloudSpeed: 0.18,
  cloudScale: 4.2,
};

export const STUDIO_PRESETS: Record<StudioPresetName, StudioSettings> = {
  "Morning Dew": {
    grassHeight: 0.52,
    windStrength: 0.18,
    windSpeed: 0.75,
    skyTurbidity: 2.1,
    sunElevation: 18,
    sunAzimuth: 76,
    exposure: 0.92,
    bloomStrength: 0.22,
    bloomRadius: 0.38,
    bloomThreshold: 0.68,
    filmIntensity: 0.05,
    vignetteDarkness: 0.58,
    vignetteOffset: 1.08,
    afterimageDamp: 0.82,
    cloudCoverage: 0.52,
    cloudDensity: 0.48,
    cloudSpeed: 0.11,
    cloudScale: 4.8,
  },
  "High Noon": {
    grassHeight: 0.44,
    windStrength: 0.24,
    windSpeed: 1.1,
    skyTurbidity: 3.4,
    sunElevation: 72,
    sunAzimuth: 188,
    exposure: 1.12,
    bloomStrength: 0.18,
    bloomRadius: 0.24,
    bloomThreshold: 0.82,
    filmIntensity: 0.03,
    vignetteDarkness: 0.36,
    vignetteOffset: 1.24,
    afterimageDamp: 0.8,
    cloudCoverage: 0.34,
    cloudDensity: 0.42,
    cloudSpeed: 0.16,
    cloudScale: 5.6,
  },
  "Sunset Field": {
    grassHeight: 0.78,
    windStrength: 0.48,
    windSpeed: 1.9,
    skyTurbidity: 6.8,
    sunElevation: 8,
    sunAzimuth: 258,
    exposure: 0.74,
    bloomStrength: 0.44,
    bloomRadius: 0.56,
    bloomThreshold: 0.46,
    filmIntensity: 0.12,
    vignetteDarkness: 0.72,
    vignetteOffset: 1.02,
    afterimageDamp: 0.88,
    cloudCoverage: 0.58,
    cloudDensity: 0.62,
    cloudSpeed: 0.08,
    cloudScale: 4.4,
  },
};

export type UniformSnapshot = StudioSettings & {
  sunElevationRadians: number;
  sunAzimuthRadians: number;
};

export function clampStudioSettings(settings: Partial<StudioSettings>): StudioSettings {
  const next = { ...DEFAULT_STUDIO_SETTINGS, ...settings };

  return {
    grassHeight: clamp(next.grassHeight, STUDIO_RANGES.grassHeight),
    windStrength: clamp(next.windStrength, STUDIO_RANGES.windStrength),
    windSpeed: clamp(next.windSpeed, STUDIO_RANGES.windSpeed),
    skyTurbidity: clamp(next.skyTurbidity, STUDIO_RANGES.skyTurbidity),
    sunElevation: clamp(next.sunElevation, STUDIO_RANGES.sunElevation),
    sunAzimuth: clamp(next.sunAzimuth, STUDIO_RANGES.sunAzimuth),
    exposure: clamp(next.exposure, STUDIO_RANGES.exposure),
    bloomStrength: clamp(next.bloomStrength, STUDIO_RANGES.bloomStrength),
    bloomRadius: clamp(next.bloomRadius, STUDIO_RANGES.bloomRadius),
    bloomThreshold: clamp(next.bloomThreshold, STUDIO_RANGES.bloomThreshold),
    filmIntensity: clamp(next.filmIntensity, STUDIO_RANGES.filmIntensity),
    vignetteDarkness: clamp(next.vignetteDarkness, STUDIO_RANGES.vignetteDarkness),
    vignetteOffset: clamp(next.vignetteOffset, STUDIO_RANGES.vignetteOffset),
    afterimageDamp: clamp(next.afterimageDamp, STUDIO_RANGES.afterimageDamp),
    cloudCoverage: clamp(next.cloudCoverage, STUDIO_RANGES.cloudCoverage),
    cloudDensity: clamp(next.cloudDensity, STUDIO_RANGES.cloudDensity),
    cloudSpeed: clamp(next.cloudSpeed, STUDIO_RANGES.cloudSpeed),
    cloudScale: clamp(next.cloudScale, STUDIO_RANGES.cloudScale),
  };
}

export function applyPreset(name: StudioPresetName): StudioSettings {
  return { ...STUDIO_PRESETS[name] };
}

export function buildUniformSnapshot(settings: StudioSettings): UniformSnapshot {
  const clamped = clampStudioSettings(settings);

  return {
    ...clamped,
    sunElevationRadians: degreesToRadians(clamped.sunElevation),
    sunAzimuthRadians: degreesToRadians(clamped.sunAzimuth),
  };
}

function clamp(value: number, range: Range): number {
  return Math.min(range.max, Math.max(range.min, value));
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
