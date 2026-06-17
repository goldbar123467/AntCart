import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createPowerupRunner,
  MAGNET_RATE_PER_SECOND,
  type PowerupContext,
} from "../src/game/powerups/powerupRunner";
import { addPowerup, getPowerupStock, resetInventory } from "../src/game/economy/inventory";
import type { PowerupId } from "../src/game/powerups/powerupCatalog";

/** Map-backed localStorage stub (matches tests/currency.test.ts). */
function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = makeStorage();
});

afterEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage;
});

/** Build a PowerupContext that records boost calls. */
function makeCtx(overrides: Partial<PowerupContext> = {}): PowerupContext {
  const boostCalls: number[] = [];
  return {
    playerSpeed: 20,
    playerMaxSpeed: 30,
    aiRacers: [{ speed: 22 }, { speed: 23 }, { speed: 24 }],
    score: 100,
    applyPlayerBoost: (m: number) => {
      boostCalls.push(m);
    },
    ...overrides,
  };
}

const BOOST = "powerup-sugar-cube-boost" as PowerupId;
const SHIELD = "powerup-leaf-shield" as PowerupId;
const MAGNET = "powerup-pheromone-magnet" as PowerupId;
const ACID = "powerup-formic-acid-spray" as PowerupId;
const APHID = "powerup-aphid-launcher" as PowerupId;
const PENCIL = "powerup-pencil-dart" as PowerupId;
const MARBLE = "powerup-marble-drop" as PowerupId;
const TACK = "powerup-thumbtack-mine" as PowerupId;

describe("powerupRunner — activate consumes inventory", () => {
  it("rejects activation when stock is empty", () => {
    const runner = createPowerupRunner();
    const ctx = makeCtx();
    const result = runner.activate(BOOST, 1000, ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/stock/i);
  });

  it("consumes one stock on a successful timed activation", () => {
    addPowerup(BOOST, 2);
    expect(getPowerupStock()[BOOST]).toBe(2);
    const runner = createPowerupRunner();
    const result = runner.activate(BOOST, 1000, makeCtx());
    expect(result.ok).toBe(true);
    expect(getPowerupStock()[BOOST]).toBe(1);
  });

  it("consumes one stock on a successful instant activation", () => {
    addPowerup(APHID, 1);
    const runner = createPowerupRunner();
    const result = runner.activate(APHID, 1000, makeCtx());
    expect(result.ok).toBe(true);
    expect(getPowerupStock()[APHID]).toBeUndefined();
  });
});

describe("powerupRunner — sugar-cube-boost", () => {
  it("sets playerSpeedMultiplier > 1 for its duration then expires", () => {
    addPowerup(BOOST, 1);
    const runner = createPowerupRunner();
    const ctx = makeCtx();
    expect(runner.activate(BOOST, 1000, ctx).ok).toBe(true);

    // Mid-duration: boost multiplier active.
    const mid = runner.update(1000 + 1200, ctx);
    expect(mid.playerSpeedMultiplier).toBeGreaterThan(1);
    expect(mid.shieldActive).toBe(false);

    // Just before expiry: still active.
    const almost = runner.update(1000 + 2499, ctx);
    expect(almost.playerSpeedMultiplier).toBeGreaterThan(1);

    // After expiry: neutral.
    const after = runner.update(1000 + 2600, ctx);
    expect(after.playerSpeedMultiplier).toBe(1);
  });

  it("fires applyPlayerBoost immediately on activate", () => {
    addPowerup(BOOST, 1);
    const calls: number[] = [];
    const runner = createPowerupRunner();
    const ctx = makeCtx({
      applyPlayerBoost: (m) => calls.push(m),
    });
    runner.activate(BOOST, 1000, ctx);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeGreaterThan(1);
  });
});

describe("powerupRunner — leaf-shield", () => {
  it("is active then expires", () => {
    addPowerup(SHIELD, 1);
    const runner = createPowerupRunner();
    runner.activate(SHIELD, 1000, makeCtx());
    const during = runner.update(1000 + 1000, makeCtx());
    expect(during.shieldActive).toBe(true);
    const after = runner.update(1000 + 5100, makeCtx());
    expect(after.shieldActive).toBe(false);
  });
});

