import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  buildTrackLayout,
  validateTrackLayout,
} from "../src/game/trackTemplates";

function boundsOf(points: readonly { x: number; z: number }[]): {
  width: number;
  depth: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  return {
    width: maxX - minX,
    depth: maxZ - minZ,
    minX,
    maxX,
    minZ,
    maxZ,
  };
}

function countAlteredSides(layout: ReturnType<typeof buildTrackLayout>): number {
  const curve = new THREE.CatmullRomCurve3(layout.points, true, "catmullrom", layout.tension);
  const samples = curve.getSpacedPoints(320).slice(0, -1);
  const bounds = boundsOf(samples);
  const sideBandX = bounds.width * 0.24;
  const sideBandZ = bounds.depth * 0.24;

  const bottom = samples.filter((point) => point.z <= bounds.minZ + sideBandZ);
  const top = samples.filter((point) => point.z >= bounds.maxZ - sideBandZ);
  const left = samples.filter((point) => point.x <= bounds.minX + sideBandX);
  const right = samples.filter((point) => point.x >= bounds.maxX - sideBandX);

  const sideIsAltered = (points: readonly THREE.Vector3[], axis: "x" | "z"): boolean => {
    const sideBounds = boundsOf(points);
    const crossAxisSpan = axis === "x" ? sideBounds.depth : sideBounds.width;
    const longAxisSpan = axis === "x" ? sideBounds.width : sideBounds.depth;

    return longAxisSpan > (axis === "x" ? bounds.width : bounds.depth) * 0.3
      && crossAxisSpan > (axis === "x" ? bounds.depth : bounds.width) * 0.14;
  };

  return [
    sideIsAltered(bottom, "x"),
    sideIsAltered(top, "x"),
    sideIsAltered(left, "z"),
    sideIsAltered(right, "z"),
  ].filter(Boolean).length;
}

function silhouette(layout: ReturnType<typeof buildTrackLayout>): number[] {
  const curve = new THREE.CatmullRomCurve3(layout.points, true, "catmullrom", layout.tension);
  const samples = curve.getSpacedPoints(480).slice(0, -1);
  const center = samples.reduce(
    (sum, point) => sum.add(point),
    new THREE.Vector3(),
  ).multiplyScalar(1 / samples.length);
  const bins = Array.from({ length: 24 }, () => 0);

  for (const point of samples) {
    const angle = Math.atan2(point.z - center.z, point.x - center.x);
    const bin = THREE.MathUtils.euclideanModulo(
      Math.floor(((angle + Math.PI) / (Math.PI * 2)) * bins.length),
      bins.length,
    );
    bins[bin] = Math.max(bins[bin], Math.hypot(point.x - center.x, point.z - center.z));
  }

  const maxRadius = Math.max(...bins);
  return bins.map((value) => value / maxRadius);
}

function silhouetteDifference(a: readonly number[], b: readonly number[]): number {
  return a.reduce((total, value, index) => total + Math.abs(value - b[index]), 0) / a.length;
}

describe("track templates", () => {
  it("builds a deterministic long non-oval arcade layout with named driving sections", () => {
    const layout = buildTrackLayout("toy-pretzel", 12345);
    const duplicate = buildTrackLayout("toy-pretzel", 12345);
    const different = buildTrackLayout("toy-pretzel", 54321);
    const bounds = boundsOf(layout.points);
    const sectionKinds = new Set(layout.sections.map((section) => section.kind));

    expect(layout.points.map((point) => point.toArray())).toEqual(
      duplicate.points.map((point) => point.toArray()),
    );
    expect(layout.points.map((point) => point.toArray())).not.toEqual(
      different.points.map((point) => point.toArray()),
    );
    expect(layout.roadWidth).toBe(12);
    expect(layout.points.length).toBeGreaterThanOrEqual(11);
    expect(layout.points.length).toBeGreaterThanOrEqual(13);
    expect(layout.lapLengthMeters).toBeGreaterThanOrEqual(880);
    expect(layout.lapLengthMeters).toBeLessThanOrEqual(930);
    expect(bounds.width / bounds.depth).toBeGreaterThan(1.2);
    expect(bounds.width / bounds.depth).toBeLessThan(1.65);
    expect(layout.sideMotifIds).toHaveLength(4);
    expect(layout.sideMotifIds).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^bottom-/),
        expect.stringMatching(/^right-/),
        expect.stringMatching(/^top-/),
        expect.stringMatching(/^left-/),
      ]),
    );
    expect(countAlteredSides(layout)).toBeGreaterThan(2);
    expect(Array.from(sectionKinds)).toEqual(
      expect.arrayContaining(["straight", "sweeper", "hairpin", "chicane", "shortcut", "doubleApex"]),
    );
  });

  it("keeps non-adjacent road sections far enough apart to avoid visual rail crossings", () => {
    const layout = buildTrackLayout("toy-pretzel", 12345);
    const curve = new THREE.CatmullRomCurve3(layout.points, true, "catmullrom", layout.tension);
    const samples = curve.getSpacedPoints(240).slice(0, -1);
    let nearestNonAdjacent = Infinity;

    for (let i = 0; i < samples.length; i += 1) {
      for (let j = i + 1; j < samples.length; j += 1) {
        const circularDistance = Math.min(j - i, samples.length - (j - i));

        if (circularDistance < 18) {
          continue;
        }

        nearestNonAdjacent = Math.min(
          nearestNonAdjacent,
          Math.hypot(samples[i].x - samples[j].x, samples[i].z - samples[j].z),
        );
      }
    }

    expect(nearestNonAdjacent).toBeGreaterThan(layout.roadWidth * 1.45);
  });

  it("rejects seeds that would create tight corners, crossings, or broken offset curbs", () => {
    const variantIds = new Set<string>();
    const silhouettes: number[][] = [];

    for (let seed = 1; seed <= 40; seed += 1) {
      const layout = buildTrackLayout("toy-pretzel", seed);
      const validation = validateTrackLayout(layout);

      variantIds.add(layout.variantId);
      silhouettes.push(silhouette(layout));
      expect(validation.valid, `seed ${seed}: ${validation.reasons.join(", ")}`).toBe(true);
      expect(validation.centerlineIntersections).toBe(0);
      expect(validation.curbIntersections).toBe(0);
      expect(validation.maxTurnDegrees).toBeLessThanOrEqual(132);
      expect(validation.minControlSegmentLength).toBeGreaterThanOrEqual(42);
      expect(validation.minCenterlineClearance).toBeGreaterThanOrEqual(layout.roadWidth * 4.5);
      expect(validation.minCurbClearance).toBeGreaterThanOrEqual(layout.roadWidth * 2.5);
      expect(countAlteredSides(layout), `seed ${seed} variant ${layout.variantId}`).toBeGreaterThan(2);
    }

    expect(variantIds.size).toBeGreaterThanOrEqual(4);
    expect(silhouetteDifference(silhouettes[0], silhouettes[1])).toBeGreaterThan(0.08);
    expect(silhouetteDifference(silhouettes[1], silhouettes[2])).toBeGreaterThan(0.08);
    expect(silhouetteDifference(silhouettes[2], silhouettes[3])).toBeGreaterThan(0.08);
  }, 15_000);
});
