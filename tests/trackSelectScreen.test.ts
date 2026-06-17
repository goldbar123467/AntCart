import { describe, expect, it, vi } from "vitest";
import { createTrackSelectScreen } from "../src/ui/screens/trackSelectScreen";
import {
  findByClassName,
  findByDataset,
  installFakeDocument,
  type FakeEl,
} from "./helpers/fakeDom";

describe("createTrackSelectScreen", () => {
  it("renders one card per variant passed to setVariants", () => {
    const restore = installFakeDocument();
    const screen = createTrackSelectScreen({
      onSelect: () => {},
      onBack: () => {},
    });

    screen.setVariants([
      { id: "blocked-center-kinks", name: "Blocked Center Kinks", kind: "switchback" },
      { id: "right-heavy-sweep", name: "Right Heavy Sweep", kind: "wide-S" },
    ]);

    expect(findByClassName(screen as unknown as FakeEl, "ac-track-card")).toHaveLength(2);
    expect(findByClassName(screen as unknown as FakeEl, "ac-track-card__name")[0].textContent)
      .toBe("Blocked Center Kinks");
    restore();
  });

  it("selects a variant from the Race button or the card body", () => {
    const restore = installFakeDocument();
    const onSelect = vi.fn();
    const screen = createTrackSelectScreen({
      onSelect,
      onBack: () => {},
    }) as unknown as FakeEl;

    (screen as unknown as ReturnType<typeof createTrackSelectScreen>).setVariants([
      { id: "offset-peanut", name: "Offset Peanut", kind: "kidney" },
    ]);

    findByDataset(screen, "action", "race")[0].click();
    findByDataset(screen, "variantId", "offset-peanut")[0].click();

    expect(onSelect).toHaveBeenCalledWith("offset-peanut");
    expect(onSelect).toHaveBeenCalledTimes(2);
    restore();
  });

  it("fires the back callback", () => {
    const restore = installFakeDocument();
    const onBack = vi.fn();
    const screen = createTrackSelectScreen({
      onSelect: () => {},
      onBack,
    }) as unknown as FakeEl;

    findByDataset(screen, "action", "back")[0].click();
    expect(onBack).toHaveBeenCalledTimes(1);
    restore();
  });
});
