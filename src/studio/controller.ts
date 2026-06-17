import {
  DEFAULT_STUDIO_SETTINGS,
  type StudioPresetName,
  type StudioSettings,
  applyPreset,
  clampStudioSettings,
} from "./settings";

type StudioSubscriber = (settings: StudioSettings) => void;

export type StudioController = {
  getSettings: () => StudioSettings;
  setSettings: (settings: Partial<StudioSettings>) => StudioSettings;
  applyPreset: (name: StudioPresetName) => StudioSettings;
  reset: () => StudioSettings;
  exportSettings: () => string;
  subscribe: (subscriber: StudioSubscriber) => () => void;
};

export function createStudioController(
  initialSettings: StudioSettings = DEFAULT_STUDIO_SETTINGS,
): StudioController {
  let currentSettings = clampStudioSettings(initialSettings);
  const subscribers = new Set<StudioSubscriber>();

  function publish(): void {
    const snapshot = { ...currentSettings };
    for (const subscriber of subscribers) {
      subscriber(snapshot);
    }
  }

  function replace(nextSettings: Partial<StudioSettings>): StudioSettings {
    currentSettings = clampStudioSettings({ ...currentSettings, ...nextSettings });
    publish();
    return { ...currentSettings };
  }

  return {
    getSettings: () => ({ ...currentSettings }),
    setSettings: replace,
    applyPreset: (name) => replace(applyPreset(name)),
    reset: () => replace(DEFAULT_STUDIO_SETTINGS),
    exportSettings: () => JSON.stringify(currentSettings, null, 2),
    subscribe: (subscriber) => {
      subscribers.add(subscriber);

      return () => {
        subscribers.delete(subscriber);
      };
    },
  };
}
