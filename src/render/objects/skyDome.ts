import * as THREE from "three";
import { createSkyMaterial } from "../materials/skyMaterial";

export type SkyDome = {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
};

export function createSkyDome(): SkyDome {
  const material = createSkyMaterial();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(90, 64, 32), material);
  mesh.renderOrder = -1000;

  return { mesh, material };
}
