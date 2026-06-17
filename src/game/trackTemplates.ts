import * as THREE from "three";
import { mulberry32, randomRange } from "./random";
import { buildClosedCurbCurve, buildCurbPathPoints } from "./trackCurbs";

export type TrackSectionKind =
  | "start"
  | "straight"
  | "sweeper"
  | "hairpin"
  | "chicane"
  | "shortcut"
  | "ramp"
  | "doubleApex";

interface TrackTemplateAnchor {
  x: number;
  z: number;
  kind: TrackSectionKind;
}

interface TrackTemplateVariant {
  id: string;
  sideMotifIds?: readonly string[];
  anchors?: readonly TrackTemplateAnchor[];
  constraintProfile?: TrackConstraintProfile;
}

interface SectionDrivingProfile {
  speedLimit: number;
  assistStrength: number;
}

interface TrackTemplate {
  id: string;
  name: string;
  roadWidth: number;
  targetLapLengthMeters: number;
  checkpointCount: number;
  tension: number;
  jitter: number;
  variants: readonly TrackTemplateVariant[];
}

export interface TrackLayoutSection {
  x: number;
  z: number;
  kind: TrackSectionKind;
  speedLimit: number;
  assistStrength: number;
  progress: number;
  point: THREE.Vector3;
}

export interface TrackLayout {
  id: string;
  name: string;
  roadWidth: number;
  tension: number;
  targetLapLengthMeters: number;
  lapLengthMeters: number;
  checkpointCount: number;
  variantId: string;
  sideMotifIds: string[];
  points: THREE.Vector3[];
  sections: TrackLayoutSection[];
}

export interface TrackValidationResult {
  valid: boolean;
  reasons: string[];
  centerlineIntersections: number;
  curbIntersections: number;
  minCenterlineClearance: number;
  minCurbClearance: number;
  minControlSegmentLength: number;
  maxTurnDegrees: number;
}

interface TrackValidationConfig {
  centerlineSamples: number;
  curbSamples: number;
  intersectionSkipSamples: number;
  clearanceSkipSamples: number;
  maxTurnDegrees: number;
  minControlSegmentLength: number;
  minCenterlineClearanceMultiplier: number;
  minCurbClearanceMultiplier: number;
}

const DRIVING_PROFILES: Record<TrackSectionKind, SectionDrivingProfile> = {
  start: { speedLimit: 28, assistStrength: 0.62 },
  straight: { speedLimit: 31, assistStrength: 0.5 },
  sweeper: { speedLimit: 27, assistStrength: 0.56 },
  hairpin: { speedLimit: 19, assistStrength: 0.76 },
  chicane: { speedLimit: 23, assistStrength: 0.68 },
  shortcut: { speedLimit: 30, assistStrength: 0.44 },
  ramp: { speedLimit: 32, assistStrength: 0.48 },
  doubleApex: { speedLimit: 25, assistStrength: 0.62 },
};

const DEFAULT_VALIDATION_CONFIG: TrackValidationConfig = {
  centerlineSamples: 360,
  curbSamples: 720,
  intersectionSkipSamples: 16,
  clearanceSkipSamples: 55,
  maxTurnDegrees: 132,
  minControlSegmentLength: 42,
  minCenterlineClearanceMultiplier: 4.5,
  minCurbClearanceMultiplier: 2.5,
};

type TrackSide = "bottom" | "right" | "top" | "left";

interface TrackConstraintSlot {
  angleDeg: number;
  angleJitterDeg: number;
  minRadius: number;
  maxRadius: number;
  kind: TrackSectionKind;
}

interface ForbiddenZone {
  id: string;
  side: TrackSide;
  x: number;
  z: number;
  radius: number;
  strength: number;
}

interface TrackConstraintProfile {
  sideTags: readonly [string, string, string, string];
  forbiddenZones: readonly ForbiddenZone[];
  radialBiases: readonly number[];
  angleBiasesDeg?: readonly number[];
}

