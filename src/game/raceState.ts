import type { RaceState } from "./types";

export function createRaceState(): RaceState {
  return {
    speed: 0,
    nextCheckpointIndex: 1,
    lap: 0,
  };
}

export function advanceCheckpoint(state: RaceState, checkpointCount: number): void {
  state.nextCheckpointIndex += 1;

  if (state.nextCheckpointIndex >= checkpointCount) {
    state.nextCheckpointIndex = 0;
    state.lap += 1;
  }
}
