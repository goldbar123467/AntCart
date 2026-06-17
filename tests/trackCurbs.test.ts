import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  buildCurbBlockPoses,
  buildClosedCurbCurve,
  buildCurbPathPoints,
  ClosedPolylineCurve3,
  getMaxCurbBlockPoseGap,
  getMaxCurbSampleGap,
} from "../src/game/trackCurbs";
import { TRACK_RAIL_CONFIG } from "../src/game/trackVisualConfig";

describe("track curbs", () => {
  it("builds a dense closed offset curve instead of separated straight blocks", () => {
    const centerline = [
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(20, 0.05, 0),
      new THREE.Vector3(20, 0.05, 20),
      new THREE.Vector3(0, 0.05, 20),
    ];
    const curbPoints = buildCurbPathPoints(centerline, 1, 12);
    const curve = buildClosedCurbCurve(curbPoints);

    expect(curbPoints).toHaveLength(centerline.length);
    expect(curbPoints.every((point) => point.y > 0.1)).toBe(true);
    expect(curve).toBeInstanceOf(ClosedPolylineCurve3);
    expect(curve.getPoint(0).distanceTo(curbPoints[0])).toBeLessThan(0.001);
    expect(curve.getPoint(1).distanceTo(curbPoints[0])).toBeLessThan(0.001);
    expect(getMaxCurbSampleGap(curve, 80)).toBeLessThan(1.2);
  });

  it("can still derive debug block poses from the continuous curve tangent", () => {
    const centerline = [
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(20, 0.05, 0),
      new THREE.Vector3(20, 0.05, 20),
      new THREE.Vector3(0, 0.05, 20),
    ];
    const curbPoints = buildCurbPathPoints(centerline, -1, 12);
    const curve = buildClosedCurbCurve(curbPoints);
    const poses = buildCurbBlockPoses(curve, 80);

    expect(poses.length).toBeGreaterThan(60);
    expect(getMaxCurbBlockPoseGap(poses)).toBeLessThan(TRACK_RAIL_CONFIG.blockLength);
    expect(new Set(poses.map((pose) => pose.rotationY.toFixed(2))).size).toBeGreaterThan(4);
  });
});
