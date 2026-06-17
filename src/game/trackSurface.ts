import * as THREE from "three";
import { buildOffsetPathPoints } from "./trackOffset";

export function buildRoadSurfaceGeometry(
  centerline: readonly THREE.Vector3[],
  roadWidth: number,
): THREE.BufferGeometry {
  const vertexCount = centerline.length * 2;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];
  const distances = getCumulativeDistances(centerline);
  const totalDistance = distances[distances.length - 1] + centerline.at(-1)!.distanceTo(centerline[0]);
  const leftEdge = buildOffsetPathPoints(centerline, 1, roadWidth * 0.5, {
    y: 0.055,
  });
  const rightEdge = buildOffsetPathPoints(centerline, -1, roadWidth * 0.5, {
    y: 0.055,
  });

  for (let i = 0; i < centerline.length; i += 1) {
    const left = leftEdge[i];
    const right = rightEdge[i];
    const leftIndex = i * 2;
    const rightIndex = leftIndex + 1;

    writeVertex(positions, leftIndex, left.x, left.y, left.z);
    writeVertex(positions, rightIndex, right.x, right.y, right.z);
    writeVertex(normals, leftIndex, 0, 1, 0);
    writeVertex(normals, rightIndex, 0, 1, 0);
    uvs[leftIndex * 2] = distances[i] / Math.max(1, totalDistance);
    uvs[leftIndex * 2 + 1] = 0;
    uvs[rightIndex * 2] = distances[i] / Math.max(1, totalDistance);
    uvs[rightIndex * 2 + 1] = 1;

    const nextLeftIndex = ((i + 1) % centerline.length) * 2;
    const nextRightIndex = nextLeftIndex + 1;
    indices.push(leftIndex, nextLeftIndex, rightIndex);
    indices.push(rightIndex, nextLeftIndex, nextRightIndex);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function getCumulativeDistances(points: readonly THREE.Vector3[]): number[] {
  const distances = [0];

  for (let i = 1; i < points.length; i += 1) {
    distances.push(distances[i - 1] + points[i - 1].distanceTo(points[i]));
  }

  return distances;
}

function writeVertex(
  attribute: Float32Array,
  vertexIndex: number,
  x: number,
  y: number,
  z: number,
): void {
  const offset = vertexIndex * 3;
  attribute[offset] = x;
  attribute[offset + 1] = y;
  attribute[offset + 2] = z;
}
