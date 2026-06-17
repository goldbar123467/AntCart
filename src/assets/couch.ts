// Couch — oversized 3-seat sofa that reads as a long wall / cover for an ant-sized kart.
// Overall footprint ~ 7 long x 3 deep x 2.2 tall (kart is 2.2 long, so this is a wall).
//
// Factory: createCouch(options?)

import * as THREE from "three";
import { AssetOptions, Rng, mat, addMesh, applyScale } from "./types";

export interface CouchOptions extends AssetOptions {
  /** Upholstery color. Defaults to a muted Midwestern tan. */
  upholstery?: number;
  /** Cushion color (defaults to a slightly darker shade of upholstery). */
  cushion?: number;
  /** Wood leg color. */
  leg?: number;
}

/**
 * Build a procedural 3-seat couch. Origin is at floor level, centered on X/Z.
 * +Y is up. Long axis is X.
 */
export function createCouch(options?: CouchOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "Couch";

  const rng = new Rng(options?.seed ?? 7);
  const upholstery = options?.upholstery ?? 0x9c7a4d;
  const cushion = options?.cushion ?? new THREE.Color(upholstery).multiplyScalar(0.82).getHex();
  const leg = options?.leg ?? 0x3a2417;

  const fabric = mat(upholstery, { roughness: 0.95 });
  const cushionMat = mat(cushion, { roughness: 0.95 });
  const legMat = mat(leg, { roughness: 0.6, metalness: 0.05 });

  const LONG = 7.0; // x
  const DEEP = 3.0; // z
  const BASE_H = 0.9; // base block height
  const SEAT_H = 0.5; // seat cushion thickness
  const BACK_H = 1.3; // back rest height above base
  const ARM_H = 1.0; // armrest height above base
  const ARM_W = 0.55; // armrest width
  const LEG_H = 0.25;
  const LEG_R = 0.12;

  // Base block (the frame under the cushions)
  addMesh(
    group,
    new THREE.BoxGeometry(LONG, BASE_H, DEEP),
    fabric,
    "couchBase",
    [0, LEG_H + BASE_H / 2, 0]
  );

  // Back rest
  const backThick = 0.5;
  addMesh(
    group,
    new THREE.BoxGeometry(LONG, BACK_H, backThick),
    fabric,
    "couchBack",
    [0, LEG_H + BASE_H + BACK_H / 2, -DEEP / 2 + backThick / 2]
  );

  // Armrests
  for (const sx of [-1, 1]) {
    addMesh(
      group,
      new THREE.BoxGeometry(ARM_W, ARM_H, DEEP),
      fabric,
      `couchArm_${sx < 0 ? "L" : "R"}`,
      [sx * (LONG / 2 - ARM_W / 2), LEG_H + BASE_H + ARM_H / 2, 0]
    );
  }

  // Three seat cushions sitting on the base, between the armrests
  const seatSpan = LONG - 2 * ARM_W;
  const cushLen = seatSpan / 3 - 0.08;
  const cushDeep = DEEP - backThick - 0.25;
  const cushZ = 0.25; // shifted forward away from the back
  for (let i = 0; i < 3; i++) {
    const x = -seatSpan / 2 + cushLen / 2 + i * (cushLen + 0.08);
    // slight random tilt so it looks sat-in, not perfectly aligned
    const tilt = rng.range(-0.04, 0.04);
    addMesh(
      group,
      new THREE.BoxGeometry(cushLen, SEAT_H, cushDeep),
      cushionMat,
      `seatCushion_${i}`,
      [x, LEG_H + BASE_H + SEAT_H / 2, cushZ],
      [0, 0, tilt]
    );
  }

  // Two back cushions leaning slightly forward
  for (let i = 0; i < 2; i++) {
    const x = (i === 0 ? -1 : 1) * (LONG / 4);
    addMesh(
      group,
      new THREE.BoxGeometry(LONG / 2 - 0.2, BACK_H * 0.7, 0.35),
      cushionMat,
      `backCushion_${i}`,
      [x, LEG_H + BASE_H + (BACK_H * 0.7) / 2 + 0.1, -DEEP / 2 + backThick + 0.25],
      [0.18, 0, 0]
    );
  }

  // Four short wooden legs
  const legInset = 0.4;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(
        group,
        new THREE.CylinderGeometry(LEG_R, LEG_R * 0.7, LEG_H, 10),
        legMat,
        `couchLeg_${sx < 0 ? "L" : "R"}${sz < 0 ? "B" : "F"}`,
        [sx * (LONG / 2 - legInset), LEG_H / 2, sz * (DEEP / 2 - legInset)]
      );
    }
  }

  return applyScale(group, options);
}
