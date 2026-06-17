import * as THREE from "three";
import * as CANNON from "cannon-es";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getStartGridPose } from "./game/checkpointVisual";
import {
  DEFAULT_ARCADE_KART_CONFIG,
  createArcadeKartState,
  stepArcadeKart,
  type ArcadeKartState,
} from "./game/arcadeKart";
import { createRaceState } from "./game/raceState";
import { getSpeedGaugeState } from "./game/speedGauge";
import { buildClosedCurbCurve, buildCurbPathPoints } from "./game/trackCurbs";
import { buildRoadSurfaceGeometry } from "./game/trackSurface";
import { buildTrackLayout, type TrackLayoutSection } from "./game/trackTemplates";
import { TRACK_RAIL_CONFIG } from "./game/trackVisualConfig";
import { computeAssetPlacements, type TrackInfo } from "./game/assetPlacement";
import { spawnPlacedAssets } from "./render/assetSpawner";
import { createRoomMaterials } from "./render/roomMaterials";
import type { InputState } from "./game/types";
import "./style.css";

interface Checkpoint {
  position: THREE.Vector3;
  index: number;
  passed: boolean;
}

interface EngineAudio {
  start: () => Promise<void>;
  update: (speedRatio: number) => void;
  isRunning: () => boolean;
}

interface AiRacer {
  group: THREE.Group;
  progress: number;
  speed: number;
  laneOffset: number;
}

interface BoostPad {
  position: THREE.Vector3;
  cooldown: number;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8faabd);
scene.fog = new THREE.FogExp2(0x8faabd, 0.0018);
RectAreaLightUniformsLib.init();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 1000);

const physicsWorld = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});
physicsWorld.allowSleep = true;
physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);

const staticPhysicsMaterial = new CANNON.Material("toy-room-static");
const kartPhysicsMaterial = new CANNON.Material("ant-kart");
physicsWorld.addContactMaterial(
  new CANNON.ContactMaterial(staticPhysicsMaterial, kartPhysicsMaterial, {
    friction: 0.34,
    restitution: 0.05,
  }),
);

const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
  material: staticPhysicsMaterial,
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
physicsWorld.addBody(groundBody);

const fixedPhysicsStep = 1 / 60;
const maxPhysicsSubSteps = 4;
const roomHalfWidth = 230;
const roomHalfDepth = 160;
const roomWallHeight = 45;
const totalRaceLaps = 3;
const boostPads: BoostPad[] = [];

const ambientLight = new THREE.AmbientLight(0xfff3dc, 0.1);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xd6e7f5, 0x8d7b68, 0.72);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffe1a6, 2.25);
sunLight.position.set(-78, 86, -44);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -260;
sunLight.shadow.camera.right = 260;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
sunLight.shadow.camera.far = 280;
sunLight.shadow.bias = -0.00004;
sunLight.shadow.normalBias = 0.08;
sunLight.shadow.radius = 4;
sunLight.shadow.blurSamples = 12;
scene.add(sunLight);

const seed = getRaceSeed();

console.log(`Race seed: ${seed}`);

const roomMaterials = createRoomMaterials(renderer);
const matTrack = new THREE.MeshStandardMaterial({ color: 0x2d6bbf, roughness: 0.82 });
const matTrackStripe = new THREE.MeshStandardMaterial({ color: 0xf4d150, roughness: 0.7 });
const matKartRed = new THREE.MeshStandardMaterial({ color: 0xc73128, roughness: 0.55, metalness: 0.08 });
const matKartWhite = new THREE.MeshStandardMaterial({ color: 0xf8f4e9, roughness: 0.45 });
const matKartBlack = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.74 });
const matAnt = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.62 });
const matToyRed = new THREE.MeshStandardMaterial({ color: 0xd83b45, roughness: 0.72 });
const matToyYellow = new THREE.MeshStandardMaterial({ color: 0xf1cc35, roughness: 0.72 });
const matDoorPanel = new THREE.MeshStandardMaterial({ color: 0x755238, roughness: 0.64 });
const matDoorTrim = new THREE.MeshStandardMaterial({ color: 0xd6c9b8, roughness: 0.7 });
const matDoorHardware = new THREE.MeshStandardMaterial({ color: 0xb9974a, roughness: 0.34, metalness: 0.8 });
const matWindowFrame = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.72 });
const matWindowGlass = new THREE.MeshBasicMaterial({
  color: 0x8fc8e8,
  transparent: true,
  opacity: 0.34,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const matWindowGlow = new THREE.MeshBasicMaterial({
  color: 0x6fc6ff,
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});
const matSunPatch = new THREE.MeshBasicMaterial({
  color: 0xc9eaff,
  transparent: true,
  opacity: 0.055,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});

const trackLayout = buildTrackLayout("toy-pretzel", seed);
const roadWidth = trackLayout.roadWidth;
const trackPoints = trackLayout.points;
const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, "catmullrom", trackLayout.tension);
const trackSamples = trackCurve.getSpacedPoints(360).slice(0, -1);
const lapLengthMeters = trackLayout.lapLengthMeters;
const checkpointPoints = makeCheckpointPoints(trackCurve, trackLayout.checkpointCount);
const input: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};
const vehicleConfig = DEFAULT_ARCADE_KART_CONFIG;
const raceState = createRaceState();

