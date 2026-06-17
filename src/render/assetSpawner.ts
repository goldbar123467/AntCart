// Spawn placed-asset records into the Three.js scene using the procedural asset
// factories from `src/assets`. Solid pieces also get static CANNON colliders so
// the kart actually bumps into couches, tables, boxes, etc.
//
// Kept separate from `assetPlacement.ts` (pure data) so the placement logic stays
// unit-testable without a DOM/Three.js. This module owns the Three.js + cannon-es
// side.

import * as THREE from "three";
import * as CANNON from "cannon-es";
import {
  createBaseboard,
  createBookStack,
  createCardboardBox,
  createCerealCrumbs,
  createCoffeeTable,
  createCouch,
  createFloorLamp,
  createPencil,
  createRug,
  createShoe,
  createToyBlock,
  createTvOnStand,
  createWoodenChair,
} from "../assets";
import type { PlacedAsset } from "../game/assetPlacement";

type Factory = (options?: Record<string, unknown>) => THREE.Group;

const FACTORIES: Record<string, Factory> = {
  couch: createCouch as Factory,
  coffeeTable: createCoffeeTable as Factory,
  woodenChair: createWoodenChair as Factory,
  bookStack: createBookStack as Factory,
  shoe: createShoe as Factory,
  toyBlock: createToyBlock as Factory,
  pencil: createPencil as Factory,
  cardboardBox: createCardboardBox as Factory,
  floorLamp: createFloorLamp as Factory,
  rug: createRug as Factory,
  tvOnStand: createTvOnStand as Factory,
  baseboard: createBaseboard as Factory,
  cerealCrumbs: createCerealCrumbs as Factory,
};

/** Collider footprint per kind (x = width, y = height, z = depth) in meters. */
const COLLIDER_SIZE: Partial<Record<string, [number, number, number]>> = {
  couch: [7.0, 2.2, 3.0],
  coffeeTable: [4.0, 1.2, 2.0],
  woodenChair: [1.6, 1.0, 1.6],
  bookStack: [1.8, 1.8, 1.2],
  tvOnStand: [6.0, 5.2, 2.1],
  shoe: [3.0, 1.5, 1.3],
  toyBlock: [1.5, 1.5, 1.5],
  cardboardBox: [2.5, 2.5, 2.5],
  baseboard: [12.0, 1.0, 0.3],
};

export interface SpawnOptions {
  scene: THREE.Scene;
  physicsWorld: CANNON.World;
  staticPhysicsMaterial: CANNON.Material;
}

export interface SpawnResult {
  groups: THREE.Group[];
  colliderBodies: CANNON.Body[];
}

/**
 * Build and add every placed asset to the scene. Returns the created groups and
 * physics bodies (for cleanup / debugging). Deterministic given the placements.
 */
export function spawnPlacedAssets(
  placements: readonly PlacedAsset[],
  opts: SpawnOptions,
): SpawnResult {
  const groups: THREE.Group[] = [];
  const colliderBodies: CANNON.Body[] = [];

  for (const placed of placements) {
    const factory = FACTORIES[placed.kind];
    if (!factory) continue;

    const group = factory({
      seed: placed.seed,
      scale: placed.scale,
      ...placed.options,
    });
    group.name = `asset:${placed.kind}`;
    group.position.set(placed.x, placed.y ?? 0, placed.z);
    group.rotation.y = placed.rotationY;
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    opts.scene.add(group);
    groups.push(group);

    if (placed.collidable) {
      const body = makeCollider(placed, opts.staticPhysicsMaterial);
      if (body) {
        opts.physicsWorld.addBody(body);
        colliderBodies.push(body);
      }
    }
  }

  return { groups, colliderBodies };
}

function makeCollider(
  placed: PlacedAsset,
  material: CANNON.Material,
): CANNON.Body | null {
  const size = COLLIDER_SIZE[placed.kind];
  if (!size) return null;
  // Scale collider dimensions to match the visual (assets are scaled per-placement
  // for the wacky human-house proportions).
  const w = size[0] * placed.scale;
  const h = size[1] * placed.scale;
  const d = size[2] * placed.scale;
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    material,
  });
  body.addShape(new CANNON.Box(new CANNON.Vec3(w * 0.5, h * 0.5, d * 0.5)));
  body.position.set(placed.x, h * 0.5, placed.z);
  if (placed.rotationY !== 0) {
    body.quaternion.setFromEuler(0, placed.rotationY, 0);
  }
  return body;
}
