import * as THREE from "three";

export const START_GRID_OFFSET_METERS = 10;

export interface StartGridPose {
  position: THREE.Vector3;
  heading: number;
}

export function getStartGridPose(
  checkpointPoints: readonly THREE.Vector3[],
  offsetMeters = START_GRID_OFFSET_METERS,
): StartGridPose {
  if (checkpointPoints.length < 2) {
    throw new Error("Start grid needs at least two checkpoint points.");
  }

  const direction = new THREE.Vector3().subVectors(checkpointPoints[1], checkpointPoints[0]).normalize();
  const position = checkpointPoints[0].clone().addScaledVector(direction, offsetMeters);
  position.y = 0.42;

  return {
    position,
    heading: Math.atan2(-direction.x, -direction.z),
  };
}
