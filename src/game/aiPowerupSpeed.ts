export interface AiPowerupSpeedState {
  baseSpeed: number;
  speed: number;
}

export function applyAiPowerupSpeedMultiplier<T extends AiPowerupSpeedState>(
  racers: T[],
  multiplier: number,
): void {
  const safeMultiplier = Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;

  for (const racer of racers) {
    racer.speed = racer.baseSpeed * safeMultiplier;
  }
}
