// Sneaker / shoe — a tilted obstacle wall. Sole ~3 long x 1.3 wide; heel rises to ~1.5.
// Built from boxes + cylinders to approximate a real shoe silhouette without external assets.
//
// Factory: createShoe(options?)

import * as THREE from "three";
import { AssetOptions, mat, addMesh, applyScale } from "./types";

export interface ShoeOptions extends AssetOptions {
  upper?: number;
  sole?: number;
  lace?: number;
  /** Slight forward tilt so it looks kicked off (radians). Default 0.08. */
  tilt?: number;
}

export function createShoe(options?: ShoeOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "Shoe";

  const upper = options?.upper ?? 0x2b2b3a; // dark blue-grey fabric
  const sole = options?.sole ?? 0xf5f5f5; // white foam sole
  const lace = options?.lace ?? 0xeeeeee;

  const upperMat = mat(upper, { roughness: 0.85 });
  const soleMat = mat(sole, { roughness: 0.7 });
  const laceMat = mat(lace, { roughness: 0.8 });

  const LEN = 3.0; // x — toe to heel
  const WID = 1.3; // z
  const SOLE_T = 0.35;

  // Sole: a long rounded slab. Use a slightly flattened cylinder laid along X.
  addMesh(
    group,
    new THREE.CylinderGeometry(WID / 2, WID / 2, LEN, 16, 1),
    soleMat,
    "shoeSole",
    [0, SOLE_T / 2, 0],
    [0, 0, Math.PI / 2]
  );
  // Flatten the sole by scaling Y a touch
  group.children[group.children.length - 1].scale.y = SOLE_T / (WID); // squash to sole thickness

  // Toe box — front rounded lump
  const TOE_LEN = 1.0;
  addMesh(
    group,
    new THREE.CylinderGeometry(WID / 2, WID / 2 * 0.95, TOE_LEN, 16, 1),
    upperMat,
    "shoeToe",
    [LEN / 2 - TOE_LEN / 2, SOLE_T + 0.35, 0],
    [0, 0, Math.PI / 2]
  );
  group.children[group.children.length - 1].scale.y = 0.7; // squash toe to a dome

  // Midfoot / vamp — box over the arch
  addMesh(
    group,
    new THREE.BoxGeometry(1.1, 0.7, WID - 0.05),
    upperMat,
    "shoeVamp",
    [0.1, SOLE_T + 0.35, 0]
  );

  // Heel counter — taller box at the back
  const HEEL_H = 1.1;
  addMesh(
    group,
    new THREE.BoxGeometry(0.9, HEEL_H, WID - 0.05),
    upperMat,
    "shoeHeel",
    [-LEN / 2 + 0.45, SOLE_T + HEEL_H / 2, 0]
  );

  // Collar opening — a slightly inset darker block on top of the heel
  addMesh(
    group,
    new THREE.BoxGeometry(0.5, 0.4, WID - 0.3),
    mat(new THREE.Color(upper).multiplyScalar(0.6).getHex(), { roughness: 0.85 }),
    "shoeCollar",
    [-LEN / 2 + 0.4, SOLE_T + HEEL_H - 0.05, 0]
  );

  // Tongue — small box poking up from the laces area
  addMesh(
    group,
    new THREE.BoxGeometry(0.7, 0.5, WID - 0.5),
    upperMat,
    "shoeTongue",
    [0.2, SOLE_T + 0.65, 0],
    [0, 0, -0.15]
  );

  // Laces — a few thin cylinders across the vamp
  const laceCount = 4;
  for (let i = 0; i < laceCount; i++) {
    const x = -0.25 + i * 0.25;
    addMesh(
      group,
      new THREE.CylinderGeometry(0.05, 0.05, WID - 0.4, 8),
      laceMat,
      `shoeLace_${i}`,
      [x, SOLE_T + 0.7, 0],
      [Math.PI / 2, 0, 0]
    );
  }

  // Apply the kicked-off tilt around Z so the toe lifts slightly
  const tilt = options?.tilt ?? 0.08;
  group.rotation.z = tilt;

  return applyScale(group, options);
}
