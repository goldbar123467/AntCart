import * as THREE from "three";
import { createGrassMaterial } from "../materials/grassMaterial";

const FIELD_RADIUS = 8.5;
const BLADE_COUNT = 11500;

export type GrassField = {
  mesh: THREE.InstancedMesh;
  material: THREE.ShaderMaterial;
};

export function createGrassField(): GrassField {
  const geometry = createBladeGeometry();
  const offsets = new Float32Array(BLADE_COUNT * 3);
  const scales = new Float32Array(BLADE_COUNT);
  const angles = new Float32Array(BLADE_COUNT);
  const phases = new Float32Array(BLADE_COUNT);
  const random = createRandom(417);

  for (let i = 0; i < BLADE_COUNT; i += 1) {
    const radius = Math.sqrt(random()) * FIELD_RADIUS;
    const theta = random() * Math.PI * 2;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    offsets[i * 3] = x;
    offsets[i * 3 + 1] = 0;
    offsets[i * 3 + 2] = z;
    scales[i] = THREE.MathUtils.lerp(0.55, 1.35, random());
    angles[i] = random() * Math.PI * 2;
    phases[i] = random() * Math.PI * 2;
  }

  geometry.setAttribute("instanceOffset", new THREE.InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute("instanceScale", new THREE.InstancedBufferAttribute(scales, 1));
  geometry.setAttribute("instanceAngle", new THREE.InstancedBufferAttribute(angles, 1));
  geometry.setAttribute("instancePhase", new THREE.InstancedBufferAttribute(phases, 1));

  const material = createGrassMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, BLADE_COUNT);
  mesh.frustumCulled = false;

  return { mesh, material };
}

function createBladeGeometry(): THREE.InstancedBufferGeometry {
  const segments = 5;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const halfWidth = THREE.MathUtils.lerp(0.036, 0.004, t);
    positions.push(-halfWidth, t, 0, halfWidth, t, 0);
    uvs.push(0, t, 1, t);
  }

  for (let i = 0; i < segments; i += 1) {
    const row = i * 2;
    indices.push(row, row + 1, row + 2, row + 1, row + 3, row + 2);
  }

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function createRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
