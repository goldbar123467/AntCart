import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  FINISH_LINE_RENDER_ORDER,
  FINISH_LINE_STRIPES,
  FINISH_LINE_Y,
  createFinishLineGroup,
} from "../src/game/finishLine";

const projectRoot = resolve(import.meta.dirname, "..");

describe("finish line rendering", () => {
  it("builds raised decal stripes with depth bias instead of thin shadowed boxes", () => {
    const group = createFinishLineGroup(
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(0, 0.05, -10),
      12,
    );

    expect(group.name).toBe("finish-line-decal");
    expect(group.children).toHaveLength(FINISH_LINE_STRIPES);
    expect(group.renderOrder).toBe(FINISH_LINE_RENDER_ORDER);

    const firstStripe = group.children[0] as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshBasicMaterial
    >;

    expect(firstStripe.renderOrder).toBe(FINISH_LINE_RENDER_ORDER);
    expect(firstStripe.castShadow).toBe(false);
    expect(firstStripe.receiveShadow).toBe(false);
    expect(firstStripe.frustumCulled).toBe(false);
    expect(firstStripe.material.depthWrite).toBe(false);
    expect(firstStripe.material.polygonOffset).toBe(true);
    expect(firstStripe.material.polygonOffsetFactor).toBeLessThan(0);
    expect(firstStripe.material.polygonOffsetUnits).toBeLessThan(0);

    const positions = firstStripe.geometry.getAttribute("position");

    for (let i = 0; i < positions.count; i += 1) {
      expect(positions.getY(i)).toBeCloseTo(FINISH_LINE_Y);
      expect(positions.getY(i)).toBeGreaterThan(0.055);
    }
  });

  it("wires the scene to the decal helper instead of local box stripes", () => {
    const source = readFileSync(resolve(projectRoot, "src/main.ts"), "utf8");

    expect(source).toContain("createFinishLineGroup(points[0], points[1], roadWidth)");
    expect(source).not.toContain("startStripe");
  });
});