const TOY_CONSTRAINT_SLOTS: readonly TrackConstraintSlot[] = [
  { angleDeg: -90, angleJitterDeg: 0, minRadius: 132, maxRadius: 132, kind: "start" },
  { angleDeg: -62, angleJitterDeg: 7, minRadius: 146, maxRadius: 190, kind: "straight" },
  { angleDeg: -34, angleJitterDeg: 8, minRadius: 150, maxRadius: 210, kind: "chicane" },
  { angleDeg: -6, angleJitterDeg: 8, minRadius: 158, maxRadius: 218, kind: "sweeper" },
  { angleDeg: 22, angleJitterDeg: 8, minRadius: 156, maxRadius: 218, kind: "hairpin" },
  { angleDeg: 50, angleJitterDeg: 8, minRadius: 146, maxRadius: 206, kind: "doubleApex" },
  { angleDeg: 78, angleJitterDeg: 7, minRadius: 136, maxRadius: 194, kind: "chicane" },
  { angleDeg: 106, angleJitterDeg: 7, minRadius: 130, maxRadius: 184, kind: "ramp" },
  { angleDeg: 134, angleJitterDeg: 8, minRadius: 138, maxRadius: 198, kind: "doubleApex" },
  { angleDeg: 162, angleJitterDeg: 8, minRadius: 158, maxRadius: 218, kind: "sweeper" },
  { angleDeg: 190, angleJitterDeg: 8, minRadius: 160, maxRadius: 222, kind: "hairpin" },
  { angleDeg: 218, angleJitterDeg: 8, minRadius: 150, maxRadius: 210, kind: "shortcut" },
  { angleDeg: 246, angleJitterDeg: 7, minRadius: 138, maxRadius: 190, kind: "sweeper" },
];

