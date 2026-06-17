import * as THREE from "three";

export const FINISH_LINE_RENDER_ORDER = 12;
export const FINISH_LINE_Y = 0.145;
export const FINISH_LINE_STRIPES = 8;
export const FINISH_LINE_DEPTH = 1.7;

const finishLineWhite = makeFinishLineMaterial(0xf8f4e9);
const finishLineBlack = makeFinishLineMaterial(0x111111);

export function createFinishLineGroup(
  start: THREE.Vector3,
  next: THREE.Vector3,
  roadWidth: number,
): THREE.Group {
  const group = new THREE.Group();
  const tangent = new THREE.Vector3(next.x - start.x, 0, next.z - start.z);

  if (tangent.lengthSq() <= 0.000001) {
    tangent.set(0, 0, -1);
  } else {
    tangent.normalize();
  }

  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
  const stripeWidth = roadWidth / FINISH_LINE_STRIPES;
  const firstOffset = -roadWidth * 0.5 + stripeWidth * 0.5;

  group.name = "finish-line-decal";
  group.renderOrder = FINISH_LINE_RENDER_ORDER;

  for (let i = 0; i < FINISH_LINE_STRIPES; i += 1) {
    const center = start.clone().addScaledVector(normal, firstOffset + i * stripeWidth);
    const mesh = new THREE.Mesh(
      buildFinishStripeGeometry(center, tangent, normal, stripeWidth, FINISH_LINE_DEPTH),
      i % 2 === 0 ? finishLineWhite : finishLineBlack,
    );

    mesh.name = `finish-line-stripe-${i}`;
    mesh.renderOrder = FINISH_LINE_RENDER_ORDER;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }

  return group;
}

function makeFinishLineMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function buildFinishStripeGeometry(
  center: THREE.Vector3,
  tangent: THREE.Vector3,
  normal: THREE.Vector3,
  width: number,
  depth: number,
): THREE.BufferGeometry {
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  const p0 = center.clone().addScaledVector(normal, -halfWidth).addScaledVector(tangent, -halfDepth);
  const p1 = center.clone().addScaledVector(normal, halfWidth).addScaledVector(tangent, -halfDepth);
  const p2 = center.clone().addScaledVector(normal, halfWidth).addScaledVector(tangent, halfDepth);
  const p3 = center.clone().addScaledVector(normal, -halfWidth).addScaledVector(tangent, halfDepth);
  const positions = new Float32Array([
    p0.x, FINISH_LINE_Y, p0.z,
    p1.x, FINISH_LINE_Y, p1.z,
    p2.x, FINISH_LINE_Y, p2.z,
    p3.x, FINISH_LINE_Y, p3.z,
  ]);
  const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ]);
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeBoundingSphere();
  return geometry;
}
