import { describe, expect, it } from "vitest";
import { createPhysicsPreview } from "../src/physics/preview";

describe("physics preview", () => {
  it("steps a cannon body and resets it to the launch pose", () => {
    const preview = createPhysicsPreview();

    const start = preview.getState();
    preview.step(1 / 30);
    const afterStep = preview.getState();

    expect(afterStep.position.y).toBeLessThan(start.position.y);
    expect(afterStep.position.x).toBeGreaterThan(start.position.x);

    preview.reset();
    expect(preview.getState()).toEqual(start);
  });
});