createToyRoom();
makeTrackVisual(trackSamples);
// Procedural asset placement: deterministic per race seed, road kept clear,
// solid pieces get static physics colliders. Parallel to (not replacing)
// getRoomSetPieces() so worker 108's empty-decor contract stays intact.
const assetTrackInfo: TrackInfo = {
  points: trackSamples.map((p) => ({ x: p.x, z: p.z })),
  roadWidth,
  lapLengthMeters,
};
const assetPlacements = computeAssetPlacements(assetTrackInfo, seed);
spawnPlacedAssets(assetPlacements, {
  scene,
  physicsWorld,
  staticPhysicsMaterial,
});
const checkpoints = makeCheckpoints(checkpointPoints);
const aiRacers = makeAiRacers();
makeTrackPickups(trackCurve, lapLengthMeters);
const kart = makeKart();
const startPose = getStartGridPose(checkpointPoints);
kart.position.copy(startPose.position);
let playerHeading = startPose.heading;
kart.rotation.y = playerHeading;
scene.add(kart);
let kartDriveState: ArcadeKartState = createArcadeKartState({
  heading: playerHeading,
});
let boostTimer = 0;

const hud = createHud();
const minimap = createMiniMap();
const speedGauge = createSpeedGauge();
const controlsHint = createControlsHint();
const audioButton = createAudioButton();
const engineAudio = createEngineAudio();
let score = 0;
let raceTimeSeconds = 240;
let raceFinished = false;
let lastTime = performance.now();

updateCamera(1);

audioButton.addEventListener("click", () => {
  void startEngineAudio();
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", (event) => setKey(event.code, false));
window.addEventListener("resize", resize);

renderer.setAnimationLoop((time) => {
  const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  raceTimeSeconds = Math.max(0, raceTimeSeconds - deltaSeconds);

  updateKart(deltaSeconds);
  updateAiRacers(deltaSeconds);
  updateBoostPads(deltaSeconds);
  updateCheckpoints();
  updateCamera(deltaSeconds);
  updateHud();
  updateMiniMap();
  updateSpeedGauge();
  engineAudio.update(getSpeedGaugeState(raceState.speed).ratio);
  renderer.render(scene, camera);
});

(window as Window & {
  antcartsDebug?: () => {
    speedMps: number;
    heading: number;
    lapLengthMeters: number;
    variantId: string;
    lap: number;
    nextCheckpointIndex: number;
    boostTimer: number;
    sectionKind: string;
    position: { x: number; z: number };
  };
}).antcartsDebug = () => ({
  speedMps: Number(raceState.speed.toFixed(3)),
  heading: Number(playerHeading.toFixed(3)),
  lapLengthMeters: Number(lapLengthMeters.toFixed(1)),
  variantId: trackLayout.variantId,
  lap: raceState.lap,
  nextCheckpointIndex: raceState.nextCheckpointIndex,
  boostTimer: Number(boostTimer.toFixed(2)),
  sectionKind: getCurrentTrackSection().kind,
  position: {
    x: Number(kart.position.x.toFixed(2)),
    z: Number(kart.position.z.toFixed(2)),
  },
});

function getRaceSeed(): number {
  const seedParam = new URLSearchParams(window.location.search).get("seed");
  const parsedSeed = seedParam ? Number(seedParam) : NaN;

  if (Number.isFinite(parsedSeed)) {
    return Math.abs(Math.floor(parsedSeed)) % 1_000_000;
  }

  return Math.floor(Math.random() * 999_999);
}

function createToyRoom(): void {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(460, 0.18, 320, 80, 1, 56), roomMaterials.carpet);
  floor.position.y = -0.12;
  floor.receiveShadow = true;
  scene.add(floor);

  addWall(0, -160.2, 460, roomWallHeight, 0.4, 0);
  addWall(0, 160.2, 460, roomWallHeight, 0.4, 0);
  addWall(-230.2, 0, 320, roomWallHeight, 0.4, Math.PI / 2);
  addWall(230.2, 0, 320, roomWallHeight, 0.4, Math.PI / 2);
  addWallWindows();
  addWallDoors();
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(460, 0.35, 320, 60, 1, 44),
    roomMaterials.ceiling,
  );
  ceiling.position.y = roomWallHeight + 0.2;
  ceiling.receiveShadow = true;
  scene.add(ceiling);
}

