import * as CANNON from "cannon-es";

export type PhysicsPreviewState = {
  position: {
    x: number;
    y: number;
    z: number;
  };
  quaternion: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
};

export type PhysicsPreview = {
  sphereBody: CANNON.Body;
  step: (deltaSeconds: number) => void;
  reset: () => void;
  getState: () => PhysicsPreviewState;
};

const LAUNCH_POSITION = new CANNON.Vec3(-1.8, 2.9, -0.4);
const LAUNCH_VELOCITY = new CANNON.Vec3(1.15, 0.15, 0.2);
const FIXED_STEP = 1 / 60;
const MAX_SUB_STEPS = 4;

export function createPhysicsPreview(): PhysicsPreview {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
  });

  world.allowSleep = true;

  const grassMaterial = new CANNON.Material("soft-grass");
  const sphereMaterial = new CANNON.Material("studio-orb");

  world.addContactMaterial(
    new CANNON.ContactMaterial(grassMaterial, sphereMaterial, {
      friction: 0.42,
      restitution: 0.62,
    }),
  );

  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: grassMaterial,
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  const sphereBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(0.18),
    material: sphereMaterial,
    linearDamping: 0.03,
    angularDamping: 0.04,
  });
  world.addBody(sphereBody);

  function reset(): void {
    sphereBody.position.copy(LAUNCH_POSITION);
    sphereBody.velocity.copy(LAUNCH_VELOCITY);
    sphereBody.angularVelocity.set(0.8, 0.1, -0.6);
    sphereBody.quaternion.set(0, 0, 0, 1);
    sphereBody.force.set(0, 0, 0);
    sphereBody.torque.set(0, 0, 0);
    sphereBody.wakeUp();
  }

  reset();

  return {
    sphereBody,
    step: (deltaSeconds) => {
      world.step(FIXED_STEP, deltaSeconds, MAX_SUB_STEPS);
    },
    reset,
    getState: () => ({
      position: {
        x: roundForState(sphereBody.position.x),
        y: roundForState(sphereBody.position.y),
        z: roundForState(sphereBody.position.z),
      },
      quaternion: {
        x: roundForState(sphereBody.quaternion.x),
        y: roundForState(sphereBody.quaternion.y),
        z: roundForState(sphereBody.quaternion.z),
        w: roundForState(sphereBody.quaternion.w),
      },
    }),
  };
}

function roundForState(value: number): number {
  return Number(value.toFixed(5));
}