const TOY_CONSTRAINT_VARIANTS: readonly TrackTemplateVariant[] = [
  makeConstraintVariant("blocked-center-kinks", {
    sideTags: ["bottom-wide-pocket", "right-inside-block", "top-dip-block", "left-outer-hook"],
    forbiddenZones: [
      { id: "bottom-table-leg", side: "bottom", x: 72, z: -104, radius: 62, strength: 0.65 },
      { id: "right-chair-leg", side: "right", x: 132, z: 38, radius: 74, strength: 0.7 },
      { id: "top-book-stack", side: "top", x: -28, z: 112, radius: 68, strength: 0.7 },
      { id: "left-crayon-box", side: "left", x: -132, z: -56, radius: 76, strength: 0.65 },
    ],
    radialBiases: [0, 24, -16, 30, -12, 26, -22, 20, -10, 28, -18, 22, -14],
    angleBiasesDeg: [0, -5, 6, -3, 5, -6, 4, -5, 5, -4, 6, -5, 3],
  }),
  makeConstraintVariant("right-heavy-sweep", {
    sideTags: ["bottom-inside-shelf", "right-wide-sweeper", "top-left-notch", "left-low-shortcut"],
    forbiddenZones: [
      { id: "right-wall-gap", side: "right", x: 156, z: -18, radius: 70, strength: 0.75 },
      { id: "right-mid-post", side: "right", x: 132, z: 88, radius: 72, strength: 0.7 },
      { id: "top-corner-post", side: "top", x: -104, z: 120, radius: 72, strength: 0.65 },
      { id: "left-bottom-post", side: "left", x: -84, z: -120, radius: 64, strength: 0.65 },
    ],
    radialBiases: [0, -10, 32, -18, 34, 20, -8, 30, -22, 18, 32, -18, 24],
    angleBiasesDeg: [0, 5, -4, 6, -5, 4, -6, 5, -4, 6, -3, 5, -6],
  }),
  makeConstraintVariant("top-crown-switchback", {
    sideTags: ["bottom-bus-stop", "right-tight-gate", "top-crown-block", "left-stair-block"],
    forbiddenZones: [
      { id: "bottom-gate-post", side: "bottom", x: 116, z: -122, radius: 72, strength: 0.72 },
      { id: "right-gate-post", side: "right", x: 182, z: 42, radius: 62, strength: 0.68 },
      { id: "top-center-stack", side: "top", x: 12, z: 106, radius: 78, strength: 0.82 },
      { id: "left-step-block", side: "left", x: -176, z: 20, radius: 74, strength: 0.7 },
    ],
    radialBiases: [0, 34, -18, -26, 34, -28, 58, -48, 62, -18, 30, -28, 12],
    angleBiasesDeg: [0, -6, -6, 7, -5, 7, -8, 8, -8, 5, -5, 6, -4],
  }),
  makeConstraintVariant("left-wide-arc", {
    sideTags: ["bottom-dogleg-block", "right-middle-notch", "top-flat-run", "left-wide-arc"],
    forbiddenZones: [
      { id: "bottom-dogleg-block", side: "bottom", x: 46, z: -102, radius: 68, strength: 0.72 },
      { id: "right-middle-block", side: "right", x: 156, z: 66, radius: 70, strength: 0.76 },
      { id: "top-flat-block", side: "top", x: -54, z: 126, radius: 64, strength: 0.62 },
      { id: "left-wide-block", side: "left", x: -156, z: -34, radius: 86, strength: 0.8 },
    ],
    radialBiases: [0, -16, 22, -14, 26, -10, 22, 18, -18, 38, 18, 34, -20],
    angleBiasesDeg: [0, 6, -6, 5, -4, 5, -5, 4, -6, 5, -4, 6, -5],
  }),
  makeConstraintVariant("hourglass-infield", {
    sideTags: ["bottom-hourglass", "right-upper-pinch", "top-inside-dip", "left-lower-pinch"],
    forbiddenZones: [
      { id: "bottom-infield", side: "bottom", x: 98, z: -90, radius: 80, strength: 0.8 },
      { id: "right-upper-infield", side: "right", x: 118, z: 102, radius: 70, strength: 0.7 },
      { id: "top-infield", side: "top", x: -24, z: 92, radius: 76, strength: 0.78 },
      { id: "left-lower-infield", side: "left", x: -122, z: -92, radius: 72, strength: 0.7 },
    ],
    radialBiases: [0, 28, -8, 34, -18, 30, -16, 24, -24, 34, -10, 30, -18],
    angleBiasesDeg: [0, -4, 6, -6, 5, -5, 6, -4, 5, -6, 4, -5, 6],
  }),
  makeConstraintVariant("offset-peanut", {
    sideTags: ["bottom-offset-pocket", "right-outside-loop", "top-offset-pocket", "left-inside-loop"],
    forbiddenZones: [
      { id: "bottom-offset-block", side: "bottom", x: 134, z: -128, radius: 66, strength: 0.62 },
      { id: "right-outside-block", side: "right", x: 184, z: 14, radius: 70, strength: 0.72 },
      { id: "top-offset-block", side: "top", x: -92, z: 106, radius: 72, strength: 0.7 },
      { id: "left-inside-block", side: "left", x: -118, z: -12, radius: 78, strength: 0.74 },
    ],
    radialBiases: [0, 16, 34, -22, 28, -14, 20, 34, -18, 30, -24, 18, 28],
    angleBiasesDeg: [0, 4, -5, 6, -4, 6, -6, 4, -5, 6, -4, 5, -6],
  }),
];

function makeConstraintVariant(
  id: string,
  constraintProfile: TrackConstraintProfile,
): TrackTemplateVariant {
  return {
    id,
    sideMotifIds: constraintProfile.sideTags,
    constraintProfile,
  };
}

export const TRACK_TEMPLATES = {
  "toy-pretzel": {
    id: "toy-pretzel",
    name: "Toy Seedway",
    roadWidth: 12,
    targetLapLengthMeters: 900,
    checkpointCount: 10,
    tension: 0.24,
    jitter: 3.5,
    variants: TOY_CONSTRAINT_VARIANTS,
  },
  "toy-kidney": {
    id: "toy-kidney",
    name: "Toy Kidney",
    roadWidth: 12,
    targetLapLengthMeters: 890,
    checkpointCount: 10,
    tension: 0.28,
    jitter: 6.5,
    variants: [
      {
        id: "kidney",
        anchors: [
          { x: 0, z: -122, kind: "start" },
          { x: 104, z: -118, kind: "straight" },
          { x: 180, z: -62, kind: "sweeper" },
          { x: 166, z: 28, kind: "hairpin" },
          { x: 116, z: 98, kind: "doubleApex" },
          { x: 32, z: 132, kind: "chicane" },
          { x: -54, z: 96, kind: "chicane" },
          { x: -132, z: 122, kind: "ramp" },
          { x: -194, z: 44, kind: "hairpin" },
          { x: -168, z: -46, kind: "sweeper" },
          { x: -86, z: -104, kind: "shortcut" },
          { x: -18, z: -64, kind: "sweeper" },
        ],
      },
    ],
  },
} as const satisfies Record<string, TrackTemplate>;