function addWallDoors(): void {
  addDoorPanel(new THREE.Vector3(-229.86, 0, -40), Math.PI / 2, 27.5, roomWallHeight - 2.2);
  addDoorPanel(new THREE.Vector3(229.86, 0, 40), -Math.PI / 2, 27.5, roomWallHeight - 2.2);
}

function addDoorPanel(position: THREE.Vector3, rotationY: number, width: number, height: number): void {
  const group = new THREE.Group();
  group.name = "room-wall-door";
  group.position.copy(position);
  group.rotation.y = rotationY;

  const doorGeometry = makeMergedDoorGeometry(width, height, 0.34);
  const door = new THREE.Mesh(doorGeometry, matDoorPanel);
  door.name = "merged-door-panel";
  door.castShadow = false;
  door.receiveShadow = true;
  group.add(door);

  addDoorFramePiece(group, width + 1.8, 0.78, new THREE.Vector3(0, height + 0.35, 0.12));
  addDoorFramePiece(group, 0.78, height + 1.45, new THREE.Vector3(-width * 0.5 - 0.55, height * 0.5, 0.12));
  addDoorFramePiece(group, 0.78, height + 1.45, new THREE.Vector3(width * 0.5 + 0.55, height * 0.5, 0.12));
  addDoorFramePiece(group, width + 2.3, 0.36, new THREE.Vector3(0, 0.18, 0.14));

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), matDoorHardware);
  knob.name = "door-knob";
  knob.position.set(width * 0.32, height * 0.46, 0.44);
  knob.castShadow = false;
  knob.receiveShadow = true;
  group.add(knob);

  scene.add(group);
}

function makeMergedDoorGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];
  const slab = new THREE.BoxGeometry(width, height, depth);
  slab.translate(0, height * 0.5, 0.05);
  geometries.push(slab);

  for (const y of [height * 0.34, height * 0.69]) {
    const panel = new THREE.BoxGeometry(width * 0.68, height * 0.22, depth * 0.52);
    panel.translate(0, y, depth * 0.48);
    geometries.push(panel);
  }

  const rail = new THREE.BoxGeometry(width * 0.74, 0.42, depth * 0.5);
  rail.translate(0, height * 0.52, depth * 0.5);
  geometries.push(rail);

  const merged = mergeGeometries(geometries, false);
  if (!merged) {
    throw new Error("Could not merge door geometry.");
  }
  merged.computeVertexNormals();
  return merged;
}

function addDoorFramePiece(group: THREE.Group, width: number, height: number, position: THREE.Vector3): void {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.34), matDoorTrim);
  frame.position.copy(position);
  frame.castShadow = false;
  frame.receiveShadow = true;
  group.add(frame);
}

function addWallWindows(): void {
  const y = 25.8;
  const width = 26;
  const height = 10.5;

  addWindowPanel(new THREE.Vector3(-88, y, -159.88), 0, width, height, new THREE.Vector3(-34, 7, -70));
  addWindowPanel(new THREE.Vector3(92, y, -159.88), 0, width, height, new THREE.Vector3(40, 7, -60));
  addWindowPanel(new THREE.Vector3(-92, y, 159.88), Math.PI, width, height, new THREE.Vector3(-28, 7, 64));
  addWindowPanel(new THREE.Vector3(88, y, 159.88), Math.PI, width, height, new THREE.Vector3(34, 7, 70));

  addWindowPanel(new THREE.Vector3(-229.88, y, -70), Math.PI / 2, 24, height, new THREE.Vector3(-88, 7, -30));
  addWindowPanel(new THREE.Vector3(-229.88, y, 74), Math.PI / 2, 24, height, new THREE.Vector3(-72, 7, 42));
  addWindowPanel(new THREE.Vector3(229.88, y, -72), -Math.PI / 2, 24, height, new THREE.Vector3(82, 7, -40));
  addWindowPanel(new THREE.Vector3(229.88, y, 72), -Math.PI / 2, 24, height, new THREE.Vector3(88, 7, 40));

  addSunPatch(new THREE.Vector3(-86, 0.018, -78), 72, 20, 0.12);
  addSunPatch(new THREE.Vector3(84, 0.019, -66), 68, 18, -0.08);
  addSunPatch(new THREE.Vector3(-92, 0.02, 54), 60, 18, -0.18);
  addSunPatch(new THREE.Vector3(94, 0.021, 58), 64, 20, 0.16);
}

