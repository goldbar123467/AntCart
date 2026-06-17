import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createPowerupHud } from "../src/ui/hud/powerupHud";

/**
 * Minimal fake DOM — no jsdom. Mirrors tests/storeScreen.test.ts. The HUD is
 * built programmatically (createElement + appendChild + textContent +
 * classList + style.setProperty), so a tiny element stub suffices.
 */
interface FakeEl {
  tagName: string;
  className: string;
  textContent: string;
  innerHTML: string;
  children: FakeEl[];
  dataset: Record<string, string>;
  style: { setProperty: (k: string, v: string) => void; [k: string]: unknown };
  classList: {
    add(...tokens: string[]): void;
    remove(...tokens: string[]): void;
    contains(token: string): boolean;
    toggle(token: string, force?: boolean): void;
  };
  appendChild(child: FakeEl): FakeEl;
  removeChild(child: FakeEl): FakeEl;
  readonly firstChild: FakeEl | null;
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
    dataset: {},
    style: {
      ...styleStore,
      setProperty(k: string, v: string) {
        styleStore[k] = v;
      },
    },
    classList: {
      add(...list: string[]) {
        for (const t of list) tokens.add(t);
      },
      remove(...list: string[]) {
        for (const t of list) tokens.delete(t);
      },
      contains(token: string) {
        return tokens.has(token);
      },
      toggle(token: string, force?: boolean) {
        const next = force ?? !tokens.has(token);
        if (next) tokens.add(token);
        else tokens.delete(token);
      },
    },
    appendChild(child: FakeEl): FakeEl {
      this.children.push(child);
      return child;
    },
    removeChild(child: FakeEl): FakeEl {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
      return child;
    },
    get firstChild(): FakeEl | null {
      return this.children[0] ?? null;
    },
    setAttribute() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  // Keep className in sync with the token set so tests can read it.
  Object.defineProperty(node, "className", {
    get() {
      return Array.from(tokens).join(" ");
    },
    set(value: string) {
      tokens.clear();
      for (const t of String(value).split(/\s+/)) {
        if (t) tokens.add(t);
      }
    },
    configurable: true,
  });
  return node;
}

function installFakeDocument() {
  const doc = { createElement: (tag: string) => makeEl(tag) };
  vi.stubGlobal("document", doc);
  return () => vi.unstubAllGlobals();
}

/** localStorage stub so the HUD's getPowerupStock() read on build is safe. */
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

function findByClassName(root: FakeEl, cls: string): FakeEl[] {
  const out: FakeEl[] = [];
  const walk = (node: FakeEl): void => {
    if (node.className.split(/\s+/).includes(cls)) out.push(node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return out;
}

describe("createPowerupHud — slot", () => {
  it("builds a root element with the ac-powerup-hud class", () => {
    const restore = installFakeDocument();
    const hud = createPowerupHud();
    expect(hud.element.className.split(/\s+/)).toContain("ac-powerup-hud");
    restore();
  });

  it("setSelected updates the slot icon and name", () => {
    const restore = installFakeDocument();
    const hud = createPowerupHud();
    hud.setSelected("powerup-leaf-shield");
    const glyph = findByClassName(hud.element as unknown as FakeEl, "ac-powerup-slot__glyph");
    const name = findByClassName(hud.element as unknown as FakeEl, "ac-powerup-slot__name");
    expect(glyph).toHaveLength(1);
    expect(name).toHaveLength(1);
    expect(glyph[0].textContent).toBe("🍃");
    expect(name[0].textContent).toBe("Leaf Shield");
    restore();
  });

  it("setSelected(null) shows the empty slot", () => {
    const restore = installFakeDocument();
    const hud = createPowerupHud();
    hud.setSelected("powerup-sugar-cube-boost");
    hud.setSelected(null);
    const name = findByClassName(hud.element as unknown as FakeEl, "ac-powerup-slot__name");
    expect(name[0].textContent).toBe("No powerup");
    restore();
  });

  it("setCount updates the count badge and toggles is-empty", () => {
    const restore = installFakeDocument();
    const hud = createPowerupHud();
    hud.setSelected("powerup-aphid-launcher");
    hud.setCount(3);
    const count = findByClassName(hud.element as unknown as FakeEl, "ac-powerup-slot__count");
    expect(count[0].textContent).toBe("3");
    const slot = findByClassName(hud.element as unknown as FakeEl, "ac-powerup-slot")[0];
    expect(slot.classList.contains("is-empty")).toBe(false);

    hud.setCount(0);
    expect(count[0].textContent).toBe("0");
    expect(slot.classList.contains("is-empty")).toBe(true);
    restore();
  });
});

describe("createPowerupHud — active effect chips", () => {
  it("setActiveEffects renders one chip per effect with remaining time", () => {
    const restore = installFakeDocument();
    const hud = createPowerupHud();
    hud.setActiveEffects(
      [
        { id: "powerup-leaf-shield", endsAt: 5000 },
        { id: "powerup-sugar-cube-boost", endsAt: 3000 },
      ],
      1000,
    );
    const chips = findByClassName(hud.element as unknown as FakeEl, "ac-effect-chip");
    expect(chips).toHaveLength(2);
    // Shield has 4.0s left, boost 2.0s.
    expect(chips[0].textContent).toMatch(/SHIELD 4\.0s/);
    expect(chips[1].textContent).toMatch(/SUGAR 2\.0s/);
    restore();
  });

  it("clears chips when no effects are active", () => {
    const restore = installFakeDocument();
    const hud = createPowerupHud();
    hud.setActiveEffects([{ id: "powerup-leaf-shield", endsAt: 5000 }], 1000);
    const chipsWrap = findByClassName(hud.element as unknown as FakeEl, "ac-powerup-chips")[0];
    expect(chipsWrap.classList.contains("has-chips")).toBe(true);

    hud.setActiveEffects([], 1000);
    const chips = findByClassName(hud.element as unknown as FakeEl, "ac-effect-chip");
    expect(chips).toHaveLength(0);
    expect(chipsWrap.classList.contains("has-chips")).toBe(false);
    restore();
  });
});

describe("createPowerupHud — visibility", () => {
  it("show/hide toggles the is-visible class", () => {
    const restore = installFakeDocument();
    const hud = createPowerupHud();
    hud.show();
    expect(hud.element.classList.contains("is-visible")).toBe(true);
    hud.hide();
    expect(hud.element.classList.contains("is-visible")).toBe(false);
    restore();
  });
});