export type TrackTemplateId = keyof typeof TRACK_TEMPLATES;

export function buildTrackLayout(
  id: TrackTemplateId = "toy-pretzel",
  seed: string | number = `${id}-default`,
): TrackLayout {
  const template = TRACK_TEMPLATES[id];
  const variantIndex = selectSeededVariantIndex(template, seed);
  const attemptsPerVariant = 12;

  for (let attempt = 0; attempt < template.variants.length * attemptsPerVariant; attempt += 1) {
    const variantOffset = Math.floor(attempt / attemptsPerVariant);
    const variantAttempt = attempt % attemptsPerVariant;
    const variant = template.variants[
      THREE.MathUtils.euclideanModulo(variantIndex + variantOffset, template.variants.length)
    ];
    const layout = buildCandidateLayout(template, variant, seed, variantAttempt);
    const validation = validateTrackLayout(layout);

    if (validation.valid) {
      return layout;
    }
  }

  return buildCandidateLayout(template, template.variants[0], `${id}-safe-fallback`, -1);
}

export function validateTrackLayout(
  layout: TrackLayout,
  config: TrackValidationConfig = DEFAULT_VALIDATION_CONFIG,
): TrackValidationResult {
  const curve = new THREE.CatmullRomCurve3(layout.points, true, "catmullrom", layout.tension);
  const centerlineSamples = curve.getSpacedPoints(config.centerlineSamples).slice(0, -1);
  const centerlineIntersections = countSegmentIntersections(
    centerlineSamples,
    config.intersectionSkipSamples,
  );
  const minCenterlineClearance = getMinimumNonAdjacentDistance(
    centerlineSamples,
    config.clearanceSkipSamples,
  );
  let curbIntersections = 0;
  let minCurbClearance = Infinity;

  for (const side of [-1, 1] as const) {
    const curbCurve = buildClosedCurbCurve(
      buildCurbPathPoints(centerlineSamples, side, layout.roadWidth),
    );
    const curbSamples = curbCurve.getSpacedPoints(config.curbSamples).slice(0, -1);

    curbIntersections += countSegmentIntersections(curbSamples, config.intersectionSkipSamples);
    minCurbClearance = Math.min(
      minCurbClearance,
      getMinimumNonAdjacentDistance(curbSamples, config.clearanceSkipSamples),
    );
  }

  const minControlSegmentLength = getMinimumControlSegmentLength(layout.points);
  const maxTurnDegrees = getMaxTurnDegrees(layout.points);
  const reasons: string[] = [];

  if (centerlineIntersections > 0) {
    reasons.push(`centerline intersects ${centerlineIntersections} time(s)`);
  }

  if (curbIntersections > 0) {
    reasons.push(`curbs intersect ${curbIntersections} time(s)`);
  }

  if (minCenterlineClearance < layout.roadWidth * config.minCenterlineClearanceMultiplier) {
    reasons.push(`centerline clearance ${minCenterlineClearance.toFixed(1)}m is too small`);
  }

  if (minCurbClearance < layout.roadWidth * config.minCurbClearanceMultiplier) {
    reasons.push(`curb clearance ${minCurbClearance.toFixed(1)}m is too small`);
  }

  if (minControlSegmentLength < config.minControlSegmentLength) {
    reasons.push(`control segment ${minControlSegmentLength.toFixed(1)}m is too short`);
  }

  if (maxTurnDegrees > config.maxTurnDegrees) {
    reasons.push(`turn angle ${maxTurnDegrees.toFixed(1)}deg is too sharp`);
  }

  return {
    valid: reasons.length === 0,
    reasons,
    centerlineIntersections,
    curbIntersections,
    minCenterlineClearance,
    minCurbClearance,
    minControlSegmentLength,
    maxTurnDegrees,
  };
}

