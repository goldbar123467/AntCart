// Baseboard — a long thin wall segment that lines the bottom of a real wall and
// acts as the track edge barrier. Has the classic rounded top profile (a thin
// recessed block + a rounded cap). Length is configurable so it can tile a wall.
//
// Factory: createBaseboard(options?)

import * as THREE from "three";
import { AssetOptions, mat, addMesh, applyScale } from "./types";

export interface BaseboardOptions extends AssetOptions {
  /** Segment length along X. Default 12 (matches standard track width). */
  length?: number;
  /** Wall height. Default 1.0 (just above kart height of 1.2 it blocks the kart). */
  height?: number;
  /** Depth (thickness) along Z. Default 0.3. */
  depth?: number;
  body?: number;
  cap?: number;
}

export function createBaseboard(options?: BaseboardOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "Baseboard";

  const LEN = options?.length ?? 12;
  const H = options?.height ?? 1.0;
  const D = options?.depth ?? 0.3;
  const body = options?.body ?? 0xf2efe6; // off-white painted trim
  const cap = options?.cap ?? 0xe6e1d3;

  const bodyMat = mat(body, { roughness: 0.85 });
  const capMat = mat(cap, { roughness: 0.8 });

  const BODY_H = H * 0.75;
  const CAP_H = H - BODY_H;

  // Main flat body
  addMesh(
    group,
    new THREE.BoxGeometry(LEN, BODY_H, D),
    bodyMat,
    "baseboardBody",
    [0, BODY_H / 2, 0]
  );

  // Rounded cap — a half-cylinder laid along X on top of the body, plus a thin
  // recessed lip below it for the classic "step" profile.
  const lipH = 0.06;
  addMesh(
    group,
    new THREE.BoxGeometry(LEN, lipH, D * 0.7),
    capMat,
    "baseboardLip",
    [0, BODY_H + lipH / 2, 0]
  );
  // Top cap as a half-rounded bar. CylinderGeometry gives a full circle; we squash
  // it on Y so only the top half reads as a rounded edge.
  const capMesh = addMesh(
    group,
    new THREE.CylinderGeometry(D / 2, D / 2, LEN, 16, 1),
    capMat,
    "baseboardCap",
    [0, BODY_H + lipH + CAP_H / 2 - D * 0.15, 0],
    [0, 0, Math.PI / 2]
  );
  capMesh.scale.y = CAP_H / D; // squash to the cap height

  return applyScale(group, options);
}
