import * as THREE from "three";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getStartGridPose } from "../src/game/checkpointVisual";

const projectRoot = resolve(import.meta.dirname, "..");

describe("checkpoint visual layout", () => {
  it("keeps the start camera out of the first checkpoint trigger", () => {
    const checkpoints = [
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(30, 0.05, 0),
    ];
    const start = getStartGridPose(checkpoints);

    expect(start.position.distanceTo(checkpoints[0])).toBeGreaterThanOrEqual(9.5);
    expect(start.position.x).toBeGreaterThan(checkpoints[0].x);
    expect(start.heading).toBeCloseTo(-Math.PI / 2);
  });

  it("does not render 3D checkpoint rings in the playfield", () => {
    const mainSource = readFileSync(resolve(projectRoot, "src/main.ts"), "utf8");

    expect(mainSource).not.toContain("TorusGeometry");
    expect(mainSource).not.toContain("CHECKPOINT_RING");
    expect(mainSource).not.toContain("CHECKPOINT_FLAME");
  });
});
