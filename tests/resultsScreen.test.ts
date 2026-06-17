import { describe, expect, it, vi } from "vitest";
import {
  createResultsScreen,
  computeCoinsEarned,
  formatPlacement,
  formatRaceTime,
} from "../src/ui/screens/resultsScreen";

/**
 * Minimal fake DOM — no jsdom. The screen is built programmatically
 * (createElement + appendChild + textContent), so a tiny element stub is
 * enough to verify setResults updates the cached value elements' textContent.
 */
interface FakeEl {
  tagName: string;
  className: string;
  textContent: string;
  innerHTML: string;
  children: FakeEl[];
  dataset: Record<string, string>;
  style: Record<string, string>;
  classList: {
    add(...tokens: string[]): void;
    remove(...tokens: string[]): void;
    contains(token: string): boolean;
  };
  appendChild(child: FakeEl): FakeEl;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(): void;
  setAttribute(): void;
  querySelector(): null;
  querySelectorAll(): FakeEl[];
}

function makeEl(tag: string): FakeEl {
  const tokens = new Set<string>();
  return {
    tagName: tag.toUpperCase(),
    className: "",
    textContent: "",
    innerHTML: "",
    children: [],
    dataset: {},
    style: {},
    classList: {
      add(...list: string[]) {
        for (const token of list) tokens.add(token);
      },
      remove(...list: string[]) {
        for (const token of list) tokens.delete(token);
      },
      contains(token: string) {
        return tokens.has(token);
      },
    },
    appendChild(child: FakeEl) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function installFakeDocument() {
  const doc = { createElement: (tag: string) => makeEl(tag) };
  vi.stubGlobal("document", doc);
  return () => vi.unstubAllGlobals();
}

/** Recursively collect fake elements whose className list contains `cls`. */
function findByClassName(root: FakeEl, cls: string): FakeEl[] {
  const out: FakeEl[] = [];
  const walk = (node: FakeEl): void => {
    if (node.className.split(/\s+/).includes(cls)) {
      out.push(node);
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return out;
}

describe("results screen helpers", () => {
  it("formats race time as m:ss", () => {
    expect(formatRaceTime(0)).toBe("0:00");
    expect(formatRaceTime(65)).toBe("1:05");
    expect(formatRaceTime(125)).toBe("2:05");
    expect(formatRaceTime(-10)).toBe("0:00");
  });

  it("formats placement ordinals", () => {
    expect(formatPlacement(1)).toBe("1st");
    expect(formatPlacement(2)).toBe("2nd");
    expect(formatPlacement(3)).toBe("3rd");
    expect(formatPlacement(4)).toBe("4th");
    expect(formatPlacement(11)).toBe("11th");
    expect(formatPlacement(12)).toBe("12th");
    expect(formatPlacement(13)).toBe("13th");
    expect(formatPlacement(21)).toBe("21st");
    expect(formatPlacement(102)).toBe("102nd");
  });

  it("computes coins earned from score, time, and placement", () => {
    // score 4200 -> 42, time 65 -> 6, placement 1 -> 250 = 298
    expect(
      computeCoinsEarned({ time: 65, score: 4200, placement: 1, laps: 3 }),
    ).toBe(298);
    // placement 2 -> 120
    expect(
      computeCoinsEarned({ time: 0, score: 0, placement: 2, laps: 3 }),
    ).toBe(120);
    // placement 4 -> 20
    expect(
      computeCoinsEarned({ time: 0, score: 0, placement: 4, laps: 3 }),
    ).toBe(20);
  });
});

describe("createResultsScreen", () => {
  it("setResults updates the stat value text content", () => {
    const restore = installFakeDocument();
    const onContinue = vi.fn();
    const onStore = vi.fn();
    const onRetry = vi.fn();
    const screen = createResultsScreen({ onContinue, onStore, onRetry });

    screen.setResults({ time: 125, score: 4200, placement: 1, laps: 3 });

    expect(findByClassName(screen as unknown as FakeEl, "ac-results__time")[0].textContent).toBe("2:05");
    expect(findByClassName(screen as unknown as FakeEl, "ac-results__laps")[0].textContent).toBe("3");
    expect(findByClassName(screen as unknown as FakeEl, "ac-results__score")[0].textContent).toBe("4200");
    expect(findByClassName(screen as unknown as FakeEl, "ac-results__place")[0].textContent).toBe("1st");
    // 4200/100=42 + 125/10=12 + 250 placement = 304
    expect(findByClassName(screen as unknown as FakeEl, "ac-results__earned")[0].textContent).toBe("+304");
    restore();
  });

  it("exposes the setResults method on the returned overlay", () => {
    const restore = installFakeDocument();
    const screen = createResultsScreen({
      onContinue: () => {},
      onStore: () => {},
      onRetry: () => {},
    });
    expect(typeof screen.setResults).toBe("function");
    restore();
  });
});
