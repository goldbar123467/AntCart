// Deterministic procedural-asset placement for the seeded AntCarts worlds.
//
// Goal: given a track layout + race seed, produce a stable list of placed-asset
// records. Same seed -> same positions, every time. The road surface stays clear
// of solid assets; big solid pieces also get static physics colliders (added by
// the spawner, not here, to keep this module pure and DOM-free).
//
// This module is intentionally parallel to `src/game/setPieces.ts` and does NOT
// touch it. The existing `getRoomSetPieces() -> []` contract stays intact for
// worker 108's "remove room decor" test; placements here are a separate system
// for the 12 procedural assets added under `src/assets/`.

import { mulberry32, randomRange, randomChoice } from "./random";

/** Asset kinds exported by src/assets/index.ts. */
export type AssetKind =
  | "couch"
  | "coffeeTable"
  | "woodenChair"
  | "bookStack"
  | "shoe"
  | "toyBlock"
  | "pencil"
  | "cardboardBox"
  | "floorLamp"
  | "rug"
  | "tvOnStand"
  | "baseboard"
  | "cerealCrumbs";

/**
 * A single placed asset. Pure data - the spawner turns this into a THREE.Group.
 * `seed` is per-asset so each procedural asset's internal variation is also stable.
 */
export interface PlacedAsset {
  kind: AssetKind;
  x: number;
  y?: number;
  z: number;
  rotationY: number;
  scale: number;
  seed: number;
  /** Approximate footprint radius (meters) used for clearance + collider sizing. */
  footprint: number;
  /** True for big solid pieces the kart should collide with. */
  collidable: boolean;
  /** Optional per-kind options forwarded to the factory. */
  options?: Record<string, boolean | number | undefined>;
}

/** Minimal track info needed for placement (adapted from TrackLayout). */
export interface TrackInfo {
  /** Centerline sample points (x,z). Closed loop. */
  points: ReadonlyArray<{ x: number; z: number }>;
  roadWidth: number;
  lapLengthMeters: number;
}

/** Room bounds (matches main.ts roomHalfWidth/roomHalfDepth). */
export interface RoomBounds {
  halfWidth: number;
  halfDepth: number;
}

export const DEFAULT_ROOM_BOUNDS: RoomBounds = { halfWidth: 230, halfDepth: 160 };

/** Per-kind footprint + collider metadata. Footprint is the larger of half-width/depth.
 *  These are BASE sizes; the global wacky multiplier (ASSET_GLOBAL_SCALE) inflates
 *  everything so human-house furniture towers over the ant-sized kart. */
const ASSET_FOOTPRINT: Record<AssetKind, { footprint: number; collidable: boolean }> = {
  couch: { footprint: 3.8, collidable: true },
  coffeeTable: { footprint: 2.2, collidable: true },
  woodenChair: { footprint: 1.0, collidable: true },
  bookStack: { footprint: 1.1, collidable: true },
  shoe: { footprint: 1.7, collidable: true },
  toyBlock: { footprint: 1.1, collidable: true },
  pencil: { footprint: 0.3, collidable: false }, // thin pole; visual only by default
  cardboardBox: { footprint: 1.5, collidable: true },
  floorLamp: { footprint: 0.6, collidable: false }, // thin pole
  rug: { footprint: 5.0, collidable: false }, // flat, drive-over
  tvOnStand: { footprint: 3.3, collidable: true },
  baseboard: { footprint: 0.3, collidable: true }, // wall trim
  cerealCrumbs: { footprint: 3.0, collidable: false }, // small scatter, drive-over
};

/**
 * Global wacky multiplier. The kart is ant-sized (~2.2m long), so human-house
 * furniture should be enormous relative to it. At 3.5x a couch becomes ~24m long
 * — proper giant-furniture-from-an-ant's-EYE scale. Applied to scale + footprint
 * so clearance/overlap/collider math stays consistent.
 */
const ASSET_GLOBAL_SCALE = 3.5;
const LIVING_ROOM_SCALE = 2.5;

