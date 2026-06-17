import { describe, expect, it } from "vitest";
import { createStudioController } from "../src/studio/controller";
import { DEFAULT_STUDIO_SETTINGS, STUDIO_PRESETS } from "../src/studio/settings";

describe("studio controller", () => {
  it("notifies subscribers with clamped partial updates", () => {
    const controller = createStudioController(DEFAULT_STUDIO_SETTINGS);
    const changes: unknown[] = [];

    controller.subscribe((settings) => changes.push(settings));
    controller.setSettings({ windStrength: 5, sunElevation: -10 });

    expect(controller.getSettings()).toMatchObject({
      windStrength: 1,
      sunElevation: 0,
    });
    expect(changes).toHaveLength(1);
  });

  it("resets and exports a stable JSON payload", () => {
    const controller = createStudioController(DEFAULT_STUDIO_SETTINGS);

    controller.applyPreset("Sunset Field");
    expect(controller.getSettings()).toEqual(STUDIO_PRESETS["Sunset Field"]);

    controller.reset();
    expect(controller.getSettings()).toEqual(DEFAULT_STUDIO_SETTINGS);
    expect(JSON.parse(controller.exportSettings())).toEqual(DEFAULT_STUDIO_SETTINGS);
  });
});
