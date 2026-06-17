// Achievement toast system for AntCarts — Wave 5.
//
// Two concerns live here:
//  1. A persistent unlocked-set (localStorage key "antcarts:achievements")
//     with `loadUnlocked()`, `unlock(id) -> boolean` (true if newly unlocked),
//     and `isUnlocked(id)`. Pure TS, SSR-safe, mirrors the wallet pattern.
//  2. A `createAchievementToaster()` DOM overlay: a sliding-in toast
//     (top-right) showing icon + title + desc, auto-hiding after 4s. Built
//     programmatically (createElement + textContent) so it's unit-testable
//     with a tiny document stub — no jsdom. No Three.js.
//
// Ant + house themed using the track palette (CSS vars from style.css).

const ACHIEVEMENTS_KEY = "antcarts:achievements";

/** A single achievement definition in the catalog. */
export interface Achievement {
  /** Stable id; persisted in the unlocked set. */
  id: string;
  /** Display title. */
  title: string;
  /** Short description shown on the toast. */
  desc: string;
  /** Emoji / glyph shown on the toast. */
  icon: string;
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function getStorage(): StorageLike | undefined {
  try {
    const storage = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (typeof storage === "undefined" || storage === null) {
      return undefined;
    }
    return storage;
  } catch {
    return undefined;
  }
}

/**
 * The achievement catalog. Ant + house themed. The ids are stable strings the
 * host unlocks at gameplay milestones (race finish, powerup use, etc.).
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "first-crumb",
    title: "First Crumb",
    desc: "Finish your first race.",
    icon: "🍞",
  },
  {
    id: "sugar-rush",
    title: "Sugar Rush",
    desc: "Use a Sugar Cube Boost.",
    icon: "🧊",
  },
  {
    id: "mandible",
    title: "Mandible",
    desc: "Win 1st place.",
    icon: "🏆",
  },
  {
    id: "hoarder",
    title: "Hoarder",
    desc: "Own 5 store items.",
    icon: "📦",
  },
  {
    id: "formic-defender",
    title: "Formic Defender",
    desc: "Activate a Leaf Shield.",
    icon: "🍃",
  },
  {
    id: "pheromone-trail",
    title: "Pheromone Trail",
    desc: "Race 3 times.",
    icon: "🧲",
  },
];

/** Lookup an achievement by id. Returns `undefined` for unknown ids. */
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Read the unlocked-set from localStorage. Returns an empty array when unset/invalid. */
export function loadUnlocked(): string[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((id): id is string => typeof id === "string")
      .filter((id, index, arr) => arr.indexOf(id) === index);
  } catch {
    return [];
  }
}

/** Persist the unlocked-set to localStorage (no-op when storage is unavailable). */
function saveUnlocked(ids: string[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids));
  } catch {
    // Quota exceeded or storage disabled — ignore.
  }
}

/** Whether `id` is in the persisted unlocked-set. */
export function isUnlocked(id: string): boolean {
  return loadUnlocked().includes(id);
}

/**
 * Mark `id` as unlocked. Returns `true` if this is a NEW unlock (and
 * persists it), or `false` if it was already unlocked (no mutation).
 */
export function unlock(id: string): boolean {
  const unlocked = loadUnlocked();
  if (unlocked.includes(id)) {
    return false;
  }
  unlocked.push(id);
  saveUnlocked(unlocked);
  return true;
}

/** localStorage key used by the unlocked-set (exported for tests/inspection). */
export const ACHIEVEMENTS_STORAGE_KEY = ACHIEVEMENTS_KEY;

// --- Toast overlay ---

function makeEl<T extends HTMLElement = HTMLDivElement>(
  tag: string,
  className?: string,
  textContent?: string,
): T {
  const node = document.createElement(tag) as T;
  if (className) {
    node.className = className;
  }
  if (textContent !== undefined) {
    node.textContent = textContent;
  }
  return node;
}

export interface AchievementToast {
  /** Achievement to display. */
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export interface AchievementToaster {
  /** The root DOM element (append to document.body). */
  element: HTMLDivElement;
  /** Show a toast for the given achievement. Auto-hides after 4s. */
  show(toast: AchievementToast): void;
  /** Hide any visible toast immediately. */
  hide(): void;
}

/**
 * Build an achievement toaster overlay. The toast slides in from the top-right,
 * shows an icon + title + desc, and auto-hides after 4 seconds. Repeated
 * `show()` calls replace the current toast and reset the timer.
 */
export function createAchievementToaster(): AchievementToaster {
  const element = makeEl<HTMLDivElement>("div", "ac-toast");
  element.setAttribute("aria-live", "polite");
  element.setAttribute("role", "status");

  const icon = makeEl<HTMLSpanElement>("span", "ac-toast__icon", "·");
  const body = makeEl<HTMLDivElement>("div", "ac-toast__body");
  const eyebrow = makeEl<HTMLSpanElement>("span", "ac-toast__eyebrow", "ACHIEVEMENT UNLOCKED");
  const title = makeEl<HTMLSpanElement>("span", "ac-toast__title", "—");
  const desc = makeEl<HTMLSpanElement>("span", "ac-toast__desc", "");
  body.appendChild(eyebrow);
  body.appendChild(title);
  body.appendChild(desc);

  element.appendChild(icon);
  element.appendChild(body);

  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  function show(toast: AchievementToast): void {
    icon.textContent = toast.icon;
    title.textContent = toast.title;
    desc.textContent = toast.desc;
    element.classList.add("is-visible");
    if (hideTimer !== undefined) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
      element.classList.remove("is-visible");
      hideTimer = undefined;
    }, 4000);
  }

  function hide(): void {
    if (hideTimer !== undefined) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
    element.classList.remove("is-visible");
  }

  return { element, show, hide };
}

/**
 * Convenience helper for the host: try to unlock `id`, and if it was newly
 * unlocked, show its toast on the provided toaster. No-op for unknown ids or
 * already-unlocked achievements.
 */
export function tryUnlockAndToast(
  toaster: AchievementToaster,
  id: string,
): boolean {
  if (!unlock(id)) {
    return false;
  }
  const def = getAchievement(id);
  if (!def) {
    return true;
  }
  toaster.show(def);
  return true;
}
