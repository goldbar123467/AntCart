import * as THREE from "three";
import { randomRange } from "./random";
import type { Rng } from "./types";

export interface TrackGenerationConfig {
  radiusXMin: number;
  radiusXMax: number;
  radiusZMin: number;
  radiusZMax: number;
  pointCount: number;
  wobbleX: number;
  wobbleZ: number;
}

export const DEFAULT_TRACK_CONFIG: TrackGenerationConfig = {
  radiusXMin: 25,
  radiusXMax: 36,
  radiusZMin: 18,
  radiusZMax: 28,
  pointCount: 18,
  wobbleX: 7,
  wobbleZ: 6,
};

export function generateTrackPoints(
  config: TrackGenerationConfig,
  rand: Rng,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const radiusX = randomRange(rand, config.radiusXMin, config.radiusXMax);
  const radiusZ = randomRange(rand, config.radiusZMin, config.radiusZMax);

  for (let i = 0; i < config.pointCount; i += 1) {
    const angle = (i / config.pointCount) * Math.PI * 2;
    const x = Math.cos(angle) * radiusX + randomRange(rand, -config.wobbleX, config.wobbleX);
    const z = Math.sin(angle) * radiusZ + randomRange(rand, -config.wobbleZ, config.wobbleZ);

    points.push(new THREE.Vector3(x, 0.05, z));
  }

  return points;
}
