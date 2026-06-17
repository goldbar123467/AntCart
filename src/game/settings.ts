// Persistent game settings for AntCarts — localStorage-backed, SSR-safe.
//
// Pure TypeScript: the only DOM-ish dependency is `localStorage`, accessed via
// `globalThis` with a typeof guard so the module is unit-testable in a plain
// Node environment (and safe under SSR/prerender). No Three.js, no DOM tree.
// Mirrors the wallet module in `./economy/currency`.
//
// Persistence key: "antcarts:settings" -> JSON shaped like `GameSettings`.

const SETTINGS_KEY = "antcarts:settings";

export interface GameSettings {
  /** Whether the engine audio loop plays. */
  engineAudio: boolean;
  /** Whether the in-race HUD overlays are visible. */
  showHud: boolean;
  /** Whether the chase camera shakes on boost/impact (flag, host-applied). */
  cameraShake: boolean;
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function getStorage(): StorageLike | undefined {
  try {
    const storage = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (typeof storage === "undefined" || storage === null) {
      return undefined;
    }
    return storage;
  } catch {
    // Some privacy modes throw on localStorage access.
    return undefined;
  }
}

/** The default settings applied when nothing (valid) is persisted. */
export function defaultSettings(): GameSettings {
  return { engineAudio: true, showHud: true, cameraShake: true };
}

function coerceBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Read the settings from localStorage. Returns defaults when unset/invalid. */
export function loadSettings(): GameSettings {
  const storage = getStorage();
  if (!storage) {
    return defaultSettings();
  }
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) {
      return defaultSettings();
    }
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const fallback = defaultSettings();
    return {
      engineAudio: coerceBool(parsed.engineAudio, fallback.engineAudio),
      showHud: coerceBool(parsed.showHud, fallback.showHud),
      cameraShake: coerceBool(parsed.cameraShake, fallback.cameraShake),
    };
  } catch {
    // Corrupt JSON / wrong shape — fall back to defaults rather than crash.
    return defaultSettings();
  }
}

/** Persist the settings to localStorage (no-op when storage is unavailable). */
export function saveSettings(settings: GameSettings): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Quota exceeded or storage disabled — ignore.
  }
}

/**
 * Merge a partial patch into the current persisted settings, persist, and
 * return the new full settings object. Unknown keys are ignored.
 */
export function updateSettings(patch: Partial<GameSettings>): GameSettings {
  const current = loadSettings();
  const next: GameSettings = {
    engineAudio: coerceBool(patch.engineAudio, current.engineAudio),
    showHud: coerceBool(patch.showHud, current.showHud),
    cameraShake: coerceBool(patch.cameraShake, current.cameraShake),
  };
  saveSettings(next);
  return next;
}

/** localStorage key used by the settings (exported for tests/inspection). */
export const SETTINGS_STORAGE_KEY = SETTINGS_KEY;
