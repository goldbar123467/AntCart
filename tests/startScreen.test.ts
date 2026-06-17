import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("start screen", () => {
  it("does not expose the removed track-list button", () => {
    const source = readFileSync(resolve(projectRoot, "src/ui/screens/startScreen.ts"), "utf8");

    expect(source).not.toContain('data-action="tracks"');
    expect(source).not.toContain(">Tracks<");
    expect(source).not.toContain("onTracks");
  });
});
