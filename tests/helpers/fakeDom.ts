import { vi } from "vitest";

export interface FakeEl {
  tagName: string;
  className: string;
  textContent: string;
  innerHTML: string;
  children: FakeEl[];
  parentNode: FakeEl | null;
  firstChild: FakeEl | null;
  dataset: Record<string, string>;
  style: { setProperty: (key: string, value: string) => void; [key: string]: unknown };
  checked: boolean;
  type: string;
  id: string;
  htmlFor: string;
  classList: {
    add(...tokens: string[]): void;
    remove(...tokens: string[]): void;
    contains(token: string): boolean;
    toggle(token: string, force?: boolean): void;
  };
  appendChild(child: FakeEl): FakeEl;
  removeChild(child: FakeEl): FakeEl;
  addEventListener(type: string, listener: (event?: { target: FakeEl }) => void): void;
  removeEventListener(): void;
  setAttribute(name: string, value: string): void;
  querySelector(selector: string): FakeEl | null;
  querySelectorAll(selector: string): FakeEl[];
  click(): void;
  clickFromChild(type: string, target: FakeEl): void;
  dispatch(type: string): void;
}

export function makeEl(tag: string): FakeEl {
  const tokens = new Set<string>();
  const listeners = new Map<string, Array<(event?: { target: FakeEl }) => void>>();
  const attrs = new Map<string, string>();
  const styleStore: Record<string, string> = {};

  const node: FakeEl = {
    tagName: tag.toUpperCase(),
    className: "",
    textContent: "",
    innerHTML: "",
    children: [],
    parentNode: null,
    get firstChild(): FakeEl | null {
      return this.children[0] ?? null;
    },
    dataset: {},
    style: {
      ...styleStore,
      setProperty(key: string, value: string) {
        styleStore[key] = value;
      },
    },
    checked: false,
    type: "",
    id: "",
    htmlFor: "",
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
      toggle(token: string, force?: boolean) {
        const next = force ?? !tokens.has(token);
        if (next) tokens.add(token);
        else tokens.delete(token);
      },
    },
    appendChild(child: FakeEl): FakeEl {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child: FakeEl): FakeEl {
      const index = this.children.indexOf(child);
      if (index >= 0) {
        this.children.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    },
    addEventListener(type: string, listener: (event?: { target: FakeEl }) => void): void {
      const current = listeners.get(type) ?? [];
      current.push(listener);
      listeners.set(type, current);
    },
    removeEventListener(): void {},
    setAttribute(name: string, value: string): void {
      attrs.set(name, value);
    },
    querySelector(selector: string): FakeEl | null {
      return querySelector(this, selector);
    },
    querySelectorAll(selector: string): FakeEl[] {
      return querySelectorAll(this, selector);
    },
    click(): void {
      dispatchWithBubble(this, "click", this);
    },
    clickFromChild(type: string, target: FakeEl): void {
      for (const listener of listeners.get(type) ?? []) {
        listener({ target });
      }
      if (this.parentNode) {
        this.parentNode.clickFromChild(type, target);
      }
    },
    dispatch(type: string): void {
      for (const listener of listeners.get(type) ?? []) {
        listener({ target: this });
      }
    },
  };

  Object.defineProperty(node, "className", {
    get() {
      return Array.from(tokens).join(" ");
    },
    set(value: string) {
      tokens.clear();
      for (const token of String(value).split(/\s+/)) {
        if (token) tokens.add(token);
      }
    },
    configurable: true,
  });

  function dispatchWithBubble(current: FakeEl, type: string, target: FakeEl): void {
    for (const listener of listeners.get(type) ?? []) {
      listener({ target });
    }
    if (current.parentNode) {
      current.parentNode.clickFromChild(type, target);
    }
  }

  return node;
}

export function installFakeDocument(): () => void {
  vi.stubGlobal("document", { createElement: (tag: string) => makeEl(tag) });
  return () => vi.unstubAllGlobals();
}

export function findByClassName(root: FakeEl, className: string): FakeEl[] {
  return collect(root, (node) => node.className.split(/\s+/).includes(className));
}

export function findByDataset(root: FakeEl, key: string, value: string): FakeEl[] {
  return collect(root, (node) => node.dataset[key] === value);
}

export function makeStorage() {
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

function collect(root: FakeEl, predicate: (node: FakeEl) => boolean): FakeEl[] {
  const out: FakeEl[] = [];
  const walk = (node: FakeEl): void => {
    if (predicate(node)) out.push(node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return out;
}

function querySelector(root: FakeEl, selector: string): FakeEl | null {
  return querySelectorAll(root, selector)[0] ?? null;
}

function querySelectorAll(root: FakeEl, selector: string): FakeEl[] {
  if (selector.startsWith(".")) {
    return findByClassName(root, selector.slice(1));
  }

  const datasetMatch = selector.match(/^\[data-([^=]+)="([^"]+)"\]$/);
  if (datasetMatch) {
    return findByDataset(root, toCamelCase(datasetMatch[1]), datasetMatch[2]);
  }

  return [];
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
