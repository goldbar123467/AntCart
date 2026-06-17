// Cardboard box — a 2.5 cube shipping box with open flaps. Doubles as a ramp or
// solid cover. Optionally the lid can be closed (a flat top) instead of open flaps.
//
// Factory: createCardboardBox(options?)

import * as THREE from "three";
import { AssetOptions, Rng, mat, addMesh, applyScale } from "./types";

export interface CardboardBoxOptions extends AssetOptions {
  cardboard?: number;
  tape?: number;
  /** If true, top is sealed flat with a strip of packing tape. If false (default),
   *  the four top flaps are folded open/up for a "just opened" look. */
  sealed?: boolean;
}

export function createCardboardBox(options?: CardboardBoxOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "CardboardBox";

  const rng = new Rng(options?.seed ?? 11);
  const cardboard = options?.cardboard ?? 0xc9a76e; // kraft cardboard golden-tan
  const tape = options?.tape ?? 0xd8d2c2; // packing tape (slightly translucent tan)
  const interior = new THREE.Color(cardboard).multiplyScalar(0.82).getHex();

  const boxMat = mat(cardboard, { roughness: 0.96 });
  const interiorMat = mat(interior, { roughness: 0.96 });
  const tapeMat = mat(tape, { roughness: 0.5, metalness: 0.05 });

  const S = 2.5; // cube side
  const T = 0.06; // wall thickness
  const half = S / 2;

  // We build the box as 5 walls (no top) so the interior is hollow.
  // Bottom
  addMesh(group, new THREE.BoxGeometry(S, T, S), boxMat, "boxBottom", [0, T / 2, 0]);
  // Four sides
  addMesh(group, new THREE.BoxGeometry(S, S - T, T), boxMat, "boxWallBack", [0, S / 2, -half + T / 2]);
  addMesh(group, new THREE.BoxGeometry(S, S - T, T), boxMat, "boxWallFront", [0, S / 2, half - T / 2]);
  addMesh(group, new THREE.BoxGeometry(T, S - T, S), boxMat, "boxWallLeft", [-half + T / 2, S / 2, 0]);
  addMesh(group, new THREE.BoxGeometry(T, S - T, S), boxMat, "boxWallRight", [half - T / 2, S / 2, 0]);

  if (options?.sealed) {
    // Flat sealed top + a strip of packing tape down the middle
    addMesh(group, new THREE.BoxGeometry(S, T, S), boxMat, "boxTop", [0, S - T / 2, 0]);
    addMesh(
      group,
      new THREE.BoxGeometry(0.35, T + 0.005, S + 0.02),
      tapeMat,
      "boxTape",
      [0, S - T / 2 + 0.01, 0]
    );
  } else {
    // Four top flaps folded open. Each flap is hinged at the top outer edge of
    // its wall and rotates around that hinge (not its own center), so it folds
    // up and outward like a real opened box instead of stabbing into the box.
    const FLAP = S / 2 - T / 2;
    const flapThick = T;
    const hingeY = S - T / 2; // top of the walls
    const openAngle = Math.PI * 0.55; // ~100°: just past vertical, slight outward lean

    // Front flap (+Z): hinge at z=+half, flap extends in -Z when closed,
    // opens with +X rotation. Translate geo so hinge edge is at origin and
    // the flap's top face sits at y=0.
    {
      const geo = new THREE.BoxGeometry(S, flapThick, FLAP);
      geo.translate(0, -flapThick / 2, -FLAP / 2);
      const jitter = rng.range(-0.04, 0.04);
      addMesh(group, geo, interiorMat, "flapFront", [0, hingeY, half], [openAngle + jitter, 0, 0]);
    }
    // Back flap (-Z): hinge at z=-half, flap extends in +Z when closed,
    // opens with -X rotation.
    {
      const geo = new THREE.BoxGeometry(S, flapThick, FLAP);
      geo.translate(0, -flapThick / 2, FLAP / 2);
      const jitter = rng.range(-0.04, 0.04);
      addMesh(group, geo, interiorMat, "flapBack", [0, hingeY, -half], [-openAngle + jitter, 0, 0]);
    }
    // Right flap (+X): hinge at x=+half, flap extends in -X when closed,
    // opens with -Z rotation.
    {
      const geo = new THREE.BoxGeometry(FLAP, flapThick, S);
      geo.translate(-FLAP / 2, -flapThick / 2, 0);
      const jitter = rng.range(-0.04, 0.04);
      addMesh(group, geo, interiorMat, "flapRight", [half, hingeY, 0], [0, 0, -openAngle + jitter]);
    }
    // Left flap (-X): hinge at x=-half, flap extends in +X when closed,
    // opens with +Z rotation.
    {
      const geo = new THREE.BoxGeometry(FLAP, flapThick, S);
      geo.translate(FLAP / 2, -flapThick / 2, 0);
      const jitter = rng.range(-0.04, 0.04);
      addMesh(group, geo, interiorMat, "flapLeft", [-half, hingeY, 0], [0, 0, openAngle + jitter]);
    }
  }

  // Bottom seam tape — the classic cardboard box has tape sealing the bottom
  addMesh(
    group,
    new THREE.BoxGeometry(0.35, T + 0.005, S + 0.02),
    tapeMat,
    "boxBottomTape",
    [0, 0.01, 0]
  );

  // A shipping label on the front face
  addMesh(
    group,
    new THREE.BoxGeometry(0.8, 0.55, 0.01),
    mat(0xeae6d8, { roughness: 0.8 }),
    "boxLabel",
    [0, S * 0.55, half + 0.005]
  );

  return applyScale(group, options);
}
