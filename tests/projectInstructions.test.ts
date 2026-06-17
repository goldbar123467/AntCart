import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("project instructions and QA scripts", () => {
  it("documents research-backed game development and screenshot visual QA", () => {
    const agentsPath = resolve(projectRoot, "AGENTS.md");

    expect(existsSync(agentsPath)).toBe(true);

    const agentsText = readFileSync(agentsPath, "utf8");

    expect(agentsText).toContain("GitHub");
    expect(agentsText).toContain("online research");
    expect(agentsText).toContain("Visual QA");
    expect(agentsText).toContain("npm run qa:visual");
    expect(agentsText).toContain("screenshots");
  });

  it("exposes the reusable browser screenshot QA command", () => {
    const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["qa:visual"]).toBe("node scripts/visual-qa.mjs");
    expect(existsSync(resolve(projectRoot, "scripts/visual-qa.mjs"))).toBe(true);
  });
});
