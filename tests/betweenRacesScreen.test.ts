import { describe, expect, it, vi } from "vitest";
import { createBetweenRacesScreen } from "../src/ui/screens/betweenRacesScreen";

/**
 * Minimal fake DOM — no jsdom. The screen is built programmatically
 * (createElement + appendChild + textContent), so a tiny element stub is
 * enough to verify setStandings updates the cached row elements' text content.
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

describe("createBetweenRacesScreen", () => {
  it("renders 8 placeholder standings rows by default", () => {
    const restore = installFakeDocument();
    const screen = createBetweenRacesScreen({
      onContinue: () => {},
      onStore: () => {},
    });

    const rows = findByClassName(screen as unknown as FakeEl, "ac-between__row");
    expect(rows).toHaveLength(8);

    const names = findByClassName(screen as unknown as FakeEl, "ac-between__row-name");
    expect(names[0].textContent).toBe("Worker-7");
    expect(names[1].textContent).toBe("Scout-3");

    const places = findByClassName(screen as unknown as FakeEl, "ac-between__row-place");
    expect(places[0].textContent).toBe("1st");
    expect(places[1].textContent).toBe("2nd");
    restore();
  });

  it("setStandings updates the provided rows and leaves placeholders for the rest", () => {
    const restore = installFakeDocument();
    const screen = createBetweenRacesScreen({
      onContinue: () => {},
      onStore: () => {},
    });

    screen.setStandings([
      { name: "You", placement: 1, time: 60 },
      { name: "Worker-7", placement: 2, time: 72 },
    ]);

    const names = findByClassName(screen as unknown as FakeEl, "ac-between__row-name");
    expect(names[0].textContent).toBe("You");
    expect(names[1].textContent).toBe("Worker-7");
    // Untouched rows keep their placeholder names.
    expect(names[2].textContent).toBe("Forager-1");

    const places = findByClassName(screen as unknown as FakeEl, "ac-between__row-place");
    expect(places[0].textContent).toBe("1st");
    expect(places[1].textContent).toBe("2nd");
    expect(places[2].textContent).toBe("3rd");

    const times = findByClassName(screen as unknown as FakeEl, "ac-between__row-time");
    expect(times[0].textContent).toBe("1:00");
    expect(times[1].textContent).toBe("1:12");
    restore();
  });

  it("exposes the setStandings method on the returned overlay", () => {
    const restore = installFakeDocument();
    const screen = createBetweenRacesScreen({
      onContinue: () => {},
      onStore: () => {},
    });
    expect(typeof screen.setStandings).toBe("function");
    restore();
  });
});
