// Stack of books — a ramp / obstacle. Each book is ~1.8 x 1.2 x 0.3, stacked 4-6 high
// with small random offsets and tilts so it reads as a real pile. Total ~1.5-2 tall.
//
// Factory: createBookStack(options?)

import * as THREE from "three";
import { AssetOptions, Rng, mat, addMesh, applyScale } from "./types";

export interface BookStackOptions extends AssetOptions {
  /** Number of books in the stack (default random 4-6). */
  count?: number;
  /** Page color (the edges of the pages). */
  pages?: number;
}

const BOOK_COLORS = [
  0x8c1c1c, // deep red
  0x1f3a8a, // navy
  0x2f6f3a, // forest green
  0xb8860b, // dark goldenrod
  0x4b2e83, // purple
  0x6b4226, // brown
  0x1a1a1a, // black
  0xbfbfbf, // off-white
];

export function createBookStack(options?: BookStackOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "BookStack";

  const rng = new Rng(options?.seed ?? 42);
  const count = options?.count ?? rng.int(4, 6);
  const pages = options?.pages ?? 0xe8e2d0;

  const pagesMat = mat(pages, { roughness: 0.9 });
  const BW = 1.8; // book width (x) — length of spine
  const BD = 1.2; // book depth (z) — page edge to spine
  const BT = 0.3; // book thickness (y)

  let y = 0;
  for (let i = 0; i < count; i++) {
    const color = BOOK_COLORS[(options?.seed ?? 0 + i) % BOOK_COLORS.length];
    const coverMat = mat(rng.pick(BOOK_COLORS), { roughness: 0.7 });
    void color;

    // Slight per-book size variation
    const w = BW + rng.range(-0.15, 0.15);
    const d = BD + rng.range(-0.1, 0.1);
    const t = BT + rng.range(-0.05, 0.05);

    // Cover block (slightly larger than the page block on all sides)
    const bookGroup = new THREE.Group();
    bookGroup.name = `book_${i}`;
    addMesh(bookGroup, new THREE.BoxGeometry(w, t, d), coverMat, "cover");
    // Pages block inset on the spine side (positive X = page edge)
    addMesh(
      bookGroup,
      new THREE.BoxGeometry(w - 0.12, t - 0.04, d - 0.08),
      pagesMat,
      "pages",
      [0, 0, 0]
    );

    // Random offset and tilt for that stacked-pile feel
    const ox = rng.range(-0.12, 0.12);
    const oz = rng.range(-0.12, 0.12);
    const ry = rng.range(-0.35, 0.35);
    const rz = rng.range(-0.05, 0.05);
    bookGroup.position.set(ox, y + t / 2, oz);
    bookGroup.rotation.set(0, ry, rz);
    group.add(bookGroup);

    y += t;
  }

  return applyScale(group, options);
}
