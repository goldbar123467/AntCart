// Coffee table — low wooden table the kart can drive under or use as cover.
// Footprint ~ 4 long x 2 deep x 1.2 tall (kart is 1.2 tall, so it just clears).
//
// Factory: createCoffeeTable(options?)

import * as THREE from "three";
import { AssetOptions, mat, addMesh, applyScale } from "./types";

export interface CoffeeTableOptions extends AssetOptions {
  wood?: number;
  top?: number;
}

export function createCoffeeTable(options?: CoffeeTableOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "CoffeeTable";

  const wood = options?.wood ?? 0x6b3f1d;
  const top = options?.top ?? 0x4a2a13;

  const woodMat = mat(wood, { roughness: 0.55, metalness: 0.05 });
  const topMat = mat(top, { roughness: 0.4, metalness: 0.05 });

  const LONG = 4.0; // x
  const DEEP = 2.0; // z
  const TOP_H = 0.12;
  const LEG_H = 1.08;
  const LEG_T = 0.18; // square leg thickness

  // Top
  addMesh(
    group,
    new THREE.BoxGeometry(LONG, TOP_H, DEEP),
    topMat,
    "tableTop",
    [0, LEG_H + TOP_H / 2, 0]
  );

  // Lower shelf for that classic Midwestern coffee-table look
  const SHELF_H = 0.08;
  const shelfY = LEG_H * 0.45;
  addMesh(
    group,
    new THREE.BoxGeometry(LONG - 0.5, SHELF_H, DEEP - 0.5),
    woodMat,
    "tableShelf",
    [0, shelfY, 0]
  );

  // Four square legs
  const inset = 0.1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(
        group,
        new THREE.BoxGeometry(LEG_T, LEG_H, LEG_T),
        woodMat,
        `tableLeg_${sx < 0 ? "L" : "R"}${sz < 0 ? "B" : "F"}`,
        [sx * (LONG / 2 - LEG_T / 2 - inset), LEG_H / 2, sz * (DEEP / 2 - LEG_T / 2 - inset)]
      );
    }
  }

  return applyScale(group, options);
}
