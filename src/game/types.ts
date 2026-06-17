export type Rng = () => number;

export type PropKind = "crumb" | "toyBlock";

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface VehicleConfig {
  maxSpeed: number;
  reverseSpeed: number;
  acceleration: number;
  brake: number;
  friction: number;
  turnRate: number;
}

export interface RaceState {
  speed: number;
  nextCheckpointIndex: number;
  lap: number;
}