function addWindowPanel(
  position: THREE.Vector3,
  rotationY: number,
  width: number,
  height: number,
  lightTarget: THREE.Vector3,
): void {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = rotationY;

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(width + 2.6, height + 1.8), matWindowGlow);
  glow.name = "room-window-blue-glow";
  glow.position.z = 0.025;
  glow.castShadow = false;
  glow.receiveShadow = false;
  group.add(glow);

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - 1.4, height - 1.4), matWindowGlass);
  glass.name = "room-window-glass";
  glass.position.z = 0.035;
  glass.castShadow = false;
  glass.receiveShadow = false;
  group.add(glass);

  addWindowFramePiece(group, width + 0.9, 0.42, new THREE.Vector3(0, height * 0.5, 0.08));
  addWindowFramePiece(group, width + 0.9, 0.42, new THREE.Vector3(0, -height * 0.5, 0.08));
  addWindowFramePiece(group, 0.42, height + 0.9, new THREE.Vector3(-width * 0.5, 0, 0.08));
  addWindowFramePiece(group, 0.42, height + 0.9, new THREE.Vector3(width * 0.5, 0, 0.08));
  addWindowFramePiece(group, 0.24, height - 0.2, new THREE.Vector3(0, 0, 0.1));
  addWindowFramePiece(group, width - 0.4, 0.22, new THREE.Vector3(0, 0, 0.1));

  scene.add(group);

  const daylight = new THREE.RectAreaLight(0xa9dcff, 2.45, width * 0.95, height * 0.92);
  daylight.name = "window-daylight";
  daylight.position.copy(position).lerp(lightTarget, 0.16);
  daylight.lookAt(lightTarget);
  scene.add(daylight);
}

function addWindowFramePiece(group: THREE.Group, width: number, height: number, position: THREE.Vector3): void {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.24), matWindowFrame);
  frame.position.copy(position);
  frame.castShadow = false;
  frame.receiveShadow = false;
  group.add(frame);
}

function addSunPatch(position: THREE.Vector3, width: number, depth: number, rotationZ: number): void {
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), matSunPatch);
  patch.name = "window-sun-patch";
  patch.position.copy(position);
  patch.rotation.x = -Math.PI / 2;
  patch.rotation.z = rotationZ;
  scene.add(patch);
}

function addStaticBoxCollider(size: THREE.Vector3, position: THREE.Vector3, rotation?: THREE.Euler): void {
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5)),
    material: staticPhysicsMaterial,
  });
  body.position.set(position.x, position.y, position.z);

  if (rotation) {
    body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
  }

  physicsWorld.addBody(body);
}

function addWall(x: number, z: number, width: number, height: number, depth: number, rotationY: number): void {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth, Math.max(1, Math.floor(width / 8)), 8, 1),
    roomMaterials.wall,
  );
  wall.position.set(x, height / 2 - 0.05, z);
  wall.rotation.y = rotationY;
  wall.receiveShadow = true;
  scene.add(wall);
  addStaticBoxCollider(
    new THREE.Vector3(width, height, depth),
    new THREE.Vector3(x, height / 2 - 0.05, z),
    new THREE.Euler(0, rotationY, 0),
  );
}

function makeCheckpointPoints(curve: THREE.CatmullRomCurve3, checkpointCount: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < checkpointCount; i += 1) {
    const point = curve.getPointAt(i / checkpointCount);
    point.y = 0.05;
    points.push(point);
  }

  return points;
}

function makeTrackVisual(points: readonly THREE.Vector3[]): void {
  const road = new THREE.Mesh(buildRoadSurfaceGeometry(points, roadWidth), matTrack);
  road.receiveShadow = true;
  scene.add(road);
  addLaneDashes(points);
  addStartLine(points);

  for (const side of [-1, 1] as const) {
    const curbCurve = buildClosedCurbCurve(buildCurbPathPoints(points, side, roadWidth));
    const curbRail = new THREE.Mesh(
      new THREE.TubeGeometry(
        curbCurve,
        points.length * 4,
        TRACK_RAIL_CONFIG.tubeRadius,
        8,
        true,
      ),
      side < 0 ? matToyRed : matToyYellow,
    );
    curbRail.name = side < 0 ? "left-continuous-curb-rail" : "right-continuous-curb-rail";
    curbRail.castShadow = true;
    curbRail.receiveShadow = true;
    scene.add(curbRail);
  }
}

function addLaneDashes(points: readonly THREE.Vector3[]): void {
  const dashEverySamples = 8;

  for (let i = 0; i < points.length; i += dashEverySamples) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const tangent = new THREE.Vector3().subVectors(b, a).normalize();
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 4.8), matTrackStripe);
    dash.position.copy(a);
    dash.position.y = 0.09;
    dash.rotation.y = Math.atan2(tangent.x, tangent.z);
    dash.receiveShadow = true;
    scene.add(dash);
  }
}

