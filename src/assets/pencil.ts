// Pencil — a hexagonal yellow pencil ~4 long. Lays flat as a ramp/pole obstacle,
// or stands upright as a thin post. Body + wooden tip cone + graphite point + metal
// ferrule + pink eraser.
//
// Built along +X with the SHARP TIP at +X and the eraser at -X.
// Flat mode: lays on the floor at y=0.
// Upright mode: stands eraser-down, tip-up, at y=0.
//
// Factory: createPencil(options?)

import * as THREE from "three";
import { AssetOptions, mat, addMesh, applyScale } from "./types";

export interface PencilOptions extends AssetOptions {
  body?: number;
  wood?: number;
  graphite?: number;
  ferrule?: number;
  eraser?: number;
  /** Stand the pencil upright like a post. Default false (lays along +X). */
  upright?: boolean;
}

export function createPencil(options?: PencilOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "Pencil";

  const body = options?.body ?? 0xf2c029; // pencil yellow
  const wood = options?.wood ?? 0xe8c89a;
  const graphite = options?.graphite ?? 0x2b2b2b;
  const ferrule = options?.ferrule ?? 0xb8b8c0;
  const eraser = options?.eraser ?? 0xe88a9a;

  const bodyMat = mat(body, { roughness: 0.5, metalness: 0.05 });
  const woodMat = mat(wood, { roughness: 0.7 });
  const graphMat = mat(graphite, { roughness: 0.4, metalness: 0.3 });
  const ferrMat = mat(ferrule, { roughness: 0.35, metalness: 0.8 });
  const erasMat = mat(eraser, { roughness: 0.8 });

  const BODY_LEN = 3.0; // x — main yellow shaft
  const R = 0.18; // pencil radius
  const WOOD_LEN = 0.45; // sharpened wooden cone length
  const GRAPH_LEN = 0.12;
  const FERR_LEN = 0.25;
  const ERAS_LEN = 0.22;

  // All meshes go into an inner group so we can rotate/lift for upright mode
  // without the spawner's group.position override clobbering the lift.
  const inner = new THREE.Group();
  inner.name = "PencilInner";

  // --- Eraser end at -X, tip end at +X ---

  // Pink eraser (far -X end)
  addMesh(
    inner,
    new THREE.CylinderGeometry(R * 0.95, R * 0.95, ERAS_LEN, 6),
    erasMat,
    "pencilEraser",
    [-ERAS_LEN / 2, R, 0],
    [0, 0, Math.PI / 2]
  );

  // Metal ferrule (between eraser and body)
  addMesh(
    inner,
    new THREE.CylinderGeometry(R * 1.02, R * 1.02, FERR_LEN, 6),
    ferrMat,
    "pencilFerrule",
    [-ERAS_LEN - FERR_LEN / 2, R, 0],
    [0, 0, Math.PI / 2]
  );

  // Main hex body
  const bodyStart = -ERAS_LEN - FERR_LEN;
  addMesh(
    inner,
    new THREE.CylinderGeometry(R, R, BODY_LEN, 6),
    bodyMat,
    "pencilBody",
    [bodyStart + BODY_LEN / 2, R, 0],
    [0, 0, Math.PI / 2]
  );

  // Wooden sharpened cone — wide end (R) connects to body, narrow end (0.02) at tip.
  // CylinderGeometry(R, 0.02, ...): top=R (wide), bottom=0.02 (narrow).
  // Rotation +π/2 about Z maps top(+Y) -> -X, bottom(-Y) -> +X.
  // So wide end goes toward the body (-X) and narrow toward the tip (+X). Correct.
  const woodStart = bodyStart + BODY_LEN;
  addMesh(
    inner,
    new THREE.CylinderGeometry(R, 0.02, WOOD_LEN, 6),
    woodMat,
    "pencilWood",
    [woodStart + WOOD_LEN / 2, R, 0],
    [0, 0, Math.PI / 2]
  );

  // Graphite tip — tiny dark cone continuing the taper to a sharp point.
  // CylinderGeometry(0.02, 0.0, ...): top=0.02 (connects to wood), bottom=0.0 (sharp point).
  // Rotation +π/2: top -> -X (wood side), bottom point -> +X (outward tip). Correct.
  const graphStart = woodStart + WOOD_LEN;
  addMesh(
    inner,
    new THREE.CylinderGeometry(0.02, 0.0, GRAPH_LEN, 8),
    graphMat,
    "pencilGraphite",
    [graphStart + GRAPH_LEN / 2, R, 0],
    [0, 0, Math.PI / 2]
  );

  if (options?.upright) {
    // Stand it up: tip pointing UP (+Y), eraser at the floor.
    // The pencil's long axis is +X. Rotation +π/2 about Z maps +X -> +Y.
    inner.rotation.z = Math.PI / 2;
    // The eraser end is at the most negative local X. After +π/2 Z rotation,
    // local -X maps to -Y (below floor). Lift by the eraser-end offset so the
    // eraser sits at y=0.
    const eraserEndX = -ERAS_LEN - FERR_LEN; // most negative local X
    inner.position.y = -eraserEndX; // = ERAS_LEN + FERR_LEN
  }

  group.add(inner);
  return applyScale(group, options);
}