describe("powerupRunner — pheromone-magnet", () => {
  it("accrues scoreBonus while active", () => {
    addPowerup(MAGNET, 1);
    const runner = createPowerupRunner();
    runner.activate(MAGNET, 1000, makeCtx());
    const delta = runner.update(1000 + 500, makeCtx());
    expect(delta.scoreBonus).toBe(MAGNET_RATE_PER_SECOND);
    // Expires -> no bonus.
    const after = runner.update(1000 + 4100, makeCtx());
    expect(after.scoreBonus).toBe(0);
  });
});

describe("powerupRunner — formic-acid-spray", () => {
  it("sets aiSpeedMultiplier < 1 for its duration then expires", () => {
    addPowerup(ACID, 1);
    const runner = createPowerupRunner();
    runner.activate(ACID, 1000, makeCtx());
    const during = runner.update(1000 + 500, makeCtx());
    expect(during.aiSpeedMultiplier).toBeLessThan(1);
    const after = runner.update(1000 + 2100, makeCtx());
    expect(after.aiSpeedMultiplier).toBe(1);
  });
});

describe("powerupRunner — instant offenses", () => {
  it.each([APHID, PENCIL, MARBLE, TACK] as PowerupId[])(
    "%s returns a spawn request and does not persist an active effect",
    (id) => {
      addPowerup(id, 1);
      const runner = createPowerupRunner();
      const result = runner.activate(id, 1000, makeCtx());
      expect(result.ok).toBe(true);
      expect(result.spawnRequest).toBeDefined();
      expect(result.spawnRequest!.id).toBe(id);
      // Instant effects produce no timed delta.
      const delta = runner.update(1000 + 10, makeCtx());
      expect(runner.getActive()).toHaveLength(0);
      expect(delta.playerSpeedMultiplier).toBe(1);
      expect(delta.shieldActive).toBe(false);
      expect(delta.scoreBonus).toBe(0);
    },
  );

  it("classifies marble-drop and thumbtack-mine as traps, aphid/pencil as projectiles", () => {
    addPowerup(MARBLE, 1);
    addPowerup(TACK, 1);
    addPowerup(APHID, 1);
    addPowerup(PENCIL, 1);
    const runner = createPowerupRunner();
    expect(runner.activate(MARBLE, 1000, makeCtx()).spawnRequest!.kind).toBe("trap");
    expect(runner.activate(TACK, 1000, makeCtx()).spawnRequest!.kind).toBe("trap");
    expect(runner.activate(APHID, 1000, makeCtx()).spawnRequest!.kind).toBe("projectile");
    expect(runner.activate(PENCIL, 1000, makeCtx()).spawnRequest!.kind).toBe("projectile");
  });
});

describe("powerupRunner — getActive + clear", () => {
  it("clear() resets all active effects without touching inventory", () => {
    addPowerup(BOOST, 1);
    addPowerup(SHIELD, 1);
    const runner = createPowerupRunner();
    runner.activate(BOOST, 1000, makeCtx());
    runner.activate(SHIELD, 1000, makeCtx());
    expect(runner.getActive()).toHaveLength(2);
    runner.clear();
    expect(runner.getActive()).toHaveLength(0);
    // clear() must NOT refund inventory (consume already happened).
    expect(getPowerupStock()[BOOST]).toBeUndefined();
    expect(getPowerupStock()[SHIELD]).toBeUndefined();
  });

  it("getActive returns a defensive copy", () => {
    addPowerup(SHIELD, 1);
    const runner = createPowerupRunner();
    runner.activate(SHIELD, 1000, makeCtx());
    const snap = runner.getActive();
    snap[0].endsAt = 0;
    // Mutating the snapshot must not affect runner state.
    expect(runner.getActive()[0].endsAt).toBeGreaterThan(0);
  });

  it("re-activating a timed effect refreshes rather than stacks", () => {
    addPowerup(BOOST, 2);
    const runner = createPowerupRunner();
    runner.activate(BOOST, 1000, makeCtx());
    runner.activate(BOOST, 2000, makeCtx());
    expect(runner.getActive()).toHaveLength(1);
    // Window should be measured from the second activation (2000 + duration).
    const during = runner.update(2000 + 2400, makeCtx());
    expect(during.playerSpeedMultiplier).toBeGreaterThan(1);
  });
});

describe("powerupRunner — neutral delta when idle", () => {
  it("returns neutral deltas with no active effects", () => {
    resetInventory();
    const runner = createPowerupRunner();
    const delta = runner.update(12345, makeCtx());
    expect(delta).toEqual({
      playerSpeedMultiplier: 1,
      aiSpeedMultiplier: 1,
      shieldActive: false,
      scoreBonus: 0,
    });
  });
});
