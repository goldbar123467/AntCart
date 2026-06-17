// Wooden dining chair — scenery obstacle / cover. An ant kart can ramp off the seat
// or weave between legs. Footprint ~ 1.6 x 1.6, seat at 1.0, back to ~1.9.
//
// Factory: createWoodenChair(options?)

import * as THREE from "three";
import { AssetOptions, mat, addMesh, applyScale } from "./types";

export interface WoodenChairOptions extends AssetOptions {
  wood?: number;
}

export function createWoodenChair(options?: WoodenChairOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "WoodenChair";

  const wood = options?.wood ?? 0x7a4a22;
  const woodMat = mat(wood, { roughness: 0.6, metalness: 0.04 });

  const W = 1.6; // x width
  const D = 1.6; // z depth
  const SEAT_H = 1.0;
  const SEAT_T = 0.1;
  const BACK_H = 0.9; // height of back above seat
  const LEG_T = 0.12;

  // Seat
  addMesh(
    group,
    new THREE.BoxGeometry(W, SEAT_T, D),
    woodMat,
    "chairSeat",
    [0, SEAT_H, 0]
  );

  // Four legs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(
        group,
        new THREE.BoxGeometry(LEG_T, SEAT_H, LEG_T),
        woodMat,
        `chairLeg_${sx < 0 ? "L" : "R"}${sz < 0 ? "B" : "F"}`,
        [sx * (W / 2 - LEG_T / 2), SEAT_H / 2, sz * (D / 2 - LEG_T / 2)]
      );
    }
  }

  // Backrest: two vertical posts + two horizontal slats along -Z edge
  const backZ = -D / 2 + LEG_T / 2;
  for (const sx of [-1, 1]) {
    addMesh(
      group,
      new THREE.BoxGeometry(LEG_T, BACK_H, LEG_T),
      woodMat,
      `chairBackPost_${sx < 0 ? "L" : "R"}`,
      [sx * (W / 2 - LEG_T / 2), SEAT_H + BACK_H / 2, backZ]
    );
  }
  // Horizontal slats
  addMesh(
    group,
    new THREE.BoxGeometry(W - LEG_T, 0.1, 0.06),
    woodMat,
    "chairBackTop",
    [0, SEAT_H + BACK_H - 0.1, backZ]
  );
  addMesh(
    group,
    new THREE.BoxGeometry(W - LEG_T, 0.1, 0.06),
    woodMat,
    "chairBackMid",
    [0, SEAT_H + BACK_H * 0.55, backZ]
  );

  return applyScale(group, options);
}
