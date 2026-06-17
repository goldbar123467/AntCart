// Big wooden alphabet toy block — a chunky 1.5 cube that doubles as a ramp when
// placed on its side. Letters are suggested with slightly recessed colored panels
// on each face (no textures, just geometry).
//
// Factory: createToyBlock(options?)

import * as THREE from "three";
import { AssetOptions, Rng, mat, addMesh, applyScale } from "./types";

export interface ToyBlockOptions extends AssetOptions {
  body?: number;
  letter?: number;
  /** Lay the block on its side to act as a ramp. Default false (stands as a cube). */
  asRamp?: boolean;
}

const LETTER_COLORS = [
  0xd62828, 0xf77f00, 0xfcbf49, 0x06a77d, 0x1d3557, 0x8338ec,
];

export function createToyBlock(options?: ToyBlockOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "ToyBlock";

  const rng = new Rng(options?.seed ?? 99);
  const body = options?.body ?? 0xe8d3a3; // light wood
  const letterBase = options?.letter ?? 0xd62828;

  const bodyMat = mat(body, { roughness: 0.6, metalness: 0.02 });
  const edgeMat = mat(0x6b4226, { roughness: 0.6 });

  const S = 1.5; // cube side
  const e = 0.06;
  const half = S / 2;

  // Build into an inner group so the ramp rotation + lift doesn't get
  // clobbered by the spawner setting group.position.y = 0.
  const inner = new THREE.Group();
  inner.name = "ToyBlockInner";

  // Core cube
  addMesh(inner, new THREE.BoxGeometry(S, S, S), bodyMat, "blockCore", [0, half, 0]);

  // Edge bevels — thin dark rods along the 12 edges for that classic block look.
  // We add the 4 vertical edges + 4 top + 4 bottom as thin boxes.
  const edgeDefs: Array<{ pos: [number, number, number]; rot: [number, number, number]; len: number }> = [
    // 4 verticals
    { pos: [-half, half, -half], rot: [0, 0, 0], len: S },
    { pos: [half, half, -half], rot: [0, 0, 0], len: S },
    { pos: [-half, half, half], rot: [0, 0, 0], len: S },
    { pos: [half, half, half], rot: [0, 0, 0], len: S },
    // 4 along X (top & bottom, front & back)
    { pos: [0, half, -half], rot: [0, 0, Math.PI / 2], len: S },
    { pos: [0, half, half], rot: [0, 0, Math.PI / 2], len: S },
    { pos: [0, 0, -half], rot: [0, 0, Math.PI / 2], len: S },
    { pos: [0, 0, half], rot: [0, 0, Math.PI / 2], len: S },
    // 4 along Z (top & bottom, left & right)
    { pos: [-half, half, 0], rot: [Math.PI / 2, 0, 0], len: S },
    { pos: [half, half, 0], rot: [Math.PI / 2, 0, 0], len: S },
    { pos: [-half, 0, 0], rot: [Math.PI / 2, 0, 0], len: S },
    { pos: [half, 0, 0], rot: [Math.PI / 2, 0, 0], len: S },
  ];
  edgeDefs.forEach((ed, i) => {
    addMesh(
      inner,
      new THREE.BoxGeometry(e, ed.len, e),
      edgeMat,
      `blockEdge_${i}`,
      ed.pos,
      ed.rot
    );
  });

  // Letter panels — a colored recessed square on each of the 6 faces.
  // (Real letters would need textures; a colored inset panel reads as the "letter tile".)
  const panelSize = S * 0.6;
  const panelT = 0.03;
  const offset = half + panelT / 2 - 0.01;
  const faces: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
    { pos: [0, half, offset], rot: [0, 0, 0] }, // +Z front
    { pos: [0, half, -offset], rot: [0, Math.PI, 0] }, // -Z back
    { pos: [offset, half, 0], rot: [0, Math.PI / 2, 0] }, // +X right
    { pos: [-offset, half, 0], rot: [0, -Math.PI / 2, 0] }, // -X left
    { pos: [0, offset, 0], rot: [-Math.PI / 2, 0, 0] }, // +Y top
    { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] }, // placeholder, replaced below
  ];
  // Bottom face — place correctly
  faces[5] = { pos: [0, -offset + S, 0], rot: [Math.PI / 2, 0, 0] };

  faces.forEach((f, i) => {
    const c = LETTER_COLORS[(options?.seed ?? 0 + i) % LETTER_COLORS.length];
    void c;
    const panelMat = mat(rng.pick(LETTER_COLORS), { roughness: 0.5 });
    addMesh(
      inner,
      new THREE.BoxGeometry(panelSize, panelT, panelSize),
      panelMat,
      `blockPanel_${i}`,
      f.pos,
      f.rot
    );
  });

  if (options?.asRamp) {
    // Tip the block onto one edge to act as a ramp. Rotate the inner group
    // about Z by -45deg, then lift it so the lowest corner sits at y=0
    // (the spawner sets the outer group's y to 0, so the lift must be inner).
    inner.rotation.z = -Math.PI / 4;
    // Lowest corner after rotation: the block spans y∈[0, S] in inner space.
    // Corner at (x=+half, y=0) maps to y' = -half * sin(π/4). Lift by that
    // plus a small margin for the edge bevel thickness.
    inner.position.y = half * Math.SQRT1_2 + e;
  }

  group.add(inner);

  // suppress unused letterBase param warning while keeping the option in the API
  void letterBase;

  return applyScale(group, options);
}