function addStartLine(points: readonly THREE.Vector3[]): void {
  const a = points[0];
  const b = points[1];
  const tangent = new THREE.Vector3().subVectors(b, a).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

  for (let stripeIndex = -2; stripeIndex <= 2; stripeIndex += 1) {
    const startStripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.04, 5.4),
      stripeIndex % 2 === 0 ? matKartWhite : matKartBlack,
    );
    startStripe.position.copy(a).addScaledVector(normal, stripeIndex * 1.35);
    startStripe.position.y = 0.12;
    startStripe.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI / 2;
    startStripe.receiveShadow = true;
    scene.add(startStripe);
  }
}

function makeTrackPickups(curve: THREE.CatmullRomCurve3, lapLength: number): void {
  for (let distance = 170; distance < lapLength; distance += 190) {
    const progress = distance / lapLength;
    const base = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

    for (const offset of [-3.6, 0, 3.6]) {
      const itemBox = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({
          color: 0x5dfdff,
          emissive: 0x1e8cff,
          emissiveIntensity: 0.95,
          roughness: 0.35,
        }),
      );
      itemBox.position.copy(base).addScaledVector(normal, offset);
      itemBox.position.y = 1.25;
      itemBox.rotation.y = Math.PI * 0.25;
      itemBox.castShadow = true;
      scene.add(itemBox);
    }
  }

  for (let distance = 285; distance < lapLength; distance += 320) {
    const progress = distance / lapLength;
    const base = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress).normalize();
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(roadWidth * 0.52, 0.08, 4.4),
      new THREE.MeshStandardMaterial({
        color: 0xffb22e,
        emissive: 0xff5a1e,
        emissiveIntensity: 0.75,
        roughness: 0.45,
      }),
    );
    pad.position.copy(base);
    pad.position.y = 0.16;
    pad.rotation.y = Math.atan2(tangent.x, tangent.z);
    pad.receiveShadow = true;
    scene.add(pad);
    boostPads.push({ position: base.clone(), cooldown: 0 });
  }
}

function makeCheckpoints(points: readonly THREE.Vector3[]): Checkpoint[] {
  return points.map((point, index) => {
    return {
      position: point.clone(),
      index,
      passed: false,
    };
  });
}

function makeKart(): THREE.Group {
  const group = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 2.1), matKartRed);
  chassis.position.y = 0.26;
  chassis.castShadow = true;
  group.add(chassis);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 0.85), matKartWhite);
  hood.position.set(0, 0.54, -0.5);
  hood.castShadow = true;
  group.add(hood);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.65), matKartBlack);
  seat.position.set(0, 0.63, 0.48);
  seat.castShadow = true;
  group.add(seat);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.16, 0.18), matKartBlack);
  bumper.position.set(0, 0.25, -1.18);
  bumper.castShadow = true;
  group.add(bumper);

  for (const x of [-0.82, 0.82]) {
    for (const z of [-0.78, 0.82]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 20), matKartBlack);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.18, z);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }

  const driver = makeAntDriver();
  driver.position.set(0, 0.93, 0.12);
  group.add(driver);
  return group;
}

function makeAntDriver(): THREE.Group {
  const group = new THREE.Group();
  const body = makeAntPart(0.28, new THREE.Vector3(0, 0, 0.08), new THREE.Vector3(1.1, 0.7, 1));
  const head = makeAntPart(0.2, new THREE.Vector3(0, 0.12, -0.28), new THREE.Vector3(1, 0.85, 1));
  group.add(body, head);
  addAntLeg(group, -0.28, -0.12, 0.65);
  addAntLeg(group, 0.28, -0.12, -0.65);
  addAntLeg(group, -0.3, 0.2, 1.2);
  addAntLeg(group, 0.3, 0.2, -1.2);
  return group;
}

function makeAntPart(
  radius: number,
  position: THREE.Vector3,
  scale: THREE.Vector3,
): THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> {
  const part = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), matAnt);
  part.position.copy(position);
  part.scale.copy(scale);
  part.castShadow = true;
  return part;
}

function addAntLeg(group: THREE.Group, x: number, z: number, rotationY: number): void {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.55), matAnt);
  leg.position.set(x, -0.12, z);
  leg.rotation.y = rotationY;
  leg.castShadow = true;
  group.add(leg);
}

function handleKeyDown(event: KeyboardEvent): void {
  setKey(event.code, true);

  if (isDrivingKey(event.code) && !engineAudio.isRunning()) {
    void startEngineAudio();
  }
}

function isDrivingKey(code: string): boolean {
  return code === "KeyW"
    || code === "ArrowUp"
    || code === "KeyS"
    || code === "ArrowDown"
    || code === "KeyA"
    || code === "ArrowLeft"
    || code === "KeyD"
    || code === "ArrowRight";
}