function buildCandidateLayout(
  template: TrackTemplate,
  variant: TrackTemplateVariant,
  seed: string | number,
  attempt: number,
): TrackLayout {
  const anchors = makeSeededAnchors(template, variant, seed, attempt);
  const rawPoints = anchors.map((anchor) => new THREE.Vector3(anchor.x, 0.05, anchor.z));
  const rawCurve = new THREE.CatmullRomCurve3(rawPoints, true, "catmullrom", template.tension);
  const rawLength = estimateCurveLength(rawCurve, 720);
  const scale = template.targetLapLengthMeters / rawLength;
  const points = rawPoints.map((point) => new THREE.Vector3(point.x * scale, 0.05, point.z * scale));
  const curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", template.tension);
  const lapLengthMeters = estimateCurveLength(curve, 720);
  const sections = anchors.map((anchor, index) => {
    const profile = DRIVING_PROFILES[anchor.kind];
    const point = points[index];

    return {
      x: point.x,
      z: point.z,
      kind: anchor.kind,
      speedLimit: profile.speedLimit,
      assistStrength: profile.assistStrength,
      progress: index / anchors.length,
      point: point.clone(),
    };
  });

  return {
    id: template.id,
    name: template.name,
    roadWidth: template.roadWidth,
    tension: template.tension,
    targetLapLengthMeters: template.targetLapLengthMeters,
    lapLengthMeters,
    checkpointCount: template.checkpointCount,
    variantId: variant.id,
    sideMotifIds: [...(variant.sideMotifIds ?? [variant.id])],
    points,
    sections,
  };
}

function makeSeededAnchors(
  template: TrackTemplate,
  variant: TrackTemplateVariant,
  seed: string | number,
  attempt: number,
): TrackTemplateAnchor[] {
  if (variant.constraintProfile) {
    return makeConstrainedAnchors(variant, seed, attempt);
  }

  if (!variant.anchors) {
    throw new Error(`Track variant "${variant.id}" has no anchors or constraint profile.`);
  }

  const rand = mulberry32(hashSeed(`${template.id}:${variant.id}:${seed}:${attempt}`));
  const anchors: TrackTemplateAnchor[] = [];

  for (let i = 0; i < variant.anchors.length; i += 1) {
    const anchor = variant.anchors[i];
    const isStart = i === 0;
    const jitterScale = attempt < 0 || isStart ? 0 : 1;
    const radialScale = attempt < 0 ? 1 : randomRange(rand, 0.965, 1.035);
    const x = anchor.x * radialScale + randomRange(rand, -template.jitter, template.jitter) * jitterScale;
    const z = anchor.z * radialScale + randomRange(rand, -template.jitter, template.jitter) * jitterScale;

    anchors.push({ x, z, kind: anchor.kind });
  }

  return anchors;
}

function makeConstrainedAnchors(
  variant: TrackTemplateVariant,
  seed: string | number,
  attempt: number,
): TrackTemplateAnchor[] {
  const profile = variant.constraintProfile;

  if (!profile) {
    return [];
  }

  const rand = mulberry32(hashSeed(`constraint:${variant.id}:${seed}:${attempt}`));
  const anchors = TOY_CONSTRAINT_SLOTS.map((slot, index) => {
    if (index === 0) {
      return { x: 0, z: -132, kind: slot.kind };
    }

    const radiusBias = profile.radialBiases[index] ?? 0;
    const angleBias = profile.angleBiasesDeg?.[index] ?? 0;
    const radius = THREE.MathUtils.clamp(
      randomRange(rand, slot.minRadius, slot.maxRadius)
        + radiusBias
        + randomRange(rand, -5, 5),
      128,
      226,
    );
    const angleDeg = slot.angleDeg
      + angleBias
      + randomRange(rand, -slot.angleJitterDeg, slot.angleJitterDeg);
    const angle = THREE.MathUtils.degToRad(angleDeg);
    const point = new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);

    repelFromForbiddenZones(point, profile.forbiddenZones, angle);

    return {
      x: point.x,
      z: point.y,
      kind: slot.kind,
    };
  });

  return smoothConstraintAnchors(anchors);
}

