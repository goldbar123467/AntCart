import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("room material pipeline", () => {
  it("uses procedural tiled PBR textures with a shader hook for room surfaces", () => {
    const source = readFileSync(resolve(projectRoot, "src/render/roomMaterials.ts"), "utf8");

    expect(source).toContain("CanvasTexture");
    expect(source).toContain("RepeatWrapping");
    expect(source).toContain("bumpMap");
    expect(source).toContain("roughnessMap");
    expect(source).toContain("onBeforeCompile");
    expect(source).toContain("uFiberStrength");
  });
});