/** Knobs for the placement generator. */
export interface PlacementConfig {
  /** How many seeded scatter pieces to place (besides landmarks + baseboards). */
  scatterCount?: number;
  /** Clearance from track centerline kept clear of solid assets (meters). */
  roadClearance?: number;
  /** Margin from walls kept clear (meters). */
  wallMargin?: number;
  /** Max attempts per scatter piece before giving up. */
  maxAttempts?: number;
  roomBounds?: RoomBounds;
}

const DEFAULT_CONFIG: Required<PlacementConfig> = {
  scatterCount: 0,
  roadClearance: 9, // roadWidth(12)/2 + ~3m buffer
  wallMargin: 6,
  maxAttempts: 60,
  roomBounds: DEFAULT_ROOM_BOUNDS,
};

/**
 * Compute the full asset placement list for a seeded world.
 * Deterministic: same (track, seed, config) -> identical output.
 */
export function computeAssetPlacements(
  track: TrackInfo,
  seed: number,
  config: PlacementConfig = {},
): PlacedAsset[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const room = cfg.roomBounds;
  const rand = mulberry32(seed);

  const placements: PlacedAsset[] = [];
  let scatterIndex = 0;

  // --- Landmark placements (fixed room identity, seed-independent positions) ---
  // These define a clean central living room: rug, sofa, coffee table, books, and
  // lit floor lamps. Solid furniture is still road-aware.
  for (const landmark of makeLandmarks(track, room)) {
    if (!landmark.collidable
      || isClearOfTrack(landmark.x, landmark.z, track, cfg.roadClearance, landmark.footprint)) {
      placements.push(landmark);
    }
  }

  // --- Baseboard trim tiling all 4 walls (deterministic, seed-independent) ---
  for (const board of makeBaseboardTrim(room)) {
    placements.push(board);
  }

  // --- Seeded scatter pieces ---
  // Off by default: the room should read as a clean staged living room, not a
  // random prop field. Passing scatterCount opts back into seedable loose props.
  const scatterKinds: AssetKind[] = [
    "woodenChair",
    "bookStack",
    "shoe",
    "toyBlock",
    "pencil",
    "cardboardBox",
    "cerealCrumbs",
  ];

  let placed = 0;
  let attempts = 0;
  while (placed < cfg.scatterCount && attempts < cfg.maxAttempts * cfg.scatterCount) {
    attempts++;
    const kind = randomChoice(rand, scatterKinds);
    const meta = ASSET_FOOTPRINT[kind];
    const footprint = meta.footprint * ASSET_GLOBAL_SCALE;
    // Polar scatter biased toward the room edges (where furniture collects).
    const edgeBias = randomRange(rand, 0.55, 0.95);
    const angle = randomRange(rand, 0, Math.PI * 2);
    const maxR = Math.min(room.halfWidth, room.halfDepth) - cfg.wallMargin - footprint;
    const r = maxR * edgeBias;
    const x = Math.cos(angle) * r * (room.halfWidth / Math.min(room.halfWidth, room.halfDepth));
    const z = Math.sin(angle) * r;

    if (!inRoom(x, z, room, cfg.wallMargin + footprint)) continue;
    if (!isClearOfTrack(x, z, track, cfg.roadClearance, footprint)) continue;
    if (overlapsExisting(x, z, placements, footprint + 1.5)) continue;

    placements.push({
      kind,
      x,
      z,
      rotationY: randomRange(rand, 0, Math.PI * 2),
      scale: randomRange(rand, 0.92, 1.12) * ASSET_GLOBAL_SCALE,
      seed: hashSeed(seed, kind, scatterIndex),
      footprint,
      collidable: meta.collidable,
      options: perKindOptions(kind, rand),
    });
    scatterIndex++;
    placed++;
  }

  return placements;
}

