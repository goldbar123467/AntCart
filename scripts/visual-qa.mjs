import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDir = resolve(projectRoot, "test-results");
const targetUrl = process.env.ANTCARTS_URL ?? "http://127.0.0.1:5174/";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

async function importPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    console.error("Playwright is required for visual QA. Install it with `npm install -D playwright`.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function assertServerReachable() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(targetUrl, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Could not reach AntCarts at ${targetUrl}. Start the dev server with \`npm run dev\`.`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

async function captureScreenshot(page, screenshots, label) {
  const path = resolve(outputDir, `visual-qa-${stamp}-${label}.png`);
  await page.screenshot({ path, fullPage: false });
  screenshots.push(path);
}

async function readPageState(page) {
  return page.evaluate(() => {
    const debug = window.antcartsDebug?.() ?? null;
    const gaugeText =
      document.querySelector(".speed-gauge")?.textContent?.replace(/\s+/g, " ").trim() ?? null;
    const canvasRect = document.querySelector("canvas")?.getBoundingClientRect();

    return {
      debug,
      gaugeText,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      canvas: canvasRect
        ? {
            x: Math.round(canvasRect.x),
            y: Math.round(canvasRect.y),
            width: Math.round(canvasRect.width),
            height: Math.round(canvasRect.height),
          }
        : null,
    };
  });
}

async function holdKeys(page, keys, durationMs) {
  await focusGamePage(page);

  for (const key of keys) {
    await page.keyboard.down(key);
  }

  await page.waitForTimeout(durationMs);

  for (const key of [...keys].reverse()) {
    await page.keyboard.up(key);
  }
}

async function focusGamePage(page) {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });
}

async function runScenario(browser, scenario) {
  console.log(`Visual QA: starting ${scenario.name}`);
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: scenario.deviceScaleFactor ?? 1,
    isMobile: scenario.isMobile ?? false,
    hasTouch: scenario.hasTouch ?? false,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const screenshots = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => typeof window.antcartsDebug === "function", {
    timeout: 10000,
  });
  await page.waitForFunction(() => {
    const value = document.querySelector(".speed-gauge .speed-value");
    return value && value.textContent && value.getBoundingClientRect().width > 0;
  }, { timeout: 10000 });
  await focusGamePage(page);
  await page.waitForTimeout(500);
  await captureScreenshot(page, screenshots, `${scenario.name}-start`);

  await holdKeys(page, ["KeyW", "KeyA"], scenario.driveMs);
  await captureScreenshot(page, screenshots, `${scenario.name}-left-turn`);
  const afterLeftTurn = await readPageState(page);

  await holdKeys(page, ["KeyW", "KeyD"], Math.round(scenario.driveMs * 0.8));
  await captureScreenshot(page, screenshots, `${scenario.name}-right-turn`);
  const afterRightTurn = await readPageState(page);

  await holdKeys(page, ["KeyW"], Math.round(scenario.driveMs * 0.55));
  await captureScreenshot(page, screenshots, `${scenario.name}-straight-recovery`);
  const afterRecovery = await readPageState(page);

  await context.close();
  console.log(`Visual QA: finished ${scenario.name}`);

  const maxSpeed = Math.max(
    afterLeftTurn.debug?.speedMps ?? 0,
    afterRightTurn.debug?.speedMps ?? 0,
    afterRecovery.debug?.speedMps ?? 0,
  );

  return {
    name: scenario.name,
    viewport: scenario.viewport,
    screenshots,
    states: {
      afterLeftTurn,
      afterRightTurn,
      afterRecovery,
    },
    maxSpeedMps: Number(maxSpeed.toFixed(3)),
    pageErrors,
    consoleErrors,
  };
}

function toMarkdown(report, reportPath) {
  const lines = [
    "# AntCarts Visual QA",
    "",
    `- URL: ${report.url}`,
    `- Started: ${report.startedAt}`,
    `- Report: ${reportPath}`,
    "",
  ];

  for (const scenario of report.scenarios) {
    lines.push(`## ${scenario.name}`);
    lines.push("");
    lines.push(`- Viewport: ${scenario.viewport.width}x${scenario.viewport.height}`);
    lines.push(`- Max speed: ${scenario.maxSpeedMps} m/s`);
    lines.push(`- Gauge: ${scenario.states.afterRecovery.gaugeText ?? "missing"}`);

    for (const screenshot of scenario.screenshots) {
      lines.push(`- Screenshot: ${screenshot}`);
    }

    if (scenario.pageErrors.length || scenario.consoleErrors.length) {
      lines.push(`- Page errors: ${scenario.pageErrors.join(" | ") || "none"}`);
      lines.push(`- Console errors: ${scenario.consoleErrors.join(" | ") || "none"}`);
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

await mkdir(outputDir, { recursive: true });
await assertServerReachable();

const { chromium } = await importPlaywright();
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--use-gl=swiftshader"],
});

const scenarios = [];

try {
  scenarios.push(
    await runScenario(browser, {
      name: "desktop",
      viewport: { width: 1365, height: 768 },
      driveMs: 4200,
    }),
  );
  scenarios.push(
    await runScenario(browser, {
      name: "mobile",
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      driveMs: 5600,
    }),
  );
} finally {
  await browser.close();
}

const report = {
  url: targetUrl,
  startedAt: new Date().toISOString(),
  scenarios,
};
const jsonPath = resolve(outputDir, `visual-qa-${stamp}.json`);
const mdPath = resolve(outputDir, `visual-qa-${stamp}.md`);
const latestJsonPath = resolve(outputDir, "visual-qa-latest.json");
const latestMdPath = resolve(outputDir, "visual-qa-latest.md");

await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(mdPath, toMarkdown(report, jsonPath));
await writeFile(latestMdPath, toMarkdown(report, jsonPath));

const failures = [];

for (const scenario of scenarios) {
  if (scenario.maxSpeedMps < 4) {
    failures.push(`${scenario.name}: keyboard drive did not move the kart enough`);
  }

  if (scenario.pageErrors.length > 0) {
    failures.push(`${scenario.name}: page errors: ${scenario.pageErrors.join(" | ")}`);
  }

  if (scenario.consoleErrors.length > 0) {
    failures.push(`${scenario.name}: console errors: ${scenario.consoleErrors.join(" | ")}`);
  }

  for (const state of Object.values(scenario.states)) {
    if (!state.debug) {
      failures.push(`${scenario.name}: missing window.antcartsDebug state`);
    }

    if (!state.gaugeText?.includes("MPH")) {
      failures.push(`${scenario.name}: MPH gauge text missing`);
    }

    if (!state.canvas || state.canvas.width < scenario.viewport.width * 0.95) {
      failures.push(`${scenario.name}: WebGL canvas does not fill the viewport`);
    }
  }
}

console.log(`Visual QA report: ${jsonPath}`);
for (const scenario of scenarios) {
  for (const screenshot of scenario.screenshots) {
    console.log(`Screenshot: ${screenshot}`);
  }
}

if (failures.length > 0) {
  console.error("Visual QA failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
