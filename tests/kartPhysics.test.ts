import * as CANNON from "cannon-es";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARCADE_PHYSICS_TUNING,
  applyArcadeBodyVelocity,
  buildRailColliderSpecs,
  createAiKartBody,
  createKartChassisBody,
  resetBodyPose,
} from "../src/game/kartPhysics";

describe("kart physics helpers", () => {
  it("creates a dynamic player chassis with yaw-only angular response", () => {
    const material = new CANNON.Material("test-kart");
    const body = createKartChassisBody(new THREE.Vector3(2, 0, -4), Math.PI / 2, material);

    expect(body.mass).toBe(DEFAULT_ARCADE_PHYSICS_TUNING.playerMass);
    expect(body.type).toBe(CANNON.Body.DYNAMIC);
    expect(body.shapes).toHaveLength(1);
    expect(body.angularFactor.x).toBe(0);
    expect(body.angularFactor.y).toBe(1);
    expect(body.angularFactor.z).toBe(0);
    expect(body.position.x).toBeCloseTo(2);
    expect(body.position.y).toBeCloseTo(DEFAULT_ARCADE_PHYSICS_TUNING.chassisCenterY);
    expect(body.position.z).toBeCloseTo(-4);
  });

  it("blends arcade speed into Cannon velocity without touching vertical motion", () => {
    const body = createKartChassisBody(new THREE.Vector3(), 0, new CANNON.Material("test-kart"));
    body.velocity.set(0, 3, 0);

    applyArcadeBodyVelocity(body, Math.PI / 2, 20, 1 / 30);

    expect(body.velocity.x).toBeLessThan(-4);
    expect(body.velocity.z).toBeCloseTo(0, 4);
    expect(body.velocity.y).toBe(0);
    expect(body.position.y).toBeCloseTo(DEFAULT_ARCADE_PHYSICS_TUNING.chassisCenterY);
  });

  it("resets a body to the requested pose and clears impact velocity", () => {
    const body = createAiKartBody(new THREE.Vector3(5, 0, 7), 0, new CANNON.Material("test-ai"));
    body.velocity.set(12, 0, -3);
    body.angularVelocity.set(1, 2, 3);

    resetBodyPose(body, new THREE.Vector3(-8, 0, 11), -0.75);

    expect(body.position.x).toBeCloseTo(-8);
    expect(body.position.y).toBeCloseTo(DEFAULT_ARCADE_PHYSICS_TUNING.chassisCenterY);
    expect(body.position.z).toBeCloseTo(11);
    expect(body.velocity.length()).toBe(0);
    expect(body.angularVelocity.length()).toBe(0);
  });

  it("builds dense curved rail collider specs on both sides of the track", () => {
    const centerline = [
      new THREE.Vector3(-20, 0, -10),
      new THREE.Vector3(20, 0, -10),
      new THREE.Vector3(20, 0, 10),
      new THREE.Vector3(-20, 0, 10),
    ];
    const specs = buildRailColliderSpecs(centerline, 12, {
      ...DEFAULT_ARCADE_PHYSICS_TUNING,
      railSampleStride: 1,
    });

    expect(specs).toHaveLength(centerline.length * 2);
    expect(new Set(specs.map((spec) => spec.side)).size).toBe(2);
    expect(specs.every((spec) => spec.size.y >= 0.7)).toBe(true);
    expect(specs.every((spec) => spec.size.z > 1)).toBe(true);
    expect(new Set(specs.map((spec) => spec.rotationY.toFixed(2))).size).toBeGreaterThan(2);
  });
});
