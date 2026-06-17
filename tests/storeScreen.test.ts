import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createStoreScreen } from "../src/ui/screens/storeScreen";
import { STORE_CATALOG } from "../src/game/economy/storeCatalog";

/**
 * Minimal fake DOM — no jsdom. The store screen is built programmatically
 * (createElement + appendChild + textContent), so a tiny element stub is
 * enough to verify refresh() renders the catalog count of cards and updates
 * the coin badge. Mirrors the pattern in tests/resultsScreen.test.ts.
 */
interface FakeEl {
  tagName: string;
  className: string;
  textContent: string;
  innerHTML: string;
  children: FakeEl[];
  firstChild: FakeEl | null;
  dataset: Record<string, string>;
  style: { setProperty: (k: string, v: string) => void; [k: string]: unknown };
  classList: {
    add(...tokens: string[]): void;
    remove(...tokens: string[]): void;
    contains(token: string): boolean;
  };
  appendChild(child: FakeEl): FakeEl;
  removeChild(child: FakeEl): FakeEl;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(): void;
  setAttribute(): void;
  querySelector(): null;
  querySelectorAll(): FakeEl[];
}

function makeEl(tag: string): FakeEl {
  const tokens = new Set<string>();
  const styleStore: Record<string, string> = {};
  const node: FakeEl = {
    tagName: tag.toUpperCase(),
    className: "",
    textContent: "",
    innerHTML: "",
    children: [],
    get firstChild(): FakeEl | null {
      return this.children[0] ?? null;
    },
    dataset: {},
    style: {
      ...styleStore,
      setProperty(k: string, v: string) {
        styleStore[k] = v;
      },
    },
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
    removeChild(child: FakeEl) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
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
  return node;
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

/** localStorage stub so the wallet/inventory reads work during refresh(). */
function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = makeStorage();
});

afterEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage;
});

describe("createStoreScreen", () => {
  it("renders one card per catalog item on initial build", () => {
    const restore = installFakeDocument();
    const screen = createStoreScreen({ onBack: () => {} });

    const cards = findByClassName(screen as unknown as FakeEl, "ac-store-card");
    expect(cards).toHaveLength(STORE_CATALOG.length);
    restore();
  });

  it("exposes the catalog count on the overlay", () => {
    const restore = installFakeDocument();
    const screen = createStoreScreen({ onBack: () => {} });
    expect(
      (screen as unknown as { catalogCount?: number }).catalogCount,
    ).toBe(STORE_CATALOG.length);
    restore();
  });

  it("refresh() re-renders the same number of cards", () => {
    const restore = installFakeDocument();
    const screen = createStoreScreen({ onBack: () => {} });
    screen.refresh();
    const cards = findByClassName(screen as unknown as FakeEl, "ac-store-card");
    expect(cards).toHaveLength(STORE_CATALOG.length);
    restore();
  });

  it("shows the coin badge value from the wallet (0 when empty)", () => {
    const restore = installFakeDocument();
    const screen = createStoreScreen({ onBack: () => {} });
    const badge = findByClassName(screen as unknown as FakeEl, "ac-coin-badge__value");
    expect(badge).toHaveLength(1);
    expect(badge[0].textContent).toBe("0");
    restore();
  });

  it("renders two section titles (Cosmetics + Powerups)", () => {
    const restore = installFakeDocument();
    const screen = createStoreScreen({ onBack: () => {} });
    const titles = findByClassName(screen as unknown as FakeEl, "ac-store__section-title");
    expect(titles).toHaveLength(2);
    expect(titles[0].textContent).toBe("Cosmetics");
    expect(titles[1].textContent).toBe("Powerups");
    restore();
  });

  it("exposes a refresh function on the returned overlay", () => {
    const restore = installFakeDocument();
    const screen = createStoreScreen({ onBack: () => {} });
    expect(typeof screen.refresh).toBe("function");
    restore();
  });
});