/** Fixed landmark pieces that give the room its living-room identity. */
function makeLandmarks(track: TrackInfo, room: RoomBounds): PlacedAsset[] {
  const landmarks: PlacedAsset[] = [];
  const baseSeed = 1000;
  const center = chooseLivingRoomCenter(track);
  const s = LIVING_ROOM_SCALE;
  const couchZ = center.z - 28 * s;
  const tableZ = center.z - 4 * s;
  const tableVisualScale = 0.95 * s * ASSET_GLOBAL_SCALE;
  const bookX = center.x - 8 * s;
  const bookZ = center.z - 8 * s;

  // A big drive-over rug anchors the center of the room.
  landmarks.push(makeLandmark("rug", center.x, center.z, 0, baseSeed + 1, {
    scale: 1.25 * s,
    options: {
      length: 10.5,
      depth: 7.4,
      field: 0x87533c,
      border: 0x1f4566,
      medallion: 0xd8b45c,
    },
  }));
  // Sofa sits on one side of the rug, facing into the room.
  landmarks.push(makeLandmark("couch", center.x, couchZ, 0, baseSeed + 2, {
    scale: 1.0 * s,
    options: {
      upholstery: 0x8e765b,
      cushion: 0x6f5f50,
    },
  }));
  landmarks.push(makeLandmark("coffeeTable", center.x, tableZ, 0, baseSeed + 3, {
    scale: 0.95 * s,
    options: {
      wood: 0x6e4a2f,
      top: 0x4a3020,
    },
  }));
  landmarks.push(makeLandmark("pencil", center.x + 1.4 * s, tableZ - 0.4 * s, Math.PI * 0.08, baseSeed + 9, {
    y: tableVisualScale * 1.2,
    scale: 0.385 * s,
    options: {
      body: 0xf6c844,
      eraser: 0xe58b9a,
      upright: false,
    },
  }));
  // Books and lamps are intentionally near the sofa so the room reads as staged,
  // not random clutter.
  landmarks.push(makeLandmark("bookStack", bookX, bookZ, -0.25, baseSeed + 4, {
    scale: 0.92 * s,
    options: { count: 6 },
  }));
  landmarks.push(makeLandmark("floorLamp", center.x + 17 * s, center.z - 10 * s, 0.3, baseSeed + 5, {
    scale: 1.08 * s,
    options: {
      emitLight: true,
      lightIntensity: 34,
      lightDistance: 72,
      shade: 0xf4dfb2,
    },
  }));
  landmarks.push(makeLandmark("floorLamp", center.x - 17 * s, center.z + 10 * s, -0.4, baseSeed + 6, {
    scale: 0.98 * s,
    options: {
      emitLight: true,
      lightIntensity: 20,
      lightDistance: 54,
      shade: 0xefe6c8,
    },
  }));
  landmarks.push(makeLandmark("woodenChair", center.x + 24 * s, center.z + 16 * s, Math.PI * 0.88, baseSeed + 7, {
    scale: 1.0 * s,
    options: { wood: 0x795334 },
  }));
  landmarks.push(makeLandmark("tvOnStand", center.x, center.z + 14 * s, Math.PI, baseSeed + 8, {
    scale: 0.92 * s,
    options: {
      wood: 0x694321,
      cabinet: 0x8a5a2d,
      broadcastSeed: baseSeed + 8,
      hidePlant: true,
    },
  }));

  return landmarks;
}

function chooseLivingRoomCenter(track: TrackInfo): { x: number; z: number } {
  const candidates = [
    { x: 0, z: 0 },
    { x: -48, z: 18 },
    { x: 54, z: -10 },
    { x: 0, z: 42 },
  ];

  for (const candidate of candidates) {
    if (isLivingRoomClusterClear(candidate.x, candidate.z, track)) {
      return candidate;
    }
  }

  return candidates[0];
}

function isLivingRoomClusterClear(x: number, z: number, track: TrackInfo): boolean {
  const s = LIVING_ROOM_SCALE;
  const samples = [
    { kind: "couch" as const, scale: 1.0 * s, x, z: z - 28 * s },
    { kind: "coffeeTable" as const, scale: 0.95 * s, x, z: z - 4 * s },
    { kind: "bookStack" as const, scale: 0.92 * s, x: x - 8 * s, z: z - 8 * s },
    { kind: "floorLamp" as const, scale: 1.08 * s, x: x + 17 * s, z: z - 10 * s },
    { kind: "floorLamp" as const, scale: 0.98 * s, x: x - 17 * s, z: z + 10 * s },
    { kind: "woodenChair" as const, scale: 1.0 * s, x: x + 24 * s, z: z + 16 * s },
    { kind: "tvOnStand" as const, scale: 0.92 * s, x, z: z + 14 * s },
  ];

  return samples.every((sample) => {
    const footprint = ASSET_FOOTPRINT[sample.kind].footprint * ASSET_GLOBAL_SCALE * sample.scale;
    return isClearOfTrack(sample.x, sample.z, track, DEFAULT_CONFIG.roadClearance, footprint);
  });
}

