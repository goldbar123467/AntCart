import { describe, expect, it } from "vitest";
import { advanceCheckpoint, createRaceState } from "../src/game/raceState";

describe("race state", () => {
  it("advances checkpoints and starts a new lap after the final checkpoint", () => {
    const state = createRaceState();

    expect(state).toEqual({ speed: 0, nextCheckpointIndex: 1, lap: 0 });

    advanceCheckpoint(state, 4);
    expect(state).toEqual({ speed: 0, nextCheckpointIndex: 2, lap: 0 });

    advanceCheckpoint(state, 4);
    advanceCheckpoint(state, 4);

    expect(state).toEqual({ speed: 0, nextCheckpointIndex: 0, lap: 1 });
  });
});
