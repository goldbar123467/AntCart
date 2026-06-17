import type { InputState } from "./types";

export interface ArcadeKartConfig {
  maxSpeed: number;
  boostSpeed: number;
  reverseSpeed: number;
  acceleration: number;
  brake: number;
  friction: number;
  turnRate: number;
  steeringResponse: number;
  lowSpeedTurnFactor: number;
  highSpeedSteerFactor: number;
  driftTurnBonus: number;
  driftBuildSpeed: number;
  driftReleaseSpeed: number;
}

export interface ArcadeKartState {
  speed: number;
  heading: number;
  steer: number;
  drift: number;
}

export interface ArcadeKartStep {
  controls: InputState;
  speedLimit: number;
  boostTimer: number;
  finished: boolean;
  deltaSeconds: number;
}

export const DEFAULT_ARCADE_KART_CONFIG: ArcadeKartConfig = {
  maxSpeed: 28,
  boostSpeed: 42,
  reverseSpeed: -8,
  acceleration: 13.5,
  brake: 22,
  friction: 5.8,
  turnRate: 1.72,
  steeringResponse: 14,
  lowSpeedTurnFactor: 0.55,
  highSpeedSteerFactor: 0.82,
  driftTurnBonus: 0.18,
  driftBuildSpeed: 7,
  driftReleaseSpeed: 10,
};

export function createArcadeKartState(partial: Partial<ArcadeKartState> = {}): ArcadeKartState {
  return {
    speed: 0,
    heading: 0,
    steer: 0,
    drift: 0,
    ...partial,
  };
}

export function stepArcadeKart(
  state: ArcadeKartState,
  step: ArcadeKartStep,
  config: ArcadeKartConfig = DEFAULT_ARCADE_KART_CONFIG,
): ArcadeKartState {
  const dt = step.deltaSeconds;
  let speed = state.speed;

  if (step.finished) {
    speed = moveToward(speed, 0, config.friction * dt);
  } else if (step.controls.forward) {
    speed += config.acceleration * dt;
  } else if (step.controls.backward) {
    if (speed > 0.8) {
      speed -= config.brake * dt;
    } else {
      speed -= config.acceleration * 0.75 * dt;
    }
  } else {
    speed = moveToward(speed, 0, config.friction * dt);
  }

  const speedCap = step.boostTimer > 0 ? config.boostSpeed : config.maxSpeed;

  if (step.boostTimer > 0 && speed > 0) {
    speed = Math.max(speed, 35);
  } else if (speed > step.speedLimit) {
    speed = Math.max(step.speedLimit, speed - config.friction * 1.45 * dt);
  }

  speed = clamp(speed, config.reverseSpeed, speedCap);

  const steerInput = (step.controls.left ? 1 : 0) + (step.controls.right ? -1 : 0);
  const steer = lerp(state.steer, steerInput, 1 - Math.exp(-config.steeringResponse * dt));
  const speedRatio = clamp(Math.abs(speed) / speedCap, 0, 1);
  const speedTurnFactor = lerp(config.lowSpeedTurnFactor, 1, clamp(Math.abs(speed) / 10, 0, 1));
  const highSpeedTurnFactor = lerp(1, config.highSpeedSteerFactor, speedRatio);
  const targetDrift = Math.abs(steer) > 0.55 && speedRatio > 0.42 ? steer : 0;
  const driftRate = targetDrift === 0 ? config.driftReleaseSpeed : config.driftBuildSpeed;
  const drift = lerp(state.drift, targetDrift, 1 - Math.exp(-driftRate * dt));
  const speedDirection = Math.sign(speed || 1);
  const yawRate = steer
    * config.turnRate
    * speedTurnFactor
    * highSpeedTurnFactor
    * (1 + Math.abs(drift) * config.driftTurnBonus);
  const heading = state.heading + yawRate * speedDirection * dt;

  return {
    speed,
    heading,
    steer,
    drift,
  };
}

function moveToward(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maxDelta;
}

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