function makeLandmark(
  kind: AssetKind,
  x: number,
  z: number,
  rotationY: number,
  seed: number,
  extra: { y?: number; scale?: number; options?: PlacedAsset["options"] } = {},
): PlacedAsset {
  const meta = ASSET_FOOTPRINT[kind];
  const scale = (extra.scale ?? 1.0) * ASSET_GLOBAL_SCALE;
  return {
    kind,
    x,
    y: extra.y,
    z,
    rotationY,
    scale,
    seed,
    footprint: meta.footprint * scale,
    collidable: meta.collidable,
    options: extra.options,
  };
}

/** Tile baseboard segments along all 4 walls. */
function makeBaseboardTrim(room: RoomBounds): PlacedAsset[] {
  const boards: PlacedAsset[] = [];
  const segLen = 12; // matches standard track width; classic baseboard run
  const margin = 1.5;
  const baseSeed = 2000;
  let i = 0;

  // Bottom + top walls (run along X)
  for (const z of [-room.halfDepth + margin, room.halfDepth - margin]) {
    for (let x = -room.halfWidth + segLen / 2; x <= room.halfWidth - segLen / 2; x += segLen) {
      boards.push(makeLandmark("baseboard", x, z, 0, baseSeed + i++));
    }
  }
  // Left + right walls (run along Z), rotated 90deg
  for (const x of [-room.halfWidth + margin, room.halfWidth - margin]) {
    for (let z = -room.halfDepth + segLen / 2; z <= room.halfDepth - segLen / 2; z += segLen) {
      boards.push(makeLandmark("baseboard", x, z, Math.PI / 2, baseSeed + i++));
    }
  }
  return boards;
}

/** Per-kind option rolling (e.g. some pencils stand upright, some boxes sealed). */
function perKindOptions(kind: AssetKind, rand: () => number): PlacedAsset["options"] {
  if (kind === "pencil") return { upright: rand() < 0.4 };
  if (kind === "cardboardBox") return { sealed: rand() < 0.5 };
  if (kind === "toyBlock") return { asRamp: rand() < 0.5 };
  return undefined;
}

/** Distance from (x,z) to the nearest track centerline sample. */
export function distanceToTrack(
  x: number,
  z: number,
  track: TrackInfo,
): number {
  let min = Infinity;
  for (const p of track.points) {
    const dx = p.x - x;
    const dz = p.z - z;
    const d = dx * dx + dz * dz;
    if (d < min) min = d;
  }
  return Math.sqrt(min);
}

function isClearOfTrack(
  x: number,
  z: number,
  track: TrackInfo,
  roadClearance: number,
  footprint: number,
): boolean {
  return distanceToTrack(x, z, track) >= roadClearance + footprint * 0.5;
}

function inRoom(x: number, z: number, room: RoomBounds, margin: number): boolean {
  return (
    Math.abs(x) <= room.halfWidth - margin && Math.abs(z) <= room.halfDepth - margin
  );
}

function overlapsExisting(
  x: number,
  z: number,
  existing: PlacedAsset[],
  minSeparation: number,
): boolean {
  for (const e of existing) {
    if (e.kind === "baseboard" || e.kind === "rug") continue; // trim/rug don't block
    const dx = e.x - x;
    const dz = e.z - z;
    if (dx * dx + dz * dz < minSeparation * minSeparation) return true;
  }
  return false;
}

/** Stable string-hash -> uint32, used for per-asset seeds. */
export function hashSeed(seed: number, kind: string, index: number): number {
  const s = `${seed}:${kind}:${index}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 1_000_000;
}
