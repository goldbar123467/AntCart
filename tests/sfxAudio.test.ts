import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("SFX audio", () => {
  it("ships separate local sounds for coin, mystery box, and powerup events", () => {
    for (const filename of ["coin.ogg", "mystery-box.ogg", "powerup.ogg"]) {
      const stats = statSync(resolve(projectRoot, "public/audio", filename));

      expect(stats.size).toBeGreaterThan(8_000);
    }

    const readme = readFileSync(resolve(projectRoot, "public/audio/README.md"), "utf8");
    expect(readme).toContain("CC0 1.0 Public Domain");
    expect(readme).toContain("opengameart.org");
  });

  it("wires the three SFX to their gameplay events", () => {
    const source = readFileSync(resolve(projectRoot, "src/main.ts"), "utf8");

    expect(source).toContain('sfxAudio.play("coin")');
    expect(source).toContain('sfxAudio.play("mysteryBox")');
    expect(source).toContain('sfxAudio.play("powerup")');
    expect(source).toContain("grantMysteryBoxPowerup");
  });
});
