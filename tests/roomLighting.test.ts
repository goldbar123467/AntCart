import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("room lighting composition", () => {
  it("uses a taller room shell with window daylight and filmic tone mapping", () => {
    const source = readFileSync(resolve(projectRoot, "src/main.ts"), "utf8");

    expect(source).toContain("ACESFilmicToneMapping");
    expect(source).toContain("RectAreaLightUniformsLib.init()");
    expect(source).toContain("const roomWallHeight = 45");
    expect(source).toContain("addWallWindows()");
    expect(source).toContain("new THREE.RectAreaLight");
    expect(source).toContain("room-window-glass");
    expect(source).toContain("room-window-blue-glow");
    expect(source).toContain("window-sun-patch");
  });

  it("keeps window glow surfaces out of the shadow pipeline", () => {
    const source = readFileSync(resolve(projectRoot, "src/main.ts"), "utf8");

    expect(source).toContain("const matWindowGlass = new THREE.MeshBasicMaterial");
    expect(source).toContain("const matWindowGlow = new THREE.MeshBasicMaterial");
    expect(source).toContain("glass.castShadow = false");
    expect(source).toContain("glass.receiveShadow = false");
    expect(source).toContain("glow.castShadow = false");
    expect(source).toContain("glow.receiveShadow = false");
    expect(source).toContain("frame.castShadow = false");
    expect(source).toContain("frame.receiveShadow = false");
  });

  it("keeps floor lamps visibly emissive with real point lights", () => {
    const source = readFileSync(resolve(projectRoot, "src/assets/floorLamp.ts"), "utf8");

    expect(source).toContain("emissiveIntensity: options?.emitLight ? 2.2 : 0.9");
    expect(source).toContain("new THREE.PointLight");
    expect(source).toContain("options.lightIntensity ?? 24");
    expect(source).toContain("options.lightDistance ?? 56");
  });
});
