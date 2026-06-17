// Rug — a flat rectangular area rug that sits on the floor and visually defines a
// section of the track (or acts as the track surface itself). Built from flat
// BoxGeometry layers: base + contrasting border + inner medallion panel.
//
// Factory: createRug(options?)

import * as THREE from "three";
import { AssetOptions, mat, addMesh, applyScale } from "./types";

export interface RugOptions extends AssetOptions {
  /** Long axis (x) length. Default 8. */
  length?: number;
  /** Depth (z) length. Default 6. */
  depth?: number;
  field?: number;
  border?: number;
  medallion?: number;
}

export function createRug(options?: RugOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "Rug";

  const LONG = options?.length ?? 8;
  const DEEP = options?.depth ?? 6;
  const field = options?.field ?? 0x7a3b2e; // deep rust
  const border = options?.border ?? 0x1f3a5f; // navy
  const medallion = options?.medallion ?? 0xe0b04a; // gold

  const fieldMat = mat(field, { roughness: 1.0, metalness: 0.0 });
  const borderMat = mat(border, { roughness: 1.0, metalness: 0.0 });
  const medMat = mat(medallion, { roughness: 1.0, metalness: 0.0 });

  const T = 0.04; // rug thickness

  // Field base
  addMesh(group, new THREE.BoxGeometry(LONG, T, DEEP), fieldMat, "rugField", [0, T / 2, 0]);

  // Border — four flat bars slightly above the field
  const BW = 0.5; // border width
  const lift = T / 2 + 0.002;
  addMesh(
    group,
    new THREE.BoxGeometry(LONG, T * 0.5, BW),
    borderMat,
    "rugBorderTop",
    [0, lift, -DEEP / 2 + BW / 2]
  );
  addMesh(
    group,
    new THREE.BoxGeometry(LONG, T * 0.5, BW),
    borderMat,
    "rugBorderBottom",
    [0, lift, DEEP / 2 - BW / 2]
  );
  addMesh(
    group,
    new THREE.BoxGeometry(BW, T * 0.5, DEEP - 2 * BW),
    borderMat,
    "rugBorderLeft",
    [-LONG / 2 + BW / 2, lift, 0]
  );
  addMesh(
    group,
    new THREE.BoxGeometry(BW, T * 0.5, DEEP - 2 * BW),
    borderMat,
    "rugBorderRight",
    [LONG / 2 - BW / 2, lift, 0]
  );

  // Inner medallion — a diamond (rotated square) + a center ellipse
  const innerLong = LONG - 2 * BW - 0.4;
  const innerDeep = DEEP - 2 * BW - 0.4;
  const medSize = Math.min(innerLong, innerDeep) * 0.5;
  addMesh(
    group,
    new THREE.BoxGeometry(medSize, T * 0.5, medSize),
    medMat,
    "rugMedallionDiamond",
    [0, lift, 0],
    [0, Math.PI / 4, 0]
  );
  // Center ellipse (squashed sphere) — flat
  const ellipse = addMesh(
    group,
    new THREE.SphereGeometry(medSize * 0.35, 20, 12),
    medMat,
    "rugMedallionCenter",
    [0, lift, 0]
  );
  ellipse.scale.set(1, 0.15, 0.7);

  // Four corner accents
  const cornerSize = medSize * 0.22;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(
        group,
        new THREE.BoxGeometry(cornerSize, T * 0.5, cornerSize),
        medMat,
        `rugCorner_${sx}${sz}`,
        [sx * (LONG / 2 - BW - cornerSize), lift, sz * (DEEP / 2 - BW - cornerSize)],
        [0, Math.PI / 4, 0]
      );
    }
  }

  return applyScale(group, options);
}
