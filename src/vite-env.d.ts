/// <reference types="vite/client" />

import type { StudioPresetName, StudioSettings } from "./studio/settings";

declare global {
  interface Window {
    shaderStudio: {
      getSettings: () => StudioSettings;
      setSettings: (settings: Partial<StudioSettings>) => StudioSettings;
      applyPreset: (name: StudioPresetName) => StudioSettings;
      reset: () => StudioSettings;
      exportSettings: () => string;
      resetPhysics: () => void;
    };
  }
}

export {};
