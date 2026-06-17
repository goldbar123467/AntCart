export const SPEED_GAUGE_MAX_MPS = 42;
const MPS_TO_MPH = 2.2369362921;

export interface SpeedGaugeState {
  ratio: number;
  valueText: string;
  unitText: "MPH";
}

export function getSpeedGaugeState(speedMps: number, maxMps = SPEED_GAUGE_MAX_MPS): SpeedGaugeState {
  const speed = Math.abs(speedMps);

  return {
    ratio: clamp(speed / maxMps, 0, 1),
    valueText: Math.round(speed * MPS_TO_MPH).toString(),
    unitText: "MPH",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
