import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACHIEVEMENTS_STORAGE_KEY,
  createAchievementToaster,
  isUnlocked,
  loadUnlocked,
  tryUnlockAndToast,
  unlock,
} from "../src/ui/hud/achievements";
import {
  findByClassName,
  installFakeDocument,
  makeStorage,
  type FakeEl,
} from "./helpers/fakeDom";

const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = makeStorage();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  (globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage;
});

describe("achievements", () => {
  it("persists each unlocked achievement only once", () => {
    expect(unlock("first-crumb")).toBe(true);
    expect(unlock("first-crumb")).toBe(false);
    expect(isUnlocked("first-crumb")).toBe(true);
    expect(loadUnlocked()).toEqual(["first-crumb"]);
    expect((globalThis as { localStorage: Storage }).localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY)).not.toBeNull();
  });

  it("shows a toast for a newly unlocked known achievement", () => {
    vi.useFakeTimers();
    const restoreDocument = installFakeDocument();
    const toaster = createAchievementToaster();

    expect(tryUnlockAndToast(toaster, "mandible")).toBe(true);
    const root = toaster.element as unknown as FakeEl;
    const title = findByClassName(root, "ac-toast__title")[0];
    expect(root.classList.contains("is-visible")).toBe(true);
    expect(title.textContent).toBe("Mandible");

    vi.advanceTimersByTime(4000);
    expect(root.classList.contains("is-visible")).toBe(false);
    restoreDocument();
  });

  it("does not show a duplicate toast for an already unlocked achievement", () => {
    const restoreDocument = installFakeDocument();
    const toaster = createAchievementToaster();
    expect(tryUnlockAndToast(toaster, "first-crumb")).toBe(true);
    toaster.hide();
    expect(tryUnlockAndToast(toaster, "first-crumb")).toBe(false);
    expect((toaster.element as unknown as FakeEl).classList.contains("is-visible")).toBe(false);
    restoreDocument();
  });
});
