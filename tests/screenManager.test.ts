import { describe, expect, it, vi } from "vitest";
import {
  createScreenManager,
  type GamePhase,
  type ScreenOverlay,
} from "../src/ui/screens/screenManager";

/** Minimal ScreenOverlay stub backed by a Set — no DOM environment needed. */
function makeOverlay(): ScreenOverlay & { tokens: Set<string> } {
  const tokens = new Set<string>();
  return {
    tokens,
    classList: {
      add(...list: string[]) {
        for (const token of list) tokens.add(token);
      },
      remove(...list: string[]) {
        for (const token of list) tokens.delete(token);
      },
      contains(token: string) {
        return tokens.has(token);
      },
    },
  };
}

describe("ScreenManager", () => {
  it("starts in the menu phase", () => {
    const manager = createScreenManager();
    expect(manager.current).toBe<GamePhase>("menu");
  });

  it("toggles is-active on the registered overlay when entering its phase", () => {
    const manager = createScreenManager();
    const menu = makeOverlay();
    const race = makeOverlay();

    manager.register("menu", menu);
    manager.register("race", race);

    // menu is the default active phase.
    expect(menu.classList.contains("is-active")).toBe(true);
    expect(race.classList.contains("is-active")).toBe(false);

    manager.goto("race");
    expect(manager.current).toBe("race");
    expect(race.classList.contains("is-active")).toBe(true);
    expect(menu.classList.contains("is-active")).toBe(false);
  });

  it("hides the previous overlay and shows only the new one on each goto", () => {
    const manager = createScreenManager();
    const overlays: Record<GamePhase, ReturnType<typeof makeOverlay>> = {
      menu: makeOverlay(),
      race: makeOverlay(),
      results: makeOverlay(),
      betweenRaces: makeOverlay(),
      store: makeOverlay(),
      paused: makeOverlay(),
      trackSelect: makeOverlay(),
    };

    (Object.keys(overlays) as GamePhase[]).forEach((phase) => {
      manager.register(phase, overlays[phase]);
    });

    manager.goto("race");
    manager.goto("results");
    manager.goto("store");

    expect(overlays.store.classList.contains("is-active")).toBe(true);
    (Object.keys(overlays) as GamePhase[])
      .filter((phase) => phase !== "store")
      .forEach((phase) => {
        expect(overlays[phase].classList.contains("is-active")).toBe(false);
      });
  });

  it("fires the onChange callback with the new and previous phase", () => {
    const manager = createScreenManager();
    const onChange = vi.fn();
    manager.setOnChange(onChange);

    manager.goto("race");
    expect(onChange).toHaveBeenCalledWith("race", "menu");

    manager.goto("paused");
    expect(onChange).toHaveBeenCalledWith("paused", "race");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("registering an overlay for the currently active phase shows it immediately", () => {
    const manager = createScreenManager();
    manager.goto("race");
    const raceOverlay = makeOverlay();
    manager.register("race", raceOverlay);
    expect(raceOverlay.classList.contains("is-active")).toBe(true);
  });

  it("registering an overlay for a non-active phase hides it immediately", () => {
    const manager = createScreenManager();
    const storeOverlay = makeOverlay();
    manager.register("store", storeOverlay);
    expect(storeOverlay.classList.contains("is-active")).toBe(false);
  });

  it("hideAll removes is-active from every registered overlay without changing current", () => {
    const manager = createScreenManager();
    const menu = makeOverlay();
    const race = makeOverlay();
    manager.register("menu", menu);
    manager.register("race", race);
    manager.goto("race");

    manager.hideAll();

    expect(menu.classList.contains("is-active")).toBe(false);
    expect(race.classList.contains("is-active")).toBe(false);
    expect(manager.current).toBe("race");
  });
});
