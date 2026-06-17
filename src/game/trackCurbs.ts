import * as THREE from "three";
import { buildOffsetPathPoints } from "./trackOffset";
import { TRACK_RAIL_CONFIG } from "./trackVisualConfig";

export interface CurbBlockPose {
  position: THREE.Vector3;
  rotationY: number;
}

export function buildCurbPathPoints(
  centerline: readonly THREE.Vector3[],
  side: -1 | 1,
  roadWidth: number,
): THREE.Vector3[] {
  return buildOffsetPathPoints(
    centerline,
    side,
    roadWidth * 0.5 + TRACK_RAIL_CONFIG.sideGap,
    {
      y: TRACK_RAIL_CONFIG.centerY,
    },
  );
}

export class ClosedPolylineCurve3 extends THREE.Curve<THREE.Vector3> {
  private readonly points: THREE.Vector3[];
  private readonly segmentLengths: number[];
  private readonly totalLength: number;

  constructor(points: readonly THREE.Vector3[]) {
    super();

    if (points.length < 2) {
      throw new Error("ClosedPolylineCurve3 requires at least two points.");
    }

    this.points = points.map((point) => point.clone());
    this.segmentLengths = this.points.map((point, index) => {
      const next = this.points[(index + 1) % this.points.length];
      return point.distanceTo(next);
    });
    this.totalLength = this.segmentLengths.reduce((sum, length) => sum + length, 0);
  }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    if (this.totalLength <= 0) {
      return target.copy(this.points[0]);
    }

    const wrappedT = t >= 1 ? 1 : THREE.MathUtils.euclideanModulo(t, 1);
    const distance = wrappedT * this.totalLength;
    let cursor = 0;

    for (let i = 0; i < this.points.length; i += 1) {
      const segmentLength = this.segmentLengths[i];

      if (distance <= cursor + segmentLength || i === this.points.length - 1) {
        const alpha = segmentLength > 0 ? (distance - cursor) / segmentLength : 0;
        return target.lerpVectors(this.points[i], this.points[(i + 1) % this.points.length], alpha);
      }

      cursor += segmentLength;
    }

    return target.copy(this.points[0]);
  }
}

export function buildClosedCurbCurve(points: readonly THREE.Vector3[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map((point) => point.clone()),
    true,
    "centripetal",
  );
}

export function getMaxCurbSampleGap(curve: THREE.Curve<THREE.Vector3>, sampleCount: number): number {
  const samples = curve.getSpacedPoints(sampleCount).slice(0, -1);
  let maxGap = 0;

  for (let i = 0; i < samples.length; i += 1) {
    maxGap = Math.max(maxGap, samples[i].distanceTo(samples[(i + 1) % samples.length]));
  }

  return maxGap;
}

export function buildCurbBlockPoses(
  curve: THREE.Curve<THREE.Vector3>,
  lengthMeters: number,
): CurbBlockPose[] {
  const blockCount = Math.max(3, Math.ceil(lengthMeters / TRACK_RAIL_CONFIG.blockSpacing));
  const poses: CurbBlockPose[] = [];

  for (let i = 0; i < blockCount; i += 1) {
    const progress = i / blockCount;
    const position = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress).normalize();

    poses.push({
      position,
      rotationY: Math.atan2(tangent.x, tangent.z),
    });
  }

  return poses;
}

export function getMaxCurbBlockPoseGap(poses: readonly CurbBlockPose[]): number {
  let maxGap = 0;

  for (let i = 0; i < poses.length; i += 1) {
    maxGap = Math.max(
      maxGap,
      poses[i].position.distanceTo(poses[(i + 1) % poses.length].position),
    );
  }

  return maxGap;
}
