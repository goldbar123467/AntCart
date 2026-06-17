// Cereal crumbs + O-shaped cereal pieces — a scattered cluster of small obstacles
// that an ant kart has to dodge or can plow through. Mixes flat cereal-Os (torus),
// flake-ish boxes, and tiny dust spheres. Spread across a configurable radius.
//
// Factory: createCerealCrumbs(options?)

import * as THREE from "three";
import { AssetOptions, Rng, mat, applyScale } from "./types";

export interface CerealCrumbsOptions extends AssetOptions {
  /** Spread radius for the scatter. Default 3. */
  radius?: number;
  /** Number of pieces. Default 18. */
  count?: number;
  cereal?: number;
  crumb?: number;
}

const CEREAL_COLORS = [0xd99a3c, 0xc97a1f, 0xe8c060, 0xb5651d];

export function createCerealCrumbs(options?: CerealCrumbsOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "CerealCrumbs";

  const rng = new Rng(options?.seed ?? 5);
  const radius = options?.radius ?? 3;
  const count = options?.count ?? 18;
  const cerealBase = options?.cereal ?? 0xd99a3c;
  const crumbBase = options?.crumb ?? 0x6b4226;

  for (let i = 0; i < count; i++) {
    // Polar scatter, denser toward center
    const r = radius * Math.sqrt(rng.next());
    const theta = rng.range(0, Math.PI * 2);
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const ry = rng.range(0, Math.PI * 2);

    const isO = rng.next() < 0.45;
    if (isO) {
      // Cheerio-style O — a small torus lying flat
      const cerealMat = mat(rng.pick(CEREAL_COLORS), { roughness: 0.85 });
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.07, 8, 16),
        cerealMat
      );
      torus.name = `cerealO_${i}`;
      torus.position.set(x, 0.07, z);
      torus.rotation.set(Math.PI / 2, ry, 0);
      torus.castShadow = true;
      torus.receiveShadow = true;
      group.add(torus);
    } else if (rng.next() < 0.5) {
      // Flake — a thin tilted box
      const cerealMat = mat(rng.pick(CEREAL_COLORS), { roughness: 0.85 });
      const s = rng.range(0.18, 0.32);
      const flake = new THREE.Mesh(
        new THREE.BoxGeometry(s, 0.04, s * 0.7),
        cerealMat
      );
      flake.name = `cerealFlake_${i}`;
      flake.position.set(x, 0.04, z);
      flake.rotation.set(rng.range(-0.4, 0.4), ry, rng.range(-0.4, 0.4));
      flake.castShadow = true;
      flake.receiveShadow = true;
      group.add(flake);
    } else {
      // Tiny crumb / dust — a small irregular sphere
      const crumbMat = mat(
        new THREE.Color(crumbBase).multiplyScalar(rng.range(0.7, 1.1)).getHex(),
        { roughness: 1.0 }
      );
      const s = rng.range(0.05, 0.14);
      const crumb = new THREE.Mesh(new THREE.SphereGeometry(s, 6, 5), crumbMat);
      crumb.name = `cerealCrumb_${i}`;
      crumb.position.set(x, s * 0.7, z);
      crumb.scale.set(1, rng.range(0.6, 1.0), 1);
      crumb.castShadow = true;
      crumb.receiveShadow = true;
      group.add(crumb);
    }
  }

  // A faint darker "stain" disc under the cluster so it reads as a spill
  const stainMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(cerealBase).multiplyScalar(0.6).getHex(),
    roughness: 1.0,
    transparent: true,
    opacity: 0.35,
  });
  const stain = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.9, 24),
    stainMat
  );
  stain.name = "cerealStain";
  stain.rotation.x = -Math.PI / 2;
  stain.position.y = 0.01;
  stain.receiveShadow = true;
  group.add(stain);

  return applyScale(group, options);
}