function setKey(code: string, pressed: boolean): void {
  switch (code) {
    case "KeyW":
    case "ArrowUp":
      input.forward = pressed;
      break;
    case "KeyS":
    case "ArrowDown":
      input.backward = pressed;
      break;
    case "KeyA":
    case "ArrowLeft":
      input.left = pressed;
      break;
    case "KeyD":
    case "ArrowRight":
      input.right = pressed;
      break;
  }
}

function getKartForwardVector(): THREE.Vector3 {
  return new THREE.Vector3(-Math.sin(playerHeading), 0, -Math.cos(playerHeading));
}

function updateKart(deltaSeconds: number): void {
  const currentSection = getCurrentTrackSection();
  boostTimer = Math.max(0, boostTimer - deltaSeconds);
  kartDriveState = stepArcadeKart(
    {
      ...kartDriveState,
      speed: raceState.speed,
      heading: playerHeading,
    },
    {
      controls: input,
      speedLimit: currentSection.speedLimit,
      boostTimer,
      finished: raceFinished,
      deltaSeconds,
    },
    vehicleConfig,
  );
  raceState.speed = kartDriveState.speed;
  playerHeading = kartDriveState.heading;

  const speedRatio = THREE.MathUtils.clamp(Math.abs(raceState.speed) / vehicleConfig.boostSpeed, 0, 1);

  kart.position.addScaledVector(getKartForwardVector(), raceState.speed * deltaSeconds);
  kart.position.x = THREE.MathUtils.clamp(kart.position.x, -roomHalfWidth + 10, roomHalfWidth - 10);
  kart.position.y = 0.42;
  kart.position.z = THREE.MathUtils.clamp(kart.position.z, -roomHalfDepth + 10, roomHalfDepth - 10);
  kart.rotation.y = playerHeading;
  kart.rotation.z = THREE.MathUtils.lerp(
    kart.rotation.z,
    kartDriveState.steer * 0.17 * speedRatio + kartDriveState.drift * 0.08,
    1 - Math.exp(-10 * deltaSeconds),
  );
  constrainKartToRoad(deltaSeconds);

  for (const pad of boostPads) {
    if (pad.cooldown <= 0 && horizontalDistance(kart.position, pad.position) < 4.8) {
      boostTimer = 1.15;
      pad.cooldown = 2.4;
      score += 150;
    }
  }
}

function constrainKartToRoad(deltaSeconds: number): void {
  const nearest = getNearestTrackSample(kart.position);
  const section = getTrackSectionForSample(nearest.index);
  const offset = kart.position.clone().sub(nearest.point);
  const lateral = offset.dot(nearest.normal);
  const edge = roadWidth * 0.46;
  const targetHeading = Math.atan2(-nearest.tangent.x, -nearest.tangent.z);
  const isSteering = input.left || input.right;

  if (Math.abs(lateral) > 0.15) {
    const correctionRate = isSteering ? 0.04 * section.assistStrength : 0.55 * section.assistStrength;
    const correction = lateral * (1 - Math.exp(-correctionRate * deltaSeconds));
    kart.position.addScaledVector(nearest.normal, -correction);
    kart.position.y = 0.42;
  }

  const correctedLateral = kart.position.clone().sub(nearest.point).dot(nearest.normal);

  if (Math.abs(correctedLateral) > edge) {
    kart.position.copy(nearest.point).addScaledVector(nearest.normal, Math.sign(lateral) * edge);
    kart.position.y = 0.42;
    raceState.speed *= 0.985;
    playerHeading = lerpAngle(playerHeading, targetHeading, 1 - Math.exp(-3.2 * deltaSeconds));
  } else if (!isSteering) {
    playerHeading = lerpAngle(playerHeading, targetHeading, 1 - Math.exp(-0.62 * section.assistStrength * deltaSeconds));
  }

  kart.rotation.y = playerHeading;
}

function getCurrentTrackSection(): TrackLayoutSection {
  return getTrackSectionForSample(getNearestTrackSample(kart.position).index);
}

function getTrackSectionForSample(sampleIndex: number): TrackLayoutSection {
  const sectionIndex = Math.floor((sampleIndex / trackSamples.length) * trackLayout.sections.length);
  return trackLayout.sections[THREE.MathUtils.euclideanModulo(sectionIndex, trackLayout.sections.length)];
}

