// Shared types and helpers for ant-kart-racing procedural assets.
//
// Scale reference (1 Three.js unit = 1 arcade gameplay meter):
//   - Kart: 1.4 wide x 2.2 long x 1.2 tall
//   - Standard track width: 12 units
//   - Furniture is OVERSIZED relative to the kart because the racer is ant-sized.
//     A couch, table, or shoe should read as terrain/wall/cover, not a prop.

import * as THREE from "three";

/** Common options every asset factory should accept. */
export interface AssetOptions {
  /** Optional base color override (hex number, e.g. 0x8b5a2b). */
  color?: number;
  /** Uniform scale multiplier applied to the whole asset. Default 1. */
  scale?: number;
  /** Optional seed for deterministic procedural variation. */
  seed?: number;
}

/** Tiny deterministic PRNG so seeded assets reproduce identically. */
export class Rng {
  private state: number;
  constructor(seed = 1337) {
    this.state = seed >>> 0 || 1;
  }
  /** float in [0, 1) */
  next(): number {
    // xorshift32
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    this.state >>>= 0;
    return this.state / 0x100000000;
  }
  /** float in [min, max) */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  /** pick an element */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

/** Standard PBR-ish material used across assets. */
export function mat(
  color: number,
  opts: { roughness?: number; metalness?: number; flatShading?: boolean } = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.0,
    flatShading: opts.flatShading ?? false,
  });
}

/**
 * Apply an options-driven uniform scale to a group and return it.
 * Centralizes the scale handling so each factory stays tiny.
 */
export function applyScale(group: THREE.Group, options?: AssetOptions): THREE.Group {
  const s = options?.scale ?? 1;
  if (s !== 1) group.scale.setScalar(s);
  return group;
}

/**
 * Attach a named, shadow-casting mesh to a parent and return it.
 * Keeps factory code readable and consistent.
 */
export function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
