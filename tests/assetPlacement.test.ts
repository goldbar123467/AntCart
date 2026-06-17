import { describe, expect, it } from "vitest";
import {
  computeAssetPlacements,
  distanceToTrack,
  type TrackInfo,
} from "../src/game/assetPlacement";

// A simple oval-ish track inside the 460x320 room, matching the game's scale.
const oval: TrackInfo = {
  points: Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2;
    return { x: Math.cos(a) * 150, z: Math.sin(a) * 100 };
  }),
  roadWidth: 12,
  lapLengthMeters: 800,
};

describe("asset placement", () => {
  it("is deterministic: same seed -> identical placements", () => {
    const a = computeAssetPlacements(oval, 42);
    const b = computeAssetPlacements(oval, 42);
    expect(a).toEqual(b);
  });

  it("only adds random scatter when explicitly requested", () => {
    const clean = computeAssetPlacements(oval, 1);
    const looseA = computeAssetPlacements(oval, 1, { scatterCount: 4 });
    const looseB = computeAssetPlacements(oval, 2, { scatterCount: 4 });
    const landmarkKinds = ["baseboard", "couch", "coffeeTable", "rug", "floorLamp", "bookStack", "woodenChair", "pencil", "tvOnStand"];
    const cleanScatter = clean.filter((p) => !landmarkKinds.includes(p.kind));
    const aScatter = looseA.filter((p) => !landmarkKinds.includes(p.kind));
    const bScatter = looseB.filter((p) => !landmarkKinds.includes(p.kind));

    expect(cleanScatter).toHaveLength(0);
    expect(aScatter.length).toBeGreaterThan(0);
    const same = aScatter.every((p, i) =>
      bScatter[i] && p.x === bScatter[i].x && p.z === bScatter[i].z,
    );
    expect(same).toBe(false);
  });

  it("keeps every solid (collidable) asset off the road surface", () => {
    const placements = computeAssetPlacements(oval, 7);
    for (const p of placements) {
      if (!p.collidable) continue;
      if (p.kind === "baseboard") continue; // wall trim, expected near walls not road
      const d = distanceToTrack(p.x, p.z, oval);
      // roadClearance (9) + half footprint; allow the configured clearance band.
      expect(d).toBeGreaterThanOrEqual(9);
    }
  });

  it("includes landmark pieces and tiled baseboards every seed", () => {
    const placements = computeAssetPlacements(oval, 99);
    const kinds = new Set(placements.map((p) => p.kind));
    expect(kinds.has("couch")).toBe(true);
    expect(kinds.has("rug")).toBe(true);
    expect(kinds.has("coffeeTable")).toBe(true);
    expect(kinds.has("bookStack")).toBe(true);
    expect(kinds.has("floorLamp")).toBe(true);
    expect(kinds.has("woodenChair")).toBe(true);
    expect(kinds.has("tvOnStand")).toBe(true);
    expect(kinds.has("baseboard")).toBe(true);
    const baseboardCount = placements.filter((p) => p.kind === "baseboard").length;
    // 4 walls, room is 460x320, segments of 12 -> dozens of boards.
    expect(baseboardCount).toBeGreaterThan(40);
  });

  it("places one intentional pencil on the coffee table", () => {
    const placements = computeAssetPlacements(oval, 99);
    const pencils = placements.filter((p) => p.kind === "pencil");
    const table = placements.find((p) => p.kind === "coffeeTable");

    expect(pencils).toHaveLength(1);
    expect(table).toBeDefined();
    expect(pencils[0].y).toBeGreaterThan(4.5);
    expect(pencils[0].scale).toBeLessThan(3.5);
    expect(Math.abs(pencils[0].x - table!.x)).toBeLessThan(4);
    expect(Math.abs(pencils[0].z - table!.z)).toBeLessThan(4);
  });

  it("keeps books and TV staged on the central rug zone", () => {
    const placements = computeAssetPlacements(oval, 99);
    const rug = placements.find((p) => p.kind === "rug");
    const books = placements.find((p) => p.kind === "bookStack");
    const tv = placements.find((p) => p.kind === "tvOnStand");

    expect(rug).toBeDefined();
    expect(books).toBeDefined();
    expect(tv).toBeDefined();
    expect(Math.abs(books!.x - rug!.x)).toBeLessThan(35);
    expect(Math.abs(books!.z - rug!.z)).toBeLessThan(35);
    expect(Math.abs(tv!.x - rug!.x)).toBeLessThan(10);
    expect(Math.abs(tv!.z - rug!.z)).toBeLessThan(45);
    expect(tv!.rotationY).toBeCloseTo(Math.PI);
    expect(tv!.collidable).toBe(true);
    expect(tv!.options?.hidePlant).toBe(true);
  });

  it("keeps scatter pieces inside the room bounds", () => {
    const placements = computeAssetPlacements(oval, 123);
    for (const p of placements) {
      if (p.kind === "baseboard") continue;
      expect(Math.abs(p.x)).toBeLessThanOrEqual(230);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(160);
    }
  });
});