function getNearestTrackSample(position: THREE.Vector3): {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  index: number;
} {
  let nearestIndex = 0;
  let nearestDistance = Infinity;

  for (let i = 0; i < trackSamples.length; i += 1) {
    const distance = horizontalDistance(position, trackSamples[i]);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  const previous = trackSamples[THREE.MathUtils.euclideanModulo(nearestIndex - 1, trackSamples.length)];
  const next = trackSamples[(nearestIndex + 1) % trackSamples.length];
  const tangent = new THREE.Vector3().subVectors(next, previous).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

  return {
    point: trackSamples[nearestIndex],
    tangent,
    normal,
    index: nearestIndex,
  };
}

function lerpAngle(current: number, target: number, alpha: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * alpha;
}

function updateCheckpoints(): void {
  const target = checkpoints[raceState.nextCheckpointIndex];
  const distanceToTarget = horizontalDistance(kart.position, target.position);

  if (!raceFinished && distanceToTarget < roadWidth * 0.7) {
    target.passed = true;
    score += 500;
    const passedIndex = raceState.nextCheckpointIndex;
    raceState.nextCheckpointIndex = (raceState.nextCheckpointIndex + 1) % checkpoints.length;

    if (passedIndex === 0) {
      raceState.lap += 1;
      score += 2000;

      if (raceState.lap >= totalRaceLaps) {
        raceFinished = true;
        raceState.speed = Math.min(raceState.speed, vehicleConfig.maxSpeed);
      }

      for (const checkpoint of checkpoints) {
        checkpoint.passed = false;
      }
    }
  }
}

function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function makeAiRacers(): AiRacer[] {
  const racers: AiRacer[] = [];
  const colors = [0x30c64f, 0xf5d64a, 0xf05c5c, 0x8b5cff, 0x35d0ff, 0xff9d2e, 0xf472d0];

  for (let index = 0; index < 7; index += 1) {
    const group = makeAiKart(new THREE.MeshStandardMaterial({
      color: colors[index],
      roughness: 0.6,
      metalness: 0.05,
    }));
    const row = Math.floor(index / 2) + 1;
    const lane = index % 2 === 0 ? -2.6 : 2.6;
    const progress = THREE.MathUtils.euclideanModulo(1 - row * 0.008, 1);
    racers.push({
      group,
      progress,
      speed: 22 + index * 0.55,
      laneOffset: lane,
    });
    scene.add(group);
  }

  return racers;
}

function makeAiKart(bodyMaterial: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.34, 2.05), bodyMaterial);
  body.position.y = 0.26;
  body.castShadow = true;
  group.add(body);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.58), matKartBlack);
  seat.position.set(0, 0.62, 0.36);
  seat.castShadow = true;
  group.add(seat);

  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.74, 0.78]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16), matKartBlack);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.18, z);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }

  return group;
}

function updateAiRacers(deltaSeconds: number): void {
  for (const racer of aiRacers) {
    const playerDistanceAlongLap = estimatePlayerProgress() * lapLengthMeters;
    const racerDistanceAlongLap = racer.progress * lapLengthMeters;
    const behindPlayer = playerDistanceAlongLap - racerDistanceAlongLap;
    const rubberBand = THREE.MathUtils.clamp(1 + behindPlayer / 700, 0.94, 1.12);
    racer.progress = THREE.MathUtils.euclideanModulo(
      racer.progress + (racer.speed * rubberBand * deltaSeconds) / lapLengthMeters,
      1,
    );

    const point = trackCurve.getPointAt(racer.progress);
    const tangent = trackCurve.getTangentAt(racer.progress).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    racer.group.position.copy(point).addScaledVector(normal, racer.laneOffset);
    racer.group.position.y = 0.42;
    racer.group.rotation.y = Math.atan2(-tangent.x, -tangent.z);
  }
}

function estimatePlayerProgress(): number {
  return getNearestTrackSample(kart.position).index / trackSamples.length;
}

function updateBoostPads(deltaSeconds: number): void {
  for (const pad of boostPads) {
    pad.cooldown = Math.max(0, pad.cooldown - deltaSeconds);
  }
}

function updateCamera(deltaSeconds = 1 / 60): void {
  const forward = getKartForwardVector();
  const speedRatio = getSpeedGaugeState(raceState.speed).ratio;
  const isNarrowView = window.innerWidth < 700;
  const distance = THREE.MathUtils.lerp(isNarrowView ? 7.4 : 5.8, isNarrowView ? 10.5 : 8.6, speedRatio);
  const height = THREE.MathUtils.lerp(isNarrowView ? 3.4 : 2.35, isNarrowView ? 5.1 : 3.8, speedRatio);
  const damping = 1 - Math.exp(-8.5 * deltaSeconds);
  const desiredPosition = kart.position
    .clone()
    .addScaledVector(forward, -distance)
    .add(new THREE.Vector3(0, height, 0));

  camera.position.lerp(desiredPosition, damping);
  camera.lookAt(kart.position.clone().addScaledVector(forward, THREE.MathUtils.lerp(8, 16, speedRatio)).add(new THREE.Vector3(0, 1.25, 0)));
}