function repelFromForbiddenZones(
  point: THREE.Vector2,
  forbiddenZones: readonly ForbiddenZone[],
  fallbackAngle: number,
): void {
  for (let iteration = 0; iteration < 3; iteration += 1) {
    for (const zone of forbiddenZones) {
      const dx = point.x - zone.x;
      const dz = point.y - zone.z;
      const distance = Math.hypot(dx, dz);

      if (distance >= zone.radius) {
        continue;
      }

      const pushDistance = (zone.radius - distance) * zone.strength;
      const directionX = distance > 0.001 ? dx / distance : Math.cos(fallbackAngle);
      const directionZ = distance > 0.001 ? dz / distance : Math.sin(fallbackAngle);

      point.x += directionX * pushDistance;
      point.y += directionZ * pushDistance;
    }
  }
}

function smoothConstraintAnchors(anchors: readonly TrackTemplateAnchor[]): TrackTemplateAnchor[] {
  return anchors.map((anchor, index) => {
    if (index === 0) {
      return anchor;
    }

    const previous = anchors[THREE.MathUtils.euclideanModulo(index - 1, anchors.length)];
    const next = anchors[(index + 1) % anchors.length];
    const x = anchor.x * 0.84 + (previous.x + next.x) * 0.08;
    const z = anchor.z * 0.84 + (previous.z + next.z) * 0.08;

    return { x, z, kind: anchor.kind };
  });
}

function selectSeededVariantIndex(template: TrackTemplate, seed: string | number): number {
  if (typeof seed === "number") {
    const numericSeed = Math.abs(Math.floor(seed));
    return THREE.MathUtils.euclideanModulo(numericSeed - 1, template.variants.length);
  }

  return hashSeed(`${template.id}:${seed}:variant`) % template.variants.length;
}

function estimateCurveLength(curve: THREE.CatmullRomCurve3, sampleCount: number): number {
  const samples = curve.getSpacedPoints(sampleCount);
  let length = 0;

  for (let i = 0; i < samples.length; i += 1) {
    length += samples[i].distanceTo(samples[(i + 1) % samples.length]);
  }

  return length;
}

function countSegmentIntersections(points: readonly THREE.Vector3[], skipSamples: number): number {
  let intersections = 0;

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];

    for (let j = i + 1; j < points.length; j += 1) {
      const circularDistance = getCircularIndexDistance(i, j, points.length);

      if (circularDistance < skipSamples) {
        continue;
      }

      if (segmentsIntersect(a, b, points[j], points[(j + 1) % points.length])) {
        intersections += 1;
      }
    }
  }

  return intersections;
}

function getMinimumNonAdjacentDistance(
  points: readonly THREE.Vector3[],
  skipSamples: number,
): number {
  let minDistance = Infinity;

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const circularDistance = getCircularIndexDistance(i, j, points.length);

      if (circularDistance < skipSamples) {
        continue;
      }

      minDistance = Math.min(minDistance, horizontalDistance(points[i], points[j]));
    }
  }

  return minDistance;
}

function getMinimumControlSegmentLength(points: readonly THREE.Vector3[]): number {
  let minLength = Infinity;

  for (let i = 0; i < points.length; i += 1) {
    minLength = Math.min(minLength, horizontalDistance(points[i], points[(i + 1) % points.length]));
  }

  return minLength;
}

function getMaxTurnDegrees(points: readonly THREE.Vector3[]): number {
  let maxTurn = 0;

  for (let i = 0; i < points.length; i += 1) {
    const previous = points[THREE.MathUtils.euclideanModulo(i - 1, points.length)];
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const incoming = new THREE.Vector2(current.x - previous.x, current.z - previous.z).normalize();
    const outgoing = new THREE.Vector2(next.x - current.x, next.z - current.z).normalize();
    const dot = THREE.MathUtils.clamp(incoming.dot(outgoing), -1, 1);
    const turnDegrees = THREE.MathUtils.radToDeg(Math.acos(dot));

    maxTurn = Math.max(maxTurn, turnDegrees);
  }

  return maxTurn;
}

function getCircularIndexDistance(a: number, b: number, length: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, length - distance);
}

function segmentsIntersect(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
): boolean {
  const o1 = orient2d(a, b, c);
  const o2 = orient2d(a, b, d);
  const o3 = orient2d(c, d, a);
  const o4 = orient2d(c, d, b);

  return o1 * o2 < 0 && o3 * o4 < 0;
}

function orient2d(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function hashSeed(input: string): number {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
