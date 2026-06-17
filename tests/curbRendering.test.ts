import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("curb rendering", () => {
  it("renders continuous curb rails instead of overlapping corner blocks", () => {
    const source = readFileSync(resolve(projectRoot, "src/main.ts"), "utf8");

    expect(source).toContain("continuous-curb-rail");
    expect(source).toContain("TRACK_RAIL_CONFIG.tubeRadius");
    expect(source).not.toContain("curbBlocks");
    expect(source).not.toContain("new THREE.InstancedMesh");
  });
});
