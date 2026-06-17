import { describe, expect, it } from "vitest";
import { getRoomSetPieces } from "../src/game/setPieces";

describe("room set pieces", () => {
  it("keeps the room free of backdrop props and decorative blocks", () => {
    expect(getRoomSetPieces()).toEqual([]);
  });
});
