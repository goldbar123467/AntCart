import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildRoadSurfaceGeometry } from "../src/game/trackSurface";

describe("track surface geometry", () => {
  it("builds one continuous closed road strip instead of separate curve slabs", () => {
    const points = [
      new THREE.Vector3(0, 0.05, -20),
      new THREE.Vector3(24, 0.05, -8),
      new THREE.Vector3(30, 0.05, 18),
      new THREE.Vector3(-18, 0.05, 24),
      new THREE.Vector3(-30, 0.05, -8),
    ];
    const geometry = buildRoadSurfaceGeometry(points, 12);
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const index = geometry.getIndex();

    expect(positions.count).toBe(points.length * 2);
    expect(normals.count).toBe(points.length * 2);
    expect(index?.count).toBe(points.length * 6);

    if (!index) {
      throw new Error("Expected indexed road geometry.");
    }

    const closingIndices = Array.from(index.array.slice(index.count - 6, index.count));
    expect(closingIndices).toContain(0);
    expect(closingIndices).toContain(1);

    const a = getVertex(positions, Number(index.array[0]));
    const b = getVertex(positions, Number(index.array[1]));
    const c = getVertex(positions, Number(index.array[2]));
    const faceNormal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a));

    expect(faceNormal.y).toBeGreaterThan(0);

    for (let vertexIndex = 0; vertexIndex < normals.count; vertexIndex += 1) {
      expect(normals.getY(vertexIndex)).toBe(1);
    }
  });
});

function getVertex(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, index: number): THREE.Vector3 {
  return new THREE.Vector3(attribute.getX(index), attribute.getY(index), attribute.getZ(index));
}
