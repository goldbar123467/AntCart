import * as THREE from "three";

export interface OffsetPathOptions {
  y?: number;
}

const EPSILON = 1e-6;

export function buildOffsetPathPoints(
  centerline: readonly THREE.Vector3[],
  side: -1 | 1,
  offset: number,
  options: OffsetPathOptions = {},
): THREE.Vector3[] {
  if (centerline.length < 2) {
    return centerline.map((point) => point.clone().setY(options.y ?? point.y));
  }

  return centerline.map((point, index) =>
    buildRawOffsetPoint(centerline, index, side, offset).setY(options.y ?? point.y),
  );
}

function getSideNormal(direction: THREE.Vector3, side: -1 | 1): THREE.Vector3 {
  return new THREE.Vector3(-direction.z * side, 0, direction.x * side);
}

function buildRawOffsetPoint(
  centerline: readonly THREE.Vector3[],
  index: number,
  side: -1 | 1,
  offset: number,
): THREE.Vector3 {
  const previous = centerline[THREE.MathUtils.euclideanModulo(index - 1, centerline.length)];
  const point = centerline[index];
  const next = centerline[(index + 1) % centerline.length];
  const tangent = new THREE.Vector3(next.x - previous.x, 0, next.z - previous.z);

  if (tangent.lengthSq() < EPSILON) {
    tangent.set(0, 0, 1);
  } else {
    tangent.normalize();
  }

  return point.clone().addScaledVector(getSideNormal(tangent, side), offset);
}
