import { describe, expect, it, vi } from "vitest";
import { createPauseScreen } from "../src/ui/screens/pauseScreen";
import {
  findByClassName,
  findByDataset,
  installFakeDocument,
  type FakeEl,
} from "./helpers/fakeDom";
import type { GameSettings } from "../src/game/settings";

describe("createPauseScreen", () => {
  it("renders the pause options panel with three setting toggles", () => {
    const restore = installFakeDocument();
    const screen = createPauseScreen({
      onResume: () => {},
      onRestart: () => {},
      onQuit: () => {},
      options: () => ({ engineAudio: true, showHud: true, cameraShake: false }),
      setOptions: () => {},
    });

    expect(findByClassName(screen as unknown as FakeEl, "ac-pause__title")[0].textContent).toBe("PAUSED");
    expect(findByClassName(screen as unknown as FakeEl, "ac-options-toggle")).toHaveLength(3);
    restore();
  });

  it("dispatches button callbacks for resume, restart, and quit", () => {
    const restore = installFakeDocument();
    const onResume = vi.fn();
    const onRestart = vi.fn();
    const onQuit = vi.fn();
    const screen = createPauseScreen({
      onResume,
      onRestart,
      onQuit,
      options: () => ({ engineAudio: true, showHud: true, cameraShake: true }),
      setOptions: () => {},
    }) as unknown as FakeEl;

    findByDataset(screen, "action", "resume")[0].click();
    findByDataset(screen, "action", "restart")[0].click();
    findByDataset(screen, "action", "quit")[0].click();

    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onQuit).toHaveBeenCalledTimes(1);
    restore();
  });

  it("sends settings patches when toggles change and refreshes from current options", () => {
    const restore = installFakeDocument();
    let settings: GameSettings = { engineAudio: true, showHud: true, cameraShake: true };
    const patches: Array<Partial<GameSettings>> = [];
    const screen = createPauseScreen({
      onResume: () => {},
      onRestart: () => {},
      onQuit: () => {},
      options: () => settings,
      setOptions: (patch) => {
        patches.push(patch);
        settings = { ...settings, ...patch };
      },
    });

    const hudToggle = findByDataset(screen as unknown as FakeEl, "setting", "showHud")[0];
    hudToggle.checked = false;
    hudToggle.dispatch("change");
    expect(patches).toContainEqual({ showHud: false });

    settings = { engineAudio: false, showHud: false, cameraShake: false };
    screen.refresh();
    const toggles = findByClassName(screen as unknown as FakeEl, "ac-options-toggle__input");
    expect(toggles.every((toggle) => toggle.checked === false)).toBe(true);
    restore();
  });
});