function updateHud(): void {
  const minutes = Math.floor(raceTimeSeconds / 60).toString().padStart(1, "0");
  const seconds = Math.floor(raceTimeSeconds % 60).toString().padStart(2, "0");
  const visibleLap = raceFinished ? totalRaceLaps : Math.min(raceState.lap + 1, totalRaceLaps);
  const statusText = raceFinished ? "FINISH 1ST" : `LAP ${visibleLap}/${totalRaceLaps}`;
  hud.innerHTML = `
    <div class="hud-row top">
      <span>SCORE ${score.toString().padStart(7, "0")}</span>
      <span>HIGH SCORE 0000000</span>
    </div>
    <div class="hud-row timer">TIME ${minutes}:${seconds}</div>
    <div class="hud-row">
      <span>${statusText}</span>
      <span>CP ${raceState.nextCheckpointIndex}/${checkpoints.length - 1}</span>
    </div>
  `;
}

function updateMiniMap(): void {
  const ctx = minimap.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, minimap.width, minimap.height);
  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < trackSamples.length; i += 1) {
    const mapped = mapToMini(trackSamples[i]);
    if (i === 0) {
      ctx.moveTo(mapped.x, mapped.y);
    } else {
      ctx.lineTo(mapped.x, mapped.y);
    }
  }

  ctx.closePath();
  ctx.stroke();

  for (const checkpoint of checkpoints) {
    const mapped = mapToMini(checkpoint.position);
    ctx.fillStyle = checkpoint.index === raceState.nextCheckpointIndex ? "#ffdf43" : "#ff72be";
    ctx.beginPath();
    ctx.arc(mapped.x, mapped.y, checkpoint.index === raceState.nextCheckpointIndex ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const kartPoint = mapToMini(kart.position);
  ctx.fillStyle = "#4effff";
  ctx.beginPath();
  ctx.arc(kartPoint.x, kartPoint.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function updateSpeedGauge(): void {
  const gauge = getSpeedGaugeState(raceState.speed);
  speedGauge.style.setProperty("--speed", `${gauge.ratio}`);
  speedGauge.querySelector(".speed-value")!.textContent = gauge.valueText;
  speedGauge.querySelector(".speed-unit")!.textContent = gauge.unitText;
}

function createHud(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "arcade-hud";
  document.body.appendChild(element);
  return element;
}

function createMiniMap(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  canvas.className = "mini-map";
  document.body.appendChild(canvas);
  return canvas;
}

function createSpeedGauge(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "speed-gauge";
  element.innerHTML = '<div class="needle"></div><span class="speed-value">0</span><span class="speed-unit">MPH</span>';
  document.body.appendChild(element);
  return element;
}

function createControlsHint(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "controls-hint";
  element.textContent = "WASD / arrows drive - boost pads hit 42 m/s";
  document.body.appendChild(element);
  return element;
}

function createAudioButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "audio-button";
  button.type = "button";
  button.textContent = "Enable engine audio";
  document.body.appendChild(button);
  return button;
}

function createEngineAudio(): EngineAudio {
  let context: AudioContext | undefined;
  let oscillator: OscillatorNode | undefined;
  let gain: GainNode | undefined;
  let running = false;

  return {
    start: async () => {
      if (!context) {
        context = new AudioContext();
        oscillator = context.createOscillator();
        gain = context.createGain();
        oscillator.type = "sawtooth";
        oscillator.frequency.value = 70;
        gain.gain.value = 0.0001;
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
      }

      await context.resume();
      running = true;
    },
    update: (speedRatio) => {
      if (!context || !oscillator || !gain || !running) {
        return;
      }

      const now = context.currentTime;
      oscillator.frequency.linearRampToValueAtTime(70 + speedRatio * 220, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.02 + speedRatio * 0.08, now + 0.05);
    },
    isRunning: () => running,
  };
}

async function startEngineAudio(): Promise<void> {
  try {
    await engineAudio.start();
    audioButton.textContent = "Engine audio on";
    audioButton.classList.add("active");
  } catch {
    audioButton.textContent = "Tap to enable audio";
  }
}

function mapToMini(point: THREE.Vector3): { x: number; y: number } {
  return {
    x: THREE.MathUtils.mapLinear(point.x, -roomHalfWidth, roomHalfWidth, 16, minimap.width - 16),
    y: THREE.MathUtils.mapLinear(point.z, -roomHalfDepth, roomHalfDepth, 16, minimap.height - 16),
  };
}

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

updateCamera();
updateHud();
updateMiniMap();
updateSpeedGauge();
controlsHint.hidden = true;
