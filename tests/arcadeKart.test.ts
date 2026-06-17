import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARCADE_KART_CONFIG,
  createArcadeKartState,
  stepArcadeKart,
} from "../src/game/arcadeKart";

describe("arcade kart controller", () => {
  it("keeps enough yaw authority for tight arcade turns at racing speed", () => {
    let state = createArcadeKartState({
      speed: 24,
      heading: 0,
    });

    for (let i = 0; i < 60; i += 1) {
      state = stepArcadeKart(
        state,
        {
          controls: { forward: true, backward: false, left: true, right: false },
          speedLimit: 28,
          boostTimer: 0,
          finished: false,
          deltaSeconds: 1 / 60,
        },
        DEFAULT_ARCADE_KART_CONFIG,
      );
    }

    expect(state.heading).toBeGreaterThan(1.1);
    expect(state.speed).toBeLessThanOrEqual(DEFAULT_ARCADE_KART_CONFIG.maxSpeed);
  });

  it("can pivot from low speed instead of waiting for high speed", () => {
    let state = createArcadeKartState({
      speed: 3,
      heading: 0,
    });

    for (let i = 0; i < 60; i += 1) {
      state = stepArcadeKart(
        state,
        {
          controls: { forward: true, backward: false, left: false, right: true },
          speedLimit: 28,
          boostTimer: 0,
          finished: false,
          deltaSeconds: 1 / 60,
        },
        DEFAULT_ARCADE_KART_CONFIG,
      );
    }

    expect(state.heading).toBeLessThan(-0.75);
  });
});
