import * as CANNON from "cannon-es";
import * as THREE from "three";
import { buildCurbPathPoints } from "./trackCurbs";

export interface ArcadePhysicsTuning {
  playerMass: number;
  aiMass: number;
  chassisSize: THREE.Vector3;
  chassisCenterY: number;
  linearDamping: number;
  angularDamping: number;
  velocityFollow: number;
  railHeight: number;
  railThickness: number;
  railColliderOverlap: number;
  railSampleStride: number;
}

export interface RailColliderSpec {
  side: -1 | 1;
  position: THREE.Vector3;
  size: THREE.Vector3;
  rotationY: number;
}

export const DEFAULT_ARCADE_PHYSICS_TUNING: ArcadePhysicsTuning = {
  playerMass: 95,
  aiMass: 120,
  chassisSize: new THREE.Vector3(1.45, 0.56, 2.12),
  chassisCenterY: 0.42,
  linearDamping: 0.22,
  angularDamping: 0.86,
  velocityFollow: 22,
  railHeight: 0.88,
  railThickness: 1.08,
  railColliderOverlap: 1.35,
  railSampleStride: 4,
};

export function createKartChassisBody(
  position: THREE.Vector3,
  heading: number,
  material: CANNON.Material,
  tuning: ArcadePhysicsTuning = DEFAULT_ARCADE_PHYSICS_TUNING,
): CANNON.Body {
  const body = createChassisBody(position, heading, material, tuning.playerMass, CANNON.Body.DYNAMIC, tuning);
  body.allowSleep = false;
  return body;
}

export function createAiKartBody(
  position: THREE.Vector3,
  heading: number,
  material: CANNON.Material,
  tuning: ArcadePhysicsTuning = DEFAULT_ARCADE_PHYSICS_TUNING,
): CANNON.Body {
  return createChassisBody(position, heading, material, tuning.aiMass, CANNON.Body.KINEMATIC, tuning);
}

export function applyArcadeBodyVelocity(
  body: CANNON.Body,
  heading: number,
  speed: number,
  deltaSeconds: number,
  tuning: ArcadePhysicsTuning = DEFAULT_ARCADE_PHYSICS_TUNING,
): void {
  const blend = 1 - Math.exp(-tuning.velocityFollow * deltaSeconds);
  const desiredX = -Math.sin(heading) * speed;
  const desiredZ = -Math.cos(heading) * speed;

  body.velocity.x += (desiredX - body.velocity.x) * blend;
  body.velocity.z += (desiredZ - body.velocity.z) * blend;
  body.velocity.y = 0;
  body.angularVelocity.x = 0;
  body.angularVelocity.z = 0;
  body.position.y = tuning.chassisCenterY;
  body.quaternion.setFromEuler(0, heading, 0, "XYZ");
  body.wakeUp();
}

export function resetBodyPose(
  body: CANNON.Body,
  position: THREE.Vector3,
  heading: number,
  tuning: ArcadePhysicsTuning = DEFAULT_ARCADE_PHYSICS_TUNING,
): void {
  body.position.set(position.x, tuning.chassisCenterY, position.z);
  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.force.setZero();
  body.torque.setZero();
  body.quaternion.setFromEuler(0, heading, 0, "XYZ");
}

export function buildRailColliderSpecs(
  centerline: readonly THREE.Vector3[],
  roadWidth: number,
  tuning: ArcadePhysicsTuning = DEFAULT_ARCADE_PHYSICS_TUNING,
): RailColliderSpec[] {
  const specs: RailColliderSpec[] = [];
  const stride = Math.max(1, Math.floor(tuning.railSampleStride));

  for (const side of [-1, 1] as const) {
    const railPoints = buildCurbPathPoints(centerline, side, roadWidth);

    for (let i = 0; i < railPoints.length; i += stride) {
      const a = railPoints[i];
      const b = railPoints[(i + stride) % railPoints.length];
      const tangent = new THREE.Vector3().subVectors(b, a);
      const length = tangent.length();

      if (length <= 0.001) {
        continue;
      }

      tangent.normalize();
      specs.push({
        side,
        position: new THREE.Vector3(
          (a.x + b.x) * 0.5,
          tuning.railHeight * 0.5,
          (a.z + b.z) * 0.5,
        ),
        size: new THREE.Vector3(
          tuning.railThickness,
          tuning.railHeight,
          length + tuning.railColliderOverlap,
        ),
        rotationY: Math.atan2(tangent.x, tangent.z),
      });
    }
  }

  return specs;
}

function createChassisBody(
  position: THREE.Vector3,
  heading: number,
  material: CANNON.Material,
  mass: number,
  type: CANNON.BodyType,
  tuning: ArcadePhysicsTuning,
): CANNON.Body {
  const body = new CANNON.Body({
    mass,
    type,
    material,
    shape: new CANNON.Box(new CANNON.Vec3(
      tuning.chassisSize.x * 0.5,
      tuning.chassisSize.y * 0.5,
      tuning.chassisSize.z * 0.5,
    )),
    linearDamping: tuning.linearDamping,
    angularDamping: tuning.angularDamping,
    angularFactor: new CANNON.Vec3(0, 1, 0),
  });

  body.position.set(position.x, tuning.chassisCenterY, position.z);
  body.quaternion.setFromEuler(0, heading, 0, "XYZ");
  return body;
}
