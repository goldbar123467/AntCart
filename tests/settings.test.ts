import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  loadSettings,
  saveSettings,
  updateSettings,
} from "../src/game/settings";
import { makeStorage } from "./helpers/fakeDom";

const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = makeStorage();
});

afterEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage;
});

describe("game settings", () => {
  it("loads gameplay-friendly defaults when no settings are stored", () => {
    expect(loadSettings()).toEqual({
      engineAudio: true,
      showHud: true,
      cameraShake: true,
    });
  });

  it("saves and loads settings through localStorage", () => {
    saveSettings({ engineAudio: false, showHud: true, cameraShake: false });
    expect(loadSettings()).toEqual({
      engineAudio: false,
      showHud: true,
      cameraShake: false,
    });
    expect((globalThis as { localStorage: Storage }).localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull();
  });

  it("updates only known boolean settings and preserves the rest", () => {
    saveSettings(defaultSettings());
    const next = updateSettings({ showHud: false });
    expect(next).toEqual({
      engineAudio: true,
      showHud: false,
      cameraShake: true,
    });
    expect(loadSettings()).toEqual(next);
  });

  it("falls back to defaults for corrupt stored settings", () => {
    (globalThis as { localStorage: Storage }).localStorage.setItem(SETTINGS_STORAGE_KEY, "not-json");
    expect(loadSettings()).toEqual(defaultSettings());
  });
});
