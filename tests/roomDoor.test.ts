import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("room wall doors", () => {
  it("builds flush wall doors from merged Three.js geometry", () => {
    const source = readFileSync(resolve(projectRoot, "src/main.ts"), "utf8");

    expect(source).toContain("mergeGeometries");
    expect(source).toContain("addWallDoors()");
    expect(source).toContain("room-wall-door");
    expect(source).toContain("merged-door-panel");
    expect(source).toContain("makeMergedDoorGeometry");
    expect(source).toContain("door-knob");
    expect(source).toContain("door.castShadow = false");
    expect(source).toContain("27.5, roomWallHeight - 2.2");
  });
});
