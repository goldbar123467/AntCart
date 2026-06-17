// Floor lamp — tall thin pole (~5 tall) with a weighted base and a fabric/trapezoid
// shade. Acts as a thin scenery post / slalom pole. Optionally emits light.
//
// Factory: createFloorLamp(options?)

import * as THREE from "three";
import { AssetOptions, mat, addMesh, applyScale } from "./types";

export interface FloorLampOptions extends AssetOptions {
  pole?: number;
  base?: number;
  shade?: number;
  /** Add an actual PointLight at the bulb. Default false (cheap scenery). */
  emitLight?: boolean;
  lightIntensity?: number;
  lightDistance?: number;
}

export function createFloorLamp(options?: FloorLampOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "FloorLamp";

  const pole = options?.pole ?? 0x2a2a2a;
  const base = options?.base ?? 0x1a1a1a;
  const shade = options?.shade ?? 0xe8dcc0;

  const poleMat = mat(pole, { roughness: 0.4, metalness: 0.7 });
  const baseMat = mat(base, { roughness: 0.5, metalness: 0.5 });
  const shadeMat = mat(shade, { roughness: 0.9, metalness: 0.0 });

  const POLE_H = 4.2;
  const POLE_R = 0.06;
  const BASE_R = 0.45;
  const BASE_H = 0.12;
  const SHADE_BOT_R = 0.55;
  const SHADE_TOP_R = 0.4;
  const SHADE_H = 0.7;

  // Weighted base — short fat cylinder
  addMesh(
    group,
    new THREE.CylinderGeometry(BASE_R, BASE_R * 1.1, BASE_H, 24),
    baseMat,
    "lampBase",
    [0, BASE_H / 2, 0]
  );

  // Pole
  addMesh(
    group,
    new THREE.CylinderGeometry(POLE_R, POLE_R, POLE_H, 12),
    poleMat,
    "lampPole",
    [0, BASE_H + POLE_H / 2, 0]
  );

  // Shade — truncated cone (open-ended) sitting on top of the pole
  const shadeY = BASE_H + POLE_H - SHADE_H / 2 - 0.05;
  const shadeGeo = new THREE.CylinderGeometry(SHADE_TOP_R, SHADE_BOT_R, SHADE_H, 24, 1, true);
  const shadeMesh = new THREE.Mesh(shadeGeo, shadeMat);
  shadeMesh.name = "lampShade";
  shadeMesh.position.set(0, shadeY, 0);
  shadeMesh.castShadow = true;
  shadeMesh.receiveShadow = true;
  group.add(shadeMesh);

  // Bulb — small glowing sphere inside the shade
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe9b0,
    emissive: 0xffd98a,
    emissiveIntensity: options?.emitLight ? 2.2 : 0.9,
    roughness: 0.4,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), bulbMat);
  bulb.name = "lampBulb";
  bulb.position.set(0, shadeY, 0);
  group.add(bulb);

  if (options?.emitLight) {
    const light = new THREE.PointLight(
      0xffd98a,
      options.lightIntensity ?? 24,
      options.lightDistance ?? 56,
      2,
    );
    light.name = "lampLight";
    light.position.set(0, shadeY, 0);
    light.castShadow = false; // shadows from many lamps are expensive
    group.add(light);
  }

  return applyScale(group, options);
}
